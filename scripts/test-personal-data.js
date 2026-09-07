'use strict';
const {PGlite}=require('@electric-sql/pglite');
const fs=require('fs');const path=require('path');const assert=require('assert/strict');
const {buildPersonalDataTransaction}=require('./prepare-personal-data');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
(async()=>{
 const db=new PGlite();
 try{
  await db.exec(read('test/fixtures/security-schema.sql'));
  for(const file of fs.readdirSync(path.join(root,'database/migrations')).filter(f=>f.endsWith('.sql')&&!f.includes('_005_')).sort()){
   await db.exec(read('database/migrations/'+file));
  }
  await db.exec("INSERT INTO auth.users(id) VALUES('00000000-0000-4000-8000-0000000000ff'); INSERT INTO public.profiles(id,username) VALUES('00000000-0000-4000-8000-0000000000ff','preserved_fixture');");
  const results=(await db.exec(buildPersonalDataTransaction())).flatMap(r=>r.rows||[]);
  assert.match(results.find(r=>r.personal_document_result)?.personal_document_result,/^PASS:/);
  assert.match(results.find(r=>r.document_repair_result)?.document_repair_result,/^PASS:/);
  assert.equal((await db.query("SELECT to_regclass('public.user_documents') IS NULL AS rolled_back")).rows[0].rolled_back,true);
  const committed=(await db.exec(buildPersonalDataTransaction({commit:true}))).flatMap(r=>r.rows||[]);
  assert.match(committed.find(r=>r.document_repair_result)?.document_repair_result,/^PASS:/);
  assert.equal((await db.query('SELECT count(*)::int AS n FROM auth.users')).rows[0].n,1);
  assert.equal((await db.query('SELECT username FROM public.profiles')).rows[0].username,'preserved_fixture');
  assert.equal((await db.query('SELECT count(*)::int AS n FROM public.user_documents')).rows[0].n,0);
  await assert.rejects(db.exec(buildPersonalDataTransaction()),/already exist/);await db.exec('ROLLBACK');
  process.stdout.write(JSON.stringify({database:results.find(r=>r.personal_document_result).personal_document_result,fixturesRemoved:true,existingRowsPreserved:true,rollbackAndCommitTested:true}));
 }finally{await db.close();}
})().catch(error=>{process.stderr.write(error.message+'\n');process.exitCode=1;});
