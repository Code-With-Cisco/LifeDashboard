'use strict';
// Manual release checks using precreated disposable accounts. No credentials in Git.
const fs=require('fs'),path=require('path'),vm=require('vm'),crypto=require('crypto'),assert=require('assert/strict');
const {createClient}=require('@supabase/supabase-js');
const {create:security}=require('../services/MfaService');
function otp(secret) {
 const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';let bits='';
 for(const c of secret.replace(/=+$/,'').toUpperCase()){const n=alphabet.indexOf(c);assert(n>=0);bits+=n.toString(2).padStart(5,'0');}
 const bytes=[];for(let i=0;i+8<=bits.length;i+=8)bytes.push(parseInt(bits.slice(i,i+8),2));
 const counter=Buffer.alloc(8);counter.writeBigUInt64BE(BigInt(Math.floor(Date.now()/30000)));
 const hash=crypto.createHmac('sha1',Buffer.from(bytes)).update(counter).digest(),offset=hash[19]&15;
 return ((hash.readUInt32BE(offset)&0x7fffffff)%1000000).toString().padStart(6,'0');
}
async function main() {
 const [phase,input]=process.argv.slice(2),root=path.resolve(__dirname,'..');
 assert(['verify','removed'].includes(phase)&&input,'Expected verify|removed and a private fixture file');
 const file=path.resolve(input),relative=path.relative(root,file);
 assert(relative.startsWith('..'+path.sep)||path.isAbsolute(relative),'Fixtures must stay outside the repository');
 const fixtures=JSON.parse(fs.readFileSync(file,'utf8'));
 const config=vm.runInNewContext(fs.readFileSync(path.join(root,'config.js'),'utf8')+';typeof CONFIG!=="undefined"?CONFIG:window.CONFIG;',{window:{}});
 assert.equal(config.supabaseUrl,fixtures.projectUrl);
 for(const who of ['a','b'])assert(/^personal-api-\d{8}-[ab]@example\.invalid$/.test(fixtures[who].email));
 const clients=[];let count=0;
 const client=()=>{const c=createClient(config.supabaseUrl,config.supabaseKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},
  global:{fetch:(url,init)=>fetch(url,{...init,signal:AbortSignal.timeout(20000)})}});clients.push(c);return c;};
 const check=(condition,label)=>{assert(condition,label);count++;};
 const ok=(result,label)=>{check(!result.error,label);return result.data;};
 const login=async(c,who)=>ok(await c.auth.signInWithPassword({email:fixtures[who].email,password:fixtures[who].password}),who+' sign-in').session;
 const doc=(key,payload,revision=0)=>({key,payload,expected_revision:revision});
 try {
  const a=client(),b=client();
  if(phase==='removed'){
   for(const [c,who] of [[a,'a'],[b,'b']])check(!!(await c.auth.signInWithPassword({email:fixtures[who].email,password:fixtures[who].password})).error,who+' deleted account rejected');
  }else{
   for(const [c,who] of [[a,'a'],[b,'b']]){
    const session=await login(c,who);check(session.user.id===fixtures[who].id,who+' exact account');
    ok(await c.from('profiles').insert({id:fixtures[who].id,username:'personal_api_'+fixtures[who].id,display_name:'Planning release test',timezone:'America/New_York'}),who+' profile');
    const docs=ok(await c.rpc('save_personal_documents',{p_documents:[doc('goals',[{sec:'TEST',goals:[{id:'goal-'+who,g:'Synthetic goal',freq:'Weekly',p:'High'}]}]),doc('focus_windows',[{day:1,start:'09:00',end:'11:00'}])]}),who+' planning documents');
    check(docs.length===2&&docs.every(d=>d.user_id===fixtures[who].id&&d.revision===1),who+' owner document revisions');
    fixtures[who].task=crypto.randomUUID();fixtures[who].event=crypto.randomUUID();
    const task=ok(await c.from('todo_items').insert({id:fixtures[who].task,user_id:fixtures[who].id,title:'Synthetic planning task',goal_id:'goal-'+who,estimate_minutes:30,next_action:'Open the draft'}).select().single(),who+' task insert');
    check(task.estimate_minutes===30&&task.next_action==='Open the draft',who+' planning fields round trip');
    ok(await c.from('calendar_events').insert({id:fixtures[who].event,user_id:fixtures[who].id,title:'Synthetic commitment',event_date:'2026-09-28',event_time:'10:00',end_time:'11:00'}),who+' event duration');
   }
   for(const [c,who,other] of [[a,'a','b'],[b,'b','a']]){
    for(const table of ['todo_items','calendar_events','user_documents']){
     check(ok(await c.from(table).select('id').eq('user_id',fixtures[other].id),who+' foreign '+table+' query').length===0,who+' foreign '+table+' hidden');
    }
    check(ok(await c.from('todo_items').update({estimate_minutes:60}).eq('id',fixtures[other].task).select('id'),who+' foreign update query').length===0,who+' foreign update denied');
    check(!!(await c.from('todo_items').insert({user_id:fixtures[other].id,title:'Forged task',estimate_minutes:30})).error,who+' forged owner denied');
   }
   check((await a.from('todo_items').update({estimate_minutes:0}).eq('id',fixtures.a.task)).error?.code==='23514','invalid estimate rejected');
   check((await a.from('calendar_events').update({end_time:'09:00'}).eq('id',fixtures.a.event)).error?.code==='23514','invalid duration rejected');
   check((await a.rpc('save_personal_documents',{p_documents:[doc('focus_windows',[],0)]})).error?.code==='PT409','stale focus windows rejected');
   ok(await a.from('todo_items').update({estimate_minutes:45}).eq('id',fixtures.a.task),'owner estimate update');
   check(ok(await a.from('todo_items').select('estimate_minutes').eq('id',fixtures.a.task).single(),'owner task reload').estimate_minutes===45,'updated estimate persisted');
   const setup=await security(a).enroll('Disposable planning verification');
   ok(await a.auth.mfa.challengeAndVerify({factorId:setup.id,code:otp(setup.secret)}),'MFA verification');
   const low=client(),session=await login(low,'a');check(!(await security(low).status(session)).allowed,'fresh password session requires MFA');
   for(const table of ['todo_items','calendar_events','user_documents'])check(ok(await low.from(table).select('id'),'password-only '+table+' query').length===0,'password-only '+table+' denied');
   check(!!(await low.rpc('save_personal_documents',{p_documents:[doc('focus_windows',[],1)]})).error,'password-only planning write denied');
   check(ok(await a.from('todo_items').select('id').eq('id',fixtures.a.task),'verified task read').length===1,'verified owner can read task');
   ok(await a.rpc('save_personal_documents',{p_documents:[doc('focus_windows',[{day:1,start:'13:00',end:'15:00'}],1)]}),'verified planning write');
   check(ok(await b.from('todo_items').select('id').eq('id',fixtures.b.task),'second owner read').length===1,'other account unaffected by MFA');
  }
  const summary={phase,assertions:count,passed:true};
  fs.writeFileSync(path.join(path.dirname(file),phase+'-results.json'),JSON.stringify(summary));
  process.stdout.write(JSON.stringify(summary));
 }finally{for(const c of clients)c.auth.stopAutoRefresh();}
}
main().catch(e=>{process.stderr.write(e instanceof assert.AssertionError?'Planning API check failed: '+e.message+'\n':'Planning API verification unavailable; inspect the private fixture state.\n');process.exitCode=1;});
