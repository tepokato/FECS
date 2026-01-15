/**
 * Load JSON data from localStorage with a fallback if missing or invalid.
 * @param {string} key
 * @param {any} fallback
 * @returns {any}
 */
function loadFromStorage(key, fallback) {
  const item = localStorage.getItem(key);
  if (!item) return fallback;
  try {
    return JSON.parse(item);
  } catch (e) {
    console.warn(`Failed to parse ${key} from storage, resetting to defaults`, e);
    setTimeout(() => {
      if (typeof showError === 'function') {
        showError(`Stored data for ${key} was invalid and has been reset.`);
      }
    }, 0);
    saveToStorage(key, fallback);
    return fallback;
  }
}

/**
 * Persist JSON-serializable data to localStorage.
 * @param {string} key
 * @param {any} data
 */
function saveToStorage(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

const storage = { loadFromStorage, saveToStorage };
if (typeof module !== 'undefined') module.exports = storage;
if (typeof window !== 'undefined') Object.assign(window, storage);
