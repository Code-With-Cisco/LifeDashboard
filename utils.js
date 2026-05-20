/**
 * utils.js — Stateless DOM and data utility helpers.
 *
 * PURPOSE: Thin wrappers around common browser APIs so the rest of the app
 *   avoids raw document calls and repeated formatting boilerplate.
 *
 * PUBLIC INTERFACE:
 *   DOM         — byId, value, setText, setHTML, addClass, removeClass,
 *                 toggleClass, hasClass, show, hide, queryAll
 *   ArrayUtils  — groupBy, sortBy, find, filterBy, flatten, unique
 *   StringUtils — capitalize, lower, trim, slugify, truncate, contains
 *   FormatUtils — currency, number, dateISO, dateReadable, time
 *
 * CONNECTED TO: logs.js (DOM.byId calls Logger.error when element is missing)
 */
window.DOM = {
  /**
   * Look up an element by id. Logs an error if not found.
   * @param {string} id
   * @returns {HTMLElement|null}
   */
  byId: function(id) {
    const el = document.getElementById(id);
    if (!el) Logger.error('dom', 'byId.not_found', {id});
    return el;
  },
  /**
   * Return the current .value of an input element, or ''.
   * @param {string} id
   * @returns {string}
   */
  value: function(id) { return this.byId(id)?.value || ''; },
  /**
   * Set element text content.
   * @param {string} id
   * @param {string} text
   * @returns {void}
   */
  setText: function(id, text) { const el = this.byId(id); if (el) el.textContent = text; },
  /**
   * Set element inner HTML.
   * @param {string} id
   * @param {string} html
   * @returns {void}
   */
  setHTML: function(id, html) { const el = this.byId(id); if (el) el.innerHTML = html; },
  /**
   * Add a CSS class to an element.
   * @param {string} id
   * @param {string} cls
   * @returns {void}
   */
  addClass: function(id, cls) { this.byId(id)?.classList.add(cls); },
  /**
   * Remove a CSS class from an element.
   * @param {string} id
   * @param {string} cls
   * @returns {void}
   */
  removeClass: function(id, cls) { this.byId(id)?.classList.remove(cls); },
  /**
   * Toggle a CSS class on an element.
   * @param {string} id
   * @param {string} cls
   * @returns {void}
   */
  toggleClass: function(id, cls) { this.byId(id)?.classList.toggle(cls); },
  /**
   * Return true if the element has the given CSS class.
   * @param {string} id
   * @param {string} cls
   * @returns {boolean}
   */
  hasClass: function(id, cls) { return this.byId(id)?.classList.contains(cls) || false; },
  /**
   * Show an element by setting its display style.
   * @param {string} id
   * @param {string} [display='block']
   * @returns {void}
   */
  show: function(id, display = 'block') { const el = this.byId(id); if (el) el.style.display = display; },
  /**
   * Hide an element by setting display to 'none'.
   * @param {string} id
   * @returns {void}
   */
  hide: function(id) { const el = this.byId(id); if (el) el.style.display = 'none'; },
  /**
   * Query all elements matching a CSS selector.
   * @param {string} selector
   * @returns {HTMLElement[]}
   */
  queryAll: function(selector) { return Array.from(document.querySelectorAll(selector)); }
};

window.ArrayUtils = {
  /**
   * Group an array of objects by the value of a key.
   * @param {Object[]} arr
   * @param {string}   key
   * @returns {Object.<string, Object[]>}
   */
  groupBy: function(arr, key) {
    return arr.reduce((acc, item) => {
      const k = item[key];
      if (!acc[k]) acc[k] = [];
      acc[k].push(item);
      return acc;
    }, {});
  },
  /**
   * Return a sorted copy of the array by a key.
   * @param {Object[]} arr
   * @param {string}   key
   * @param {boolean}  [ascending=true]
   * @returns {Object[]}
   */
  sortBy: function(arr, key, ascending = true) {
    return [...arr].sort((a, b) => {
      const cmp = a[key] < b[key] ? -1 : a[key] > b[key] ? 1 : 0;
      return ascending ? cmp : -cmp;
    });
  },
  /**
   * Find the first element matching a predicate.
   * @param {Array}    arr
   * @param {Function} predicate
   * @returns {*}
   */
  find: function(arr, predicate) { return arr.find(predicate); },
  /**
   * Filter an array to elements where item[key] === value.
   * @param {Object[]} arr
   * @param {string}   key
   * @param {*}        value
   * @returns {Object[]}
   */
  filterBy: function(arr, key, value) { return arr.filter(item => item[key] === value); },
  /**
   * Flatten one level of a nested array.
   * @param {Array[]} arr
   * @returns {Array}
   */
  flatten: function(arr) { return arr.reduce((acc, item) => acc.concat(item), []); },
  /**
   * Return an array with duplicate values removed.
   * If key is provided, uniqueness is determined by item[key].
   * @param {Array}  arr
   * @param {string} [key=null]
   * @returns {Array}
   */
  unique: function(arr, key = null) {
    if (key) {
      const seen = new Set();
      return arr.filter(item => { const v = item[key]; if (seen.has(v)) return false; seen.add(v); return true; });
    }
    return [...new Set(arr)];
  }
};

window.StringUtils = {
  /**
   * Capitalize the first character of a string.
   * @param {string} str
   * @returns {string}
   */
  capitalize: function(str) { return str.charAt(0).toUpperCase() + str.slice(1); },
  /**
   * Convert a string to lower case.
   * @param {string} str
   * @returns {string}
   */
  lower: function(str) { return str.toLowerCase(); },
  /**
   * Trim leading and trailing whitespace; handles null/undefined safely.
   * @param {string} str
   * @returns {string}
   */
  trim: function(str) { return (str || '').trim(); },
  /**
   * Convert a string to a URL-safe slug (lowercase letters, digits, hyphens only).
   * @param {string} str
   * @returns {string}
   */
  slugify: function(str) { return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); },
  /**
   * Truncate a string to at most `length` characters, appending suffix if cut.
   * @param {string} str
   * @param {number} length  - maximum total length including the suffix
   * @param {string} [suffix='...']
   * @returns {string}
   */
  truncate: function(str, length, suffix = '...') {
    if (str.length <= length) return str;
    return str.substring(0, length - suffix.length) + suffix;
  },
  /**
   * Return true if str contains substr.
   * @param {string}  str
   * @param {string}  substr
   * @param {boolean} [caseSensitive=false]
   * @returns {boolean}
   */
  contains: function(str, substr, caseSensitive = false) {
    return caseSensitive ? str.includes(substr) : str.toLowerCase().includes(substr.toLowerCase());
  }
};

window.FormatUtils = {
  /**
   * Format a number as a currency string.
   * @param {number} num
   * @param {string} [currency='USD']
   * @returns {string}
   */
  currency: function(num, currency = 'USD') {
    return new Intl.NumberFormat('en-US', {style: 'currency', currency}).format(num);
  },
  /**
   * Format a number with a fixed number of decimal places.
   * @param {number} num
   * @param {number} [decimals=0]
   * @returns {string}
   */
  number: function(num, decimals = 0) {
    return num.toLocaleString('en-US', {minimumFractionDigits: decimals, maximumFractionDigits: decimals});
  },
  /**
   * Return a date as an ISO date string (YYYY-MM-DD).
   * @param {Date} [date=new Date()]
   * @returns {string}
   */
  dateISO: function(date = new Date()) { return date.toISOString().split('T')[0]; },
  /**
   * Return a date as a human-readable string (e.g. "Jan 1, 2025").
   * @param {Date} date
   * @returns {string}
   */
  dateReadable: function(date) {
    return date.toLocaleDateString('en-US', {year: 'numeric', month: 'short', day: 'numeric'});
  },
  /**
   * Return the current time as HH:MM (24-hour).
   * @param {Date} [date=new Date()]
   * @returns {string}
   */
  time: function(date = new Date()) {
    return date.toLocaleTimeString('en-US', {hour12: false, hour: '2-digit', minute: '2-digit'});
  }
};
