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

function saveToStorage(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

function csvEscape(value) {
  return String(value).replace(/["\r\n]/g, c => c + c);
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
    rec.equipmentBarcodes.forEach(code => {
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
  input.placeholder = 'Scan Equipment Barcode';
  input.required = true;
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
    input.disabled = true;
    const equipmentList = document.getElementById('equipmentList');
    const inputs = equipmentList.querySelectorAll('input[name="equipment"]');
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
  const equipmentInputs = document.querySelectorAll('#equipmentList input[name="equipment"]');
  for (const input of equipmentInputs) {
    const code = input.value.trim();
    if (!equipmentItems[code]) {
      showError("Error: Equipment barcode '" + code + "' not recognized. Please scan a valid equipment barcode.");
      return;
    }
  }

  const employeeName = employees[badge] || "Unknown";
  const action = document.getElementById('action').value;
  const now = new Date();
  const timeString = now.toLocaleTimeString('en-US', {hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true});
  const recordDate = now.toISOString().substring(0,10);
  const timestamp = `${(now.getMonth()+1).toString().padStart(2, '0')}/${now.getDate().toString().padStart(2, '0')}/${now.getFullYear()} ${timeString}`;

  const equipmentBarcodes = [];
  const equipmentNames = [];
  equipmentInputs.forEach(input => {
    const code = input.value.trim();
    if (code) {
      equipmentBarcodes.push(code);
      equipmentNames.push(equipmentItems[code] || "");
    }
  });

  const record = { timestamp, recordDate, badge, employeeName, equipmentBarcodes, equipmentNames, action };
  records.push(record);
  saveToStorage('records', records);
  showSuccess('Record saved locally!');
  this.reset();
  document.getElementById('employeeName').textContent = "";
  const equipmentList = document.getElementById('equipmentList');
  equipmentList.innerHTML = "";
  addEquipmentField();
});

/* ---------- Admin Panel Functions ---------- */
function displayEmployeeList() {
  const list = document.getElementById('employeeList');
  list.innerHTML = "";
  for (let [badge, name] of Object.entries(employees)) {
    const li = document.createElement('li');
    li.textContent = `${badge}: ${name}`;
    list.appendChild(li);
  }
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
function removeEmployee() {
  const badge = document.getElementById('empBadge').value.trim();
  if (badge && employees[badge]) {
    delete employees[badge];
    saveToStorage('employees', employees);
    showSuccess('Employee removed successfully!');
    displayEmployeeList();
    document.getElementById('adminForm').reset();
  } else {
    showError('Invalid badge ID or employee not found!');
  }
}
function displayEquipmentListAdmin() {
  const list = document.getElementById('equipmentListAdmin');
  list.innerHTML = "";
  for (let [serial, name] of Object.entries(equipmentItems)) {
    const li = document.createElement('li');
    li.textContent = `${serial}: ${name}`;
    list.appendChild(li);
  }
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
function removeEquipmentAdmin() {
  const serial = document.getElementById('equipSerial').value.trim();
  if (serial && equipmentItems[serial]) {
    delete equipmentItems[serial];
    saveToStorage('equipmentItems', equipmentItems);
    showSuccess('Equipment removed successfully!');
    displayEquipmentListAdmin();
    document.getElementById('equipmentAdminForm').reset();
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
          <td>${escapeHtml(rec.equipmentBarcodes.join('; '))}</td>
          <td>${escapeHtml(rec.equipmentNames.join('; '))}</td>
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
    `"${csvEscape(rec.timestamp)}","${csvEscape(rec.badge)}","${csvEscape(rec.employeeName)}","${csvEscape(rec.equipmentBarcodes.join('; '))}","${csvEscape(rec.equipmentNames.join('; '))}","${csvEscape(rec.action)}"`
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

document.getElementById('navCheckout').addEventListener('click', (e) => { e.preventDefault(); showSection('checkout'); });
document.getElementById('navAdmin').addEventListener('click', (e) => { e.preventDefault(); showSection('admin'); });
document.getElementById('navRecords').addEventListener('click', (e) => { e.preventDefault(); showSection('records'); });

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
document.getElementById('removeEmployeeBtn').addEventListener('click', removeEmployee);
document.getElementById('addEquipmentAdminBtn').addEventListener('click', addEquipmentAdmin);
document.getElementById('removeEquipmentAdminBtn').addEventListener('click', removeEquipmentAdmin);

document.getElementById('exportEmployeesBtn').addEventListener('click', exportEmployeesCSV);
document.getElementById('importEmployeesBtn').addEventListener('click', triggerImportEmployees);
document.getElementById('importEmployeesFile').addEventListener('change', handleImportEmployees);

document.getElementById('exportEquipmentBtn').addEventListener('click', exportEquipmentCSV);
document.getElementById('importEquipmentBtn').addEventListener('click', triggerImportEquipment);
document.getElementById('importEquipmentFile').addEventListener('change', handleImportEquipment);

document.getElementById('filterRecordsBtn').addEventListener('click', filterRecords);
document.getElementById('clearFiltersBtn').addEventListener('click', clearFilters);
document.getElementById('exportRecordsBtn').addEventListener('click', exportRecordsCSV);

// Set initial active section
showSection('checkout');

