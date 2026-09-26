const P=require('../services/PlanningService');
const input={today:'2026-09-28',timezone:'America/New_York',now:'2026-09-28T12:00:00Z',
  focusWindows:[{day:1,start:'09:00',end:'12:00'}]};
test('overlapping focus windows and commitments are counted only once',()=>{
  const a=P.availability({...input,focusWindows:[...input.focusWindows,{day:1,start:'11:00',end:'13:00'}],events:[
    {event_date:input.today,start_time:'10:00',end_time:'11:00'},
    {event_date:input.today,start_time:'10:30',end_time:'11:30'}]});
  expect(a.minutes).toBe(150);expect(a.windows).toEqual([{start:540,end:600},{start:690,end:780}]);
  expect(a.warnings).toContain('Calendar commitments overlap today.');
});
test('elapsed time is removed in the profile timezone',()=>{
  expect(P.availability({...input,now:'2026-09-28T14:30:00Z'}).minutes).toBe(90);
});
test('unknown duration holds time from the event start rather than assuming a free slot',()=>{
  const a=P.availability({...input,events:[{event_date:input.today,start_time:'10:00'}]});
  expect(a.minutes).toBe(60);expect(a.warnings[0]).toContain('end time');
});
test('all-day and spanning commitments consume the appropriate day',()=>{
  expect(P.availability({...input,events:[{event_date:input.today,all_day:true}]}).minutes).toBe(0);
  expect(P.availability({...input,events:[{event_date:'2026-09-27',end_date:input.today,start_time:'18:00',end_time:'10:00'}]}).minutes).toBe(120);
});
test('unknown calendar, recurrence and missing focus windows never claim free time',()=>{
  for(const extra of [{unavailableSources:['Calendar']},{events:[{is_recurring:true}]},{focusWindows:[]}]){
    const a=P.availability({...input,...extra});expect(a.known).toBe(false);expect(a.minutes).toBeNull();
  }
});
test('clock transitions cannot overstate elapsed focus time',()=>{
  const a=P.availability({...input,today:'2026-11-01',now:'2026-11-01T04:00:00Z',focusWindows:[{day:0,start:'01:00',end:'03:00'}]});
  expect(a.known).toBe(false);expect(a.warnings[0]).toContain('clock change');
});
test('tasks require a contiguous slot and suggested tasks cannot double-book time',()=>{
  const a={known:true,windows:[{start:540,end:570},{start:600,end:645}]};
  const plan=P.fit([{id:'large',estimate_minutes:60},{id:'small',estimate_minutes:30,goal_id:'g',next_action:'Open draft'},
    {id:'next',estimate_minutes:40},{id:'unknown'},{id:'held',status:'On Hold',estimate_minutes:5}],a,[{id:'g',g:'Publish a book'}],3);
  expect(plan.selected.map(t=>t.id)).toEqual(['small','next']);
  expect(plan.selected[0]).toMatchObject({start:'09:00',end:'09:30',goalTitle:'Publish a book',nextAction:'Open draft'});
  expect(plan.plannedMinutes).toBe(70);expect(plan.deferred.map(t=>t.id)).toEqual(['large','unknown','held']);
  expect(a.windows[0].start).toBe(540);
});
test('invalid estimates, dates and windows are rejected',()=>{
  for(const estimate of ['-5','4','1.2','1441','abc'])expect(()=>P.task({title:'Task',status:'Not Started',estimate_minutes:estimate})).toThrow();
  expect(()=>P.task({title:'Task',status:'Not Started',due_date:'2026-02-30'})).toThrow();
  expect(()=>P.windows([{day:1,start:'22:00',end:'06:00'}])).toThrow();
  expect(P.task({title:' Task ',status:'Done',estimate_minutes:''})).toMatchObject({title:'Task',completed:true,estimate_minutes:null});
});
test('a removed goal is not replaced by a different goal',()=>{
  const plan=P.fit([{id:'t',goal_id:'missing'}],{known:false,windows:[]},[{id:'other',g:'Different'}]);
  expect(plan.selected[0].goalTitle).toBeNull();
});
