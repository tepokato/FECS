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

const admin = {
  displayEmployeeList,
  addEmployee,
  removeEmployee,
  displayEquipmentListAdmin,
  addEquipmentAdmin,
  removeEquipmentAdmin
};
if (typeof module !== 'undefined') module.exports = admin;
if (typeof window !== 'undefined') Object.assign(window, admin);
