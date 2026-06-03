// ════════════════════════════════════════════════════════════════════════════
// smartUtils.js — MEGA Comprehensive Helper Library
// ════════════════════════════════════════════════════════════════════════════
// MD Automobile + VP Honda - सब features cover करता है
// WhatsApp, Camera, Notifications, Search, Reminders, Dates, Currency, Strings
// ════════════════════════════════════════════════════════════════════════════

// ════════════════════════════════════════════════════════════════════════════
// DATE / TIME HELPERS
// ════════════════════════════════════════════════════════════════════════════

function toDate(input) {
  if (!input) return null;
  if (input instanceof Date) return isNaN(input.getTime()) ? null : input;
  try {
    const d = new Date(input);
    return isNaN(d.getTime()) ? null : d;
  } catch { return null; }
}

// "DD/MM/YYYY"
export function formatDate(date) {
  const d = toDate(date);
  if (!d) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${d.getFullYear()}`;
}
export const formatDateIN = formatDate;
export const formatDateShort = formatDate;

// "DD Mon YYYY"
export function formatDateLong(date) {
  const d = toDate(date);
  if (!d) return '';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// "YYYY-MM-DD" for <input type="date">
export function toISODate(date) {
  const d = toDate(date);
  if (!d) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
export const toISO = toISODate;
export const dateToISO = toISODate;

// Parse UTC ISO string
export function parseUTCDate(input) {
  return toDate(input);
}
export const parseDate = parseUTCDate;

// "DD/MM/YYYY HH:MM"
export function formatDateTime(date) {
  const d = toDate(date);
  if (!d) return '';
  return `${formatDate(d)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// Time ago
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

export function daysBetween(a, b) {
  const d1 = toDate(a), d2 = toDate(b || new Date());
  if (!d1 || !d2) return 0;
  return Math.ceil((d2 - d1) / (1000 * 60 * 60 * 24));
}

// Date arithmetic
export function addYears(date, years) {
  const d = toDate(date) || new Date();
  const r = new Date(d);
  r.setFullYear(r.getFullYear() + Number(years || 0));
  return r;
}
export function addMonths(date, months) {
  const d = toDate(date) || new Date();
  const r = new Date(d);
  r.setMonth(r.getMonth() + Number(months || 0));
  return r;
}
export function addDays(date, days) {
  const d = toDate(date) || new Date();
  const r = new Date(d);
  r.setDate(r.getDate() + Number(days || 0));
  return r;
}

// Age from DOB
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

// ════════════════════════════════════════════════════════════════════════════
// CURRENCY / NUMBER
// ════════════════════════════════════════════════════════════════════════════

export function formatINR(amount) {
  if (amount == null || amount === '') return '₹0';
  const n = Number(amount);
  if (isNaN(n)) return '₹0';
  return '₹' + n.toLocaleString('en-IN');
}
export const formatCurrency = formatINR;
export const formatMoney = formatINR;
export const formatRupees = formatINR;

export function parseINR(str) {
  if (str == null) return 0;
  const n = Number(String(str).replace(/[^\d.-]/g, ''));
  return isNaN(n) ? 0 : n;
}

export function numberToWords(num) {
  if (num == null) return '';
  const n = Math.floor(Number(num));
  if (isNaN(n) || n === 0) return n === 0 ? 'Zero' : '';
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
                'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
                'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const below100 = (x) => x < 20 ? ones[x] : tens[Math.floor(x/10)] + (x%10 ? ' ' + ones[x%10] : '');
  const below1000 = (x) => x < 100 ? below100(x) : ones[Math.floor(x/100)] + ' Hundred' + (x%100 ? ' ' + below100(x%100) : '');
  let num2 = Math.abs(n), result = '';
  if (num2 >= 10000000) { result += below1000(Math.floor(num2 / 10000000)) + ' Crore '; num2 %= 10000000; }
  if (num2 >= 100000)   { result += below1000(Math.floor(num2 / 100000)) + ' Lakh ';     num2 %= 100000; }
  if (num2 >= 1000)     { result += below1000(Math.floor(num2 / 1000)) + ' Thousand ';   num2 %= 1000; }
  if (num2 > 0)         { result += below1000(num2); }
  return result.trim();
}

// ════════════════════════════════════════════════════════════════════════════
// STRING / PHONE
// ════════════════════════════════════════════════════════════════════════════

export function cleanPhone(phone) {
  return String(phone || '').replace(/\D/g, '');
}
export const sanitizePhone = cleanPhone;

export function titleCase(str) {
  if (!str) return '';
  return String(str).toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}
export const capitalize = titleCase;

export function truncate(str, n = 50) {
  if (!str) return '';
  const s = String(str);
  return s.length > n ? s.substring(0, n) + '…' : s;
}

export async function copyToClipboard(text) {
  if (!text) return false;
  try {
    await navigator.clipboard.writeText(String(text));
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = String(text); ta.style.position = 'fixed'; ta.style.left = '-9999px';
      document.body.appendChild(ta); ta.select(); document.execCommand('copy');
      document.body.removeChild(ta); return true;
    } catch { return false; }
  }
}

// Validators
export function validateMobile(phone) {
  const clean = cleanPhone(phone);
  return clean.length === 10 && /^[6-9]/.test(clean);
}
export function validateAadhar(aadhar) {
  const clean = String(aadhar || '').replace(/\D/g, '');
  return clean.length === 12;
}
export function validatePAN(pan) {
  return /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(String(pan || '').toUpperCase());
}
export function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || ''));
}

// ════════════════════════════════════════════════════════════════════════════
// WHATSAPP
// ════════════════════════════════════════════════════════════════════════════

export const sendWhatsApp = (phone, message) => {
  if (!phone) { alert('❌ Phone number नहीं है'); return false; }
  const cleaned = String(phone).replace(/[\s\-+]/g, '');
  const final = cleaned.length === 10 ? `91${cleaned}` : cleaned;
  const url = `https://wa.me/${final}?text=${encodeURIComponent(message || '')}`;
  window.open(url, '_blank');
  return true;
};
// Aliases (every possible name)
export const openWhatsApp = sendWhatsApp;
export const whatsappLink = sendWhatsApp;
export const shareWhatsApp = sendWhatsApp;
export const whatsapp = sendWhatsApp;

const ordinalSuffix = (n) => {
  const num = Number(n);
  if (num === 1) return 'st'; if (num === 2) return 'nd';
  if (num === 3) return 'rd'; return 'th';
};

// Build WhatsApp messages
export const buildInvoiceWAMessage = (invoice) => {
  const greet = `नमस्ते ${invoice.customerName || 'Customer'} जी 🙏`;
  return greet + `

आपकी MD Automobile की Tax Invoice तैयार है:

📄 Invoice No: ${invoice.invoiceNumber || invoice.invoiceNo || invoice.serialNo || '-'}
🏍️ Vehicle: ${invoice.vehicleModel || '-'}
🎨 Color: ${invoice.color || invoice.vehicleColor || '-'}
🔢 Chassis: ${invoice.chassisNo || '-'}
💰 Total: ${formatINR(invoice.price || invoice.netAmount || 0)}
📅 Date: ${formatDate(invoice.invoiceDate || invoice.saleDate || new Date())}

धन्यवाद! 🙏
MD Automobile, Bhopal`;
};

export const buildServiceReminderWA = (customer, serviceNo, dueDate) => {
  return `नमस्ते ${customer.name || customer.customerName || 'Customer'} जी 🙏

आपकी ${customer.vehicle || customer.vehicleModel || 'scooter'} की ${serviceNo}${ordinalSuffix(serviceNo)} Free Service ${dueDate ? `${formatDate(dueDate)} को` : 'जल्दी'} due है।

कृपया MD Automobile पर आएं।
- MD Automobile Team`;
};

export const buildBirthdayWA = (customer) => {
  return `🎂 जन्मदिन की हार्दिक शुभकामनाएं ${customer.name || customer.customerName || 'Customer'} जी! 🎉

आपके जीवन में खुशियाँ बनी रहे।
- MD Automobile`;
};

export const buildCustomWA = (greeting, body, signoff = '- MD Automobile') =>
  `${greeting}\n\n${body}\n\n${signoff}`;

// Higher-level share functions
export const shareInvoiceWhatsApp = (invoice) => {
  const phone = invoice.customerPhone || invoice.mobileNo || invoice.mobile || invoice.customerMobile;
  const msg = buildInvoiceWAMessage(invoice);
  return sendWhatsApp(phone, msg);
};
export const shareInvoiceWA = shareInvoiceWhatsApp;
export const sendInvoiceWhatsApp = shareInvoiceWhatsApp;

export const shareServiceReminder = (customer, serviceNo, dueDate) => {
  const phone = customer.mobileNo || customer.phone || customer.mobile;
  const msg = buildServiceReminderWA(customer, serviceNo, dueDate);
  return sendWhatsApp(phone, msg);
};

export const shareBirthdayWish = (customer) => {
  const phone = customer.mobileNo || customer.phone || customer.mobile;
  return sendWhatsApp(phone, buildBirthdayWA(customer));
};

// ════════════════════════════════════════════════════════════════════════════
// CAMERA
// ════════════════════════════════════════════════════════════════════════════

export const captureFromCamera = (facingMode = 'environment') => {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = facingMode;
    input.style.display = 'none';
    input.onchange = (e) => {
      const file = e.target.files?.[0];
      if (!file) return reject('No photo captured');
      const reader = new FileReader();
      reader.onload = () => {
        compressImage(reader.result, 1200, 0.7).then(resolve).catch(reject);
      };
      reader.onerror = () => reject('Failed to read photo');
      reader.readAsDataURL(file);
    };
    input.click();
    setTimeout(() => input.remove(), 60000);
  });
};

export const compressImage = (input, maxWidth = 1200, quality = 0.7) => {
  return new Promise((resolve, reject) => {
    // Helper: do the actual compression from base64
    const compressFromBase64 = (base64) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          let { width, height } = img;
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
          canvas.width = width;
          canvas.height = height;
          canvas.getContext('2d').drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        } catch (e) {
          reject(new Error('Image compression failed: ' + (e.message || 'canvas error')));
        }
      };
      img.onerror = () => reject(new Error('Image format invalid or corrupt'));
      img.src = base64;
    };

    // Handle both File/Blob inputs and base64 strings
    if (typeof input === 'string') {
      compressFromBase64(input);
    } else if (input instanceof Blob || (input && input.type && input.size)) {
      // It's a File or Blob - convert to base64 first
      const reader = new FileReader();
      reader.onload = () => compressFromBase64(reader.result);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(input);
    } else {
      reject(new Error('Invalid input: expected File, Blob or base64 string'));
    }
  });
};

export const getBase64Size = (base64) => {
  if (!base64) return '0 KB';
  const stringLength = base64.length - 'data:image/jpeg;base64,'.length;
  const sizeInBytes = (stringLength * 3) / 4;
  const sizeInKB = sizeInBytes / 1024;
  if (sizeInKB < 1024) return `${Math.round(sizeInKB)} KB`;
  return `${(sizeInKB / 1024).toFixed(1)} MB`;
};

export const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const downloadFile = (content, filename, mime = 'application/octet-stream') => {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

// ════════════════════════════════════════════════════════════════════════════
// NOTIFICATIONS / TOAST
// ════════════════════════════════════════════════════════════════════════════

export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  try { return (await Notification.requestPermission()) === 'granted'; }
  catch { return false; }
};

export const showNotification = (title, body, options = {}) => {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    showInAppToast(title, body, options.type || 'info');
    return;
  }
  try {
    const notif = new Notification(title, {
      body, icon: '/icons/icon-192.png', badge: '/icons/icon-96.png',
      tag: options.tag || 'md-automobile', requireInteraction: options.persistent || false,
      ...options,
    });
    if (options.onClick) notif.onclick = options.onClick;
    if (!options.persistent) setTimeout(() => notif.close(), 5000);
  } catch { showInAppToast(title, body, options.type || 'info'); }
};

export const showInAppToast = (title, body, type = 'info') => {
  const colors = {
    info:    { bg: '#1e40af', icon: 'ℹ️' },
    success: { bg: '#16a34a', icon: '✅' },
    warning: { bg: '#ea580c', icon: '⚠️' },
    error:   { bg: '#dc2626', icon: '❌' },
  };
  const c = colors[type] || colors.info;
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed; top: 20px; right: 20px;
    background: ${c.bg}; color: white;
    padding: 14px 18px; border-radius: 10px;
    box-shadow: 0 10px 40px rgba(0,0,0,0.3);
    z-index: 9999; max-width: 360px;
    display: flex; align-items: flex-start; gap: 12px;
    font-family: -apple-system, sans-serif;
    animation: md-toast-slide-in 0.3s ease;
  `;
  toast.innerHTML = `
    <div style="font-size:24px;line-height:1">${c.icon}</div>
    <div style="flex:1;min-width:0">
      <div style="font-weight:700;font-size:14px">${title || ''}</div>
      ${body ? `<div style="font-size:12px;opacity:0.9;margin-top:3px">${body}</div>` : ''}
    </div>
  `;
  if (!document.getElementById('md-toast-style')) {
    const style = document.createElement('style');
    style.id = 'md-toast-style';
    style.textContent = `
      @keyframes md-toast-slide-in { from { transform: translateX(120%); } to { transform: translateX(0); } }
      @keyframes md-toast-slide-out { to { transform: translateX(120%); opacity: 0; } }
    `;
    document.head.appendChild(style);
  }
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'md-toast-slide-out 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
};
export const showToast = showInAppToast;
export const toast = showInAppToast;

// ════════════════════════════════════════════════════════════════════════════
// SEARCH (universal)
// ════════════════════════════════════════════════════════════════════════════

const scoreMatch = (query, fields) => {
  let score = 0;
  fields.forEach(field => {
    if (!field) return;
    const f = String(field).toLowerCase();
    if (f === query) score += 100;
    else if (f.startsWith(query)) score += 50;
    else if (f.includes(query)) score += 20;
  });
  return score;
};

export const universalSearch = (query, dataSets = {}) => {
  if (!query || query.length < 2) return [];
  const q = query.toLowerCase().trim();
  const results = [];

  (dataSets.customers || []).forEach(c => {
    const s = scoreMatch(q, [c.customerName || c.name, c.mobileNo || c.phone, c.fatherName, c.address, c.aadhar, c.pan]);
    if (s > 0) results.push({ type: 'customer', icon: '👤', title: c.customerName || c.name || 'Unknown', subtitle: `📞 ${c.mobileNo || c.phone || '-'} | ${c.address || ''}`, data: c, score: s, link: `/customers/${c._id}` });
  });
  (dataSets.vehicles || []).forEach(v => {
    const s = scoreMatch(q, [v.customerName, v.vehicleModel, v.chassisNo, v.engineNo, v.motorNo, v.regNo, v.mobileNo]);
    if (s > 0) results.push({ type: 'vehicle', icon: '🏍️', title: `${v.vehicleModel} — ${v.color || ''}`, subtitle: `${v.customerName || '-'} | Chassis: ${v.chassisNo || '-'}`, data: v, score: s, link: `/vehicles` });
  });
  (dataSets.invoices || []).forEach(i => {
    const s = scoreMatch(q, [i.invoiceNumber, i.invoiceNo, i.customerName, i.vehicleModel, i.chassisNo]);
    if (s > 0) results.push({ type: 'invoice', icon: '📄', title: `Invoice ${i.invoiceNumber || i.invoiceNo || '-'}`, subtitle: `${i.customerName} | ${formatINR(i.price || 0)}`, data: i, score: s, link: `/invoices` });
  });
  (dataSets.parts || []).forEach(p => {
    const s = scoreMatch(q, [p.partName, p.partNumber, p.category]);
    if (s > 0) results.push({ type: 'part', icon: '🔧', title: p.partName || 'Part', subtitle: `#${p.partNumber || '-'} | Stock: ${p.stock || 0}`, data: p, score: s, link: `/parts` });
  });

  return results.sort((a, b) => b.score - a.score).slice(0, 20);
};

// ════════════════════════════════════════════════════════════════════════════
// SERVICE REMINDERS / EXPIRY
// ════════════════════════════════════════════════════════════════════════════

export const getServiceSchedule = (purchaseDate) => {
  const start = toDate(purchaseDate);
  if (!start) return [];
  return [
    { num: 1, label: '1st Free Service', months: 1, km: 750 },
    { num: 2, label: '2nd Free Service', months: 6, km: 4000 },
    { num: 3, label: '3rd Free Service', months: 12, km: 8000 },
    { num: 4, label: '4th Free Service', months: 18, km: 12000 },
    { num: 5, label: '5th Free Service', months: 24, km: 16000 },
  ].map(s => {
    const due = addMonths(start, s.months);
    const diffDays = Math.ceil((due - new Date()) / (1000 * 60 * 60 * 24));
    return {
      ...s,
      dueDate: toISODate(due),
      dueDateFormatted: formatDate(due),
      daysRemaining: diffDays,
      isDue: diffDays <= 0,
      isUpcoming: diffDays > 0 && diffDays <= 7,
      status: diffDays <= 0 ? 'overdue' : diffDays <= 7 ? 'upcoming' : 'future',
    };
  });
};

export const checkExpiry = (expiryDate, type = 'Document') => {
  const due = toDate(expiryDate);
  if (!due) return null;
  const today = new Date();
  const diffDays = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { type, status: 'expired', days: Math.abs(diffDays), expired: true, warning: false, daysLeft: diffDays, msg: `${type} expired ${Math.abs(diffDays)} days ago` };
  if (diffDays <= 30) return { type, status: 'expiring', days: diffDays, expired: false, warning: true, daysLeft: diffDays, msg: `${type} expires in ${diffDays} days` };
  return { type, status: 'ok', days: diffDays, expired: false, warning: false, daysLeft: diffDays, msg: `${type} valid` };
};

// ════════════════════════════════════════════════════════════════════════════
// VISITOR / PICKUP-DROP (localStorage based)
// ════════════════════════════════════════════════════════════════════════════

export const recordVisitor = async (visitorData) => {
  const visitor = {
    id: `vis_${Date.now()}`,
    visitTime: new Date().toISOString(),
    converted: false,
    ...visitorData,
  };
  const existing = JSON.parse(localStorage.getItem('md_visitors') || '[]');
  existing.unshift(visitor);
  localStorage.setItem('md_visitors', JSON.stringify(existing.slice(0, 500)));
  return visitor;
};

export const getVisitorStats = () => {
  const visitors = JSON.parse(localStorage.getItem('md_visitors') || '[]');
  const today = new Date().toISOString().split('T')[0];
  const todayVisitors = visitors.filter(v => v.visitTime?.startsWith(today));
  const last7 = visitors.filter(v => (Date.now() - new Date(v.visitTime).getTime()) / 86400000 <= 7);
  const last30 = visitors.filter(v => (Date.now() - new Date(v.visitTime).getTime()) / 86400000 <= 30);
  const converted = last30.filter(v => v.converted).length;
  return {
    today: todayVisitors.length, last7Days: last7.length, last30Days: last30.length, total: visitors.length,
    conversionRate: last30.length ? Math.round((converted / last30.length) * 100) : 0,
    purchase: todayVisitors.filter(v => v.purpose === 'Purchase').length,
    service: todayVisitors.filter(v => v.purpose === 'Service').length,
    inquiry: todayVisitors.filter(v => v.purpose === 'Inquiry').length,
    general: todayVisitors.filter(v => v.purpose === 'General').length,
  };
};

export const recordPickupDrop = async (data) => {
  const entry = {
    id: `pd_${Date.now()}`, type: 'pickup', status: 'scheduled',
    pickupTime: new Date().toISOString(), photos: [], ...data,
  };
  const existing = JSON.parse(localStorage.getItem('md_pickup_drops') || '[]');
  existing.unshift(entry);
  localStorage.setItem('md_pickup_drops', JSON.stringify(existing.slice(0, 200)));
  return entry;
};

export const getPickupDropStats = () => {
  const list = JSON.parse(localStorage.getItem('md_pickup_drops') || '[]');
  const today = new Date().toISOString().split('T')[0];
  const todayItems = list.filter(p => p.pickupTime?.startsWith(today));
  return {
    total: list.length, today: todayItems.length,
    pending: list.filter(p => p.status === 'scheduled').length,
    inTransit: list.filter(p => p.status === 'in-transit').length,
    completed: list.filter(p => p.status === 'completed').length,
    todayPickups: todayItems.filter(p => p.type === 'pickup').length,
    todayDrops: todayItems.filter(p => p.type === 'drop').length,
  };
};

export const updatePickupDrop = (id, updates) => {
  const list = JSON.parse(localStorage.getItem('md_pickup_drops') || '[]');
  const idx = list.findIndex(p => p.id === id);
  if (idx === -1) return false;
  list[idx] = { ...list[idx], ...updates, updatedAt: new Date().toISOString() };
  localStorage.setItem('md_pickup_drops', JSON.stringify(list));
  return list[idx];
};

// ════════════════════════════════════════════════════════════════════════════
// GEOLOCATION
// ════════════════════════════════════════════════════════════════════════════

export const getCurrentLocation = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject('Location not supported');
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
      (err) => reject(err.message),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
};

// ════════════════════════════════════════════════════════════════════════════
// MISC UTILITIES
// ════════════════════════════════════════════════════════════════════════════

export function debounce(fn, ms = 300) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

export function throttle(fn, ms = 300) {
  let last = 0;
  return (...args) => { const now = Date.now(); if (now - last >= ms) { last = now; fn(...args); } };
}

export const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ════════════════════════════════════════════════════════════════════════════
// DEFAULT EXPORT (everything as object)
// ════════════════════════════════════════════════════════════════════════════

export default {
  // Dates
  formatDate, formatDateIN, formatDateShort, formatDateLong, formatDateTime,
  toISODate, toISO, dateToISO, parseUTCDate, parseDate, timeAgo, daysBetween,
  addYears, addMonths, addDays, getAge, calculateAge,
  // Currency
  formatINR, formatCurrency, formatMoney, formatRupees, parseINR, numberToWords,
  // Strings
  cleanPhone, sanitizePhone, titleCase, capitalize, truncate, copyToClipboard,
  validateMobile, validateAadhar, validatePAN, validateEmail,
  // WhatsApp
  sendWhatsApp, openWhatsApp, whatsappLink, shareWhatsApp, whatsapp,
  buildInvoiceWAMessage, buildServiceReminderWA, buildBirthdayWA, buildCustomWA,
  shareInvoiceWhatsApp, shareInvoiceWA, sendInvoiceWhatsApp, shareServiceReminder, shareBirthdayWish,
  // Camera/Files
  captureFromCamera, compressImage, getBase64Size, fileToBase64, downloadFile,
  // Notifications/Toast
  requestNotificationPermission, showNotification, showInAppToast, showToast, toast,
  // Search
  universalSearch,
  // Reminders/Expiry
  getServiceSchedule, checkExpiry,
  // Visitor/PickupDrop
  recordVisitor, getVisitorStats, recordPickupDrop, getPickupDropStats, updatePickupDrop,
  // Location
  getCurrentLocation,
  // Misc
  debounce, throttle, sleep,
};
