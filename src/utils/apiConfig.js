// MD Automobile — API Configuration
// NO self-imports! NO circular dependencies!

export const API_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL)
  || 'https://md-automobile-backend.onrender.com';

// ────────── Business Constants ──────────
export const MD_CONFIG = {
  brandName: 'MD Automobile',
  tagline: 'Electric Two-Wheeler Dealership',
  gstin: '23XXXXXXXXXXXXX',
  upiId: 'yourupi@bank',
  phone: '9XXXXXXXXX',
  email: 'admin@mdautomobile.com',
  address: 'Bhopal, Madhya Pradesh',
  city: 'Bhopal',
  state: 'Madhya Pradesh',
  pincode: '462001',
  primaryColor: '#16a34a',
  secondaryColor: '#2563eb',
  fameSubsidyDefault: 10000,
  stateSubsidyDefault: 5000
};

// ────────── URL Builder (call as function: api('/api/x')) ──────────
// Returns full URL — e.g., api('/api/customers') → 'https://.../api/customers'
export function api(path) {
  if (!path) return API_URL;
  const p = String(path);
  return p.startsWith('http') ? p : `${API_URL}${p.startsWith('/') ? '' : '/'}${p}`;
}

// ────────── apiFetch — fetch + JSON parse + error handling ──────────
// Used by: DocumentVault, AuthContext, और कई pages
export async function apiFetch(endpoint, options = {}) {
  const url = api(endpoint);
  const opts = {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  };
  if (opts.body && typeof opts.body === 'object' && !(opts.body instanceof FormData)) {
    opts.body = JSON.stringify(opts.body);
  }

  try {
    const res = await fetch(url, opts);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || err.message || `HTTP ${res.status}`);
    }
    // Empty response (DELETE etc.) handle
    const text = await res.text();
    return text ? JSON.parse(text) : {};
  } catch (err) {
    console.error(`[apiFetch] ${endpoint}:`, err.message);
    throw err;
  }
}

// Alias for legacy code
export const apiCall = apiFetch;

// ────────── Method Shortcuts attached to `api` function ──────────
// So you can use BOTH: api('/path') for URL, AND api.get('/path') for fetch
api.get = (e, q) => apiFetch(`${e}${q ? '?' + new URLSearchParams(q).toString() : ''}`);
api.post = (e, body) => apiFetch(e, { method: 'POST', body });
api.put = (e, body) => apiFetch(e, { method: 'PUT', body });
api.patch = (e, body) => apiFetch(e, { method: 'PATCH', body });
api.delete = (e) => apiFetch(e, { method: 'DELETE' });

// ────────── LocalStorage Helpers ──────────
export const ls = {
  get: (key, fallback = null) => {
    try {
      const v = localStorage.getItem(key);
      return v == null ? fallback : JSON.parse(v);
    } catch { return fallback; }
  },
  set: (key, value) => {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch { return false; }
  },
  remove: (key) => {
    try { localStorage.removeItem(key); } catch {}
  }
};

// ────────── Subsidy Calculator ──────────
export const calculateSubsidy = (vehicleModel, batteryCapacity) => {
  const capacity = parseFloat(batteryCapacity) || 2;
  const fame = Math.min(capacity * 10000, 15000);
  const state = MD_CONFIG.stateSubsidyDefault;
  return { fame, state, total: fame + state };
};
