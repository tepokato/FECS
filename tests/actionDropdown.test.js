const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
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
  global.window = window;
  global.document = window.document;
  global.localStorage = window.localStorage;
  window.alert = jest.fn();
  localStorage.setItem('employees', JSON.stringify({ '123': { name: 'John Doe', homeStation: '' } }));
  localStorage.setItem('equipmentItems', JSON.stringify({ 'E1': { name: 'Scanner', homeStation: '' } }));
  localStorage.setItem('records', JSON.stringify([]));
  window.eval(scripts);
  return window;
}

afterEach(() => {
  delete global.window;
  delete global.document;
  delete global.localStorage;
});

test('action dropdown toggles', () => {
  const win = setupDom();
  const btn = win.document.getElementById('actionBtn');
  const menu = win.document.getElementById('actionMenu');
  expect(menu.classList.contains('hidden')).toBe(true);
  btn.click();
  expect(menu.classList.contains('hidden')).toBe(false);
  btn.click();
  expect(menu.classList.contains('hidden')).toBe(true);
});

test('selected action stored on checkout submit', () => {
  const win = setupDom();
  const { document } = win;
  document.getElementById('badge').value = '123';
  document.getElementById('equipment0').value = 'E1';
  document.getElementById('actionBtn').click();
  document.querySelector('#actionMenu button[data-value="Check-Out"]').click();
  expect(document.getElementById('action').value).toBe('Check-Out');
  expect(document.getElementById('actionBtn').textContent).toBe('Check-Out');
  const form = document.getElementById('checkoutForm');
  jest.useFakeTimers();
  form.dispatchEvent(new win.Event('submit', { bubbles: true, cancelable: true }));
  jest.runAllTimers();
  jest.useRealTimers();
  const records = JSON.parse(localStorage.getItem('records'));
  expect(records.length).toBe(1);
  expect(records[0].action).toBe('Check-Out');
});

