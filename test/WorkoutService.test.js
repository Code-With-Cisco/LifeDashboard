require('../services/WorkoutService.js');

const Workouts = window.WorkoutService;

describe('WorkoutService', () => {
  test('finds Friday in a compact three-day plan by its day number', () => {
    const plan = {days: [
      {day: 1, focus: 'Full Body A'},
      {day: 3, focus: 'Full Body B'},
      {day: 5, focus: 'Full Body C'},
    ]};
    expect(Workouts.forWeekday(plan, 5)?.focus).toBe('Full Body C');
    expect(Workouts.forWeekday(plan, 2)).toBeNull();
  });

  test('keeps compatibility with legacy seven-slot arrays', () => {
    const friday = {focus: 'Legacy Friday'};
    expect(Workouts.forWeekday({days: [null, null, null, null, null, friday]}, 5)).toBe(friday);
  });

  test('normalizes named custom-plan days for reload-safe daily selection', () => {
    const days = Workouts.normalizeCustomDays([{day_name: 'Monday'}, {day_name: 'Friday'}]);
    expect(days.map(day => day.day)).toEqual([1, 5]);
    expect(Workouts.forWeekday({days}, 5)?.day_name).toBe('Friday');
  });
});
