let notificationTimer;
let tempNotificationActive = false;
// Cache of equipment -> { status, lastStation }
// status: positive means checked out more times than checked in
// lastStation: last known station from records
let equipmentStatusCache = {};

function updateEquipmentCache(record) {
  if (!record || !Array.isArray(record.equipmentBarcodes)) return;
  record.equipmentBarcodes.forEach(code => {
    if (!equipmentStatusCache[code]) {
      equipmentStatusCache[code] = { status: 0, lastStation: undefined };
    }
    const entry = equipmentStatusCache[code];
    if (record.action === "Check-Out") {
      entry.status++;
    } else if (record.action === "Check-In") {
      entry.status--;
    }
    if (record.station) {
      entry.lastStation = record.station;
    }
  });
}

function rebuildEquipmentCache() {
  equipmentStatusCache = {};
  const recs = (typeof records !== 'undefined' && Array.isArray(records)) ? records : [];
  recs.forEach(updateEquipmentCache);
}

function clearNotification() {
  const notificationDiv = document.getElementById('notifications');
  notificationDiv.classList.remove('visible');
  notificationDiv.className = '';
  notificationDiv.textContent = '';
  tempNotificationActive = false;
  updateNotifications();
}

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
    notificationTimer = setTimeout(clearNotification, delay);
  } else {
    clearNotification();
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

  const overdue = [];
  const away = [];
  for (let code in equipmentStatusCache) {
    const entry = equipmentStatusCache[code];
    if (entry.status > 0) {
      const name = (equipmentItems[code] && equipmentItems[code].name) || "Unknown Equipment";
      overdue.push(`${code} (${name})`);
    }

    const equipment = equipmentItems[code];
    const home = equipment && equipment.homeStation;
    const last = entry.lastStation;
    const homeNorm = typeof home === 'string' ? home.toLowerCase() : home;
    const lastNorm = typeof last === 'string' ? last.toLowerCase() : last;
    if (homeNorm && lastNorm && homeNorm !== lastNorm) {
      const name = (equipment && equipment.name) || "Unknown Equipment";
      away.push(`${code} (${name})`);
    }
  }

  const messages = [];
  if (overdue.length > 0) messages.push("Overdue Equipment: " + overdue.join(", "));
  if (away.length > 0) messages.push("Equipment Away From Home: " + away.join(", "));
  if (messages.length > 0) {
    notificationDiv.textContent = messages.join(" | ");
    notificationDiv.classList.add('visible');
  } else {
    notificationDiv.textContent = "";
    notificationDiv.classList.remove('visible');
  }
}

const notifications = {
  clearNotification,
  showNotification,
  showSuccess,
  showError,
  setFieldError,
  clearFieldError,
  updateNotifications,
  updateEquipmentCache,
  rebuildEquipmentCache
};
if (typeof module !== 'undefined') module.exports = notifications;
if (typeof window !== 'undefined') Object.assign(window, notifications);
