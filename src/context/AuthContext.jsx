import React, { createContext, useContext, useState, useEffect } from 'react';

const BASE_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || 'https://md-automobile-backend.onrender.com';

// ============== Safe localStorage helpers (no dependencies) ==============
function lsGet(key) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : null;
  } catch { return null; }
}

function lsSet(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

function lsRemove(key) {
  try { localStorage.removeItem(key); } catch {}
}

// ============== Default context value (prevents null destructure crashes) ==============
const defaultValue = {
  user: null,
  login: async () => { throw new Error('AuthProvider missing'); },
  logout: () => {},
  verifyAdmin: async () => false,
  changePassword: async () => { throw new Error('AuthProvider missing'); },
  isAdmin: () => false,
  isManager: () => false
};

const AuthContext = createContext(defaultValue);

// ============== Provider ==============
export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return lsGet('md_user'); }
    catch { return null; }
  });

  // Login
  const login = async (identifier, password) => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: String(identifier || '').trim(), password })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Login failed (HTTP ${res.status})`);
    lsSet('md_user', data.user);
    setUser(data.user);
    return data.user;
  };

  // Logout
  const logout = () => {
    lsRemove('md_user');
    lsRemove('md_admin_session');
    setUser(null);
  };

  // Verify admin password (5-min session cache)
  const verifyAdmin = async (password) => {
    const session = lsGet('md_admin_session');
    if (session?.until && session.until > Date.now()) return true;

    try {
      const res = await fetch(`${BASE_URL}/api/auth/verify-admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      const data = await res.json().catch(() => ({}));
      if (data.valid) {
        lsSet('md_admin_session', { until: Date.now() + 5 * 60 * 1000 });
        return true;
      }
      return false;
    } catch { return false; }
  };

  // Change password
  const changePassword = async (oldPassword, newPassword) => {
    if (!user?._id) throw new Error('Not logged in');
    const res = await fetch(`${BASE_URL}/api/auth/change-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user._id, oldPassword, newPassword })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Change failed');
    return data;
  };

  // Listen for localStorage changes (cross-tab sync)
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === 'md_user') {
        try { setUser(lsGet('md_user')); }
        catch {}
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // isAdmin and isManager are FUNCTIONS — callable to get current state.
  // Note: function references are always truthy, so always CALL them (isAdmin() not isAdmin)
  const isAdmin = () => ['owner', 'admin'].includes(user?.role);
  const isManager = () => ['owner', 'admin', 'manager'].includes(user?.role);

  const value = { user, login, logout, verifyAdmin, changePassword, isAdmin, isManager };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ============== Hook ==============
export function useAuth() {
  return useContext(AuthContext);
}

export default AuthContext;
