import React, { useState, useEffect } from 'react';
import { Plus, Bell, Check, X, MessageCircle, Trash2 } from 'lucide-react';
import AdminPasswordModal from '../components/AdminPasswordModal';
import { api } from '../utils/apiConfig';
import { formatDate, openWhatsApp } from '../utils/smartUtils';

const TYPES = ['service', 'battery-check', 'payment', 'emi', 'followup', 'general'];

export default function RemindersPage() {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const doDelete = async () => {
    await api.delete(`/api/reminders/${confirmDelete._id}`);
    setConfirmDelete(null);
    load();
  };

  const load = async () => {
    setLoading(true);
    try { const d = await api.get('/api/reminders', filter !== 'all' ? { status: filter } : {}); setItems(Array.isArray(d) ? d : (d?.reminders || [])); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [filter]);

  return (
    <div className="p-4 max-w-7xl mx-auto fade-in" style={{ paddingBottom: 100 }}>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-green-400 flex items-center gap-2"><Bell /> Reminders ({items.length})</h1>
        <button onClick={() => setShowForm(true)} className="btn btn-primary flex items-center gap-1"><Plus size={16} /> New</button>
      </div>

      <div className="flex gap-1 mb-4 overflow-x-auto">
        {['all', 'pending', 'completed', 'dismissed'].map(s => (
          <button key={s} onClick={() => setFilter(s)} className={`text-sm px-3 py-1 rounded capitalize ${filter === s ? 'bg-green-700' : 'bg-slate-800'}`}>{s}</button>
        ))}
      </div>

      {loading ? <div className="text-center py-8">Loading...</div> :
       items.length === 0 ? <div className="card text-center py-8 text-slate-500">No reminders</div> :
       <div className="space-y-2">
         {items.map(r => (
           <div key={r._id} className="card card-hover">
             <div className="flex items-start justify-between gap-2">
               <div className="flex-1">
                 <div className="flex items-center gap-2 mb-1">
                   <span className="text-xs px-2 py-0.5 rounded bg-green-900 text-green-300 capitalize">{r.type}</span>
                   <span className={`text-xs px-2 py-0.5 rounded capitalize ${r.priority === 'urgent' ? 'bg-red-900' : 'bg-slate-800'}`}>{r.priority || 'normal'}</span>
                 </div>
                 <div className="font-semibold">{r.title}</div>
                 {r.customerName && <div className="text-xs text-slate-400">{r.customerName} • {r.mobileNo}</div>}
                 <div className="text-xs text-yellow-400 mt-1">📅 Due: {formatDate(r.dueDate)} {r.dueTime}</div>
                 {r.description && <div className="text-xs text-slate-300 mt-1">{r.description}</div>}
               </div>
               <div className="flex flex-col gap-1">
                 {r.mobileNo && <button onClick={() => openWhatsApp(r.mobileNo, r.title)} className="p-2 rounded bg-green-700"><MessageCircle size={12} /></button>}
                 <button onClick={async () => { await api.put(`/api/reminders/${r._id}`, { status: 'completed' }); load(); }} className="p-2 rounded bg-blue-700"><Check size={12} /></button>
                 <button onClick={async () => { await api.post(`/api/reminders/${r._id}/dismiss`); load(); }} className="p-2 rounded bg-slate-700"><X size={12} /></button>
                 <button onClick={() => setConfirmDelete(r)} className="p-2 rounded bg-red-700"><Trash2 size={12} /></button>
               </div>
             </div>
           </div>
         ))}
       </div>
      }

      {showForm && <ReminderForm onClose={() => { setShowForm(false); load(); }} />}
      {confirmDelete && (
        <AdminPasswordModal
          action="Delete reminder"
          itemName={confirmDelete.title}
          onConfirm={doDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}

function ReminderForm({ onClose }) {
  const [form, setForm] = useState({
    title: '', description: '', type: 'service',
    customerName: '', mobileNo: '', vehicleModel: '',
    dueDate: new Date().toISOString().split('T')[0], dueTime: '10:00',
    priority: 'normal'
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.title) { alert('Title required'); return; }
    setSaving(true);
    try { await api.post('/api/reminders', form); onClose(); }
    catch (err) { alert(err.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 p-4 overflow-y-auto" onClick={onClose}>
      <div className="card max-w-md mx-auto my-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold mb-4 text-green-400">New Reminder</h2>
        <div className="space-y-3">
          <Field label="Title *" value={form.title} onChange={(v) => setForm({ ...form, title: v })} />
          <div>
            <label className="text-xs text-slate-400">Type</label>
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <Field label="Customer Name" value={form.customerName} onChange={(v) => setForm({ ...form, customerName: v })} />
          <Field label="Mobile" value={form.mobileNo} onChange={(v) => setForm({ ...form, mobileNo: v })} />
          <Field label="Due Date *" type="date" value={form.dueDate} onChange={(v) => setForm({ ...form, dueDate: v })} />
          <Field label="Due Time" type="time" value={form.dueTime} onChange={(v) => setForm({ ...form, dueTime: v })} />
          <div>
            <label className="text-xs text-slate-400">Priority</label>
            <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
              <option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-400">Description</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows="2" />
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="btn btn-ghost flex-1">Cancel</button>
          <button onClick={save} disabled={saving} className="btn btn-primary flex-1">{saving ? 'Saving...' : 'Save'}</button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text' }) {
  return <div><label className="text-xs text-slate-400 mb-1 block">{label}</label><input type={type} value={value} onChange={(e) => onChange(e.target.value)} /></div>;
}
