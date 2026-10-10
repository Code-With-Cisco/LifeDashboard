import {createClient} from 'npm:@supabase/supabase-js@2.115.0';
import {vault} from './crypto.mjs';
import {google} from './google.mjs';
import {github} from './github.mjs';
import {narrator} from './narrator.mjs';
import {broker, BrokerError} from './broker.mjs';
import {handler} from './handler.mjs';
import {configurationIssues} from './configuration.mjs';

const env=(name:string)=>Deno.env.get(name)||'';
const issues=configurationIssues(Object.fromEntries(['DASHBOARD_ORIGIN','CONNECTOR_ENCRYPTION_KEY','CONNECTOR_SYNC_KEY',
  'GOOGLE_CLIENT_ID','GOOGLE_CLIENT_SECRET','GOOGLE_REDIRECT_URI','GITHUB_CLIENT_ID','GITHUB_CLIENT_SECRET','GITHUB_REDIRECT_URI','GITHUB_APP_ID'].map(name=>[name,env(name)])));
if(issues.length)throw new Error('Connector setup incomplete: '+issues.join('; '));
const apiKey=(dictionary:string,legacy:string)=>{
  const fallback=env(legacy);if(fallback)return fallback;
  const values=JSON.parse(env(dictionary)||'{}');
  if(typeof values.default!=='string')throw new Error('Required server API key unavailable');
  return values.default;
};
const origin=env('DASHBOARD_ORIGIN');
const admin=createClient(env('SUPABASE_URL'),apiKey('SUPABASE_SECRET_KEYS','SUPABASE_SERVICE_ROLE_KEY'),{auth:{persistSession:false,autoRefreshToken:false}});
const box=await vault(env('CONNECTOR_ENCRYPTION_KEY'));
const binding=(user:string,id:string,provider:string)=>[user,id,provider].join(':');
const decode=async(row:any)=>({id:row.id,provider:row.provider,revision:row.revision,value:await box.open(row.sealed,binding(row.user_id,row.id,row.provider))});
const store={
  async load(user:string,id:string){const {data,error}=await admin.from('connector_state').select('*').eq('user_id',user).eq('id',id).maybeSingle();if(error)throw new BrokerError('storage_unavailable',503);return data?decode(data):null;},
  async list(user:string){const {data,error}=await admin.from('connector_state').select('*').eq('user_id',user).limit(30);if(error)throw new BrokerError('storage_unavailable',503);return Promise.all((data||[]).map(decode));},
  async save(user:string,row:any){const sealed=await box.seal(row.value,binding(user,row.id,row.provider));const {data,error}=await admin.rpc('save_connector_state',{p_user:user,p_id:row.id,p_provider:row.provider,p_revision:row.revision,p_sealed:sealed});if(error)throw new BrokerError(error.code==='PT409'?'connection_changed':'storage_unavailable',error.code==='PT409'?409:503);return data;},
  async remove(user:string,id:string,revision:number){const {error}=await admin.from('connector_state').delete().eq('user_id',user).eq('id',id).eq('revision',revision);if(error)throw new BrokerError('storage_unavailable',503);},
};
const providers:any={};
if(env('GOOGLE_CLIENT_ID')&&env('GOOGLE_CLIENT_SECRET'))providers.google=google({clientId:env('GOOGLE_CLIENT_ID'),clientSecret:env('GOOGLE_CLIENT_SECRET'),redirectUri:env('GOOGLE_REDIRECT_URI')});
if(env('GITHUB_CLIENT_ID')&&env('GITHUB_CLIENT_SECRET')&&env('GITHUB_APP_ID'))providers.github=github({clientId:env('GITHUB_CLIENT_ID'),clientSecret:env('GITHUB_CLIENT_SECRET'),appId:env('GITHUB_APP_ID'),redirectUri:env('GITHUB_REDIRECT_URI')});
const app=broker({store,providers,narrate:narrator({key:env('OPENAI_API_KEY'),model:env('OPENAI_MODEL')})});
async function authorize(jwt:string) {
    const client=createClient(env('SUPABASE_URL'),apiKey('SUPABASE_PUBLISHABLE_KEYS','SUPABASE_ANON_KEY'),{global:{headers:{Authorization:'Bearer '+jwt}},auth:{persistSession:false,autoRefreshToken:false}});
    const {data,error}=await client.auth.getUser(jwt);
    if(error||!data.user)return null;
    // Existing DB function checks disabled/reset flags and current verified MFA.
    const guard=await client.rpc('get_my_role');
    return !guard.error&&guard.data?data.user.id:null;
}
async function scheduled() {
  const {data,error}=await admin.from('connector_state').select('user_id,id').in('provider',['google','github']).order('updated_at',{ascending:true}).limit(20);
  if(error)throw new BrokerError('storage_unavailable',503);
  let synced=0,skipped=0,failed=0;
  for(const row of data||[]) {
    const profile=await admin.from('profiles').select('is_disabled,force_password_reset').eq('id',row.user_id).single();
    if(profile.error||profile.data.is_disabled||profile.data.force_password_reset){skipped++;continue;}
    try{await app.handle(row.user_id,{action:'sync',id:row.id});synced++;}catch(_){failed++;}
  }
  return {synced,skipped,failed};
}
Deno.serve(handler({origin,authorize,app,syncKey:env('CONNECTOR_SYNC_KEY'),scheduled}));
