const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
const script = fs.readFileSync(path.resolve(__dirname, '../scripts/app.js'), 'utf8');

function setupDom({ employees = {}, equipmentItems = {}, records = [] } = {}) {
  const dom = new JSDOM(html, { url: 'http://localhost', runScripts: 'dangerously' });
  const { window } = dom;
  global.window = window;
  global.document = window.document;
  global.localStorage = window.localStorage;
  window.alert = jest.fn();
  localStorage.setItem('employees', JSON.stringify(employees));
  localStorage.setItem('equipmentItems', JSON.stringify(equipmentItems));
  localStorage.setItem('records', JSON.stringify(records));
  window.eval(script);
  window.HTMLAnchorElement.prototype.click = jest.fn();
  return window;
}

afterEach(() => {
  delete global.window;
  delete global.document;
  delete global.localStorage;
});

test('exportEmployeesCSV escapes quotes in names', () => {
  const win = setupDom({ employees: { '1': 'John "JJ" Doe' } });
  const spy = jest.spyOn(document.body, 'appendChild');
  win.exportEmployeesCSV();
  const link = spy.mock.calls[0][0];
  const csv = decodeURI(link.href).split('charset=utf-8,')[1];
  const row = csv.trim().split('\n')[1];
  expect(row).toBe('"1","John ""JJ"" Doe"');
  spy.mockRestore();
});

test('exportEquipmentCSV escapes quotes in names', () => {
  const win = setupDom({ equipmentItems: { 'EQ1': 'Hammer "XL"' } });
  const spy = jest.spyOn(document.body, 'appendChild');
  win.exportEquipmentCSV();
  const link = spy.mock.calls[0][0];
  const csv = decodeURI(link.href).split('charset=utf-8,')[1];
  const row = csv.trim().split('\n')[1];
  expect(row).toBe('"EQ1","Hammer ""XL"""');
  spy.mockRestore();
});

test('exportRecordsCSV escapes quotes in fields', () => {
  const records = [{
    timestamp: '2023-01-01T00:00:00',
    badge: '1',
    employeeName: 'John "JJ" Doe',
    equipmentBarcodes: ['EQ1'],
    equipmentNames: ['Hammer "XL"'],
    action: 'Check-Out',
    recordDate: '2023-01-01'
  }];
  const win = setupDom({ records });
  const spy = jest.spyOn(document.body, 'appendChild');
  win.exportRecordsCSV();
  const link = spy.mock.calls[0][0];
  const csv = decodeURI(link.href).split('charset=utf-8,')[1];
  const row = csv.split('\n')[1];
  expect(row).toBe('"2023-01-01T00:00:00","1","John ""JJ"" Doe","EQ1","Hammer ""XL""","Check-Out"');
  spy.mockRestore();
});

test('exportEmployeesCSV doubles newlines in names', () => {
  const win = setupDom({ employees: { '1': 'John\r\nDoe' } });
  const spy = jest.spyOn(document.body, 'appendChild');
  win.exportEmployeesCSV();
  const link = spy.mock.calls[0][0];
  const csv = decodeURI(link.href).split('charset=utf-8,')[1];
  const expected = `Badge ID,Employee Name\n"1","John\r\r\n\nDoe"\n`;
  expect(csv).toBe(expected);
  spy.mockRestore();
});

test('exportEquipmentCSV doubles newlines in names', () => {
  const win = setupDom({ equipmentItems: { 'EQ1': 'Hammer\r\nXL' } });
  const spy = jest.spyOn(document.body, 'appendChild');
  win.exportEquipmentCSV();
  const link = spy.mock.calls[0][0];
  const csv = decodeURI(link.href).split('charset=utf-8,')[1];
  const expected = `Equipment Serial,Equipment Name\n"EQ1","Hammer\r\r\n\nXL"\n`;
  expect(csv).toBe(expected);
  spy.mockRestore();
});

test('exportRecordsCSV doubles newlines in fields', () => {
  const records = [{
    timestamp: '2023-01-01T00:00:00',
    badge: '1',
    employeeName: 'John\r\nDoe',
    equipmentBarcodes: ['EQ1'],
    equipmentNames: ['Hammer\r\nXL'],
    action: 'Check-Out',
    recordDate: '2023-01-01'
  }];
  const win = setupDom({ records });
  const spy = jest.spyOn(document.body, 'appendChild');
  win.exportRecordsCSV();
  const link = spy.mock.calls[0][0];
  const csv = decodeURI(link.href).split('charset=utf-8,')[1];
  const expected = `Timestamp,Employee Badge ID,Employee Name,Equipment Barcodes,Equipment Names,Action\n"2023-01-01T00:00:00","1","John\r\r\n\nDoe","EQ1","Hammer\r\r\n\nXL","Check-Out"`;
  expect(csv).toBe(expected);
  spy.mockRestore();
});

test('exportRecordsCSV leaves blank cells for missing fields', () => {
  const records = [{
    timestamp: '2023-01-01T00:00:00',
    equipmentBarcodes: [],
    equipmentNames: [],
    recordDate: '2023-01-01'
  }];
  const win = setupDom({ records });
  const spy = jest.spyOn(document.body, 'appendChild');
  win.exportRecordsCSV();
  const link = spy.mock.calls[0][0];
  const csv = decodeURI(link.href).split('charset=utf-8,')[1];
  const row = csv.split('\n')[1];
  expect(row).toBe('"2023-01-01T00:00:00","","","","",""');
  spy.mockRestore();
});
