const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');

describe('application shell', () => {
  beforeAll(() => {
    document.documentElement.innerHTML = html;
  });

  test('keeps element ids unique and includes the profile editor controls', () => {
    const ids = [...document.querySelectorAll('[id]')].map(element => element.id);
    const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
    expect(duplicates).toEqual([]);
    expect(document.getElementById('profile-modal')).not.toBeNull();
    expect(document.getElementById('profile-save-btn')).not.toBeNull();
    expect(document.querySelector('.nav-profile')?.getAttribute('aria-label')).toBe('Edit profile');
  });

  test('loads pure services before the application entry point', () => {
    const scripts = [...document.querySelectorAll('script[src]')].map(script => script.getAttribute('src'));
    expect(scripts.indexOf('services/ProfileService.js')).toBeLessThan(scripts.indexOf('app.js'));
    expect(scripts.indexOf('services/WorkoutService.js')).toBeLessThan(scripts.indexOf('app.js'));
  });

  test('inline UI handlers are syntactically valid', () => {
    ['onclick', 'onkeydown', 'onchange', 'oninput', 'onblur'].forEach(attribute => {
      document.querySelectorAll(`[${attribute}]`).forEach(element => {
        expect(() => new Function('event', element.getAttribute(attribute))).not.toThrow();
      });
    });
  });

  test('mobile layout stacks the app and exposes the navigation drawer', () => {
    expect(css).toMatch(/#app\.show\{flex-direction:column\}/);
    expect(css).toMatch(/#nav\.mobile-open\{display:flex/);
    expect(css).toMatch(/\.dash-main-grid\{grid-template-columns:1fr\}/);
  });
});
