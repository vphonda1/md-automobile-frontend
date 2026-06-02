// smartUtils.js — utility functions for documents, camera, toast, WhatsApp
// Used by DocumentVault and other pages

// ────────── Camera Capture ──────────
// Opens device camera, returns base64 dataURL
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

// ────────── Document Expiry Check ──────────
export function checkExpiry(expiryDate) {
  if (!expiryDate) return { expired: false, warning: false, daysLeft: null };
  const now = new Date();
  const exp = new Date(expiryDate);
  if (isNaN(exp.getTime())) return { expired: false, warning: false, daysLeft: null };
  const days = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
  return {
    expired: days < 0,
    warning: days >= 0 && days <= 30,
    daysLeft: days,
  };
}

// ────────── In-App Toast Notification ──────────
let _toastContainer = null;
function ensureToastContainer() {
  if (_toastContainer) return _toastContainer;
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
    font-size: 13px; font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    display: flex; align-items: flex-start; gap: 8px; pointer-events: auto;
    animation: mdToastIn 0.25s ease;
    max-width: 340px; word-wrap: break-word;
  `;

  // Insert keyframes once
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

// ────────── WhatsApp Deep Link ──────────
export function sendWhatsApp(phone, message) {
  const cleanPhone = String(phone || '').replace(/\D/g, '');
  if (!cleanPhone) {
    alert('❌ Phone number invalid है');
    return;
  }
  // Add India country code if 10 digits
  const fullPhone = cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone;
  const url = `https://wa.me/${fullPhone}?text=${encodeURIComponent(message || '')}`;
  window.open(url, '_blank');
}

// ────────── Helper: Format date for India ──────────
export function formatDateIN(date) {
  if (!date) return '';
  try {
    const d = new Date(date);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch { return ''; }
}

// ────────── Helper: Format currency ──────────
export function formatINR(amount) {
  if (amount == null) return '₹0';
  return '₹' + Number(amount).toLocaleString('en-IN');
}
