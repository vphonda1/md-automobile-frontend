import React, { useState, useEffect } from 'react';
import { Settings, Database, Bell, Trash2, Download, RefreshCw } from 'lucide-react';
import { api, MD_CONFIG, ls } from '../utils/apiConfig';
import * as XLSX from 'xlsx';

export default function AdminPanel() {
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/api/customers').catch(() => []),
      api.get('/api/vehicles').catch(() => []),
      api.get('/api/invoices').catch(() => []),
      api.get('/api/jobcards').catch(() => []),
      api.get('/api/staff').catch(() => [])
    ]).then(([c, v, i, j, s]) => {
      setStats({ customers: c.length, vehicles: v.length, invoices: i.length, jobcards: j.length, staff: s.length });
      setLoading(false);
    });
  }, []);

  const exportFullBackup = async () => {
    const [customers, vehicles, invoices, jobcards, parts, staff, salary, reminders] = await Promise.all([
      api.get('/api/customers').catch(() => []),
      api.get('/api/vehicles').catch(() => []),
      api.get('/api/invoices').catch(() => []),
      api.get('/api/jobcards').catch(() => []),
      api.get('/api/parts').catch(() => []),
      api.get('/api/staff').catch(() => []),
      api.get('/api/salary').catch(() => []),
      api.get('/api/reminders').catch(() => [])
    ]);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(customers), 'Customers');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(vehicles), 'Vehicles');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(invoices), 'Invoices');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(jobcards), 'JobCards');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(parts), 'Parts');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(staff), 'Staff');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(salary), 'Salary');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(reminders), 'Reminders');
    XLSX.writeFile(wb, `mdautomobile-backup-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const clearLocalCache = () => {
    if (!confirm('Clear all local cache? You will need to login again.')) return;
    localStorage.clear();
    window.location.reload();
  };

  return (
    <div className="p-4 max-w-4xl mx-auto fade-in">
      <h1 className="text-2xl font-bold text-green-400 mb-4 flex items-center gap-2"><Settings /> Admin Panel</h1>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card">
          <h3 className="font-semibold mb-3 text-green-400 flex items-center gap-2"><Database size={16} /> Database Stats</h3>
          {loading ? <div className="text-slate-400">Loading...</div> :
            <div className="space-y-1 text-sm">
              <Row label="Customers" value={stats.customers} />
              <Row label="Vehicles" value={stats.vehicles} />
              <Row label="Invoices" value={stats.invoices} />
              <Row label="Job Cards" value={stats.jobcards} />
              <Row label="Staff" value={stats.staff} />
            </div>
          }
        </div>

        <div className="card">
          <h3 className="font-semibold mb-3 text-green-400">Business Settings</h3>
          <div className="space-y-1 text-sm">
            <Row label="Brand" value={MD_CONFIG.brandName} />
            <Row label="GSTIN" value={MD_CONFIG.gstin} />
            <Row label="UPI" value={MD_CONFIG.upiId} />
            <Row label="Phone" value={MD_CONFIG.phone} />
            <Row label="Email" value={MD_CONFIG.email} />
            <div className="text-xs text-yellow-400 mt-2">⚠️ Update in src/utils/apiConfig.js</div>
          </div>
        </div>

        <div className="card md:col-span-2">
          <h3 className="font-semibold mb-3 text-green-400">Quick Actions</h3>
          <div className="grid md:grid-cols-3 gap-2">
            <button onClick={exportFullBackup} className="btn btn-primary flex items-center justify-center gap-1">
              <Download size={14} /> Full Backup
            </button>
            <button onClick={() => window.location.reload()} className="btn btn-secondary flex items-center justify-center gap-1">
              <RefreshCw size={14} /> Reload App
            </button>
            <button onClick={clearLocalCache} className="btn btn-danger flex items-center justify-center gap-1">
              <Trash2 size={14} /> Clear Cache
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between py-1 border-b border-slate-800">
      <span className="text-slate-400">{label}</span>
      <span className="text-green-400 font-semibold">{value}</span>
    </div>
  );
}
