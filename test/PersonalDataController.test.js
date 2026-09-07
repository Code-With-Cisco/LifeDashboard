/** @jest-environment node */
const {JSDOM}=require('jsdom');const fs=require('fs');const vm=require('vm');const path=require('path');
const root=path.resolve(__dirname,'..');
let dom,win,result,client;
const chain=value=>{const q=new Proxy({},{get:(_,key)=>key==='then'?Promise.resolve(value).then.bind(Promise.resolve(value)):()=>q});return q;};
const goals=[{sec:'DEV',goals:[{g:'Original goal',freq:'Daily',p:'High'}]}];
const row=(user='a',payload=goals,revision=1)=>({user_id:user,document_key:'goals',payload,revision});
beforeEach(()=>{
 dom=new JSDOM(fs.readFileSync(path.join(root,'index.html'),'utf8'),{url:'https://dashboard.test',runScripts:'outside-only'});
 win=dom.window;win.TextEncoder=TextEncoder;win.TextDecoder=TextDecoder;
 win.Logger={log:jest.fn(),error:jest.fn()};win.openModal=jest.fn();
 for(const file of ['state.js','services/PersonalDataService.js','personal-data.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),dom.getInternalVMContext());
 result={data:[row()],error:null};client={from:jest.fn(()=>chain(result)),rpc:jest.fn(async()=>({data:[row('a',[],2)],error:null}))};
});
afterEach(()=>dom.window.close());
test('failed save keeps the committed record and returned drafts cannot mutate the cache',async()=>{
 await win.PersonalData.initialize(client,'a');const draft=win.PersonalData.read('goals',[]);draft[0].goals[0].g='Changed';
 client.rpc.mockResolvedValue({error:{code:'42501'}});
 await expect(win.PersonalData.save('goals',draft)).rejects.toThrow(/Save failed/);
 expect(win.PersonalData.read('goals',[])).toEqual(goals);
});
test('stale saves report a conflict instead of replacing newer records',async()=>{
 await win.PersonalData.initialize(client,'a');client.rpc.mockResolvedValue({error:{code:'40001'}});
 await expect(win.PersonalData.save('goals',[])).rejects.toThrow(/changed elsewhere/);
 expect(client.rpc).toHaveBeenCalledWith('save_personal_documents',{p_documents:[{key:'goals',payload:[],expected_revision:1}]});
 expect(win.PersonalData.read('goals',[])).toEqual(goals);
});
test('local records require a migration preview and the source is preserved after applying',async()=>{
 result={data:[],error:null};win.State.set('goals_a',goals);win.State.set('goals_b',[{secret:'other account'}]);
 await win.PersonalData.initialize(client,'a');
 await expect(win.PersonalData.save('goals',[])).rejects.toThrow(/migrate/);
 win.PersonalData.previewMigration();expect(win.document.querySelectorAll('#data-preview input:checked')).toHaveLength(1);
 client.rpc.mockResolvedValue({data:[row()],error:null});await win.PersonalData.apply();
 expect(win.State.get('goals_a')).toEqual(goals);expect(win.PersonalData.read('goals',[])).toEqual(goals);
 expect(win.document.getElementById('data-preview').textContent).not.toContain('other account');
});
test('migration replacements start unchecked and private markup is rendered as text',async()=>{
 const incoming=[{sec:'<img src=x onerror=alert(1)>',goals:[{g:'Changed',freq:'Daily',p:'High'}]}];
 win.State.set('goals_a',incoming);await win.PersonalData.initialize(client,'a');win.PersonalData.previewMigration();
 expect(win.document.querySelectorAll('#data-preview input:checked')).toHaveLength(0);
 expect(win.document.querySelector('#data-preview img')).toBeNull();
 expect(win.document.getElementById('data-preview').textContent).toContain('<img');
});
test('an account switch invalidates in-flight reads and writes',async()=>{
 let resolveLoad;client.from=()=>chain(new Promise(resolve=>{resolveLoad=resolve;}));
 const loading=win.PersonalData.initialize(client,'a');win.PersonalData.reset();resolveLoad({data:[row()],error:null});await loading;
 expect(win.PersonalData.read('goals',[])).toEqual([]);
 client.from=()=>chain({data:[row()],error:null});await win.PersonalData.initialize(client,'a');
 let resolveSave;client.rpc=()=>new Promise(resolve=>{resolveSave=resolve;});
 const saving=win.PersonalData.save('goals',[]);win.PersonalData.reset();resolveSave({data:[row('a',[],2)],error:null});
 await expect(saving).rejects.toThrow(/session changed/);expect(win.PersonalData.read('goals',[])).toEqual([]);
});
test('unavailable records fail closed for writes and malformed server records are rejected',async()=>{
 result={error:{code:'offline'}};expect(await win.PersonalData.initialize(client,'a')).toBe(false);
 await expect(win.PersonalData.save('goals',[])).rejects.toThrow(/unavailable/);
 result={data:[row('b')],error:null};expect(await win.PersonalData.initialize(client,'a')).toBe(false);
 expect(client.rpc).not.toHaveBeenCalled();
});

test('an unconfirmed revision cannot replace the last committed record',async()=>{
 await win.PersonalData.initialize(client,'a');client.rpc.mockResolvedValue({data:[row('a',[],1)],error:null});
 await expect(win.PersonalData.save('goals',[])).rejects.toThrow(/verified/);
 expect(win.PersonalData.read('goals',[])).toEqual(goals);
});
