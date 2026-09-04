/**
 * ProfileService - validation and payload construction for self-service profiles.
 *
 * This module is intentionally pure so profile rules can be tested without a
 * browser or Supabase connection.
 */
(function(root) {
  'use strict';

  const LIMITS = Object.freeze({
    targetWeight: [50, 1000],
    calorieTarget: [500, 10000],
    proteinTarget: [0, 1000],
    takeHomePay: [0, 1000000000],
    hourlyRate: [0.01, 1000000],
  });

  function isValidTimeZone(value) {
    try {
      Intl.DateTimeFormat('en-US', {timeZone: value}).format();
      return true;
    } catch (_) {
      return false;
    }
  }

  function numericValue(value) {
    if (value == null || String(value).trim() === '') return NaN;
    return Number(value);
  }

  function prepare(input) {
    const source = input || {};
    const displayName = String(source.displayName || '').trim();
    const username = String(source.username || '').trim().toLowerCase();
    const timezone = String(source.timezone || '').trim();
    const targetWeight = numericValue(source.targetWeight);
    const calorieTarget = numericValue(source.calorieTarget);
    const proteinTarget = numericValue(source.proteinTarget);
    const takeHomePay = numericValue(source.takeHomePay);
    const hourlyRate = numericValue(source.hourlyRate);
    const errors = [];

    if (!displayName || displayName.length > 80) errors.push('Display name must be 1-80 characters.');
    if (!/^[a-z0-9._-]{2,40}$/.test(username)) errors.push('Username must be 2-40 letters, numbers, dots, dashes, or underscores.');
    if (!isValidTimeZone(timezone)) errors.push('Enter a valid IANA timezone, such as America/New_York.');

    const checkRange = (value, key, label) => {
      const [min, max] = LIMITS[key];
      if (!Number.isFinite(value) || value < min || value > max) {
        errors.push(`${label} must be between ${min} and ${max}.`);
      }
    };
    checkRange(targetWeight, 'targetWeight', 'Target weight');
    checkRange(calorieTarget, 'calorieTarget', 'Daily calories');
    checkRange(proteinTarget, 'proteinTarget', 'Daily protein');
    checkRange(takeHomePay, 'takeHomePay', 'Monthly take-home pay');
    checkRange(hourlyRate, 'hourlyRate', 'Hourly rate');

    return {
      valid: errors.length === 0,
      errors,
      payload: {
        display_name: displayName,
        username,
        timezone,
        target_weight: targetWeight,
        calorie_target: calorieTarget,
        protein_target: proteinTarget,
        take_home_pay: takeHomePay,
        wit_hourly_rate: hourlyRate,
      },
    };
  }

  root.ProfileService = Object.freeze({isValidTimeZone, prepare});
})(typeof window !== 'undefined' ? window : globalThis);
