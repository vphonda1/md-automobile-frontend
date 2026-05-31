import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const BASE_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || 'https://md-automobile-backend.onrender.com';

export default function LoginPage() {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const handleLogin = async (e) => {
    if (e?.preventDefault) e.preventDefault();
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
        setError(data.error || `Login failed (HTTP ${res.status})`);
        return;
      }
      // Save user
      try { localStorage.setItem('md_user', JSON.stringify(data.user || {})); }
      catch (e) {}
      // Hard reload to ensure auth context picks up new user
      window.location.href = '/dashboard';
    } catch (err) {
      setError('Network error: ' + (err.message || 'unknown') + '\n(Backend Render पर sleeping हो सकता है, 30 sec wait करके try करें)');
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
        alert(data.message || 'Already seeded — पहले से user exist करता है');
      }
    } catch (err) {
      setError('Seed error: ' + (err.message || 'unknown'));
    } finally {
      setSeeding(false);
    }
  };

  const S = {
    page: { minHeight: '100vh', background: '#020617', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' },
    wrap: { maxWidth: '400px', width: '100%' },
    logo: { width: '80px', height: '80px', background: '#16a34a', borderRadius: '16px', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px', color: 'white' },
    title: { color: '#16a34a', fontSize: '28px', fontWeight: 'bold', margin: 0, textAlign: 'center' },
    sub: { color: '#94a3b8', margin: '4px 0 24px', textAlign: 'center', fontSize: '13px' },
    card: { background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '24px' },
    h2: { color: 'white', marginTop: 0, marginBottom: '16px' },
    errBox: { background: 'rgba(127, 29, 29, 0.3)', border: '1px solid #7f1d1d', color: '#fca5a5', padding: '10px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px', whiteSpace: 'pre-line' },
    label: { color: '#94a3b8', fontSize: '12px', display: 'block', marginBottom: '6px' },
    input: { width: '100%', padding: '12px', background: '#020617', border: '1px solid #1e293b', borderRadius: '8px', color: 'white', fontSize: '16px', boxSizing: 'border-box', marginBottom: '12px' },
    btn: { width: '100%', padding: '14px', background: '#16a34a', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer' },
    btnDis: { opacity: 0.5, cursor: 'not-allowed' },
    divider: { borderTop: '1px solid #1e293b', marginTop: '20px', paddingTop: '16px', textAlign: 'center' },
    seedBtn: { width: '100%', padding: '12px', background: 'transparent', color: '#94a3b8', border: '1px solid #1e293b', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' },
    hint: { color: '#64748b', fontSize: '11px', marginTop: '6px', textAlign: 'center' }
  };

  return (
    <div style={S.page}>
      <div style={S.wrap}>
        <div style={S.logo}>⚡</div>
        <h1 style={S.title}>MD Automobile</h1>
        <p style={S.sub}>Electric Two-Wheeler Dealership</p>

        <div style={S.card}>
          <h2 style={S.h2}>Login</h2>

          {error && <div style={S.errBox}>{error}</div>}

          <form onSubmit={handleLogin}>
            <label style={S.label}>📧 Email / Mobile / Username</label>
            <input
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              style={S.input}
              autoCapitalize="none"
              autoComplete="username"
            />

            <label style={S.label}>🔒 Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={S.input}
              autoComplete="current-password"
            />

            <button type="submit" disabled={loading} style={{ ...S.btn, ...(loading ? S.btnDis : {}) }}>
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          <div style={S.divider}>
            <div style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '8px' }}>पहली बार setup कर रहे हैं?</div>
            <button onClick={seedAdmin} disabled={seeding} style={{ ...S.seedBtn, ...(seeding ? S.btnDis : {}) }}>
              {seeding ? 'Creating...' : '👤 Default Admin बनाएं'}
            </button>
            <div style={S.hint}>यह सिर्फ तब काम करेगा जब database में कोई user नहीं है</div>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '10px', color: '#475569' }}>
          MD Automobile PWA • v1.0
        </div>
      </div>
    </div>
  );
}
