require('../services/SecurityService.js');

const Security = window.SecurityService;

describe('SecurityService', () => {
  test('escapes HTML and attribute metacharacters', () => {
    expect(Security.escapeHtml(`<img src=x onerror="boom()">'`))
      .toBe('&lt;img src=x onerror=&quot;boom()&quot;&gt;&#39;');
  });

  test('accepts only simple identifiers for inline action references', () => {
    expect(Security.safeIdentifier('81dbcc87-60dc-4969-874b-588a8dd861b7')).toBe('81dbcc87-60dc-4969-874b-588a8dd861b7');
    expect(Security.safeIdentifier("x');alert(1)//")).toBe('');
  });

  test('redacts secrets and personal identifiers before persistence', () => {
    expect(Security.redact({email: 'person@example.com', nested: {token: 'secret', count: 2}}))
      .toEqual({email: '[REDACTED]', nested: {token: '[REDACTED]', count: 2}});
    expect(Security.redactText('Contact person@example.com')).toBe('Contact [REDACTED_EMAIL]');
  });
});
