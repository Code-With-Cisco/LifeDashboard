/** Pure helpers for selecting workout-plan data. */
(function(root) {
  'use strict';

  function forWeekday(plan, weekday) {
    const days = Array.isArray(plan?.days) ? plan.days : [];
    const target = Number(weekday);
    const mapped = days.find(day => Number(day?.day) === target);
    if (mapped) return mapped;
    if (days.some(day => day?.day != null)) return null;
    return days[target] || null;
  }

  function weekdayNumber(value, fallbackIndex) {
    if (value !== '' && value != null && Number.isInteger(Number(value)) && Number(value) >= 0 && Number(value) <= 6) return Number(value);
    const names = {sun: 0, sunday: 0, mon: 1, monday: 1, tue: 2, tues: 2, tuesday: 2,
      wed: 3, wednesday: 3, thu: 4, thur: 4, thurs: 4, thursday: 4,
      fri: 5, friday: 5, sat: 6, saturday: 6};
    const normalized = String(value || '').trim().toLowerCase();
    if (Object.prototype.hasOwnProperty.call(names, normalized)) return names[normalized];
    return (Number(fallbackIndex) + 1) % 7;
  }

  function normalizeCustomDays(days) {
    return (Array.isArray(days) ? days : []).map((day, index) => ({
      ...day,
      day: weekdayNumber(day?.day ?? day?.day_name, index),
    }));
  }

  function setCount(value) {
    const count = Number(value);
    return Number.isFinite(count) && count > 0 ? Math.min(20, Math.floor(count)) || 1 : 3;
  }

  function sessionPayload(draft, readInput, notes, duration) {
    if (!draft || !Array.isArray(draft.exercises) || draft.exercises.length > 100) {
      throw new Error('Reopen the workout before saving.');
    }
    const number = (value, max, integer, label) => {
      if (value == null || String(value).trim() === '') return null;
      const n = Number(value);
      if (!Number.isFinite(n) || n < 0 || n > max || (integer && !Number.isInteger(n))) {
        throw new Error('Enter a valid ' + label + '.');
      }
      return n;
    };
    const sets = [];
    draft.exercises.forEach((exercise, index) => {
      const name = String(exercise.name || '').trim();
      if (!name || name.length > 200) throw new Error('Exercise names must contain 1–200 characters.');
      for (let set = 0; set < setCount(exercise.sets); set++) {
        const weight = number(readInput(index, set, 'w'), 5000, false, 'weight between 0 and 5,000 lbs');
        const reps = number(readInput(index, set, 'r'), 10000, true, 'whole repetition count between 0 and 10,000');
        if (weight !== null || reps !== null) sets.push({exercise_name: name, set_number: set + 1,
          weight_lbs: weight, reps_completed: reps});
      }
    });
    if (sets.length > 400) throw new Error('A session can contain at most 400 sets.');
    if (String(notes).length > 10000) throw new Error('Keep session notes under 10,000 characters.');
    return {p_session_id: draft.sessionId, p_session_date: draft.date, p_day_name: draft.focus,
      p_day_index: draft.dayIndex, p_notes: String(notes),
      p_duration_minutes: number(duration, 1440, true, 'duration between 0 and 1,440 minutes'), p_sets: sets};
  }

  root.WorkoutService = Object.freeze({forWeekday, weekdayNumber, normalizeCustomDays, setCount, sessionPayload});
})(typeof window !== 'undefined' ? window : globalThis);
