/**
 * SecurityService - small, dependency-free browser security helpers.
 *
 * Keep this module pure so renderers and the logger can share the same escaping,
 * identifier validation, and privacy-preserving redaction rules.
 */
(function(root) {
  'use strict';

  const SENSITIVE_KEY = /(pass(word)?|secret|token|authorization|api[_-]?key|email|phone|address)/i;
  const EMAIL = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
  const BEARER_OR_JWT = /\b(?:Bearer\s+)?eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/gi;

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function safeIdentifier(value) {
    const candidate = String(value == null ? '' : value);
    return /^[A-Za-z0-9_-]{1,128}$/.test(candidate) ? candidate : '';
  }

  // A browser configuration is public. Fail before making any network request
  // when an operator accidentally supplies a privileged or unknown key.
  function validatePublicConfig(value) {
    const input = value || {};
    let url;
    try { url = new URL(input.supabaseUrl); }
    catch (_) { throw new Error('A valid Supabase URL is required.'); }
    const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    if ((url.protocol !== 'https:' && !(loopback && url.protocol === 'http:')) ||
        url.username || url.password || url.search || url.hash || url.pathname !== '/') {
      throw new Error('Use an HTTPS Supabase origin, or HTTP on localhost.');
    }
    const key = String(input.supabaseKey || '');
    let publicKey = /^sb_publishable_[A-Za-z0-9_-]+$/.test(key);
    if (!publicKey && /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(key)) {
      try {
        const payload = key.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
        const claims = JSON.parse(atob(payload));
        publicKey = claims.role === 'anon';
      } catch (_) { publicKey = false; }
    }
    if (!publicKey) throw new Error('Only a Supabase publishable or anon key may be used in the browser.');
    return {supabaseUrl: url.origin, supabaseKey: key, allowSelfSignup: input.allowSelfSignup === true};
  }

  function redactText(value) {
    return String(value == null ? '' : value)
      .replace(EMAIL, '[REDACTED_EMAIL]')
      .replace(BEARER_OR_JWT, '[REDACTED_TOKEN]')
      .slice(0, 500);
  }

  function redact(value, depth) {
    const level = depth || 0;
    if (level > 4) return '[TRUNCATED]';
    if (value == null || typeof value === 'boolean' || typeof value === 'number') return value;
    if (typeof value === 'string') return redactText(value);
    if (Array.isArray(value)) return value.slice(0, 25).map(item => redact(item, level + 1));
    if (typeof value === 'object') {
      const output = {};
      Object.keys(value).slice(0, 25).forEach(key => {
        output[key] = SENSITIVE_KEY.test(key) ? '[REDACTED]' : redact(value[key], level + 1);
      });
      return output;
    }
    return redactText(value);
  }

  root.SecurityService = Object.freeze({escapeHtml, escapeAttr: escapeHtml, safeIdentifier, redactText, redact, validatePublicConfig});
  if (typeof module !== 'undefined' && module.exports) module.exports = root.SecurityService;
})(typeof window !== 'undefined' ? window : globalThis);
