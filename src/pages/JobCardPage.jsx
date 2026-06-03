import React, { useState, useEffect } from 'react';
import { Plus, Search, Wrench, Battery, MessageCircle, Phone } from 'lucide-react';
import { api } from '../utils/apiConfig';
import { formatDate, formatINR, openWhatsApp } from '../utils/smartUtils';

export default function JobCardPage() {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const raw = await api.get('/api/jobcards');
      setItems(Array.isArray(raw) ? raw : (raw?.jobcards || []));
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = items.filter(jc => {
    if (statusFilter !== 'all' && jc.status !== statusFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return [jc.jobCardNumber, jc.customerName, jc.mobileNo, jc.chassisNo]
      .some(f => String(f || '').toLowerCase().includes(q));
  });

  return (
    <div className="p-4 max-w-7xl mx-auto fade-in" style={{ paddingBottom: 100 }}>
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <h1 className="text-2xl font-bold text-green-400">Job Cards ({filtered.length})</h1>
        <button onClick={() => setShowForm(true)} className="btn btn-primary flex items-center gap-1">
          <Plus size={16} /> New Job Card
        </button>
      </div>

      <div className="grid grid-cols-4 gap-2 mb-4">
        {['all', 'open', 'in-progress', 'completed'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)} className={`card text-center py-2 ${statusFilter === s ? 'border-green-500' : ''}`}>
            <div className="text-xs capitalize">{s}</div>
          </button>
        ))}
      </div>

      <div className="card mb-4">
        <div className="flex items-center gap-2">
          <Search size={18} className="text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search job cards..." />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 text-slate-400">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-8 text-slate-500">No job cards</div>
      ) : (
        <div className="space-y-2">
          {filtered.map(jc => (
            <div key={jc._id} className="card card-hover">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Wrench size={14} className="text-green-400" />
                    <span className="font-semibold">{jc.jobCardNumber}</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-800">{jc.status}</span>
                  </div>
                  <div className="text-sm">{jc.customerName} • {jc.vehicleModel}</div>
                  <div className="text-xs text-slate-400">📅 {formatDate(jc.jobCardDate)} • 📞 {jc.mobileNo}</div>
                  {jc.batteryHealthBefore > 0 && (
                    <div className="text-xs text-yellow-400 mt-1">
                      🔋 Battery health: {jc.batteryHealthBefore}% → {jc.batteryHealthAfter || jc.batteryHealthBefore}%
                    </div>
                  )}
                  {jc.workDone && <div className="text-xs text-slate-300 mt-1 line-clamp-2">📝 {jc.workDone}</div>}
                  <div className="text-sm font-bold text-green-400 mt-1">{formatINR(jc.finalAmount || jc.totalAmount)}</div>
                </div>
                <div className="flex flex-col gap-1">
                  <button onClick={() => openWhatsApp(jc.mobileNo, `Hi ${jc.customerName}, Job card ${jc.jobCardNumber}`)} className="p-2 rounded bg-green-700"><MessageCircle size={12} /></button>
                  <a href={`tel:${jc.mobileNo}`} className="p-2 rounded bg-blue-700"><Phone size={12} /></a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && <JobCardForm onClose={() => { setShowForm(false); load(); }} />}
    </div>
  );
}

function JobCardForm({ onClose }) {
  const [form, setForm] = useState({
    jobCardNumber: '',
    jobCardDate: new Date().toISOString().split('T')[0],
    customerName: '', mobileNo: '', vehicleModel: '', chassisNo: '',
    batteryNumber: '', motorNumber: '',
    currentKm: 0, serviceType: 'paid', serviceNumber: 1,
    customerComplaint: '', workDone: '',
    batteryHealthBefore: 100, batteryHealthAfter: 100, chargeCycles: 0,
    labourCharges: 0, partsTotal: 0, totalAmount: 0,
    status: 'open'
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/api/jobcards/util/next-number').then(r => setForm(f => ({ ...f, jobCardNumber: r.jobCardNumber }))).catch(() => {});
  }, []);

  const save = async () => {
    if (!form.customerName || !form.mobileNo) {
      alert('Customer name and mobile required');
      return;
    }
    setSaving(true);
    try {
      form.totalAmount = Number(form.labourCharges) + Number(form.partsTotal);
      form.finalAmount = form.totalAmount;
      await api.post('/api/jobcards', form);
      onClose();
    } catch (err) {
      alert('Failed: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 p-4 overflow-y-auto" onClick={onClose}>
      <div className="card max-w-2xl mx-auto my-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold mb-4 text-green-400">New Job Card</h2>
        <div className="grid md:grid-cols-2 gap-3">
          <div><label className="text-xs text-slate-400">Job Card No</label><input value={form.jobCardNumber} onChange={(e) => setForm({ ...form, jobCardNumber: e.target.value })} /></div>
          <div><label className="text-xs text-slate-400">Date</label><input type="date" value={form.jobCardDate} onChange={(e) => setForm({ ...form, jobCardDate: e.target.value })} /></div>
          <div><label className="text-xs text-slate-400">Customer Name *</label><input value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} /></div>
          <div><label className="text-xs text-slate-400">Mobile *</label><input value={form.mobileNo} onChange={(e) => setForm({ ...form, mobileNo: e.target.value })} /></div>
          <div><label className="text-xs text-slate-400">Vehicle</label><input value={form.vehicleModel} onChange={(e) => setForm({ ...form, vehicleModel: e.target.value })} /></div>
          <div><label className="text-xs text-slate-400">Chassis</label><input value={form.chassisNo} onChange={(e) => setForm({ ...form, chassisNo: e.target.value })} /></div>
          <div><label className="text-xs text-slate-400">🔋 Battery Health Before (%)</label><input type="number" value={form.batteryHealthBefore} onChange={(e) => setForm({ ...form, batteryHealthBefore: e.target.value })} /></div>
          <div><label className="text-xs text-slate-400">🔋 Battery Health After (%)</label><input type="number" value={form.batteryHealthAfter} onChange={(e) => setForm({ ...form, batteryHealthAfter: e.target.value })} /></div>
          <div><label className="text-xs text-slate-400">⚡ Charge Cycles</label><input type="number" value={form.chargeCycles} onChange={(e) => setForm({ ...form, chargeCycles: e.target.value })} /></div>
          <div><label className="text-xs text-slate-400">Current KM</label><input type="number" value={form.currentKm} onChange={(e) => setForm({ ...form, currentKm: e.target.value })} /></div>
          <div className="md:col-span-2"><label className="text-xs text-slate-400">Customer Complaint</label><textarea value={form.customerComplaint} onChange={(e) => setForm({ ...form, customerComplaint: e.target.value })} rows="2" /></div>
          <div className="md:col-span-2"><label className="text-xs text-slate-400">Work Done</label><textarea value={form.workDone} onChange={(e) => setForm({ ...form, workDone: e.target.value })} rows="2" /></div>
          <div><label className="text-xs text-slate-400">Labour Charges</label><input type="number" value={form.labourCharges} onChange={(e) => setForm({ ...form, labourCharges: e.target.value })} /></div>
          <div><label className="text-xs text-slate-400">Parts Total</label><input type="number" value={form.partsTotal} onChange={(e) => setForm({ ...form, partsTotal: e.target.value })} /></div>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="btn btn-ghost flex-1">Cancel</button>
          <button onClick={save} disabled={saving} className="btn btn-primary flex-1">{saving ? 'Saving...' : 'Save'}</button>
        </div>
      </div>
    </div>
  );
}
