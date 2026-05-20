/**
 * HabitService — Business logic for habit tracking.
 *
 * PURPOSE: Pure business logic for habit completion calculations.
 *   No DOM manipulation, no sb.from() calls, no Logger calls.
 *   Consumed by app.js; tested in test/HabitService.test.js.
 *
 * PUBLIC INTERFACE:
 *   HabitService.completionPct(completed, total)      → 0–100
 *   HabitService.barColor(pct)                        → CSS variable string
 *   HabitService.calcStreak(dailyCounts, minPerDay)   → number
 *   HabitService.analyzeDay(logs)                     → {total, completed, pct}
 *   HabitService.toCompletionMap(logs)                → {[habitId]: boolean}
 *
 * CONNECTED TO: app.js (consumer)
 *               test/HabitService.test.js
 */
window.HabitService = {

  TOTAL_HABITS: 17,

  /**
   * Calculate the percentage of habits completed (0–100, rounded).
   * @param {number} completed - number of completed habits
   * @param {number} total     - total number of habits
   * @returns {number}
   */
  completionPct: function(completed, total) {
    if (!total) return 0;
    return Math.round(completed / total * 100);
  },

  /**
   * Return the CSS color variable for a completion percentage.
   * >= 80% → green, >= 50% → amber, > 0% → red, 0% → surface color.
   * @param {number} pct - completion percentage (0–100)
   * @returns {string} CSS custom property, e.g. 'var(--grn)'
   */
  barColor: function(pct) {
    if (pct >= 80) return 'var(--grn)';
    if (pct >= 50) return 'var(--amb)';
    if (pct > 0)   return 'var(--red)';
    return 'var(--s3)';
  },

  /**
   * Calculate streak from an ordered array of daily completion counts.
   * Iterates from index 0 (today) backward; stops at the first day below minPerDay.
   * @param {number[]} dailyCounts - daily completed habit counts, most recent first
   * @param {number}   [minPerDay=10] - minimum completions required to count a day
   * @returns {number} number of consecutive qualifying days
   */
  calcStreak: function(dailyCounts, minPerDay = 10) {
    let streak = 0;
    for (const count of dailyCounts) {
      if (count >= minPerDay) streak++;
      else break;
    }
    return streak;
  },

  /**
   * Analyze a flat array of habit log rows for a single day.
   * @param {Array<{habit_id: string, completed: boolean}>} logs
   * @returns {{total: number, completed: number, pct: number}}
   */
  analyzeDay: function(logs) {
    const total = (logs || []).length;
    const completed = (logs || []).filter(h => h.completed).length;
    return {total, completed, pct: this.completionPct(completed, total || this.TOTAL_HABITS)};
  },

  /**
   * Convert a flat array of habit log rows into a completion map.
   * @param {Array<{habit_id: string, completed: boolean}>} logs
   * @returns {Object.<string, boolean>} map of habit_id → completed
   */
  toCompletionMap: function(logs) {
    const map = {};
    (logs || []).forEach(h => { map[h.habit_id] = !!h.completed; });
    return map;
  }
};
