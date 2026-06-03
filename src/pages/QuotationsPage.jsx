import React, { useState, useEffect } from 'react';
import { Plus, Search, Receipt, MessageCircle, Trash2 } from 'lucide-react';
import AdminPasswordModal from '../components/AdminPasswordModal';
import { api, MD_CONFIG } from '../utils/apiConfig';
import { formatDate, formatINR, openWhatsApp } from '../utils/smartUtils';

export default function QuotationsPage() {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const doDelete = async () => {
    await api.delete(`/api/quotations/${confirmDelete._id}`);
    setConfirmDelete(null);
    load();
  };

  const load = async () => {
    setLoading(true);
    try {
      const raw = await api.get('/api/quotations');
      setItems(Array.isArray(raw) ? raw : (raw?.quotations || []));
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = items.filter(q =>
    !search || [q.quotationNumber, q.customerName, q.mobileNo, q.vehicleModel]
      .some(f => String(f || '').toLowerCase().includes(search.toLowerCase()))
  );

  const shareQuote = (q) => {
    const msg = `🏪 *${MD_CONFIG.brandName}*\n\nQuotation: *${q.quotationNumber}*\nVehicle: ${q.vehicleModel}\nOn-Road: ${formatINR(q.onRoadPrice)}\nSubsidy: ${formatINR(q.totalSubsidy)}\n*Final Price: ${formatINR(q.finalPrice)}*\n\nEMI from ${formatINR(q.emiAmount)}/month`;
    openWhatsApp(q.mobileNo, msg);
  };

  return (
    <div className="p-4 max-w-7xl mx-auto fade-in" style={{ paddingBottom: 100 }}>
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <h1 className="text-2xl font-bold text-green-400">Quotations ({filtered.length})</h1>
        <button onClick={() => setShowForm(true)} className="btn btn-primary flex items-center gap-1"><Plus size={16} /> New</button>
      </div>

      <div className="card mb-4">
        <div className="flex items-center gap-2"><Search size={18} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search quotations..." /></div>
      </div>

      {loading ? <div className="text-center py-8 text-slate-400">Loading...</div> :
       filtered.length === 0 ? <div className="card text-center py-8 text-slate-500">No quotations</div> :
       <div className="space-y-2">
         {filtered.map(q => (
           <div key={q._id} className="card card-hover">
             <div className="flex items-start justify-between gap-2">
               <div className="flex-1">
                 <div className="flex items-center gap-2 mb-1">
                   <Receipt size={14} className="text-green-400" />
                   <span className="font-semibold">{q.quotationNumber}</span>
                   <span className="text-xs px-2 py-0.5 rounded bg-slate-800">{q.status}</span>
                 </div>
                 <div className="text-sm">{q.customerName} • {q.vehicleModel}</div>
                 <div className="text-xs text-slate-400">📅 {formatDate(q.quotationDate)} • 📞 {q.mobileNo}</div>
                 <div className="text-sm text-green-400 mt-1">{formatINR(q.finalPrice)} (saved {formatINR(q.totalSubsidy)})</div>
               </div>
               <div className="flex flex-col gap-1">
                 <button onClick={() => shareQuote(q)} className="p-2 rounded bg-green-700"><MessageCircle size={12} /></button>
                 <button onClick={() => setConfirmDelete(q)} className="p-2 rounded bg-red-700"><Trash2 size={12} /></button>
               </div>
             </div>
           </div>
         ))}
       </div>
      }

      {showForm && <QuotationForm onClose={() => { setShowForm(false); load(); }} />}
      {confirmDelete && (
        <AdminPasswordModal
          action="Delete quotation"
          itemName={`${confirmDelete.quotationNumber} — ${confirmDelete.customerName}`}
          onConfirm={doDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}

function QuotationForm({ onClose }) {
  const [form, setForm] = useState({
    quotationNumber: '',
    quotationDate: new Date().toISOString().split('T')[0],
    customerName: '', mobileNo: '', email: '',
    vehicleModel: '', variant: '', color: '',
    exShowroomPrice: 0, accessories: 0,
    fameSubsidy: 0, stateSubsidy: 0, totalSubsidy: 0,
    onRoadPrice: 0, finalPrice: 0,
    downPayment: 0, loanAmount: 0, tenureMonths: 36, interestRate: 9, emiAmount: 0
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/api/quotations/util/next-number').then(r => setForm(f => ({ ...f, quotationNumber: r.quotationNumber }))).catch(() => {});
  }, []);

  const update = (key, value) => {
    const u = { ...form, [key]: value };
    u.totalSubsidy = (Number(u.fameSubsidy) || 0) + (Number(u.stateSubsidy) || 0);
    u.finalPrice = (Number(u.onRoadPrice) || 0) - u.totalSubsidy;
    // EMI calc: P * r * (1+r)^n / ((1+r)^n - 1)
    const P = Number(u.loanAmount) || 0;
    const r = (Number(u.interestRate) || 0) / 1200;
    const n = Number(u.tenureMonths) || 0;
    u.emiAmount = (P > 0 && r > 0 && n > 0) ? Math.round(P * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1)) : 0;
    setForm(u);
  };

  const save = async () => {
    setSaving(true);
    try { await api.post('/api/quotations', form); onClose(); }
    catch (err) { alert('Failed: ' + err.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 p-4 overflow-y-auto" onClick={onClose}>
      <div className="card max-w-2xl mx-auto my-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold mb-4 text-green-400">New Quotation</h2>
        <div className="grid md:grid-cols-2 gap-3">
          <Field label="Quote No" value={form.quotationNumber} onChange={(v) => update('quotationNumber', v)} />
          <Field label="Date" type="date" value={form.quotationDate} onChange={(v) => update('quotationDate', v)} />
          <Field label="Customer *" value={form.customerName} onChange={(v) => update('customerName', v)} />
          <Field label="Mobile *" value={form.mobileNo} onChange={(v) => update('mobileNo', v)} />
          <Field label="Vehicle Model" value={form.vehicleModel} onChange={(v) => update('vehicleModel', v)} />
          <Field label="Color" value={form.color} onChange={(v) => update('color', v)} />
          <Field label="Ex-Showroom (₹)" type="number" value={form.exShowroomPrice} onChange={(v) => update('exShowroomPrice', v)} />
          <Field label="On-Road (₹)" type="number" value={form.onRoadPrice} onChange={(v) => update('onRoadPrice', v)} />
          <Field label="FAME-II Subsidy" type="number" value={form.fameSubsidy} onChange={(v) => update('fameSubsidy', v)} />
          <Field label="State Subsidy" type="number" value={form.stateSubsidy} onChange={(v) => update('stateSubsidy', v)} />
          <Field label="Down Payment" type="number" value={form.downPayment} onChange={(v) => update('downPayment', v)} />
          <Field label="Loan Amount" type="number" value={form.loanAmount} onChange={(v) => update('loanAmount', v)} />
          <Field label="Tenure (months)" type="number" value={form.tenureMonths} onChange={(v) => update('tenureMonths', v)} />
          <Field label="Interest Rate %" type="number" value={form.interestRate} onChange={(v) => update('interestRate', v)} />
        </div>
        <div className="card mt-4 bg-green-900/20">
          <div className="text-sm">Total Subsidy: <span className="font-bold text-green-400">{formatINR(form.totalSubsidy)}</span></div>
          <div className="text-sm">Final Price: <span className="font-bold text-green-400">{formatINR(form.finalPrice)}</span></div>
          <div className="text-sm">EMI: <span className="font-bold text-green-400">{formatINR(form.emiAmount)}/month</span></div>
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
