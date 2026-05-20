/**
 * logs.js — Application logging module.
 *
 * PURPOSE: Persists structured log entries to localStorage and exposes
 *   them for in-app debugging. All modules call Logger.log / Logger.error;
 *   no network calls are made here.
 *
 * PUBLIC INTERFACE:
 *   Logger.log(module, action, data)    — record an INFO entry
 *   Logger.error(module, action, error) — record an ERROR entry
 *   Logger.getLogs()                    — retrieve all persisted entries
 *   Logger.search(filter)               — filter entries by module/action/level
 *   Logger.clear()                      — wipe the persisted log
 *   window.log / window.logError        — convenience aliases
 *
 * CONNECTED TO: All modules (Logger.error / Logger.log called everywhere)
 *               localStorage (_app_logs key)
 */
window.Logger = {
  _history: [],
  _maxEntries: 100,

  /**
   * Record an INFO-level log entry and persist to localStorage.
   * @param {string} module - source module name (e.g. 'api', 'main')
   * @param {string} action - action being logged (e.g. 'recipes.list.start')
   * @param {*}      [data] - optional payload for context
   * @returns {void}
   */
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

  /**
   * Record an ERROR-level log entry and persist to localStorage.
   * @param {string}  module - source module name
   * @param {string}  action - action that failed
   * @param {Error|*} [error] - the caught error or a description
   * @returns {void}
   */
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

  /**
   * Retrieve all persisted log entries from localStorage.
   * Falls back to in-memory history if localStorage is unavailable.
   * @returns {Array<{timestamp:string, module:string, action:string, level:string}>}
   */
  getLogs: function() {
    try {
      return JSON.parse(localStorage.getItem('_app_logs') || '[]');
    } catch(e) {
      return this._history;
    }
  },

  /**
   * Filter log entries where module, action, or level includes the filter string.
   * @param {string} filter - substring to match
   * @returns {Array}
   */
  search: function(filter) {
    return this.getLogs().filter(entry =>
      entry.module.includes(filter) ||
      entry.action.includes(filter) ||
      entry.level.includes(filter)
    );
  },

  /**
   * Clear all persisted log entries from localStorage and reset in-memory history.
   * @returns {void}
   */
  clear: function() {
    localStorage.removeItem('_app_logs');
    this._history = [];
    console.log('Logs cleared');
  }
};

window.log = Logger.log.bind(Logger);
window.logError = Logger.error.bind(Logger);
