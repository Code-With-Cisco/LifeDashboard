(function(root){
  'use strict';
  function create({session,list,insert,refresh}){
    let preview=null,version=0,busy=false;
    const el=id=>document.getElementById(id);
    function reset(){
      version++;preview=null;busy=false;
      if(el('ics-file'))el('ics-file').disabled=false;
      if(el('ics-confirm'))el('ics-confirm').disabled=true;
    }
    const status=message=>{el('ics-status').textContent=message;};
    function current(owner,v){const now=session();return version===v&&now?.userId===owner.userId&&now?.epoch===owner.epoch&&now?.zone===owner.zone;}
    async function identity(userId,key){
      const bytes=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(['calendar-import-v1',userId,key]))));
      bytes[6]=(bytes[6]&15)|80;bytes[8]=(bytes[8]&63)|128;
      const h=[...bytes.slice(0,16)].map(v=>v.toString(16).padStart(2,'0')).join('');
      return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
    }
    async function read(input){
      if(busy)return;
      const file=input.files?.[0],owner=session();if(!file||!owner)return;
      preview=null;const v=++version;el('ics-confirm').disabled=true;el('ics-preview').replaceChildren();
      el('ics-details-confirm').checked=false;status('Reading calendar…');
      try{
        if(file.size>CalendarImportService.MAX_BYTES)throw new Error('Choose a calendar smaller than 2 MB.');
        const text=await file.text();if(!current(owner,v))return;
        const parsed=CalendarImportService.parse(text,owner.zone);
        const rows=await Promise.all(parsed.events.map(async event=>({...event.row,id:await identity(owner.userId,event.identity)})));
        if(!current(owner,v))return;
        const existing=await list(owner.userId);if(!current(owner,v))return;
        const plan=CalendarImportService.classify(rows,existing);
        preview={...plan,owner,v,hasDetails:parsed.hasDetails};
        el('ics-details-warning').hidden=!parsed.hasDetails;
        status(`${plan.pending.length} new events; ${plan.duplicates} already present; ${plan.conflicts.length} changed events need review. Times use ${owner.zone}.`);
        const listEl=el('ics-preview');
        for(const event of plan.pending){
          const row=document.createElement('div');row.className='profile-note';
          row.textContent=`${event.event_date} ${event.all_day?'All day':event.event_time} — ${event.title}${event.end_date?' → '+event.end_date:''}${event.end_time?' until '+event.end_time:''}`;
          listEl.append(row);
        }
        el('ics-confirm').disabled=!plan.pending.length||!!plan.conflicts.length;
        if(plan.conflicts.length)status('Some events have changed since import. Review those events in Schedule; importing will not overwrite them.');
      }catch(error){if(current(owner,v))status(error.message==='Write was not confirmed'?'Calendar could not be loaded. Retry the preview.':error.message||'Could not read calendar.');}
      finally{input.value='';}
    }
    async function save(){
      const draft=preview;if(!draft||busy||!draft.pending.length||draft.conflicts.length)return;
      if(!current(draft.owner,draft.v)){reset();status('Session or timezone changed. Choose the file again.');return;}
      if(draft.hasDetails&&!el('ics-details-confirm').checked){status('Review and acknowledge the information this import can save.');return;}
      busy=true;el('ics-confirm').disabled=true;el('ics-file').disabled=true;
      let saved=0;
      try{
        for(let i=0;i<draft.pending.length;i+=100){
          if(!current(draft.owner,draft.v))return;
          const batch=draft.pending.slice(i,i+100);
          await insert(draft.owner.userId,batch);
          if(!current(draft.owner,draft.v))return;
          saved+=batch.length;status(`Confirmed ${saved} of ${draft.pending.length} events…`);
        }
        preview=null;status(`Imported ${saved} events. ${draft.duplicates} duplicates skipped.`);el('ics-preview').replaceChildren();refresh();
      }catch(_){
        if(current(draft.owner,draft.v)){
          preview=null;status(`Confirmed ${saved} events before the import stopped. Choose the same file to preview again; already saved events will be skipped.`);refresh();
        }
      }finally{
        if(current(draft.owner,draft.v)){busy=false;el('ics-file').disabled=false;}
      }
    }
    return {read,save,reset};
  }
  root.CalendarImportUI={create};
})(window);
