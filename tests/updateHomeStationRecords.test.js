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

function setupDom({ equipmentItems = {}, records = [] } = {}) {
  const dom = new JSDOM(html, { url: 'http://localhost', runScripts: 'dangerously' });
  const { window } = dom;
  global.window = window;
  global.document = window.document;
  global.localStorage = window.localStorage;
  localStorage.setItem('employees', JSON.stringify({}));
  localStorage.setItem('equipmentItems', JSON.stringify(equipmentItems));
  localStorage.setItem('records', JSON.stringify(records));
  window.eval(scripts);
  return window;
}

afterEach(() => {
  delete global.window;
  delete global.document;
  delete global.localStorage;
});

test('clears notification when latest record matches new home station', () => {
  const win = setupDom({
    equipmentItems: { 'E1': { name: 'Scanner', homeStation: 'A' } },
    records: [ { station: 'B', equipmentBarcodes: ['E1'], action: 'Check-In' } ]
  });
  const notificationDiv = win.document.getElementById('notifications');
  expect(notificationDiv.textContent).toContain('Equipment Away From Home');
  win.updateEquipmentHomeStation('E1', 'B');
  const stored = JSON.parse(win.localStorage.getItem('records'));
  expect(stored).toHaveLength(1);
  expect(notificationDiv.textContent).toBe('');
  expect(notificationDiv.classList.contains('visible')).toBe(false);
});

test('appends synthetic check-in when last record differs from new home station', () => {
  const win = setupDom({
    equipmentItems: { 'E1': { name: 'Scanner', homeStation: 'A' } },
    records: [ { station: 'A', equipmentBarcodes: ['E1'], action: 'Check-In' } ]
  });
  const notificationDiv = win.document.getElementById('notifications');
  win.updateEquipmentHomeStation('E1', 'B');
  const stored = JSON.parse(win.localStorage.getItem('records'));
  expect(stored).toHaveLength(2);
  const last = stored[stored.length - 1];
  expect(last.station).toBe('B');
  expect(last.action).toBe('Check-In');
  expect(last.equipmentBarcodes).toEqual(['E1']);
  expect(notificationDiv.textContent).toBe('');
  expect(notificationDiv.classList.contains('visible')).toBe(false);
});

