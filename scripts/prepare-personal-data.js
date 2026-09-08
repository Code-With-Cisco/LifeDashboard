'use strict';
// Generates a reviewed transaction only; never connects to a database.
const fs=require('fs');const path=require('path');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
function buildPersonalDataTransaction({commit=false,from=5}={}){
 if(![5,6].includes(from))throw new Error('Expected migration start 5 or 6');
 return `BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='90s';
DO $$ BEGIN
 ${from===5?`IF to_regclass('public.user_documents') IS NOT NULL THEN
  RAISE EXCEPTION 'Personal documents already exist; inspect migration state instead of reapplying'; END IF;`:`IF to_regclass('public.user_documents') IS NULL THEN
  RAISE EXCEPTION 'Migration 005 must exist before the conflict response repair'; END IF;`}
 IF to_regprocedure('public.get_my_role()') IS NULL THEN
  RAISE EXCEPTION 'Security repairs must be applied first'; END IF;
END $$;
CREATE TEMP TABLE document_baseline(schema_name text,table_name text,fingerprint text) ON COMMIT DROP;
DO $$ DECLARE t record; digest text; BEGIN
 FOR t IN SELECT n.nspname,c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE c.relkind='r' AND (n.nspname='public' OR (n.nspname='auth' AND c.relname='users'))
  ORDER BY n.nspname,c.relname LOOP
  EXECUTE format('LOCK TABLE %I.%I IN SHARE ROW EXCLUSIVE MODE',t.nspname,t.relname);
  EXECUTE format('SELECT md5(coalesce(string_agg(row_to_json(r)::text,'''' ORDER BY id),'''')) FROM %I.%I r',t.nspname,t.relname) INTO digest;
  INSERT INTO pg_temp.document_baseline VALUES(t.nspname,t.relname,digest);
 END LOOP;
END $$;
${from===5?read('database/migrations/20260906_005_personal_documents.sql'):''}
${read('database/migrations/20260908_006_document_conflict_response.sql')}
${read('database/tests/personal_documents.sql')}
DO $$ DECLARE t record; digest text; BEGIN
 FOR t IN SELECT * FROM pg_temp.document_baseline LOOP
  EXECUTE format('SELECT md5(coalesce(string_agg(row_to_json(r)::text,'''' ORDER BY id),'''')) FROM %I.%I r',t.schema_name,t.table_name) INTO digest;
  IF digest IS DISTINCT FROM t.fingerprint THEN
   RAISE EXCEPTION 'Existing records changed in %.%',t.schema_name,t.table_name; END IF;
 END LOOP;
 IF EXISTS(SELECT 1 FROM public.user_documents WHERE user_id IN
  ('00000000-0000-4000-8000-0000000000a1','00000000-0000-4000-8000-0000000000b2')) THEN RAISE EXCEPTION 'Document fixtures remain'; END IF;
END $$;
SELECT 'PASS: personal document tests; existing public and Auth user rows preserved; fixtures removed' AS document_repair_result;
${commit?'COMMIT':'ROLLBACK'};
`;
}
module.exports={buildPersonalDataTransaction};
if(require.main===module){
 const args=process.argv.slice(2);
 if(args.length>2||new Set(args).size!==args.length||args.some(arg=>!['--commit','--from=006'].includes(arg))){
  process.stderr.write('Usage: node scripts/prepare-personal-data.js [--from=006] [--commit]\n');process.exitCode=1;
 }else process.stdout.write(buildPersonalDataTransaction({commit:args.includes('--commit'),from:args.includes('--from=006')?6:5}));
}
