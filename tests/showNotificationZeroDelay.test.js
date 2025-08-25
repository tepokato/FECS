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
  window.eval(script);
  return window;
}

afterEach(() => {
  delete global.window;
  delete global.document;
  delete global.localStorage;
});

test('showNotification with delay 0 allows subsequent notifications', () => {
  const win = setupDom();
  const notificationDiv = win.document.getElementById('notifications');

  jest.useFakeTimers();
  win.showNotification('First', 'success', 0);
  jest.runAllTimers();
  expect(notificationDiv.textContent).toBe('');

  win.showNotification('Second', 'error', 1000);
  expect(notificationDiv.textContent).toBe('Second');
  jest.runAllTimers();
  jest.useRealTimers();
});
