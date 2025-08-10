const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
const parserScript = fs.readFileSync(path.resolve(__dirname, '../scripts/csvParser.js'), 'utf8');
const appScript = fs.readFileSync(path.resolve(__dirname, '../scripts/app.js'), 'utf8');

function setupDom() {
  const dom = new JSDOM(html, { url: 'http://localhost', runScripts: 'dangerously' });
  const { window } = dom;
  global.window = window;
  global.document = window.document;
  global.localStorage = window.localStorage;
  window.eval(parserScript);
  window.eval(appScript);
  return window;
}

afterEach(() => {
  delete global.window;
  delete global.document;
  delete global.localStorage;
});

test('handleImportEmployees skips malformed lines', () => {
  const win = setupDom();
  win.showError = jest.fn();
  win.showSuccess = jest.fn();
  win.displayEmployeeList = jest.fn();
  class MockFileReader {
    readAsText(file) {
      this.onload && this.onload({ target: { result: file.text } });
    }
  }
  win.FileReader = MockFileReader;
  const event = { target: { files: [ { text: 'Badge ID,Employee Name\n123,John\n456' } ], value: '' } };
  win.handleImportEmployees(event);
  const stored = JSON.parse(localStorage.getItem('employees'));
  expect(stored).toEqual({ '123': 'John' });
  expect(win.showError).toHaveBeenCalledWith(expect.stringContaining('line 3'));
});

test('handleImportEquipment skips malformed lines', () => {
  const win = setupDom();
  win.showError = jest.fn();
  win.showSuccess = jest.fn();
  win.displayEquipmentListAdmin = jest.fn();
  class MockFileReader {
    readAsText(file) {
      this.onload && this.onload({ target: { result: file.text } });
    }
  }
  win.FileReader = MockFileReader;
  const event = { target: { files: [ { text: 'Equipment Serial,Equipment Name\nEQ1,Hammer\nEQ2' } ], value: '' } };
  win.handleImportEquipment(event);
  const stored = JSON.parse(localStorage.getItem('equipmentItems'));
  expect(stored).toEqual({ 'EQ1': 'Hammer' });
  expect(win.showError).toHaveBeenCalledWith(expect.stringContaining('line 3'));
});

test('handleImportEmployees surfaces read errors', () => {
  const win = setupDom();
  win.showError = jest.fn();
  win.showSuccess = jest.fn();
  win.displayEmployeeList = jest.fn();
  class MockFileReader {
    readAsText(file) {
      this.onerror && this.onerror(new Error('fail'));
    }
  }
  win.FileReader = MockFileReader;
  const event = { target: { files: [ { text: 'ignored', fail: true } ], value: '' } };
  win.handleImportEmployees(event);
  expect(win.showError).toHaveBeenCalled();
  expect(win.showSuccess).not.toHaveBeenCalled();
  expect(localStorage.getItem('employees')).toBeNull();
});
