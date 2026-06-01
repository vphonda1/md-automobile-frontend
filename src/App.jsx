// Minimal diagnostic App.jsx — no lazy loading, no external components
// Goal: get login working, then add features back step-by-step
import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';

const BASE_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || 'https://md-automobile-backend.onrender.com';

// ============== Helpers ==============
function getUser() {
  try { return JSON.parse(localStorage.getItem('md_user') || 'null'); }
  catch { return null; }
}

function PrivateRoute({ children }) {
  const user = getUser();
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

// ============== Login Page (inline) ==============
function LoginPage() {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);

  // If already logged in, go to dashboard
  useEffect(() => {
    if (getUser()) navigate('/dashboard', { replace: true });
  }, [navigate]);

  const submit = async (e) => {
    e?.preventDefault();
    if (!identifier || !password) {
      setError('Username और password दोनों ज़रूरी हैं');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: identifier.trim(), password })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || `HTTP ${res.status}`);
        return;
      }
      localStorage.setItem('md_user', JSON.stringify(data.user));
      window.location.href = '/dashboard';
    } catch (err) {
      setError('Network error: ' + (err.message || '') + '\n(Backend Render पर sleeping हो सकता है, 30 sec wait करें)');
    } finally {
      setLoading(false);
    }
  };

  const seedAdmin = async () => {
    setSeeding(true);
    setError('');
    try {
      const res = await fetch(`${BASE_URL}/api/auth/seed-admin`);
      const data = await res.json().catch(() => ({}));
      if (data.success) {
        alert('✅ Default admin बना दिया!\nUsername: admin\nPassword: admin123');
        setIdentifier('admin');
        setPassword('admin123');
      } else {
        alert(data.message || 'Already seeded');
      }
    } catch (err) {
      setError('Seed error: ' + err.message);
    } finally {
      setSeeding(false);
    }
  };

  const S = {
    page: { minHeight: '100vh', background: '#020617', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 },
    wrap: { maxWidth: 400, width: '100%' },
    logo: { width: 80, height: 80, background: '#16a34a', borderRadius: 16, margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, color: 'white' },
    title: { color: '#16a34a', fontSize: 28, fontWeight: 'bold', margin: 0, textAlign: 'center' },
    sub: { color: '#94a3b8', margin: '4px 0 24px', textAlign: 'center', fontSize: 13 },
    card: { background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: 24 },
    h2: { color: 'white', marginTop: 0, marginBottom: 16 },
    err: { background: 'rgba(127,29,29,0.3)', border: '1px solid #7f1d1d', color: '#fca5a5', padding: 10, borderRadius: 8, marginBottom: 16, fontSize: 13, whiteSpace: 'pre-line' },
    label: { color: '#94a3b8', fontSize: 12, display: 'block', marginBottom: 6 },
    input: { width: '100%', padding: 12, background: '#020617', border: '1px solid #1e293b', borderRadius: 8, color: 'white', fontSize: 16, boxSizing: 'border-box', marginBottom: 12 },
    btn: { width: '100%', padding: 14, background: '#16a34a', color: 'white', border: 'none', borderRadius: 8, fontWeight: 'bold', fontSize: 16, cursor: 'pointer' },
    btnDis: { opacity: 0.5, cursor: 'not-allowed' },
    divider: { borderTop: '1px solid #1e293b', marginTop: 20, paddingTop: 16, textAlign: 'center' },
    seedBtn: { width: '100%', padding: 12, background: 'transparent', color: '#94a3b8', border: '1px solid #1e293b', borderRadius: 8, cursor: 'pointer', fontSize: 14 },
    hint: { color: '#64748b', fontSize: 11, marginTop: 6, textAlign: 'center' }
  };

  return (
    <div style={S.page}>
      <div style={S.wrap}>
        <div style={S.logo}>⚡</div>
        <h1 style={S.title}>MD Automobile</h1>
        <p style={S.sub}>Electric Two-Wheeler Dealership</p>

        <div style={S.card}>
          <h2 style={S.h2}>Login</h2>
          {error && <div style={S.err}>{error}</div>}

          <form onSubmit={submit}>
            <label style={S.label}>📧 Email / Mobile / Username</label>
            <input style={S.input} value={identifier} onChange={(e) => setIdentifier(e.target.value)} autoCapitalize="none" />

            <label style={S.label}>🔒 Password</label>
            <input style={S.input} type="password" value={password} onChange={(e) => setPassword(e.target.value)} />

            <button type="submit" disabled={loading} style={{ ...S.btn, ...(loading ? S.btnDis : {}) }}>
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          <div style={S.divider}>
            <div style={{ color: '#94a3b8', fontSize: 12, marginBottom: 8 }}>पहली बार setup कर रहे हैं?</div>
            <button onClick={seedAdmin} disabled={seeding} style={{ ...S.seedBtn, ...(seeding ? S.btnDis : {}) }}>
              {seeding ? 'Creating...' : '👤 Default Admin बनाएं'}
            </button>
            <div style={S.hint}>यह सिर्फ तब काम करेगा जब database में कोई user नहीं है</div>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 16, fontSize: 10, color: '#475569' }}>
          MD Automobile • Diagnostic Mode
        </div>
      </div>
    </div>
  );
}

// ============== Dashboard placeholder ==============
function Dashboard() {
  const user = getUser();
  const logout = () => {
    localStorage.removeItem('md_user');
    window.location.href = '/login';
  };

  return (
    <div style={{ minHeight: '100vh', background: '#020617', color: 'white', padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ color: '#16a34a', margin: 0 }}>⚡ MD Automobile</h1>
        <button onClick={logout} style={{ background: '#dc2626', color: 'white', border: 'none', padding: '8px 16px', borderRadius: 8, cursor: 'pointer' }}>
          Logout
        </button>
      </div>

      <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: 24, marginBottom: 16 }}>
        <h2 style={{ color: '#16a34a', marginTop: 0 }}>✅ Login Successful!</h2>
        <p>नमस्ते <b>{user?.name || 'User'}</b>!</p>
        <p style={{ color: '#94a3b8' }}>Role: {user?.role || 'unknown'}</p>
        <p style={{ color: '#94a3b8' }}>Email: {user?.loginEmail || user?.email || 'N/A'}</p>
      </div>

      <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: 24 }}>
        <h3 style={{ color: '#fde68a', marginTop: 0 }}>🔧 Diagnostic Mode Active</h3>
        <p style={{ color: '#e2e8f0' }}>
          अब login working है! बाकी सब features (Customers, Vehicles, Price List, Tax Invoice, etc.) को step-by-step वापस add करेंगे।
        </p>
        <p style={{ color: '#94a3b8', fontSize: 13 }}>
          Claude को बताइए: "Login हो गया, अब अगले features add करो"
        </p>
      </div>
    </div>
  );
}

// ============== Main App ==============
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
