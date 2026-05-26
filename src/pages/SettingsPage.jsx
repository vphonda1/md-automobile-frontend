import React, { useState, useEffect } from 'react';
import { Save, Building, Shield } from 'lucide-react';
import { api, MD_CONFIG } from '../utils/apiConfig';
import { useAuth } from '../context/AuthContext';
import AdminPasswordModal from '../components/AdminPasswordModal';

export default function SettingsPage() {
  const { isAdmin, user } = useAuth();
  const [settings, setSettings] = useState({
    brandName: '', tagline: '', gstin: '', upiId: '',
    phone: '', email: '', address: '', city: '', state: '', pincode: '',
    fameSubsidyDefault: 0, stateSubsidyDefault: 0,
    gstPercent: 5,
    customField1Label: '', customField2Label: '', customField3Label: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmSave, setConfirmSave] = useState(false);
  const [msg, setMsg] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const dbSettings = await api.get('/api/settings');
      // Merge with defaults from MD_CONFIG
      setSettings({
        brandName: dbSettings.brandName || MD_CONFIG.brandName,
        tagline: dbSettings.tagline || MD_CONFIG.tagline,
        gstin: dbSettings.gstin || MD_CONFIG.gstin,
        upiId: dbSettings.upiId || MD_CONFIG.upiId,
        phone: dbSettings.phone || MD_CONFIG.phone,
        email: dbSettings.email || MD_CONFIG.email,
        address: dbSettings.address || MD_CONFIG.address,
        city: dbSettings.city || MD_CONFIG.city,
        state: dbSettings.state || MD_CONFIG.state,
        pincode: dbSettings.pincode || MD_CONFIG.pincode,
        fameSubsidyDefault: dbSettings.fameSubsidyDefault || MD_CONFIG.fameSubsidyDefault,
        stateSubsidyDefault: dbSettings.stateSubsidyDefault || MD_CONFIG.stateSubsidyDefault,
        gstPercent: dbSettings.gstPercent || 5,
        customField1Label: dbSettings.customField1Label || '',
        customField2Label: dbSettings.customField2Label || '',
        customField3Label: dbSettings.customField3Label || ''
      });
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post('/api/settings/bulk', { settings, updatedBy: user?.name });
      setMsg('✅ Settings saved! Page reload करें असर देखने के लिए');
      setTimeout(() => setMsg(''), 5000);
    } catch (err) {
      setMsg('❌ ' + err.message);
    } finally {
      setSaving(false);
      setConfirmSave(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (!isAdmin()) return (
    <div className="p-8 text-center">
      <Shield size={48} className="mx-auto text-red-500 mb-3" />
      <h2 className="text-xl font-bold mb-2">Admin Only</h2>
      <p className="text-slate-400">यह page सिर्फ admin/owner के लिए है</p>
    </div>
  );

  return (
    <div className="p-4 max-w-3xl mx-auto fade-in">
      <h1 className="text-2xl font-bold text-green-400 mb-4 flex items-center gap-2"><Building /> App Settings</h1>

      {msg && <div className="card bg-blue-900/30 border-blue-700 mb-4">{msg}</div>}

      <div className="card mb-4">
        <h3 className="font-semibold mb-3 text-green-400">Branding</h3>
        <div className="grid md:grid-cols-2 gap-3">
          <Field label="Brand Name" value={settings.brandName} onChange={(v) => setSettings({ ...settings, brandName: v })} />
          <Field label="Tagline" value={settings.tagline} onChange={(v) => setSettings({ ...settings, tagline: v })} />
        </div>
      </div>

      <div className="card mb-4">
        <h3 className="font-semibold mb-3 text-green-400">Business Info</h3>
        <div className="grid md:grid-cols-2 gap-3">
          <Field label="GSTIN" value={settings.gstin} onChange={(v) => setSettings({ ...settings, gstin: v })} />
          <Field label="UPI ID" value={settings.upiId} onChange={(v) => setSettings({ ...settings, upiId: v })} />
          <Field label="Phone" value={settings.phone} onChange={(v) => setSettings({ ...settings, phone: v })} />
          <Field label="Email" value={settings.email} onChange={(v) => setSettings({ ...settings, email: v })} />
          <Field label="Address" value={settings.address} onChange={(v) => setSettings({ ...settings, address: v })} className="md:col-span-2" />
          <Field label="City" value={settings.city} onChange={(v) => setSettings({ ...settings, city: v })} />
          <Field label="State" value={settings.state} onChange={(v) => setSettings({ ...settings, state: v })} />
          <Field label="Pincode" value={settings.pincode} onChange={(v) => setSettings({ ...settings, pincode: v })} />
        </div>
      </div>

      <div className="card mb-4">
        <h3 className="font-semibold mb-3 text-green-400">Financial Defaults</h3>
        <div className="grid md:grid-cols-3 gap-3">
          <Field label="FAME-II Subsidy (₹)" type="number" value={settings.fameSubsidyDefault} onChange={(v) => setSettings({ ...settings, fameSubsidyDefault: v })} />
          <Field label="State Subsidy (₹)" type="number" value={settings.stateSubsidyDefault} onChange={(v) => setSettings({ ...settings, stateSubsidyDefault: v })} />
          <Field label="Default GST %" type="number" value={settings.gstPercent} onChange={(v) => setSettings({ ...settings, gstPercent: v })} />
        </div>
      </div>

      <div className="card mb-4">
        <h3 className="font-semibold mb-3 text-green-400">Custom Fields (future use)</h3>
        <p className="text-xs text-slate-400 mb-3">यहाँ extra fields के labels set करें — forms में आ जाएंगे</p>
        <div className="grid md:grid-cols-3 gap-3">
          <Field label="Custom Field 1 Label" value={settings.customField1Label} onChange={(v) => setSettings({ ...settings, customField1Label: v })} placeholder="जैसे: Referral Code" />
          <Field label="Custom Field 2 Label" value={settings.customField2Label} onChange={(v) => setSettings({ ...settings, customField2Label: v })} />
          <Field label="Custom Field 3 Label" value={settings.customField3Label} onChange={(v) => setSettings({ ...settings, customField3Label: v })} />
        </div>
      </div>

      <button onClick={() => setConfirmSave(true)} className="btn btn-primary w-full flex items-center justify-center gap-2 sticky bottom-4">
        <Save size={16} /> Save All Settings
      </button>

      {confirmSave && (
        <AdminPasswordModal
          action="Save app settings"
          itemName="System-wide configuration changes"
          onConfirm={handleSave}
          onCancel={() => setConfirmSave(false)}
        />
      )}
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', className = '', placeholder = '' }) {
  return (
    <div className={className}>
      <label className="text-xs text-slate-400 mb-1 block">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}
