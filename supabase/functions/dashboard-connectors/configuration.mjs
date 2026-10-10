// Checks configuration without returning or logging secret values.
export function configurationIssues(env) {
  const issues=[];
  const origin=env.DASHBOARD_ORIGIN;
  try {const u=new URL(origin);if(u.protocol!=='https:'||u.origin!==origin)throw Error();}
  catch(_){issues.push('DASHBOARD_ORIGIN must be an exact HTTPS origin');}
  if(!/^[A-Za-z0-9_-]{43}$/.test(env.CONNECTOR_ENCRYPTION_KEY||''))issues.push('CONNECTOR_ENCRYPTION_KEY needs 32 random base64url bytes');
  if((env.CONNECTOR_SYNC_KEY||'').length<32)issues.push('CONNECTOR_SYNC_KEY needs at least 32 characters');
  for(const provider of ['GOOGLE','GITHUB']){
    const names=[provider+'_CLIENT_ID',provider+'_CLIENT_SECRET',provider+'_REDIRECT_URI',...(provider==='GITHUB'?['GITHUB_APP_ID']:[])];
    if(!names.some(k=>env[k]))continue;
    for(const name of names)if(!env[name])issues.push(name+' is required for '+provider);
    if(env[provider+'_REDIRECT_URI']){
      try {const u=new URL(env[provider+'_REDIRECT_URI']);if(u.protocol!=='https:'||u.origin!==origin||u.username||u.password||u.search||u.hash)throw Error();}
      catch(_){issues.push(provider+'_REDIRECT_URI must use the Dashboard origin without credentials, query or fragment');}
    }
    if(provider==='GITHUB'&&env.GITHUB_APP_ID&&!/^\d+$/.test(env.GITHUB_APP_ID))issues.push('GITHUB_APP_ID must be numeric');
  }
  return issues;
}
