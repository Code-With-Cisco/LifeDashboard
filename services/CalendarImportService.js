/* Bounded iCalendar snapshots with retained details and recurrence exceptions. */
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
  function fingerprint(e){return JSON.stringify([e.title,e.event_date,clock(e.event_time),e.end_date||null,clock(e.end_time),!!e.all_day,canonical(e.source_details||null)]);}
  function canonical(value){if(Array.isArray(value))return value.map(canonical);if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])]));return value;}
  function parseExplicit(text,zone){
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

  function parse(text,zone,window){
    if(typeof text!=='string'||new TextEncoder().encode(text).length>MAX_BYTES)throw new Error('Choose a calendar smaller than 2 MB.');
    // Keep strict date/container validation before the library normalizes values.
    const simple=text?.replace(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g,block=>/^RECURRENCE-ID[;:]/mi.test(block)&&/^STATUS:CANCELLED\r?$/mi.test(block)?'':block).replace(/^(RRULE|RDATE|EXDATE|RECURRENCE-ID|DURATION)(?:;[^:]*)?:[^\r\n]*(?:\r?\n[ \t][^\r\n]*)*/gmi,'')
      .replace(/^STATUS:CANCELLED\r?$/gmi,'');
    parseExplicit(simple,zone);
    for(const line of text.replace(/\r\n/g,'\n').replace(/\n[ \t]/g,'').split('\n')){
      if(!/^(RDATE|EXDATE|RECURRENCE-ID)[;:]/i.test(line))continue;
      const colon=line.indexOf(':'),fields=line.slice(0,colon).split(';'),params={};
      for(const field of fields.slice(1)){const at=field.indexOf('=');if(at<1)throw new Error('Invalid recurrence parameter.');params[field.slice(0,at).toUpperCase()]=field.slice(at+1).replace(/^"|"$/g,'');}
      if(params.VALUE==='PERIOD')throw new Error('Export recurrence periods as individual events.');
      for(const value of line.slice(colon+1).replace(/\r$/,'').split(','))datetime({value,params},zone);
    }
    const ICAL=root.ICAL||(typeof require==='function'?require('../node_modules/ical.js/dist/ical.es5.cjs'):null);
    if(!ICAL)throw new Error('Calendar reader unavailable. Reload and try again.');
    let calendar;try{calendar=new ICAL.Component(ICAL.parse(text));}catch(_){throw new Error('Choose a complete, valid .ics calendar.');}
    const components=calendar.getAllSubcomponents('vevent'),masters=new Map(),exceptions=new Map();
    const hasSeries=components.some(c=>['rrule','rdate','exdate','recurrence-id'].some(k=>c.hasProperty(k)));
    let from=null,to=null;
    if(window||hasSeries){
      from=window?.from;to=window?.to;
      if(!/^\d{4}-\d{2}-\d{2}$/.test(from||'')||!/^\d{4}-\d{2}-\d{2}$/.test(to||'')||
        !Number.isFinite(Date.parse(from))||shift(from,0)!==from||shift(to,0)!==to||to<from||Date.parse(to)-Date.parse(from)>365*86400000)
        throw new Error('Choose a valid import window of at most 366 days. Recurring events need a window.');
    }
    const events=[];let hasDetails=false,iterations=0,totalBytes=0;
    const zoneOf=(component,key)=>component.getFirstProperty(key)?.getParameter('tzid');
    const point=(time,component,key)=>datetime({value:time.toICALString(),params:zoneOf(component,key)?{TZID:zoneOf(component,key)}:{}},zone);
    const details=component=>{
      const value={description:String(component.getFirstPropertyValue('description')||''),location:String(component.getFirstPropertyValue('location')||''),
        timing:component.getAllProperties().filter(p=>['dtstart','dtend'].includes(p.name)).map(p=>p.toJSON()),
        properties:component.getAllProperties().filter(p=>!['summary','dtstart','dtend','description','location'].includes(p.name)).map(p=>p.toJSON()),
        alarms:component.getAllSubcomponents('valarm').map(a=>a.toJSON())};
      if(new TextEncoder().encode(JSON.stringify(value,null,1)).length>32768)throw new Error('An event has more than 32 KB of details. Export attachments separately.');
      if(value.description||value.location||value.alarms.length||value.properties.some(p=>p[0]!=='uid'))hasDetails=true;
      return value;
    };
    const add=(item,startTime,endTime,identity)=>{
      const c=item.component,start=point(startTime,c,'dtstart');
      const duration=c.getFirstPropertyValue('duration');
      let end=!duration&&endTime?point(endTime,c,c.hasProperty('dtend')?'dtend':'dtstart'):null;
      if(duration){
        if(duration.isNegative||(start.allDay&&(duration.hours||duration.minutes||duration.seconds)))throw new Error('Use a positive whole-day duration for all-day events.');
        const nominal=startTime.clone();nominal.addDuration(new ICAL.Duration({days:duration.days,weeks:duration.weeks}));
        const base=point(nominal,c,'dtstart'),ms=base.ms+(duration.hours*3600+duration.minutes*60+duration.seconds)*1000;
        if(start.allDay)end={...base,ms};
        else {const local=parts(ms,zone);end={day:local.slice(0,10),time:local.slice(11,19),allDay:false,ms};}
      }
      if(end&&(end.allDay!==start.allDay||end.ms<=start.ms))throw new Error('An event ends before it starts or mixes all-day and timed dates.');
      if(end&&!start.allDay&&end.day===start.day&&end.time<=start.time)throw new Error('An event crosses a repeated daylight-saving hour. Review it separately.');
      if(from&&(start.day>to||(end?(start.allDay?shift(end.day,-1):end.day):start.day)<from))return;
      const title=String(item.summary||'').trim();if(!title||title.length>500)throw new Error('Each event needs a title of 1–500 characters.');
      const endDay=end?(start.allDay?shift(end.day,-1):end.day):null;
      if(events.length>=MAX_EVENTS)throw new Error('Import at most 2,000 events at once. Narrow the date window.');
      const row={title,event_date:start.day,event_time:start.time,all_day:start.allDay,end_date:endDay&&endDay>start.day?endDay:null,
        end_time:end&&!start.allDay?end.time:null,event_type:'b',is_recurring:false,source_details:details(c)};
      totalBytes+=new TextEncoder().encode(JSON.stringify(row)).length;
      if(totalBytes>5*1024*1024)throw new Error('Expanded calendar exceeds 5 MB. Narrow the date window.');
      events.push({identity:identity||fingerprint({...row,source_details:null}),row});
    };
    for(const c of components){
      if(c.hasProperty('dtend')&&c.hasProperty('duration'))throw new Error('An event cannot specify both an end and a duration.');
      const uid=String(c.getFirstPropertyValue('uid')||'');
      if(c.hasProperty('recurrence-id')){
        if(!uid||c.getFirstProperty('recurrence-id').getParameter('range'))throw new Error('Export recurrence-range changes as individual events.');
        const list=exceptions.get(uid)||[];list.push(c);exceptions.set(uid,list);
      }else{
        if(uid&&masters.has(uid))throw new Error('This calendar repeats an event UID. Export one current version.');
        masters.set(uid||'anonymous-'+masters.size,c);
      }
    }
    for(const uid of exceptions.keys())if(!masters.has(uid))throw new Error('A recurrence exception is missing its original series.');
    for(const [uid,c] of masters){
      if(c.getFirstPropertyValue('status')==='CANCELLED')throw new Error('This file contains cancelled events. Export active events only.');
      if(c.getAllProperties('rrule').length>1)throw new Error('Export events with multiple recurrence rules as individual occurrences.');
      for(const p of c.getAllProperties('rrule')){
        const rule=p.getFirstValue();
        if(!['DAILY','WEEKLY','MONTHLY','YEARLY'].includes(rule.freq)||rule.interval<1||rule.interval>365||rule.count>10000||(rule.count!==null&&rule.count<1)||
          ['BYSECOND','BYMINUTE','BYHOUR'].some(k=>rule.parts[k]))throw new Error('Export high-frequency or unusually large recurrence rules as individual events.');
      }
      const item=new ICAL.Event(c),related=exceptions.get(uid)||[],seen=new Set(),cancelled=new Set();
      for(const exception of related){
        const key=exception.getFirstPropertyValue('recurrence-id').toString();
        if(seen.has(key))throw new Error('This calendar repeats a recurrence exception.');seen.add(key);
        if(exception.getFirstPropertyValue('status')==='CANCELLED')cancelled.add(key);
        else item.relateException(new ICAL.Event(exception));
      }
      if(!item.isRecurring()&&!c.hasProperty('exdate')){
        add(item,item.startDate,c.hasProperty('dtend')||c.hasProperty('duration')?item.endDate:null, c.getFirstPropertyValue('uid'));
        continue;
      }
      if(!c.getFirstPropertyValue('uid'))throw new Error('Each recurring series needs a stable UID.');
      const cutoff=related.reduce((last,e)=>{const day=point(e.getFirstPropertyValue('recurrence-id'),e,'recurrence-id').day;return day>last?day:last;},to);
      const iterator=item.iterator();let occurrence;
      while((occurrence=iterator.next())){
        if(++iterations>10000)throw new Error('Recurrence expansion exceeded 10,000 steps. Export a shorter series.');
        if(point(occurrence,c,'dtstart').day>cutoff)break;
        if(cancelled.has(occurrence.toString()))continue;
        const occurrenceDetails=item.getOccurrenceDetails(occurrence);
        if(occurrenceDetails.item.component.getFirstPropertyValue('status')==='CANCELLED')continue;
        add(occurrenceDetails.item,occurrenceDetails.startDate,c.hasProperty('dtend')||c.hasProperty('duration')||occurrenceDetails.item!==item?occurrenceDetails.endDate:null,
          JSON.stringify([uid,occurrence.toICALString()]));
      }
    }
    return {events,hasDetails,zone,window:from?{from,to}:null,hasSeries};
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
