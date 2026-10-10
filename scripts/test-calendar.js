'use strict';
const {PGlite}=require('@electric-sql/pglite');
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const {buildCalendarTransaction}=require('./prepare-calendar');
const root=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
(async()=>{
 const db=new PGlite();
 try {
  await db.exec(read('test/fixtures/security-schema.sql'));
  await db.exec(read('test/fixtures/mfa-schema.sql'));
  await db.exec(`ALTER TABLE public.calendar_events ADD COLUMN title text NOT NULL, ADD COLUMN event_date date NOT NULL,
   ADD COLUMN event_time time, ADD COLUMN end_date date, ADD COLUMN all_day boolean DEFAULT false;`);
  for(const f of fs.readdirSync(path.join(root,'database/migrations')).filter(f=>/_00[1-8]_.*\.sql$/.test(f)).sort())await db.exec(read('database/migrations/'+f));
  await db.exec('ALTER TABLE public.roadmap_status ADD COLUMN step_number integer, ADD COLUMN status text, ADD UNIQUE(user_id,step_number);');
  await db.exec(`INSERT INTO auth.users(id) VALUES('00000000-0000-4000-8000-0000000000ff');
   INSERT INTO public.profiles(id,username) VALUES('00000000-0000-4000-8000-0000000000ff','preserved');
   INSERT INTO public.todo_items(user_id,title) VALUES('00000000-0000-4000-8000-0000000000ff','Preserved task');`);
  const result=(await db.exec(buildCalendarTransaction())).flatMap(r=>r.rows || []);
  assert.match(result.find(r=>r.calendar_repair_result)?.calendar_repair_result,/^PASS:/);
  assert.equal((await db.query("SELECT count(*)::int AS n FROM information_schema.columns WHERE table_schema='public' AND table_name='calendar_events' AND column_name='source_details'")).rows[0].n,0);
  await db.exec(buildCalendarTransaction({commit:true}));
  assert.equal((await db.query('SELECT count(*)::int AS n FROM auth.users')).rows[0].n,1);
  assert.equal((await db.query('SELECT title FROM public.todo_items')).rows[0].title,'Preserved task');
  await assert.rejects(db.exec(buildCalendarTransaction()),/already exists/);await db.exec('ROLLBACK');
  process.stdout.write(JSON.stringify({result:'PASS: calendar rollback, commit, isolation, MFA, roadmap and preserved records'}));
 } finally {await db.close();}
})().catch(e=>{process.stderr.write(e.message+'\n');process.exitCode=1;});
