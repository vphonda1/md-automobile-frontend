import React, { useState, useEffect, useMemo } from 'react';
import { Search, Plus, X, IndianRupee, Trash2, CheckCircle2, Clock, AlertTriangle, Phone } from 'lucide-react';
import { api } from '../utils/apiConfig';
import { formatINR, formatDate, toISODate, sendWhatsApp } from '../utils/smartUtils';

export default function CustomerDuesPage() {
  const [dues, setDues] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all | pending | partial | paid
  const [showForm, setShowForm] = useState(false);
  const [payingDue, setPayingDue] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [d, c, v] = await Promise.all([
        api.get('/api/customer-dues').catch(() => []),
        api.get('/api/customers').catch(() => []),
        api.get('/api/vehicles').catch(() => [])
      ]);
      setDues(Array.isArray(d) ? d : (d?.dues || []));
      setCustomers(Array.isArray(c) ? c : (c?.customers || []));
      setVehicles(Array.isArray(v) ? v : (v?.vehicles || []));
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const filtered = dues.filter(d => {
    const matchSearch = !search || [d.customerName, d.mobileNo, d.description].some(f => String(f || '').toLowerCase().includes(search.toLowerCase()));
    const matchStatus = statusFilter === 'all' || d.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const summary = useMemo(() => {
    const totalOutstanding = dues.reduce((s, d) => s + (Number(d.balanceAmount) || 0), 0);
    const totalCollected = dues.reduce((s, d) => s + (Number(d.paidAmount) || 0), 0);
    const pendingCount = dues.filter(d => d.status !== 'paid').length;
    return { totalOutstanding, totalCollected, pendingCount };
  }, [dues]);

  const deleteDue = async (d) => {
    if (!confirm(`${d.customerName} की due entry delete करें?`)) return;
    await api.delete(`/api/customer-dues/${d._id}`);
    load();
  };

  const remind = (d) => {
    const phone = d.mobileNo;
    if (!phone) { alert('❌ Mobile number नहीं है'); return; }
    const msg = `नमस्ते ${d.customerName} जी 🙏\n\nआपकी ${d.description || 'बकाया राशि'} ₹${d.balanceAmount} अभी बाकी है।\n\nकृपया जल्द payment करें।\n\n- MD Automobile, Bhopal`;
    sendWhatsApp(phone, msg);
  };

  return (
    <div className="p-4 max-w-7xl mx-auto fade-in" style={{ paddingBottom: 100 }}>
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <h1 className="text-2xl font-bold text-green-400">📒 उधारी / Customer Dues</h1>
        <button onClick={() => setShowForm(true)} className="btn btn-primary flex items-center gap-1"><Plus size={16} /> नई Udhaari Entry</button>
      </div>

      {/* Summary */}
      <div className="grid md:grid-cols-3 gap-3 mb-4">
        <div className="card" style={{ borderLeft: '4px solid #dc2626' }}>
          <div className="text-xs text-slate-400">कुल बकाया (Outstanding)</div>
          <div className="text-xl font-bold text-red-400">{formatINR(summary.totalOutstanding)}</div>
        </div>
        <div className="card" style={{ borderLeft: '4px solid #16a34a' }}>
          <div className="text-xs text-slate-400">कुल वसूला (Collected)</div>
          <div className="text-xl font-bold text-green-400">{formatINR(summary.totalCollected)}</div>
        </div>
        <div className="card" style={{ borderLeft: '4px solid #f59e0b' }}>
          <div className="text-xs text-slate-400">Pending Entries</div>
          <div className="text-xl font-bold text-yellow-400">{summary.pendingCount}</div>
        </div>
      </div>

      {/* Search + Filter */}
      <div className="card mb-4">
        <div className="flex items-center gap-2 mb-2"><Search size={18} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Customer name या mobile से search..." /></div>
        <div className="flex gap-2">
          {['all', 'pending', 'partial', 'paid'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-1 rounded text-xs ${statusFilter === s ? 'bg-green-700' : 'bg-slate-800'}`}>
              {s === 'all' ? 'सभी' : s === 'pending' ? 'Pending' : s === 'partial' ? 'Partial' : 'Paid ✅'}
            </button>
          ))}
        </div>
      </div>

      {loading ? <div className="text-center py-8 text-slate-400">Loading...</div> :
       filtered.length === 0 ? (
         <div className="card text-center py-8 text-slate-500">
           <IndianRupee size={48} className="mx-auto mb-3 opacity-50" />
           <p>कोई udhaari entry नहीं मिली</p>
         </div>
       ) :
       <div className="space-y-2">
         {filtered.map(d => {
           const pct = d.totalAmount > 0 ? Math.round((d.paidAmount / d.totalAmount) * 100) : 0;
           return (
             <div key={d._id} className="card">
               <div className="flex items-start justify-between gap-2">
                 <div className="flex-1">
                   <div className="flex items-center gap-2 mb-1">
                     <span className="font-semibold">{d.customerName}</span>
                     <span className={`text-xs px-2 py-0.5 rounded ${d.status === 'paid' ? 'bg-green-800' : d.status === 'partial' ? 'bg-yellow-800' : 'bg-red-900'}`}>
                       {d.status === 'paid' ? '✅ Paid' : d.status === 'partial' ? '🟡 Partial' : '🔴 Pending'}
                     </span>
                     <span className="text-xs px-2 py-0.5 rounded bg-slate-700">
                       {d.dueType === 'downpayment' ? '💵 Down Payment' : d.dueType === 'credit' ? '📒 Credit/Udhaari' : '💰 Other'}
                     </span>
                   </div>
                   <div className="text-xs text-slate-400">📞 {d.mobileNo} {d.vehicleModel && `• 🛵 ${d.vehicleModel}`}</div>
                   {d.description && <div className="text-xs text-slate-500">📝 {d.description}</div>}
                   <div className="text-xs text-slate-500 mt-1">📆 {formatDate(d.createdAt)}</div>

                   <div className="mt-2 flex items-center gap-3 text-sm">
                     <span>कुल: <b>{formatINR(d.totalAmount)}</b></span>
                     <span className="text-green-400">Paid: <b>{formatINR(d.paidAmount)}</b></span>
                     <span className="text-red-400">Balance: <b>{formatINR(d.balanceAmount)}</b></span>
                   </div>
                   <div className="bg-slate-800 rounded h-2 mt-1 overflow-hidden">
                     <div className="bg-green-600 h-full" style={{ width: `${pct}%` }} />
                   </div>
                 </div>
                 <div className="flex flex-col gap-1">
                   {d.status !== 'paid' && (
                     <button onClick={() => setPayingDue(d)} className="p-2 rounded bg-green-700" title="Record Payment"><CheckCircle2 size={14} /></button>
                   )}
                   <button onClick={() => remind(d)} className="p-2 rounded bg-green-800" title="WhatsApp Remind"><Phone size={12} /></button>
                   <button onClick={() => deleteDue(d)} className="p-2 rounded bg-red-700"><Trash2 size={12} /></button>
                 </div>
               </div>

               {/* Payment history */}
               {d.paymentHistory && d.paymentHistory.length > 0 && (
                 <div className="mt-2 pt-2 border-t border-slate-700">
                   <div className="text-xs text-slate-400 mb-1">Payment History:</div>
                   {d.paymentHistory.map((p, i) => (
                     <div key={i} className="text-xs text-slate-500 flex justify-between">
                       <span>{formatDate(p.date)} ({p.method})</span>
                       <span className="text-green-400">{formatINR(p.amount)}</span>
                     </div>
                   ))}
                 </div>
               )}
             </div>
           );
         })}
       </div>
      }

      {showForm && <AddDueForm customers={customers} vehicles={vehicles} onClose={() => { setShowForm(false); load(); }} />}
      {payingDue && <PayDueModal due={payingDue} onClose={() => { setPayingDue(null); load(); }} />}
    </div>
  );
}

// ═══ Add New Due Form ═══
function AddDueForm({ customers, vehicles, onClose }) {
  const [custSearch, setCustSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [form, setForm] = useState({
    dueType: 'downpayment', description: '', totalAmount: '', paidAmount: '0', vehicleModel: '', notes: ''
  });
  const [saving, setSaving] = useState(false);

  const [matchedVehicle, setMatchedVehicle] = useState(null);

  const custResults = useMemo(() => {
    const q = custSearch.toLowerCase().trim();
    if (!q || selectedCustomer) return [];
    return customers.filter(c => (c.customerName || c.name || '').toLowerCase().includes(q) || (c.mobile || c.mobileNo || '').includes(q)).slice(0, 8);
  }, [custSearch, customers, selectedCustomer]);

  const pickCustomer = (c) => {
    setSelectedCustomer(c);
    setCustSearch(c.customerName || c.name || '');

    // 🆕 Find this customer's vehicle (for model + price auto-fill)
    const mobile = c.mobile || c.mobileNo;
    const veh = vehicles.find(v =>
      (v.customerId && (v.customerId === c._id || String(v.customerId) === String(c._id))) ||
      (mobile && (v.customerMobile === mobile || v.mobile === mobile || v.mobileNo === mobile)) ||
      (c.customerName && v.customerName === c.customerName)
    );
    setMatchedVehicle(veh || null);

    const vehiclePrice = veh ? Number(veh.onRoadPrice || veh.salePrice || veh.exShowroomPrice || veh.price || 0) : 0;
    setForm(f => ({
      ...f,
      vehicleModel: veh ? `${veh.model || veh.vehicleModel || ''} ${veh.variant || ''} ${veh.color || ''}`.trim() : (c.vehicleModel || f.vehicleModel),
      // Auto-fill Total Amount with vehicle price if user hasn't entered anything yet
      totalAmount: f.totalAmount || (vehiclePrice > 0 ? String(vehiclePrice) : f.totalAmount)
    }));
  };

  const save = async () => {
    if (!selectedCustomer) { alert('Customer select करें'); return; }
    if (!form.totalAmount || Number(form.totalAmount) <= 0) { alert('Total Amount ज़रूरी है'); return; }
    setSaving(true);
    try {
      await api.post('/api/customer-dues', {
        customerId: selectedCustomer._id,
        customerName: selectedCustomer.customerName || selectedCustomer.name,
        mobileNo: selectedCustomer.mobile || selectedCustomer.mobileNo,
        vehicleModel: form.vehicleModel,
        dueType: form.dueType,
        description: form.description,
        totalAmount: Number(form.totalAmount),
        paidAmount: Number(form.paidAmount) || 0,
        notes: form.notes
      });
      onClose();
    } catch (err) {
      alert('❌ Save failed: ' + err.message);
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 p-4 overflow-y-auto" onClick={onClose}>
      <div className="card max-w-lg mx-auto my-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-green-400">📒 नई Udhaari / Due Entry</h2>
          <button onClick={onClose}><X size={20} /></button>
        </div>

        <label className="text-xs text-slate-400 mb-1 block">👤 Customer Search *</label>
        <input value={custSearch} onChange={(e) => { setCustSearch(e.target.value); setSelectedCustomer(null); }} placeholder="नाम या मोबाइल टाइप करें..." className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white mb-1" />
        {custResults.length > 0 && (
          <div className="bg-slate-800 rounded mb-2 max-h-40 overflow-y-auto">
            {custResults.map(c => (
              <div key={c._id} onClick={() => pickCustomer(c)} className="p-2 border-b border-slate-700 cursor-pointer hover:bg-slate-700">
                <div className="text-sm font-bold">{c.customerName || c.name}</div>
                <div className="text-xs text-slate-400">📞 {c.mobile || c.mobileNo}</div>
              </div>
            ))}
          </div>
        )}

        {selectedCustomer && (
          <>
            <div className="bg-green-900/20 border border-green-700 rounded p-2 mb-3 text-sm">
              ✅ {selectedCustomer.customerName || selectedCustomer.name} — 📞 {selectedCustomer.mobile || selectedCustomer.mobileNo}
            </div>

            <label className="text-xs text-slate-400 mb-1 block">💳 Due Type</label>
            <div className="flex gap-2 mb-3">
              <button onClick={() => setForm({...form, dueType: 'downpayment'})} className={`flex-1 py-2 rounded text-sm ${form.dueType === 'downpayment' ? 'bg-blue-700' : 'bg-slate-800'}`}>💵 Down Payment</button>
              <button onClick={() => setForm({...form, dueType: 'credit'})} className={`flex-1 py-2 rounded text-sm ${form.dueType === 'credit' ? 'bg-yellow-700' : 'bg-slate-800'}`}>📒 Udhaari</button>
              <button onClick={() => setForm({...form, dueType: 'other'})} className={`flex-1 py-2 rounded text-sm ${form.dueType === 'other' ? 'bg-slate-600' : 'bg-slate-800'}`}>💰 Other</button>
            </div>

            <label className="text-xs text-slate-400 mb-1 block">📝 Description (क्यों बाकी है)</label>
            <input value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} placeholder="जैसे: Down payment शॉर्टफॉल" className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white mb-3" />

            <label className="text-xs text-slate-400 mb-1 block">🛵 Vehicle Model {matchedVehicle && '(auto-filled)'}</label>
            <input value={form.vehicleModel} onChange={(e) => setForm({...form, vehicleModel: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white mb-1" />

            {/* 🆕 Vehicle price info — "इस vehicle की price X है" */}
            {matchedVehicle && (() => {
              const vehiclePrice = Number(matchedVehicle.onRoadPrice || matchedVehicle.salePrice || matchedVehicle.exShowroomPrice || matchedVehicle.price || 0);
              const balance = Math.max(0, Number(form.totalAmount || 0) - Number(form.paidAmount || 0));
              return vehiclePrice > 0 ? (
                <div className="bg-blue-900/20 border border-blue-700 rounded p-2 mb-3 text-xs">
                  🛵 इस vehicle की price <b className="text-blue-300">{formatINR(vehiclePrice)}</b> है — जिसमें से बकाया{' '}
                  <b className="text-red-400">{formatINR(balance)}</b> है
                </div>
              ) : null;
            })()}
            {!matchedVehicle && <div className="mb-3" />}

            <div className="grid grid-cols-2 gap-2 mb-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">कुल राशि (₹) *</label>
                <input type="number" value={form.totalAmount} onChange={(e) => setForm({...form, totalAmount: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white" />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">पहले से Paid (₹)</label>
                <input type="number" value={form.paidAmount} onChange={(e) => setForm({...form, paidAmount: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white" />
              </div>
            </div>

            {form.totalAmount > 0 && (
              <div className="bg-slate-800 rounded p-2 mb-3 text-sm">
                Balance रहेगा: <b className="text-red-400">{formatINR(Number(form.totalAmount) - Number(form.paidAmount || 0))}</b>
              </div>
            )}

            <label className="text-xs text-slate-400 mb-1 block">Notes</label>
            <input value={form.notes} onChange={(e) => setForm({...form, notes: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white mb-3" />
          </>
        )}

        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="btn btn-ghost flex-1">Cancel</button>
          <button onClick={save} disabled={saving || !selectedCustomer} className="btn btn-primary flex-1">{saving ? '⏳ Saving...' : '💾 Save Entry'}</button>
        </div>
      </div>
    </div>
  );
}

// ═══ Record Payment against a Due ═══
function PayDueModal({ due, onClose }) {
  const [amount, setAmount] = useState(due.balanceAmount || '');
  const [method, setMethod] = useState('cash');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!amount || Number(amount) <= 0) { alert('Amount ज़रूरी है'); return; }
    if (Number(amount) > due.balanceAmount) { if (!confirm('Amount balance से ज़्यादा है — फिर भी save करें?')) return; }
    setSaving(true);
    try {
      await api.post(`/api/customer-dues/${due._id}/pay`, { amount: Number(amount), method, notes });
      onClose();
    } catch (err) {
      alert('❌ Failed: ' + err.message);
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div className="card max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-green-400 font-bold">💰 Payment Record करें</h3>
          <button onClick={onClose}><X size={20} /></button>
        </div>
        <div className="text-sm mb-3">
          <div>{due.customerName}</div>
          <div className="text-red-400">Balance: {formatINR(due.balanceAmount)}</div>
        </div>
        <label className="text-xs text-slate-400 mb-1 block">Amount (₹) *</label>
        <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white mb-3" />
        <label className="text-xs text-slate-400 mb-1 block">Method</label>
        <select value={method} onChange={(e) => setMethod(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white mb-3">
          <option value="cash">Cash</option>
          <option value="upi">UPI</option>
          <option value="bank-transfer">Bank Transfer</option>
          <option value="cheque">Cheque</option>
        </select>
        <label className="text-xs text-slate-400 mb-1 block">Notes</label>
        <input value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white mb-3" />
        <div className="flex gap-2">
          <button onClick={onClose} className="btn btn-ghost flex-1">Cancel</button>
          <button onClick={save} disabled={saving} className="btn btn-primary flex-1">{saving ? '⏳...' : '💾 Save'}</button>
        </div>
      </div>
    </div>
  );
}
