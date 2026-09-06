/** @jest-environment node */
const {execFileSync} = require('child_process');
const path = require('path');
let results;
beforeAll(() => {
  // Keep the PostgreSQL WASM engine outside Jest's module VM. This disposable
  // in-memory database has no network connection or production credentials.
  results = JSON.parse(execFileSync(process.execPath,
    [path.join(__dirname, '../scripts/test-database.js')], {encoding: 'utf8', timeout: 60000}));
}, 65000);
test('legacy unrestricted profile reads are reproduced using anonymous PostgreSQL role', () => {
  expect(results.legacyExposureReproduced).toBe(true);
});
test('profile isolation, protected role fields, and legitimate admin access pass in PostgreSQL', () => {
  expect(results.profileSecurity).toMatch(/^PASS:/);
  expect(results.fixturesRemoved).toBe(true);
});
test('private catalogs, tasks, workout children and the meal RPC enforce ownership in PostgreSQL', () => {
  expect(results.dataSecurity).toMatch(/^PASS:/);
});

test('workout replacement rolls back fully on failure and enforces caller ownership', () => {
  expect(results.workoutSecurity).toMatch(/^PASS:/);
});

test('reset requirements survive profile edits and clear on an Auth password change', () => {
  expect(results.resetSecurity).toMatch(/^PASS:/);
});

test('the exact review bundle preserves existing records and rolls back the remaining migrations', () => {
  expect(results.existingRowsPreserved).toBe(true);
});
