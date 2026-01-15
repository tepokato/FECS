/**
 * Escape CSV fields by doubling quotes so the values remain well-formed.
 * @param {string} value
 * @returns {string}
 */
function csvEscape(value) {
  return String(value).replace(/"/g, '""');
}

/**
 * Escape HTML output to prevent injection into the records table.
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/'/g, '&#39;')
    .replace(/"/g, '&quot;');
}

/**
 * Build a CSV data URI and trigger a download for the provided rows.
 * @param {string} filename
 * @param {string} header
 * @param {string[]} rows
 */
function triggerCsvDownload(filename, header, rows) {
  const csvContent = 'data:text/csv;charset=utf-8,' + header + rows.join("\n");
  const link = document.createElement('a');
  link.href = encodeURI(csvContent);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Render the records table for the supplied record array.
 * @param {Array} recArray
 */
function displayRecords(recArray) {
  const container = document.getElementById('recordsTable');
  if (!recArray.length) {
    container.innerHTML = "<p>No records found.</p>";
    return;
  }
  let html = "<table><caption>Equipment check-in/out records</caption><tr><th>Timestamp</th><th>Badge</th><th>Name</th><th>Station</th><th>Equipment Barcodes</th><th>Equipment Names</th><th>Action</th></tr>";
  recArray.forEach(rec => {
    html += `<tr>
          <td>${escapeHtml(rec.timestamp)}</td>
          <td>${escapeHtml(rec.badge)}</td>
          <td>${escapeHtml(rec.employeeName)}</td>
          <td>${escapeHtml(rec.station ?? '')}</td>
          <td>${escapeHtml((rec.equipmentBarcodes ?? []).join('; '))}</td>
          <td>${escapeHtml((rec.equipmentNames ?? []).join('; '))}</td>
          <td>${escapeHtml(rec.action)}</td>
        </tr>`;
  });
  html += "</table>";
  container.innerHTML = html;
}

/**
 * Filter records based on search inputs and render the results.
 */
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

/**
 * Clear record filters and show all records.
 */
function clearFilters() {
  document.getElementById('recordSearch').value = "";
  document.getElementById('recordEquipment').value = "";
  document.getElementById('recordDate').value = "";
  displayRecords(records);
}

/**
 * Export all records to a CSV download.
 */
function exportRecordsCSV() {
  if (!records.length) {
    if (typeof showError === 'function') {
      showError("No records to export.");
    }
    return;
  }
  const header = "Timestamp,Employee Badge ID,Employee Name,Station,Equipment Barcodes,Equipment Names,Action\n";
  const rows = records.map(rec =>
    `"${csvEscape(rec.timestamp ?? '')}",` +
    `"${csvEscape(rec.badge ?? '')}",` +
    `"${csvEscape(rec.employeeName ?? '')}",` +
    `"${csvEscape(rec.station ?? '')}",` +
    `"${csvEscape((rec.equipmentBarcodes ?? []).join('; ') ?? '')}",` +
    `"${csvEscape((rec.equipmentNames ?? []).join('; ') ?? '')}",` +
    `"${csvEscape(rec.action ?? '')}"`
  );
  triggerCsvDownload(`Records_${new Date().toISOString().substring(0,10)}.csv`, header, rows);
}

/**
 * Export employees to a CSV download.
 */
function exportEmployeesCSV() {
  const header = "Badge ID,Employee Name,Home Station\n";
  const rows = Object.entries(employees).map(([badge, info]) =>
    `"${csvEscape(badge)}","${csvEscape(info.name)}","${csvEscape(info.homeStation ?? '')}"`
  );
  triggerCsvDownload("employees.csv", header, rows);
}

/**
 * Export equipment list to a CSV download.
 */
function exportEquipmentCSV() {
  const header = "Equipment Serial,Equipment Name,Home Station\n";
  const rows = Object.entries(equipmentItems).map(([serial, info]) =>
    `"${csvEscape(serial)}","${csvEscape(info.name)}","${csvEscape(info.homeStation ?? '')}"`
  );
  triggerCsvDownload("equipment.csv", header, rows);
}

/**
 * Open the hidden file input for employee CSV imports.
 */
function triggerImportEmployees() {
  document.getElementById("importEmployeesFile").click();
}

/**
 * Toggle a loading state on import buttons to prevent double actions.
 * @param {HTMLButtonElement} button
 * @param {boolean} loading
 * @param {string} text
 */
function setLoading(button, loading, text = 'Importing...') {
  if (!button) return;
  if (loading) {
    button.disabled = true;
    button.dataset.originalHtml = button.innerHTML;
    button.textContent = text;
  } else {
    button.disabled = false;
    if (button.dataset.originalHtml) {
      button.innerHTML = button.dataset.originalHtml;
      delete button.dataset.originalHtml;
    }
  }
}

/**
 * Parse and apply employee CSV data from an uploaded file.
 * @param {Event} event
 */
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
    if (typeof showError === 'function') {
      showError("Unable to read employees CSV file.");
    }
    setLoading(button, false);
    input.value = "";
  };
  reader.onload = function(e) {
    const text = e.target.result;
    const rows = parseCSV(text);
    for (let i = 1; i < rows.length; i++) {
      const parts = rows[i];
      if (parts.length < 2) {
        if (typeof showError === 'function') {
          showError(`Skipping malformed line ${i + 1}: ${parts.join(',')}`);
        }
        continue;
      }
      let badge = parts[0].replace(/^"|"$/g, '').trim();
      let name = parts[1].replace(/^"|"$/g, '').trim();
      let homeStation = parts[2] ? parts[2].replace(/^"|"$/g, '').trim() : '';
      if (badge && name) {
        if (employees[badge]) {
          const overwrite = typeof confirm === 'function'
            ? confirm(`Badge ID ${badge} already exists. Overwrite?`)
            : true;
          if (!overwrite) {
            continue;
          }
        }
        employees[badge] = { name, homeStation };
      }
    }
    saveToStorage("employees", employees);
    if (typeof showSuccess === 'function') {
      showSuccess("Employee CSV import completed successfully.");
    }
    if (typeof displayEmployeeList === 'function') {
      displayEmployeeList();
    }
    setLoading(button, false);
    input.value = "";
  };
  reader.readAsText(file);
}

/**
 * Open the hidden file input for equipment CSV imports.
 */
function triggerImportEquipment() {
  document.getElementById("importEquipmentFile").click();
}

/**
 * Parse and apply equipment CSV data from an uploaded file.
 * @param {Event} event
 */
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
    if (typeof showError === 'function') {
      showError("Unable to read equipment CSV file.");
    }
    setLoading(button, false);
    input.value = "";
  };
  reader.onload = function(e) {
    const text = e.target.result;
    const rows = parseCSV(text);
    for (let i = 1; i < rows.length; i++) {
      const parts = rows[i];
      if (parts.length < 2) {
        if (typeof showError === 'function') {
          showError(`Skipping malformed line ${i + 1}: ${parts.join(',')}`);
        }
        continue;
      }
      let serial = parts[0].replace(/^"|"$/g, '').trim();
      let name = parts[1].replace(/^"|"$/g, '').trim();
      let homeStation = parts[2] ? parts[2].replace(/^"|"$/g, '').trim() : '';
      if (serial && name) {
        if (equipmentItems[serial]) {
          const overwrite = typeof confirm === 'function'
            ? confirm(`Equipment ID ${serial} already exists. Overwrite?`)
            : true;
          if (!overwrite) {
            continue;
          }
        }
        equipmentItems[serial] = { name, homeStation };
      }
    }
    saveToStorage("equipmentItems", equipmentItems);
    if (typeof showSuccess === 'function') {
      showSuccess("Equipment CSV import completed successfully.");
    }
    if (typeof displayEquipmentListAdmin === 'function') {
      displayEquipmentListAdmin();
    }
    setLoading(button, false);
    input.value = "";
  };
  reader.readAsText(file);
}

/**
 * Wire up the record date picker button if the element exists.
 */
if (typeof document !== 'undefined') {
  const recordDateBtn = document.getElementById('recordDateBtn');
  if (recordDateBtn) {
    recordDateBtn.addEventListener('click', () => {
      const dateInput = document.getElementById('recordDate');
      if (!dateInput) return;
      if (typeof dateInput.showPicker === 'function') {
        dateInput.showPicker();
      } else {
        dateInput.focus();
      }
    });
  }
}

const recordsModule = {
  csvEscape,
  escapeHtml,
  displayRecords,
  filterRecords,
  clearFilters,
  exportRecordsCSV,
  exportEmployeesCSV,
  exportEquipmentCSV,
  triggerImportEmployees,
  setLoading,
  handleImportEmployees,
  triggerImportEquipment,
  handleImportEquipment
};
if (typeof module !== 'undefined') module.exports = recordsModule;
if (typeof window !== 'undefined') Object.assign(window, recordsModule);
