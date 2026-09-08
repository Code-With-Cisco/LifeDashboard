'use strict';
// Manual public Auth/Data API checks with disposable accounts; never run by CI.
const fs=require('node:fs');const path=require('node:path');const vm=require('node:vm');const assert=require('node:assert/strict');
async function main(){
 const [phase,inputPath]=process.argv.slice(2);
 assert(['baseline','blocked','reenabled','removed'].includes(phase)&&inputPath,'Usage: node scripts/test-live-personal-data.js <baseline|blocked|reenabled|removed> <private-fixture-file>');
 const root=path.resolve(__dirname,'..'),file=path.resolve(inputPath),relative=path.relative(root,file);
 assert(relative.startsWith('..'+path.sep)||path.isAbsolute(relative),'Fixture file must be outside the repository');
 const f=JSON.parse(fs.readFileSync(file,'utf8'));
 for(const who of ['a','b']){
  assert(/^personal-api-\d{8}-[ab]@example\.invalid$/.test(f[who]?.email),'Disposable test emails only');
  assert(/^[0-9a-f-]{36}$/.test(f[who]?.id)&&f[who].password?.length>=24,'Expected precreated disposable IDs and random passwords');
 }
 assert.notEqual(f.a.id,f.b.id);
 const config=vm.runInNewContext(fs.readFileSync(path.join(root,'config.js'),'utf8')+'\n;typeof CONFIG!=="undefined"?CONFIG:window.CONFIG;',{window:{}},{timeout:1000});
 assert.equal(config.supabaseUrl,f.projectUrl,'Fixture must target the configured project');
 assert(/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(config.supabaseUrl));
 if(config.supabaseKey.startsWith('eyJ'))assert.equal(JSON.parse(Buffer.from(config.supabaseKey.split('.')[1],'base64url')).role,'anon');
 else assert(config.supabaseKey.startsWith('sb_publishable_'),'Only a public API key is permitted');
 let checks=0;
 const check=(condition,label)=>{assert(condition,label);checks++;f.progress={phase,checks,lastPassed:label};save();};
 const save=()=>fs.writeFileSync(file,JSON.stringify(f));
 async function request(endpoint,{as,method='GET',body}={}){
  const headers={apikey:config.supabaseKey,'Content-Type':'application/json',Prefer:'return=representation'};
  if(as)headers.Authorization='Bearer '+f[as].accessToken;
  let response;
  try{response=await fetch(config.supabaseUrl+endpoint,{method,headers,body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(45000)});}
  catch{throw new Error('Network request failed after '+checks+' checks: '+method+' '+endpoint.split('?')[0]);}
  const text=await response.text();let data;try{data=text?JSON.parse(text):null;}catch{data=null;}
  return {status:response.status,body:data};
 }
 const denied=r=>[401,403].includes(r.status)&&r.body?.code==='42501';
 const failed=(r,code)=>(code==='PT409'?r.status===409:r.status>=400&&r.status<600)&&r.body?.code===code;
 const document=(key,payload,expected_revision)=>({key,payload,expected_revision});
 const rpc=(as,documents)=>request('/rest/v1/rpc/save_personal_documents',{as,method:'POST',body:{p_documents:documents}});
 const read=as=>request('/rest/v1/user_documents?select=*&order=document_key',{as});
 if(phase==='baseline'){
  check(!f.a.accessToken&&!f.b.accessToken,'Baseline requires fresh fixture state');
  const anonymous=await request('/rest/v1/user_documents?select=id&limit=0');check(denied(anonymous),'Anonymous table read denied');
  check(denied(await rpc(undefined,[])),'Anonymous RPC denied');
  for(const who of ['a','b']){
   const account=f[who];
   const login=await request('/auth/v1/token?grant_type=password',{method:'POST',body:{email:account.email,password:account.password}});
   check(login.status===200&&login.body?.user?.id===account.id,who+': real Auth sign-in');
   account.accessToken=login.body.access_token;account.refreshToken=login.body.refresh_token;save();
   const profile=await request('/rest/v1/profiles',{as:who,method:'POST',body:{id:account.id,username:'personal_api_'+account.id,role:'standard'}});
   check(profile.status===201,who+': own profile creation');
   const initial=await rpc(who,[document('goals',[{sec:'DEV',goals:[{g:'API fixture '+who,freq:'Daily',p:'High'}]}],0)]);
   check(initial.status===200&&initial.body?.length===1&&initial.body[0].user_id===account.id&&initial.body[0].revision===1,who+': initial own save');
  }
  for(const who of ['a','b']){
   const other=f[who==='a'?'b':'a'];
   const foreign=await request('/rest/v1/user_documents?select=id&user_id=eq.'+other.id,{as:who});
   check(foreign.status===200&&foreign.body?.length===0,who+': foreign reads isolated');
   const patch=await request('/rest/v1/user_documents?user_id=eq.'+other.id,{as:who,method:'PATCH',body:{payload:[]}});
   check(patch.status===200&&patch.body?.length===0,who+': foreign updates isolated');
   check(denied(await request('/rest/v1/user_documents',{as:who,method:'POST',body:{user_id:other.id,document_key:'habit_definitions',payload:[]}})),who+': forged insert owner denied');
   for(const body of [{user_id:other.id},{revision:99},{document_key:'habit_definitions'},{updated_at:'2000-01-01T00:00:00Z'}])
    check(denied(await request('/rest/v1/user_documents?user_id=eq.'+f[who].id,{as:who,method:'PATCH',body})),who+': protected column denied');
   check(denied(await request('/rest/v1/user_documents?user_id=eq.'+f[who].id,{as:who,method:'DELETE'})),who+': document deletion denied');
   const own=await read(who);check(own.status===200&&own.body?.length===1&&own.body[0].payload[0].goals[0].g==='API fixture '+who,who+': own data preserved');
  }
  const race=await Promise.all([rpc('a',[document('goals',[{sec:'DEV',goals:[]}],1)]),rpc('a',[document('goals',[],1)])]);
  check(race.filter(r=>r.status===200).length===1&&race.filter(r=>failed(r,'PT409')).length===1,'Concurrent stale saves have exactly one winner and one HTTP 409');
  let current=await read('a');check(current.body?.[0]?.revision===2,'Concurrent save increments once');
  const before=JSON.stringify(current.body);
  // The RPC sorts keys. Save goals first, then conflict on the later key so
  // the preservation check proves an earlier successful write is rolled back.
  check(failed(await rpc('a',[document('goals',[],2),document('habit_definitions',[],99)]),'PT409'),'Conflicting batch rejected');
  check(JSON.stringify((await read('a')).body)===before,'Conflicting batch makes no partial writes');
  for(const [payload,code,label] of [
   [[document('goals',{},2)],'23514','Wrong document shape'],
   [[document('password',[],0)],'23514','Unknown key'],
   [[{...document('goals',[],2),user_id:f.b.id}],'22023','Extra owner field'],
   [[document('goals',[],2.5)],'22023','Fractional revision'],
   [[document('goals',[],2),document('goals',[],2)],'22023','Duplicate keys'],
   [[document('ingredients_side',{fixture:'x'.repeat(262145)},0)],'23514','Oversized document']])
    check(failed(await rpc('a',payload),code),label+' rejected');
  check(JSON.stringify((await read('a')).body)===before,'Invalid requests preserve existing rows');
  const batch=await rpc('a',[document('goals',[],2),document('ingredients_side',{fixture:{label:'Fixture side',cal:1,pro:0,fat:0,car:0,unit:'serving'}},0)]);
  check(batch.status===200&&batch.body?.length===2,'Valid multi-document batch accepted');
  const restored=await rpc('a',[document('goals',[{sec:'DEV',goals:[{g:'Restored fixture',freq:'Daily',p:'High'}]}],3)]);
  check(restored.status===200&&restored.body?.[0]?.revision===4,'Reviewed restore advances revision');
  const direct=await request('/rest/v1/user_documents?user_id=eq.'+f.a.id+'&document_key=eq.goals',{as:'a',method:'PATCH',body:{payload:[]}});
  check(direct.status===200&&direct.body?.[0]?.revision===5,'Authorized direct payload update also advances revision');
  check(failed(await rpc('a',[document('goals',[],4)]),'PT409'),'Direct update invalidates stale RPC preview');
 }else if(phase==='blocked'){
  for(const who of ['a','b']){
   const rows=await read(who);check(rows.status===200&&rows.body?.length===0,who+': existing JWT cannot read while restricted');
   check(denied(await rpc(who,[document('habit_definitions',[],0)])),who+': restricted RPC denied');
   check(denied(await request('/rest/v1/user_documents',{as:who,method:'POST',body:{user_id:f[who].id,document_key:'habit_definitions',payload:[]}})),who+': restricted direct insert denied');
   const update=await request('/rest/v1/user_documents?user_id=eq.'+f[who].id,{as:who,method:'PATCH',body:{payload:[]}});
   check(update.status===200&&update.body?.length===0,who+': restricted direct update touches no rows');
   const bypass=await request('/rest/v1/profiles?id=eq.'+f[who].id,{as:who,method:'PATCH',body:who==='a'?{force_password_reset:false}:{is_disabled:false}});
   // A disabled profile is hidden by RLS, so its UPDATE can succeed with zero
   // rows. Either denial must leave the restriction enforced for the same JWT.
   check(denied(bypass)||(bypass.status===200&&Array.isArray(bypass.body)&&bypass.body.length===0),who+': cannot clear own restriction');
   check(denied(await rpc(who,[document('habit_definitions',[],0)])),who+': restriction remains after self-clear attempt');
  }
 }else if(phase==='reenabled'){
  for(const who of ['a','b']){
   const rows=await read(who);check(rows.status===200&&rows.body?.length===(who==='a'?2:1),who+': access returns with data preserved');
   check(rows.body.every(x=>x.user_id===f[who].id),who+': reenabled view remains owner-only');
   const revision=rows.body.find(x=>x.document_key==='goals').revision;check(revision===(who==='a'?5:1),who+': restricted operations did not modify records');
   const logout=await request('/auth/v1/logout?scope=global',{as:who,method:'POST'});check(logout.status===204,who+': fixture sign-out');
   const refresh=await request('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:{refresh_token:f[who].refreshToken}});check(refresh.status>=400&&refresh.status<500,who+': signed-out refresh token denied');
  }
 }else{
  for(const who of ['a','b']){
   const login=await request('/auth/v1/token?grant_type=password',{method:'POST',body:{email:f[who].email,password:f[who].password}});check(login.status>=400&&login.status<500,who+': removed fixture cannot log in');
  }
 }
 f.results={...f.results,[phase]:{checks,passed:true,at:new Date().toISOString()}};save();
 console.log(JSON.stringify({phase,checks,passed:true}));
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
