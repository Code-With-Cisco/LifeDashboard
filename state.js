window.State = {
  _subscribers: [],

  subscribe: function(listener) {
    if (typeof listener !== 'function') {
      Logger.error('state', 'subscribe.invalid_listener');
      return;
    }
    this._subscribers.push(listener);
  },

  _notifySubscribers: function(key, value) {
    this._subscribers.forEach(listener => {
      try { listener(key, value); } catch(e) { Logger.error('state', '_notifySubscribers.error', e); }
    });
  },

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
    '_cachedRecipes':  (val) => val && Array.isArray(val.profiles),
    '_cachedHabits_':  (val) => Array.isArray(val),
  }
};

window.state = State;
