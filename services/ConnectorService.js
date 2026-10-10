(function(root){
  'use strict';
  function sourceLink(value) {
    try {const u=new URL(value);if(u.username||u.password)return '';
      if(u.protocol==='https:'&&((u.hostname==='github.com'&&/^\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/(issues|pull|actions\/runs)\/\d+$/.test(u.pathname))||(u.hostname==='www.google.com'&&u.pathname.startsWith('/calendar/'))||u.hostname==='calendar.google.com'))return u.href;
      if(u.protocol==='obsidian:'&&u.hostname==='open'&&u.searchParams.has('file'))return u.href;
    }catch(_){}return '';
  }
  function dateParts(value,zone) {
    if(typeof value!=='string'||!/(Z|[+-]\d{2}:\d{2})$/.test(value)||!Number.isFinite(Date.parse(value)))throw new Error('Invalid event instant');
    const p=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(new Date(value)).map(p=>[p.type,p.value]));
    return {date:`${p.year}-${p.month}-${p.day}`,time:`${p.hour}:${p.minute}:${p.second}`};
  }
  function merge(snapshot,zone,now=Date.now()) {
    const events=[],seen=new Set(),unavailable=[];
    for(const connection of snapshot.connections||[])if(connection.selected?.length&&(['stale','syncing','reconnect_required'].includes(connection.status)||!connection.lastSync||now-Date.parse(connection.lastSync)>15*60000))unavailable.push(connection.provider==='google'?'Calendar':'Connected tasks');
    for(const e of snapshot.events||[]) {
      const occurrence=e.occurrence&&Number.isFinite(Date.parse(e.occurrence))?new Date(e.occurrence).toISOString():e.occurrence;
      const key=e.uid&&occurrence?'uid:'+e.uid+':'+occurrence:e.calendar+':'+e.id;if(seen.has(key))continue;seen.add(key);
      try {
        let start,end,allDay=!!e.start?.date;
        if(allDay) {
          const valid=d=>/^\d{4}-\d{2}-\d{2}$/.test(d||'')&&new Date(d).toISOString().slice(0,10)===d;
          if(!valid(e.start.date)||!valid(e.end?.date)||e.end.date<=e.start.date)throw new Error('Invalid all-day interval');
          start={date:e.start.date,time:null};end={date:new Date(Date.parse(e.end.date)-86400000).toISOString().slice(0,10),time:null};
        } else {
          if(Date.parse(e.end?.dateTime)<=Date.parse(e.start?.dateTime))throw new Error('Invalid event interval');
          start=dateParts(e.start?.dateTime,zone);end=dateParts(e.end?.dateTime,zone);
        }
        events.push({id:'google:'+key,title:e.title,event_date:start.date,end_date:end.date,start_time:start.time,end_time:end.time,all_day:allDay,is_recurring:false,source:'google',sourceUrl:sourceLink(e.link)});
      } catch(_){unavailable.push('Calendar');}
    }
    return {events,tasks:(snapshot.tasks||[]).map(t=>({...t,sourceUrl:sourceLink(t.sourceUrl)})),goals:snapshot.goals||[],unavailableSources:[...new Set(unavailable)]};
  }
  function facts(brief) {
    const result=[];
    for(const [index,item] of (brief.focus||[]).filter(f=>f.kind!=='workout').entries())result.push({id:'focus_'+index,text:`${item.kind==='event'?'Saved commitment':'Suggested task'}: “${String(item.title).slice(0,300)}”. ${String(item.reason).slice(0,150)}${item.nextAction?' Next action: “'+String(item.nextAction).slice(0,150)+'”.':''}`,url:sourceLink(item.sourceUrl)});
    for(const [index,goal] of (brief.directions||[]).entries())result.push({id:'goal_'+index,text:'Goal: “'+String(goal.title).slice(0,300)+'”. Priority: '+goal.priority+'.'});
    if(brief.planning)result.push({id:'capacity',text:brief.planning.availability.known?brief.planning.availability.minutes+' minutes of focus time remain; '+brief.planning.plannedMinutes+' minutes are suggested. Suggestions are not calendar bookings.':'Available focus time is not confirmed.'});
    if(brief.unavailableSources?.length)result.push({id:'freshness',text:'Unavailable sources: '+brief.unavailableSources.join(', ')+'. Refresh before relying on this brief.'});
    return result;
  }
  root.ConnectorService=Object.freeze({sourceLink,merge,facts});
  if(typeof module!=='undefined'&&module.exports)module.exports=root.ConnectorService;
})(typeof window!=='undefined'?window:globalThis);
