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
