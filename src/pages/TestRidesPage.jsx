import React, { useState, useEffect } from 'react';
import { Plus, Calendar, MessageCircle, Phone, Check, X, Star } from 'lucide-react';
import { api } from '../utils/apiConfig';
import { formatDate, openWhatsApp } from '../utils/smartUtils';
import AdminPasswordModal from '../components/AdminPasswordModal';

export default function TestRidesPage() {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('scheduled');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const load = async () => {
    setLoading(true);
    try { setItems(await api.get('/api/testrides', filter !== 'all' ? { status: filter } : {})); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [filter]);

  const doDelete = async () => {
    await api.delete(`/api/testrides/${confirmDelete._id}`);
    setConfirmDelete(null);
    load();
  };

  const updateStatus = async (id, status) => {
    await api.put(`/api/testrides/${id}`, { status });
    load();
  };

  return (
    <div className="p-4 max-w-7xl mx-auto fade-in">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-green-400 flex items-center gap-2"><Calendar /> Test Rides ({items.length})</h1>
          <p className="text-xs text-slate-400">Pre-purchase test ride bookings</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn btn-primary flex items-center gap-1"><Plus size={16} /> Book Test Ride</button>
      </div>

      <div className="flex gap-1 mb-4 overflow-x-auto">
        {['all', 'scheduled', 'completed', 'converted', 'cancelled', 'no-show'].map(s => (
          <button key={s} onClick={() => setFilter(s)} className={`text-sm px-3 py-1 rounded capitalize ${filter === s ? 'bg-green-700' : 'bg-slate-800'}`}>{s.replace('-', ' ')}</button>
        ))}
      </div>

      {loading ? <div className="text-center py-8">Loading...</div> :
       items.length === 0 ? <div className="card text-center py-8 text-slate-500">No test rides</div> :
       <div className="space-y-2">
         {items.map(t => (
           <div key={t._id} className="card card-hover">
             <div className="flex items-start justify-between gap-2">
               <div className="flex-1">
                 <div className="flex items-center gap-2 mb-1">
                   <span className="font-semibold">{t.customerName}</span>
                   <span className="text-xs px-2 py-0.5 rounded bg-slate-800 capitalize">{t.status}</span>
                 </div>
                 <div className="text-sm text-green-400">{t.vehicleModel} {t.preferredVariant && `(${t.preferredVariant})`} {t.preferredColor && `• ${t.preferredColor}`}</div>
                 <div className="text-xs text-slate-400">📞 {t.mobileNo} • {t.email}</div>
                 <div className="text-xs text-yellow-400">📅 {formatDate(t.scheduledDate)} at {t.scheduledTime} ({t.duration} min)</div>
                 {t.rating && <div className="text-xs">⭐ {t.rating}/5 {t.rideFeedback}</div>}
                 {t.notes && <div className="text-xs text-slate-300 mt-1">{t.notes}</div>}
               </div>
               <div className="flex flex-col gap-1">
                 <button onClick={() => openWhatsApp(t.mobileNo, `Hi ${t.customerName}, MD Automobile test ride reminder: ${t.vehicleModel} on ${formatDate(t.scheduledDate)} at ${t.scheduledTime}`)} className="p-2 rounded bg-green-700"><MessageCircle size={12} /></button>
                 <a href={`tel:${t.mobileNo}`} className="p-2 rounded bg-blue-700"><Phone size={12} /></a>
                 {t.status === 'scheduled' && (
                   <button onClick={() => updateStatus(t._id, 'completed')} className="p-2 rounded bg-purple-700" title="Complete"><Check size={12} /></button>
                 )}
                 {t.status === 'completed' && (
                   <button onClick={() => updateStatus(t._id, 'converted')} className="p-2 rounded bg-yellow-700" title="Mark Converted">💰</button>
                 )}
                 <button onClick={() => setConfirmDelete(t)} className="p-2 rounded bg-red-700"><X size={12} /></button>
               </div>
             </div>
           </div>
         ))}
       </div>
      }

      {showForm && <TestRideForm onClose={() => { setShowForm(false); load(); }} />}
      {confirmDelete && (
        <AdminPasswordModal
          action="Delete test ride"
          itemName={`${confirmDelete.customerName} — ${confirmDelete.vehicleModel}`}
          onConfirm={doDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}

function TestRideForm({ onClose }) {
  const [form, setForm] = useState({
    customerName: '', mobileNo: '', email: '', drivingLicense: '',
    vehicleModel: '', preferredVariant: '', preferredColor: '',
    scheduledDate: new Date().toISOString().split('T')[0],
    scheduledTime: '11:00', duration: 30,
    source: 'walk-in', notes: ''
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.customerName || !form.mobileNo || !form.vehicleModel) return alert('Required fields missing');
    setSaving(true);
    try { await api.post('/api/testrides', form); onClose(); }
    catch (err) { alert(err.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 p-4 overflow-y-auto" onClick={onClose}>
      <div className="card max-w-md mx-auto my-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold mb-4 text-green-400">Book Test Ride</h2>
        <div className="space-y-3">
          <Field label="Customer Name *" value={form.customerName} onChange={(v) => setForm({ ...form, customerName: v })} />
          <Field label="Mobile *" value={form.mobileNo} onChange={(v) => setForm({ ...form, mobileNo: v })} />
          <Field label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
          <Field label="Driving License" value={form.drivingLicense} onChange={(v) => setForm({ ...form, drivingLicense: v })} />
          <Field label="Vehicle Model *" value={form.vehicleModel} onChange={(v) => setForm({ ...form, vehicleModel: v })} />
          <Field label="Variant" value={form.preferredVariant} onChange={(v) => setForm({ ...form, preferredVariant: v })} />
          <Field label="Preferred Color" value={form.preferredColor} onChange={(v) => setForm({ ...form, preferredColor: v })} />
          <div className="grid grid-cols-2 gap-2">
            <Field label="Date *" type="date" value={form.scheduledDate} onChange={(v) => setForm({ ...form, scheduledDate: v })} />
            <Field label="Time *" type="time" value={form.scheduledTime} onChange={(v) => setForm({ ...form, scheduledTime: v })} />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Source</label>
            <select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}>
              <option value="walk-in">Walk-in</option><option value="online">Online</option><option value="referral">Referral</option><option value="call">Call</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Notes</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows="2" />
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="btn btn-ghost flex-1">Cancel</button>
          <button onClick={save} disabled={saving} className="btn btn-primary flex-1">{saving ? 'Booking...' : 'Book'}</button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text' }) {
  return <div><label className="text-xs text-slate-400 mb-1 block">{label}</label><input type={type} value={value} onChange={(e) => onChange(e.target.value)} /></div>;
}
