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

test('loadFromStorage clears corrupt data and persists defaults', () => {
  jest.useFakeTimers();
  const win = setupDom();
  localStorage.setItem('records', 'not-json');
  const result = win.loadFromStorage('records', []);
  expect(result).toEqual([]);
  expect(localStorage.getItem('records')).toBe('[]');
  jest.runAllTimers();
  jest.useRealTimers();
});
