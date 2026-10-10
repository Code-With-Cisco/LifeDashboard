/** @jest-environment node */
const {execFileSync}=require('child_process');
test('private connector behavior and request boundary',()=>{
  expect(execFileSync(process.execPath,['scripts/test-connectors.mjs'],{encoding:'utf8',timeout:30000})).toMatch(/^PASS:/);
},35000);
