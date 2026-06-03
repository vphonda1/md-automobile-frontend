import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Check, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function ChangePassword() {
  const navigate = useNavigate();
  const { user, changePassword } = useAuth();
  const [form, setForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError(''); setSuccess('');
    if (!form.oldPassword || !form.newPassword) return setError('सभी fields ज़रूरी हैं');
    if (form.newPassword !== form.confirmPassword) return setError('नया password match नहीं हो रहा');
    if (form.newPassword.length < 4) return setError('Password कम से कम 4 characters का हो');

    setLoading(true);
    try {
      await changePassword(form.oldPassword, form.newPassword);
      setSuccess('✅ Password successfully change हो गया!');
      setForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => navigate('/dashboard'), 2000);
    } catch (err) {
      setError(err.message || 'Password change failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 max-w-md mx-auto fade-in" style={{ paddingBottom: 100 }}>
      <button onClick={() => navigate(-1)} className="btn btn-ghost p-2 mb-3"><ArrowLeft size={18} /></button>

      <div className="card">
        <div className="text-center mb-4">
          <div className="inline-flex w-16 h-16 rounded-full bg-green-900/30 items-center justify-center mb-2">
            <Lock size={28} className="text-green-400" />
          </div>
          <h2 className="text-xl font-bold text-green-400">Change Password</h2>
          <p className="text-xs text-slate-400">User: {user?.name} ({user?.loginEmail})</p>
        </div>

        {error && <div className="bg-red-900/30 border border-red-700 text-red-300 p-3 rounded mb-3 text-sm">{error}</div>}
        {success && <div className="bg-green-900/30 border border-green-700 text-green-300 p-3 rounded mb-3 text-sm">{success}</div>}

        <div className="space-y-3">
          <Field label="पुराना Password" type="password" value={form.oldPassword} onChange={(v) => setForm({ ...form, oldPassword: v })} />
          <Field label="नया Password" type="password" value={form.newPassword} onChange={(v) => setForm({ ...form, newPassword: v })} />
          <Field label="Confirm नया Password" type="password" value={form.confirmPassword} onChange={(v) => setForm({ ...form, confirmPassword: v })} />

          <button onClick={handleSubmit} disabled={loading} className="btn btn-primary w-full flex items-center justify-center gap-2">
            <Check size={16} /> {loading ? 'Changing...' : 'Change Password'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text' }) {
  return (
    <div>
      <label className="text-xs text-slate-400 mb-1 block">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} autoComplete="off" />
    </div>
  );
}
