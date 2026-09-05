/** @jest-environment node */
const {execFileSync} = require('child_process');
const fs = require('fs');
const path = require('path');
const {validatePublicConfig} = require('../services/SecurityService');
const root = path.resolve(__dirname, '..');
const jwt = role => ['e30', Buffer.from(JSON.stringify({role})).toString('base64url'), 'test'].join('.');

test.each(['service_role', 'authenticated', 'admin'])('rejects a %s JWT from the public build', role => {
  expect(() => validatePublicConfig({supabaseUrl: 'https://example.supabase.co', supabaseKey: jwt(role)})).toThrow(/Only a Supabase/);
});

test.each(['sb_secret_private', 'not-a-key', '', 'eyJ.invalid.token'])('rejects secret and malformed keys', key => {
  expect(() => validatePublicConfig({supabaseUrl: 'https://example.supabase.co', supabaseKey: key})).toThrow();
});

test.each(['http://example.com', 'ftp://localhost', 'https://name:pass@example.com', 'https://example.com/?token=secret'])('rejects unsafe config origin %s', url => {
  expect(() => validatePublicConfig({supabaseUrl: url, supabaseKey: 'sb_publishable_test'})).toThrow();
});

test('accepts only public key roles and permits local development', () => {
  expect(validatePublicConfig({supabaseUrl: 'http://127.0.0.1:54321', supabaseKey: jwt('anon')}).supabaseUrl).toBe('http://127.0.0.1:54321');
});

test('production artifact contains the locked SDK, exact connection policy and no repository internals', () => {
  execFileSync(process.execPath, ['scripts/build-static.js'], {
    cwd: root, env: {...process.env, SUPABASE_URL: 'https://test.supabase.co', SUPABASE_KEY: 'sb_publishable_test'},
  });
  const dist = path.join(root, 'dist');
  const html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
  expect(html).toContain("connect-src 'self' https://test.supabase.co wss://test.supabase.co;");
  expect(html).not.toContain('cdn.jsdelivr.net');
  expect(fs.readFileSync(path.join(dist, 'vendor/supabase.js'))).toEqual(fs.readFileSync(path.join(root, 'node_modules/@supabase/supabase-js/dist/umd/supabase.js')));
  for (const privatePath of ['.git', '.env', '.claude', 'test', 'graphify-out', 'package.json', 'scripts']) {
    expect(fs.existsSync(path.join(dist, privatePath))).toBe(false);
  }
  const before = fs.readFileSync(path.join(dist, 'config.js'), 'utf8');
  expect(() => execFileSync(process.execPath, ['scripts/build-static.js'], {
    cwd: root, env: {...process.env, SUPABASE_URL: 'https://test.supabase.co', SUPABASE_KEY: 'sb_secret_private'}, stdio: 'pipe',
  })).toThrow();
  expect(fs.readFileSync(path.join(dist, 'config.js'), 'utf8')).toBe(before);
});
