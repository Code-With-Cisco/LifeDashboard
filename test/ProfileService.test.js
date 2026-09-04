require('../services/ProfileService.js');

const Profiles = window.ProfileService;

const validDraft = {
  displayName: 'Cisco',
  username: 'cisco.test',
  timezone: 'America/New_York',
  targetWeight: '165',
  calorieTarget: '1900',
  proteinTarget: '185',
  takeHomePay: '3370',
  hourlyRate: '23',
};

describe('ProfileService', () => {
  test('normalizes a valid profile into database columns', () => {
    expect(Profiles.prepare(validDraft)).toEqual({
      valid: true,
      errors: [],
      payload: {
        display_name: 'Cisco',
        username: 'cisco.test',
        timezone: 'America/New_York',
        target_weight: 165,
        calorie_target: 1900,
        protein_target: 185,
        take_home_pay: 3370,
        wit_hourly_rate: 23,
      },
    });
  });

  test('rejects unsafe usernames, invalid timezones, and out-of-range values', () => {
    const result = Profiles.prepare({...validDraft, username: '<admin>', timezone: 'Mars/Base', calorieTarget: 10});
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(3);
  });
});
