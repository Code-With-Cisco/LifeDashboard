/** @jest-environment node */
const S=require('../services/PersonalDataService');
const Backup=require('../services/BackupService');
const {webcrypto}=require('node:crypto');
const {execFileSync}=require('node:child_process');
const path=require('node:path');
const goals=[{sec:'DEVELOPMENT',goals:[{id:'goal-1',g:'Finish a project',freq:'Weekly',p:'High'}]}];

test('legacy migration reads only this account and valid monthly purchase keys',()=>{
 const local={goals_a:goals,goals_b:goals,wit_a_2026_09:[],'wit_a_2026-09':[]};
 expect(S.findLegacy('a',Object.keys(local),key=>local[key]).map(e=>e.key)).toEqual(['goals','purchase_decisions:2026-09']);
});
test('malformed legacy data is reported rather than silently replaced',()=>{
 const result=S.findLegacy('a',['goals_a'],()=>({invalid:true}));
 expect(result[0].error).toMatch(/Unsupported/);
});
test('preview distinguishes adds, unchanged records, and explicit replacements using current revisions',()=>{
 const rows=[{document_key:'goals',payload:goals,revision:5}];
 expect(S.preview([{key:'goals',payload:goals}],rows)[0]).toMatchObject({action:'unchanged',expected_revision:5});
 expect(S.preview([{key:'goals',payload:[]}],rows)[0]).toMatchObject({action:'replace',expected_revision:5,before:goals});
 expect(S.preview([{key:'ingredients_side',payload:{}}],rows)[0]).toMatchObject({action:'add',expected_revision:0});
 expect(()=>S.preview([{key:'goals',payload:[]},{key:'goals',payload:[]}],rows)).toThrow(/Duplicate/);
});
test('backup preserves zero-value ingredients and empty goal choices without sharing mutable objects',()=>{
 const entries=[{key:'goals',payload:[]},{key:'ingredients_protein',payload:{water:{cal:0,pro:0,car:0,fat:0,label:'Water',unit:'oz'}}}];
 const file=S.backup('a','https://example.supabase.co',entries);
 const restored=S.readBackup(file,'a','https://example.supabase.co');
 expect(restored).toEqual(entries);restored[0].payload.push('changed');expect(entries[0].payload).toEqual([]);
});
test('restore rejects wrong accounts/projects, unknown versions, unsupported keys and prototype fields',()=>{
 const file=S.backup('a','project',[{key:'goals',payload:goals}]);
 expect(()=>S.readBackup(file,'b','project')).toThrow(/different/);
 expect(()=>S.readBackup(file,'a','other')).toThrow(/different/);
 expect(()=>S.readBackup({...file,version:2},'a','project')).toThrow();
 expect(()=>S.validate('profiles',[])).toThrow();
 expect(()=>S.validate('ingredients_side',JSON.parse('{"__proto__":{}}'))).toThrow(/Unsafe/);
});
test('encrypted backup round-trips and rejects a wrong password, corruption and unbounded KDF parameters',async()=>{
 const value=S.backup('a','project',[{key:'goals',payload:goals}]);
 const password='A private restore test passphrase';
 const encrypted=await Backup.encrypt(value,password,webcrypto);
 expect(encrypted).not.toContain('Finish a project');
 expect(await Backup.decrypt(encrypted,password,webcrypto)).toEqual(value);
 await expect(Backup.decrypt(encrypted,'Wrong backup passphrase',webcrypto)).rejects.toThrow(/incorrect|damaged/);
 const bad=JSON.parse(encrypted);bad.data=(bad.data[0]==='A'?'B':'A')+bad.data.slice(1);
 await expect(Backup.decrypt(JSON.stringify(bad),password,webcrypto)).rejects.toThrow();
 bad.iterations=1e12;
 await expect(Backup.decrypt(JSON.stringify(bad),password,webcrypto)).rejects.toThrow(/Unsupported/);
});
test('real PostgreSQL tests enforce isolation, conflict preservation, atomic imports and restore',()=>{
 const result=JSON.parse(execFileSync(process.execPath,[path.join(__dirname,'../scripts/test-personal-data.js')],{encoding:'utf8',timeout:60000}));
 expect(result.database).toMatch(/^PASS:/);expect(result.fixturesRemoved).toBe(true);
},65000);
