'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');

// Private fixtures can select a separate test backend without changing config.js.
module.exports = function liveTestConfig(fixtures) {
  const config = fixtures.supabaseKey
    ? {supabaseUrl: fixtures.projectUrl, supabaseKey: fixtures.supabaseKey}
    : vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'config.js'), 'utf8') +
      '\n;typeof CONFIG!=="undefined"?CONFIG:window.CONFIG;', {window: {}}, {timeout: 1000});
  assert.equal(config.supabaseUrl, fixtures.projectUrl, 'Fixture must identify the exact target project');
  assert(/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(config.supabaseUrl), 'Expected a Supabase project URL');
  assert.equal(typeof config.supabaseKey, 'string', 'A public API key is required');
  if (config.supabaseKey.startsWith('eyJ')) {
    const claims = JSON.parse(Buffer.from(config.supabaseKey.split('.')[1], 'base64url'));
    assert.equal(claims.role, 'anon', 'Privileged API keys are forbidden in acceptance checks');
    if (claims.ref) assert.equal(config.supabaseUrl, `https://${claims.ref}.supabase.co`, 'Key project mismatch');
  } else {
    assert(config.supabaseKey.startsWith('sb_publishable_'), 'Only a public API key is permitted');
  }
  return config;
};
