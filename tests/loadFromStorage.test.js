const { JSDOM } = require('jsdom');
const { loadFromStorage } = require('../scripts/storage');

function setupDom() {
  const dom = new JSDOM('', { url: 'http://localhost' });
  global.localStorage = dom.window.localStorage;
}

afterEach(() => {
  delete global.localStorage;
});

test('loadFromStorage clears corrupt data and persists defaults', () => {
  jest.useFakeTimers();
  setupDom();
  localStorage.setItem('records', 'not-json');
  const result = loadFromStorage('records', []);
  expect(result).toEqual([]);
  expect(localStorage.getItem('records')).toBe('[]');
  jest.runAllTimers();
  jest.useRealTimers();
});
