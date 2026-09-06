'use strict';
// Produces SQL for review; never connects to or changes a database.
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const migrations = [
  '20260905_001_profile_authorization.sql',
  '20260905_002_data_isolation.sql',
  '20260905_003_atomic_workout_save.sql',
  '20260905_004_password_reset_guard.sql',
];
const tests = ['profile_authorization.sql', 'data_isolation.sql',
  'atomic_workout_save.sql', 'password_reset_guard.sql'];

function buildRepairTransaction({from = 2, commit = false} = {}) {
  if (![1, 2].includes(from)) throw new Error('Start at 001 for a fresh database or 002 after the profile repair.');
  const prefix = `BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='90s';
CREATE TEMP TABLE repair_row_fingerprints(schema_name text,table_name text,fingerprint text) ON COMMIT DROP;
DO $baseline$ DECLARE t record; digest text; BEGIN
 IF EXISTS(SELECT 1 FROM public.profiles WHERE role IS NULL) THEN
  RAISE EXCEPTION 'Review existing null account role before applying'; END IF;
 FOR t IN SELECT n.nspname AS schema_name,c.relname AS table_name
  FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE (n.nspname='public' AND c.relkind='r') OR
   (n.nspname='auth' AND c.relname='users' AND c.relkind='r')
  ORDER BY n.nspname,c.relname LOOP
  EXECUTE format('LOCK TABLE %I.%I IN SHARE ROW EXCLUSIVE MODE',t.schema_name,t.table_name);
  EXECUTE format('SELECT md5(coalesce(string_agg(row_to_json(r)::text,'''' ORDER BY id),'''')) FROM %I.%I r',t.schema_name,t.table_name) INTO digest;
  INSERT INTO pg_temp.repair_row_fingerprints VALUES(t.schema_name,t.table_name,digest);
 END LOOP;
END; $baseline$;`;
  const verify = `DO $verify$ DECLARE t record; digest text; BEGIN
 FOR t IN SELECT * FROM pg_temp.repair_row_fingerprints LOOP
  EXECUTE format('SELECT md5(coalesce(string_agg(row_to_json(r)::text,'''' ORDER BY id),'''')) FROM %I.%I r',t.schema_name,t.table_name) INTO digest;
  IF digest IS DISTINCT FROM t.fingerprint THEN
   RAISE EXCEPTION 'Existing records changed in %.%',t.schema_name,t.table_name; END IF;
 END LOOP;
 IF EXISTS(SELECT 1 FROM auth.users WHERE id IN
  ('00000000-0000-4000-8000-0000000000a1','00000000-0000-4000-8000-0000000000b2','00000000-0000-4000-8000-0000000000c3')) THEN
  RAISE EXCEPTION 'Test accounts remain'; END IF;
 IF to_regprocedure('public.security_test_reject_set()') IS NOT NULL THEN
  RAISE EXCEPTION 'Test failure trigger remains'; END IF;
END; $verify$;
SELECT 'PASS: all four security suites; existing public and Auth user records unchanged; all fixtures removed' AS repair_result;`;
  return [prefix, ...migrations.slice(from - 1).map(file => read('database/migrations/' + file)),
    ...tests.map(file => read('database/tests/' + file)), verify, commit ? 'COMMIT;' : 'ROLLBACK;'].join('\n\n') + '\n';
}

module.exports = {buildRepairTransaction};
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.some(arg => !['--from=001', '--from=002', '--commit'].includes(arg)) ||
      args.filter(arg => arg.startsWith('--from=')).length > 1) {
    process.stderr.write('Usage: node scripts/prepare-database-repair.js [--from=001|--from=002] [--commit]\n');
    process.exitCode = 1;
  } else {
    process.stdout.write(buildRepairTransaction({from: args.includes('--from=001') ? 1 : 2,
      commit: args.includes('--commit')}));
  }
}
