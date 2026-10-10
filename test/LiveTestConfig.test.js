/** @jest-environment node */
const fs=require('node:fs');
const config=require('../scripts/live-test-config');
const url='https://test.supabase.co';
const jwt=(role,ref='test')=>'eyJhbGciOiJIUzI1NiJ9.'+Buffer.from(JSON.stringify({role,ref})).toString('base64url')+'.signature';

afterEach(()=>jest.restoreAllMocks());

test('a private fixture targets its test backend without reading the application config',()=>{
  const read=jest.spyOn(fs,'readFileSync');
  expect(config({projectUrl:url,supabaseKey:'sb_publishable_fixture'})).toEqual({supabaseUrl:url,supabaseKey:'sb_publishable_fixture'});
  expect(read).not.toHaveBeenCalled();
});

test.each(['service_role','authenticated','admin'])('acceptance rejects %s JWT credentials',role=>{
  expect(()=>config({projectUrl:url,supabaseKey:jwt(role)})).toThrow(/Privileged/);
});

test.each(['sb_secret_private','not-a-key','eyJ.invalid.token'])('acceptance rejects invalid or secret credentials',key=>{
  expect(()=>config({projectUrl:url,supabaseKey:key})).toThrow();
});

test('acceptance rejects a key belonging to a different project',()=>{
  expect(()=>config({projectUrl:url,supabaseKey:jwt('anon','other')})).toThrow(/mismatch/);
});

test('fallback config must match the fixture project before any network request',()=>{
  jest.spyOn(fs,'readFileSync').mockReturnValue("const CONFIG={supabaseUrl:'https://other.supabase.co',supabaseKey:'sb_publishable_other'};");
  expect(()=>config({projectUrl:url})).toThrow(/exact target/);
});

test('existing public config fallback and matching anon credentials remain usable',()=>{
  jest.spyOn(fs,'readFileSync').mockReturnValue("window.CONFIG={supabaseUrl:'https://test.supabase.co',supabaseKey:'sb_publishable_fixture'};");
  expect(config({projectUrl:url}).supabaseUrl).toBe(url);
  expect(config({projectUrl:url,supabaseKey:jwt('anon')}).supabaseUrl).toBe(url);
});
