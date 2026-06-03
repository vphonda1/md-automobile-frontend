import React, { useState, useEffect } from 'react';
import { Plus, MessageCircle, Phone, Check } from 'lucide-react';
import AdminPasswordModal from '../components/AdminPasswordModal';
import { api } from '../utils/apiConfig';
import { formatDate, openWhatsApp } from '../utils/smartUtils';

export default function FollowupsPage() {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('open');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const load = async () => {
    setLoading(true);
    try { const d = await api.get('/api/followups', filter !== 'all' ? { status: filter } : {}); setItems(Array.isArray(d) ? d : (d?.followups || [])); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [filter]);

  return (
    <div className="p-4 max-w-7xl mx-auto fade-in" style={{ paddingBottom: 100 }}>
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <h1 className="text-2xl font-bold text-green-400">Follow-ups ({items.length})</h1>
        <button onClick={() => setShowForm(true)} className="btn btn-primary flex items-center gap-1"><Plus size={16} /> New</button>
      </div>

      <div className="flex gap-1 mb-4 overflow-x-auto">
        {['all', 'open', 'in-progress', 'converted', 'closed'].map(s => (
          <button key={s} onClick={() => setFilter(s)} className={`text-sm px-3 py-1 rounded capitalize ${filter === s ? 'bg-green-700' : 'bg-slate-800'}`}>{s}</button>
        ))}
      </div>

      {loading ? <div className="text-center py-8">Loading...</div> :
       items.length === 0 ? <div className="card text-center py-8 text-slate-500">No follow-ups</div> :
       <div className="space-y-2">
         {items.map(f => (
           <div key={f._id} className="card card-hover">
             <div className="flex items-start justify-between gap-2">
               <div className="flex-1">
                 <div className="flex items-center gap-2">
                   <span className="font-semibold">{f.customerName}</span>
                   <span className="text-xs px-2 py-0.5 rounded bg-blue-900 capitalize">{f.followupType}</span>
                 </div>
                 <div className="text-xs text-slate-400">📞 {f.mobileNo} • {f.source}</div>
                 {f.interestedModel && <div className="text-sm text-green-400">Interested: {f.interestedModel}</div>}
                 <div className="text-xs text-yellow-400">📅 {formatDate(f.followupDate)}</div>
                 {f.notes && <div className="text-xs text-slate-300 mt-1">{f.notes}</div>}
               </div>
               <div className="flex flex-col gap-1">
                 <button onClick={() => openWhatsApp(f.mobileNo, `Hi ${f.customerName}`)} className="p-2 rounded bg-green-700"><MessageCircle size={12} /></button>
                 <a href={`tel:${f.mobileNo}`} className="p-2 rounded bg-blue-700"><Phone size={12} /></a>
                 <button onClick={async () => { await api.put(`/api/followups/${f._id}`, { status: 'converted' }); load(); }} className="p-2 rounded bg-green-800"><Check size={12} /></button>
               </div>
             </div>
           </div>
         ))}
       </div>
      }

      {showForm && <FollowupForm onClose={() => { setShowForm(false); load(); }} />}
    </div>
  );
}

function FollowupForm({ onClose }) {
  const [form, setForm] = useState({
    customerName: '', mobileNo: '', followupType: 'lead', source: 'walk-in',
    interestedModel: '', followupDate: new Date().toISOString().split('T')[0],
    contactMode: 'call', notes: '', priority: 'normal'
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.customerName || !form.mobileNo) { alert('Required fields'); return; }
    setSaving(true);
    try { await api.post('/api/followups', form); onClose(); }
    catch (err) { alert(err.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 p-4 overflow-y-auto" onClick={onClose}>
      <div className="card max-w-md mx-auto my-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold mb-4 text-green-400">New Follow-up</h2>
        <div className="space-y-3">
          <Field label="Customer Name *" value={form.customerName} onChange={(v) => setForm({ ...form, customerName: v })} />
          <Field label="Mobile *" value={form.mobileNo} onChange={(v) => setForm({ ...form, mobileNo: v })} />
          <Field label="Interested Model" value={form.interestedModel} onChange={(v) => setForm({ ...form, interestedModel: v })} />
          <Field label="Follow-up Date *" type="date" value={form.followupDate} onChange={(v) => setForm({ ...form, followupDate: v })} />
          <div>
            <label className="text-xs text-slate-400">Type</label>
            <select value={form.followupType} onChange={(e) => setForm({ ...form, followupType: e.target.value })}>
              <option value="lead">Lead</option><option value="post-sale">Post-sale</option><option value="service">Service</option><option value="complaint">Complaint</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-400">Source</label>
            <select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}>
              <option value="walk-in">Walk-in</option><option value="online">Online</option><option value="referral">Referral</option><option value="call">Call</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-400">Notes</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows="2" />
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
