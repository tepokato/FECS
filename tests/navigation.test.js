const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
const css = fs.readFileSync(path.resolve(__dirname, '../styles/main.css'), 'utf8');
const scripts = [
  '../scripts/storage.js',
  '../scripts/notifications.js',
  '../scripts/admin.js',
  '../scripts/csvParser.js',
  '../scripts/records.js',
  '../scripts/app.js'
].map(p => fs.readFileSync(path.resolve(__dirname, p), 'utf8')).join('\n');

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
  window.eval(scripts);
  return window;
}

afterEach(() => {
  delete global.window;
  delete global.document;
  delete global.localStorage;
});

test('navToggle button is removed', () => {
  const win = setupDom();
  expect(win.document.getElementById('navToggle')).toBeNull();
});

test('navigation links display sections', () => {
  const win = setupDom();
  const navAdmin = win.document.getElementById('navAdmin');
  const adminSection = win.document.getElementById('admin');
  const checkoutSection = win.document.getElementById('checkout');
  expect(adminSection.classList.contains('hidden')).toBe(true);
  navAdmin.click();
  expect(adminSection.classList.contains('hidden')).toBe(false);
  expect(checkoutSection.classList.contains('hidden')).toBe(true);
});

test('nav is visible by default', () => {
  const win = setupDom();
  const nav = win.document.getElementById('mainNav');
  expect(win.getComputedStyle(nav).display).not.toBe('none');
});

test('pressing Tab on last menu item closes dropdown', () => {
  const win = setupDom();
  const btn = win.document.getElementById('actionBtn');
  const menu = win.document.getElementById('actionMenu');
  // open the dropdown
  btn.click();
  const items = menu.querySelectorAll('button');
  const lastItem = items[items.length - 1];
  lastItem.focus();
  lastItem.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Tab' }));
  expect(menu.classList.contains('hidden')).toBe(true);
  expect(win.document.activeElement).toBe(btn);
});

