const C=require('../services/ConnectorService'),O=require('../services/ObsidianService');
test('Google all-day end is exclusive and shared calendars deduplicate across accounts',()=>{
  const event={id:'one',calendar:'shared',title:'All day',start:{date:'2026-09-27'},end:{date:'2026-09-28'}};
  const result=C.merge({events:[event,{...event,connection:'other'}]},'America/New_York');
  expect(result.events).toHaveLength(1);expect(result.events[0].end_date).toBe('2026-09-27');
});
test('Google instants convert to profile timezone, missing offsets fail closed',()=>{
  const event={id:'one',calendar:'shared',start:{dateTime:'2026-09-28T01:00:00Z'},end:{dateTime:'2026-09-28T02:00:00Z'}};
  expect(C.merge({events:[event]},'America/New_York').events[0]).toMatchObject({event_date:'2026-09-27',start_time:'21:00:00',end_time:'22:00:00'});
  expect(C.merge({events:[{...event,start:{dateTime:'2026-09-28T01:00:00'}}]},'America/New_York').unavailableSources).toContain('Calendar');
});
test('shared invitations deduplicate by UID and occurrence while recurring instances remain distinct',()=>{
  const event={id:'one',calendar:'personal',uid:'invitation@calendar',occurrence:'2026-09-28T14:00:00Z',start:{dateTime:'2026-09-28T14:00:00Z'},end:{dateTime:'2026-09-28T15:00:00Z'}};
  const copy={...event,id:'other',calendar:'work',occurrence:'2026-09-28T10:00:00-04:00'};
  const next={...event,id:'next',occurrence:'2026-09-29T14:00:00Z',start:{dateTime:'2026-09-29T14:00:00Z'},end:{dateTime:'2026-09-29T15:00:00Z'}};
  expect(C.merge({events:[event,copy,next]},'America/New_York').events).toHaveLength(2);
});
test('stale or disconnected source cannot imply confirmed calendar capacity',()=>{
  expect(C.merge({connections:[{provider:'google',selected:['cal'],status:'reconnect_required'}]},'UTC').unavailableSources).toContain('Calendar');
});
test('source links reject script, credentials and unrelated sites',()=>{
  for(const value of ['javascript:alert(1)','https://github.com.evil.test/a/b/issues/1','https://user:pass@github.com/a/b/issues/1','https://example.com'])expect(C.sourceLink(value)).toBe('');
  expect(C.sourceLink('https://github.com/a/b/issues/1')).toBe('https://github.com/a/b/issues/1');
});
test('Obsidian imports only explicitly marked records and preserves source identity',()=>{
  const result=O.parse([{path:'Tasks.md',text:'Secret note not imported\n- [ ] Draft it <!-- dashboard: {"id":"t1","estimate":30,"goal":"g1"} -->\n<!-- dashboard: {"type":"goal","id":"g1","title":"Finish project"} -->'}],'Personal');
  expect(result.tasks[0]).toMatchObject({id:'t1',title:'Draft it',estimate:30,goal:'g1'});expect(JSON.stringify(result)).not.toContain('Secret note');
  expect(O.changes(result,{tasks:[],goals:[]})).toEqual({added:0,changed:0,removed:2});
});
test.each(['../secret.md','.env.md','C:\\private.md','notes/../secret.md'])('Obsidian rejects unsafe source path %s',path=>{
  expect(()=>O.validate({vault:'v',tasks:[{id:'t',title:'x',path}],goals:[]})).toThrow();
});
test('Obsidian rejects duplicate IDs and invalid estimates/dates',()=>{
  const t={id:'t',title:'x',path:'Tasks.md'};
  for(const tasks of [[t,t],[{...t,estimate:0}],[{...t,due:'2026-02-30'}]])expect(()=>O.validate({vault:'v',tasks,goals:[]})).toThrow();
});
test('narration facts exclude workout, habit, health and finance records',()=>{
  const facts=C.facts({focus:[{kind:'workout',title:'private workout'},{kind:'task',title:'Draft',reason:'Due today'}],metrics:{weight:200,balance:5000}});
  expect(JSON.stringify(facts)).not.toMatch(/workout|weight|balance|5000|200/);expect(facts[0].text).toContain('Draft');
});
