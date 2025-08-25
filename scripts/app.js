/* ---------- Initialization ---------- */
let employees = loadFromStorage('employees', {});
let equipmentItems = loadFromStorage('equipmentItems', {});
// Migrate any legacy string entries to objects
for (const [badge, data] of Object.entries(employees)) {
  if (typeof data === 'string') {
    employees[badge] = { name: data, homeStation: '' };
  }
}
for (const [serial, data] of Object.entries(equipmentItems)) {
  if (typeof data === 'string') {
    equipmentItems[serial] = { name: data, homeStation: '' };
  }
}
let records = loadFromStorage('records', []);
let equipmentIdCounter = 1;

const pageSize = 10;
let employeePage = 0;
let equipmentPage = 0;
let employeeFilter = '';
let equipmentFilter = '';
rebuildEquipmentCache();
updateNotifications();

const actionBtn = document.getElementById('actionBtn');
const actionMenu = document.getElementById('actionMenu');

/* ---------- Navigation ---------- */
function showSection(section) {
  // Hide all sections
  document.querySelectorAll('.section').forEach(el => el.classList.add('hidden'));
  // Show the requested section
  document.getElementById(section).classList.remove('hidden');

  // Update active navigation link
  document.querySelectorAll('nav a').forEach(link => {
    link.classList.remove('active');
    link.removeAttribute('aria-current');
  });
  const activeLink = document.getElementById('nav' + section.charAt(0).toUpperCase() + section.slice(1));
  if (activeLink) {
    activeLink.classList.add('active');
    activeLink.setAttribute('aria-current', 'page');
  }

  if (section === 'admin') {
    displayEmployeeList();
    displayEquipmentListAdmin();
  }
  if (section === 'records') {
    displayRecords(records);
  }
}

/* ---------- Check-Out Functions ---------- */
function addEquipmentField() {
  const equipmentList = document.getElementById('equipmentList');
  const container = document.createElement('div');
  container.className = 'equipment-item';

  const rowDiv = document.createElement('div');
  rowDiv.className = 'equipmentRow';

  const input = document.createElement('input');
  input.type = 'text';
  input.name = 'equipment';
  input.id = `equipment${equipmentIdCounter++}`;
  input.placeholder = 'Enter Equipment Barcode';
  // Equipment fields are optional; allow empty inputs
  input.addEventListener('input', lookupEquipment);

  const errorSpan = document.createElement('span');
  errorSpan.className = 'error-message';
  errorSpan.setAttribute('aria-live', 'polite');
  errorSpan.id = `${input.id}Error`;
  input.setAttribute('aria-describedby', errorSpan.id);

  const nameSpan = document.createElement('span');
  nameSpan.className = 'equipmentNameDisplay';

  rowDiv.appendChild(input);
  rowDiv.appendChild(errorSpan);
  rowDiv.appendChild(nameSpan);

  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'removeEquipment hidden';
  removeBtn.textContent = 'Remove';
  removeBtn.addEventListener('click', () => removeEquipmentField(removeBtn));

  container.appendChild(rowDiv);
  container.appendChild(removeBtn);
  equipmentList.appendChild(container);
  updateRemoveButtons();
}

function removeEquipmentField(button) {
  const equipmentList = document.getElementById('equipmentList');
  if (equipmentList.children.length > 1) {
    button.parentElement.remove();
  }
  updateRemoveButtons();
  const enabledInputs = document.querySelectorAll('#equipmentList input[name="equipment"]:not([disabled])');
  if (enabledInputs.length === 0) {
    addEquipmentField();
  }
}

function updateRemoveButtons() {
  const equipmentItems = document.querySelectorAll('#equipmentList .equipment-item');
  equipmentItems.forEach(item => {
    const input = item.querySelector('input[name="equipment"]');
    const removeBtn = item.querySelector('.removeEquipment');
    if (input.disabled) {
      removeBtn.classList.add('hidden');
    } else {
      removeBtn.classList.remove('hidden');
    }
  });
}

function lookupEmployee() {
  const badgeInput = document.getElementById('badge');
  const badge = badgeInput.value.trim();
  const nameDisplay = document.getElementById('employeeName');
  clearFieldError(badgeInput);
  if (badge === '') {
    nameDisplay.textContent = '';
    return;
  }
  if (employees[badge]) {
    nameDisplay.textContent = employees[badge].name;
  } else {
    nameDisplay.textContent = 'Unknown employee';
  }
}

function lookupEquipment(event) {
  const input = event.target;
  const code = input.value.trim();
  const nameDisplay = input.parentElement.querySelector('.equipmentNameDisplay');
  clearFieldError(input);
  if (code === '') {
    nameDisplay.textContent = '';
    input.disabled = false;
    updateRemoveButtons();
    return;
  }
  const existing = Array.from(document.querySelectorAll('#equipmentList input[name="equipment"]'))
    .filter(el => el !== input && el.value.trim() === code);
  if (existing.length > 0) {
    showError('Duplicate equipment barcode!');
    input.value = '';
    input.disabled = false;
    nameDisplay.textContent = '';
    updateRemoveButtons();
    return;
  }
  if (equipmentItems[code]) {
    nameDisplay.textContent = equipmentItems[code].name;
    input.disabled = true;
  } else {
    nameDisplay.textContent = 'Unknown equipment';
    input.disabled = true;
  }
  if (document.querySelectorAll('#equipmentList input[name="equipment"]:not([disabled])').length === 0) {
    addEquipmentField();
  }
  updateRemoveButtons();
}

document.getElementById('checkoutForm').addEventListener('submit', function(e) {
  e.preventDefault();
  const badgeInput = document.getElementById('badge');
  const actionInput = document.getElementById('action');
  clearFieldError(badgeInput);
  clearFieldError(actionInput);
  const badge = badgeInput.value.trim();
  const action = actionInput.value.trim();
  let hasError = false;
  if (!badge) {
    setFieldError(badgeInput, 'Badge ID is required.');
    hasError = true;
  }
  if (!action) {
    setFieldError(actionInput, 'Please select an action.');
    hasError = true;
  }
  if (hasError) return;
  const equipmentInputs = document.querySelectorAll('#equipmentList input[name="equipment"]');
  const equipmentBarcodes = [];
  const equipmentNamesList = [];
  equipmentInputs.forEach(input => {
    const code = input.value.trim();
    if (code) {
      equipmentBarcodes.push(code);
      equipmentNamesList.push((equipmentItems[code] && equipmentItems[code].name) || 'Unknown equipment');
    }
  });
  const station = badge.slice(0, 3);
  const record = {
    timestamp: new Date().toISOString(),
    recordDate: new Date().toISOString().substring(0,10),
    badge: badge,
    employeeName: (employees[badge] && employees[badge].name) || 'Unknown employee',
    station: station,
    equipmentBarcodes: equipmentBarcodes,
    equipmentNames: equipmentNamesList,
    action: action
  };
  records.push(record);
  saveToStorage('records', records);
  updateEquipmentCache(record);
  updateNotifications();
  showSuccess('Record saved locally!');
  this.reset();
  document.getElementById('employeeName').textContent = "";
  document.getElementById('actionBtn').textContent = 'Select Action';
  actionMenu.classList.add('hidden');
  const equipmentList = document.getElementById('equipmentList');
  equipmentList.innerHTML = "";
  addEquipmentField();
  document.getElementById('badge').focus();
});

/* ---------- Event Listeners ---------- */

const nav = document.getElementById('mainNav');
if (nav) {
  nav.addEventListener('click', (e) => {
    const link = e.target.closest('a[data-section]');
    if (!link) return;
    e.preventDefault();
    showSection(link.dataset.section);
  });
}

document.getElementById('badge').addEventListener('input', lookupEmployee);

const initialEquipmentInput = document.querySelector('#equipmentList input[name="equipment"]');
if (initialEquipmentInput) {
  initialEquipmentInput.addEventListener('input', lookupEquipment);
  const initialRemoveBtn = document.querySelector('#equipmentList .removeEquipment');
  initialRemoveBtn.addEventListener('click', () => removeEquipmentField(initialRemoveBtn));
  updateRemoveButtons();
}

document.getElementById('addEquipmentBtn').addEventListener('click', addEquipmentField);

document.getElementById('adminForm').addEventListener('submit', (e) => {
  e.preventDefault();
  addEmployee();
});

document.getElementById('equipmentAdminForm').addEventListener('submit', (e) => {
  e.preventDefault();
  addEquipmentAdmin();
});

['empName','empBadge','empStation','equipName','equipSerial','equipStation'].forEach(id => {
  const el = document.getElementById(id);
  if (el) {
    el.addEventListener('input', () => clearFieldError(el));
  }
});

function setupDropdown(button, menu, onSelect) {
  const items = Array.from(menu.querySelectorAll('button'));
  items.forEach((item, idx) => {
    item.addEventListener('keydown', (e) => {
      if (e.key === 'Tab' && !e.shiftKey && idx === items.length - 1) {
        e.preventDefault();
        closeMenu();
      }
    });
  });

  const openMenu = () => {
    menu.classList.remove('hidden');
    button.setAttribute('aria-expanded', 'true');
    items[0]?.focus();
  };

  const closeMenu = () => {
    menu.classList.add('hidden');
    button.setAttribute('aria-expanded', 'false');
    button.focus();
  };

  const toggleMenu = () => {
    if (menu.classList.contains('hidden')) {
      openMenu();
    } else {
      closeMenu();
    }
  };

  button.addEventListener('click', toggleMenu);
  button.addEventListener('keydown', (e) => {
    if (['Enter', ' '].includes(e.key)) {
      e.preventDefault();
      toggleMenu();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      openMenu();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      openMenu();
      items[items.length - 1]?.focus();
    } else if (e.key === 'Escape') {
      if (button.getAttribute('aria-expanded') === 'true') {
        e.preventDefault();
        closeMenu();
      }
    }
  });

  menu.addEventListener('click', (e) => {
    const item = e.target.closest('button');
    if (!item) return;
    onSelect(item.dataset.value, item.textContent);
    closeMenu();
  });

  menu.addEventListener('keydown', (e) => {
    const currentIndex = items.indexOf(document.activeElement);
    if (e.key === 'Tab' && !e.shiftKey && currentIndex === items.length - 1) {
      e.preventDefault();
      closeMenu();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      items[(currentIndex + 1) % items.length]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      items[(currentIndex - 1 + items.length) % items.length]?.focus();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      closeMenu();
    }
  });
}

setupDropdown(actionBtn, actionMenu, (value, text) => {
  document.getElementById('action').value = value;
  actionBtn.textContent = text;
});
