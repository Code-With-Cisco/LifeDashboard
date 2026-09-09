/* Account-security UI; async results are discarded after close or account change. */
(function(root){
  'use strict';
  function create(client,actions){
    const service=root.MfaService.create(client);
    let epoch=0,pending=null,busy=false;
    const el=id=>document.getElementById(id);
    const message=(id,text)=>{el(id).textContent=text;};
    const wipe=()=>{
      pending=null;
      el('mfa-qr').removeAttribute('src');el('mfa-secret').textContent='';
      el('mfa-setup-code').value='';el('mfa-code').value='';
      el('mfa-setup').hidden=true;
    };
    const setBusy=value=>{
      busy=value;
      document.querySelectorAll('[data-mfa-action]').forEach(button=>{button.disabled=value;});
    };
    const session=async()=>{
      const result=await client.auth.getSession();
      if(result.error||!result.data?.session)throw new Error('Please sign in again.');
      return result.data.session;
    };
    const errorText=error=>error instanceof Error?error.message:'Account security is unavailable. Please retry.';
    async function work(target,operation){
      if(busy)return;
      const ticket=epoch;setBusy(true);message(target,'');
      try{await operation(()=>ticket===epoch);}
      catch(error){if(ticket===epoch)message(target,errorText(error));}
      finally{if(ticket===epoch)setBusy(false);}
    }
    async function refresh(valid){
      const state=await service.status(await session());
      if(!valid())return;
      const list=el('mfa-factors');list.replaceChildren();
      message('mfa-status',state.all.some(f=>f.status==='verified')?'Two-step verification is enabled.':'Two-step verification is not enabled yet.');
      for(const factor of state.all){
        const row=document.createElement('div');row.className='mfa-factor';
        const label=document.createElement('span');label.textContent=(factor.friendly_name||'Authenticator')+(factor.status==='verified'?' · Active':' · Unfinished setup');
        const button=document.createElement('button');button.className='btn btn-o btn-xs';button.textContent='Remove';button.dataset.mfaAction='';
        button.onclick=()=>remove(factor);
        row.append(label,button);list.append(row);
      }
    }
    async function remove(factor){
      await work('mfa-status',async valid=>{
        const accepted=await actions.confirm('Remove '+(factor.friendly_name||'this authenticator')+'? Removing your last authenticator turns off two-step verification.');
        if(!valid()||!accepted)return;
        await service.remove(factor.id);
        if(!valid())return;
        await refresh(valid);await actions.resume();
      });
    }
    return Object.freeze({
      service,
      reset(){epoch++;setBusy(false);wipe();message('mfa-status','');message('mfa-error','');el('mfa-factors').replaceChildren();el('mfa-factor').replaceChildren();},
      challenge(state,error){
        epoch++;setBusy(false);wipe();
        const select=el('mfa-factor');select.replaceChildren();
        for(const factor of state?.totp||[]){const option=document.createElement('option');option.value=factor.id;option.textContent=factor.friendly_name||'Authenticator';select.append(option);}
        el('mfa-challenge-form').hidden=!state?.totp?.length;
        message('mfa-error',error||(state?.totp?.length?'Enter the current code from your authenticator.':'No supported authenticator is available. Contact the administrator for account recovery.'));
        actions.showChallenge();
        if(state?.totp?.length)el('mfa-code').focus();
      },
      retry(){return work('mfa-error',async()=>{await actions.resume();});},
      verify(){return work('mfa-error',async valid=>{
        const value=el('mfa-code').value;el('mfa-code').value='';
        await service.verify(el('mfa-factor').value,value);
        if(valid())await actions.resume();
      });},
      open(){
        epoch++;wipe();setBusy(false);el('mfa-name').value='';
        actions.open();
        return work('mfa-status',refresh);
      },
      begin(){return work('mfa-status',async valid=>{
        if(pending)throw new Error('Finish or cancel the current setup first.');
        const setup=await service.enroll(el('mfa-name').value);
        // A canceled request may leave an unverified factor; list it on next open.
        if(!valid())return;
        pending=setup.id;
        el('mfa-qr').src=setup.qr;el('mfa-secret').textContent=setup.secret;
        el('mfa-setup').hidden=false;el('mfa-setup-code').focus();
      });},
      finish(){return work('mfa-status',async valid=>{
        if(!pending)throw new Error('Start authenticator setup first.');
        const value=el('mfa-setup-code').value;el('mfa-setup-code').value='';
        await service.verify(pending,value);
        if(!valid())return;
        wipe();await refresh(valid);
        if(valid())message('mfa-status','Authenticator verified. Two-step verification is enabled.');
      });},
      cancel(){return work('mfa-status',async valid=>{
        const id=pending;wipe();
        if(id)await service.remove(id);
        if(valid())await refresh(valid);
      });},
      close(){epoch++;wipe();setBusy(false);actions.close();},
    });
  }
  root.MfaUI=Object.freeze({create});
})(typeof window!=='undefined'?window:globalThis);
