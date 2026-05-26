import { API_URL, MD_CONFIG } from './apiConfig';

// ========== Date utilities ==========
export const parseUTCDate = (val) => {
  if (!val) return null;
  if (val instanceof Date && !isNaN(val)) return val;
  if (typeof val === 'number') {
    // Excel serial number
    const excelEpoch = new Date(1899, 11, 30);
    return new Date(excelEpoch.getTime() + val * 86400000);
  }
  if (typeof val === 'string') {
    const d = new Date(val);
    return isNaN(d) ? null : d;
  }
  return null;
};

export const formatDate = (val, format = 'DD/MM/YYYY') => {
  const d = parseUTCDate(val);
  if (!d) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return format === 'YYYY-MM-DD' ? `${yyyy}-${mm}-${dd}` : `${dd}/${mm}/${yyyy}`;
};

export const toISODate = (val) => formatDate(val, 'YYYY-MM-DD');

export const daysBetween = (date1, date2) => {
  const d1 = parseUTCDate(date1);
  const d2 = parseUTCDate(date2);
  if (!d1 || !d2) return 0;
  return Math.round((d2 - d1) / 86400000);
};

export const addYears = (date, years) => {
  const d = parseUTCDate(date) || new Date();
  d.setFullYear(d.getFullYear() + years);
  return toISODate(d);
};

// ========== Number/Currency formatting ==========
export const formatINR = (amount) => {
  const num = Number(amount) || 0;
  return '₹' + num.toLocaleString('en-IN', { maximumFractionDigits: 2 });
};

export const formatNumber = (num) => Number(num || 0).toLocaleString('en-IN');

// ========== WhatsApp sharing ==========
export const openWhatsApp = (mobileNo, message = '') => {
  const clean = String(mobileNo || '').replace(/\D/g, '');
  const number = clean.startsWith('91') ? clean : '91' + clean;
  const url = `https://wa.me/${number}${message ? '?text=' + encodeURIComponent(message) : ''}`;
  window.open(url, '_blank');
};

export const shareInvoiceWhatsApp = (invoice) => {
  const msg = `🏪 *${MD_CONFIG.brandName}*\n\n` +
    `Invoice No: *${invoice.invoiceNumber}*\n` +
    `Date: ${invoice.invoiceDate}\n` +
    `Vehicle: ${invoice.vehicleModel}\n` +
    `Chassis: ${invoice.chassisNo}\n` +
    `Battery: ${invoice.batteryNumber}\n` +
    `Amount: ${formatINR(invoice.totalAmount)}\n` +
    `Subsidy: ${formatINR(invoice.totalSubsidy)}\n` +
    `Final: ${formatINR(invoice.finalPayable)}\n\n` +
    `Thank you for choosing MD Automobile! 🌱⚡`;
  openWhatsApp(invoice.mobileNo, msg);
};

// ========== Push notifications setup ==========
export const enablePushNotifications = async (userId, userName) => {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { success: false, error: 'Push not supported' };
  }

  try {
    const reg = await navigator.serviceWorker.ready;
    const { publicKey } = await fetch(`${API_URL}/api/push/vapid-public-key`).then(r => r.json());
    if (!publicKey) return { success: false, error: 'VAPID key missing' };

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return { success: false, error: 'Permission denied' };

    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey)
    });

    await fetch(`${API_URL}/api/push/save-push-subscription`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription: sub, userId, userName })
    });

    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

// ========== Image compression ==========
export const compressImage = (file, maxSize = 1000, quality = 0.75) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        if (width > height && width > maxSize) {
          height = (height * maxSize) / width;
          width = maxSize;
        } else if (height > maxSize) {
          width = (width * maxSize) / height;
          height = maxSize;
        }
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        canvas.toBlob(blob => resolve(blob), 'image/jpeg', quality);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
};

// ========== Battery health helpers ==========
export const calculateBatteryHealth = (cycles, age) => {
  // Simple linear degradation: ~20% loss over 1000 cycles
  const cycleDegradation = (cycles / 1000) * 20;
  const ageDegradation = (age / 8) * 10; // 10% over 8 years
  return Math.max(0, 100 - cycleDegradation - ageDegradation);
};

// ========== Search helpers ==========
export const universalSearch = (items, query, fields) => {
  if (!query) return items;
  const q = query.toLowerCase();
  return items.filter(item =>
    fields.some(f => String(item[f] || '').toLowerCase().includes(q))
  );
};
