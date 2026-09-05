/**
 * state.js — Persistent application state backed by localStorage.
 *
 * PURPOSE: Typed, schema-validated read/write layer over localStorage.
 *   Notifies registered listeners on any state change. All JSON
 *   serialization/deserialization is handled internally.
 *
 * PUBLIC INTERFACE:
 *   State.get(key)            — read and JSON-parse a key; null if missing/invalid
 *   State.set(key, value)     — JSON-stringify and write; returns boolean success
 *   State.setSafe(key, value) — schema-validate then write; returns boolean success
 *   State.delete(key)         — remove a key; returns boolean success
 *   State.getAll(prefix)      — read all keys with a prefix → {key: value}
 *   State.keys(prefix)        — list all keys with a prefix → string[]
 *   State.subscribe(listener) — register fn(key, value) called on any change
 *
 * CONNECTED TO: logs.js (Logger.error on failures)
 *               api.js, app.js (primary consumers)
 */
window.State = {
  _subscribers: [],
  _privateCache: new Map(),

  cacheGet: function(userId, key) {
    return userId ? this._privateCache.get(JSON.stringify([userId, key])) ?? null : null;
  },

  cacheSet: function(userId, key, value) {
    if (!userId) return;
    // Bound optional cache growth; authoritative and local-only records are separate.
    if (this._privateCache.size >= 64) this._privateCache.delete(this._privateCache.keys().next().value);
    this._privateCache.set(JSON.stringify([userId, key]), value);
  },

  clearPrivateCaches: function() {
    this._privateCache.clear();
    this.keys().filter(key => key === '_cachedRecipes' || key.startsWith('_cachedHabits_') ||
      key === '_app_logs').forEach(key => this.delete(key));
  },

  /**
   * Register a listener called whenever any key changes.
   * @param {function(key: string, value: *): void} listener
   * @returns {void}
   */
  subscribe: function(listener) {
    if (typeof listener !== 'function') {
      Logger.error('state', 'subscribe.invalid_listener');
      return;
    }
    this._subscribers.push(listener);
  },

  /**
   * Notify all registered subscribers of a state change.
   * @param {string} key
   * @param {*}      value - the new value (null if deleted)
   * @returns {void}
   */
  _notifySubscribers: function(key, value) {
    this._subscribers.forEach(listener => {
      try { listener(key, value); } catch(e) { Logger.error('state', '_notifySubscribers.error', e); }
    });
  },

  /**
   * Read a JSON-parsed value from localStorage.
   * @param {string} key
   * @returns {*} parsed value, or null if key is missing or JSON is invalid
   */
  get: function(key) {
    try {
      const val = localStorage.getItem(key);
      if (val === null) return null;
      return JSON.parse(val);
    } catch(e) {
      Logger.error('state', 'get.parse_error', {key, error: e.message});
      return null;
    }
  },

  /**
   * Write a value to localStorage as JSON and notify subscribers.
   * @param {string} key
   * @param {*}      value
   * @returns {boolean} true on success, false if localStorage threw
   */
  set: function(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      this._notifySubscribers(key, value);
      return true;
    } catch(e) {
      Logger.error('state', 'set.error', {key, error: e.message});
      return false;
    }
  },

  /**
   * Validate value against the key's registered schema then write.
   * Schema keys ending with '_' match any key that starts with that prefix.
   * @param {string} key
   * @param {*}      value
   * @returns {boolean} true on success; false if validation or write fails
   */
  setSafe: function(key, value) {
    let schema = this.schemas[key];
    if (!schema) {
      for (const schemaKey in this.schemas) {
        if (schemaKey.endsWith('_') && key.startsWith(schemaKey)) {
          schema = this.schemas[schemaKey];
          break;
        }
      }
    }
    if (schema && !schema(value)) {
      Logger.error('state', 'setSafe.validation_failed', {key});
      return false;
    }
    return this.set(key, value);
  },

  /**
   * Remove a key from localStorage and notify subscribers with null.
   * @param {string} key
   * @returns {boolean} true on success, false if localStorage threw
   */
  delete: function(key) {
    try {
      localStorage.removeItem(key);
      this._notifySubscribers(key, null);
      return true;
    } catch(e) {
      Logger.error('state', 'delete.error', {key, error: e.message});
      return false;
    }
  },

  /**
   * Read all localStorage keys that start with prefix.
   * @param {string} prefix
   * @returns {Object.<string, *>} map of {key: parsedValue}
   */
  getAll: function(prefix) {
    const result = {};
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
          const val = this.get(key);
          if (val !== null) result[key] = val;
        }
      }
    } catch(e) {
      Logger.error('state', 'getAll.error', {prefix, error: e.message});
    }
    return result;
  },

  /**
   * List all localStorage key names matching an optional prefix.
   * @param {string} [prefix] - if omitted, returns all keys
   * @returns {string[]}
   */
  keys: function(prefix) {
    const result = [];
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k && (!prefix || k.startsWith(prefix))) result.push(k);
      }
    } catch(e) {
      Logger.error('state', 'keys.error', e);
    }
    return result;
  },

  schemas: {
    'cc_v4_':          (val) => val && typeof val === 'object' && typeof val.ts === 'number',
    'habits_':         (val) => Array.isArray(val),
    'goals_':          (val) => val && typeof val === 'object',
    'custom_spice_':   (val) => Array.isArray(val),
    'custom_proteins_':(val) => val && typeof val === 'object',
    'custom_sides_':   (val) => val && typeof val === 'object',
    'wit_':            (val) => Array.isArray(val),
    'debt_start_':     (val) => typeof val === 'number',
    'briefing_preferences_': (val) => val && typeof val === 'object' &&
      ['balanced', 'deadlines', 'priorities'].includes(val.focusRule) &&
      Number.isInteger(val.focusLimit) && val.focusLimit >= 1 && val.focusLimit <= 5 &&
      typeof val.includeTasks === 'boolean' && typeof val.includeCalendar === 'boolean' &&
      typeof val.includeWorkout === 'boolean' && typeof val.morningEnabled === 'boolean' &&
      /^([01]\d|2[0-3]):[0-5]\d$/.test(val.morningTime),
    'briefing_delivery_': (val) => /^\d{4}-\d{2}-\d{2}$/.test(String(val)),
    '_cachedRecipes':  (val) => val && Array.isArray(val.profiles),
    '_cachedHabits_':  (val) => Array.isArray(val),
  }
};

window.state = State;
State.clearPrivateCaches();
