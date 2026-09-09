'use strict';
// Produces a transaction for review; never connects to a database.
const fs=require('fs');const path=require('path');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
function buildMfaTransaction({commit=false}={}){
 return `BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='90s';
CREATE TEMP TABLE mfa_baseline(schema_name text,table_name text,fingerprint text) ON COMMIT DROP;
DO $$ DECLARE t record; digest text; BEGIN
 FOR t IN SELECT n.nspname,c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE c.relkind='r' AND (n.nspname='public' OR (n.nspname='auth' AND c.relname IN ('users','mfa_factors')))
  ORDER BY n.nspname,c.relname LOOP
  EXECUTE format('LOCK TABLE %I.%I IN SHARE ROW EXCLUSIVE MODE',t.nspname,t.relname);
  EXECUTE format('SELECT md5(coalesce(string_agg(row_to_json(r)::text,'''' ORDER BY id),'''')) FROM %I.%I r',t.nspname,t.relname) INTO digest;
  INSERT INTO pg_temp.mfa_baseline VALUES(t.nspname,t.relname,digest);
 END LOOP;
END $$;
${read('database/migrations/20260909_007_authenticator_mfa.sql')}
${read('database/tests/authenticator_mfa.sql')}
DO $$ DECLARE t record; digest text; BEGIN
 FOR t IN SELECT * FROM pg_temp.mfa_baseline LOOP
  EXECUTE format('SELECT md5(coalesce(string_agg(row_to_json(r)::text,'''' ORDER BY id),'''')) FROM %I.%I r',t.schema_name,t.table_name) INTO digest;
  IF digest IS DISTINCT FROM t.fingerprint THEN RAISE EXCEPTION 'Existing records changed in %.%',t.schema_name,t.table_name; END IF;
 END LOOP;
END $$;
SELECT 'PASS: MFA tests; all existing public, Auth user and factor rows preserved; fixtures rolled back' AS mfa_repair_result;
${commit?'COMMIT':'ROLLBACK'};
`;
}
module.exports={buildMfaTransaction};
if(require.main===module){
 const args=process.argv.slice(2);
 if(args.length>1||args.some(arg=>arg!=='--commit')){process.stderr.write('Usage: node scripts/prepare-mfa.js [--commit]\n');process.exitCode=1;}
 else process.stdout.write(buildMfaTransaction({commit:args.includes('--commit')}));
}
