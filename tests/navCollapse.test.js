const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
const script = fs.readFileSync(path.resolve(__dirname, '../scripts/app.js'), 'utf8');
const css = fs.readFileSync(path.resolve(__dirname, '../styles/main.css'), 'utf8');

function setupDom() {
  const dom = new JSDOM(html, { url: 'http://localhost', runScripts: 'dangerously' });
  const { window } = dom;
  window.document.head.insertAdjacentHTML('beforeend', `<style>${css}</style>`);
  global.window = window;
  global.document = window.document;
  global.localStorage = window.localStorage;
  window.alert = jest.fn();
  localStorage.setItem('employees', JSON.stringify({}));
  localStorage.setItem('equipmentItems', JSON.stringify({}));
  localStorage.setItem('records', JSON.stringify([]));
  window.eval(script);
  return window;
}

afterEach(() => {
  delete global.window;
  delete global.document;
  delete global.localStorage;
});

test('nav collapses when link clicked', () => {
  const win = setupDom();
  const nav = win.document.getElementById('mainNav');
  const navToggle = win.document.getElementById('navToggle');
  nav.classList.add('show');
  navToggle.setAttribute('aria-expanded', 'true');
  win.document.getElementById('navAdmin').click();
  expect(nav.classList.contains('show')).toBe(false);
  expect(navToggle.getAttribute('aria-expanded')).toBe('false');
});

test('nav toggle open class reflects menu state', () => {
  const win = setupDom();
  const nav = win.document.getElementById('mainNav');
  const navToggle = win.document.getElementById('navToggle');

  expect(nav.classList.contains('show')).toBe(false);
  expect(navToggle.classList.contains('open')).toBe(false);

  navToggle.click();
  expect(nav.classList.contains('show')).toBe(true);
  expect(navToggle.classList.contains('open')).toBe(true);

  navToggle.click();
  expect(nav.classList.contains('show')).toBe(false);
  expect(navToggle.classList.contains('open')).toBe(false);
});

test('nav toggle updates text, icon, and aria-label', () => {
  const win = setupDom();
  const navToggle = win.document.getElementById('navToggle');
  const icon = navToggle.querySelector('.nav-icon');
  const label = navToggle.querySelector('.nav-text');

  expect(icon.textContent).toBe('menu');
  expect(label.textContent.trim()).toBe('Menu');
  expect(navToggle.getAttribute('aria-label')).toBe('Menu');

  navToggle.click();

  expect(icon.textContent).toBe('close');
  expect(label.textContent.trim()).toBe('Close');
  expect(navToggle.getAttribute('aria-label')).toBe('Close');

  navToggle.click();

  expect(icon.textContent).toBe('menu');
  expect(label.textContent.trim()).toBe('Menu');
  expect(navToggle.getAttribute('aria-label')).toBe('Menu');
});

test('nav uses white container when menu opened', () => {
  const win = setupDom();
  win.document.getElementById('navToggle').click();
  const nav = win.document.getElementById('mainNav');
  expect(nav.classList.contains('show')).toBe(true);

  const sheet = win.document.styleSheets[0];
  const mediaRule = Array.from(sheet.cssRules).find(
    r => r.type === win.CSSRule.MEDIA_RULE && r.media.mediaText === '(max-width: 37.5rem)'
  );
  const containerRule = Array.from(mediaRule.cssRules).find(r => r.selectorText === 'nav .nav-container');
  const ruleStyle = containerRule.style;

  expect(ruleStyle.getPropertyValue('background')).toBe('#fff');
  expect(ruleStyle.getPropertyValue('max-width')).toBe('37.5rem');
  expect(ruleStyle.getPropertyValue('margin')).toBe('1.25rem auto');
  expect(ruleStyle.getPropertyValue('border-radius')).toBe('0.5rem');
  expect(ruleStyle.getPropertyValue('box-shadow')).toBe('0 0 0.625rem rgba(0,0,0,0.1)');
});

test('nav collapses when viewport enlarges', () => {
  const win = setupDom();
  const nav = win.document.getElementById('mainNav');
  const navToggle = win.document.getElementById('navToggle');

  navToggle.click();
  expect(nav.classList.contains('show')).toBe(true);

  win.innerWidth = 800;
  win.dispatchEvent(new win.Event('resize'));

  expect(nav.classList.contains('show')).toBe(false);
  expect(navToggle.getAttribute('aria-expanded')).toBe('false');
  expect(navToggle.classList.contains('open')).toBe(false);
});

test('nav closes when clicking outside', () => {
  const win = setupDom();
  const navToggle = win.document.getElementById('navToggle');
  navToggle.click();
  const outside = win.document.createElement('div');
  win.document.body.appendChild(outside);
  outside.click();
  expect(win.document.getElementById('mainNav').classList.contains('show')).toBe(false);
  expect(navToggle.getAttribute('aria-expanded')).toBe('false');
});

test('nav closes on Escape key', () => {
  const win = setupDom();
  const navToggle = win.document.getElementById('navToggle');
  navToggle.click();
  const event = new win.KeyboardEvent('keydown', { key: 'Escape' });
  win.document.dispatchEvent(event);
  const nav = win.document.getElementById('mainNav');
  expect(nav.classList.contains('show')).toBe(false);
  expect(navToggle.getAttribute('aria-expanded')).toBe('false');
});
