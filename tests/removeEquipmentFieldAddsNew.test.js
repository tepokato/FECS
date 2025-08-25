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
  window.alert = jest.fn();
  localStorage.setItem('employees', JSON.stringify({}));
  localStorage.setItem('equipmentItems', JSON.stringify({}));
  localStorage.setItem('records', JSON.stringify([]));
  window.eval(scripts);
  return window;
}

afterEach(() => {
  delete global.window;
  delete global.document;
  delete global.localStorage;
});

test('removing last editable field adds a new enabled input', () => {
  const win = setupDom();
  const { document } = win;

  // Add a second equipment field so we can remove one
  win.addEquipmentField();
  const items = document.querySelectorAll('#equipmentList .equipment-item');
  const firstInput = items[0].querySelector('input[name="equipment"]');
  const secondItem = items[1];

  // Simulate scanned equipment by disabling the first input
  firstInput.disabled = true;

  // Remove the only enabled input
  const removeBtn = secondItem.querySelector('.removeEquipment');
  removeBtn.click();

  const enabledInputs = document.querySelectorAll('#equipmentList input[name="equipment"]:not([disabled])');
  expect(enabledInputs.length).toBe(1);
  expect(enabledInputs[0]).not.toBe(firstInput);
  expect(enabledInputs[0].disabled).toBe(false);

  const allInputs = document.querySelectorAll('#equipmentList input[name="equipment"]');
  expect(allInputs.length).toBe(2);
});
