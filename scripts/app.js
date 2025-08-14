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

  const nameSpan = document.createElement('span');
  nameSpan.className = 'equipmentNameDisplay';

  rowDiv.appendChild(input);
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
  const badge = document.getElementById('badge').value.trim();
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
  const value = input.value.trim();
  const display = input.parentElement.querySelector('.equipmentNameDisplay');
  const equipmentName = equipmentItems[value];
  display.textContent = equipmentName || "";

  if (equipmentName) {
    const equipmentList = document.getElementById('equipmentList');
    const inputs = equipmentList.querySelectorAll('input[name="equipment"]');

    for (const other of inputs) {
      if (other !== input && other.value.trim() === value) {
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

  const badge = document.getElementById('badge').value.trim();
  if (!employees[badge]) {
    showError("Error: Employee badge not recognized. Please scan a valid badge.");
    return;
  }
  const equipmentInputs = Array.from(document.querySelectorAll('#equipmentList input[name="equipment"]'));
  const equipmentCodes = equipmentInputs
    .map(input => input.value.trim())
    .filter(code => code !== "");

  if (equipmentCodes.length === 0) {
    showError("Please scan at least one equipment barcode.");
    return;
  }

  for (const code of equipmentCodes) {
    if (!equipmentItems[code]) {
      showError("Error: Equipment barcode '" + code + "' not recognized. Please scan a valid equipment barcode.");
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
  filtered.slice(start, start + pageSize).forEach(([badge, name]) => {
    const li = document.createElement('li');
    const textSpan = document.createElement('span');
    textSpan.textContent = `${badge}: ${name}`;
    const del = document.createElement('span');
    del.className = 'deleteEmployee';
    del.textContent = '❌';
    del.title = 'Remove Employee';
    del.addEventListener('click', () => removeEmployee(badge));
    li.appendChild(textSpan);
    li.appendChild(del);
    list.appendChild(li);
  });
  employeePage = page;
  employeeFilter = filter;
  const prevBtn = document.getElementById('employeePrev');
  const nextBtn = document.getElementById('employeeNext');
  if (prevBtn) prevBtn.disabled = page <= 0;
  if (nextBtn) nextBtn.disabled = page >= totalPages - 1;
}
function addEmployee() {
  const badge = document.getElementById('empBadge').value.trim();
  const name = document.getElementById('empName').value.trim();
  if (badge && name) {
    employees[badge] = name;
    saveToStorage('employees', employees);
    showSuccess('Employee added successfully!');
    displayEmployeeList();
    document.getElementById('adminForm').reset();
  } else {
    showError('Please enter both employee name and badge ID!');
  }
}
function removeEmployee(badge) {
  if (badge && employees[badge]) {
    delete employees[badge];
    saveToStorage('employees', employees);
    showSuccess('Employee removed successfully!');
    displayEmployeeList();
  } else {
    showError('Invalid badge ID or employee not found!');
  }
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
  filtered.slice(start, start + pageSize).forEach(([serial, name]) => {
    const li = document.createElement('li');
    const textSpan = document.createElement('span');
    textSpan.textContent = `${serial}: ${name}`;
    const del = document.createElement('span');
    del.className = 'deleteEquipment';
    del.textContent = '❌';
    del.title = 'Remove Equipment';
    del.addEventListener('click', () => removeEquipmentAdmin(serial));
    li.appendChild(textSpan);
    li.appendChild(del);
    list.appendChild(li);
  });
  equipmentPage = page;
  equipmentFilter = filter;
  const prevBtn = document.getElementById('equipmentPrev');
  const nextBtn = document.getElementById('equipmentNext');
  if (prevBtn) prevBtn.disabled = page <= 0;
  if (nextBtn) nextBtn.disabled = page >= totalPages - 1;
}
function addEquipmentAdmin() {
  const serial = document.getElementById('equipSerial').value.trim();
  const name = document.getElementById('equipName').value.trim();
  if (serial && name) {
    equipmentItems[serial] = name;
    saveToStorage('equipmentItems', equipmentItems);
    showSuccess('Equipment added successfully!');
    displayEquipmentListAdmin();
    document.getElementById('equipmentAdminForm').reset();
  } else {
    showError('Please enter both equipment name and serial number!');
  }
}
function removeEquipmentAdmin(serial) {
  if (serial && equipmentItems[serial]) {
    delete equipmentItems[serial];
    saveToStorage('equipmentItems', equipmentItems);
    showSuccess('Equipment removed successfully!');
    displayEquipmentListAdmin();
  } else {
    showError('Invalid equipment serial or equipment not found!');
  }
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
  let html = "<table><tr><th>Timestamp</th><th>Badge</th><th>Name</th><th>Equipment Barcodes</th><th>Equipment Names</th><th>Action</th></tr>";
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

function handleImportEmployees(event) {
  const input = event.target;
  if (input.files.length === 0) {
    return;
  }
  const file = input.files[0];
  const reader = new FileReader();
  reader.onerror = function() {
    showError("Failed to read employees file.");
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
    showSuccess("Employees imported successfully!");
    displayEmployeeList();
    input.value = "";
  };
  reader.readAsText(file);
}

function triggerImportEquipment() {
  document.getElementById("importEquipmentFile").click();
}

function handleImportEquipment(event) {
  const input = event.target;
  if (input.files.length === 0) {
    return;
  }
  const file = input.files[0];
  const reader = new FileReader();
  reader.onerror = function() {
    showError("Failed to read equipment file.");
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
    showSuccess("Equipment imported successfully!");
    displayEquipmentListAdmin();
    input.value = "";
  };
  reader.readAsText(file);
}

/* ---------- Event Listeners ---------- */

document.getElementById('navCheckout').addEventListener('click', (e) => {
  e.preventDefault();
  showSection('checkout');
  nav.classList.remove('show');
  navToggle.setAttribute('aria-expanded', 'false');
});
document.getElementById('navAdmin').addEventListener('click', (e) => {
  e.preventDefault();
  showSection('admin');
  nav.classList.remove('show');
  navToggle.setAttribute('aria-expanded', 'false');
});
document.getElementById('navRecords').addEventListener('click', (e) => {
  e.preventDefault();
  showSection('records');
  nav.classList.remove('show');
  navToggle.setAttribute('aria-expanded', 'false');
});

const navToggle = document.getElementById('navToggle');
const nav = document.getElementById('mainNav');
if (navToggle && nav) {
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
document.getElementById('addEmployeeBtn').addEventListener('click', addEmployee);
document.getElementById('addEquipmentAdminBtn').addEventListener('click', addEquipmentAdmin);

const actionBtn = document.getElementById('actionBtn');
const actionMenu = document.getElementById('actionMenu');
if (actionBtn && actionMenu) {
  actionBtn.addEventListener('click', () => {
    actionMenu.classList.toggle('hidden');
  });
  actionMenu.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('action').value = btn.dataset.value || btn.textContent;
      actionBtn.textContent = btn.textContent;
      actionMenu.classList.add('hidden');
    });
  });
}

const importExportBtn = document.getElementById('importExportBtn');
const importExportMenu = document.getElementById('importExportMenu');
importExportBtn.addEventListener('click', () => {
  importExportMenu.classList.toggle('hidden');
});

document.getElementById('exportEmployeesAction').addEventListener('click', () => {
  exportEmployeesCSV();
  importExportMenu.classList.add('hidden');
});
document.getElementById('importEmployeesAction').addEventListener('click', () => {
  triggerImportEmployees();
  importExportMenu.classList.add('hidden');
});
document.getElementById('exportEquipmentAction').addEventListener('click', () => {
  exportEquipmentCSV();
  importExportMenu.classList.add('hidden');
});
document.getElementById('importEquipmentAction').addEventListener('click', () => {
  triggerImportEquipment();
  importExportMenu.classList.add('hidden');
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

document.getElementById('filterRecordsBtn').addEventListener('click', filterRecords);
document.getElementById('clearFiltersBtn').addEventListener('click', clearFilters);
document.getElementById('exportRecordsBtn').addEventListener('click', exportRecordsCSV);

// Set initial active section
showSection('checkout');

