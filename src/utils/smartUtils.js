// smartUtils.js — comprehensive utility functions
// Camera, dates, toast, WhatsApp, currency, strings — सब यहाँ

// ════════════════════════════════════════════════════════════════════════
// DATE / TIME UTILITIES
// ════════════════════════════════════════════════════════════════════════

// Convert any date input to a safe Date object (returns null if invalid)
function toDate(input) {
  if (!input) return null;
  if (input instanceof Date) return isNaN(input.getTime()) ? null : input;
  try {
    const d = new Date(input);
    return isNaN(d.getTime()) ? null : d;
  } catch { return null; }
}

// "DD/MM/YYYY" format (India standard)
export function formatDate(date) {
  const d = toDate(date);
  if (!d) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${d.getFullYear()}`;
}

// Alias
export const formatDateIN = formatDate;

// "YYYY-MM-DD" format for <input type="date">
export function toISODate(date) {
  const d = toDate(date);
  if (!d) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Alias
export const toISO = toISODate;

// Parse a UTC ISO string and return Date in local timezone
// Useful when MongoDB returns "2026-05-15T00:00:00.000Z" and we want to display as local
export function parseUTCDate(input) {
  if (!input) return null;
  try {
    const d = new Date(input);
    return isNaN(d.getTime()) ? null : d;
  } catch { return null; }
}

// Format date + time as "DD/MM/YYYY HH:MM"
export function formatDateTime(date) {
  const d = toDate(date);
  if (!d) return '';
  return `${formatDate(d)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// Time ago: "अभी", "5 min पहले", "2 hr पहले", "3 दिन पहले"
export function timeAgo(date) {
  const d = toDate(date);
  if (!d) return '';
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 60) return 'अभी';
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins} min पहले`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr पहले`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days} दिन पहले`;
  if (days < 30) return `${Math.floor(days / 7)} hafte पहले`;
  return formatDate(d);
}

// Days between two dates
export function daysBetween(a, b) {
  const d1 = toDate(a), d2 = toDate(b || new Date());
  if (!d1 || !d2) return 0;
  return Math.ceil((d2 - d1) / (1000 * 60 * 60 * 24));
}

// ── Date Arithmetic ──
export function addYears(date, years) {
  const d = toDate(date) || new Date();
  const result = new Date(d);
  result.setFullYear(result.getFullYear() + Number(years || 0));
  return result;
}

export function addMonths(date, months) {
  const d = toDate(date) || new Date();
  const result = new Date(d);
  result.setMonth(result.getMonth() + Number(months || 0));
  return result;
}

export function addDays(date, days) {
  const d = toDate(date) || new Date();
  const result = new Date(d);
  result.setDate(result.getDate() + Number(days || 0));
  return result;
}

// Age in years from DOB
export function getAge(dob) {
  const d = toDate(dob);
  if (!d) return 0;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

export const calculateAge = getAge;

// ════════════════════════════════════════════════════════════════════════
// DOCUMENT EXPIRY
// ════════════════════════════════════════════════════════════════════════

export function checkExpiry(expiryDate) {
  if (!expiryDate) return { expired: false, warning: false, daysLeft: null };
  const d = toDate(expiryDate);
  if (!d) return { expired: false, warning: false, daysLeft: null };
  const days = Math.ceil((d - new Date()) / (1000 * 60 * 60 * 24));
  return {
    expired: days < 0,
    warning: days >= 0 && days <= 30,
    daysLeft: days
  };
}

// ════════════════════════════════════════════════════════════════════════
// CAMERA CAPTURE
// ════════════════════════════════════════════════════════════════════════

export async function captureFromCamera() {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.onchange = (e) => {
      const file = e.target.files?.[0];
      if (!file) { reject(new Error('No file selected')); return; }
      if (file.size > 50 * 1024 * 1024) {
        reject(new Error('Image too large (>50MB)'));
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => resolve(ev.target.result);
      reader.onerror = () => reject(new Error('File read failed'));
      reader.readAsDataURL(file);
    };
    input.click();
  });
}

// ════════════════════════════════════════════════════════════════════════
// IN-APP TOAST
// ════════════════════════════════════════════════════════════════════════

let _toastContainer = null;
function ensureToastContainer() {
  if (_toastContainer && document.body.contains(_toastContainer)) return _toastContainer;
  _toastContainer = document.createElement('div');
  _toastContainer.id = 'md-toast-container';
  _toastContainer.style.cssText = `
    position: fixed; top: 16px; left: 50%; transform: translateX(-50%);
    z-index: 99999; display: flex; flex-direction: column; gap: 8px;
    max-width: 90%; width: max-content; pointer-events: none;
  `;
  document.body.appendChild(_toastContainer);
  return _toastContainer;
}

export function showInAppToast(emoji, message, type = 'info') {
  const colors = {
    success: { bg: '#16a34a', border: '#15803d' },
    error: { bg: '#dc2626', border: '#b91c1c' },
    warning: { bg: '#d97706', border: '#b45309' },
    info: { bg: '#2563eb', border: '#1d4ed8' }
  };
  const c = colors[type] || colors.info;

  const container = ensureToastContainer();
  const toast = document.createElement('div');
  toast.style.cssText = `
    background: ${c.bg}; color: white; padding: 10px 14px; border-radius: 8px;
    border: 1px solid ${c.border}; box-shadow: 0 4px 16px rgba(0,0,0,0.4);
    font-size: 13px; display: flex; align-items: flex-start; gap: 8px;
    pointer-events: auto; max-width: 340px; word-wrap: break-word;
    animation: mdToastIn 0.25s ease;
  `;

  if (!document.getElementById('md-toast-keyframes')) {
    const style = document.createElement('style');
    style.id = 'md-toast-keyframes';
    style.textContent = `
      @keyframes mdToastIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes mdToastOut { from { opacity: 1; } to { opacity: 0; transform: translateY(-6px); } }
    `;
    document.head.appendChild(style);
  }

  toast.innerHTML = `
    <span style="font-size:18px;line-height:1;flex-shrink:0">${emoji || 'ℹ️'}</span>
    <span style="line-height:1.4">${String(message || '').replace(/</g, '&lt;')}</span>
  `;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'mdToastOut 0.2s ease forwards';
    setTimeout(() => toast.remove(), 250);
  }, 3500);
}

// Aliases
export const showToast = showInAppToast;
export const toast = showInAppToast;

// ════════════════════════════════════════════════════════════════════════
// WHATSAPP
// ════════════════════════════════════════════════════════════════════════

export function sendWhatsApp(phone, message) {
  const cleanPhoneNum = String(phone || '').replace(/\D/g, '');
  if (!cleanPhoneNum) {
    alert('❌ Phone number invalid है');
    return;
  }
  const fullPhone = cleanPhoneNum.length === 10 ? '91' + cleanPhoneNum : cleanPhoneNum;
  const url = `https://wa.me/${fullPhone}?text=${encodeURIComponent(message || '')}`;
  window.open(url, '_blank');
}

// Aliases for backward compatibility
export const openWhatsApp = sendWhatsApp;
export const whatsappLink = sendWhatsApp;
export const shareWhatsApp = sendWhatsApp;

// ════════════════════════════════════════════════════════════════════════
// CURRENCY
// ════════════════════════════════════════════════════════════════════════

export function formatINR(amount) {
  if (amount == null || amount === '') return '₹0';
  const n = Number(amount);
  if (isNaN(n)) return '₹0';
  return '₹' + n.toLocaleString('en-IN');
}

export const formatCurrency = formatINR;
export const formatMoney = formatINR;

// Parse "₹1,23,456" → 123456
export function parseINR(str) {
  if (str == null) return 0;
  const n = Number(String(str).replace(/[^\d.-]/g, ''));
  return isNaN(n) ? 0 : n;
}

// Words: "12345" → "Twelve Thousand Three Hundred Forty Five"
export function numberToWords(num) {
  if (num == null) return '';
  const n = Math.floor(Number(num));
  if (isNaN(n)) return '';
  if (n === 0) return 'Zero';

  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
                'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
                'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function below100(n) {
    if (n < 20) return ones[n];
    return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
  }
  function below1000(n) {
    if (n < 100) return below100(n);
    return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + below100(n % 100) : '');
  }

  let num2 = Math.abs(n), result = '';
  if (num2 >= 10000000) { result += below1000(Math.floor(num2 / 10000000)) + ' Crore '; num2 %= 10000000; }
  if (num2 >= 100000)   { result += below1000(Math.floor(num2 / 100000)) + ' Lakh ';     num2 %= 100000; }
  if (num2 >= 1000)     { result += below1000(Math.floor(num2 / 1000)) + ' Thousand ';   num2 %= 1000; }
  if (num2 > 0)         { result += below1000(num2); }
  return result.trim();
}

// ════════════════════════════════════════════════════════════════════════
// STRING / PHONE HELPERS
// ════════════════════════════════════════════════════════════════════════

export function cleanPhone(phone) {
  return String(phone || '').replace(/\D/g, '');
}

export function titleCase(str) {
  if (!str) return '';
  return String(str).toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

export function truncate(str, n = 50) {
  if (!str) return '';
  const s = String(str);
  return s.length > n ? s.substring(0, n) + '…' : s;
}

// ════════════════════════════════════════════════════════════════════════
// COPY TO CLIPBOARD
// ════════════════════════════════════════════════════════════════════════

export async function copyToClipboard(text) {
  if (!text) return false;
  try {
    await navigator.clipboard.writeText(String(text));
    return true;
  } catch {
    // Fallback for older browsers
    try {
      const ta = document.createElement('textarea');
      ta.value = String(text);
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      return true;
    } catch { return false; }
  }
}
