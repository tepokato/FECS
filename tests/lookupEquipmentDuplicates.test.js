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
  window.alert = jest.fn();
  localStorage.setItem('employees', JSON.stringify({}));
  localStorage.setItem('equipmentItems', JSON.stringify({ E1: 'Scanner' }));
  localStorage.setItem('records', JSON.stringify([]));
  window.eval(script);
  return window;
}

afterEach(() => {
  delete global.window;
  delete global.document;
  delete global.localStorage;
});

test('duplicate equipment barcode clears input and shows error', () => {
  jest.useFakeTimers();
  const win = setupDom();
  const { document } = win;

  const firstInput = document.getElementById('equipment0');
  firstInput.value = 'E1';
  firstInput.dispatchEvent(new win.Event('input', { bubbles: true }));
  expect(firstInput.disabled).toBe(true);

  const secondInput = document.querySelector('#equipmentList input[name="equipment"]:not([disabled])');
  const errorSpy = jest.spyOn(win, 'showError');
  secondInput.value = 'E1';
  secondInput.dispatchEvent(new win.Event('input', { bubbles: true }));

  expect(errorSpy).toHaveBeenCalled();
  expect(secondInput.disabled).toBe(false);
  expect(secondInput.value).toBe('');
  expect(document.querySelectorAll('#equipmentList input[name="equipment"]').length).toBe(2);

  jest.runAllTimers();
  jest.useRealTimers();
});

