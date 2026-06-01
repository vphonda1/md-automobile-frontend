import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Database, Users, Car, FileText, Wrench, Edit, ChevronRight, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api, MD_CONFIG } from '../utils/apiConfig';

export default function AdminPanel() {
  const [stats, setStats] = useState({ customers: 0, vehicles: 0, invoices: 0, jobcards: 0, staff: 0 });
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [c, v, i, j, s, st] = await Promise.all([
        api.get('/api/customers').catch(() => []),
        api.get('/api/vehicles').catch(() => []),
        api.get('/api/invoices').catch(() => []),
        api.get('/api/jobcards').catch(() => []),
        api.get('/api/staff').catch(() => []),
        api.get('/api/settings').catch(() => null)
      ]);
      setStats({
        customers: c.length || 0,
        vehicles: v.length || 0,
        invoices: i.length || 0,
        jobcards: j.length || 0,
        staff: s.length || 0
      });

      // Settings could come as array of {key,value} OR plain object — handle both
      let flat = {};
      if (Array.isArray(st)) {
        st.forEach(item => { flat[item.key] = item.value; });
      } else if (st && typeof st === 'object') {
        flat = st;
      }
      setSettings(flat);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  // Get value: DB first, then MD_CONFIG fallback
  const get = (key, fallbackKey) => {
    return settings[key] || (fallbackKey ? MD_CONFIG[fallbackKey] : '—') || '—';
  };

  const businessRows = [
    { label: 'Brand Name',  value: get('brandName', 'brandName') },
    { label: 'Tagline',     value: get('tagline', 'tagline') },
    { label: 'GSTIN',       value: get('gstin', 'gstin') },
    { label: 'UPI ID',      value: get('upi', 'upi') },
    { label: 'Phone',       value: get('phone', 'phone') },
    { label: 'Email',       value: get('email', 'email') },
    { label: 'Address',     value: get('address', 'address') },
    { label: 'City',        value: get('city', 'city') },
    { label: 'State',       value: get('state', 'state') },
    { label: 'Pincode',     value: get('pincode', 'pincode') }
  ];

  const isLive = settings.brandName || settings.gstin || settings.phone;

  return (
    <div className="p-4 max-w-7xl mx-auto fade-in">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-green-400 flex items-center gap-2">
          <SettingsIcon /> Admin Panel
        </h1>
        <button onClick={load} disabled={loading} className="btn btn-ghost p-2" title="Refresh">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Database stats */}
      <div className="card mb-4">
        <h2 className="text-lg font-semibold text-green-400 mb-2 flex items-center gap-2">
          <Database size={20} /> Database Stats
        </h2>
        {[
          { label: 'Customers', value: stats.customers, icon: Users },
          { label: 'Vehicles', value: stats.vehicles, icon: Car },
          { label: 'Invoices', value: stats.invoices, icon: FileText },
          { label: 'Job Cards', value: stats.jobcards, icon: Wrench },
          { label: 'Staff', value: stats.staff, icon: Users }
        ].map(row => (
          <div key={row.label} className="flex items-center justify-between py-2 border-b border-slate-800 last:border-0">
            <span className="flex items-center gap-2"><row.icon size={14} className="text-slate-500" />{row.label}</span>
            <span className="font-bold text-green-400 text-lg">{row.value}</span>
          </div>
        ))}
      </div>

      {/* Business settings — LIVE FROM DATABASE */}
      <div className="card mb-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-semibold text-green-400">Business Settings</h2>
            <p className="text-xs text-slate-400">
              {isLive ? '✅ Live data from database' : '⚠️ Using placeholder values — Settings page से fill करें'}
            </p>
          </div>
          <Link to="/settings" className="btn btn-primary text-xs flex items-center gap-1">
            <Edit size={12} /> Edit Settings
          </Link>
        </div>

        {businessRows.map(row => (
          <div key={row.label} className="flex justify-between gap-2 py-2 border-b border-slate-800 last:border-0">
            <span className="text-slate-400">{row.label}</span>
            <span className="font-semibold text-green-400 text-right break-all max-w-[60%]">{row.value}</span>
          </div>
        ))}

        <div className="text-xs text-slate-500 mt-3 italic flex items-center gap-1">
          💡 इन values को change करने के लिए <Link to="/settings" className="text-green-400 underline">Settings page</Link> में जाएं — apiConfig.js touch करने की ज़रूरत नहीं
        </div>
      </div>

      {/* Quick links to new features */}
      <div className="card">
        <h2 className="text-lg font-semibold text-green-400 mb-2">Quick Access — New Features</h2>
        {[
          { to: '/pricelist', label: '💰 Price List (Yakuza 26 models)', desc: 'Editable price table' },
          { to: '/tax-invoice', label: '🧾 Tax Invoice (auto-fill)', desc: 'VP Honda style PDF' },
          { to: '/warranty', label: '🔋 Warranty Replacements', desc: 'Battery/Motor/Controller history' },
          { to: '/test-rides', label: '🛵 Test Rides', desc: 'Pre-purchase bookings' },
          { to: '/feedback', label: '⭐ Customer Feedback', desc: 'Ratings & NPS' },
          { to: '/appointments', label: '📅 Service Appointments', desc: 'Live workflow tracking' },
          { to: '/staff', label: '👥 Manage Staff', desc: 'Users & roles' },
          { to: '/settings', label: '⚙️ App Settings', desc: 'Business info & branding' }
        ].map(link => (
          <Link key={link.to} to={link.to} className="flex items-center gap-2 py-2 px-2 hover:bg-slate-800 rounded">
            <div className="flex-1">
              <div className="text-sm">{link.label}</div>
              <div className="text-xs text-slate-500">{link.desc}</div>
            </div>
            <ChevronRight size={14} className="text-slate-500" />
          </Link>
        ))}
      </div>
    </div>
  );
}
