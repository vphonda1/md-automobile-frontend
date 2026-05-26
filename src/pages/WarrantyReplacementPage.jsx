import React, { useState, useEffect } from 'react';
import { Plus, Search, Battery, Zap, Cpu, ChevronRight, Trash2, Edit2 } from 'lucide-react';
import { api } from '../utils/apiConfig';
import { formatDate, formatINR, addYears } from '../utils/smartUtils';
import AdminPasswordModal from '../components/AdminPasswordModal';
import AutoComplete from '../components/AutoComplete';

const COMPONENTS = [
  { value: 'battery', label: '🔋 Battery', icon: Battery, color: 'yellow' },
  { value: 'motor', label: '⚡ Motor', icon: Zap, color: 'blue' },
  { value: 'controller', label: '🎛️ Controller', icon: Cpu, color: 'purple' },
  { value: 'charger', label: '🔌 Charger', icon: Zap, color: 'green' },
  { value: 'other', label: '⚙️ Other', icon: Edit2, color: 'slate' }
];

const REASONS = [
  { value: 'warranty-claim', label: 'Warranty Claim' },
  { value: 'damage', label: 'Damage' },
  { value: 'upgrade', label: 'Upgrade' },
  { value: 'recall', label: 'Recall' },
  { value: 'wear-out', label: 'Wear & Tear' },
  { value: 'other', label: 'Other' }
];

export default function WarrantyReplacementPage() {
  const [items, setItems] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [componentFilter, setComponentFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [w, c] = await Promise.all([
        api.get('/api/warranty'),
        api.get('/api/customers')
      ]);
      setItems(w);
      setCustomers(c);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = items.filter(w => {
    if (componentFilter !== 'all' && w.component !== componentFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return [w.customerName, w.mobileNo, w.chassisNo, w.oldSerialNumber, w.newSerialNumber]
      .some(f => String(f || '').toLowerCase().includes(q));
  });

  const doDelete = async () => {
    await api.delete(`/api/warranty/${confirmDelete._id}`);
    setConfirmDelete(null);
    load();
  };

  return (
    <div className="p-4 max-w-7xl mx-auto fade-in">
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-green-400">Warranty Replacements ({filtered.length})</h1>
          <p className="text-xs text-slate-400">Battery, Motor, Controller — सबकी replacement history track करें</p>
        </div>
        <button onClick={() => { setEditing(null); setShowForm(true); }} className="btn btn-primary flex items-center gap-1">
          <Plus size={16} /> New Replacement
        </button>
      </div>

      {/* Component filter */}
      <div className="grid grid-cols-5 gap-2 mb-4">
        <button onClick={() => setComponentFilter('all')} className={`card text-center py-2 ${componentFilter === 'all' ? 'border-green-500' : ''}`}>
          <div className="text-sm">All</div>
          <div className="text-xs text-slate-400">{items.length}</div>
        </button>
        {COMPONENTS.map(c => {
          const count = items.filter(i => i.component === c.value).length;
          return (
            <button key={c.value} onClick={() => setComponentFilter(c.value)} className={`card text-center py-2 ${componentFilter === c.value ? 'border-green-500' : ''}`}>
              <div className="text-sm">{c.label}</div>
              <div className="text-xs text-slate-400">{count}</div>
            </button>
          );
        })}
      </div>

      <div className="card mb-4">
        <div className="flex items-center gap-2">
          <Search size={18} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Customer, chassis, serial number..." />
        </div>
      </div>

      {loading ? <div className="text-center py-8">Loading...</div> :
       filtered.length === 0 ? <div className="card text-center py-8 text-slate-500">कोई replacement records नहीं</div> :
       <div className="space-y-2">
         {filtered.map(w => {
           const comp = COMPONENTS.find(c => c.value === w.component);
           return (
             <div key={w._id} className="card card-hover">
               <div className="flex items-start justify-between gap-2">
                 <div className="flex-1">
                   <div className="flex items-center gap-2 mb-1">
                     <span className="font-bold text-green-400">{comp?.label || w.component}</span>
                     {w.underWarranty && <span className="text-xs px-2 py-0.5 rounded bg-green-900 text-green-300">Under Warranty</span>}
                     {!w.underWarranty && <span className="text-xs px-2 py-0.5 rounded bg-red-900 text-red-300">Out of Warranty</span>}
                   </div>
                   <div className="text-sm">{w.customerName} • {w.chassisNo}</div>
                   <div className="text-xs text-slate-400">📞 {w.mobileNo} • {w.vehicleModel}</div>
                   
                   <div className="grid md:grid-cols-2 gap-2 mt-2 text-xs">
                     <div className="bg-red-900/20 p-2 rounded">
                       <div className="text-slate-400">पुराना (Replaced)</div>
                       <div className="font-mono">{w.oldSerialNumber || 'N/A'}</div>
                       {w.oldInstallDate && <div className="text-slate-500">Given: {formatDate(w.oldInstallDate)}</div>}
                       {w.oldAgeInDays > 0 && <div className="text-yellow-400">Age: {Math.round(w.oldAgeInDays / 30)} months</div>}
                     </div>
                     <div className="bg-green-900/20 p-2 rounded">
                       <div className="text-slate-400">नया (New)</div>
                       <div className="font-mono">{w.newSerialNumber}</div>
                       <div className="text-slate-500">Replaced: {formatDate(w.replacementDate)}</div>
                       <div className="text-green-400">Warranty till: {formatDate(w.newWarrantyTill)}</div>
                     </div>
                   </div>

                   <div className="text-xs mt-1">
                     Reason: <span className="capitalize">{w.reason?.replace('-', ' ')}</span>
                     {w.cost > 0 && <span className="ml-2 text-yellow-400">Cost: {formatINR(w.cost)}</span>}
                   </div>
                   {w.reasonDetails && <div className="text-xs text-slate-300 mt-1">{w.reasonDetails}</div>}
                 </div>

                 <div className="flex flex-col gap-1">
                   <button onClick={() => { setEditing(w); setShowForm(true); }} className="p-2 rounded bg-slate-800"><Edit2 size={12} /></button>
                   <button onClick={() => setConfirmDelete(w)} className="p-2 rounded bg-red-900"><Trash2 size={12} /></button>
                 </div>
               </div>
             </div>
           );
         })}
       </div>
      }

      {showForm && <ReplacementForm record={editing} customers={customers} onClose={() => { setShowForm(false); load(); }} />}
      {confirmDelete && (
        <AdminPasswordModal
          action="Delete warranty replacement record"
          itemName={`${confirmDelete.component} replacement for ${confirmDelete.customerName}`}
          onConfirm={doDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}

function ReplacementForm({ record, customers, onClose }) {
  const [form, setForm] = useState(record || {
    customerName: '', mobileNo: '', chassisNo: '', vehicleModel: '',
    component: 'battery', componentName: '',
    oldSerialNumber: '', oldInstallDate: '',
    newSerialNumber: '', replacementDate: new Date().toISOString().split('T')[0],
    newWarrantyTill: addYears(new Date(), 1),
    reason: 'warranty-claim', reasonDetails: '',
    underWarranty: true, cost: 0,
    technician: '', notes: ''
  });
  const [saving, setSaving] = useState(false);

  const fillFromCustomer = (mobile) => {
    const c = customers.find(x => x.mobileNo === mobile);
    if (c) {
      setForm({
        ...form,
        customerName: c.customerName, mobileNo: c.mobileNo,
        chassisNo: c.chassisNo || form.chassisNo,
        vehicleModel: c.vehicleModel || form.vehicleModel,
        oldSerialNumber: form.component === 'battery' ? c.batteryNumber : form.component === 'motor' ? c.motorNumber : form.oldSerialNumber,
        oldInstallDate: c.invoiceDate || form.oldInstallDate
      });
    }
  };

  const update = (key, value) => {
    const u = { ...form, [key]: value };
    if (key === 'replacementDate' && value) u.newWarrantyTill = addYears(value, 1);
    setForm(u);
  };

  const save = async () => {
    if (!form.customerName || !form.newSerialNumber) return alert('Customer और new serial number ज़रूरी है');
    setSaving(true);
    try {
      if (record?._id) await api.put(`/api/warranty/${record._id}`, form);
      else await api.post('/api/warranty', form);
      onClose();
    } catch (err) { alert(err.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 p-4 overflow-y-auto" onClick={onClose}>
      <div className="card max-w-2xl mx-auto my-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold mb-4 text-green-400">{record ? 'Edit Replacement' : 'New Warranty Replacement'}</h2>

        <div className="card bg-blue-900/20 mb-3">
          <label className="text-xs text-slate-400 block mb-1">Customer Mobile (auto-fill)</label>
          <AutoComplete
            value={form.mobileNo}
            onChange={(v) => update('mobileNo', v)}
            onSelect={(opt) => fillFromCustomer(opt.value)}
            options={customers.map(c => ({ value: c.mobileNo, label: `${c.customerName} (${c.mobileNo})`, meta: `${c.vehicleModel} • ${c.chassisNo}` }))}
            placeholder="Mobile number..."
          />
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          <Field label="Customer Name *" value={form.customerName} onChange={(v) => update('customerName', v)} />
          <Field label="Vehicle Model" value={form.vehicleModel} onChange={(v) => update('vehicleModel', v)} />
          <Field label="Chassis No" value={form.chassisNo} onChange={(v) => update('chassisNo', v)} />

          <div>
            <label className="text-xs text-slate-400 mb-1 block">Component *</label>
            <select value={form.component} onChange={(e) => update('component', e.target.value)}>
              {COMPONENTS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>

          <Field label={`पुराना ${form.component} Serial Number`} value={form.oldSerialNumber} onChange={(v) => update('oldSerialNumber', v)} />
          <Field label="पुराना Install Date" type="date" value={form.oldInstallDate} onChange={(v) => update('oldInstallDate', v)} />

          <Field label={`नया ${form.component} Serial Number *`} value={form.newSerialNumber} onChange={(v) => update('newSerialNumber', v)} />
          <Field label="Replacement Date *" type="date" value={form.replacementDate} onChange={(v) => update('replacementDate', v)} />

          <Field label="नया Warranty Till" type="date" value={form.newWarrantyTill} onChange={(v) => update('newWarrantyTill', v)} />

          <div>
            <label className="text-xs text-slate-400 mb-1 block">Reason</label>
            <select value={form.reason} onChange={(e) => update('reason', e.target.value)}>
              {REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>

          <Field label="Cost (0 if warranty)" type="number" value={form.cost} onChange={(v) => update('cost', v)} />
          <Field label="Technician" value={form.technician} onChange={(v) => update('technician', v)} />
        </div>

        <div className="mt-3">
          <label className="text-xs text-slate-400 mb-1 block">Reason Details / Notes</label>
          <textarea value={form.reasonDetails} onChange={(e) => update('reasonDetails', e.target.value)} rows="2" />
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
