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
  window.alert = jest.fn();
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

test('shows away-from-home notification', () => {
  const win = setupDom({
    equipmentItems: { 'E1': { name: 'Scanner', homeStation: 'A' } },
    records: [
      { station: 'B', equipmentBarcodes: ['E1'], action: 'Check-Out' },
      { station: 'B', equipmentBarcodes: ['E1'], action: 'Check-In' }
    ]
  });
  win.updateNotifications();
  const notificationDiv = win.document.getElementById('notifications');
  expect(notificationDiv.textContent).toContain('Equipment Away From Home: E1 (Scanner)');
  expect(notificationDiv.classList.contains('visible')).toBe(true);
});

test('clears away-from-home notification when equipment returns home', () => {
  let win = setupDom({
    equipmentItems: { 'E1': { name: 'Scanner', homeStation: 'A' } },
    records: [
      { station: 'B', equipmentBarcodes: ['E1'], action: 'Check-In' }
    ]
  });
  win.updateNotifications();
  let notificationDiv = win.document.getElementById('notifications');
  expect(notificationDiv.textContent).toContain('Equipment Away From Home');
  win = setupDom({
    equipmentItems: { 'E1': { name: 'Scanner', homeStation: 'A' } },
    records: [
      { station: 'B', equipmentBarcodes: ['E1'], action: 'Check-In' },
      { station: 'A', equipmentBarcodes: ['E1'], action: 'Check-In' }
    ]
  });
  win.updateNotifications();
  notificationDiv = win.document.getElementById('notifications');
  expect(notificationDiv.textContent).toBe('');
  expect(notificationDiv.classList.contains('visible')).toBe(false);
});
