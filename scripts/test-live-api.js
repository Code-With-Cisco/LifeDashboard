'use strict';
// Explicit, manual verification with disposable accounts only. Not part of CI.
// The private fixture file contains credentials/tokens and must stay outside Git.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');
const assert = require('node:assert/strict');

async function main() {
  const [phase, fixturePath] = process.argv.slice(2);
  assert(['baseline', 'reset', 'disabled', 'signout', 'removed'].includes(phase) && fixturePath,
    'Usage: node scripts/test-live-api.js <baseline|reset|disabled|signout|removed> <private-fixture-file>');
  const root = path.resolve(__dirname, '..');
  const privatePath = path.resolve(fixturePath);
  const relative = path.relative(root, privatePath);
  assert(relative.startsWith('..' + path.sep) || path.isAbsolute(relative), 'Fixture file must be outside the repository');
  const fixtures = JSON.parse(fs.readFileSync(privatePath, 'utf8'));
  for (const who of ['a', 'b']) {
    assert(/^security-api-\d{8}-[ab]@example\.invalid$/.test(fixtures[who]?.email), 'Only disposable .invalid test accounts are allowed');
    assert(fixtures[who].password?.length >= 24, 'Use a randomly generated test password');
  }
  const config = vm.runInNewContext(fs.readFileSync(path.join(root, 'config.js'), 'utf8') +
    '\n;typeof CONFIG!=="undefined"?CONFIG:window.CONFIG;', {window: {}}, {timeout: 1000});
  assert(/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(config.supabaseUrl), 'Expected a Supabase project URL');
  if (config.supabaseKey.startsWith('eyJ')) {
    assert.equal(JSON.parse(Buffer.from(config.supabaseKey.split('.')[1], 'base64url')).role, 'anon', 'Only a public anon key is allowed');
  } else assert(config.supabaseKey.startsWith('sb_publishable_'), 'Only a public publishable key is allowed');
  const save = () => fs.writeFileSync(privatePath, JSON.stringify(fixtures));
  let checks = 0;
  const check = (condition, label) => { assert(condition, label); checks++; };
  async function request(endpoint, {as, method = 'GET', body} = {}) {
    const headers = {apikey: config.supabaseKey, 'Content-Type': 'application/json', Prefer: 'return=representation'};
    if (as) headers.Authorization = 'Bearer ' + fixtures[as].accessToken;
    const response = await fetch(config.supabaseUrl + endpoint, {method, headers,
      body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(20000)});
    const text = await response.text();
    return {status: response.status, body: text ? JSON.parse(text) : null};
  }
  const denied = result => [401, 403].includes(result.status) && result.body?.code === '42501';
  const workout = who => ({p_session_id: fixtures[who].sessionId, p_session_date: '2000-01-02',
    p_day_name: 'API fixture', p_day_index: 0, p_notes: 'Original', p_duration_minutes: 0,
    p_sets: [{exercise_name: 'API fixture press', set_number: 1, reps_completed: 0, weight_lbs: 0}]});

  if (phase === 'baseline') {
    check(!fixtures.a.id && !fixtures.b.id, 'Baseline must start with fresh fixtures');
    for (const who of ['a', 'b']) {
      const f = fixtures[who];
      const login = await request('/auth/v1/token?grant_type=password', {method: 'POST', body: {email: f.email, password: f.password}});
      check(login.status === 200 && login.body.user.email === f.email, who + ': sign-in');
      f.id = login.body.user.id; f.accessToken = login.body.access_token; f.refreshToken = login.body.refresh_token;
      f.todoId = crypto.randomUUID(); f.mealId = crypto.randomUUID(); f.sessionId = crypto.randomUUID(); save();
      const profile = await request('/rest/v1/profiles', {as: who, method: 'POST', body: {id: f.id, username: 'api_fixture_' + f.id, role: 'standard'}});
      check(profile.status === 201, who + ': own profile creation');
      const todo = await request('/rest/v1/todo_items', {as: who, method: 'POST', body: {id: f.todoId, user_id: f.id, title: 'API fixture ' + who}});
      check(todo.status === 201, who + ': own task creation');
      const meal = await request('/rest/v1/meals', {as: who, method: 'POST', body: {id: f.mealId, name: 'API fixture ' + who, meal_type: 'lunch', created_by: f.id, is_template: false}});
      check(meal.status === 201, who + ': private meal creation');
      const saved = await request('/rest/v1/rpc/save_workout_session', {as: who, method: 'POST', body: workout(who)});
      check(saved.status === 200 && saved.body === f.sessionId, who + ': workout save');
    }
    for (const who of ['a', 'b']) {
      const own = fixtures[who], other = fixtures[who === 'a' ? 'b' : 'a'];
      for (const [table, column, id] of [['profiles','id',other.id], ['todo_items','user_id',other.id],
        ['meals','id',other.mealId], ['workout_sessions','id',other.sessionId], ['workout_exercise_logs','session_id',other.sessionId]]) {
        const r = await request('/rest/v1/' + table + '?select=id&' + column + '=eq.' + id, {as: who});
        check(r.status === 200 && r.body.length === 0, who + ': foreign ' + table + ' read denied');
      }
      for (const method of ['PATCH', 'DELETE']) {
        const r = await request('/rest/v1/todo_items?id=eq.' + other.todoId, {as: who, method, body: method === 'PATCH' ? {title: 'Forbidden'} : undefined});
        check(r.status === 200 && r.body.length === 0, who + ': foreign task ' + method + ' denied');
      }
      const reassign = await request('/rest/v1/todo_items?id=eq.' + own.todoId, {as: who, method: 'PATCH', body: {user_id: other.id}});
      check(denied(reassign), who + ': task ownership reassignment denied');
      const promote = await request('/rest/v1/profiles?id=eq.' + own.id, {as: who, method: 'PATCH', body: {role: 'admin'}});
      check(denied(promote), who + ': self-promotion denied');
      const publish = await request('/rest/v1/meals?id=eq.' + own.mealId, {as: who, method: 'PATCH', body: {is_template: true}});
      check(denied(publish), who + ': template publishing denied');
      const foreignWorkout = await request('/rest/v1/rpc/save_workout_session', {as: who, method: 'POST', body: {...workout(who), p_session_id: other.sessionId}});
      check(denied(foreignWorkout), who + ': foreign workout replacement denied');
      const retry = await request('/rest/v1/rpc/save_workout_session', {as: who, method: 'POST', body: {...workout(who), p_notes: 'Retry'}});
      check(retry.status === 200 && retry.body === own.sessionId, who + ': stable workout retry');
      const invalid = await request('/rest/v1/rpc/save_workout_session', {as: who, method: 'POST', body: {...workout(who), p_sets: [{exercise_name: 'Invalid', set_number: 1, weight_lbs: -1}]}});
      check(invalid.status === 400 && invalid.body.code === '22023', who + ': invalid workout denied');
      const persisted = await request('/rest/v1/workout_sessions?select=notes,duration_minutes&id=eq.' + own.sessionId, {as: who});
      check(persisted.status === 200 && persisted.body.length === 1 && persisted.body[0].notes === 'Retry' && persisted.body[0].duration_minutes === 0, who + ': workout preserved after failure');
      const sets = await request('/rest/v1/workout_exercise_logs?select=reps_completed,weight_lbs&session_id=eq.' + own.sessionId, {as: who});
      check(sets.status === 200 && sets.body.length === 1 && sets.body[0].reps_completed === 0 && Number(sets.body[0].weight_lbs) === 0, who + ': one set and zero values preserved');
    }
  } else if (phase === 'reset') {
    const a = fixtures.a;
    const profile = await request('/rest/v1/profiles?select=force_password_reset&id=eq.' + a.id, {as: 'a'});
    check(profile.status === 200 && profile.body[0]?.force_password_reset === true, 'Reset fixture is required');
    const bypass = await request('/rest/v1/profiles?id=eq.' + a.id, {as: 'a', method: 'PATCH', body: {force_password_reset: false}});
    check(denied(bypass), 'Reset cannot be cleared through Data API');
    const blocked = await request('/rest/v1/todo_items?select=id&user_id=eq.' + a.id, {as: 'a'});
    check(blocked.status === 200 && blocked.body.length === 0, 'Reset-pending task access denied');
    const badPassword = await request('/auth/v1/user', {as: 'a', method: 'PUT', body: {password: fixtures.newPassword, current_password: 'incorrect-test-password'}});
    check(badPassword.status >= 400 && badPassword.status < 500, 'Wrong current password rejected');
    const stillRequired = await request('/rest/v1/profiles?select=force_password_reset&id=eq.' + a.id, {as: 'a'});
    check(stillRequired.status === 200 && stillRequired.body[0]?.force_password_reset === true, 'Rejected password change retains requirement');
    const changed = await request('/auth/v1/user', {as: 'a', method: 'PUT', body: {password: fixtures.newPassword, current_password: a.password}});
    check(changed.status === 200 && changed.body.id === a.id, 'Real Auth password update succeeds');
    a.password = fixtures.newPassword; save();
    const cleared = await request('/rest/v1/profiles?select=force_password_reset&id=eq.' + a.id, {as: 'a'});
    check(cleared.status === 200 && cleared.body[0]?.force_password_reset === false, 'Auth trigger clears requirement');
    const restored = await request('/rest/v1/todo_items?select=id&user_id=eq.' + a.id, {as: 'a'});
    check(restored.status === 200 && restored.body.length === 1, 'Access restored after Auth password update');
  } else if (phase === 'disabled') {
    const r = await request('/rest/v1/todo_items?select=id&user_id=eq.' + fixtures.a.id, {as: 'a'});
    check(r.status === 200 && r.body.length === 0, 'Existing JWT loses private data access after disable');
    check(denied(await request('/rest/v1/rpc/save_workout_session', {as: 'a', method: 'POST', body: workout('a')})), 'Disabled JWT cannot save workout');
    const enabled = await request('/rest/v1/todo_items?select=id&user_id=eq.' + fixtures.b.id, {as: 'b'});
    check(enabled.status === 200 && enabled.body.length === 1, 'Other account remains usable');
  } else if (phase === 'signout') {
    for (const who of ['a', 'b']) {
      const out = await request('/auth/v1/logout?scope=global', {as: who, method: 'POST'});
      check(out.status === 204, who + ': sign-out');
      const refresh = await request('/auth/v1/token?grant_type=refresh_token', {method: 'POST', body: {refresh_token: fixtures[who].refreshToken}});
      check(refresh.status >= 400 && refresh.status < 500, who + ': signed-out refresh denied');
    }
  } else {
    for (const who of ['a', 'b']) {
      const login = await request('/auth/v1/token?grant_type=password', {method: 'POST', body: {email: fixtures[who].email, password: fixtures[who].password}});
      check(login.status === 400 && login.body.error_code === 'invalid_credentials', who + ': removed account cannot sign in');
    }
  }
  console.log(JSON.stringify({phase, passed: checks}));
}
main().catch(error => { console.error(error.name + ': ' + (error.code === 'ERR_ASSERTION' ? error.message : 'Live check failed; inspect privately')); process.exitCode = 1; });
