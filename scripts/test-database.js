'use strict';
const fs = require('fs');
const path = require('path');
const assert = require('node:assert/strict');
const {PGlite} = require('@electric-sql/pglite');
const root = path.resolve(__dirname, '..');
const sql = file => fs.readFileSync(path.join(root, file), 'utf8');

async function main() {
  const db = new PGlite();
  const results = {};
  try {
    await db.exec(sql('test/fixtures/security-schema.sql'));
    await db.exec("BEGIN; INSERT INTO auth.users(id) VALUES('00000000-0000-4000-8000-0000000000ff'); INSERT INTO public.profiles(id,username) VALUES('00000000-0000-4000-8000-0000000000ff','fixture'); SET LOCAL ROLE anon;");
    assert.equal((await db.query('SELECT count(*)::int AS count FROM public.profiles')).rows[0].count, 1);
    results.legacyExposureReproduced = true;
    await db.exec('ROLLBACK; BEGIN;');
    await db.exec(sql('database/migrations/20260905_001_profile_authorization.sql'));
    await db.exec(sql('database/migrations/20260905_002_data_isolation.sql'));
    await db.exec(sql('database/migrations/20260905_003_atomic_workout_save.sql'));
    await db.exec(sql('database/migrations/20260905_004_password_reset_guard.sql'));
    // Exercise the final policy set in the same order as the deployment runbook.
    const checks = await db.exec(sql('database/tests/profile_authorization.sql'));
    results.profileSecurity = checks.at(-1).rows[0].profile_security_result;
    assert.match(results.profileSecurity, /^PASS:/);
    const dataChecks = await db.exec(sql('database/tests/data_isolation.sql'));
    results.dataSecurity = dataChecks.at(-1).rows[0].data_security_result;
    assert.match(results.dataSecurity, /^PASS:/);
    const workoutChecks = await db.exec(sql('database/tests/atomic_workout_save.sql'));
    results.workoutSecurity = workoutChecks.at(-1).rows[0].workout_security_result;
    assert.match(results.workoutSecurity, /^PASS:/);
    const resetChecks = await db.exec(sql('database/tests/password_reset_guard.sql'));
    results.resetSecurity = resetChecks.at(-1).rows[0].reset_security_result;
    assert.match(results.resetSecurity, /^PASS:/);
    assert.equal((await db.query('SELECT count(*)::int AS count FROM auth.users')).rows[0].count, 0);
    results.fixturesRemoved = true;
    await db.exec('ROLLBACK;');
    process.stdout.write(JSON.stringify(results));
  } finally { await db.close(); }
}
main().catch(error => { process.stderr.write(error.message + '\n'); process.exitCode = 1; });
