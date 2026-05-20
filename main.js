/**
 * main.js — Orchestration layer: coordinates API, State, Render, and DOM.
 *
 * PURPOSE: Provides high-level operations that span multiple modules.
 *   Bridges the event-delegation system (data-action attributes) with the
 *   service layer and render pipeline. All DB calls delegate to API; all
 *   HTML generation delegates to Render.
 *
 * PUBLIC INTERFACE:
 *   Main.setupEventDelegation()       — wire delegated click → data-action handler
 *   Main.updateRecipesPage(profileId) — re-render recipes container
 *   Main.updateHabitsPage()           — re-render habits container
 *   Main.addRecipe()                  — open add-recipe modal
 *   Main.editRecipe(id)               — open edit-recipe modal
 *   Main.deleteRecipe(id)             — delete recipe, refresh list
 *   Main.addHabit()                   — open add-habit modal
 *   Main.deleteHabit(id)              — delete a habit
 *
 * CONNECTED TO: logs.js, api.js, state.js, render.js, utils.js
 *               app.js (calls Main methods after auth is ready)
 *
 * NOTE: Main.init() is NOT called automatically. The app uses
 *   onAuthStateChange for initialization; Main methods are invoked
 *   explicitly after auth is ready.
 */
window.Main = {

  /**
   * Set up delegated click handler for [data-action] elements.
   * Add a case here for each new action button added to the HTML.
   * @returns {void}
   */
  setupEventDelegation: function() {
    document.addEventListener('click', (e) => {
      const action = e.target.closest('[data-action]')?.dataset.action;
      if (!action) return;
      const id = e.target.closest('[data-action]')?.dataset.id;
      switch(action) {
        case 'add-recipe':   this.addRecipe(); break;
        case 'edit-recipe':  this.editRecipe(id); break;
        case 'delete-recipe':this.deleteRecipe(id); break;
        case 'add-habit':    this.addHabit(); break;
        case 'delete-habit': this.deleteHabit(id); break;
      }
    });
    Logger.log('main', 'setupEventDelegation.complete');
  },

  /**
   * Re-render the recipes container for a given profile.
   * Reads the current recipe list from State.
   * @param {string} [profileId='basics']
   * @returns {void}
   */
  updateRecipesPage: function(profileId = 'basics') {
    const recipes = State.get('recipes_list') || [];
    DOM.setHTML('recipes-container', Render.recipes(recipes, profileId));
  },

  /**
   * Re-render the habits container with today's completion state.
   * Reads the habit list and completion map from State.
   * @returns {void}
   */
  updateHabitsPage: function() {
    const habits = State.get('habits_list') || [];
    const completions = State.get('habits_completed_today') || {};
    DOM.setHTML('habits-container', Render.habits(habits, completions));
  },

  /**
   * Open the recipe add modal for the 'basics' profile.
   * @returns {void}
   */
  addRecipe: function() {
    Logger.log('main', 'addRecipe.start');
    if (typeof openSpiceModal === 'function') openSpiceModal('basics', null);
  },

  /**
   * Open the recipe edit modal for a given recipe id.
   * @param {string} id
   * @returns {void}
   */
  editRecipe: function(id) {
    Logger.log('main', 'editRecipe.start', {id});
    if (typeof openSpiceModal === 'function') openSpiceModal(null, id);
  },

  /**
   * Delete a recipe by id, refresh the recipes list, and show a toast.
   * @param {string} id
   * @returns {Promise<void>}
   */
  deleteRecipe: async function(id) {
    Logger.log('main', 'deleteRecipe.start', {id});
    try {
      await API.recipes.delete(id);
      const fresh = await loadRecipesFromDB();
      if (fresh) CONTENT.spice = fresh;
      if (typeof renderSpice === 'function') renderSpice();
      if (typeof toast === 'function') toast('Recipe deleted');
    } catch(e) {
      Logger.error('main', 'deleteRecipe', e);
      if (typeof toast === 'function') toast('Error deleting recipe');
    }
  },

  /**
   * Open the add-habit modal.
   * @returns {Promise<void>}
   */
  addHabit: async function() {
    Logger.log('main', 'addHabit.start');
    if (typeof openAddHabit === 'function') openAddHabit('custom');
  },

  /**
   * Delete a habit by id.
   * @param {string} id
   * @returns {void}
   */
  deleteHabit: function(id) {
    Logger.log('main', 'deleteHabit.start', {id});
    if (typeof removeHabit === 'function') removeHabit(id);
  }
};
