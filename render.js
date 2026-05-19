/**
 * Render: Pure template functions that return HTML strings.
 * No DOM manipulation, no side effects, no API calls.
 * Used by page renderers to build HTML before inserting into the DOM.
 */
window.Render = {

  recipeCard: function(recipe) {
    const rating = recipe.rating || 'unknown';
    const ratingClass = 'rating-' + rating.replace(/[^a-z-]/g, '');
    const name = StringUtils.truncate(recipe.name || '', 40);
    return `
      <div class="card recipe-card" data-id="${recipe.id}" data-recipe-id="${recipe.id}">
        <div class="card-header">
          <h4>${name}</h4>
          <span class="badge ${ratingClass}">${rating}</span>
        </div>
        <div class="card-content">
          <p class="recipe-protein">${recipe.protein_g || 0}g protein</p>
          <p class="recipe-cals">${recipe.calories_per_serving || 0} cal</p>
        </div>
        <div class="card-footer">
          <button class="btn-sm" onclick="openSpiceModal('${recipe.profile_id}','${recipe.id}')">Edit</button>
          <button class="btn-sm btn-danger" onclick="removeSpiceRecipe('${recipe.id}')">Delete</button>
        </div>
      </div>`;
  },

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

  habitRow: function(habit, completed) {
    return `
      <div class="habit-row" data-habit-id="${habit.id}">
        <input type="checkbox" ${completed ? 'checked' : ''} onchange="toggleHabit('${habit.id}')" class="habit-check">
        <span class="habit-name">${habit.label || habit.name || ''}</span>
        <span class="habit-streak">${habit.streak || 0} day streak</span>
      </div>`;
  },

  habits: function(habits, completions = {}) {
    if (!habits || habits.length === 0) {
      return '<p class="empty-state">No habits yet. Create one to start tracking.</p>';
    }
    return '<div class="habits-list">' + habits.map(h => this.habitRow(h, !!completions[h.id])).join('') + '</div>';
  },

  nutritionSummary: function(nutrition) {
    const n = nutrition || {calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0};
    return `
      <div class="nutrition-summary">
        <div class="nutrition-stat"><label>Calories</label><div class="nutrition-value">${n.calories || 0}</div></div>
        <div class="nutrition-stat"><label>Protein</label><div class="nutrition-value">${n.protein_g || 0}g</div></div>
        <div class="nutrition-stat"><label>Carbs</label><div class="nutrition-value">${n.carbs_g || 0}g</div></div>
        <div class="nutrition-stat"><label>Fat</label><div class="nutrition-value">${n.fat_g || 0}g</div></div>
      </div>`;
  },

  emptyState: function(message) {
    return `<p class="empty-state">${message}</p>`;
  },

  errorState: function(message) {
    return `<p class="error-state" style="color:var(--red);padding:12px">${message}</p>`;
  }
};
