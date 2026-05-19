/**
 * RecipeService: Business logic for recipes.
 * No DOM manipulation. No direct sb.from() calls. Uses API module for data access.
 */
window.RecipeService = {

  RATING_CONFIG: {
    'good':       {label: 'Good',       badge: 'b-g', icon: '✅', desc: 'High protein, lean calories'},
    'so-so':      {label: 'So-So',      badge: 'b-a', icon: '🟡', desc: 'Moderate nutritional fit'},
    'needs-care': {label: 'Needs Care', badge: 'b-r', icon: '⚠️', desc: 'Low protein or high calorie'},
  },

  /**
   * Calculate nutritional rating for a recipe.
   * Good:       protein >= 30g AND calories <= 600
   * So-So:      protein 15–29g OR calories 600–800
   * Needs Care: protein < 15g OR calories > 800
   */
  rate: function(cal, protein) {
    if (!cal && !protein) return null;
    const c = +cal || 0, p = +protein || 0;
    if (p >= 30 && c <= 600) return 'good';
    if (p < 15 || c > 800) return 'needs-care';
    return 'so-so';
  },

  /** Return the rating config object for a given rating key, or null. */
  ratingInfo: function(rating) {
    return this.RATING_CONFIG[rating] || null;
  },

  /** Filter recipes by profileId and/or rating. */
  filter: function(recipes, {profileId, rating} = {}) {
    let result = recipes || [];
    if (profileId) result = result.filter(r => r.profile_id === profileId);
    if (rating)    result = result.filter(r => r.rating === rating);
    return result;
  },

  /**
   * Return top n recipes for a profile, ranked by protein density
   * (protein per calorie, descending). Recipes with no calorie data rank last.
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
