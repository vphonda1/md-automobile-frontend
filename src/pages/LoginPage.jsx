import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Mail, Lock, Loader, UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api, MD_CONFIG } from '../utils/apiConfig';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ identifier: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [seeding, setSeeding] = useState(false);

  const handleSubmit = async () => {
    if (!form.identifier || !form.password) {
      setError('Username और password ज़रूरी हैं');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await login(form.identifier, form.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  // First-time setup: creates default admin if no users exist
  const handleSeedAdmin = async () => {
    setSeeding(true);
    try {
      const res = await api.get('/api/auth/seed-admin');
      if (res.success) {
        alert(`✅ Default admin बना दिया!\n\nUsername: ${res.credentials.username}\nPassword: ${res.credentials.password}\n\n⚠️ Login करते ही password बदल दें!`);
        setForm({ identifier: res.credentials.username, password: res.credentials.password });
      } else {
        alert('ℹ️ ' + res.message);
      }
    } catch (err) {
      alert('❌ ' + err.message);
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-950 via-green-950 to-slate-900">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl gradient-green mb-4 pulse-green">
            <Zap size={40} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-green-400">{MD_CONFIG.brandName}</h1>
          <p className="text-slate-400 text-sm mt-1">{MD_CONFIG.tagline}</p>
        </div>

        <div className="card">
          <h2 className="text-xl font-bold mb-4">Login</h2>
          {error && <div className="bg-red-900/30 border border-red-700 text-red-300 p-3 rounded mb-4 text-sm">{error}</div>}

          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 flex items-center gap-1"><Mail size={12} /> Email / Mobile / Username</label>
              <input
                value={form.identifier}
                onChange={(e) => setForm({ ...form, identifier: e.target.value })}
                onKeyDown={(e) => { if (e.key === 'Enter') document.getElementById('pwd').focus(); }}
                placeholder="admin या email या mobile"
                autoComplete="username"
                autoFocus
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 flex items-center gap-1"><Lock size={12} /> Password</label>
              <input
                id="pwd"
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="btn btn-primary w-full flex items-center justify-center gap-2"
            >
              {loading ? <Loader className="animate-spin" size={18} /> : 'Login'}
            </button>
          </div>

          <div className="border-t border-slate-800 mt-6 pt-4">
            <p className="text-xs text-slate-500 text-center mb-2">पहली बार setup कर रहे हैं?</p>
            <button
              onClick={handleSeedAdmin}
              disabled={seeding}
              className="btn btn-ghost w-full flex items-center justify-center gap-2 text-sm"
            >
              <UserPlus size={14} /> {seeding ? 'Creating...' : 'Default Admin बनाएं'}
            </button>
            <p className="text-[10px] text-slate-600 text-center mt-2">
              यह सिर्फ तब काम करेगा जब database में कोई user नहीं है
            </p>
          </div>
        </div>

        <div className="text-center mt-6 text-xs text-slate-500">
          © 2026 {MD_CONFIG.brandName} • Powered by ⚡
        </div>
      </div>
    </div>
  );
}
