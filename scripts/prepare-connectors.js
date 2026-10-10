'use strict';
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
function transaction({commit=false}={}){
 return `BEGIN;
SET LOCAL lock_timeout='5s'; SET LOCAL statement_timeout='90s';
DO $$ BEGIN
 IF to_regprocedure('public.get_my_role()') IS NULL OR to_regprocedure('public.mfa_session_allowed()') IS NULL
 OR NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='todo_items' AND column_name='estimate_minutes')
 THEN RAISE EXCEPTION 'Reviewed migrations 001-008 required'; END IF;
END $$;
CREATE TEMP TABLE connector_baseline(schema_name text,table_name text,fingerprint text) ON COMMIT DROP;
DO $$ DECLARE t record; fingerprint text; BEGIN
 FOR t IN SELECT n.nspname,c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE c.relkind='r' AND (n.nspname='public' OR (n.nspname='auth' AND c.relname IN ('users','mfa_factors')))
 ORDER BY n.nspname,c.relname LOOP
  EXECUTE format('LOCK TABLE %I.%I IN SHARE ROW EXCLUSIVE MODE',t.nspname,t.relname);
  EXECUTE format('SELECT md5(coalesce(string_agg(to_jsonb(r)::text,'''' ORDER BY id),'''')) FROM %I.%I r',t.nspname,t.relname) INTO fingerprint;
  INSERT INTO pg_temp.connector_baseline VALUES(t.nspname,t.relname,fingerprint);
 END LOOP;
END $$;
${read('database/migrations/20260927_009_connector_state.sql')}
${read('database/tests/connector_state.sql')}
${read('database/tests/authenticator_mfa.sql')}
DO $$ DECLARE t record; fingerprint text; BEGIN
 FOR t IN SELECT * FROM pg_temp.connector_baseline LOOP
  EXECUTE format('SELECT md5(coalesce(string_agg(to_jsonb(r)::text,'''' ORDER BY id),'''')) FROM %I.%I r',t.schema_name,t.table_name) INTO fingerprint;
  IF fingerprint IS DISTINCT FROM t.fingerprint THEN RAISE EXCEPTION 'Existing records changed';END IF;
 END LOOP;
 IF EXISTS(SELECT 1 FROM public.connector_state) THEN RAISE EXCEPTION 'Connector fixtures remain';END IF;
END $$;
SELECT 'PASS: connector permissions, MFA guard, preserved records and fixture cleanup' AS connector_release_result;
${commit?'COMMIT':'ROLLBACK'};`;
}
module.exports={transaction};
if(require.main===module){const args=process.argv.slice(2);if(args.some(a=>a!=='--commit')||args.length>1)throw new Error('Usage: node scripts/prepare-connectors.js [--commit]');process.stdout.write(transaction({commit:args.includes('--commit')}));}
