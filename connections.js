(function(root){
  'use strict';
  // Capture OAuth response in memory and remove it from the address before any
  // third-party resource can use it as a referrer. No tokens are in this URL.
  const query=new URLSearchParams(root.location.search);
  let callback=query.has('state')?{state:query.get('state'),code:query.get('code'),error:query.get('error')}:null;
  if(callback){for(const key of ['state','code','scope','authuser','prompt','error','error_description'])query.delete(key);root.history.replaceState(null,'',root.location.pathname+(query.size?'?'+query:'')+root.location.hash);}
  const escape=value=>root.SecurityService.escapeHtml(value);
  function create(sb,hooks) {
    let epoch=0,briefVersion=0,snapshot=null,draft=null,catalog=null,facts=[],answer=null,recognition=null,voiceTimer=null,pending=null;
    const enabled=()=>hooks.enabled(),current=(e,user)=>e===epoch&&hooks.profile()?.id===user;
    const message=error=>({connection_changed:'This connection changed. Refresh and review your selection again.',sync_cooldown:'Please wait one minute between syncs.',brief_cooldown:'Please wait a few seconds before asking again.',provider_not_configured:'This provider still needs server setup.',account_verification_required:'Complete your account security checks before connecting.',reconnect_required:'Reconnect this account to restore access.'}[error?.message]||'The connection service is unavailable. Your saved data has not been replaced.');
    async function call(body) {
      if(!enabled())throw new Error('provider_not_configured');
      const e=epoch,user=hooks.profile()?.id;if(!user)throw new Error('sign_in_required');
      const result=await sb.functions.invoke('dashboard-connectors',{body});
      if(!current(e,user))throw new Error('session_changed');
      if(result.error||result.data?.error){let code=result.data?.error;try{if(!code)code=(await result.error.context.json()).error;}catch(_){}throw new Error(code||'connection_unavailable');}
      return result.data;
    }
    async function refresh() {
      if(!enabled())return {events:[],tasks:[],goals:[],unavailableSources:[]};
      if(pending)return pending;
      const work=(async()=>{
        try {
          if(callback){const data=callback;callback=null;if(data.error)hooks.toast('Connection was not authorized.');else await call({action:'complete',state:data.state,code:data.code});}
          snapshot=await call({action:'status'});
          return root.ConnectorService.merge(snapshot,hooks.profile()?.timezone||'UTC');
        }catch(error){if(error.message==='session_changed')return {events:[],tasks:[],goals:[],unavailableSources:[]};return {events:[],tasks:[],goals:[],unavailableSources:['Calendar','Connected tasks']};}
      })();pending=work;try{return await work;}finally{if(pending===work)pending=null;}
    }
    function render() {
      const el=document.getElementById('connections-content');if(!el)return;
      if(!enabled()){el.innerHTML='<p class="profile-note">Connections are being prepared. Your existing dashboard remains available.</p>';return;}
      if(!snapshot){el.innerHTML='<p class="profile-note">Connection status is unavailable. Try refreshing.</p>';return;}
      const row=c=>`<article class="connection-card"><strong>${escape(c.provider==='google'?'Google Calendar':c.provider==='github'?'GitHub':'Obsidian')}</strong><p>${escape(c.status.replace(/_/g,' '))} · ${c.lastSync?'Last sync '+escape(new Date(c.lastSync).toLocaleString()):'Not synced yet'}</p><p class="profile-note">${c.selected.length} selected sources</p>${['google','github'].includes(c.provider)?`<button class="btn btn-o" data-action="catalog" data-id="${escape(c.id)}">Choose ${c.provider==='google'?'calendars':'repositories'}</button> <button class="btn btn-o" data-action="sync" data-id="${escape(c.id)}">Sync now</button> `:''}<button class="btn btn-o" data-action="disconnect" data-id="${escape(c.id)}">Disconnect</button></article>`;
      el.innerHTML=`<p class="profile-note">Google Calendar and GitHub are read-only. Choose the sources you want in your brief. Sync runs when you request it; last-success times show freshness.</p><div class="connection-actions"><button class="btn btn-r" data-action="start" data-provider="google" ${snapshot.configured.includes('google')?'':'disabled'}>Connect Google Calendar</button><button class="btn btn-o" data-action="start" data-provider="github" ${snapshot.configured.includes('github')?'':'disabled'}>Connect GitHub</button></div>${snapshot.connections.map(row).join('')}<div id="connection-selection"></div><hr><h3>Obsidian selection</h3><p class="profile-note">Only records marked with dashboard metadata are imported. Choose all Markdown files in the selection you want to replace. Your vault remains authoritative; review removals before saving.</p><label>Vault name<input id="obsidian-vault" maxlength="100" value="${escape(snapshot.obsidian?.vault||'')}"></label><label>Selected Markdown files<input id="obsidian-files" type="file" accept=".md" multiple></label><button class="btn btn-o" data-action="preview">Preview import</button><div id="obsidian-preview" aria-live="polite"></div>`;
      el.onclick=event=>{const b=event.target.closest('button[data-action]');if(b)act(b.dataset.action,b.dataset,b);};
    }
    async function act(action,data={},button) {
      const e=epoch,user=hooks.profile()?.id;if(button)button.disabled=true;
      try {
        if(action==='start'){const result=await call({action,provider:data.provider});const u=new URL(result.url);if(u.protocol!=='https:'||!['accounts.google.com','github.com'].includes(u.hostname))throw new Error('invalid_redirect');root.location.assign(u.href);return;}
        if(action==='catalog') {
          const result=await call({action,id:data.id});catalog={id:data.id,items:result.calendars};
          const selected=snapshot.connections.find(c=>c.id===data.id)?.selected||[];
          document.getElementById('connection-selection').innerHTML=`<h3>Choose sources</h3>${catalog.items.map((c,i)=>`<label class="connection-option"><input type="checkbox" data-source="${i}" ${selected.includes(c.id)?'checked':''}>${escape(c.title)}</label>`).join('')||'<p>No sources available. For GitHub, install the read-only app on selected repositories first.</p>'}<button class="btn btn-r" data-action="select">Save selection and sync</button>`;return;
        }
        if(action==='select'){const selected=[...document.querySelectorAll('[data-source]:checked')].map(el=>catalog.items[Number(el.dataset.source)].id);await call({action,id:catalog.id,selected});catalog=null;}
        if(action==='sync')await call({action,id:data.id});
        if(action==='disconnect') {
          if(!await hooks.confirm('Disconnect this source and remove its imported Dashboard copy? The original records stay with the provider.'))return;
          if(!current(e,user))return;const result=await call({action,id:data.id});
          if(!result.revoked)hooks.toast('Disconnected locally. Also remove access in the provider’s app settings.');
        }
        if(action==='preview') {
          const files=[...document.getElementById('obsidian-files').files];if(!files.length)throw new Error('Choose Markdown files first.');
          if(files.length>100||files.reduce((n,f)=>n+f.size,0)>1_000_000)throw new Error('Choose at most 100 files totaling 1 MB.');
          const records=root.ObsidianService.parse(await Promise.all(files.map(async f=>({path:f.webkitRelativePath||f.name,text:await f.text()}))),document.getElementById('obsidian-vault').value);
          if(!current(e,user))return;draft={records,revision:snapshot.obsidianRevision};const change=root.ObsidianService.changes(snapshot.obsidian,records);
          document.getElementById('obsidian-preview').innerHTML=`<p>${change.added} added · ${change.changed} changed · ${change.removed} removed from Dashboard</p><ul>${[...records.goals,...records.tasks].slice(0,100).map(r=>`<li>${escape(r.title)} — ${escape(r.path)}</li>`).join('')}</ul><button class="btn btn-r" data-action="import">Save reviewed selection</button>`;return;
        }
        if(action==='import'){if(!draft)return;await call({action:'importObsidian',...draft});draft=null;}
        await refresh();if(!current(e,user))return;render();hooks.refresh();
      }catch(error){if(current(e,user))hooks.toast(['preview'].includes(action)?error.message:message(error));}
      finally{if(button&&current(e,user))button.disabled=false;}
    }
    async function open(){hooks.open('connections-modal');await refresh();if(hooks.profile())render();}
    function setBrief(brief){briefVersion++;facts=root.ConnectorService.facts(brief);answer=null;root.speechSynthesis?.cancel();const context=document.getElementById('brief-context'),output=document.getElementById('brief-answer');if(context)context.textContent=facts.map(f=>f.text).join('\n');if(output)output.textContent='Your brief has refreshed. Ask about the current facts.';}
    function briefOpen(){hooks.open('conversation-modal');document.getElementById('brief-memory').value=snapshot?.memory||'';document.getElementById('brief-context').textContent=facts.map(f=>f.text).join('\n');document.getElementById('brief-answer').textContent='Ask about the displayed brief. Only these facts and your brief preferences are sent to the narration service.';}
    async function ask() {
      const e=epoch,version=briefVersion,user=hooks.profile()?.id,currentFacts=facts.map(f=>({...f}));
      const el=document.getElementById('brief-answer');el.textContent='Reading your brief…';
      try {
        const result=await call({action:'narrate',summary:{question:document.getElementById('brief-question').value,facts:currentFacts.map(({id,text})=>({id,text}))}});
        if(!current(e,user)||version!==briefVersion)return;answer=result.text+' '+result.facts.map(f=>f.text).join(' ');
        el.innerHTML=`<p>${escape(result.text)}</p>${result.facts.map(f=>{const source=currentFacts.find(x=>x.id===f.id);return `<p>${escape(f.text)}${source?.url?` <a href="${escape(source.url)}" target="_blank" rel="noopener noreferrer">Open source</a>`:''}</p>`;}).join('')}<p class="profile-note">${result.mode==='assisted'?'Answer selected from your saved brief.':'Using the deterministic brief; AI narration is unavailable.'}</p>`;
      }catch(error){if(current(e,user)&&version===briefVersion)el.textContent=message(error);}
    }
    async function memory(){try{await call({action:'memory',memory:document.getElementById('brief-memory').value,revision:snapshot?.memoryRevision||0});await refresh();hooks.toast('Brief preferences saved.');}catch(error){hooks.toast(message(error));}}
    function stopVoice(){clearTimeout(voiceTimer);recognition?.stop();}
    function voice() {
      const Speech=root.SpeechRecognition||root.webkitSpeechRecognition;if(!Speech){hooks.toast('Speech input is unavailable in this browser. Type your question instead.');return;}
      recognition?.abort();const e=epoch;recognition=new Speech();recognition.lang='en-US';recognition.continuous=false;recognition.interimResults=false;
      recognition.onresult=event=>{if(e===epoch)document.getElementById('brief-question').value=event.results[0][0].transcript.slice(0,500);};
      recognition.onerror=()=>{if(e===epoch)hooks.toast('Speech input stopped. You can type your question.');};
      recognition.start();voiceTimer=setTimeout(stopVoice,30000);
    }
    function speak(){if(!answer)return;root.speechSynthesis?.cancel();root.speechSynthesis?.speak(new SpeechSynthesisUtterance(answer));}
    function reset(){epoch++;snapshot=null;draft=null;catalog=null;facts=[];answer=null;pending=null;recognition?.abort();recognition=null;clearTimeout(voiceTimer);root.speechSynthesis?.cancel();}
    return {refresh,open,setBrief,briefOpen,ask,memory,voice,stopVoice,speak,reset};
  }
  root.ConnectionsUI={create};
})(window);
