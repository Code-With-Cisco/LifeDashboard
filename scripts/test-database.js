'use strict';
const fs = require('fs');
const path = require('path');
const assert = require('node:assert/strict');
const {PGlite} = require('@electric-sql/pglite');
const {buildRepairTransaction} = require('./prepare-database-repair');
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
    await db.exec('ROLLBACK;');
    // Match production just before the 002–004 repair: 001 is applied. Retain a
    // synthetic existing account and task to exercise the preservation guard.
    await db.exec(sql('database/migrations/20260905_001_profile_authorization.sql'));
    await db.exec("INSERT INTO auth.users(id) VALUES('00000000-0000-4000-8000-0000000000ff'); INSERT INTO public.profiles(id,username) VALUES('00000000-0000-4000-8000-0000000000ff','existing_fixture'); INSERT INTO public.todo_items(user_id,title) VALUES('00000000-0000-4000-8000-0000000000ff','Existing task');");
    const checks = (await db.exec(buildRepairTransaction())).flatMap(result => result.rows || []);
    results.profileSecurity = checks.find(row => row.profile_security_result)?.profile_security_result;
    assert.match(results.profileSecurity, /^PASS:/);
    results.dataSecurity = checks.find(row => row.data_security_result)?.data_security_result;
    assert.match(results.dataSecurity, /^PASS:/);
    results.workoutSecurity = checks.find(row => row.workout_security_result)?.workout_security_result;
    assert.match(results.workoutSecurity, /^PASS:/);
    results.resetSecurity = checks.find(row => row.reset_security_result)?.reset_security_result;
    assert.match(results.resetSecurity, /^PASS:/);
    assert.match(checks.find(row => row.repair_result)?.repair_result, /^PASS:/);
    assert.equal((await db.query('SELECT count(*)::int AS count FROM auth.users')).rows[0].count, 1);
    assert.equal((await db.query('SELECT title FROM public.todo_items')).rows[0].title, 'Existing task');
    assert.equal((await db.query("SELECT to_regprocedure('public.save_workout_session(uuid,date,text,integer,text,integer,jsonb)') IS NULL AS rolled_back")).rows[0].rolled_back, true);
    results.fixturesRemoved = true;
    results.existingRowsPreserved = true;
    process.stdout.write(JSON.stringify(results));
  } finally { await db.close(); }
}
main().catch(error => { process.stderr.write(error.message + '\n'); process.exitCode = 1; });
