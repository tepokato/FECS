const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const { parseCSV } = require('../scripts/csvParser');

const html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
const scripts = [
  '../scripts/storage.js',
  '../scripts/notifications.js',
  '../scripts/admin.js',
  '../scripts/csvParser.js',
  '../scripts/records.js',
  '../scripts/app.js'
].map(p => fs.readFileSync(path.resolve(__dirname, p), 'utf8')).join('\n');

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
  window.eval(scripts);
  window.HTMLAnchorElement.prototype.click = jest.fn();
  return window;
}

afterEach(() => {
  delete global.window;
  delete global.document;
  delete global.localStorage;
});

test('exportEmployeesCSV escapes quotes in names', () => {
  const win = setupDom({ employees: { '1': { name: 'John "JJ" Doe', homeStation: '' } } });
  const spy = jest.spyOn(document.body, 'appendChild');
  win.exportEmployeesCSV();
  const link = spy.mock.calls[0][0];
  const csv = decodeURI(link.href).split('charset=utf-8,')[1];
  const row = csv.trim().split('\n')[1];
  expect(row).toBe('"1","John ""JJ"" Doe"');
  spy.mockRestore();
});

test('exportEquipmentCSV escapes quotes in names', () => {
  const win = setupDom({ equipmentItems: { 'EQ1': { name: 'Hammer "XL"', homeStation: '' } } });
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
  station: 'AAA',
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
  expect(row).toBe('"2023-01-01T00:00:00","1","John ""JJ"" Doe","AAA","EQ1","Hammer ""XL""","Check-Out"');
  spy.mockRestore();
});

test('exportEmployeesCSV escapes newline characters in names', () => {
  const win = setupDom({ employees: { '1': { name: 'John\r\nDoe', homeStation: '' } } });
  const spy = jest.spyOn(document.body, 'appendChild');
  win.exportEmployeesCSV();
  const link = spy.mock.calls[0][0];
  const csv = decodeURI(link.href).split('charset=utf-8,')[1];
  const expected = `Badge ID,Employee Name\n"1","John\r\nDoe"\n`;
  expect(csv).toBe(expected);
  const parsed = parseCSV(csv);
  expect(parsed[1][1]).toBe('John\r\nDoe');
  spy.mockRestore();
});

test('exportEquipmentCSV escapes newline characters in names', () => {
  const win = setupDom({ equipmentItems: { 'EQ1': { name: 'Hammer\r\nXL', homeStation: '' } } });
  const spy = jest.spyOn(document.body, 'appendChild');
  win.exportEquipmentCSV();
  const link = spy.mock.calls[0][0];
  const csv = decodeURI(link.href).split('charset=utf-8,')[1];
  const expected = `Equipment Serial,Equipment Name\n"EQ1","Hammer\r\nXL"\n`;
  expect(csv).toBe(expected);
  const parsed = parseCSV(csv);
  expect(parsed[1][1]).toBe('Hammer\r\nXL');
  spy.mockRestore();
});

test('exportRecordsCSV escapes newline characters in fields', () => {
  const records = [{
    timestamp: '2023-01-01T00:00:00',
    badge: '1',
    employeeName: 'John\r\nDoe',
    station: 'AAA',
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
  const expected = `Timestamp,Employee Badge ID,Employee Name,Station,Equipment Barcodes,Equipment Names,Action\n"2023-01-01T00:00:00","1","John\r\nDoe","AAA","EQ1","Hammer\r\nXL","Check-Out"`;
  expect(csv).toBe(expected);
  const parsed = parseCSV(csv);
  expect(parsed[1][2]).toBe('John\r\nDoe');
  expect(parsed[1][5]).toBe('Hammer\r\nXL');
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
  expect(row).toBe('"2023-01-01T00:00:00","","","","","",""');
  spy.mockRestore();
});

test('exportEmployeesCSV ignores inherited prototype properties', () => {
  Object.prototype.protoEmployee = 'Prototype';
  try {
    const win = setupDom({ employees: { '1': { name: 'John Doe', homeStation: '' } } });
    const spy = jest.spyOn(document.body, 'appendChild');
    win.exportEmployeesCSV();
    const link = spy.mock.calls[0][0];
    const csv = decodeURI(link.href).split('charset=utf-8,')[1];
    const expected = `Badge ID,Employee Name\n"1","John Doe"\n`;
    expect(csv).toBe(expected);
    spy.mockRestore();
  } finally {
    delete Object.prototype.protoEmployee;
  }
});

test('exportEquipmentCSV ignores inherited prototype properties', () => {
  Object.prototype.protoEquipment = 'Prototype';
  try {
    const win = setupDom({ equipmentItems: { 'EQ1': { name: 'Hammer', homeStation: '' } } });
    const spy = jest.spyOn(document.body, 'appendChild');
    win.exportEquipmentCSV();
    const link = spy.mock.calls[0][0];
    const csv = decodeURI(link.href).split('charset=utf-8,')[1];
    const expected = `Equipment Serial,Equipment Name\n"EQ1","Hammer"\n`;
    expect(csv).toBe(expected);
    spy.mockRestore();
  } finally {
    delete Object.prototype.protoEquipment;
  }
});
