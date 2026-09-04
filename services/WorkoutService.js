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

  root.WorkoutService = Object.freeze({forWeekday, weekdayNumber, normalizeCustomDays});
})(typeof window !== 'undefined' ? window : globalThis);
