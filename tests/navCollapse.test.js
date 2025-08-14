const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
const script = fs.readFileSync(path.resolve(__dirname, '../scripts/app.js'), 'utf8');

function setupDom() {
  const dom = new JSDOM(html, { url: 'http://localhost', runScripts: 'dangerously' });
  const { window } = dom;
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
