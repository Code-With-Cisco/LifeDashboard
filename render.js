/**
 * render.js — Pure HTML template functions.
 *
 * PURPOSE: Returns HTML strings for page regions. No DOM writes, no API calls,
 *   no side effects — only data → HTML string transforms. Callers are responsible
 *   for setting innerHTML with the result.
 *
 * PUBLIC INTERFACE:
 *   Render.recipeCard(recipe)               — single recipe card HTML
 *   Render.recipes(recipes, profileId)      — recipe grid HTML (filtered by profile)
 *   Render.habitRow(habit, completed)       — single habit row HTML
 *   Render.habits(habits, completions)      — full habits list HTML
 *   Render.nutritionSummary(nutrition)      — nutrition macro stats block HTML
 *   Render.emptyState(message)              — empty state placeholder HTML
 *   Render.errorState(message)              — error state placeholder HTML (red)
 *
 * CONNECTED TO: utils.js (StringUtils.truncate)
 *               main.js, app.js (call Render.* then set innerHTML)
 */
window.Render = {

  /**
   * Return HTML for a single recipe card.
   * @param {Object} recipe
   * @param {string} recipe.id
   * @param {string} recipe.name
   * @param {string} recipe.rating            - 'good' | 'so-so' | 'needs-care' | 'unknown'
   * @param {number} [recipe.protein_g]
   * @param {number} [recipe.calories_per_serving]
   * @param {string} recipe.profile_id
   * @returns {string} HTML string
   */
  recipeCard: function(recipe) {
    const rating = String(recipe.rating || 'unknown');
    const ratingClass = 'rating-' + rating.replace(/[^a-z-]/g, '');
    const name = StringUtils.truncate(recipe.name || '', 40);
    return `
      <div class="card recipe-card" data-id="${SecurityService.safeIdentifier(recipe.id)}" data-recipe-id="${SecurityService.safeIdentifier(recipe.id)}">
        <div class="card-header">
          <h4>${SecurityService.escapeHtml(name)}</h4>
          <span class="badge ${ratingClass}">${SecurityService.escapeHtml(rating)}</span>
        </div>
        <div class="card-content">
          <p class="recipe-protein">${Number(recipe.protein_g) || 0}g protein</p>
          <p class="recipe-cals">${Number(recipe.calories_per_serving) || 0} cal</p>
        </div>
        <div class="card-footer">
          <button class="btn-sm" onclick="openSpiceModal('${recipe.profile_id}','${SecurityService.safeIdentifier(recipe.id)}')">Edit</button>
          <button class="btn-sm btn-danger" onclick="removeSpiceRecipe('${SecurityService.safeIdentifier(recipe.id)}')">Delete</button>
        </div>
      </div>`;
  },

  /**
   * Return HTML for a recipe grid, filtered to a given profile.
   * Returns an empty-state message if no recipes match.
   * @param {Object[]} recipes
   * @param {string}   profileId
   * @returns {string} HTML string
   */
  recipes: function(recipes, profileId) {
    if (!recipes || recipes.length === 0) {
      return '<p class="empty-state">No recipes yet. Create one to get started.</p>';
    }
    const filtered = recipes.filter(r => r.profile_id === profileId);
    if (filtered.length === 0) {
      return '<p class="empty-state">No recipes for this profile.</p>';
    }
    return '<div class="recipes-grid">' + filtered.map(r => this.recipeCard(r)).join('') + '</div>';
  },

  /**
   * Return HTML for a single habit row with a completion checkbox.
   * @param {Object}  habit
   * @param {string}  habit.id
   * @param {string}  [habit.label]
   * @param {string}  [habit.name]
   * @param {number}  [habit.streak]
   * @param {boolean} completed - whether the habit is checked today
   * @returns {string} HTML string
   */
  habitRow: function(habit, completed) {
    return `
      <div class="habit-row" data-habit-id="${SecurityService.safeIdentifier(habit.id)}">
        <input type="checkbox" ${completed ? 'checked' : ''} onchange="toggleHabit('${SecurityService.safeIdentifier(habit.id)}')" class="habit-check">
        <span class="habit-name">${SecurityService.escapeHtml(habit.label || habit.name || '')}</span>
        <span class="habit-streak">${Number(habit.streak) || 0} day streak</span>
      </div>`;
  },

  /**
   * Return HTML for the full habits list.
   * @param {Object[]}                habits
   * @param {Object.<string,boolean>} [completions={}] - map of habit_id → completed
   * @returns {string} HTML string
   */
  habits: function(habits, completions = {}) {
    if (!habits || habits.length === 0) {
      return '<p class="empty-state">No habits yet. Create one to start tracking.</p>';
    }
    return '<div class="habits-list">' + habits.map(h => this.habitRow(h, !!completions[h.id])).join('') + '</div>';
  },

  /**
   * Return HTML for the nutrition macro summary block.
   * @param {Object|null} nutrition
   * @param {number}      [nutrition.calories]
   * @param {number}      [nutrition.protein_g]
   * @param {number}      [nutrition.carbs_g]
   * @param {number}      [nutrition.fat_g]
   * @returns {string} HTML string
   */
  nutritionSummary: function(nutrition) {
    const n = nutrition || {calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0};
    return `
      <div class="nutrition-summary">
        <div class="nutrition-stat"><label>Calories</label><div class="nutrition-value">${Number(n.calories) || 0}</div></div>
        <div class="nutrition-stat"><label>Protein</label><div class="nutrition-value">${Number(n.protein_g) || 0}g</div></div>
        <div class="nutrition-stat"><label>Carbs</label><div class="nutrition-value">${Number(n.carbs_g) || 0}g</div></div>
        <div class="nutrition-stat"><label>Fat</label><div class="nutrition-value">${Number(n.fat_g) || 0}g</div></div>
      </div>`;
  },

  /**
   * Return an empty-state placeholder HTML string.
   * @param {string} message
   * @returns {string}
   */
  emptyState: function(message) {
    return `<p class="empty-state">${SecurityService.escapeHtml(message)}</p>`;
  },

  /**
   * Return an error-state placeholder HTML string (styled in red).
   * @param {string} message
   * @returns {string}
   */
  errorState: function(message) {
    return `<p class="error-state" style="color:var(--red);padding:12px">${SecurityService.escapeHtml(message)}</p>`;
  }
};
