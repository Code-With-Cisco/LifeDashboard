'use strict';
// Generates a reviewable transaction; never connects to a database.
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
function buildPlanningTransaction({commit=false}={}) {
 const fingerprint=`SELECT md5(coalesce(string_agg((to_jsonb(r) - $1)::text,'' ORDER BY id),'')) FROM %I.%I r`;
 return `BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='90s';
CREATE TEMP TABLE planning_baseline(schema_name text,table_name text,omitted text[],fingerprint text) ON COMMIT DROP;
DO $$ DECLARE t record; digest text; omitted text[]; BEGIN
 IF to_regprocedure('public.mfa_session_allowed()') IS NULL THEN RAISE EXCEPTION 'MFA prerequisite missing'; END IF;
 FOR t IN SELECT n.nspname,c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE c.relkind='r' AND (n.nspname='public' OR (n.nspname='auth' AND c.relname IN ('users','mfa_factors')))
 ORDER BY n.nspname,c.relname LOOP
  omitted:=CASE WHEN t.nspname='public' AND t.relname='todo_items' THEN ARRAY['goal_id','estimate_minutes','next_action']
   WHEN t.nspname='public' AND t.relname='calendar_events' THEN ARRAY['end_time'] ELSE ARRAY[]::text[] END;
  EXECUTE format('LOCK TABLE %I.%I IN SHARE ROW EXCLUSIVE MODE',t.nspname,t.relname);
  EXECUTE format('${fingerprint.replaceAll("'","''")}',t.nspname,t.relname) INTO digest USING omitted;
  INSERT INTO pg_temp.planning_baseline VALUES(t.nspname,t.relname,omitted,digest);
 END LOOP;
END $$;
${read('database/migrations/20260926_008_task_planning.sql')}
${read('database/tests/task_planning.sql')}
${read('database/tests/authenticator_mfa.sql')}
DO $$ DECLARE t record; digest text; BEGIN
 FOR t IN SELECT * FROM pg_temp.planning_baseline LOOP
  EXECUTE format('${fingerprint.replaceAll("'","''")}',t.schema_name,t.table_name) INTO digest USING t.omitted;
  IF digest IS DISTINCT FROM t.fingerprint THEN RAISE EXCEPTION 'Existing records changed in %.%',t.schema_name,t.table_name; END IF;
 END LOOP;
 IF EXISTS(SELECT 1 FROM public.todo_items WHERE goal_id IS NOT NULL OR estimate_minutes IS NOT NULL OR next_action IS NOT NULL)
 OR EXISTS(SELECT 1 FROM public.calendar_events WHERE end_time IS NOT NULL) THEN RAISE EXCEPTION 'Migration populated existing records'; END IF;
END $$;
SELECT 'PASS: planning and MFA tests; existing public/Auth records preserved; fixtures rolled back' AS planning_repair_result;
${commit?'COMMIT':'ROLLBACK'};
`;
}
module.exports={buildPlanningTransaction};
if(require.main===module){
 const args=process.argv.slice(2);
 if(args.length>1 || args.some(arg=>arg!=='--commit')){process.stderr.write('Usage: node scripts/prepare-planning.js [--commit]\n');process.exitCode=1;}
 else process.stdout.write(buildPlanningTransaction({commit:args.includes('--commit')}));
}
