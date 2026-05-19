window.DOM = {
  byId: function(id) {
    const el = document.getElementById(id);
    if (!el) Logger.error('dom', 'byId.not_found', {id});
    return el;
  },
  value: function(id) { return this.byId(id)?.value || ''; },
  setText: function(id, text) { const el = this.byId(id); if (el) el.textContent = text; },
  setHTML: function(id, html) { const el = this.byId(id); if (el) el.innerHTML = html; },
  addClass: function(id, cls) { this.byId(id)?.classList.add(cls); },
  removeClass: function(id, cls) { this.byId(id)?.classList.remove(cls); },
  toggleClass: function(id, cls) { this.byId(id)?.classList.toggle(cls); },
  hasClass: function(id, cls) { return this.byId(id)?.classList.contains(cls) || false; },
  show: function(id, display = 'block') { const el = this.byId(id); if (el) el.style.display = display; },
  hide: function(id) { const el = this.byId(id); if (el) el.style.display = 'none'; },
  queryAll: function(selector) { return Array.from(document.querySelectorAll(selector)); }
};

window.ArrayUtils = {
  groupBy: function(arr, key) {
    return arr.reduce((acc, item) => {
      const k = item[key];
      if (!acc[k]) acc[k] = [];
      acc[k].push(item);
      return acc;
    }, {});
  },
  sortBy: function(arr, key, ascending = true) {
    return [...arr].sort((a, b) => {
      const cmp = a[key] < b[key] ? -1 : a[key] > b[key] ? 1 : 0;
      return ascending ? cmp : -cmp;
    });
  },
  find: function(arr, predicate) { return arr.find(predicate); },
  filterBy: function(arr, key, value) { return arr.filter(item => item[key] === value); },
  flatten: function(arr) { return arr.reduce((acc, item) => acc.concat(item), []); },
  unique: function(arr, key = null) {
    if (key) {
      const seen = new Set();
      return arr.filter(item => { const v = item[key]; if (seen.has(v)) return false; seen.add(v); return true; });
    }
    return [...new Set(arr)];
  }
};

window.StringUtils = {
  capitalize: function(str) { return str.charAt(0).toUpperCase() + str.slice(1); },
  lower: function(str) { return str.toLowerCase(); },
  trim: function(str) { return (str || '').trim(); },
  slugify: function(str) { return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); },
  truncate: function(str, length, suffix = '...') {
    if (str.length <= length) return str;
    return str.substring(0, length - suffix.length) + suffix;
  },
  contains: function(str, substr, caseSensitive = false) {
    return caseSensitive ? str.includes(substr) : str.toLowerCase().includes(substr.toLowerCase());
  }
};

window.FormatUtils = {
  currency: function(num, currency = 'USD') {
    return new Intl.NumberFormat('en-US', {style: 'currency', currency}).format(num);
  },
  number: function(num, decimals = 0) {
    return num.toLocaleString('en-US', {minimumFractionDigits: decimals, maximumFractionDigits: decimals});
  },
  dateISO: function(date = new Date()) { return date.toISOString().split('T')[0]; },
  dateReadable: function(date) {
    return date.toLocaleDateString('en-US', {year: 'numeric', month: 'short', day: 'numeric'});
  },
  time: function(date = new Date()) {
    return date.toLocaleTimeString('en-US', {hour12: false, hour: '2-digit', minute: '2-digit'});
  }
};
