'use strict';
const {PGlite}=require('@electric-sql/pglite');
const fs=require('fs');const path=require('path');const assert=require('assert/strict');
const {buildMfaTransaction}=require('./prepare-mfa');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
(async()=>{
 const db=new PGlite();
 try{
  await db.exec(read('test/fixtures/security-schema.sql'));
  await db.exec(read('test/fixtures/mfa-schema.sql'));
  for(const file of fs.readdirSync(path.join(root,'database/migrations')).filter(f=>/_00[1-6]_.*\.sql$/.test(f)).sort())await db.exec(read('database/migrations/'+file));
  await db.exec("INSERT INTO auth.users(id) VALUES('00000000-0000-4000-8000-0000000000ff'); INSERT INTO public.profiles(id,username) VALUES('00000000-0000-4000-8000-0000000000ff','preserved_fixture');");
  const result=(await db.exec(buildMfaTransaction())).flatMap(r=>r.rows||[]);
  assert.match(result.find(r=>r.mfa_repair_result)?.mfa_repair_result,/^PASS:/);
  assert.equal((await db.query("SELECT to_regprocedure('public.mfa_session_allowed()') IS NULL AS rolled_back")).rows[0].rolled_back,true);
  await db.exec(buildMfaTransaction({commit:true}));
  assert.equal((await db.query('SELECT count(*)::int AS n FROM auth.users')).rows[0].n,1);
  assert.equal((await db.query('SELECT count(*)::int AS n FROM auth.mfa_factors')).rows[0].n,0);
  await assert.rejects(db.exec(buildMfaTransaction()),/already exists/);await db.exec('ROLLBACK');
  process.stdout.write(JSON.stringify({result:result.find(r=>r.mfa_repair_result).mfa_repair_result,rollbackAndCommit:true}));
 }finally{await db.close();}
})().catch(error=>{process.stderr.write(error.message+'\n');process.exitCode=1;});
