/** @jest-environment node */
const {execFileSync}=require('child_process');
test('PostgreSQL denies direct connector access and protects concurrent writes',()=>{
 expect(execFileSync(process.execPath,['scripts/test-connector-database.js'],{encoding:'utf8',timeout:60000})).toMatch(/^PASS:/);
},65000);
