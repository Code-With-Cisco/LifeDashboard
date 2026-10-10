/** @jest-environment node */
const {execFileSync}=require('node:child_process');
test('broker configuration rejects incomplete providers and unsafe redirects without leaking secrets',()=>{
 const output=execFileSync(process.execPath,['--input-type=module','-e',`
 import assert from 'node:assert/strict';
 import {configurationIssues as check} from './supabase/functions/dashboard-connectors/configuration.mjs';
 const base={DASHBOARD_ORIGIN:'https://dashboard.test',CONNECTOR_ENCRYPTION_KEY:'a'.repeat(43),CONNECTOR_SYNC_KEY:'s'.repeat(32)};
 assert.deepEqual(check(base),[]);
 assert(check({...base,GOOGLE_CLIENT_SECRET:'PRIVATE_SECRET'}).some(x=>x.includes('GOOGLE_CLIENT_ID')));
 assert(!JSON.stringify(check({...base,GOOGLE_CLIENT_SECRET:'PRIVATE_SECRET'})).includes('PRIVATE_SECRET'));
 const google={...base,GOOGLE_CLIENT_ID:'id',GOOGLE_CLIENT_SECRET:'PRIVATE_SECRET',GOOGLE_REDIRECT_URI:'https://dashboard.test/LifeDashboard/'};
 assert.deepEqual(check(google),[]);
 for(const uri of ['https://evil.test/callback','http://dashboard.test/','https://user:pass@dashboard.test/','https://dashboard.test/?token=PRIVATE_SECRET'])assert(check({...google,GOOGLE_REDIRECT_URI:uri}).length);
 assert(check({...base,DASHBOARD_ORIGIN:'https://dashboard.test/path'}).length);
 console.log('PASS');`],{encoding:'utf8'});
 expect(output.trim()).toBe('PASS');
});
