'use strict';
// Generate rollback-only checks for a prepared, empty test project. Never connects.
const fs=require('node:fs'),path=require('node:path');
const suites=['profile_authorization','data_isolation','atomic_workout_save','password_reset_guard',
  'personal_documents','authenticator_mfa','task_planning','connector_state'];
function transaction(){
  const tests=suites.map(name=>`SELECT set_config('request.jwt.claim.sub','',true), set_config('request.jwt.claims','{}',true);
${fs.readFileSync(path.join(__dirname,'../database/tests',name+'.sql'),'utf8')}`).join('\n');
  return `BEGIN;
SET LOCAL lock_timeout='5s'; SET LOCAL statement_timeout='90s';
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM auth.users) OR EXISTS(SELECT 1 FROM public.profiles)
 THEN RAISE EXCEPTION 'Requires an empty test project without Auth users or profiles'; END IF;
 IF (SELECT count(*) FROM pg_tables WHERE schemaname='public')<>27
 OR to_regprocedure('public.save_connector_state(uuid,uuid,text,bigint,jsonb)') IS NULL
 THEN RAISE EXCEPTION 'Requires the reviewed application schema and connector migration'; END IF;
END $$;
CREATE TEMP TABLE acceptance_baseline(schema_name text,table_name text,fingerprint text) ON COMMIT DROP;
DO $$ DECLARE t record; fingerprint text; BEGIN
 FOR t IN SELECT n.nspname,c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE c.relkind='r' AND (n.nspname='public' OR (n.nspname='auth' AND c.relname IN ('users','mfa_factors')))
 ORDER BY n.nspname,c.relname LOOP
  EXECUTE format('LOCK TABLE %I.%I IN SHARE ROW EXCLUSIVE MODE',t.nspname,t.relname);
  EXECUTE format('SELECT md5(coalesce(string_agg(to_jsonb(r)::text,'''' ORDER BY id),'''')) FROM %I.%I r',t.nspname,t.relname) INTO fingerprint;
  INSERT INTO pg_temp.acceptance_baseline VALUES(t.nspname,t.relname,fingerprint);
 END LOOP;
END $$;
${tests}
DO $$ DECLARE t record; fingerprint text; BEGIN
 FOR t IN SELECT * FROM pg_temp.acceptance_baseline LOOP
  EXECUTE format('SELECT md5(coalesce(string_agg(to_jsonb(r)::text,'''' ORDER BY id),'''')) FROM %I.%I r',t.schema_name,t.table_name) INTO fingerprint;
  IF fingerprint IS DISTINCT FROM t.fingerprint THEN RAISE EXCEPTION 'Existing records changed'; END IF;
 END LOOP;
END $$;
SELECT 'PASS: all 8 application SQL suites; existing records preserved; transaction rolls back' AS acceptance_result;
ROLLBACK;`;
}
module.exports={transaction};
if(require.main===module){
  if(process.argv.length!==2)throw new Error('Usage: node scripts/prepare-test-acceptance.js (rollback only)');
  process.stdout.write(transaction());
}
