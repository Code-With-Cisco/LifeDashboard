require('../services/NutritionService.js');
const NS = window.NutritionService;

describe('NutritionService.getPlanTargets', () => {
  test('returns correct targets for high-protein-deficit plan', () => {
    const t = NS.getPlanTargets('high-protein-deficit');
    expect(t.calories).toBe(1900);
    expect(t.protein_g).toBe(185);
    expect(t.carbs_g).toBe(175);
    expect(t.fat_g).toBe(55);
    expect(t.water_oz).toBe(120);
  });
  test('returns correct targets for balanced-deficit plan', () => {
    const t = NS.getPlanTargets('balanced-deficit');
    expect(t.calories).toBe(1800);
    expect(t.protein_g).toBe(160);
  });
  test('returns correct targets for maintenance-muscle plan', () => {
    const t = NS.getPlanTargets('maintenance-muscle');
    expect(t.calories).toBe(2400);
    expect(t.protein_g).toBe(200);
  });
  test('falls back to DEFAULT_TARGETS for unknown plan', () => {
    const t = NS.getPlanTargets('nonexistent');
    expect(t).toEqual(NS.DEFAULT_TARGETS);
  });
  test('falls back for null/undefined plan', () => {
    expect(NS.getPlanTargets(null)).toEqual(NS.DEFAULT_TARGETS);
    expect(NS.getPlanTargets(undefined)).toEqual(NS.DEFAULT_TARGETS);
  });
});

describe('NutritionService.sumMacros', () => {
  test('sums calories, protein, carbs, fat across entries', () => {
    const entries = [
      {calories: 500, protein_g: 40, carbs_g: 50, fat_g: 15},
      {calories: 300, protein_g: 20, carbs_g: 30, fat_g: 10},
    ];
    const result = NS.sumMacros(entries);
    expect(result).toEqual({cal: 800, pro: 60, car: 80, fat: 25});
  });
  test('returns all zeros for empty array', () => {
    expect(NS.sumMacros([])).toEqual({cal: 0, pro: 0, car: 0, fat: 0});
  });
  test('handles null gracefully', () => {
    expect(NS.sumMacros(null)).toEqual({cal: 0, pro: 0, car: 0, fat: 0});
  });
  test('treats missing macro fields as 0', () => {
    const entries = [{calories: 400}];
    const result = NS.sumMacros(entries);
    expect(result.cal).toBe(400);
    expect(result.pro).toBe(0);
    expect(result.car).toBe(0);
    expect(result.fat).toBe(0);
  });
  test('single entry passes through unchanged', () => {
    const entry = {calories: 100, protein_g: 10, carbs_g: 5, fat_g: 3};
    expect(NS.sumMacros([entry])).toEqual({cal: 100, pro: 10, car: 5, fat: 3});
  });
});

describe('NutritionService.remaining', () => {
  const targets = {calories: 1900, protein_g: 185, carbs_g: 175, fat_g: 55};

  test('subtracts consumed from targets', () => {
    const consumed = {cal: 900, pro: 85, car: 75, fat: 25};
    const result = NS.remaining(targets, consumed);
    expect(result).toEqual({cal: 1000, pro: 100, car: 100, fat: 30});
  });
  test('clamps to 0 when consumed exceeds target (never negative)', () => {
    const consumed = {cal: 2500, pro: 200, car: 200, fat: 100};
    const result = NS.remaining(targets, consumed);
    expect(result.cal).toBe(0);
    expect(result.pro).toBe(0);
    expect(result.car).toBe(0);
    expect(result.fat).toBe(0);
  });
  test('returns full targets when consumed is all zeros', () => {
    const consumed = {cal: 0, pro: 0, car: 0, fat: 0};
    const result = NS.remaining(targets, consumed);
    expect(result.cal).toBe(1900);
    expect(result.pro).toBe(185);
  });
  test('handles missing consumed fields as 0', () => {
    const result = NS.remaining(targets, {});
    expect(result.cal).toBe(1900);
  });
});

describe('NutritionService.pctOfTarget', () => {
  test('returns 100 when consumed equals target', () => {
    expect(NS.pctOfTarget(185, 185)).toBe(100);
  });
  test('clamps to 100 when consumed exceeds target', () => {
    expect(NS.pctOfTarget(200, 185)).toBe(100);
  });
  test('returns 0 when nothing consumed', () => {
    expect(NS.pctOfTarget(0, 185)).toBe(0);
  });
  test('returns 0 when target is 0 (no divide-by-zero)', () => {
    expect(NS.pctOfTarget(100, 0)).toBe(0);
  });
  test('returns correct percentage for partial consumption', () => {
    expect(NS.pctOfTarget(93, 185)).toBe(50);
  });
  test('rounds to nearest integer', () => {
    expect(NS.pctOfTarget(1, 3)).toBe(33);
  });
});
