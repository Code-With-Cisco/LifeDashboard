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

  root.SecurityService = Object.freeze({escapeHtml, escapeAttr: escapeHtml, safeIdentifier, redactText, redact});
})(typeof window !== 'undefined' ? window : globalThis);
