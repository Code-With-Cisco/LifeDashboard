/** @jest-environment node */
const {execFileSync}=require('node:child_process');
test('calendar migration rolls back and commits with isolation, MFA and preserved records',()=>{
 const result=JSON.parse(execFileSync(process.execPath,['scripts/test-calendar.js'],{encoding:'utf8',timeout:60000}));
 expect(result.result).toMatch(/^PASS:/);
});
