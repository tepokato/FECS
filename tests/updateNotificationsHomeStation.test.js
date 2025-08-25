const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const { updateNotifications } = require('../scripts/notifications');

const html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');

function setupDom() {
  const dom = new JSDOM(html, { url: 'http://localhost' });
  global.window = dom.window;
  global.document = dom.window.document;
  return dom.window;
}

afterEach(() => {
  delete global.window;
  delete global.document;
  delete global.equipmentItems;
  delete global.records;
});

test('updateNotifications flags away-from-home equipment and clears when returned', () => {
  setupDom();
  global.equipmentItems = { E1: { name: 'Scanner', homeStation: 'A' } };
  global.records = [
    { station: 'B', equipmentBarcodes: ['E1'], action: 'Check-In' }
  ];
  updateNotifications();
  const notificationDiv = document.getElementById('notifications');
  expect(notificationDiv.textContent).toBe('Equipment Away From Home: E1 (Scanner)');
  expect(notificationDiv.classList.contains('visible')).toBe(true);

  global.records.push({ station: 'A', equipmentBarcodes: ['E1'], action: 'Check-In' });
  updateNotifications();
  expect(notificationDiv.textContent).toBe('');
  expect(notificationDiv.classList.contains('visible')).toBe(false);
});

