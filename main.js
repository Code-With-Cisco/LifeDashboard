/**
 * Main: Orchestration layer — coordinates API, State, Render, and DOM.
 * Defines patterns for Phase 4+ service extraction.
 * NOTE: Main.init() is NOT called automatically. The app uses onAuthStateChange
 * for initialization; Main methods are invoked explicitly after auth is ready.
 */
window.Main = {

  /** Set up event delegation for data-action attributes */
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

  /** Render recipes container for a given profile */
  updateRecipesPage: function(profileId = 'basics') {
    const recipes = State.get('recipes_list') || [];
    DOM.setHTML('recipes-container', Render.recipes(recipes, profileId));
  },

  /** Render habits container */
  updateHabitsPage: function() {
    const habits = State.get('habits_list') || [];
    const completions = State.get('habits_completed_today') || {};
    DOM.setHTML('habits-container', Render.habits(habits, completions));
  },

  /** Open recipe add modal */
  addRecipe: function() {
    Logger.log('main', 'addRecipe.start');
    if (typeof openSpiceModal === 'function') openSpiceModal('basics', null);
  },

  /** Open recipe edit modal */
  editRecipe: function(id) {
    Logger.log('main', 'editRecipe.start', {id});
    if (typeof openSpiceModal === 'function') openSpiceModal(null, id);
  },

  /** Delete recipe with confirmation */
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

  /** Add habit via prompt */
  addHabit: async function() {
    Logger.log('main', 'addHabit.start');
    if (typeof openAddHabit === 'function') openAddHabit('custom');
  },

  /** Delete habit */
  deleteHabit: function(id) {
    Logger.log('main', 'deleteHabit.start', {id});
    if (typeof removeHabit === 'function') removeHabit(id);
  }
};
