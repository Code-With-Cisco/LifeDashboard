/**
 * HabitService: Business logic for habits.
 * No DOM manipulation. No direct sb.from() calls. Uses API module for data access.
 */
window.HabitService = {

  TOTAL_HABITS: 17,

  /** Calculate completion percentage (0–100). */
  completionPct: function(completed, total) {
    if (!total) return 0;
    return Math.round(completed / total * 100);
  },

  /** Return CSS color variable for a completion percentage. */
  barColor: function(pct) {
    if (pct >= 80) return 'var(--grn)';
    if (pct >= 50) return 'var(--amb)';
    if (pct > 0)   return 'var(--red)';
    return 'var(--s3)';
  },

  /**
   * Calculate streak from an ordered array of daily completion counts (most recent first).
   * A day counts if its completed count meets minPerDay.
   * Returns the number of consecutive qualifying days from today backward.
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
   * Analyze a flat array of habit_log rows ({habit_id, completed}) for a single day.
   * Returns {total, completed, pct}.
   */
  analyzeDay: function(logs) {
    const total = (logs || []).length;
    const completed = (logs || []).filter(h => h.completed).length;
    return {total, completed, pct: this.completionPct(completed, total || this.TOTAL_HABITS)};
  },

  /**
   * Group a flat array of habit_log rows by habit_id.
   * Returns {[habitId]: boolean} map of today's completions.
   */
  toCompletionMap: function(logs) {
    const map = {};
    (logs || []).forEach(h => { map[h.habit_id] = !!h.completed; });
    return map;
  }
};
