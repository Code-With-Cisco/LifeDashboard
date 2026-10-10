export const SCOPES = ['https://www.googleapis.com/auth/calendar.events.readonly', 'https://www.googleapis.com/auth/calendar.calendarlist.readonly'];
export class ProviderError extends Error { constructor(code) { super(code); this.code=code; } }
export async function request(url, options={}, fetcher=fetch) {
  // Callers construct URLs from fixed provider origins; never fetch imported URLs.
  const response=await fetcher(url,{...options,redirect:'error',signal:AbortSignal.timeout(15000)});
  const text=await response.text();
  if(text.length>4_000_000)throw new ProviderError('provider_limit');
  let data;try{data=JSON.parse(text);}catch(_){throw new ProviderError('provider_unavailable');}
  if (!response.ok) throw new ProviderError(response.status===410?'cursor_expired':response.status===401||data.error==='invalid_grant'?'reconnect_required':response.status===429?'rate_limited':'provider_unavailable');
  if(data.error)throw new ProviderError('reconnect_required');
  return data;
}
export function google(config, fetcher=fetch) {
  const token = body => request('https://oauth2.googleapis.com/token', {method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({...body,client_id:config.clientId,client_secret:config.clientSecret})},fetcher);
  const get = (path, access) => request('https://www.googleapis.com/calendar/v3/'+path,{headers:{Authorization:'Bearer '+access}},fetcher);
  return {
    authorize(state, challenge) {
      return 'https://accounts.google.com/o/oauth2/v2/auth?'+new URLSearchParams({client_id:config.clientId,redirect_uri:config.redirectUri,response_type:'code',scope:SCOPES.join(' '),access_type:'offline',prompt:'consent select_account',state,code_challenge:challenge,code_challenge_method:'S256'});
    },
    async exchange(code, verifier) {
      const result=await token({code,code_verifier:verifier,redirect_uri:config.redirectUri,grant_type:'authorization_code'});
      if(!result.refresh_token||!result.access_token||!SCOPES.every(s=>(result.scope||'').split(' ').includes(s)))throw new ProviderError('missing_permission');
      return result;
    },
    async refresh(refreshToken) { return token({refresh_token:refreshToken,grant_type:'refresh_token'}); },
    async calendars(access) {
      const items=[]; let page='';
      for(let n=0;n<10;n++) {
        const data=await get('users/me/calendarList?'+new URLSearchParams({maxResults:'250',...(page?{pageToken:page}:{})}),access);
        if(!Array.isArray(data.items))throw new ProviderError('invalid_provider_response');
        items.push(...data.items.filter(c=>!c.deleted).map(c=>({id:c.id,title:String(c.summary||'Calendar').slice(0,200)})));
        if(!data.nextPageToken)return items;
        page=data.nextPageToken;
      }
      throw new ProviderError('provider_limit');
    },
    async events(access, calendar, previous, now=new Date()) {
      // Fixed daily horizon: incremental updates share an identical query until
      // the next UTC date, when a fresh snapshot rolls the horizon forward.
      const day=now.toISOString().slice(0,10), since=day===previous?.day?previous:null;
      const base={singleEvents:'true',maxResults:'250',showDeleted:'true'};
      if(since?.cursor)base.syncToken=since.cursor;
      else {base.timeMin=new Date(Date.parse(day)-86400000).toISOString();base.timeMax=new Date(Date.parse(day)+32*86400000).toISOString();}
      const records=new Map((since?.items||[]).map(e=>[e.id,e]));let page='';
      for(let n=0;n<40;n++) {
        let data;
        try {data=await get('calendars/'+encodeURIComponent(calendar)+'/events?'+new URLSearchParams({...base,...(page?{pageToken:page}:{})}),access);}
        catch(error) {if(error.code==='cursor_expired'&&since)return this.events(access,calendar,null,now);throw error;}
        if(!Array.isArray(data.items))throw new ProviderError('invalid_provider_response');
        for(const e of data.items) {
          if(typeof e.id!=='string')throw new ProviderError('invalid_provider_response');
          if(e.status==='cancelled'||e.transparency==='transparent'||e.attendees?.some(a=>a.self&&a.responseStatus==='declined')){records.delete(e.id);continue;}
          if(!e.start||!e.end)throw new ProviderError('invalid_provider_response');
          records.set(e.id,{id:e.id,calendar,uid:typeof e.iCalUID==='string'?e.iCalUID.slice(0,512):null,occurrence:e.originalStartTime?.dateTime||e.originalStartTime?.date||e.start.dateTime||e.start.date,title:String(e.summary||'Busy').slice(0,300),start:e.start,end:e.end,updated:e.updated||null,link:typeof e.htmlLink==='string'&&e.htmlLink.startsWith('https://www.google.com/calendar/')?e.htmlLink:null});
        }
        if(records.size>5000)throw new ProviderError('provider_limit');
        if(!data.nextPageToken) {
          if(!data.nextSyncToken)throw new ProviderError('invalid_provider_response');
          return {day,cursor:data.nextSyncToken,items:[...records.values()]};
        }
        page=data.nextPageToken;
      }
      throw new ProviderError('provider_limit');
    },
    async revoke(refreshToken) {
      const r=await fetcher('https://oauth2.googleapis.com/revoke',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({token:refreshToken}),redirect:'error',signal:AbortSignal.timeout(15000)});
      if(!r.ok&&r.status!==400)throw new ProviderError('revocation_pending');
    },
  };
}
