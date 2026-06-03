import React, { useState, useEffect } from 'react';
import { Plus, Star, MessageCircle, TrendingUp } from 'lucide-react';
import { api } from '../utils/apiConfig';
import { formatDate, openWhatsApp } from '../utils/smartUtils';
import AdminPasswordModal from '../components/AdminPasswordModal';

export default function FeedbackPage() {
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState(null);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [dataRaw, statsData] = await Promise.all([
        api.get('/api/feedback'),
        api.get('/api/feedback/stats/summary').catch(() => null)
      ]);
      const data = Array.isArray(dataRaw) ? dataRaw : (dataRaw?.feedback || []);
      setItems(data);
      setStats(statsData);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = items.filter(f => {
    if (filter === 'all') return true;
    if (filter === 'new') return f.status === 'new';
    if (filter === 'low') return f.overallRating <= 2;
    if (filter === 'high') return f.overallRating >= 4;
    return f.feedbackType === filter;
  });

  const doDelete = async () => {
    await api.delete(`/api/feedback/${confirmDelete._id}`);
    setConfirmDelete(null);
    load();
  };

  return (
    <div className="p-4 max-w-7xl mx-auto fade-in" style={{ paddingBottom: 100 }}>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-green-400 flex items-center gap-2"><Star /> Customer Feedback ({items.length})</h1>
        <button onClick={() => setShowForm(true)} className="btn btn-primary flex items-center gap-1"><Plus size={16} /> Collect Feedback</button>
      </div>

      {/* Stats */}
      {stats && stats.total > 0 && (
        <div className="grid md:grid-cols-3 gap-3 mb-4">
          <div className="card text-center">
            <div className="text-xs text-slate-400">Average Rating</div>
            <div className="text-3xl font-bold text-yellow-400">⭐ {stats.average}</div>
            <div className="text-xs text-slate-500">{stats.total} responses</div>
          </div>
          <div className="card text-center">
            <div className="text-xs text-slate-400">NPS Score</div>
            <div className={`text-3xl font-bold ${stats.nps >= 50 ? 'text-green-400' : stats.nps >= 0 ? 'text-yellow-400' : 'text-red-400'}`}>
              {stats.nps}
            </div>
            <div className="text-xs text-slate-500">Net Promoter Score</div>
          </div>
          <div className="card">
            <div className="text-xs text-slate-400 mb-2">Distribution</div>
            {[5, 4, 3, 2, 1].map(r => (
              <div key={r} className="flex items-center gap-2 text-xs">
                <span className="w-8">{r}⭐</span>
                <div className="flex-1 bg-slate-800 rounded h-2 overflow-hidden">
                  <div className="bg-yellow-400 h-full" style={{ width: `${stats.total ? (stats.distribution[r] / stats.total * 100) : 0}%` }} />
                </div>
                <span className="text-slate-400 w-8 text-right">{stats.distribution[r] || 0}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-1 mb-4 overflow-x-auto">
        {[
          { val: 'all', label: 'All' },
          { val: 'new', label: 'New' },
          { val: 'low', label: '😟 Low (≤2)' },
          { val: 'high', label: '😊 High (≥4)' },
          { val: 'sale', label: 'Sale' },
          { val: 'service', label: 'Service' }
        ].map(f => (
          <button key={f.val} onClick={() => setFilter(f.val)} className={`text-sm px-3 py-1 rounded whitespace-nowrap ${filter === f.val ? 'bg-green-700' : 'bg-slate-800'}`}>{f.label}</button>
        ))}
      </div>

      {loading ? <div className="text-center py-8">Loading...</div> :
       filtered.length === 0 ? <div className="card text-center py-8 text-slate-500">No feedback</div> :
       <div className="space-y-2">
         {filtered.map(f => (
           <div key={f._id} className="card card-hover">
             <div className="flex items-start justify-between gap-2">
               <div className="flex-1">
                 <div className="flex items-center gap-2 mb-1">
                   <span className="font-semibold">{f.customerName}</span>
                   <span className="text-xs px-2 py-0.5 rounded bg-slate-800 capitalize">{f.feedbackType}</span>
                   <span className={`text-xs px-2 py-0.5 rounded ${f.status === 'new' ? 'bg-red-900 text-red-300' : 'bg-green-900 text-green-300'}`}>{f.status}</span>
                 </div>
                 <div className="text-2xl">{'⭐'.repeat(f.overallRating)}{'☆'.repeat(5 - f.overallRating)}</div>
                 {f.wouldRecommend !== undefined && <div className="text-xs text-slate-400">Recommend: {f.wouldRecommend}/10</div>}
                 {f.comment && <div className="text-sm mt-1">{f.comment}</div>}
                 {f.improvements && <div className="text-xs text-yellow-400 mt-1">Improve: {f.improvements}</div>}
                 <div className="text-xs text-slate-500 mt-1">📞 {f.mobileNo} • {formatDate(f.createdAt)}</div>
               </div>
               <div className="flex flex-col gap-1">
                 <button onClick={() => openWhatsApp(f.mobileNo, `Hi ${f.customerName}, आपके feedback के लिए धन्यवाद!`)} className="p-2 rounded bg-green-700"><MessageCircle size={12} /></button>
                 {f.status === 'new' && <button onClick={async () => { await api.put(`/api/feedback/${f._id}`, { status: 'acknowledged' }); load(); }} className="p-2 rounded bg-blue-700" title="Acknowledge">✓</button>}
                 <button onClick={() => setConfirmDelete(f)} className="p-2 rounded bg-red-700">×</button>
               </div>
             </div>
           </div>
         ))}
       </div>
      }

      {showForm && <FeedbackForm onClose={() => { setShowForm(false); load(); }} />}
      {confirmDelete && (
        <AdminPasswordModal
          action="Delete feedback"
          itemName={`${confirmDelete.customerName} — ${confirmDelete.overallRating}⭐`}
          onConfirm={doDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}

function FeedbackForm({ onClose }) {
  const [form, setForm] = useState({
    customerName: '', mobileNo: '', chassisNo: '',
    feedbackType: 'service',
    overallRating: 5, staffRating: 5, productRating: 5, serviceRating: 5,
    wouldRecommend: 10,
    comment: '', improvements: '',
    source: 'in-person'
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.customerName || !form.mobileNo) return alert('Customer name और mobile ज़रूरी है');
    setSaving(true);
    try { await api.post('/api/feedback', form); onClose(); }
    catch (err) { alert(err.message); }
    finally { setSaving(false); }
  };

  const RatingInput = ({ label, value, onChange }) => (
    <div>
      <label className="text-xs text-slate-400 mb-1 block">{label}</label>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(r => (
          <button key={r} onClick={() => onChange(r)} className="text-2xl">
            <span className={r <= value ? 'text-yellow-400' : 'text-slate-700'}>{r <= value ? '⭐' : '☆'}</span>
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/70 p-4 overflow-y-auto" onClick={onClose}>
      <div className="card max-w-md mx-auto my-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold mb-4 text-green-400">Collect Feedback</h2>
        <div className="space-y-3">
          <Field label="Customer Name *" value={form.customerName} onChange={(v) => setForm({ ...form, customerName: v })} />
          <Field label="Mobile *" value={form.mobileNo} onChange={(v) => setForm({ ...form, mobileNo: v })} />
          <Field label="Chassis No" value={form.chassisNo} onChange={(v) => setForm({ ...form, chassisNo: v })} />
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Feedback Type</label>
            <select value={form.feedbackType} onChange={(e) => setForm({ ...form, feedbackType: e.target.value })}>
              <option value="sale">Sale Experience</option>
              <option value="service">Service Experience</option>
              <option value="product">Product (Vehicle)</option>
              <option value="staff">Staff Behavior</option>
              <option value="general">General</option>
            </select>
          </div>

          <RatingInput label="Overall Rating *" value={form.overallRating} onChange={(v) => setForm({ ...form, overallRating: v })} />
          <RatingInput label="Staff Rating" value={form.staffRating} onChange={(v) => setForm({ ...form, staffRating: v })} />
          <RatingInput label="Product Rating" value={form.productRating} onChange={(v) => setForm({ ...form, productRating: v })} />
          <RatingInput label="Service Rating" value={form.serviceRating} onChange={(v) => setForm({ ...form, serviceRating: v })} />

          <div>
            <label className="text-xs text-slate-400 mb-1 block">क्या आप recommend करेंगे? (0-10)</label>
            <input type="range" min="0" max="10" value={form.wouldRecommend} onChange={(e) => setForm({ ...form, wouldRecommend: Number(e.target.value) })} className="w-full" />
            <div className="text-center text-xl font-bold text-yellow-400">{form.wouldRecommend}/10</div>
          </div>

          <div>
            <label className="text-xs text-slate-400 mb-1 block">Comments</label>
            <textarea value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} rows="3" />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Improvements (क्या बेहतर हो सकता है?)</label>
            <textarea value={form.improvements} onChange={(e) => setForm({ ...form, improvements: e.target.value })} rows="2" />
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="btn btn-ghost flex-1">Cancel</button>
          <button onClick={save} disabled={saving} className="btn btn-primary flex-1">{saving ? 'Saving...' : 'Submit'}</button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text' }) {
  return <div><label className="text-xs text-slate-400 mb-1 block">{label}</label><input type={type} value={value} onChange={(e) => onChange(e.target.value)} /></div>;
}
