const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const { showNotification } = require('../scripts/notifications');

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
});

test('showNotification with delay 0 allows subsequent notifications', () => {
  setupDom();
  const notificationDiv = document.getElementById('notifications');

  jest.useFakeTimers();
  showNotification('First', 'success', 0);
  jest.runAllTimers();
  expect(notificationDiv.textContent).toBe('');

  showNotification('Second', 'error', 1000);
  expect(notificationDiv.textContent).toBe('Second');
  jest.runAllTimers();
  jest.useRealTimers();
});
