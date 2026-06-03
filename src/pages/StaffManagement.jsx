import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Phone, MessageCircle } from 'lucide-react';
import AdminPasswordModal from '../components/AdminPasswordModal';
import { api } from '../utils/apiConfig';
import { openWhatsApp, formatINR } from '../utils/smartUtils';

export default function StaffManagement() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const doDelete = async () => {
    await api.delete(`/api/staff/${confirmDelete._id}`);
    setConfirmDelete(null);
    load();
  };

  const load = async () => {
    setLoading(true);
    try { const d = await api.get('/api/staff'); setItems(Array.isArray(d) ? d : (d?.staff || [])); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="p-4 max-w-7xl mx-auto fade-in" style={{ paddingBottom: 100 }}>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-green-400">Staff ({items.length})</h1>
        <button onClick={() => { setEditing(null); setShowForm(true); }} className="btn btn-primary flex items-center gap-1"><Plus size={16} /> Add Staff</button>
      </div>

      {loading ? <div className="text-center py-8">Loading...</div> :
       items.length === 0 ? <div className="card text-center py-8 text-slate-500">No staff yet</div> :
       <div className="grid md:grid-cols-2 gap-3">
         {items.map(s => (
           <div key={s._id} className="card card-hover">
             <div className="flex items-start justify-between gap-2">
               <div className="flex-1">
                 <div className="font-semibold text-green-400">{s.name}</div>
                 <div className="text-sm">{s.designation || s.role}</div>
                 <div className="text-xs text-slate-400">📞 {s.mobileNo} {s.email && `• ${s.email}`}</div>
                 <div className="text-xs">Salary: {formatINR(s.baseSalary)} {s.isActive ? <span className="text-green-400">• Active</span> : <span className="text-red-400">• Inactive</span>}</div>
               </div>
               <div className="flex flex-col gap-1">
                 <button onClick={() => openWhatsApp(s.mobileNo)} className="p-2 rounded bg-green-700"><MessageCircle size={12} /></button>
                 <a href={`tel:${s.mobileNo}`} className="p-2 rounded bg-blue-700"><Phone size={12} /></a>
                 <button onClick={() => { setEditing(s); setShowForm(true); }} className="p-2 rounded bg-slate-700"><Edit2 size={12} /></button>
                 <button onClick={() => setConfirmDelete(s)} className="p-2 rounded bg-red-700"><Trash2 size={12} /></button>
               </div>
             </div>
           </div>
         ))}
       </div>
      }

      {showForm && <StaffForm staff={editing} onClose={() => { setShowForm(false); load(); }} />}
      {confirmDelete && (
        <AdminPasswordModal
          action="Delete staff member"
          itemName={`${confirmDelete.name} (${confirmDelete.mobileNo})`}
          onConfirm={doDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}

function StaffForm({ staff, onClose }) {
  const [form, setForm] = useState(staff || {
    staffId: 'MD' + String(Date.now()).slice(-4),
    name: '', mobileNo: '', email: '', role: 'sales', designation: '',
    baseSalary: 0, commissionPercent: 0,
    loginEmail: '', loginPassword: '', isActive: true,
    joiningDate: new Date().toISOString().split('T')[0]
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.name || !form.mobileNo) { alert('Name और mobile आवश्यक है'); return; }
    setSaving(true);
    try {
      if (staff?._id) await api.put(`/api/staff/${staff._id}`, form);
      else await api.post('/api/staff', form);
      onClose();
    } catch (err) { alert(err.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 p-4 overflow-y-auto" onClick={onClose}>
      <div className="card max-w-2xl mx-auto my-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold mb-4 text-green-400">{staff ? 'Edit Staff' : 'Add Staff'}</h2>
        <div className="grid md:grid-cols-2 gap-3">
          <Field label="Staff ID" value={form.staffId} onChange={(v) => setForm({ ...form, staffId: v })} />
          <Field label="Name *" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
          <Field label="Mobile *" value={form.mobileNo} onChange={(v) => setForm({ ...form, mobileNo: v })} />
          <Field label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
          <div>
            <label className="text-xs text-slate-400">Role</label>
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              {['owner', 'manager', 'sales', 'service', 'accounts', 'technician'].map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <Field label="Designation" value={form.designation} onChange={(v) => setForm({ ...form, designation: v })} />
          <Field label="Joining Date" type="date" value={form.joiningDate} onChange={(v) => setForm({ ...form, joiningDate: v })} />
          <Field label="Base Salary" type="number" value={form.baseSalary} onChange={(v) => setForm({ ...form, baseSalary: v })} />
          <Field label="Login Email" value={form.loginEmail} onChange={(v) => setForm({ ...form, loginEmail: v })} />
          <Field label="Login Password" type="password" value={form.loginPassword} onChange={(v) => setForm({ ...form, loginPassword: v })} />
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
