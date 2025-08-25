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
  window.eval(scripts);
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
  const event = { target: { files: [ { text: 'Badge ID,Employee Name,Home Station\n123,John,HUB1\n456' } ], value: '' } };
  win.handleImportEmployees(event);
  const stored = JSON.parse(localStorage.getItem('employees'));
  expect(stored).toEqual({ '123': { name: 'John', homeStation: 'HUB1' } });
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
  const event = { target: { files: [ { text: 'Equipment Serial,Equipment Name,Home Station\nEQ1,Hammer,HUB\nEQ2' } ], value: '' } };
  win.handleImportEquipment(event);
  const stored = JSON.parse(localStorage.getItem('equipmentItems'));
  expect(stored).toEqual({ 'EQ1': { name: 'Hammer', homeStation: 'HUB' } });
  expect(win.showError).toHaveBeenCalledWith(expect.stringContaining('line 3'));
});

test('handleImportEmployees imports values with surrounding spaces', () => {
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
  const csv = 'Badge ID,Employee Name,Home Station\n 123 ,  John Doe  ,  STN1 ';
  const event = { target: { files: [ { text: csv } ], value: '' } };
  win.handleImportEmployees(event);
  const stored = JSON.parse(localStorage.getItem('employees'));
  expect(stored).toEqual({ '123': { name: 'John Doe', homeStation: 'STN1' } });
});

test('handleImportEquipment imports values with surrounding spaces', () => {
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
  const csv = 'Equipment Serial,Equipment Name,Home Station\n EQ1 ,  Hammer  ,  STN2 ';
  const event = { target: { files: [ { text: csv } ], value: '' } };
  win.handleImportEquipment(event);
  const stored = JSON.parse(localStorage.getItem('equipmentItems'));
  expect(stored).toEqual({ 'EQ1': { name: 'Hammer', homeStation: 'STN2' } });
});

test('handleImportEmployees defaults home station when column absent', () => {
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
  const csv = 'Badge ID,Employee Name\n123,John';
  const event = { target: { files: [ { text: csv } ], value: '' } };
  win.handleImportEmployees(event);
  const stored = JSON.parse(localStorage.getItem('employees'));
  expect(stored).toEqual({ '123': { name: 'John', homeStation: '' } });
});

test('handleImportEquipment defaults home station when column absent', () => {
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
  const csv = 'Equipment Serial,Equipment Name\nEQ1,Hammer';
  const event = { target: { files: [ { text: csv } ], value: '' } };
  win.handleImportEquipment(event);
  const stored = JSON.parse(localStorage.getItem('equipmentItems'));
  expect(stored).toEqual({ 'EQ1': { name: 'Hammer', homeStation: '' } });
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

test('handleImportEmployees shows loading state and restores after success', () => {
  const win = setupDom();
  win.showError = jest.fn();
  win.showSuccess = jest.fn();
  win.displayEmployeeList = jest.fn();
  let readerInstance;
  class MockFileReader {
    constructor() { readerInstance = this; }
    readAsText() {}
  }
  win.FileReader = MockFileReader;
  const button = win.document.getElementById('importEmployeesAction');
  const event = { target: { files: [ { text: 'Badge ID,Employee Name,Home Station\n123,John,' } ], value: '' } };
  win.handleImportEmployees(event);
  expect(button.disabled).toBe(true);
  expect(button.textContent).toBe('Importing...');
  readerInstance.onload({ target: { result: event.target.files[0].text } });
  expect(button.disabled).toBe(false);
  expect(button.textContent).toBe('Import Employees CSV');
});

test('handleImportEquipment restores button after failure', () => {
  const win = setupDom();
  win.showError = jest.fn();
  win.showSuccess = jest.fn();
  win.displayEquipmentListAdmin = jest.fn();
  let readerInstance;
  class MockFileReader {
    constructor() { readerInstance = this; }
    readAsText() {}
  }
  win.FileReader = MockFileReader;
  const button = win.document.getElementById('importEquipmentAction');
  const event = { target: { files: [ { text: 'ignored' } ], value: '' } };
  win.handleImportEquipment(event);
  expect(button.disabled).toBe(true);
  readerInstance.onerror(new Error('fail'));
  expect(button.disabled).toBe(false);
  expect(button.textContent).toBe('Import Equipment CSV');
  expect(win.showError).toHaveBeenCalled();
});

test('handleImportEmployees prompts before overwriting existing IDs', () => {
  const win = setupDom();
  win.showError = jest.fn();
  win.showSuccess = jest.fn();
  win.displayEmployeeList = jest.fn();
  win.confirm = jest.fn().mockReturnValue(false);
  class MockFileReader {
    readAsText(file) {
      this.onload && this.onload({ target: { result: file.text } });
    }
  }
  win.FileReader = MockFileReader;
  let event = { target: { files: [ { text: 'Badge ID,Employee Name,Home Station\n123,Original,' } ], value: '' } };
  win.handleImportEmployees(event);
  event = { target: { files: [ { text: 'Badge ID,Employee Name,Home Station\n123,Updated,H2' } ], value: '' } };
  win.handleImportEmployees(event);
  expect(win.confirm).toHaveBeenCalledWith(expect.stringContaining('123'));
  const stored = JSON.parse(localStorage.getItem('employees'));
  expect(stored).toEqual({ '123': { name: 'Original', homeStation: '' } });
});

test('handleImportEquipment prompts before overwriting existing IDs', () => {
  const win = setupDom();
  win.showError = jest.fn();
  win.showSuccess = jest.fn();
  win.displayEquipmentListAdmin = jest.fn();
  win.confirm = jest.fn().mockReturnValue(false);
  class MockFileReader {
    readAsText(file) {
      this.onload && this.onload({ target: { result: file.text } });
    }
  }
  win.FileReader = MockFileReader;
  let event = { target: { files: [ { text: 'Equipment Serial,Equipment Name,Home Station\nEQ1,Hammer,' } ], value: '' } };
  win.handleImportEquipment(event);
  event = { target: { files: [ { text: 'Equipment Serial,Equipment Name,Home Station\nEQ1,Sledge,H1' } ], value: '' } };
  win.handleImportEquipment(event);
  expect(win.confirm).toHaveBeenCalledWith(expect.stringContaining('EQ1'));
  const stored = JSON.parse(localStorage.getItem('equipmentItems'));
  expect(stored).toEqual({ 'EQ1': { name: 'Hammer', homeStation: '' } });
});

test('setLoading restores nested button HTML', () => {
  const win = setupDom();
  const button = win.document.createElement('button');
  const originalHtml = '<span class="label">Import <strong>Data</strong></span>';
  button.innerHTML = originalHtml;
  win.document.body.appendChild(button);
  win.setLoading(button, true, 'Loading...');
  expect(button.disabled).toBe(true);
  expect(button.textContent).toBe('Loading...');
  win.setLoading(button, false);
  expect(button.disabled).toBe(false);
  expect(button.innerHTML).toBe(originalHtml);
  expect(button.dataset.originalHtml).toBeUndefined();
});
