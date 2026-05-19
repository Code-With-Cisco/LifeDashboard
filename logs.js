window.Logger = {
  _history: [],
  _maxEntries: 100,

  log: function(module, action, data) {
    const timestamp = new Date().toISOString();
    const entry = {timestamp, module, action, level: 'INFO', data: data || null};
    console.log(`[${timestamp}] [${module}] ${action}`, data || '');
    this._history.push(entry);
    if (this._history.length > this._maxEntries) this._history.shift();
    try {
      let logs = JSON.parse(localStorage.getItem('_app_logs') || '[]');
      logs.push(entry);
      if (logs.length > this._maxEntries) logs = logs.slice(-this._maxEntries);
      localStorage.setItem('_app_logs', JSON.stringify(logs));
    } catch(e) {
      console.warn('Failed to persist logs to localStorage', e);
    }
  },

  error: function(module, action, error) {
    const timestamp = new Date().toISOString();
    const entry = {
      timestamp, module, action, level: 'ERROR',
      error: error?.message || String(error),
      stack: error?.stack || null
    };
    console.error(`[${timestamp}] [${module}] ${action} ERROR:`, error);
    this._history.push(entry);
    if (this._history.length > this._maxEntries) this._history.shift();
    try {
      let logs = JSON.parse(localStorage.getItem('_app_logs') || '[]');
      logs.push(entry);
      if (logs.length > this._maxEntries) logs = logs.slice(-this._maxEntries);
      localStorage.setItem('_app_logs', JSON.stringify(logs));
    } catch(e) {
      console.warn('Failed to persist logs to localStorage', e);
    }
  },

  getLogs: function() {
    try {
      return JSON.parse(localStorage.getItem('_app_logs') || '[]');
    } catch(e) {
      return this._history;
    }
  },

  search: function(filter) {
    return this.getLogs().filter(entry =>
      entry.module.includes(filter) ||
      entry.action.includes(filter) ||
      entry.level.includes(filter)
    );
  },

  clear: function() {
    localStorage.removeItem('_app_logs');
    this._history = [];
    console.log('Logs cleared');
  }
};

window.log = Logger.log.bind(Logger);
window.logError = Logger.error.bind(Logger);
