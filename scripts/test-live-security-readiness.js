'use strict';
// Real Auth/MFA and encrypted personal-record restore on the named test project.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {createClient}=require('@supabase/supabase-js');
const Personal=require('../services/PersonalDataService'),Backup=require('../services/BackupService'),Mfa=require('../services/MfaService');
function otp(secret){
 const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';let bits='';
 for(const c of secret.replace(/=+$/,'').toUpperCase()){const n=alphabet.indexOf(c);assert(n>=0);bits+=n.toString(2).padStart(5,'0');}
 const bytes=[];for(let i=0;i+8<=bits.length;i+=8)bytes.push(parseInt(bits.slice(i,i+8),2));
 const counter=Buffer.alloc(8);counter.writeBigUInt64BE(BigInt(Math.floor(Date.now()/30000)));
 const hash=crypto.createHmac('sha1',Buffer.from(bytes)).update(counter).digest(),offset=hash[19]&15;
 return ((hash.readUInt32BE(offset)&0x7fffffff)%1000000).toString().padStart(6,'0');
}
async function main(){
 const [input,...extra]=process.argv.slice(2),root=path.resolve(__dirname,'..');assert(input&&!extra.length,'One private fixture file required');
 const file=path.resolve(input),relative=path.relative(root,file);assert(relative.startsWith('..'+path.sep)||path.isAbsolute(relative),'Fixtures must stay outside Git');
 const fixtures=JSON.parse(fs.readFileSync(file,'utf8')),config=require('./live-test-config')(fixtures);
 assert(config.supabaseUrl==='https://cbgoykmmlopwniufmxvw.supabase.co','LifeDashboard-Test required');
 for(const who of ['a','b'])assert(/^security-api-\d{8}-[ab]@example\.invalid$/.test(fixtures[who].email));
 let count=0,factor=null,verified=false;const clients=[];
 const check=(condition,label)=>{assert(condition,label);count++;};
 const ok=(result,label)=>{check(!result.error,label);return result.data;};
 const make=()=>{const c=createClient(config.supabaseUrl,config.supabaseKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{fetch:(url,init)=>fetch(url,{...init,signal:AbortSignal.timeout(20000)})}});clients.push(c);return c;};
 const login=async(c,who)=>{const data=ok(await c.auth.signInWithPassword({email:fixtures[who].email,password:fixtures[who].password}),'Disposable login');check(data.user.id===fixtures[who].id,'Exact disposable user');return data.session;};
 const a=make(),b=make();
 try {
  await login(a,'a');await login(b,'b');
  const goal=[{sec:'TEST',goals:[{id:'readiness-goal',g:'Synthetic goal',freq:'Weekly',p:'High'}]}];
  const entries=[{key:'goals',payload:goal},{key:'habit_definitions',payload:[]},{key:'ingredients_protein',payload:{}},{key:'ingredients_side',payload:{}},{key:'focus_windows',payload:[{day:1,start:'09:00',end:'11:00'}]},{key:'purchase_decisions:2000-02',payload:[]}];
  for(const entry of entries)Personal.validate(entry.key,entry.payload);
  const inserted=ok(await a.rpc('save_personal_documents',{p_documents:entries.map(e=>({...e,expected_revision:0}))}),'Personal records save');
  check(inserted.length===entries.length,'All supported personal keys saved');
  check(ok(await b.from('user_documents').select('id').eq('user_id',fixtures.a.id),'Foreign personal read').length===0,'Other user cannot see documents');
  check(!!(await b.from('user_documents').insert({user_id:fixtures.a.id,document_key:'goals',payload:[]})).error,'Forged document owner rejected');
  const fileValue=Personal.backup(fixtures.a.id,fixtures.projectUrl,entries),pass=crypto.randomBytes(32).toString('base64url');
  const encrypted=await Backup.encrypt(fileValue,pass,crypto.webcrypto);
  check(!encrypted.includes('Synthetic goal'),'Encrypted export has no plaintext goal');
  await assert.rejects(Backup.decrypt(encrypted,pass+'wrong',crypto.webcrypto));count++;
  const restored=Personal.readBackup(await Backup.decrypt(encrypted,pass,crypto.webcrypto),fixtures.a.id,fixtures.projectUrl);
  check(restored.length===entries.length,'Encrypted export restores supported entries');
  assert.throws(()=>Personal.readBackup(fileValue,fixtures.b.id,fixtures.projectUrl));count++;
  ok(await a.rpc('save_personal_documents',{p_documents:[{key:'goals',payload:[],expected_revision:1}]}),'Owner edit');
  check((await a.rpc('save_personal_documents',{p_documents:[{key:'goals',payload:goal,expected_revision:1}]})).error?.code==='PT409','Stale restore rejected');
  check(ok(await a.from('user_documents').select('payload').eq('document_key','goals').single(),'After stale restore').payload.length===0,'Rejected restore preserves newer edit');
  ok(await a.rpc('save_personal_documents',{p_documents:[{key:'goals',payload:restored.find(e=>e.key==='goals').payload,expected_revision:2}]}),'Reviewed restore');
  check(ok(await a.from('user_documents').select('payload,revision').eq('document_key','goals').single(),'Restored reload').revision===3,'Confirmed restore revision persisted');
  const setup=await Mfa.create(a).enroll('Disposable readiness verification');factor=setup.id;
  const wrong=((Number(otp(setup.secret))+1)%1000000).toString().padStart(6,'0');
  check(!!(await a.auth.mfa.challengeAndVerify({factorId:factor,code:wrong})).error,'Wrong authenticator code rejected');
  ok(await a.auth.mfa.challengeAndVerify({factorId:factor,code:otp(setup.secret)}),'Authenticator verification');verified=true;
  const low=make(),session=await login(low,'a');check(!(await Mfa.create(low).status(session)).allowed,'Fresh password requires second factor');
  for(const table of ['todo_items','calendar_events','user_documents','roadmap_status'])check(ok(await low.from(table).select('id'),'Password-only read').length===0,table+' protected by MFA');
  check(!!(await low.rpc('save_personal_documents',{p_documents:[{key:'goals',payload:[],expected_revision:3}]})).error,'Password-only save rejected');
  check(!!(await low.auth.mfa.unenroll({factorId:factor})).error,'Password-only factor removal rejected');
  check(ok(await a.from('todo_items').select('id').eq('id',fixtures.a.todoId),'Verified owner read').length===1,'AAL2 owner sees own records');
  check(ok(await b.from('todo_items').select('id').eq('id',fixtures.b.todoId),'Other user read').length===1,'Other user remains usable');
  ok(await a.auth.mfa.unenroll({factorId:factor}),'Verified authenticator removal');factor=null;
  const recovered=await login(low,'a');check((await Mfa.create(low).status(recovered)).allowed,'Password session usable after approved removal');
  check(ok(await low.from('todo_items').select('id').eq('id',fixtures.a.todoId),'Recovery read').length===1,'Data access restored after removal');
  fs.writeFileSync(path.join(path.dirname(file),'security-readiness-results.json'),JSON.stringify({passed:count}));
  console.log(JSON.stringify({phase:'security-readiness',passed:count}));
 }finally{
  if(factor){const result=await a.auth.mfa.unenroll({factorId:factor});if(result.error)console.error('Disposable factor remains; remove the exact fixture account during cleanup');}
  for(const c of clients)c.auth.stopAutoRefresh();
 }
}
main().catch(error=>{console.error(error.code==='ERR_ASSERTION'?'Security readiness failed: '+error.message:'Security readiness unavailable; inspect the private fixture state');process.exitCode=1;});
