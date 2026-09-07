/* Account-scoped document storage and previewed migration/recovery UI. */
(function(root) {
  'use strict';
  const S = root.PersonalDataService;
  let owner=null,client=null,epoch=0,ready=false,busy=false,rows=new Map(),plan=[],mode='';
  const copy=value=>JSON.parse(JSON.stringify(value));
  const labels={goals:'Goals',habit_definitions:'Habit definitions',ingredients_protein:'Custom proteins',ingredients_side:'Custom sides'};
  const label=key=>labels[key]||'Purchase decisions — '+key.slice('purchase_decisions:'.length);
  function reset(){epoch++;owner=null;client=null;ready=false;busy=false;rows=new Map();plan=[];mode='';}
  const legacy=()=>owner?S.findLegacy(owner,State.keys(),key=>State.get(key)):[];
  function status(){
    const pending=legacy().filter(e=>!rows.has(e.key));
    const text=!ready?'Personal records could not load. Retry before saving.':
      pending.length?`${pending.length} record groups exist only on this device. Preview them in Data & backups.`:'Personal records are saved to your account.';
    for(const id of ['personal-data-status','home-personal-data-status']){
      const el=document.getElementById(id);if(el)el.textContent=text;
    }
  }
  async function initialize(sb,userId){
    reset();client=sb;owner=userId;const current=epoch;
    try{
      const{data,error}=await sb.from('user_documents').select('*').eq('user_id',userId).order('document_key').limit(501);
      if(error)throw error;
      if(current!==epoch)return false;
      if(!Array.isArray(data)||data.length>500)throw new Error('Record limit exceeded.');
      const validated=data.map(row=>{
        if(row.user_id!==userId||!Number.isSafeInteger(row.revision)||row.revision<1)throw new Error('Invalid record.');
        return [row.document_key,{...row,payload:S.validate(row.document_key,row.payload)}];
      });
      rows=new Map(validated);ready=true;return true;
    }catch(_){if(current===epoch)Logger.error('personal-data','load.failed');return false;}
    finally{if(current===epoch)status();}
  }
  function read(key,fallback){
    if(!owner)return copy(fallback);
    const record=rows.get(key);
    if(record)return copy(record.payload);
    const local=legacy().find(entry=>entry.key===key);
    return copy(local&&!local.error?local.payload:fallback);
  }
  async function persist(changes){
    if(!ready||!owner)throw new Error('Personal records are unavailable. Retry loading them first.');
    if(busy)throw new Error('A save is already running.');
    busy=true;const current=epoch,userId=owner;
    try{
      const{data,error}=await client.rpc('save_personal_documents',{p_documents:changes.map(({key,payload,expected_revision})=>
        ({key,payload:S.validate(key,payload),expected_revision}))});
      if(current!==epoch)throw new Error('Your session changed. Sign in and check whether the save completed.');
      if(error)throw new Error(error.code==='40001'?'These records changed elsewhere. Reload, then review your changes again.':'Save failed. Your draft and original records have been kept.');
      if(!Array.isArray(data)||data.length!==changes.length)throw new Error('Save could not be confirmed. Reload before retrying.');
      const next=new Map(rows);
      const returned=new Set();
      for(const row of data){
        const change=changes.find(c=>c.key===row.document_key);
        if(row.user_id!==userId||!change||returned.has(row.document_key)||
          !Number.isSafeInteger(row.revision)||row.revision!==change.expected_revision+1)throw new Error('Save could not be verified.');
        returned.add(row.document_key);
        next.set(row.document_key,{...row,payload:S.validate(row.document_key,row.payload)});
      }
      rows=next;status();return true;
    }finally{if(current===epoch)busy=false;}
  }
  async function save(key,payload){
    const row=rows.get(key);
    if(!row&&legacy().some(entry=>entry.key===key))throw new Error('Preview and migrate your existing device records in Data & backups before editing.');
    return persist([{key,payload,expected_revision:row?.revision||0}]);
  }
  function message(value){const el=document.getElementById('data-message');if(el)el.textContent=value;}
  function open(){
    if(!owner)return;plan=[];mode='';
    document.getElementById('data-preview').replaceChildren();
    document.getElementById('data-apply').hidden=true;
    document.getElementById('data-passphrase').value='';
    document.getElementById('data-file').value='';
    message(ready?'Choose a migration preview or an encrypted backup.':'Records could not load. Use Reload records to retry.');
    openModal('data-modal');
  }
  function showPreview(entries,title){
    if(!ready)throw new Error('Reload personal records before making a preview.');
    plan=S.preview(entries,[...rows.values()]);mode=title;
    const el=document.getElementById('data-preview');el.replaceChildren();
    plan.forEach((entry,index)=>{
      const section=document.createElement('section');section.className='data-record';
      const choice=document.createElement('label');const checkbox=document.createElement('input');checkbox.type='checkbox';
      checkbox.dataset.documentIndex=String(index);checkbox.checked=entry.action==='add';checkbox.disabled=entry.action==='unchanged';
      choice.append(checkbox,document.createTextNode(` ${label(entry.key)} — ${entry.action}`));section.append(choice);
      const details=document.createElement('details');const summary=document.createElement('summary');summary.textContent='Review account and incoming values';
      const pre=document.createElement('pre');pre.textContent=JSON.stringify({account:entry.before,incoming:entry.payload},null,2);
      details.append(summary,pre);section.append(details);el.append(section);
    });
    document.getElementById('data-apply').hidden=!plan.some(p=>p.action!=='unchanged');
    message(`${title}: ${plan.length} record groups. Replacements are unchecked. Review values before applying. Original device records remain on this device.`);
  }
  function previewMigration(){try{
    const entries=legacy();const invalid=entries.filter(e=>e.error);
    showPreview(entries.filter(e=>!e.error),'Device migration');
    if(invalid.length)message(`${invalid.length} unsupported record groups were excluded and kept on this device. Review the remaining groups below.`);
  }catch(e){message(e.message);}}
  async function apply(){
    const changes=[...document.querySelectorAll('#data-preview input:checked')].map(el=>plan[Number(el.dataset.documentIndex)]).filter(Boolean);
    if(!changes.length){message('Choose at least one changed record group.');return;}
    const button=document.getElementById('data-apply');button.disabled=true;
    const current=epoch;
    try{
      await persist(changes);if(current!==epoch)return;
      plan=[];document.getElementById('data-preview').replaceChildren();button.hidden=true;
      message(`${mode} saved to your account. Original device records were preserved.`);
      refreshViews();
    }catch(e){if(current===epoch)message(e.message);}
    finally{if(current===epoch)button.disabled=false;}
  }
  function refreshViews(){
    if(typeof renderGoals==='function')renderGoals();
    if(typeof renderWit==='function')renderWit();
    if(typeof renderHabits==='function')renderHabits();
    if(typeof renderHome==='function')renderHome();
  }
  async function exportBackup(){
    const current=epoch;let password=document.getElementById('data-passphrase').value;
    document.getElementById('data-passphrase').value='';
    try{
      if(!ready)throw new Error('Reload personal records before exporting.');
      const entries=[...rows.values()].map(row=>({key:row.document_key,payload:row.payload}));
      const pending=legacy().filter(e=>!rows.has(e.key));
      if(pending.some(e=>e.error))throw new Error('Some local records could not be read. They remain on this device; resolve them before exporting.');
      entries.push(...pending);
      const value=S.backup(owner,publicProject(),entries);
      const encrypted=await BackupService.encrypt(value,password);password='';
      if(current!==epoch)return;
      const url=URL.createObjectURL(new Blob([encrypted],{type:'application/json'}));
      const link=document.createElement('a');link.href=url;link.download='lifedashboard-personal-records-'+new Date().toISOString().slice(0,10)+'.encrypted.json';
      document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
      message('Encrypted personal-record backup downloaded. Keep its passphrase separately. This file excludes calendar, finance, workout history, recipes, and account credentials; those require the full database backup.');
    }catch(e){if(current===epoch)message(e.message);}finally{password='';}
  }
  const publicProject=()=>SecurityService.validatePublicConfig(typeof CONFIG!=='undefined'?CONFIG:window.CONFIG).supabaseUrl;
  async function previewRestore(){
    const current=epoch;const file=document.getElementById('data-file').files[0];
    let password=document.getElementById('data-passphrase').value;document.getElementById('data-passphrase').value='';
    try{
      if(!file)throw new Error('Choose an encrypted backup file.');
      if(file.size>S.MAX_BYTES*1.4+4096)throw new Error('Backup is too large.');
      const value=await BackupService.decrypt(await file.text(),password);password='';
      if(current!==epoch)return;
      showPreview(S.readBackup(value,owner,publicProject()),'Backup restore');
    }catch(e){if(current===epoch)message(e.message);}finally{password='';}
  }
  async function reload(){
    const sb=client,userId=owner;if(!sb||!userId)return;
    plan=[];document.getElementById('data-preview').replaceChildren();document.getElementById('data-apply').hidden=true;
    const success=await initialize(sb,userId);
    if(owner===userId){message(success?'Records reloaded. Create a new preview before applying changes.':'Records could not load. Original records were kept.');if(success)refreshViews();}
  }
  root.PersonalData=Object.freeze({initialize,reset,read,save,open,previewMigration,apply,exportBackup,previewRestore,reload,status});
})(window);
