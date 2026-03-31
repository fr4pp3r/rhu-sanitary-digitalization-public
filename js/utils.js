/**
 * utils.js
 * Shared helper utilities used across the application.
 */

/**
 * Generate a human-readable reference number.
 * Format: SP-YYYYMMDD-XXXXXX  (6-char alphanumeric suffix)
 * @returns {string}
 */
function generateReferenceNumber() {
  const now    = new Date();
  const yyyy   = now.getFullYear();
  const mm     = String(now.getMonth() + 1).padStart(2, '0');
  const dd     = String(now.getDate()).padStart(2, '0');
  const suffix = Math.random().toString(36).padEnd(8, '0').substring(2, 8).toUpperCase();
  return `SP-${yyyy}${mm}${dd}-${suffix}`;
}

/**
 * Format bytes to a human-readable string.
 * @param {number} bytes
 * @returns {string}
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

/**
 * Return an emoji icon suitable for a file's MIME type / extension.
 * @param {string} filename
 * @returns {string}
 */
function fileIcon(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext)) return '🖼️';
  if (['pdf'].includes(ext)) return '📄';
  if (['doc', 'docx'].includes(ext)) return '📝';
  if (['xls', 'xlsx'].includes(ext)) return '📊';
  return '📎';
}

/**
 * Show a brief toast notification at the bottom-right.
 * @param {string} message
 * @param {'success'|'danger'|'warning'|'info'} type
 * @param {number} duration  milliseconds
 */
function showToast(message, type = 'success', duration = 3500) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  const icons = { success: '✅', danger: '❌', warning: '⚠️', info: 'ℹ️' };
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span><span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.transition = 'opacity .4s ease, transform .4s ease';
    toast.style.opacity    = '0';
    toast.style.transform  = 'translateX(120%)';
    setTimeout(() => toast.remove(), 400);
  }, duration);
}

/**
 * Simple HTML escaping to avoid XSS when inserting user-controlled strings.
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * Retrieve a URL query-string parameter value.
 * @param {string} name
 * @returns {string|null}
 */
function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

/**
 * Persist a value to localStorage (JSON serialised).
 * @param {string} key
 * @param {*}      value
 */
function saveLocal(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* quota exceeded */ }
}

/**
 * Load and JSON-parse a value from localStorage.
 * @param {string} key
 * @param {*}      fallback
 * @returns {*}
 */
function loadLocal(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    return raw !== null ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}

/**
 * Format a date-time string or Date object for display.
 * @param {string|Date} dt
 * @returns {string}
 */
function formatDateTime(dt) {
  if (!dt) return '—';
  const d = new Date(dt);
  if (isNaN(d)) return String(dt);
  return d.toLocaleString('en-PH', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export {
  generateReferenceNumber,
  formatFileSize,
  fileIcon,
  showToast,
  escapeHtml,
  getQueryParam,
  saveLocal,
  loadLocal,
  formatDateTime,
};
