import {BrokerError} from './broker.mjs';
import {digest} from './crypto.mjs';
export function handler({origin,authorize,app,syncKey,scheduled}) {
  return async req=>{
    const headers={'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS','Vary':'Origin'};
    const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers});
    try {
      if(req.method==='POST'&&!req.headers.get('origin')&&syncKey?.length>=32&&req.headers.get('x-sync-key')&&await digest(req.headers.get('x-sync-key'))===await digest(syncKey))return reply(await scheduled());
      if(!origin||req.headers.get('origin')!==origin)return reply({error:'origin_denied'},403);
      if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
      if(req.method!=='POST')return reply({error:'method_not_allowed'},405);
      const authorization=req.headers.get('authorization')||'';
      if(!/^Bearer \S+$/.test(authorization))return reply({error:'sign_in_required'},401);
      const user=await authorize(authorization.slice(7));
      if(!user)return reply({error:'account_verification_required'},403);
      if(Number(req.headers.get('content-length'))>1_000_000)return reply({error:'request_too_large'},413);
      const reader=req.body?.getReader();let total=0,text='';const decoder=new TextDecoder();
      if(reader)while(true){const {done,value}=await reader.read();if(done)break;total+=value.length;if(total>1_000_000){await reader.cancel();return reply({error:'request_too_large'},413);}text+=decoder.decode(value,{stream:true});}
      text+=decoder.decode();let input;try{input=JSON.parse(text);}catch(_){return reply({error:'invalid_request'},400);}
      return reply(await app.handle(user,input));
    }catch(error){return reply({error:error instanceof BrokerError?error.code:'connection_unavailable'},error instanceof BrokerError?error.status:503);}
  };
}
