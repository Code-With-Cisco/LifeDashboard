/** @jest-environment node */
const {seal,open}=require('../scripts/recovery-archive');
test('portable archive roundtrip, independent reader, wrong-key and tamper rejection',async()=>{
 const archive=Buffer.concat([Buffer.from('504b0304','hex'),Buffer.from('synthetic private fixture')]);
 const pass='synthetic-recovery-passphrase-2026';
 const encrypted=await seal(archive,pass);
 expect(encrypted).not.toContain('synthetic private fixture');
 expect(await open(encrypted,pass)).toEqual(archive);
 await expect(open(encrypted,'incorrect-passphrase')).rejects.toThrow();
 const altered=JSON.parse(encrypted);altered.data='AA'+altered.data.slice(2);
 await expect(open(JSON.stringify(altered),pass)).rejects.toThrow();
 await expect(seal(Buffer.alloc(3*1024*1024+1),pass)).rejects.toThrow();
});
