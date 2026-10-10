'use strict';
// Manual, synthetic test-project checks. Credentials and results stay private.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),vm=require('node:vm');
const {createClient}=require('@supabase/supabase-js');
async function main(){
 const [input,...extra]=process.argv.slice(2),root=path.resolve(__dirname,'..');
 assert(input&&!extra.length,'Expected one private fixture file');
 const file=path.resolve(input),relative=path.relative(root,file);
 assert(relative.startsWith('..'+path.sep)||path.isAbsolute(relative),'Fixtures must stay outside Git');
 const fixtures=JSON.parse(fs.readFileSync(file,'utf8')),config=require('./live-test-config')(fixtures);
 assert(config.supabaseUrl==='https://cbgoykmmlopwniufmxvw.supabase.co','This release check targets LifeDashboard-Test only');
 let count=0;const clients=[];
 const check=(condition,label)=>{assert(condition,label);count++;};
 const ok=(result,label)=>{check(!result.error,label);return result.data;};
 const make=(fetcher=fetch)=>{const c=createClient(config.supabaseUrl,config.supabaseKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{fetch:(url,init)=>fetcher(url,{...init,signal:AbortSignal.timeout(20000)})}});clients.push(c);return c;};
 const login=async(c,who)=>{const data=ok(await c.auth.signInWithPassword({email:fixtures[who].email,password:fixtures[who].password}),'Disposable sign-in');check(data.user.id===fixtures[who].id,'Exact disposable account');};
 const cases=who=>[
  ['weight_logs',{log_date:'2000-02-01',weight_lbs:180},{weight_lbs:181}],
  ['bills_tracker',{bill_name:'Readiness '+who,amount:0,due_day:31},{amount:12.34}],
  ['debt_tracker',{debt_name:'Readiness '+who,balance:0,monthly_payment:0},{balance:100}],
  ['subscription_tracker',{sub_name:'Readiness '+who,monthly_cost:0,renewal_day:31,action:'Keep'},{monthly_cost:1}],
  ['meals',{name:'Readiness '+fixtures[who].id,meal_type:'lunch',is_template:false,calories:100,instructions:'Synthetic instructions'},{instructions:'Updated instructions'}],
  ['meal_logs',{log_date:'2000-02-01',meal_name:'Readiness meal',calories:100,protein_g:0},{calories:120}],
  ['books',{title:'Readiness '+fixtures[who].id,author:'Fixture',is_template:false,page_count:100},{description:'Updated notes'}],
  ['user_reading_list',{book_id:fixtures[who].readiness.books,status:'Reading',current_page:0,format:'Physical'},{current_page:10}],
  ['book_progress',{book_id:'readiness-fixture',status:'Reading',read_pct:0},{read_pct:10}],
  ['recipes',{name:'Readiness '+fixtures[who].id,profile_id:'readiness',created_by:fixtures[who].id,is_template:false,method:'Synthetic method'},{method:'Updated method'}],
  ['habit_logs',{log_date:'2000-02-01',habit_id:'readiness-fixture',completed:false},{completed:true}],
  ['calendar_events',{title:'Readiness calendar',event_date:'2000-02-01',event_time:'09:00',end_time:'10:00',source_details:{description:'Original',location:'Gym',properties:[],alarms:[]}},{source_details:{description:'Updated',location:'Gym',properties:[],alarms:[]}}],
  ['roadmap_status',{step_number:1,status:'In Progress'},{status:'Complete'}],
  ['user_workout_plans',{name:'Readiness '+who,custom_days:[{day_name:'Fixture',exercises:[]}],is_active:false},{description:'Updated plan'}],
 ];
 const owner=table=>['meals','books','recipes'].includes(table)?'created_by':'user_id';
 try {
  const a=make(),b=make(),signed={a,b};
  for(const who of ['a','b']){
   check(/^security-api-\d{8}-[ab]@example\.invalid$/.test(fixtures[who].email),'Disposable email');
   check(!fixtures[who].readiness,'Readiness phase must start fresh');
   fixtures[who].readiness=Object.fromEntries(['weight_logs','bills_tracker','debt_tracker','subscription_tracker','meals','meal_logs','books','user_reading_list','book_progress','recipes','habit_logs','calendar_events','roadmap_status','user_workout_plans'].map(t=>[t,crypto.randomUUID()]));
  }
  fs.writeFileSync(file,JSON.stringify(fixtures));
  await login(a,'a');await login(b,'b');
  for(const who of ['a','b'])for(const [table,payload,update] of cases(who)){
   const c=signed[who],foreign=signed[who==='a'?'b':'a'],id=fixtures[who].readiness[table],column=owner(table);
   const row=ok(await c.from(table).insert({...payload,id,[column]:fixtures[who].id}).select().single(),table+' owner create');
   check(row.id===id,table+' returned ID');
   check(ok(await foreign.from(table).select('id').eq('id',id),table+' foreign read').length===0,table+' cross-user read denied');
   check(ok(await foreign.from(table).update(update).eq('id',id).select('id'),table+' foreign edit').length===0,table+' cross-user edit denied');
   check(ok(await foreign.from(table).delete().eq('id',id).select('id'),table+' foreign delete').length===0,table+' cross-user delete denied');
   check(!!(await c.from(table).update({[column]:fixtures[who==='a'?'b':'a'].id}).eq('id',id)).error,table+' owner reassignment rejected');
   ok(await c.from(table).update(update).eq('id',id).select().single(),table+' owner edit');
   const reloaded=ok(await c.from(table).select('*').eq('id',id).single(),table+' persistent reload');
   for(const [key,value] of Object.entries(update))check(JSON.stringify(reloaded[key])===JSON.stringify(value)||key==='source_details'&&reloaded[key].description===value.description,table+' updated field persisted');
  }
  const event=fixtures.a.readiness.calendar_events;
  check((await a.from('calendar_events').update({source_details:[]}).eq('id',event)).error?.code==='23514','Malformed details rejected');
  check(ok(await a.from('calendar_events').select('source_details').eq('id',event).single(),'Read after rejection').source_details.description==='Updated','Failed edit preserves saved details');
  const roadmap=ok(await a.from('roadmap_status').upsert({user_id:fixtures.a.id,step_number:1,status:'Complete'},{onConflict:'user_id,step_number'}).select().single(),'Roadmap conflict key');
  check(roadmap.id===fixtures.a.readiness.roadmap_status,'Roadmap updates existing step');
  let drop=false;
  const retryClient=make(async(url,init)=>{const response=await fetch(url,init);if(drop&&String(url).includes('/rest/v1/calendar_events')&&init.method==='POST'&&response.ok){drop=false;throw Error('Synthetic lost response');}return response;});
  await login(retryClient,'a');
  const context=vm.createContext({window:{},sb:retryClient,Logger:{log(){},error(){}}});vm.runInContext(fs.readFileSync(path.join(root,'api.js'),'utf8'),context);const records=vm.runInContext('window.API.records',context);
  const id=crypto.randomUUID(),payload={title:'Stable retry',event_date:'2000-02-02',source_details:{location:'Gym',description:'Same instructions',properties:[],alarms:[]}};
  drop=true;await assert.rejects(records.write('calendar_events',fixtures.a.id,payload,{id}));count++;
  check((await records.write('calendar_events',fixtures.a.id,payload,{id})).id===id,'Lost-response retry recovers reordered JSON details');
  check(ok(await a.from('calendar_events').select('id').eq('id',id),'Stable retry count').length===1,'Retry inserts exactly once');
  await assert.rejects(records.write('calendar_events',fixtures.a.id,{...payload,title:'Changed'},{id}));count++;
  ok(await a.from('calendar_events').delete().eq('id',id),'Retry fixture deletion');
  for(const who of ['a','b'])for(const [table] of cases(who).reverse()){
   const id=fixtures[who].readiness[table],c=signed[who];
   check(ok(await c.from(table).delete().eq('id',id).select('id'),table+' owner delete').length===1,table+' owner delete confirmed');
   check(ok(await c.from(table).select('id').eq('id',id),table+' deletion reload').length===0,table+' deletion persisted');
  }
  fs.writeFileSync(path.join(path.dirname(file),'readiness-api-results.json'),JSON.stringify({passed:count}));
  console.log(JSON.stringify({phase:'readiness',passed:count}));
 }finally{for(const c of clients)c.auth.stopAutoRefresh();}
}
main().catch(error=>{console.error(error.code==='ERR_ASSERTION'?'Readiness check failed: '+error.message:'Readiness verification failed: '+error.name+' at '+String(error.stack||'').split('\n').slice(1,3).join(' '));process.exitCode=1;});
