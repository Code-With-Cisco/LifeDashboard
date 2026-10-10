'use strict';
// Manual release verification with disposable accounts, never personal records.
const fs=require('fs'),path=require('path'),vm=require('vm'),crypto=require('crypto'),assert=require('assert/strict');
const {createClient}=require('@supabase/supabase-js');
function otp(secret){const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';let bits='';for(const c of secret.replace(/=+$/,'').toUpperCase())bits+=alphabet.indexOf(c).toString(2).padStart(5,'0');const bytes=[];for(let i=0;i+8<=bits.length;i+=8)bytes.push(parseInt(bits.slice(i,i+8),2));const counter=Buffer.alloc(8);counter.writeBigUInt64BE(BigInt(Math.floor(Date.now()/30000)));const hash=crypto.createHmac('sha1',Buffer.from(bytes)).update(counter).digest(),offset=hash[19]&15;return ((hash.readUInt32BE(offset)&0x7fffffff)%1000000).toString().padStart(6,'0');}
async function main(){
 const [phase,input]=process.argv.slice(2),root=path.resolve(__dirname,'..'),file=path.resolve(input||'.'),relative=path.relative(root,file);
 assert(['verify','blocked','removed'].includes(phase)&&input,'Expected verify|blocked|removed and private fixture file');
 assert(relative.startsWith('..'+path.sep)||path.isAbsolute(relative),'Fixtures must stay outside Git');
 const f=JSON.parse(fs.readFileSync(file,'utf8')),config=require('./live-test-config')(f);
 assert.equal(config.supabaseUrl,f.projectUrl);for(const who of ['a','b'])assert(/^personal-api-\d{8}-[ab]@example\.invalid$/.test(f[who].email));
 let count=0;const clients=[];
 const check=(condition,label)=>{assert(condition,label);count++;};
 const ok=(r,label)=>{check(!r.error,label);return r.data;};
 const client=()=>{const c=createClient(config.supabaseUrl,config.supabaseKey,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(u,i)=>fetch(u,{...i,signal:AbortSignal.timeout(20000)})}});clients.push(c);return c;};
 const login=async(c,who)=>ok(await c.auth.signInWithPassword({email:f[who].email,password:f[who].password}),who+' sign-in');
 const request=async(c,body)=>{const session=(await c.auth.getSession()).data.session;const r=await fetch(config.supabaseUrl+'/functions/v1/dashboard-connectors',{method:'POST',headers:{Origin:'https://code-with-cisco.github.io',Authorization:'Bearer '+session.access_token,apikey:config.supabaseKey,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(30000)});return {status:r.status,data:await r.json()};};
 try{
  const a=client(),b=client();
  if(phase==='removed'){for(const [c,who] of [[a,'a'],[b,'b']])check(!!(await c.auth.signInWithPassword({email:f[who].email,password:f[who].password})).error,who+' deleted account rejected');}
  else{
   for(const [c,who] of [[a,'a'],[b,'b']])await login(c,who);
   if(phase==='blocked'){
    for(const [c,who] of [[a,'a'],[b,'b']]){const r=await request(c,{action:'status'});check(r.status===403&&r.data.error==='account_verification_required',who+' restricted account denied');}
   }else{
    for(const [c,who] of [[a,'a'],[b,'b']]){
     ok(await c.from('profiles').insert({id:f[who].id,username:'personal_api_'+f[who].id,display_name:'Connector release test',timezone:'America/New_York'}),who+' profile');
     const records={vault:'Synthetic vault',goals:[{id:'goal',title:'Synthetic '+who+' goal',path:'Tasks.md'}],tasks:[{id:'task',title:'Synthetic '+who+' task',path:'Tasks.md',goal:'goal',estimate:30}]};
     check((await request(c,{action:'importObsidian',records,revision:0,user_id:f[who==='a'?'b':'a'].id})).status===200,who+' owner import');
     check((await request(c,{action:'memory',memory:'Synthetic '+who+' preference',revision:0})).status===200,who+' preference');
    }
    for(const [c,who] of [[a,'a'],[b,'b']]){
     const r=await request(c,{action:'status',user_id:f[who==='a'?'b':'a'].id});check(r.status===200,who+' status');
     check(r.data.tasks.length===1&&r.data.tasks[0].title==='Synthetic '+who+' task',who+' owner isolation');
     check(r.data.memory==='Synthetic '+who+' preference',who+' preference isolation');
     check(!JSON.stringify(r.data).match(/refresh_token|access_token|sealed/),who+' no server secrets');
     check(!!(await c.from('connector_state').select('*')).error,who+' direct private table denied');
     check(!!(await c.rpc('save_connector_state',{p_user:f[who].id,p_id:'00000000-0000-4000-8000-000000000001',p_provider:'obsidian',p_revision:1,p_sealed:{}})).error,who+' privileged RPC denied');
     check((await request(c,{action:'importObsidian',records:{vault:'v',tasks:[],goals:[]},revision:0})).status===409,who+' stale import denied');
    }
    const enrollment=ok(await a.auth.mfa.enroll({factorType:'totp',friendlyName:'Disposable connector verification'}),'MFA enrollment');
    ok(await a.auth.mfa.challengeAndVerify({factorId:enrollment.id,code:otp(enrollment.totp.secret)}),'MFA verification');
    const low=client();await login(low,'a');
    check((await request(low,{action:'status'})).status===403,'password-only session denied after MFA enrollment');
    check((await request(a,{action:'status'})).status===200,'verified MFA session accepted');
    check((await request(b,{action:'status'})).status===200,'other account unaffected');
    const narration=await request(a,{action:'narrate',summary:{question:'What next?',facts:[{id:'focus_0',text:'Synthetic selected task'}]}});
    check(narration.status===200&&narration.data.facts[0].text==='Synthetic selected task','narrator returns traceable facts');
    check((await request(a,{action:'disconnect',id:'00000000-0000-4000-8000-000000000001'})).status===200,'owner disconnect');
    check((await request(a,{action:'status'})).data.tasks.length===0,'disconnected import removed');
    check((await request(b,{action:'status'})).data.tasks.length===1,'other owner import survives disconnect');
   }
  }
  const result={phase,assertions:count,passed:true};fs.writeFileSync(path.join(path.dirname(file),'connector-'+phase+'-results.json'),JSON.stringify(result));console.log(JSON.stringify(result));
 }finally{for(const c of clients)c.auth.stopAutoRefresh();}
}
main().catch(e=>{console.error(e instanceof assert.AssertionError?'Connector API check failed: '+e.message:'Connector API verification unavailable; inspect private fixture state.');process.exitCode=1;});
