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

test('equipment added with home station persists the field', () => {
  jest.useFakeTimers();
  const win = setupDom();
  const { document, localStorage } = win;
  document.getElementById('equipName').value = 'Scanner';
  document.getElementById('equipSerial').value = 'E1';
  document.getElementById('equipStation').value = 'A';
  win.addEquipmentAdmin();
  jest.runAllTimers();
  jest.useRealTimers();
  const stored = JSON.parse(localStorage.getItem('equipmentItems'));
  expect(stored).toEqual({ E1: { name: 'Scanner', homeStation: 'A' } });
});

