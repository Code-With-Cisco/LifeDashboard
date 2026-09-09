const {create,code}=require('../services/MfaService');
const {execFileSync}=require('child_process');
const path=require('path');
const session={access_token:'signed-jwt',user:{id:'a'}};
let client,service;
beforeEach(()=>{
 client={auth:{mfa:{
  getAuthenticatorAssuranceLevel:jest.fn(async()=>({data:{currentLevel:'aal1',nextLevel:'aal1'}})),
  listFactors:jest.fn(async()=>({data:{all:[]}})),
  challengeAndVerify:jest.fn(async()=>({data:{access_token:'verified-jwt'}})),
  enroll:jest.fn(async()=>({data:{id:'factor',totp:{secret:'PRIVATE',qr_code:'<svg></svg>'}}})),
  unenroll:jest.fn(async()=>({data:{id:'factor'}})),
 },refreshSession:jest.fn(async()=>({data:{session}}))}};
 service=create(client);
});
test('allows accounts without verified factors and checks the explicit JWT',async()=>{
 expect((await service.status(session)).allowed).toBe(true);
 expect(client.auth.mfa.getAuthenticatorAssuranceLevel).toHaveBeenCalledWith('signed-jwt');
});
test('fresh verified factors block a stale aal1 session',async()=>{
 client.auth.mfa.listFactors.mockResolvedValue({data:{all:[{id:'f',status:'verified',factor_type:'totp'}]}});
 const state=await service.status(session);expect(state.allowed).toBe(false);expect(state.totp).toHaveLength(1);
});
test('a server requirement blocks even when the factor lists race',async()=>{
 client.auth.mfa.getAuthenticatorAssuranceLevel.mockResolvedValue({data:{currentLevel:'aal1',nextLevel:'aal2'}});
 expect((await service.status(session)).allowed).toBe(false);
});
test('verified session allows access while unfinished setup alone does not require a challenge',async()=>{
 client.auth.mfa.listFactors.mockResolvedValue({data:{all:[{id:'f',status:'unverified',factor_type:'totp'}]}});
 expect((await service.status(session)).allowed).toBe(true);
 client.auth.mfa.getAuthenticatorAssuranceLevel.mockResolvedValue({data:{currentLevel:'aal2',nextLevel:'aal2'}});
 expect((await service.status(session)).allowed).toBe(true);
});
test('security lookup failure fails closed without exposing raw provider errors',async()=>{
 client.auth.mfa.listFactors.mockResolvedValue({error:{message:'PRIVATE provider details'}});
 await expect(service.status(session)).rejects.toThrow('Could not load authenticators');
 await expect(service.status({})).rejects.toThrow('sign in');
});
test('requires exactly six digits before sending a challenge',async()=>{
 for(const value of ['12345','1234567','123abc','<svg>',123456])expect(()=>code(value)).toThrow();
 await service.verify('factor',' 012345 ');
 expect(client.auth.mfa.challengeAndVerify).toHaveBeenCalledWith({factorId:'factor',code:'012345'});
});
test('renders setup QR as a local data image and rejects external images',async()=>{
 expect((await service.enroll(' Phone ')).qr).toBe('data:image/svg+xml;charset=utf-8,%3Csvg%3E%3C%2Fsvg%3E');
 client.auth.mfa.enroll.mockResolvedValue({data:{id:'factor',totp:{secret:'PRIVATE',qr_code:'https://external.test/qr'}}});
 await expect(service.enroll('Phone')).rejects.toThrow('Unsupported');
});
test('removal refreshes the session and propagates refresh failure',async()=>{
 expect(await service.remove('factor')).toBe(session);
 client.auth.refreshSession.mockResolvedValue({error:{message:'PRIVATE'}});
 await expect(service.remove('factor')).rejects.toThrow('session could not refresh');
});
test('real SQL engine verifies MFA policies, preserved records and rollback/commit paths',()=>{
 const result=JSON.parse(execFileSync(process.execPath,[path.join(__dirname,'../scripts/test-mfa.js')],{encoding:'utf8',timeout:60000}));
 expect(result.result).toMatch(/^PASS:/);expect(result.rollbackAndCommit).toBe(true);
},65000);
