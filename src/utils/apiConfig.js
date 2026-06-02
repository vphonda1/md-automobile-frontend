// MD Automobile — API Configuration
import { api, apiFetch } from '../utils/apiConfig';
export const API_URL = import.meta.env.VITE_API_URL || 'https://md-automobile-backend.onrender.com';

// MD Automobile business constants (UPDATE THESE)
export const MD_CONFIG = {
  brandName: 'MD Automobile',
  tagline: 'Electric Two-Wheeler Dealership',
  gstin: '23XXXXXXXXXXXXX',           // TODO: MD Automobile GSTIN
  upiId: 'yourupi@bank',                // TODO: MD Automobile UPI
  phone: '9XXXXXXXXX',                  // TODO: MD Automobile phone
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

// Generic API call wrapper with error handling
export async function apiCall(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_URL}${endpoint}`;
  const opts = {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options
  };
  if (opts.body && typeof opts.body === 'object') opts.body = JSON.stringify(opts.body);

  try {
    const res = await fetch(url, opts);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    console.error(`API Error [${endpoint}]:`, err.message);
    throw err;
  }
}

// Convenience methods
export const api = {
  get: (e, q) => apiCall(`${e}${q ? '?' + new URLSearchParams(q).toString() : ''}`),
  post: (e, body) => apiCall(e, { method: 'POST', body }),
  put: (e, body) => apiCall(e, { method: 'PUT', body }),
  patch: (e, body) => apiCall(e, { method: 'PATCH', body }),
  delete: (e) => apiCall(e, { method: 'DELETE' })
};

// LocalStorage helpers
export const ls = {
  get: (key, fallback = null) => {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
    catch { return fallback; }
  },
  set: (key, value) => {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch { return false; }
  },
  remove: (key) => localStorage.removeItem(key)
};

// Subsidy calculator
export const calculateSubsidy = (vehicleModel, batteryCapacity) => {
  // FAME-II: ₹10,000 per kWh capped at 40% of price (simplified)
  const capacity = parseFloat(batteryCapacity) || 2;
  const fame = Math.min(capacity * 10000, 15000);
  const state = MD_CONFIG.stateSubsidyDefault;
  return { fame, state, total: fame + state };
};
