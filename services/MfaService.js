/* Authenticator operations. Setup secrets stay in memory and never enter logs. */
(function(root){
  'use strict';
  const code=value=>{
    if(typeof value!=='string'||!/^\d{6}$/.test(value.trim()))throw new Error('Enter the six-digit code from your authenticator.');
    return value.trim();
  };
  const unwrap=(result,message)=>{
    if(result?.error||!result?.data)throw new Error(message);
    return result.data;
  };
  function create(client){
    return Object.freeze({
      async status(session){
        if(!session?.access_token||!session?.user?.id)throw new Error('Please sign in again.');
        // Passing the JWT forces a fresh server check instead of cached user factors.
        const level=unwrap(await client.auth.mfa.getAuthenticatorAssuranceLevel(session.access_token),'Could not check account security. Retry when connected.');
        const factors=unwrap(await client.auth.mfa.listFactors(),'Could not load authenticators. Retry when connected.');
        const all=Array.isArray(factors.all)?factors.all:null;
        if(!all||!['aal1','aal2'].includes(level.currentLevel)||!['aal1','aal2'].includes(level.nextLevel))throw new Error('Could not verify account security. Please sign in again.');
        const verified=all.filter(f=>f.status==='verified');
        return {allowed:level.currentLevel==='aal2'||(level.nextLevel!=='aal2'&&verified.length===0),
          currentLevel:level.currentLevel,all,totp:verified.filter(f=>f.factor_type==='totp')};
      },
      async enroll(name){
        const friendlyName=typeof name==='string'?name.trim():'';
        if(!friendlyName||friendlyName.length>50)throw new Error('Name this authenticator using 1–50 characters.');
        const data=unwrap(await client.auth.mfa.enroll({factorType:'totp',friendlyName,issuer:'LifeDashboard'}),'Could not start setup. Try a different name or retry when connected.');
        if(!data.id||!data.totp?.secret||!data.totp?.qr_code)throw new Error('Authenticator setup was incomplete. Reopen account security to remove the unfinished setup.');
        const qr=data.totp.qr_code;
        if(!qr.startsWith('data:image/svg+xml;')&&!qr.startsWith('<svg'))throw new Error('Unsupported authenticator image. Reopen account security to remove the unfinished setup.');
        return {id:data.id,secret:data.totp.secret,qr:qr.startsWith('<svg')?'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(qr):qr};
      },
      async verify(factorId,value){
        const otp=code(value);
        if(typeof factorId!=='string'||!factorId)throw new Error('Choose an authenticator first.');
        return unwrap(await client.auth.mfa.challengeAndVerify({factorId,code:otp}),'The code could not be verified. Use the latest code and try again.');
      },
      async remove(factorId){
        unwrap(await client.auth.mfa.unenroll({factorId}),'Could not remove this authenticator. Verify your sign-in and try again.');
        const data=unwrap(await client.auth.refreshSession(),'Authenticator removed, but the session could not refresh. Sign out and back in.');
        return data.session;
      },
    });
  }
  root.MfaService=Object.freeze({create,code});
  if(typeof module!=='undefined'&&module.exports)module.exports=root.MfaService;
})(typeof window!=='undefined'?window:globalThis);
