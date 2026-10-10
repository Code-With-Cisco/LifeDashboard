import {request,ProviderError} from './google.mjs';
export function github(config,fetcher=fetch) {
  const token=body=>request('https://github.com/login/oauth/access_token',{method:'POST',headers:{Accept:'application/json','Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({...body,client_id:config.clientId,client_secret:config.clientSecret})},fetcher);
  const get=(path,access)=>request('https://api.github.com/'+path,{headers:{Authorization:'Bearer '+access,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'}},fetcher);
  async function pages(path,access,key) {
    const out=[];
    for(let page=1;page<=10;page++) {
      const data=await get(path+(path.includes('?')?'&':'?')+'per_page=100&page='+page,access),items=key?data[key]:data;
      if(!Array.isArray(items))throw new ProviderError('invalid_provider_response');
      out.push(...items);if(items.length<100)return out;
    }
    throw new ProviderError('provider_limit');
  }
  return {
    authorize(state,challenge) {return 'https://github.com/login/oauth/authorize?'+new URLSearchParams({client_id:config.clientId,redirect_uri:config.redirectUri,state,code_challenge:challenge,code_challenge_method:'S256'});},
    async exchange(code,verifier) {const data=await token({code,code_verifier:verifier,redirect_uri:config.redirectUri});if(!data.refresh_token||!data.access_token)throw new ProviderError('expiring_app_tokens_required');return data;},
    refresh(refreshToken){return token({grant_type:'refresh_token',refresh_token:refreshToken});},
    async calendars(access) {
      const installs=await pages('user/installations',access,'installations'),out=[];
      for(const install of installs.filter(i=>String(i.app_id)===String(config.appId))) {
        const permissions=install.permissions||{};
        if(Object.values(permissions).some(p=>p==='write'||p==='admin')||!['issues','pull_requests','actions'].every(k=>permissions[k]==='read'))throw new ProviderError('read_only_app_required');
        for(const repo of await pages('user/installations/'+Number(install.id)+'/repositories',access,'repositories'))out.push({id:repo.full_name,title:repo.full_name});
      }
      return [...new Map(out.map(r=>[r.id,r])).values()];
    },
    async events(access,repository,_previous,now=new Date()) {
      if(!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository))throw new ProviderError('invalid_repository');
      const allowed=await this.calendars(access);if(!allowed.some(r=>r.id===repository))throw new ProviderError('reconnect_required');
      const path='repos/'+repository,items=[],me=await get('user',access);
      const [issues,pulls,runs]=await Promise.all([pages(path+'/issues?state=open',access),pages(path+'/pulls?state=open',access),pages(path+'/actions/runs?status=failure&created='+encodeURIComponent('>='+new Date(now.getTime()-7*86400000).toISOString()),access,'workflow_runs')]);
      const item=(row,kind,next,important=false)=>({id:repository+':'+kind+':'+row.id,title:String(row.title||row.name||'GitHub item').slice(0,300),status:important?'Important':'Not Started',next_action:next,sourceUrl:'https://github.com/'+repository+(kind==='run'?'/actions/runs/'+row.id:kind==='pull'?'/pull/'+row.number:'/issues/'+row.number),source:'github',updated:row.updated_at||null});
      for(const issue of issues.filter(i=>!i.pull_request))items.push(item(issue,'issue','Review the issue'));
      for(const pull of pulls)items.push(item(pull,'pull',pull.requested_reviewers?.some(r=>r.login===me.login)?'Your review is requested':'Review the pull request',pull.requested_reviewers?.some(r=>r.login===me.login)));
      // One failure per workflow/branch; a later successful rerun removes it.
      const seen=new Set();
      for(const run of runs){const key=run.workflow_id+':'+run.head_branch;if(seen.has(key))continue;seen.add(key);const latest=await get(path+'/actions/workflows/'+Number(run.workflow_id)+'/runs?'+new URLSearchParams({branch:run.head_branch||'',per_page:'1'}),access);if(latest.workflow_runs?.[0]?.id===run.id&&latest.workflow_runs[0].conclusion==='failure')items.push(item(run,'run','Investigate the failed workflow',true));if(seen.size>=30)throw new ProviderError('provider_limit');}
      return {items,day:now.toISOString().slice(0,10)};
    },
    async revoke(refreshToken) {
      // GitHub's token deletion endpoint expects an access token.
      const data=await this.refresh(refreshToken);
      const r=await fetcher('https://api.github.com/applications/'+encodeURIComponent(config.clientId)+'/token',{method:'DELETE',headers:{Authorization:'Basic '+btoa(config.clientId+':'+config.clientSecret),Accept:'application/vnd.github+json','Content-Type':'application/json'},body:JSON.stringify({access_token:data.access_token}),redirect:'error',signal:AbortSignal.timeout(15000)});
      if(!r.ok&&r.status!==404)throw new ProviderError('revocation_pending');
    },
  };
}
