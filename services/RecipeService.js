/**
 * RecipeService — Business logic for recipes.
 *
 * PURPOSE: Pure business logic for recipe rating and filtering.
 *   No DOM manipulation, no sb.from() calls, no Logger calls.
 *   Consumed by app.js; tested in test/RecipeService.test.js.
 *
 * PUBLIC INTERFACE:
 *   RecipeService.rate(cal, protein)                  → 'good'|'so-so'|'needs-care'|null
 *   RecipeService.ratingInfo(rating)                  → {label,badge,icon,desc}|null
 *   RecipeService.filter(recipes, {profileId,rating}) → recipe[]
 *   RecipeService.suggest(recipes, profileId, n)      → top-n recipe[]
 *
 * CONNECTED TO: app.js (consumer)
 *               test/RecipeService.test.js
 *               RATING_CONFIG badge keys must match CSS classes in styles.css
 */
window.RecipeService = {

  RATING_CONFIG: {
    'good':       {label: 'Good',       badge: 'b-g', icon: '✅', desc: 'High protein, lean calories'},
    'so-so':      {label: 'So-So',      badge: 'b-a', icon: '🟡', desc: 'Moderate nutritional fit'},
    'needs-care': {label: 'Needs Care', badge: 'b-r', icon: '⚠️', desc: 'Low protein or high calorie'},
  },

  /**
   * Calculate a nutritional rating for a recipe.
   * Good:       protein >= 30g AND calories <= 600
   * So-So:      protein 15–29g OR calories 600–800
   * Needs Care: protein < 15g OR calories > 800
   * @param {number|string} cal     - calories per serving
   * @param {number|string} protein - protein in grams
   * @returns {'good'|'so-so'|'needs-care'|null} null if both inputs are falsy
   */
  rate: function(cal, protein) {
    if (!cal && !protein) return null;
    const c = +cal || 0, p = +protein || 0;
    if (p >= 30 && c <= 600) return 'good';
    if (p < 15 || c > 800) return 'needs-care';
    return 'so-so';
  },

  /**
   * Return the display config object for a rating key.
   * @param {string} rating - 'good' | 'so-so' | 'needs-care'
   * @returns {{label: string, badge: string, icon: string, desc: string}|null}
   */
  ratingInfo: function(rating) {
    return this.RATING_CONFIG[rating] || null;
  },

  /**
   * Filter a recipe array by profile and/or rating.
   * @param {Object[]}   recipes
   * @param {Object}     [options={}]
   * @param {string}     [options.profileId] - keep only recipes with this profile_id
   * @param {string}     [options.rating]    - keep only recipes with this rating
   * @returns {Object[]}
   */
  filter: function(recipes, {profileId, rating} = {}) {
    let result = recipes || [];
    if (profileId) result = result.filter(r => r.profile_id === profileId);
    if (rating)    result = result.filter(r => r.rating === rating);
    return result;
  },

  /**
   * Return the top n recipes for a profile ranked by protein density
   * (protein_g / calories_per_serving, descending).
   * Recipes with zero or missing calories rank last.
   * @param {Object[]} recipes
   * @param {string}   profileId
   * @param {number}   [n=5]
   * @returns {Object[]}
   */
  suggest: function(recipes, profileId, n = 5) {
    const pool = this.filter(recipes, {profileId});
    return pool
      .slice()
      .sort((a, b) => {
        const dA = (a.calories_per_serving || 0) > 0 ? (a.protein_g || 0) / a.calories_per_serving : 0;
        const dB = (b.calories_per_serving || 0) > 0 ? (b.protein_g || 0) / b.calories_per_serving : 0;
        return dB - dA;
      })
      .slice(0, n);
  }
};
