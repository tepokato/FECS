/**
 * Render the employee list with pagination and filtering.
 * @param {number} page
 * @param {string} filter
 */
function displayEmployeeList(page = employeePage, filter = employeeFilter) {
  filter = (filter || '').toLowerCase();
  const list = document.getElementById('employeeList');
  list.innerHTML = "";
  const entries = Object.entries(employees).sort((a, b) => a[0].localeCompare(b[0]));
  const filtered = entries.filter(([badge, info]) =>
    badge.toLowerCase().includes(filter) ||
    info.name.toLowerCase().includes(filter) ||
    info.homeStation.toLowerCase().includes(filter)
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
    pageItems.forEach(([badge, info]) => {
      const li = document.createElement('li');
      const textSpan = document.createElement('span');
      textSpan.textContent = `${badge}: ${info.name} (${info.homeStation})`;
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

/**
 * Add a new employee based on the admin form inputs.
 */
function addEmployee() {
  const nameInput = document.getElementById('empName');
  const badgeInput = document.getElementById('empBadge');
  const stationInput = document.getElementById('empStation');
  clearFieldError(nameInput);
  clearFieldError(badgeInput);
  clearFieldError(stationInput);
  const badge = badgeInput.value.trim();
  const name = nameInput.value.trim();
  const homeStation = stationInput.value.trim();
  let hasError = false;
  if (!name) {
    setFieldError(nameInput, 'Employee name is required.');
    hasError = true;
  }
  if (!badge) {
    setFieldError(badgeInput, 'Badge ID is required.');
    hasError = true;
  }
  if (!homeStation) {
    setFieldError(stationInput, 'Home station is required.');
    hasError = true;
  }
  if (hasError) return;
  if (employees[badge]) {
    setFieldError(badgeInput, 'Badge ID already exists.');
    showError('Employee with this badge ID already exists!');
    return;
  }
  employees[badge] = { name, homeStation };
  saveToStorage('employees', employees);
  showSuccess('Employee added successfully!');
  displayEmployeeList();
  document.getElementById('adminForm').reset();
  clearFieldError(nameInput);
  clearFieldError(badgeInput);
  clearFieldError(stationInput);
}

/**
 * Remove an employee after confirming intent.
 * @param {string} badge
 */
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

/**
 * Render the equipment list with pagination and filtering.
 * @param {number} page
 * @param {string} filter
 */
function displayEquipmentListAdmin(page = equipmentPage, filter = equipmentFilter) {
  filter = (filter || '').toLowerCase();
  const list = document.getElementById('equipmentListAdmin');
  list.innerHTML = "";
  const entries = Object.entries(equipmentItems).sort((a, b) => a[0].localeCompare(b[0]));
  const filtered = entries.filter(([serial, info]) =>
    serial.toLowerCase().includes(filter) ||
    info.name.toLowerCase().includes(filter) ||
    info.homeStation.toLowerCase().includes(filter)
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
    pageItems.forEach(([serial, info]) => {
      const li = document.createElement('li');
      const textSpan = document.createElement('span');
      textSpan.textContent = `${serial}: ${info.name} (${info.homeStation})`;
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

/**
 * Add a new equipment item based on the admin form inputs.
 */
function addEquipmentAdmin() {
  const nameInput = document.getElementById('equipName');
  const serialInput = document.getElementById('equipSerial');
  const stationInput = document.getElementById('equipStation');
  clearFieldError(nameInput);
  clearFieldError(serialInput);
  clearFieldError(stationInput);
  const serial = serialInput.value.trim();
  const name = nameInput.value.trim();
  const homeStation = stationInput.value.trim();
  let hasError = false;
  if (!name) {
    setFieldError(nameInput, 'Equipment name is required.');
    hasError = true;
  }
  if (!serial) {
    setFieldError(serialInput, 'Equipment serial is required.');
    hasError = true;
  }
  if (!homeStation) {
    setFieldError(stationInput, 'Home station is required.');
    hasError = true;
  }
  if (hasError) return;
  if (equipmentItems[serial]) {
    setFieldError(serialInput, 'Equipment serial already exists.');
    showError('Equipment with this serial already exists!');
    return;
  }
  equipmentItems[serial] = { name, homeStation };
  saveToStorage('equipmentItems', equipmentItems);
  showSuccess('Equipment added successfully!');
  displayEquipmentListAdmin();
  document.getElementById('equipmentAdminForm').reset();
  clearFieldError(nameInput);
  clearFieldError(serialInput);
  clearFieldError(stationInput);
}

/**
 * Record a synthetic check-in when home station changes to keep records consistent.
 * @param {string} serial
 * @param {string} newHomeStation
 */
function handleHomeStationUpdate(serial, newHomeStation) {
  const recs = (typeof records !== 'undefined' && Array.isArray(records)) ? records : (records = []);
  const related = recs.filter(r => Array.isArray(r.equipmentBarcodes) && r.equipmentBarcodes.includes(serial));
  const latest = related[related.length - 1];
  const newNorm = String(newHomeStation || '').toLowerCase();
  if (latest && typeof latest.station === 'string' && latest.station.toLowerCase() === newNorm) {
    if (typeof updateNotifications === 'function') updateNotifications();
    return;
  }
  const timestamp = new Date().toISOString();
  const synthetic = {
    timestamp,
    recordDate: timestamp.slice(0,10),
    badge: '',
    employeeName: '',
    station: newHomeStation,
    equipmentBarcodes: [serial],
    equipmentNames: [(equipmentItems[serial] && equipmentItems[serial].name) || ''],
    action: 'Check-In'
  };
  recs.push(synthetic);
  saveToStorage('records', recs);
  if (typeof updateEquipmentCache === 'function') updateEquipmentCache(synthetic);
  if (typeof updateNotifications === 'function') updateNotifications();
}

/**
 * Update the home station for an equipment item and sync records.
 * @param {string} serial
 * @param {string} newHomeStation
 */
function updateEquipmentHomeStation(serial, newHomeStation) {
  if (!serial || !equipmentItems[serial]) {
    showError('Invalid equipment serial or equipment not found!');
    return;
  }
  equipmentItems[serial].homeStation = newHomeStation;
  saveToStorage('equipmentItems', equipmentItems);
  handleHomeStationUpdate(serial, newHomeStation);
  if (typeof displayEquipmentListAdmin === 'function') displayEquipmentListAdmin();
}

/**
 * Remove an equipment item after confirming intent.
 * @param {string} serial
 */
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

const admin = {
  displayEmployeeList,
  addEmployee,
  removeEmployee,
  displayEquipmentListAdmin,
  addEquipmentAdmin,
  removeEquipmentAdmin,
  updateEquipmentHomeStation
};
if (typeof module !== 'undefined') module.exports = admin;
if (typeof window !== 'undefined') Object.assign(window, admin);
