'use strict';
// Synthetic recurrence snapshot through the real parser and public Data API.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {createClient}=require('@supabase/supabase-js'),Calendar=require('../services/CalendarImportService');
async function main(){
 const [fixtureFile,calendarFile,...extra]=process.argv.slice(2),root=path.resolve(__dirname,'..');
 assert(fixtureFile&&calendarFile&&!extra.length,'Expected private fixture JSON and synthetic ICS');
 for(const input of [fixtureFile,calendarFile]){const relative=path.relative(root,path.resolve(input));assert(relative.startsWith('..'+path.sep)||path.isAbsolute(relative),'Inputs must stay outside Git');}
 const fixtures=JSON.parse(fs.readFileSync(fixtureFile,'utf8')),config=require('./live-test-config')(fixtures);
 assert(config.supabaseUrl==='https://cbgoykmmlopwniufmxvw.supabase.co','LifeDashboard-Test required');
 assert(/^security-api-\d{8}-b@example\.invalid$/.test(fixtures.b.email));
 const text=fs.readFileSync(calendarFile,'utf8');
 assert(text.includes('UID:browser-readiness-series')&&!/^(?:ATTENDEE|ORGANIZER):.*(?<!@example\.invalid)\r?$/mi.test(text),'Use the documented synthetic calendar only');
 const c=createClient(config.supabaseUrl,config.supabaseKey,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(url,init)=>fetch(url,{...init,signal:AbortSignal.timeout(20000)})}});
 try{
  const login=await c.auth.signInWithPassword({email:fixtures.b.email,password:fixtures.b.password});assert(!login.error&&login.data.user.id===fixtures.b.id);
  const context=vm.createContext({window:{},sb:c,Logger:{log(){},error(){}}});vm.runInContext(fs.readFileSync(path.join(root,'api.js'),'utf8'),context);const api=context.window.API;
  const parsed=Calendar.parse(text,'America/New_York',{from:'2026-10-10',to:'2027-01-08'});assert.equal(parsed.events.length,3);
  const rows=parsed.events.map(event=>{const bytes=crypto.createHash('sha256').update(JSON.stringify(['calendar-import-v1',fixtures.b.id,event.identity])).digest();bytes[6]=(bytes[6]&15)|80;bytes[8]=(bytes[8]&63)|128;const h=bytes.subarray(0,16).toString('hex');return {...event.row,id:`${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`};});
  const plan=Calendar.classify(rows,await api.calendarImport.list(fixtures.b.id));assert.equal(plan.conflicts.length,0);assert.equal(plan.pending.length,3);
  await api.calendarImport.insert(fixtures.b.id,plan.pending);
  const persisted=await api.calendarImport.list(fixtures.b.id),repeat=Calendar.classify(rows,persisted);
  assert.equal(repeat.pending.length,0);assert.equal(repeat.duplicates,3);assert.equal(repeat.conflicts.length,0);
  const moved=persisted.find(row=>row.title==='Moved training snapshot');assert(moved&&moved.event_date==='2026-10-12'&&moved.event_time==='11:00:00'&&moved.source_details.description==='Moved session instructions');
  const original=persisted.find(row=>row.event_date==='2026-10-10');assert(original.source_details.description.includes('3 sets of 8 reps')&&original.source_details.alarms.length===1);
  assert(!persisted.some(row=>['2026-10-11','2026-10-13'].includes(row.event_date)));
  console.log(JSON.stringify({phase:'calendar',passed:true,imported:3}));
 }finally{c.auth.stopAutoRefresh();}
}
main().catch(()=>{console.error('Synthetic calendar acceptance failed; inspect private test state');process.exitCode=1;});
