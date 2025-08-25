function csvEscape(value) {
  return String(value).replace(/"/g, '""');
}

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
  const csvContent = 'data:text/csv;charset=utf-8,' + header + rows.join("\n");
  const link = document.createElement('a');
  link.href = encodeURI(csvContent);
  link.download = `Records_${new Date().toISOString().substring(0,10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function exportEmployeesCSV() {
  let csvContent = "data:text/csv;charset=utf-8,";
  csvContent += "Badge ID,Employee Name\n";
  Object.entries(employees).forEach(([badge, info]) => {
    csvContent += `"${csvEscape(badge)}","${csvEscape(info.name)}"\n`;
  });
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
  Object.entries(equipmentItems).forEach(([serial, info]) => {
    csvContent += `"${csvEscape(serial)}","${csvEscape(info.name)}"\n`;
  });
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
      if (badge && name) {
        if (employees[badge]) {
          const overwrite = typeof confirm === 'function'
            ? confirm(`Badge ID ${badge} already exists. Overwrite?`)
            : true;
          if (!overwrite) {
            continue;
          }
        }
        employees[badge] = { name, homeStation: '' };
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
      if (serial && name) {
        if (equipmentItems[serial]) {
          const overwrite = typeof confirm === 'function'
            ? confirm(`Equipment ID ${serial} already exists. Overwrite?`)
            : true;
          if (!overwrite) {
            continue;
          }
        }
        equipmentItems[serial] = { name, homeStation: '' };
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
