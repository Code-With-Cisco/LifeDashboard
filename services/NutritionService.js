/**
 * NutritionService — Business logic for nutrition tracking.
 *
 * PURPOSE: Pure business logic for macro calculations and plan targets.
 *   No DOM manipulation, no sb.from() calls, no Logger calls.
 *   Consumed by app.js; tested in test/NutritionService.test.js.
 *
 * PUBLIC INTERFACE:
 *   NutritionService.getPlanTargets(planId)        → targets object
 *   NutritionService.sumMacros(entries)            → {cal, pro, car, fat}
 *   NutritionService.remaining(targets, consumed)  → {cal, pro, car, fat}
 *   NutritionService.pctOfTarget(consumed, target) → 0–100
 *
 * CONNECTED TO: app.js (consumer)
 *               test/NutritionService.test.js
 */
window.NutritionService = {

  PLAN_TARGETS: {
    'high-protein-deficit': {calories: 1900, protein_g: 185, carbs_g: 175, fat_g: 55, sugar_max_g: 35, water_oz: 120},
    'balanced-deficit':     {calories: 1800, protein_g: 160, carbs_g: 180, fat_g: 55, sugar_max_g: 40, water_oz: 120},
    'maintenance-muscle':   {calories: 2400, protein_g: 200, carbs_g: 250, fat_g: 70, sugar_max_g: 45, water_oz: 128},
  },

  DEFAULT_TARGETS: {calories: 1900, protein_g: 185, carbs_g: 175, fat_g: 55, sugar_max_g: 35, water_oz: 120},

  /**
   * Return macro targets for a nutrition plan, falling back to defaults if unknown.
   * @param {string} planId - 'high-protein-deficit' | 'balanced-deficit' | 'maintenance-muscle'
   * @returns {{calories:number, protein_g:number, carbs_g:number, fat_g:number, sugar_max_g:number, water_oz:number}}
   */
  getPlanTargets: function(planId) {
    return this.PLAN_TARGETS[planId] || this.DEFAULT_TARGETS;
  },

  /**
   * Sum macro fields across an array of meal/log entries.
   * Missing fields on individual entries are treated as 0.
   * @param {Array<{calories?:number, protein_g?:number, carbs_g?:number, fat_g?:number}>} entries
   * @returns {{cal:number, pro:number, car:number, fat:number}}
   */
  sumMacros: function(entries) {
    const totals = {cal: 0, pro: 0, car: 0, fat: 0};
    (entries || []).forEach(e => {
      totals.cal += e.calories   || 0;
      totals.pro += e.protein_g  || 0;
      totals.car += e.carbs_g    || 0;
      totals.fat += e.fat_g      || 0;
    });
    return totals;
  },

  /**
   * Calculate remaining macros versus plan targets, clamped to >= 0.
   * @param {{calories:number, protein_g:number, carbs_g:number, fat_g:number}} targets
   * @param {{cal:number, pro:number, car:number, fat:number}} consumed
   * @returns {{cal:number, pro:number, car:number, fat:number}}
   */
  remaining: function(targets, consumed) {
    return {
      cal: Math.max(0, (targets.calories  || 0) - (consumed.cal || 0)),
      pro: Math.max(0, (targets.protein_g || 0) - (consumed.pro || 0)),
      car: Math.max(0, (targets.carbs_g   || 0) - (consumed.car || 0)),
      fat: Math.max(0, (targets.fat_g     || 0) - (consumed.fat || 0)),
    };
  },

  /**
   * Calculate what percentage of a macro target has been consumed, clamped to 0–100.
   * @param {number} consumed - amount consumed
   * @param {number} target   - target amount (returns 0 if target is falsy)
   * @returns {number} integer 0–100
   */
  pctOfTarget: function(consumed, target) {
    if (!target) return 0;
    return Math.min(100, Math.round(consumed / target * 100));
  }
};
