/* Validation and portable personal-record backups. No network, DOM or storage. */
(function(root) {
  'use strict';
  const MAX_BYTES = 5 * 1024 * 1024;
  const MAX_DOCUMENT_BYTES = 262144;
  const KEYS = ['goals', 'habit_definitions', 'ingredients_protein', 'ingredients_side'];
  const DANGEROUS = new Set(['__proto__', 'prototype', 'constructor']);
  const clone = value => JSON.parse(JSON.stringify(value));
  const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  const text = (value, max = 500) => typeof value === 'string' && value.length > 0 && value.length <= max;
  const number = value => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1e9;
  const keyValid = key => KEYS.includes(key) || /^purchase_decisions:\d{4}-(0[1-9]|1[0-2])$/.test(key);
  const bytes = value => new TextEncoder().encode(JSON.stringify(value)).length;

  function checkTree(value, depth = 0) {
    if (depth > 8) throw new Error('Record nesting is too deep.');
    if (value && typeof value === 'object') {
      for (const [key, child] of Object.entries(value)) {
        if (DANGEROUS.has(key)) throw new Error('Unsafe record field.');
        checkTree(child, depth + 1);
      }
    }
  }
  function validate(key, payload) {
    if (!keyValid(key) || bytes(payload) > MAX_DOCUMENT_BYTES) throw new Error('Invalid or oversized personal record.');
    checkTree(payload);
    let valid = false;
    if (key === 'goals') {
      valid = Array.isArray(payload) && payload.length <= 100 && payload.every(s => object(s) && text(s.sec,80) &&
        Array.isArray(s.goals) && s.goals.length <= 500 && s.goals.every(g => object(g) && text(g.g) &&
          ['Daily','Weekly','Monthly'].includes(g.freq) && ['Critical','High','Medium'].includes(g.p) &&
          (g.id == null || text(g.id,100))));
    } else if (key === 'habit_definitions') {
      valid = Array.isArray(payload) && payload.length <= 100 && payload.every(s => object(s) && text(s.cat,80) &&
        text(s.label,100) && Array.isArray(s.habits) && s.habits.length <= 500 &&
        s.habits.every(h => object(h) && text(h.id,100) && text(h.label)));
    } else if (key.startsWith('ingredients_')) {
      valid = object(payload) && Object.keys(payload).length <= 500 && Object.entries(payload).every(([name,e]) =>
        text(name,100) && object(e) && text(e.label,150) && ['cal','pro','car','fat'].every(k => number(e[k])) && text(e.unit,30));
    } else {
      valid = Array.isArray(payload) && payload.length <= 2000 && payload.every(p => object(p) && text(p.name,200) &&
        number(p.cost) && ['buy','pass'].includes(p.decision) && text(p.date,80) &&
        Number.isSafeInteger(p.ts) && p.ts >= 0);
    }
    if (!valid) throw new Error('This personal record has an unsupported format. Your original data has been kept.');
    return clone(payload);
  }
  function legacyKey(userId, key) {
    if (key === 'goals') return 'goals_' + userId;
    if (key === 'habit_definitions') return 'habits_' + userId;
    if (key === 'ingredients_protein') return 'custom_proteins_' + userId;
    if (key === 'ingredients_side') return 'custom_sides_' + userId;
    if (keyValid(key)) return 'wit_' + userId + '_' + key.slice('purchase_decisions:'.length);
    throw new Error('Unknown personal record.');
  }
  function findLegacy(userId, storageKeys, read) {
    const keys = [...KEYS];
    const prefix = 'wit_' + userId + '_';
    for (const localKey of storageKeys) {
      if (localKey.startsWith(prefix) && /^\d{4}-(0[1-9]|1[0-2])$/.test(localKey.slice(prefix.length))) {
        keys.push('purchase_decisions:' + localKey.slice(prefix.length));
      }
    }
    return keys.filter(key => storageKeys.includes(legacyKey(userId,key))).map(key => {
      const payload = read(legacyKey(userId,key));
      try { return {key, payload:validate(key,payload)}; }
      catch (_) { return {key, error:'Unsupported local data; original kept on this device.'}; }
    });
  }
  function preview(entries, currentRows) {
    if (!Array.isArray(entries) || entries.length > 300) throw new Error('Too many personal records.');
    const current = new Map(currentRows.map(row => [row.document_key,row]));
    const seen = new Set();
    return entries.map(entry => {
      if (seen.has(entry.key)) throw new Error('Duplicate record in import.');
      seen.add(entry.key);
      const payload = validate(entry.key,entry.payload);
      const row = current.get(entry.key);
      return {key:entry.key,payload,expected_revision:row?.revision || 0,
        before:row?.payload ?? null, action:!row?'add':JSON.stringify(payload)===JSON.stringify(row.payload)?'unchanged':'replace'};
    });
  }
  function backup(userId, project, entries) {
    const documents = preview(entries,[]).map(({key,payload})=>({key,payload}));
    const result = {format:'LifeDashboard personal records',version:1,user_id:userId,project,
      created_at:new Date().toISOString(),documents};
    if (bytes(result) > MAX_BYTES) throw new Error('Backup is too large.');
    return result;
  }
  function readBackup(value, userId, project) {
    if (!object(value) || value.format !== 'LifeDashboard personal records' || value.version !== 1 ||
      value.user_id !== userId || value.project !== project || bytes(value) > MAX_BYTES) {
      throw new Error('This backup is invalid or belongs to a different account or project.');
    }
    return preview(value.documents,[]).map(({key,payload})=>({key,payload}));
  }
  const api = Object.freeze({MAX_BYTES,MAX_DOCUMENT_BYTES,KEYS,keyValid,validate,legacyKey,findLegacy,preview,backup,readBackup});
  root.PersonalDataService = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
