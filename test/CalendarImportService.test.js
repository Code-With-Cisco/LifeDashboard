/** @jest-environment node */
const Service=require('../services/CalendarImportService');
const calendar=body=>`BEGIN:VCALENDAR\r\nVERSION:2.0\r\n${body}\r\nEND:VCALENDAR\r\n`;
const event=body=>`BEGIN:VEVENT\r\n${body}\r\nEND:VEVENT`;
const timed=(extra='')=>event(`UID:test\r\nSUMMARY:Test\r\nDTSTART:20260929T090000Z\r\nDTEND:20260929T100000Z\r\n${extra}`);
test('converts UTC into profile timezone and retains the event end',()=>{
  const {row}=Service.parse(calendar(timed()),'America/New_York').events[0];
  expect(row).toMatchObject({event_date:'2026-09-29',event_time:'05:00:00',end_time:'06:00:00',all_day:false});
});
test('IANA and floating times preserve the intended wall clock across DST',()=>{
  for(const [day,expected] of [['20260929','09:00:00'],['20261103','10:00:00']]){
    const text=calendar(event(`SUMMARY:Training\r\nDTSTART;TZID=America/New_York:${day}T050000`));
    expect(Service.parse(text,'UTC').events[0].row.event_time).toBe(expected);
  }
  expect(Service.parse(calendar(event('SUMMARY:Meal\r\nDTSTART:20260929T120000')),'America/New_York').events[0].row.event_time).toBe('12:00:00');
});
test('all-day exclusive DTEND becomes the inclusive last display day',()=>{
  const text=calendar(event('SUMMARY:Trip\r\nDTSTART;VALUE=DATE:20260929\r\nDTEND;VALUE=DATE:20261002'));
  expect(Service.parse(text,'UTC').events[0].row).toMatchObject({all_day:true,event_date:'2026-09-29',end_date:'2026-10-01',event_time:null,end_time:null});
});
test('unfolds and unescapes text without interpreting markup or alarm summaries',()=>{
  const text=calendar(event('SUMMARY:Workout\\, upper\r\n  body <img>\r\nDTSTART:20260929T090000Z\r\nDESCRIPTION:Sets\\nReps\r\nBEGIN:VALARM\r\nSUMMARY:Alarm\r\nEND:VALARM'));
  const parsed=Service.parse(text,'UTC');expect(parsed.events[0].row.title).toBe('Workout, upper body <img>');expect(parsed.hasDetails).toBe(true);
});
test.each(['RRULE:FREQ=DAILY','RDATE:20260930T090000Z','EXDATE:20260930T090000Z','RECURRENCE-ID:20260929T090000Z','DURATION:PT1H','STATUS:CANCELLED'])('refuses lossy import of %s',extra=>{
  expect(()=>Service.parse(calendar(timed(extra)),'UTC')).toThrow();
});
test.each(['20260230T090000','20260929T250000','20260308T023000','20261101T013000'])('rejects invalid or ambiguous New York time %s',value=>{
  expect(()=>Service.parse(calendar(event(`SUMMARY:Test\r\nDTSTART;TZID=America/New_York:${value}`)),'UTC')).toThrow();
});
test('bounds file size and event count, rejects broken containers',()=>{
  expect(()=>Service.parse('x'.repeat(Service.MAX_BYTES+1),'UTC')).toThrow(/2 MB/);
  expect(()=>Service.parse(calendar(Array(2001).fill(timed()).join('\r\n')),'UTC')).toThrow(/2,000/);
  expect(()=>Service.parse(calendar(timed()).replace('END:VEVENT','END:OTHER'),'UTC')).toThrow();
});
test('684 explicit events parse and deduplicate without truncation',()=>{
  const text=calendar(Array.from({length:684},(_,i)=>timed().replace('UID:test','UID:'+i).replace('SUMMARY:Test','SUMMARY:Test '+i)).join('\r\n'));
  const rows=Service.parse(text,'UTC').events.map((e,i)=>({...e.row,id:String(i)}));
  const plan=Service.classify(rows,rows.slice(0,300));expect(plan.pending).toHaveLength(384);expect(plan.duplicates).toBe(300);
});
test('changed IDs are conflicts, minute-precision and second-precision times match',()=>{
  const row={...Service.parse(calendar(timed()),'UTC').events[0].row,id:'a'};
  expect(Service.classify([{...row,title:'Changed'}],[row]).conflicts).toHaveLength(1);
  expect(Service.classify([{...row,id:'b',event_time:'09:00',end_time:'10:00'}],[row]).duplicates).toBe(1);
});
const window={from:'2026-10-01',to:'2026-11-10'};
test('expands daily recurrence across DST, retaining instructions and reminders',()=>{
  const text=calendar(event('UID:series\r\nSUMMARY:Training\r\nDTSTART;TZID=America/New_York:20261031T090000\r\nDURATION:PT1H\r\nRRULE:FREQ=DAILY;COUNT=3\r\nDESCRIPTION:Sets\\nReps <script>\r\nLOCATION:Gym\r\nATTENDEE:mailto:fixture@example.invalid\r\nBEGIN:VALARM\r\nACTION:DISPLAY\r\nTRIGGER:-PT15M\r\nDESCRIPTION:Reminder\r\nEND:VALARM'));
  const parsed=Service.parse(text,'UTC',window);
  expect(parsed.events.map(e=>e.row.event_time)).toEqual(['13:00:00','14:00:00','14:00:00']);
  expect(parsed.events.map(e=>e.row.end_time)).toEqual(['14:00:00','15:00:00','15:00:00']);
  expect(parsed.events[0].row.source_details).toMatchObject({description:'Sets\nReps <script>',location:'Gym'});
  expect(parsed.events[0].row.source_details.alarms).toHaveLength(1);
  expect(parsed.events[0].row.source_details.properties.some(p=>p[0]==='attendee')).toBe(true);
  expect(new Set(parsed.events.map(e=>e.identity)).size).toBe(3);
});
test('recurrence exclusions, added dates, moved and cancelled occurrences preserve stable identities',()=>{
  const series=event('UID:series\r\nSUMMARY:Training\r\nDTSTART:20261010T090000Z\r\nDTEND:20261010T100000Z\r\nRRULE:FREQ=DAILY;COUNT=4\r\nEXDATE:20261011T090000Z\r\nRDATE:20261015T090000Z');
  const moved=event('UID:series\r\nRECURRENCE-ID:20261012T090000Z\r\nSUMMARY:Moved\r\nDTSTART:20261012T110000Z\r\nDTEND:20261012T120000Z');
  const cancelled=event('UID:series\r\nRECURRENCE-ID:20261013T090000Z\r\nSTATUS:CANCELLED');
  const parsed=Service.parse(calendar([series,moved,cancelled].join('\r\n')),'UTC',window);
  expect(parsed.events.map(e=>[e.row.event_date,e.row.event_time])).toEqual([['2026-10-10','09:00:00'],['2026-10-12','11:00:00'],['2026-10-15','09:00:00']]);
  const original=Service.parse(calendar(series),'UTC',window).events.find(e=>e.row.event_date==='2026-10-12');
  expect(parsed.events[1].identity).toBe(original.identity);
});
test('duration-only all-day events and weekly/monthly rules have inclusive end dates',()=>{
  const duration=calendar(event('UID:trip\r\nSUMMARY:Trip\r\nDTSTART;VALUE=DATE:20261010\r\nDURATION:P3D\r\nRRULE:FREQ=WEEKLY;COUNT=2'));
  expect(Service.parse(duration,'UTC',window).events.map(e=>e.row.end_date)).toEqual(['2026-10-12','2026-10-19']);
  const monthly=calendar(event('UID:month\r\nSUMMARY:Monthly\r\nDTSTART;VALUE=DATE:20261010\r\nRRULE:FREQ=MONTHLY;COUNT=2'));
  expect(Service.parse(monthly,'UTC',window).events.map(e=>e.row.event_date)).toEqual(['2026-10-10','2026-11-10']);
});
test('bounds expansion and details and rejects orphan/range exceptions',()=>{
  expect(()=>Service.parse(calendar(timed('RRULE:FREQ=MINUTELY')),'UTC',window)).toThrow(/high-frequency/);
  expect(()=>Service.parse(calendar(timed('RRULE:FREQ=DAILY')),'UTC',{from:'2026-01-01',to:'2028-01-01'})).toThrow(/366/);
  expect(()=>Service.parse(calendar(timed('DESCRIPTION:'+'x'.repeat(32769))),'UTC')).toThrow(/32 KB/);
  expect(()=>Service.parse(calendar(timed('RECURRENCE-ID:20260929T090000Z')),'UTC',window)).toThrow(/original series/);
});
test('retained detail changes are import conflicts and object key order is immaterial',()=>{
  const row={...Service.parse(calendar(timed('DESCRIPTION:Original')),'UTC').events[0].row,id:'same'};
  expect(Service.classify([{...row,source_details:{...row.source_details,description:'Changed'}}],[row]).conflicts).toHaveLength(1);
  expect(Service.classify([{...row,source_details:{timing:row.source_details.timing,alarms:row.source_details.alarms,properties:row.source_details.properties,location:'',description:'Original'}}],[row]).duplicates).toBe(1);
});
test('duration hours are elapsed hours across DST and all-day overlap uses the inclusive end',()=>{
 const text=calendar(event('UID:elapsed\r\nSUMMARY:Night\r\nDTSTART;TZID=America/New_York:20261101T003000\r\nDURATION:PT3H'));
 expect(Service.parse(text,'America/New_York').events[0].row).toMatchObject({event_time:'00:30:00',end_time:'02:30:00'});
 const trip=calendar(event('UID:trip\r\nSUMMARY:Trip\r\nDTSTART;VALUE=DATE:20261010\r\nDTEND;VALUE=DATE:20261013'));
 expect(Service.parse(trip,'UTC',{from:'2026-10-13',to:'2026-10-14'}).events).toHaveLength(0);
});
