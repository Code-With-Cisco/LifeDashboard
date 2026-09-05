/** Session-only diagnostics. Never persist record payloads or raw errors. */
window.Logger = {
  _history: [],
  _maxEntries: 100,
  _record: function(module, action, level) {
    const safe = value => String(value || '').replace(/[^A-Za-z0-9_.-]/g, '').slice(0, 80);
    const entry = {timestamp: new Date().toISOString(), module: safe(module), action: safe(action), level};
    this._history.push(entry);
    if (this._history.length > this._maxEntries) this._history.shift();
    if (level === 'ERROR') console.error(`[${entry.module}] ${entry.action}`);
  },
  log: function(module, action) { this._record(module, action, 'INFO'); },
  error: function(module, action) { this._record(module, action, 'ERROR'); },
  getLogs: function() { return this._history.map(entry => ({...entry})); },
  search: function(filter) {
    return this.getLogs().filter(entry => [entry.module, entry.action, entry.level].some(value => value.includes(filter)));
  },
  clear: function() {
    this._history = [];
    try { localStorage.removeItem('_app_logs'); } catch (_) { /* Storage may be disabled. */ }
  },
};
Logger.clear();
window.log = Logger.log.bind(Logger);
window.logError = Logger.error.bind(Logger);
