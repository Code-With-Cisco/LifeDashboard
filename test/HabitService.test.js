require('../services/HabitService.js');
const HS = window.HabitService;

describe('HabitService.completionPct', () => {
  test('100% when all completed', () => {
    expect(HS.completionPct(17, 17)).toBe(100);
  });
  test('0% when none completed', () => {
    expect(HS.completionPct(0, 17)).toBe(0);
  });
  test('returns 0 when total is 0 (no divide-by-zero)', () => {
    expect(HS.completionPct(0, 0)).toBe(0);
  });
  test('rounds to nearest integer', () => {
    expect(HS.completionPct(1, 3)).toBe(33);
  });
  test('50% midpoint', () => {
    expect(HS.completionPct(5, 10)).toBe(50);
  });
});

describe('HabitService.barColor', () => {
  test('green at exactly 80%', () => {
    expect(HS.barColor(80)).toBe('var(--grn)');
  });
  test('green above 80%', () => {
    expect(HS.barColor(100)).toBe('var(--grn)');
  });
  test('amber at exactly 50%', () => {
    expect(HS.barColor(50)).toBe('var(--amb)');
  });
  test('amber between 50 and 79', () => {
    expect(HS.barColor(79)).toBe('var(--amb)');
  });
  test('red for any positive value below 50', () => {
    expect(HS.barColor(1)).toBe('var(--red)');
    expect(HS.barColor(49)).toBe('var(--red)');
  });
  test('neutral color for 0%', () => {
    expect(HS.barColor(0)).toBe('var(--s3)');
  });
});

describe('HabitService.calcStreak', () => {
  test('returns consecutive days from the front meeting minPerDay', () => {
    expect(HS.calcStreak([15, 12, 10, 5], 10)).toBe(3);
  });
  test('returns 0 for empty array', () => {
    expect(HS.calcStreak([])).toBe(0);
  });
  test('breaks at first day below threshold', () => {
    expect(HS.calcStreak([11, 9, 15], 10)).toBe(1);
  });
  test('uses default minPerDay of 10', () => {
    expect(HS.calcStreak([10, 10, 10])).toBe(3);
    expect(HS.calcStreak([9, 10, 10])).toBe(0);
  });
  test('returns full length when all days qualify', () => {
    expect(HS.calcStreak([17, 17, 17, 17], 10)).toBe(4);
  });
});

describe('HabitService.analyzeDay', () => {
  test('counts completed and total correctly', () => {
    const logs = [{habit_id: '1', completed: true}, {habit_id: '2', completed: false}];
    const result = HS.analyzeDay(logs);
    expect(result.total).toBe(2);
    expect(result.completed).toBe(1);
    expect(result.pct).toBe(50);
  });
  test('handles empty logs', () => {
    const result = HS.analyzeDay([]);
    expect(result.total).toBe(0);
    expect(result.completed).toBe(0);
    expect(result.pct).toBe(0);
  });
  test('handles null logs gracefully', () => {
    const result = HS.analyzeDay(null);
    expect(result.total).toBe(0);
    expect(result.completed).toBe(0);
  });
  test('all completed', () => {
    const logs = [{habit_id: '1', completed: true}, {habit_id: '2', completed: true}];
    expect(HS.analyzeDay(logs).pct).toBe(100);
  });
});

describe('HabitService.toCompletionMap', () => {
  test('returns habitId -> boolean map', () => {
    const logs = [
      {habit_id: 'h1', completed: true},
      {habit_id: 'h2', completed: false},
    ];
    const map = HS.toCompletionMap(logs);
    expect(map['h1']).toBe(true);
    expect(map['h2']).toBe(false);
  });
  test('returns empty object for empty array', () => {
    expect(HS.toCompletionMap([])).toEqual({});
  });
  test('returns empty object for null', () => {
    expect(HS.toCompletionMap(null)).toEqual({});
  });
  test('coerces truthy/falsy completed values to boolean', () => {
    const logs = [{habit_id: 'h1', completed: 1}, {habit_id: 'h2', completed: 0}];
    const map = HS.toCompletionMap(logs);
    expect(map['h1']).toBe(true);
    expect(map['h2']).toBe(false);
  });
});
