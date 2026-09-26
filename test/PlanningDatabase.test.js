const {execFileSync}=require('child_process');
const path=require('path');
test('PostgreSQL enforces planning ownership, MFA and safe migration rollback/commit',()=>{
 const result=JSON.parse(execFileSync(process.execPath,[path.join(__dirname,'../scripts/test-planning.js')],{encoding:'utf8',timeout:60000}));
 expect(result.result).toMatch(/^PASS:/);
},65000);
