import {random,digest} from './crypto.mjs';
import '../../../services/ObsidianService.js';
const OBSIDIAN_ID='00000000-0000-4000-8000-000000000001',BRIEF_ID='00000000-0000-4000-8000-000000000002';
export class BrokerError extends Error {constructor(code,status=400){super(code);this.code=code;this.status=status;}}
const uuid=value=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
export function broker({store,providers,narrate,now=()=>Date.now()}) {
  const load=async(user,id)=>{if(!uuid(id))throw new BrokerError('invalid_connection');const row=await store.load(user,id);if(!row)throw new BrokerError('connection_not_found',404);return row;};
  const persist=async(user,row)=>{row.revision=await store.save(user,row);return row;};
  const visible=row=>({id:row.id,provider:row.provider,status:row.value.status,selected:row.value.selected||[],lastSync:row.value.lastSync||null,error:row.value.error||null,label:row.value.label||row.provider});
  const active=row=>{if(!['ready','stale'].includes(row.value.status))throw new BrokerError('reconnect_required',409);};
  async function sync(user,row) {
    active(row);
    if(now()-(row.value.lastAttempt||0)<60000)throw new BrokerError('sync_cooldown',429);
    const p=providers[row.provider];if(!p)throw new BrokerError('provider_not_configured',503);
    // Persist a lease before provider I/O. Any disconnect or replacement increments
    // this same revision; stale writers cannot recreate removed data.
    row.value.lastAttempt=now();row.value.status='syncing';await persist(user,row);
    try {
      const token=await p.refresh(row.value.tokens.refresh_token);
      if(!token.access_token)throw new BrokerError('reconnect_required');
      row.value.tokens={...row.value.tokens,...token};
      const snapshots={};
      for(const id of row.value.selected||[])snapshots[id]=await p.events(token.access_token,id,row.value.snapshots?.[id],new Date(now()));
      row.value.snapshots=snapshots;row.value.lastSync=new Date(now()).toISOString();row.value.status='ready';row.value.error=null;
      await persist(user,row);return visible(row);
    } catch(error) {
      row.value.status=error.code==='reconnect_required'?'reconnect_required':'stale';
      row.value.error=['reconnect_required','rate_limited','provider_limit','missing_permission'].includes(error.code)?error.code:'sync_failed';
      await persist(user,row);throw new BrokerError(row.value.error,502);
    }
  }
  return {
    async handle(user,input) {
      if(!uuid(user)||!input||typeof input!=='object')throw new BrokerError('invalid_request');
      if(input.action==='status') {
        const rows=await store.list(user);
        const connections=rows.filter(r=>r.value.status!=='disconnected').map(visible);
        const events=[],tasks=[],goals=[];
        for(const row of rows)if(row.provider==='google'&&['ready','stale','syncing'].includes(row.value.status)) {
          for(const snapshot of Object.values(row.value.snapshots||{}))for(const event of snapshot.items||[])events.push({...event,connection:row.id,lastSync:row.value.lastSync,stale:row.value.status!=='ready'||now()-Date.parse(row.value.lastSync)>15*60000});
        }
        for(const row of rows)if(row.value.status!=='disconnected') {
          if(row.provider==='github')for(const snapshot of Object.values(row.value.snapshots||{}))for(const task of snapshot.items||[])tasks.push({...task,id:'github:'+task.id,connection:row.id,lastSync:row.value.lastSync});
          if(row.provider==='obsidian') {
            const data=row.value.records;
            for(const task of data?.tasks||[])tasks.push({id:'obsidian:'+task.id,title:task.title,completed:task.completed,goal_id:task.goal?'obsidian:'+task.goal:null,estimate_minutes:task.estimate,due_date:task.due,next_action:task.next,status:task.completed?'Done':'Not Started',source:'obsidian',sourceUrl:'obsidian://open?'+new URLSearchParams({vault:data.vault,file:task.path}),lastSync:row.value.lastSync});
            for(const goal of data?.goals||[])goals.push({id:'obsidian:'+goal.id,g:goal.title,p:goal.priority,freq:'Ongoing'});
          }
        }
        return {connections:connections.filter(r=>r.provider!=='brief'),events,tasks,goals,configured:Object.keys(providers),obsidian:rows.find(r=>r.id===OBSIDIAN_ID&&r.value.status!=='disconnected')?.value.records||null,obsidianRevision:rows.find(r=>r.id===OBSIDIAN_ID)?.revision||0,memory:rows.find(r=>r.id===BRIEF_ID)?.value.memory||'',memoryRevision:rows.find(r=>r.id===BRIEF_ID)?.revision||0};
      }
      if(input.action==='importObsidian') {
        const records=globalThis.ObsidianService.validate(input.records);
        const existing=await store.load(user,OBSIDIAN_ID);
        if(input.revision!==(existing?.revision||0))throw new BrokerError('connection_changed',409);
        const row={id:OBSIDIAN_ID,provider:'obsidian',revision:input.revision,value:{status:'ready',records,lastSync:new Date(now()).toISOString(),selected:[]}};
        await persist(user,row);return visible(row);
      }
      if(input.action==='memory'||input.action==='narrate') {
        const row=await store.load(user,BRIEF_ID)||{id:BRIEF_ID,provider:'brief',revision:0,value:{status:'ready',memory:''}};
        if(input.action==='memory') {
          if(typeof input.memory!=='string'||input.memory.length>1000||input.revision!==row.revision)throw new BrokerError('invalid_memory_or_revision',409);
          row.value.memory=input.memory;await persist(user,row);return {saved:true};
        }
        if(!narrate)throw new BrokerError('narrator_unavailable',503);
        if(now()-(row.value.lastRequest||0)<10000)throw new BrokerError('brief_cooldown',429);
        row.value.lastRequest=now();await persist(user,row);
        return narrate(input.summary,row.value.memory);
      }
      if(input.action==='start') {
        const provider=input.provider,p=providers[provider];if(!p)throw new BrokerError('provider_not_configured',503);
        if((await store.list(user)).length>=10)throw new BrokerError('connection_limit');
        const state=random(),verifier=random(),id=crypto.randomUUID();
        await persist(user,{id,provider,revision:0,value:{status:'pending',stateHash:await digest(state),verifier,expires:now()+10*60000,selected:[]}});
        return {id,url:p.authorize(id+'.'+state,await digest(verifier))};
      }
      if(input.action==='complete') {
        const [id,state]=String(input.state||'').split('.');const row=await load(user,id);
        if(row.value.status!=='pending'||row.value.expires<now()||row.value.stateHash!==await digest(state||'')||typeof input.code!=='string'||input.code.length>4096)throw new BrokerError('invalid_oauth_state');
        const verifier=row.value.verifier;row.value={status:'connecting',selected:[]};await persist(user,row);
        try {
          const tokens=await providers[row.provider].exchange(input.code,verifier);
          row.value={status:'ready',tokens,selected:[],snapshots:{}};await persist(user,row);
          return visible(row);
        } catch(error) {row.value={status:'reconnect_required',error:'authorization_failed',selected:[]};await persist(user,row);throw new BrokerError('authorization_failed',502);}
      }
      const row=await load(user,input.id),p=providers[row.provider];
      if(input.action==='disconnect') {
        const token=row.value.tokens?.refresh_token;
        row.value={status:'disconnected',selected:[]};await persist(user,row);
        let revoked=true;
        if(token&&p)try{await p.revoke(token);}catch(_){revoked=false;}
        if(store.remove)await store.remove(user,row.id,row.revision);
        return {disconnected:true,revoked};
      }
      // An interrupted function leaves a lease; recovery is bounded and explicit.
      if(row.value.status==='syncing'&&now()-(row.value.lastAttempt||now())>5*60000){row.value.status='stale';await persist(user,row);}
      active(row);
      if(input.action==='catalog'||input.action==='select') {
        // GitHub rotates refresh tokens. Serialize refreshes and save the new
        // token before catalog requests so a failed catalog cannot lose it.
        row.value.status='syncing';row.value.lastAttempt=now();await persist(user,row);
        let token,calendars;
        try {
          token=await p.refresh(row.value.tokens.refresh_token);
          row.value.tokens={...row.value.tokens,...token};row.value.status='ready';await persist(user,row);
          calendars=await p.calendars(token.access_token);
        }catch(error){row.value.status='stale';row.value.error='catalog_failed';await persist(user,row);throw new BrokerError('catalog_failed',502);}
        if(input.action==='catalog')return {calendars};
        if(!Array.isArray(input.selected)||input.selected.length>10||new Set(input.selected).size!==input.selected.length||input.selected.some(id=>!calendars.some(c=>c.id===id)))throw new BrokerError('invalid_selection');
        row.value.selected=input.selected;
        row.value.label=calendars.filter(c=>input.selected.includes(c.id)).map(c=>c.title).join(', ').slice(0,300)||row.provider;
        row.value.snapshots={};row.value.lastSync=null;row.value.lastAttempt=0;
        await persist(user,row);return sync(user,row);
      }
      if(input.action==='sync')return sync(user,row);
      throw new BrokerError('unknown_action');
    },
  };
}
