/* Bounded, explicit-event iCalendar import. Recurrence is deliberately rejected. */
(function(root){
  'use strict';
  const MAX_BYTES=2*1024*1024,MAX_EVENTS=2000;
  const decode=s=>s.replace(/\\([nN,;\\])/g,(_,c)=>/[nN]/.test(c)?'\n':c);
  const date=s=>s.slice(0,4)+'-'+s.slice(4,6)+'-'+s.slice(6,8);
  const shift=(s,days)=>new Date(Date.parse(s+'T12:00:00Z')+days*86400000).toISOString().slice(0,10);
  function parts(ms,zone){
    const p=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(ms).map(v=>[v.type,v.value]));
    return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}`;
  }
  function datetime(prop,zone){
    if(!prop)throw new Error('An event is missing its start date.');
    const raw=prop.value;
    if(!/^\d{8}(?:T\d{6}Z?)?$/.test(raw))throw new Error('An event has an unsupported date or time.');
    const day=date(raw);
    if(new Date(day+'T12:00:00Z').toISOString().slice(0,10)!==day)throw new Error('An event has an invalid date.');
    if(raw.length===8){
      if(prop.params.VALUE && prop.params.VALUE!=='DATE')throw new Error('Unsupported date value type.');
      if(prop.params.TZID)throw new Error('All-day events cannot specify a timezone.');
      return {day,time:null,allDay:true,ms:Date.parse(day+'T00:00:00Z')};
    }
    if(prop.params.VALUE && prop.params.VALUE!=='DATE-TIME')throw new Error('Unsupported date value type.');
    const wall=day+'T'+raw.slice(9,11)+':'+raw.slice(11,13)+':'+raw.slice(13,15);
    const nominal=Date.parse(wall+'Z');
    if(!Number.isFinite(nominal)||new Date(nominal).toISOString().slice(0,19)!==wall)throw new Error('An event has an invalid time.');
    let ms=nominal;
    if(raw.endsWith('Z')){
      if(prop.params.TZID)throw new Error('UTC events cannot also specify a timezone.');
    }else{
      const source=prop.params.TZID||zone;
      // Probe both sides of DST transitions and accept only an unambiguous wall time.
      const offsets=new Set([-86400000,0,86400000].map(delta=>Date.parse(parts(nominal+delta,source)+'Z')-(nominal+delta)));
      const matches=[...offsets].map(offset=>nominal-offset).filter(value=>parts(value,source)===wall);
      if(matches.length!==1)throw new Error('An event falls in an ambiguous or missing daylight-saving hour. Export it with UTC times.');
      ms=matches[0];
    }
    const local=parts(ms,zone);
    return {day:local.slice(0,10),time:local.slice(11,19),allDay:false,ms};
  }
  const clock=value=>value?(value.length===5?value+':00':value.slice(0,8)):null;
  function fingerprint(e){return JSON.stringify([e.title,e.event_date,clock(e.event_time),e.end_date||null,clock(e.end_time),!!e.all_day]);}
  function parse(text,zone){
    if(typeof text!=='string'||new TextEncoder().encode(text).length>MAX_BYTES)throw new Error('Choose a calendar smaller than 2 MB.');
    try{parts(Date.now(),zone);}catch(_){throw new Error('Set a valid profile timezone before importing.');}
    const lines=text.replace(/^\uFEFF/,'').replace(/\r\n/g,'\n').replace(/\r/g,'\n').replace(/\n[ \t]/g,'').split('\n');
    if(lines[0]!=='BEGIN:VCALENDAR'||!lines.includes('END:VCALENDAR'))throw new Error('Choose a complete .ics calendar.');
    const stack=[],events=[];let current=null,hasDetails=false;
    for(const line of lines){
      if(!line)continue;
      const colon=line.indexOf(':');if(colon<0)throw new Error('Malformed calendar line.');
      const head=line.slice(0,colon).split(';'),key=head.shift().toUpperCase(),value=line.slice(colon+1);
      if(key==='BEGIN'){
        if(value==='VALARM')hasDetails=true;
        if(value==='VEVENT'){
          if(stack.join('/')!=='VCALENDAR')throw new Error('Unexpected nested event.');
          current=Object.create(null);
        }
        stack.push(value);continue;
      }
      if(key==='END'){
        if(stack.pop()!==value)throw new Error('Incomplete calendar component.');
        if(value==='VEVENT'){
          if(events.length>=MAX_EVENTS)throw new Error('Import at most 2,000 events at once.');
          const title=decode(current.SUMMARY?.value||'').trim();
          if(!title||title.length>500)throw new Error('Each event needs a title of 1–500 characters.');
          const start=datetime(current.DTSTART,zone),end=current.DTEND?datetime(current.DTEND,zone):null;
          if(end&&(end.allDay!==start.allDay||end.ms<=start.ms))throw new Error('An event ends before it starts or mixes all-day and timed dates.');
          const endDay=end?(start.allDay?shift(end.day,-1):end.day):null;
          if(end&&!start.allDay && end.day===start.day && end.time<=start.time)throw new Error('An event crosses a repeated daylight-saving hour. Review it separately.');
          const row={title,event_date:start.day,event_time:start.time,all_day:start.allDay,
            end_date:endDay&&endDay>start.day?endDay:null,end_time:end&&!start.allDay?end.time:null,event_type:'b',is_recurring:false};
          events.push({row,identity:current.UID?.value||fingerprint(row)});current=null;
        }
        continue;
      }
      if(key==='METHOD'&&value!=='PUBLISH')throw new Error('Meeting invitations and cancellations cannot be imported as saved events.');
      if(stack.join('/')!=='VCALENDAR/VEVENT')continue;
      if(['RRULE','RDATE','EXDATE','RECURRENCE-ID','DURATION'].includes(key))throw new Error('Export expanded individual events with start and end dates. Recurrence and duration-only events are not supported yet.');
      if(key==='STATUS'&&value==='CANCELLED')throw new Error('This file contains cancelled events. Export active events only.');
      if(['DESCRIPTION','LOCATION','ATTENDEE','ORGANIZER','URL','ATTACH'].includes(key))hasDetails=true;
      if(!['DTSTART','DTEND','SUMMARY','UID'].includes(key))continue;
      if(current[key])throw new Error('An event repeats a required field.');
      const params=Object.create(null);
      for(const field of head){const i=field.indexOf('=');if(i<1)throw new Error('Invalid date parameter.');params[field.slice(0,i).toUpperCase()]=field.slice(i+1).replace(/^"|"$/g,'');}
      current[key]={value,params};
    }
    if(stack.length||!events.length)throw new Error('No complete events found.');
    return {events,hasDetails,zone};
  }
  function classify(events,existing){
    const ids=new Map(existing.map(row=>[row.id,row])),prints=new Set(existing.map(fingerprint));
    const pending=[],conflicts=[];let duplicates=0;
    for(const item of events){
      const prior=ids.get(item.id),same=prints.has(fingerprint(item));
      if(prior&&fingerprint(prior)!==fingerprint(item)){conflicts.push(item);continue;}
      if(prior||same){duplicates++;continue;}
      pending.push(item);ids.set(item.id,item);prints.add(fingerprint(item));
    }
    return {pending,conflicts,duplicates};
  }
  root.CalendarImportService={parse,classify,fingerprint,MAX_BYTES};
  if(typeof module!=='undefined')module.exports=root.CalendarImportService;
})(typeof window!=='undefined'?window:globalThis);
