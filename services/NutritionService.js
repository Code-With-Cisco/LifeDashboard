/**
 * NutritionService: Business logic for nutrition tracking.
 * No DOM manipulation. No direct sb.from() calls. Uses API module for data access.
 */
window.NutritionService = {

  PLAN_TARGETS: {
    'high-protein-deficit': {calories: 1900, protein_g: 185, carbs_g: 175, fat_g: 55, sugar_max_g: 35, water_oz: 120},
    'balanced-deficit':     {calories: 1800, protein_g: 160, carbs_g: 180, fat_g: 55, sugar_max_g: 40, water_oz: 120},
    'maintenance-muscle':   {calories: 2400, protein_g: 200, carbs_g: 250, fat_g: 70, sugar_max_g: 45, water_oz: 128},
  },

  DEFAULT_TARGETS: {calories: 1900, protein_g: 185, carbs_g: 175, fat_g: 55, sugar_max_g: 35, water_oz: 120},

  /** Return macro targets for a plan ID, falling back to defaults. */
  getPlanTargets: function(planId) {
    return this.PLAN_TARGETS[planId] || this.DEFAULT_TARGETS;
  },

  /**
   * Sum macro fields across an array of meal/log entries.
   * Each entry may have: calories, protein_g, carbs_g, fat_g.
   * Returns {cal, pro, car, fat}.
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
   * Calculate remaining macros against targets.
   * targets: {calories, protein_g, carbs_g, fat_g}
   * consumed: {cal, pro, car, fat}
   * Returns {cal, pro, car, fat} with values clamped to >= 0.
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
   * Calculate percent of target achieved for one macro.
   * Returns 0–100 clamped value.
   */
  pctOfTarget: function(consumed, target) {
    if (!target) return 0;
    return Math.min(100, Math.round(consumed / target * 100));
  }
};
