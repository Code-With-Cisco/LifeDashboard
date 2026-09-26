/* Pure planning rules. Suggestions never create calendar events or change tasks. */
(function(root) {
  'use strict';
  const STATUSES = ['Not Started','In Progress','On Hold','Urgent','Important','Not Urgent','Done'];
  const minutes = value => /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(String(value || ''))
    ? Number(value.slice(0,2))*60+Number(value.slice(3,5)) : null;
  const time = value => `${String(Math.floor(value/60)).padStart(2,'0')}:${String(value%60).padStart(2,'0')}`;
  function dateValid(value) {
    return /^\d{4}-\d{2}-\d{2}$/.test(value || '') &&
      Number.isFinite(Date.parse(value+'T12:00:00Z')) && new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value;
  }
  function windows(value) {
    if (!Array.isArray(value) || value.length>28) throw new Error('Use up to 28 weekly focus windows.');
    return value.map(row=>{
      const start=minutes(row?.start), end=minutes(row?.end);
      if (!Number.isInteger(row?.day) || row.day<0 || row.day>6 || start===null || end===null || end<=start)
        throw new Error('Each focus window needs a weekday and an end time after its start. Split overnight windows across days.');
      return {day:row.day,start:time(start),end:time(end)};
    });
  }
  function task(input) {
    const title=String(input.title || '').trim(), next=String(input.next_action || '').trim();
    const estimate=input.estimate_minutes==null || input.estimate_minutes==='' ? null : Number(input.estimate_minutes);
    const goal=input.goal_id || null, due=input.due_date || null;
    if (!title || title.length>500) throw new Error('Enter a task title of up to 500 characters.');
    if (!STATUSES.includes(input.status)) throw new Error('Choose a valid task status.');
    if (due && !dateValid(due)) throw new Error('Choose a valid due date.');
    if (estimate!==null && (!Number.isInteger(estimate) || estimate<5 || estimate>1440))
      throw new Error('Estimate 5–1440 minutes, or leave the estimate blank.');
    if (next.length>500 || (goal && (typeof goal!=='string' || goal.length>100))) throw new Error('Task planning details are too long.');
    return {title,description:String(input.description || '').trim() || null,status:input.status,
      completed:input.status==='Done',due_date:due,estimate_minutes:estimate,goal_id:goal,next_action:next || null};
  }
  function localClock(now, timezone) {
    const parts=new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit',
      hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(new Date(now));
    const p=Object.fromEntries(parts.map(part=>[part.type,part.value]));
    return {date:`${p.year}-${p.month}-${p.day}`,minute:Number(p.hour)*60+Number(p.minute),second:Number(p.second)};
  }
  // On clock-change dates, avoid treating civil-clock minutes as elapsed time.
  function clockChanges(today, timezone) {
    const noon=Date.parse(today+'T12:00:00Z');
    const offsets=[-18,-6,6,18].map(hours=>{
      const instant=noon+hours*3600000, local=localClock(instant,timezone);
      return Date.parse(local.date+'T00:00:00Z')+local.minute*60000-instant;
    });
    return new Set(offsets).size>1;
  }
  function merge(intervals) {
    const merged=[];
    for (const interval of intervals.filter(x=>x.end>x.start).sort((a,b)=>a.start-b.start)) {
      const last=merged[merged.length-1];
      if (last && interval.start<=last.end) last.end=Math.max(last.end,interval.end);
      else merged.push({...interval});
    }
    return merged;
  }
  function availability({today,timezone='UTC',now,focusWindows=[],events=[],unavailableSources=[]}) {
    const warnings=[];
    const unknown=message=>({known:false,configured:focusWindows.length>0,windows:[],minutes:null,warnings:[message]});
    if (!dateValid(today)) return unknown('Choose a valid planning date.');
    if (unavailableSources.some(s=>['Calendar','Planning'].includes(s))) return unknown('Focus time is unavailable until calendar and planning records load.');
    let rows,clock;
    try { rows=windows(focusWindows); clock=localClock(now || new Date(),timezone); }
    catch (_) { return unknown('Review your focus windows and profile timezone.'); }
    if (!rows.length) return unknown('Set weekly focus windows to see what fits today.');
    if (clockChanges(today,timezone)) return unknown('A clock change is near this date. Review focus times manually.');
    if (events.some(e=>e.is_recurring)) return unknown('Recurring calendar events need review before focus time can be calculated.');
    const day=new Date(today+'T12:00:00Z').getUTCDay();
    const floor=clock.date>today?1440:clock.date===today?clock.minute+(clock.second>0?1:0):0;
    let free=merge(rows.filter(w=>w.day===day).map(w=>({start:Math.max(minutes(w.start),floor),end:minutes(w.end)})));
    const busy=[];
    for (const event of events.filter(e=>e.event_date<=today && (e.end_date || e.event_date)>=today)) {
      const start=minutes(event.start_time ?? event.event_time), rawEnd=minutes(event.end_time);
      const end=rawEnd===null?null:rawEnd+(Number(String(event.end_time).slice(6,8))>0?1:0);
      const multi=(event.end_date || event.event_date)>event.event_date;
      if (event.all_day || start===null) {
        busy.push({start:0,end:1440});
        if (!event.all_day) warnings.push('An event has no start time; the day is held until its timing is known.');
      } else if (end===null || (!multi && end<=start)) {
        busy.push({start:event.event_date<today?0:start,end:1440});
        warnings.push('An event has no usable end time; time after its start is held.');
      } else busy.push({start:event.event_date<today?0:start,end:(event.end_date || event.event_date)>today?1440:end});
    }
    const ordered=busy.sort((a,b)=>a.start-b.start);
    let previousEnd=-1;
    for (const b of ordered) {
      if (b.start<previousEnd) warnings.push('Calendar commitments overlap today.');
      previousEnd=Math.max(previousEnd,b.end);
    }
    for (const block of merge(busy)) free=free.flatMap(w=>{
      if (block.end<=w.start || block.start>=w.end) return [w];
      return [{start:w.start,end:Math.min(w.end,block.start)},{start:Math.max(w.start,block.end),end:w.end}].filter(x=>x.end>x.start);
    });
    return {known:true,configured:true,windows:free,minutes:free.reduce((sum,w)=>sum+w.end-w.start,0),warnings:[...new Set(warnings)]};
  }
  function fit(ranked, available, goals=[], limit=3) {
    const remaining=available.windows.map(w=>({...w})), selected=[], deferred=[];
    const goalMap=new Map(goals.filter(g=>g.id).map(g=>[g.id,g]));
    for (const item of ranked) {
      const goal=goalMap.get(item.goal_id);
      const detail={...item,goalTitle:goal?.g || null,nextAction:item.next_action || null};
      if (item.status==='On Hold') { deferred.push({...detail,fitReason:'On hold'}); continue; }
      if (selected.length>=limit) { deferred.push({...detail,fitReason:'Outside today’s focus limit'}); continue; }
      if (!available.known) { selected.push({...detail,fitReason:'Time not confirmed'}); continue; }
      if (!Number.isInteger(item.estimate_minutes) || item.estimate_minutes<5) {
        deferred.push({...detail,fitReason:'Add an estimate to check fit'}); continue;
      }
      const slot=remaining.find(w=>w.end-w.start>=item.estimate_minutes);
      if (!slot) { deferred.push({...detail,fitReason:'Does not fit a remaining focus window'}); continue; }
      const start=slot.start;slot.start+=item.estimate_minutes;
      selected.push({...detail,start:time(start),end:time(slot.start),fitReason:`${item.estimate_minutes} min · ${time(start)}–${time(slot.start)} suggested`});
    }
    return {selected,deferred,plannedMinutes:selected.reduce((sum,t)=>sum+(t.start?t.estimate_minutes:0),0)};
  }
  const api=Object.freeze({minutes,time,dateValid,windows,task,localClock,availability,fit});
  root.PlanningService=api;
  if (typeof module!=='undefined' && module.exports) module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
