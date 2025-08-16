/* ---------- Initialization ---------- */
function loadFromStorage(key, fallback) {
  const item = localStorage.getItem(key);
  if (!item) return fallback;
  try {
    return JSON.parse(item);
  } catch (e) {
    console.warn(`Failed to parse ${key} from storage, resetting to defaults`, e);
    setTimeout(() => showError(`Stored data for ${key} was invalid and has been reset.`), 0);
    saveToStorage(key, fallback);
    return fallback;
  }
}

let employees = loadFromStorage('employees', {});
let equipmentItems = loadFromStorage('equipmentItems', {});
let records = loadFromStorage('records', []);
let equipmentIdCounter = 1;

const pageSize = 10;
let employeePage = 0;
let equipmentPage = 0;
let employeeFilter = '';
let equipmentFilter = '';

function saveToStorage(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

function csvEscape(value) {
  return String(value).replace(/"/g, '""');
}

/* ---------- Notification System ---------- */
let notificationTimer;
let tempNotificationActive = false;

function showNotification(message, type, delay = 3000) {
  const notificationDiv = document.getElementById('notifications');
  if (notificationTimer) {
    clearTimeout(notificationTimer);
  }

  tempNotificationActive = true;
  notificationDiv.className = type;
  notificationDiv.textContent = message;
  notificationDiv.classList.add('visible');

  if (delay > 0) {
    notificationTimer = setTimeout(() => {
      notificationDiv.classList.remove('visible');
      notificationDiv.className = '';
      notificationDiv.textContent = '';
      tempNotificationActive = false;
      updateNotifications();
    }, delay);
  }
}

function showSuccess(message, delay) {
  showNotification(message, 'success', delay);
}

function showError(message, delay) {
  showNotification(message, 'error', delay);
}

function setFieldError(input, message) {
  const errorSpan = input.parentElement.querySelector('.error-message');
  if (errorSpan) {
    errorSpan.textContent = message;
  }
  input.classList.add('error');
  input.setAttribute('aria-invalid', 'true');
}

function clearFieldError(input) {
  const errorSpan = input.parentElement.querySelector('.error-message');
  if (errorSpan) {
    errorSpan.textContent = '';
  }
  input.classList.remove('error');
  input.removeAttribute('aria-invalid');
}

function updateNotifications() {
  if (tempNotificationActive) return;

  const notificationDiv = document.getElementById('notifications');
  notificationDiv.className = '';
  notificationDiv.classList.remove('visible');
  const status = {};
  records.forEach(rec => {
    (rec.equipmentBarcodes || []).forEach(code => {
      if (!status[code]) status[code] = 0;
      if (rec.action === "Check-Out") {
        status[code]++;
      } else if (rec.action === "Check-In") {
        status[code]--;
      }
    });
  });
  const overdue = [];
  for (let code in status) {
    if (status[code] > 0) {
      const name = equipmentItems[code] || "Unknown Equipment";
      overdue.push(`${code} (${name})`);
    }
  }
  if (overdue.length > 0) {
    notificationDiv.textContent = "Overdue Equipment: " + overdue.join(", ");
    notificationDiv.classList.add('visible');
  } else {
    notificationDiv.textContent = "";
    notificationDiv.classList.remove('visible');
  }
}
updateNotifications();

/* ---------- Navigation ---------- */
function showSection(section) {
  // Hide all sections
  document.querySelectorAll('.section').forEach(el => el.classList.add('hidden'));
  // Show the requested section
  document.getElementById(section).classList.remove('hidden');

  // Update active navigation link
  document.querySelectorAll('nav a').forEach(link => link.classList.remove('active'));
  const activeLink = document.getElementById('nav' + section.charAt(0).toUpperCase() + section.slice(1));
  if (activeLink) {
    activeLink.classList.add('active');
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
}

function updateRemoveButtons() {
  const items = document.querySelectorAll('#equipmentList .equipment-item');
  items.forEach(item => {
    const btn = item.querySelector('.removeEquipment');
    if (items.length > 1) {
      btn.classList.remove('hidden');
    } else {
      btn.classList.add('hidden');
    }
  });
}

function lookupEmployee() {
  const input = document.getElementById('badge');
  clearFieldError(input);
  const badge = input.value.trim();
  const employeeNameSpan = document.getElementById('employeeName');
  if (employees[badge]) {
    employeeNameSpan.textContent = employees[badge];
    const equipmentInput = document.querySelector('input[name="equipment"]:not([disabled])');
    if (equipmentInput) {
      equipmentInput.focus();
    }
  } else {
    employeeNameSpan.textContent = "";
  }
}

function lookupEquipment(event) {
  const input = event.target;
  clearFieldError(input);
  const value = input.value.trim();
  const display = input.parentElement.querySelector('.equipmentNameDisplay');
  const equipmentName = equipmentItems[value];
  display.textContent = equipmentName || "";

  if (equipmentName) {
    const equipmentList = document.getElementById('equipmentList');
    const inputs = equipmentList.querySelectorAll('input[name="equipment"]');

    for (const other of inputs) {
      if (other !== input && other.value.trim() === value) {
        setFieldError(input, 'Equipment barcode already entered.');
        showError('Error: Equipment barcode already entered.');
        input.value = '';
        display.textContent = '';
        return;
      }
    }

    input.disabled = true;
    if (inputs[inputs.length - 1] === input) {
      addEquipmentField();
      equipmentList.lastElementChild.querySelector('input[name="equipment"]').focus();
    }
  }
}

document.getElementById('checkoutForm').addEventListener('submit', function(e) {
  e.preventDefault();

  const badgeInput = document.getElementById('badge');
  clearFieldError(badgeInput);
  const badge = badgeInput.value.trim();
  if (!badge) {
    setFieldError(badgeInput, 'Badge ID is required.');
    return;
  }
  if (!employees[badge]) {
    setFieldError(badgeInput, 'Employee badge not recognized.');
    return;
  }

  const equipmentInputs = Array.from(document.querySelectorAll('#equipmentList input[name="equipment"]'));
  equipmentInputs.forEach(clearFieldError);
  const equipmentCodes = equipmentInputs
    .map(input => input.value.trim())
    .filter(code => code !== "");

  if (equipmentCodes.length === 0) {
    setFieldError(equipmentInputs[0], 'Please scan at least one equipment barcode.');
    return;
  }

  for (const input of equipmentInputs) {
    const code = input.value.trim();
    if (code && !equipmentItems[code]) {
      setFieldError(input, "Equipment barcode '" + code + "' not recognized.");
      return;
    }
  }

  const employeeName = employees[badge] || "Unknown";
  const actionInput = document.getElementById('action');
  const action = actionInput.value;
  if (!action) {
    showError('Please select an action.');
    return;
  }
  const status = {};
  records.forEach(rec => {
    (rec.equipmentBarcodes || []).forEach(code => {
      if (!status[code]) status[code] = 0;
      if (rec.action === "Check-Out") {
        status[code]++;
      } else if (rec.action === "Check-In") {
        status[code]--;
      }
    });
  });
  if (action === "Check-Out") {
    for (const code of equipmentCodes) {
      if (status[code] > 0) {
        const offendingInput = equipmentInputs.find(input => input.value.trim() === code);
        if (offendingInput) {
          setFieldError(offendingInput, "Equipment barcode '" + code + "' is already checked out.");
        }
        showError("Equipment barcode '" + code + "' is already checked out.");
        return;
      }
    }
  }
  const now = new Date();
  const timeString = now.toLocaleTimeString('en-US', {hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true});
  const recordDate = now.toISOString().substring(0,10);
  const timestamp = `${(now.getMonth()+1).toString().padStart(2, '0')}/${now.getDate().toString().padStart(2, '0')}/${now.getFullYear()} ${timeString}`;

  const equipmentBarcodes = equipmentCodes;
  const equipmentNames = equipmentCodes.map(code => equipmentItems[code] || "");

  const record = { timestamp, recordDate, badge, employeeName, equipmentBarcodes, equipmentNames, action };
  records.push(record);
  saveToStorage('records', records);
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

/* ---------- Admin Panel Functions ---------- */
function displayEmployeeList(page = employeePage, filter = employeeFilter) {
  filter = (filter || '').toLowerCase();
  const list = document.getElementById('employeeList');
  list.innerHTML = "";
  const entries = Object.entries(employees).sort((a, b) => a[0].localeCompare(b[0]));
  const filtered = entries.filter(([badge, name]) =>
    badge.toLowerCase().includes(filter) || name.toLowerCase().includes(filter)
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  page = Math.min(Math.max(page, 0), totalPages - 1);
  const start = page * pageSize;
  const pageItems = filtered.slice(start, start + pageSize);
  if (pageItems.length === 0) {
    const placeholder = document.createElement('li');
    placeholder.className = 'placeholder';
    placeholder.textContent = 'No employees added yet.';
    list.appendChild(placeholder);
  } else {
    pageItems.forEach(([badge, name]) => {
      const li = document.createElement('li');
      const textSpan = document.createElement('span');
      textSpan.textContent = `${badge}: ${name}`;
      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'deleteEmployee';
      del.textContent = '❌';
      del.title = 'Remove Employee';
      del.setAttribute('aria-label', 'Remove Employee');
      del.addEventListener('click', () => removeEmployee(badge));
      li.appendChild(textSpan);
      li.appendChild(del);
      list.appendChild(li);
    });
  }
  employeePage = page;
  employeeFilter = filter;
  const prevBtn = document.getElementById('employeePrev');
  const nextBtn = document.getElementById('employeeNext');
  const pageIndicator = document.getElementById('employeePageIndicator');
  if (prevBtn) {
    const hidePrev = page <= 0;
    prevBtn.classList.toggle('hidden', hidePrev);
    prevBtn.disabled = hidePrev;
  }
  if (nextBtn) {
    const hideNext = page >= totalPages - 1;
    nextBtn.classList.toggle('hidden', hideNext);
    nextBtn.disabled = hideNext;
  }
  if (pageIndicator) pageIndicator.textContent = `Page ${page + 1} of ${totalPages}`;
}
function addEmployee() {
  const nameInput = document.getElementById('empName');
  const badgeInput = document.getElementById('empBadge');
  clearFieldError(nameInput);
  clearFieldError(badgeInput);
  const badge = badgeInput.value.trim();
  const name = nameInput.value.trim();
  let hasError = false;
  if (!name) {
    setFieldError(nameInput, 'Employee name is required.');
    hasError = true;
  }
  if (!badge) {
    setFieldError(badgeInput, 'Badge ID is required.');
    hasError = true;
  }
  if (hasError) return;
  if (employees[badge]) {
    setFieldError(badgeInput, 'Badge ID already exists.');
    showError('Employee with this badge ID already exists!');
    return;
  }
  employees[badge] = name;
  saveToStorage('employees', employees);
  showSuccess('Employee added successfully!');
  displayEmployeeList();
  document.getElementById('adminForm').reset();
  clearFieldError(nameInput);
  clearFieldError(badgeInput);
}
function removeEmployee(badge) {
  if (!badge || !employees[badge]) {
    showError('Invalid badge ID or employee not found!');
    return;
  }
  const confirmed = typeof confirm === 'function'
    ? confirm('Are you sure you want to remove this employee?')
    : true;
  if (!confirmed) return;
  delete employees[badge];
  saveToStorage('employees', employees);
  showSuccess('Employee removed successfully!');
  displayEmployeeList();
}
function displayEquipmentListAdmin(page = equipmentPage, filter = equipmentFilter) {
  filter = (filter || '').toLowerCase();
  const list = document.getElementById('equipmentListAdmin');
  list.innerHTML = "";
  const entries = Object.entries(equipmentItems).sort((a, b) => a[0].localeCompare(b[0]));
  const filtered = entries.filter(([serial, name]) =>
    serial.toLowerCase().includes(filter) || name.toLowerCase().includes(filter)
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  page = Math.min(Math.max(page, 0), totalPages - 1);
  const start = page * pageSize;
  const pageItems = filtered.slice(start, start + pageSize);
  if (pageItems.length === 0) {
    const placeholder = document.createElement('li');
    placeholder.className = 'placeholder';
    placeholder.textContent = 'No equipment added yet.';
    list.appendChild(placeholder);
  } else {
    pageItems.forEach(([serial, name]) => {
      const li = document.createElement('li');
      const textSpan = document.createElement('span');
      textSpan.textContent = `${serial}: ${name}`;
      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'deleteEquipment';
      del.textContent = '❌';
      del.title = 'Remove Equipment';
      del.setAttribute('aria-label', 'Remove Equipment');
      del.addEventListener('click', () => removeEquipmentAdmin(serial));
      li.appendChild(textSpan);
      li.appendChild(del);
      list.appendChild(li);
    });
  }
  equipmentPage = page;
  equipmentFilter = filter;
  const prevBtn = document.getElementById('equipmentPrev');
  const nextBtn = document.getElementById('equipmentNext');
  const pageIndicator = document.getElementById('equipmentPageIndicator');
  if (prevBtn) {
    const hidePrev = page <= 0;
    prevBtn.classList.toggle('hidden', hidePrev);
    prevBtn.disabled = hidePrev;
  }
  if (nextBtn) {
    const hideNext = page >= totalPages - 1;
    nextBtn.classList.toggle('hidden', hideNext);
    nextBtn.disabled = hideNext;
  }
  if (pageIndicator) pageIndicator.textContent = `Page ${page + 1} of ${totalPages}`;
}
function addEquipmentAdmin() {
  const nameInput = document.getElementById('equipName');
  const serialInput = document.getElementById('equipSerial');
  clearFieldError(nameInput);
  clearFieldError(serialInput);
  const serial = serialInput.value.trim();
  const name = nameInput.value.trim();
  let hasError = false;
  if (!name) {
    setFieldError(nameInput, 'Equipment name is required.');
    hasError = true;
  }
  if (!serial) {
    setFieldError(serialInput, 'Equipment serial is required.');
    hasError = true;
  }
  if (hasError) return;
  if (equipmentItems[serial]) {
    setFieldError(serialInput, 'Equipment serial already exists.');
    showError('Equipment with this serial already exists!');
    return;
  }
  equipmentItems[serial] = name;
  saveToStorage('equipmentItems', equipmentItems);
  showSuccess('Equipment added successfully!');
  displayEquipmentListAdmin();
  document.getElementById('equipmentAdminForm').reset();
  clearFieldError(nameInput);
  clearFieldError(serialInput);
}
function removeEquipmentAdmin(serial) {
  if (!serial || !equipmentItems[serial]) {
    showError('Invalid equipment serial or equipment not found!');
    return;
  }
  const confirmed = typeof confirm === 'function'
    ? confirm('Are you sure you want to remove this equipment?')
    : true;
  if (!confirmed) return;
  delete equipmentItems[serial];
  saveToStorage('equipmentItems', equipmentItems);
  showSuccess('Equipment removed successfully!');
  displayEquipmentListAdmin();
}

/* ---------- Record Filtering & Export ---------- */
// Escape HTML entities to prevent script injection in dynamic table
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/'/g, '&#39;')
    .replace(/"/g, '&quot;');
}

function displayRecords(recArray) {
  const container = document.getElementById('recordsTable');
  if (!recArray.length) {
    container.innerHTML = "<p>No records found.</p>";
    return;
  }
  let html = "<table><caption>Equipment check-in/out records</caption><tr><th>Timestamp</th><th>Badge</th><th>Name</th><th>Equipment Barcodes</th><th>Equipment Names</th><th>Action</th></tr>";
  recArray.forEach(rec => {
    // Escape record fields before injecting into the table
    html += `<tr>
          <td>${escapeHtml(rec.timestamp)}</td>
          <td>${escapeHtml(rec.badge)}</td>
          <td>${escapeHtml(rec.employeeName)}</td>
          <td>${escapeHtml((rec.equipmentBarcodes ?? []).join('; '))}</td>
          <td>${escapeHtml((rec.equipmentNames ?? []).join('; '))}</td>
          <td>${escapeHtml(rec.action)}</td>
        </tr>`;
  });
  html += "</table>";
  container.innerHTML = html;
}
function filterRecords() {
  const search = document.getElementById('recordSearch').value.trim().toLowerCase();
  const equipSearch = document.getElementById('recordEquipment').value.trim().toLowerCase();
  const date = document.getElementById('recordDate').value;
  let filtered = records;
  if (search) {
    filtered = filtered.filter(rec => {
      const badge = String(rec?.badge ?? "");
      const name = String(rec?.employeeName ?? "");
      return badge.toLowerCase().includes(search) ||
             name.toLowerCase().includes(search);
    });
  }
  if (equipSearch) {
    filtered = filtered.filter(rec => {
      const barcodes = (rec?.equipmentBarcodes ?? []).join(" ").toLowerCase();
      const names = (rec?.equipmentNames ?? []).join(" ").toLowerCase();
      const combinedEquip = `${barcodes} ${names}`.trim();
      return combinedEquip.includes(equipSearch);
    });
  }
  if (date) {
    filtered = filtered.filter(rec => rec.recordDate === date);
  }
  displayRecords(filtered);
}
function clearFilters() {
  document.getElementById('recordSearch').value = "";
  document.getElementById('recordEquipment').value = "";
  document.getElementById('recordDate').value = "";
  displayRecords(records);
}
function exportRecordsCSV() {
  if (!records.length) {
    showError("No records to export.");
    return;
  }
  const header = "Timestamp,Employee Badge ID,Employee Name,Equipment Barcodes,Equipment Names,Action\n";
  const rows = records.map(rec =>
    `"${csvEscape(rec.timestamp ?? '')}",` +
    `"${csvEscape(rec.badge ?? '')}",` +
    `"${csvEscape(rec.employeeName ?? '')}",` +
    `"${csvEscape((rec.equipmentBarcodes ?? []).join('; ') ?? '')}",` +
    `"${csvEscape((rec.equipmentNames ?? []).join('; ') ?? '')}",` +
    `"${csvEscape(rec.action ?? '')}"`
  );
  const csvContent = 'data:text/csv;charset=utf-8,' + header + rows.join("\n");
  const link = document.createElement('a');
  link.href = encodeURI(csvContent);
  link.download = `Records_${new Date().toISOString().substring(0,10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/* ---------- CSV Import/Export Functions ---------- */
function exportEmployeesCSV() {
  let csvContent = "data:text/csv;charset=utf-8,";
  csvContent += "Badge ID,Employee Name\n";
  for (let badge in employees) {
    csvContent += `"${csvEscape(badge)}","${csvEscape(employees[badge])}"\n`;
  }
  const link = document.createElement("a");
  link.href = encodeURI(csvContent);
  link.download = "employees.csv";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function exportEquipmentCSV() {
  let csvContent = "data:text/csv;charset=utf-8,";
  csvContent += "Equipment Serial,Equipment Name\n";
  for (let serial in equipmentItems) {
    csvContent += `"${csvEscape(serial)}","${csvEscape(equipmentItems[serial])}"\n`;
  }
  const link = document.createElement("a");
  link.href = encodeURI(csvContent);
  link.download = "equipment.csv";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function triggerImportEmployees() {
  document.getElementById("importEmployeesFile").click();
}

function setLoading(button, loading, text = 'Importing...') {
  if (!button) return;
  if (loading) {
    button.disabled = true;
    button.dataset.originalText = button.textContent;
    button.textContent = text;
  } else {
    button.disabled = false;
    if (button.dataset.originalText) {
      button.textContent = button.dataset.originalText;
      delete button.dataset.originalText;
    }
  }
}

function handleImportEmployees(event) {
  const input = event.target;
  const button = document.getElementById('importEmployeesAction');
  setLoading(button, true);
  if (input.files.length === 0) {
    setLoading(button, false);
    return;
  }
  const file = input.files[0];
  const reader = new FileReader();
  reader.onerror = function() {
    showError("Unable to read employees CSV file.");
    setLoading(button, false);
    input.value = "";
  };
  reader.onload = function(e) {
    const text = e.target.result;
    const lines = text.split("\n");
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line === "") continue;
      const parts = parseCSVLine(line);
      if (parts.length < 2) {
        showError(`Skipping malformed line ${i + 1}: ${line}`);
        continue;
      }
      let badge = parts[0].replace(/^"|"$/g, '').trim();
      let name = parts[1].replace(/^"|"$/g, '').trim();
      if (badge && name) {
        employees[badge] = name;
      }
    }
    saveToStorage("employees", employees);
    showSuccess("Employee CSV import completed successfully.");
    displayEmployeeList();
    setLoading(button, false);
    input.value = "";
  };
  reader.readAsText(file);
}

function triggerImportEquipment() {
  document.getElementById("importEquipmentFile").click();
}

function handleImportEquipment(event) {
  const input = event.target;
  const button = document.getElementById('importEquipmentAction');
  setLoading(button, true);
  if (input.files.length === 0) {
    setLoading(button, false);
    return;
  }
  const file = input.files[0];
  const reader = new FileReader();
  reader.onerror = function() {
    showError("Unable to read equipment CSV file.");
    setLoading(button, false);
    input.value = "";
  };
  reader.onload = function(e) {
    const text = e.target.result;
    const lines = text.split("\n");
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line === "") continue;
      const parts = parseCSVLine(line);
      if (parts.length < 2) {
        showError(`Skipping malformed line ${i + 1}: ${line}`);
        continue;
      }
      let serial = parts[0].replace(/^"|"$/g, '').trim();
      let name = parts[1].replace(/^"|"$/g, '').trim();
      if (serial && name) {
        equipmentItems[serial] = name;
      }
    }
    saveToStorage("equipmentItems", equipmentItems);
    showSuccess("Equipment CSV import completed successfully.");
    displayEquipmentListAdmin();
    setLoading(button, false);
    input.value = "";
  };
  reader.readAsText(file);
}

/* ---------- Event Listeners ---------- */

const navToggle = document.getElementById('navToggle');
const nav = document.getElementById('mainNav');
if (navToggle && nav) {
  nav.addEventListener('click', (e) => {
    const link = e.target.closest('a[data-section]');
    if (!link) return;
    e.preventDefault();
    showSection(link.dataset.section);
    nav.classList.remove('show');
    navToggle.setAttribute('aria-expanded', 'false');
  });

  navToggle.addEventListener('click', () => {
    const expanded = navToggle.getAttribute('aria-expanded') === 'true';
    navToggle.setAttribute('aria-expanded', String(!expanded));
    nav.classList.toggle('show');
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

['empName','empBadge','equipName','equipSerial'].forEach(id => {
  const el = document.getElementById(id);
  if (el) {
    el.addEventListener('input', () => clearFieldError(el));
  }
});

function setupDropdown(button, menu, onSelect) {
  const items = Array.from(menu.querySelectorAll('button'));

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

  items.forEach((item, index) => {
    item.setAttribute('tabindex', '-1');
    item.addEventListener('click', () => {
      onSelect?.(item);
      closeMenu();
    });
    item.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        items[(index + 1) % items.length].focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        items[(index - 1 + items.length) % items.length].focus();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        closeMenu();
      }
    });
  });

  document.addEventListener('click', (e) => {
    if (!menu.contains(e.target) && e.target !== button) {
      if (button.getAttribute('aria-expanded') === 'true') {
        closeMenu();
      }
    }
  });
}

const actionBtn = document.getElementById('actionBtn');
const actionMenu = document.getElementById('actionMenu');
if (actionBtn && actionMenu) {
  setupDropdown(actionBtn, actionMenu, (item) => {
    document.getElementById('action').value = item.dataset.value || item.textContent;
    actionBtn.textContent = item.textContent;
  });
}

const importExportBtn = document.getElementById('importExportBtn');
const importExportMenu = document.getElementById('importExportMenu');
if (importExportBtn && importExportMenu) {
  setupDropdown(importExportBtn, importExportMenu);
}

document.addEventListener('click', (e) => {
  const clickedInsideDropdown =
    actionMenu?.contains(e.target) ||
    actionBtn?.contains(e.target) ||
    importExportMenu?.contains(e.target) ||
    importExportBtn?.contains(e.target);

  if (!clickedInsideDropdown) {
    actionMenu?.classList.add('hidden');
    actionBtn?.setAttribute('aria-expanded', 'false');
    importExportMenu?.classList.add('hidden');
    importExportBtn?.setAttribute('aria-expanded', 'false');
  }
});

document.getElementById('exportEmployeesAction').addEventListener('click', () => {
  exportEmployeesCSV();
});
document.getElementById('importEmployeesAction').addEventListener('click', () => {
  triggerImportEmployees();
});
document.getElementById('exportEquipmentAction').addEventListener('click', () => {
  exportEquipmentCSV();
});
document.getElementById('importEquipmentAction').addEventListener('click', () => {
  triggerImportEquipment();
});
document.getElementById('importEmployeesFile').addEventListener('change', handleImportEmployees);
document.getElementById('importEquipmentFile').addEventListener('change', handleImportEquipment);

document.getElementById('employeeSearch').addEventListener('input', (e) => {
  displayEmployeeList(0, e.target.value.trim().toLowerCase());
});
document.getElementById('employeePrev').addEventListener('click', () => {
  displayEmployeeList(employeePage - 1);
});
document.getElementById('employeeNext').addEventListener('click', () => {
  displayEmployeeList(employeePage + 1);
});

document.getElementById('equipmentSearch').addEventListener('input', (e) => {
  displayEquipmentListAdmin(0, e.target.value.trim().toLowerCase());
});
document.getElementById('equipmentPrev').addEventListener('click', () => {
  displayEquipmentListAdmin(equipmentPage - 1);
});
document.getElementById('equipmentNext').addEventListener('click', () => {
  displayEquipmentListAdmin(equipmentPage + 1);
});

document.getElementById('recordFilterForm').addEventListener('submit', (e) => {
  e.preventDefault();
  filterRecords();
});
document.getElementById('clearFiltersBtn').addEventListener('click', clearFilters);
document.getElementById('exportRecordsBtn').addEventListener('click', exportRecordsCSV);

// Set initial active section
showSection('checkout');

