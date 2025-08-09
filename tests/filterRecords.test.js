const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
const script = fs.readFileSync(path.resolve(__dirname, '../scripts/app.js'), 'utf8');

function loadDom(records) {
  const dom = new JSDOM(html, { url: 'http://localhost', runScripts: 'dangerously' });
  const { window } = dom;
  global.window = window;
  global.document = window.document;
  global.localStorage = window.localStorage;
  window.alert = jest.fn();
  localStorage.setItem('records', JSON.stringify(records));
  window.eval(script);
  return window;
}

describe('filterRecords', () => {
  afterEach(() => {
    delete global.window;
    delete global.document;
    delete global.localStorage;
  });

  test('Name/badge search returns only matching records', () => {
    const records = [
      { timestamp: 't1', recordDate: '2023-01-01', badge: '123', employeeName: 'Alice', equipmentBarcodes: ['E1'], equipmentNames: ['Laptop'], action: 'Check-Out' },
      { timestamp: 't2', recordDate: '2023-01-01', badge: '456', employeeName: 'Bob', equipmentBarcodes: ['E2'], equipmentNames: ['Tablet'], action: 'Check-In' }
    ];
    const win = loadDom(records);

    document.getElementById('recordSearch').value = 'alice';
    win.filterRecords();
    let rows = document.querySelectorAll('#recordsTable table tr');
    expect(rows).toHaveLength(2);
    expect(rows[1].children[2].textContent).toBe('Alice');

    document.getElementById('recordSearch').value = '456';
    win.filterRecords();
    rows = document.querySelectorAll('#recordsTable table tr');
    expect(rows).toHaveLength(2);
    expect(rows[1].children[1].textContent).toBe('456');
  });

  test('Equipment search matches combined barcodes and names', () => {
    const records = [
      { timestamp: 't1', recordDate: '2023-01-01', badge: '123', employeeName: 'Alice', equipmentBarcodes: ['EQ1'], equipmentNames: ['Laptop'], action: 'Check-Out' },
      { timestamp: 't2', recordDate: '2023-01-01', badge: '456', employeeName: 'Bob', equipmentBarcodes: ['EQ2'], equipmentNames: ['Tablet'], action: 'Check-In' }
    ];
    const win = loadDom(records);

    document.getElementById('recordEquipment').value = 'eq1 laptop';
    win.filterRecords();
    const rows = document.querySelectorAll('#recordsTable table tr');
    expect(rows).toHaveLength(2);
    expect(rows[1].children[3].textContent).toBe('EQ1');
    expect(rows[1].children[4].textContent).toBe('Laptop');
  });

  test('Date filtering returns records with the selected date', () => {
    const records = [
      { timestamp: 't1', recordDate: '2023-01-01', badge: '123', employeeName: 'Alice', equipmentBarcodes: ['EQ1'], equipmentNames: ['Laptop'], action: 'Check-Out' },
      { timestamp: 't2', recordDate: '2023-01-02', badge: '456', employeeName: 'Bob', equipmentBarcodes: ['EQ2'], equipmentNames: ['Tablet'], action: 'Check-In' }
    ];
    const win = loadDom(records);

    document.getElementById('recordDate').value = '2023-01-02';
    win.filterRecords();
    const rows = document.querySelectorAll('#recordsTable table tr');
    expect(rows).toHaveLength(2);
    expect(rows[1].children[1].textContent).toBe('456');
    expect(rows[1].children[2].textContent).toBe('Bob');
  });
});
