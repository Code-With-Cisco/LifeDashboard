require('../services/RecipeService.js');
const RS = window.RecipeService;

const RECIPES = [
  {id: '1', name: 'Chicken Breast',  profile_id: 'basics', rating: 'good',       protein_g: 40, calories_per_serving: 500},
  {id: '2', name: 'Pasta Bolognese', profile_id: 'basics', rating: 'so-so',      protein_g: 20, calories_per_serving: 700},
  {id: '3', name: 'Cheese Cake',     profile_id: 'basics', rating: 'needs-care', protein_g: 8,  calories_per_serving: 900},
  {id: '4', name: 'Protein Shake',   profile_id: 'bulk',   rating: 'good',       protein_g: 50, calories_per_serving: 400},
  {id: '5', name: 'Zero Cal Jello',  profile_id: 'basics', rating: 'good',       protein_g: 5,  calories_per_serving: 0},
];

describe('RecipeService.rate', () => {
  test('returns good when protein >= 30 AND calories <= 600', () => {
    expect(RS.rate(600, 30)).toBe('good');
  });
  test('returns so-so when calories just over 600 but protein ok', () => {
    expect(RS.rate(601, 30)).toBe('so-so');
  });
  test('returns needs-care when protein < 15', () => {
    expect(RS.rate(0, 14)).toBe('needs-care');
  });
  test('returns needs-care when calories > 800', () => {
    expect(RS.rate(801, 20)).toBe('needs-care');
  });
  test('returns null when both cal and protein are 0/falsy', () => {
    expect(RS.rate(0, 0)).toBeNull();
    expect(RS.rate(null, null)).toBeNull();
  });
  test('returns so-so for moderate values', () => {
    expect(RS.rate(700, 20)).toBe('so-so');
  });
  test('coerces string numbers', () => {
    expect(RS.rate('600', '30')).toBe('good');
  });
});

describe('RecipeService.ratingInfo', () => {
  test('returns config object for known rating', () => {
    const info = RS.ratingInfo('good');
    expect(info).toMatchObject({label: 'Good', badge: 'b-g'});
  });
  test('returns null for unknown rating', () => {
    expect(RS.ratingInfo('unknown')).toBeNull();
    expect(RS.ratingInfo('')).toBeNull();
  });
  test('covers all three ratings', () => {
    expect(RS.ratingInfo('so-so')).toMatchObject({label: 'So-So'});
    expect(RS.ratingInfo('needs-care')).toMatchObject({label: 'Needs Care'});
  });
});

describe('RecipeService.filter', () => {
  test('returns all recipes when no criteria given', () => {
    expect(RS.filter(RECIPES).length).toBe(5);
  });
  test('filters by profileId', () => {
    const result = RS.filter(RECIPES, {profileId: 'bulk'});
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('4');
  });
  test('filters by rating', () => {
    const result = RS.filter(RECIPES, {rating: 'needs-care'});
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('3');
  });
  test('filters by both profileId and rating', () => {
    const result = RS.filter(RECIPES, {profileId: 'basics', rating: 'good'});
    expect(result).toHaveLength(2);
    expect(result.map(r => r.id)).toContain('1');
    expect(result.map(r => r.id)).toContain('5');
  });
  test('returns empty array for empty input', () => {
    expect(RS.filter([], {profileId: 'basics'})).toHaveLength(0);
  });
  test('handles null input gracefully', () => {
    expect(RS.filter(null)).toHaveLength(0);
  });
});

describe('RecipeService.suggest', () => {
  test('returns top n recipes by protein density', () => {
    const result = RS.suggest(RECIPES, 'basics', 2);
    expect(result).toHaveLength(2);
    // Chicken: 40/500=0.08, Pasta: 20/700=0.028, CheeseCake: 8/900=0.009, ZeroCalJello: 0
    expect(result[0].id).toBe('1');
    expect(result[1].id).toBe('2');
  });
  test('recipes with 0 calories rank last (density = 0)', () => {
    // basics has 4 recipes; request all 4 so the zero-cal entry appears
    const result = RS.suggest(RECIPES, 'basics', 4);
    const last = result[result.length - 1];
    expect(last.calories_per_serving).toBe(0);
  });
  test('filters by profileId before ranking', () => {
    const result = RS.suggest(RECIPES, 'bulk', 5);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('4');
  });
  test('respects n cap', () => {
    expect(RS.suggest(RECIPES, 'basics', 1)).toHaveLength(1);
    expect(RS.suggest(RECIPES, 'basics', 100)).toHaveLength(4); // only 4 in basics
  });
  test('returns empty for unknown profile', () => {
    expect(RS.suggest(RECIPES, 'nonexistent', 5)).toHaveLength(0);
  });
});
