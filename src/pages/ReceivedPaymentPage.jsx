import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Search, Plus, X, Receipt, Download, Share2, CheckCircle2, Clock, IndianRupee, Trash2, Eye } from 'lucide-react';
import { api, MD_CONFIG } from '../utils/apiConfig';
import { formatINR, formatDate, toISODate, addMonths, numberToWords, openWhatsApp } from '../utils/smartUtils';

// ─── Brand ───────────────────────────────────────────────────────────
const BRAND = {
  name: 'MD AUTOMOBILES',
  address: 'नरसिंहगढ रोड, (वी.पी.होण्डा) शोरूम के पास परवलिया सडक भोपाल',
  phones: '8103476883, 8962620890, 8817166596',
};

// ─── PDF libs (same CDN pattern as QuotationsPage) ───────────────────
const loadScript = (src) => new Promise((resolve, reject) => {
  if (document.querySelector(`script[src="${src}"]`)) return resolve();
  const s = document.createElement('script');
  s.src = src;
  s.onload = resolve;
  s.onerror = () => reject(new Error('Failed to load ' + src));
  document.head.appendChild(s);
});
const ensurePdfLibs = async () => {
  if (!window.html2canvas) await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
  if (!window.jspdf) await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
};

// ─── Build the exact EMI schedule (same logic as CalendarView) ──────
function addMonthsSafe(dateInput, months) {
  const d = new Date(dateInput);
  const day = d.getDate();
  const anchor = new Date(d.getFullYear(), d.getMonth(), 1);
  anchor.setMonth(anchor.getMonth() + months);
  const daysInTarget = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0).getDate();
  anchor.setDate(Math.min(day, daysInTarget));
  return anchor;
}
function computeSchedule(emi) {
  const tenure = Number(emi.totalEmis || emi.tenure || 12);
  const paidCount = Number(emi.paidEmis || 0);
  const start = emi.startDate ? new Date(emi.startDate) : new Date();
  const schedule = [];
  for (let i = 0; i < tenure; i++) {
    const dueDate = addMonthsSafe(start, i);
    schedule.push({
      index: i,
      monthLabel: `${i + 1}/${tenure} — ${dueDate.toLocaleString('en-IN', { month: 'long', year: 'numeric' })}`,
      date: dueDate,
      amount: Number(emi.emiAmount) || 0,
      paid: i < paidCount
    });
  }
  return schedule;
}

export default function ReceivedPaymentPage() {
  const [receipts, setReceipts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [emis, setEmis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [previewReceipt, setPreviewReceipt] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [r, c, e] = await Promise.all([
        api.get('/api/payment-receipts').catch(() => []),
        api.get('/api/customers').catch(() => []),
        api.get('/api/emis').catch(() => [])
      ]);
      setReceipts(Array.isArray(r) ? r : (r?.receipts || []));
      setCustomers(Array.isArray(c) ? c : (c?.customers || []));
      setEmis(Array.isArray(e) ? e : (e?.emis || []));
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const filtered = receipts.filter(r =>
    !search || [r.receiptNumber, r.customerName, r.mobileNo, r.installmentLabel]
      .some(f => String(f || '').toLowerCase().includes(search.toLowerCase()))
  );

  const deleteReceipt = async (r) => {
    if (!confirm(`Receipt ${r.receiptNumber} delete करें?`)) return;
    await api.delete(`/api/payment-receipts/${r._id}`);
    load();
  };

  // Summary
  const totalReceived = receipts.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const emiReceived = receipts.filter(r => r.paymentType === 'emi').reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const downpaymentReceived = receipts.filter(r => r.paymentType === 'downpayment').reduce((s, r) => s + (Number(r.amount) || 0), 0);

  return (
    <div className="p-4 max-w-7xl mx-auto fade-in" style={{ paddingBottom: 100 }}>
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <h1 className="text-2xl font-bold text-green-400">💰 Received Payments ({filtered.length})</h1>
        <button onClick={() => setShowForm(true)} className="btn btn-primary flex items-center gap-1"><Plus size={16} /> New Receipt</button>
      </div>

      {/* Summary */}
      <div className="grid md:grid-cols-3 gap-3 mb-4">
        <div className="card"><div className="text-xs text-slate-400">Total Received</div><div className="text-xl font-bold text-green-400">{formatINR(totalReceived)}</div></div>
        <div className="card"><div className="text-xs text-slate-400">EMI Payments</div><div className="text-xl font-bold text-blue-400">{formatINR(emiReceived)}</div></div>
        <div className="card"><div className="text-xs text-slate-400">Down Payments</div><div className="text-xl font-bold text-yellow-400">{formatINR(downpaymentReceived)}</div></div>
      </div>

      <div className="card mb-4">
        <div className="flex items-center gap-2"><Search size={18} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Customer name, mobile, receipt no, month से search..." /></div>
      </div>

      {loading ? <div className="text-center py-8 text-slate-400">Loading...</div> :
       filtered.length === 0 ? (
         <div className="card text-center py-8 text-slate-500">
           <Receipt size={48} className="mx-auto mb-3 opacity-50" />
           <p>अभी तक कोई payment receipt नहीं</p>
           <button onClick={() => setShowForm(true)} className="btn btn-primary mt-3"><Plus size={14} /> पहली Receipt बनाएं</button>
         </div>
       ) :
       <div className="space-y-2">
         {filtered.map(r => (
           <div key={r._id} className="card card-hover">
             <div className="flex items-start justify-between gap-2">
               <div className="flex-1 cursor-pointer" onClick={() => setPreviewReceipt(r)}>
                 <div className="flex items-center gap-2 mb-1">
                   <Receipt size={14} className="text-green-400" />
                   <span className="font-semibold text-green-400">{r.receiptNumber}</span>
                   <span className={`text-xs px-2 py-0.5 rounded ${r.paymentType === 'emi' ? 'bg-blue-800' : r.paymentType === 'downpayment' ? 'bg-yellow-800' : 'bg-slate-700'}`}>
                     {r.paymentType === 'emi' ? '📅 EMI' : r.paymentType === 'downpayment' ? '💵 Down Payment' : '💰 Other'}
                   </span>
                 </div>
                 <div className="text-sm font-medium">{r.customerName}</div>
                 <div className="text-xs text-slate-400">📞 {r.mobileNo} {r.vehicleModel && `• 🛵 ${r.vehicleModel}`}</div>
                 {r.installmentLabel && <div className="text-xs text-yellow-400">📅 {r.installmentLabel}</div>}
                 <div className="text-xs text-slate-500">📆 {formatDate(r.receiptDate)} • {r.paymentMethod}</div>
                 <div className="text-sm text-green-400 mt-1 font-bold">{formatINR(r.amount)}</div>
               </div>
               <div className="flex flex-col gap-1">
                 <button onClick={() => setPreviewReceipt(r)} className="p-2 rounded bg-blue-700" title="Preview"><Eye size={12} /></button>
                 <button onClick={() => deleteReceipt(r)} className="p-2 rounded bg-red-700"><Trash2 size={12} /></button>
               </div>
             </div>
           </div>
         ))}
       </div>
      }

      {showForm && (
        <ReceiptForm
          customers={customers}
          emis={emis}
          onClose={() => { setShowForm(false); load(); }}
          onSaved={(r) => { setShowForm(false); load(); setPreviewReceipt(r); }}
        />
      )}
      {previewReceipt && <ReceiptPreview receipt={previewReceipt} onClose={() => setPreviewReceipt(null)} />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// FORM — Search customer → pick EMI installment or Down Payment
// ═══════════════════════════════════════════════════════════════════
function ReceiptForm({ customers, emis, onClose, onSaved }) {
  const [custSearch, setCustSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [paymentType, setPaymentType] = useState('emi'); // 'emi' | 'downpayment' | 'other'
  const [selectedEmi, setSelectedEmi] = useState(null);
  const [selectedInstallment, setSelectedInstallment] = useState(null);
  const [amount, setAmount] = useState('');
  const [receiptDate, setReceiptDate] = useState(toISODate(new Date()));
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Filtered customer search results
  const custResults = useMemo(() => {
    const q = custSearch.toLowerCase().trim();
    if (!q || selectedCustomer) return [];
    return customers.filter(c =>
      (c.customerName || c.name || '').toLowerCase().includes(q) ||
      (c.mobile || c.mobileNo || '').includes(q)
    ).slice(0, 8);
  }, [custSearch, customers, selectedCustomer]);

  // This customer's active EMIs
  const customerEmis = useMemo(() => {
    if (!selectedCustomer) return [];
    return emis.filter(e =>
      e.status !== 'cancelled' &&
      (e.customerId === selectedCustomer._id ||
       (e.customerPhone || e.mobile) === (selectedCustomer.mobile || selectedCustomer.mobileNo))
    );
  }, [selectedCustomer, emis]);

  // Schedule for currently selected EMI (pending installments only, for picking)
  const scheduleOptions = useMemo(() => {
    if (!selectedEmi) return [];
    return computeSchedule(selectedEmi).filter(s => !s.paid);
  }, [selectedEmi]);

  const pickCustomer = (c) => {
    setSelectedCustomer(c);
    setCustSearch(c.customerName || c.name || '');
    // Auto-select first active EMI if only one
    const custEmis = emis.filter(e =>
      e.status !== 'cancelled' &&
      (e.customerId === c._id || (e.customerPhone || e.mobile) === (c.mobile || c.mobileNo))
    );
    if (custEmis.length === 1) {
      setSelectedEmi(custEmis[0]);
      const pending = computeSchedule(custEmis[0]).find(s => !s.paid);
      if (pending) { setSelectedInstallment(pending); setAmount(String(pending.amount)); }
    }
  };

  const pickEmi = (emi) => {
    setSelectedEmi(emi);
    setSelectedInstallment(null);
    const pending = computeSchedule(emi).find(s => !s.paid);
    if (pending) { setSelectedInstallment(pending); setAmount(String(pending.amount)); }
  };

  const pickInstallment = (inst) => {
    setSelectedInstallment(inst);
    setAmount(String(inst.amount));
  };

  const save = async () => {
    if (!selectedCustomer) { alert('कृपया Customer select करें'); return; }
    if (!amount || Number(amount) <= 0) { alert('Amount ज़रूरी है'); return; }
    if (paymentType === 'emi' && !selectedInstallment) { alert('कृपया कौन-सी installment है वो select करें'); return; }

    setSaving(true);
    try {
      const payload = {
        receiptDate,
        customerId: selectedCustomer._id,
        customerName: selectedCustomer.customerName || selectedCustomer.name,
        mobileNo: selectedCustomer.mobile || selectedCustomer.mobileNo,
        vehicleModel: selectedEmi?.vehicleModel || selectedCustomer.vehicleModel || '',
        paymentType,
        amount: Number(amount),
        paymentMethod,
        notes,
        ...(paymentType === 'emi' && selectedEmi ? {
          emiId: selectedEmi._id,
          installmentIndex: selectedInstallment.index,
          installmentLabel: selectedInstallment.monthLabel,
          installmentDueDate: toISODate(selectedInstallment.date)
        } : {})
      };
      const saved = await api.post('/api/payment-receipts', payload);
      onSaved(saved);
    } catch (err) {
      alert('❌ Save failed: ' + err.message);
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 p-4 overflow-y-auto" onClick={onClose}>
      <div className="card max-w-lg mx-auto my-4" onClick={(e) => e.stopPropagation()} style={{ paddingBottom: 60 }}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-green-400">💰 नई Payment Receipt</h2>
          <button onClick={onClose}><X size={20} /></button>
        </div>

        {/* Customer Search */}
        <label className="text-xs text-slate-400 mb-1 block">👤 Customer Search *</label>
        <input
          value={custSearch}
          onChange={(e) => { setCustSearch(e.target.value); setSelectedCustomer(null); setSelectedEmi(null); setSelectedInstallment(null); }}
          placeholder="नाम या मोबाइल नंबर टाइप करें..."
          className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white mb-1"
        />
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

            {/* Payment Type */}
            <label className="text-xs text-slate-400 mb-1 block">💳 Payment Type</label>
            <div className="flex gap-2 mb-3">
              <button onClick={() => setPaymentType('emi')} className={`flex-1 py-2 rounded text-sm ${paymentType === 'emi' ? 'bg-blue-700' : 'bg-slate-800'}`}>📅 EMI</button>
              <button onClick={() => setPaymentType('downpayment')} className={`flex-1 py-2 rounded text-sm ${paymentType === 'downpayment' ? 'bg-yellow-700' : 'bg-slate-800'}`}>💵 Down Payment</button>
              <button onClick={() => setPaymentType('other')} className={`flex-1 py-2 rounded text-sm ${paymentType === 'other' ? 'bg-slate-600' : 'bg-slate-800'}`}>💰 Other</button>
            </div>

            {/* EMI Selection */}
            {paymentType === 'emi' && (
              <>
                {customerEmis.length === 0 ? (
                  <div className="text-sm text-yellow-400 mb-3">⚠️ इस customer की कोई active EMI नहीं मिली</div>
                ) : (
                  <>
                    {customerEmis.length > 1 && (
                      <>
                        <label className="text-xs text-slate-400 mb-1 block">🛵 कौन-सी EMI (एक से ज़्यादा हैं)</label>
                        <div className="space-y-1 mb-3">
                          {customerEmis.map(e => (
                            <div key={e._id} onClick={() => pickEmi(e)} className={`p-2 rounded cursor-pointer text-sm ${selectedEmi?._id === e._id ? 'bg-blue-700' : 'bg-slate-800'}`}>
                              {e.vehicleModel} — {formatINR(e.emiAmount)}/mo — {e.paidEmis || 0}/{e.totalEmis || e.tenure} paid
                            </div>
                          ))}
                        </div>
                      </>
                    )}

                    {selectedEmi && (
                      <>
                        <label className="text-xs text-slate-400 mb-1 block">📅 कौन-से महीने की EMI Pay कर रहे हैं?</label>
                        {scheduleOptions.length === 0 ? (
                          <div className="text-sm text-green-400 mb-3">✅ सारी EMI installments already paid हैं!</div>
                        ) : (
                          <select
                            value={selectedInstallment?.index ?? ''}
                            onChange={(e) => pickInstallment(scheduleOptions.find(s => s.index === Number(e.target.value)))}
                            className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white mb-3"
                          >
                            {scheduleOptions.map(s => (
                              <option key={s.index} value={s.index}>{s.monthLabel} — {formatINR(s.amount)}</option>
                            ))}
                          </select>
                        )}
                      </>
                    )}
                  </>
                )}
              </>
            )}

            {/* Amount */}
            <label className="text-xs text-slate-400 mb-1 block">💰 Amount (₹) *</label>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white mb-3" />

            {/* Date + Method */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">📆 Date</label>
                <input type="date" value={receiptDate} onChange={(e) => setReceiptDate(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white" />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">💳 Method</label>
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white">
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                  <option value="bank-transfer">Bank Transfer</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>
            </div>

            <label className="text-xs text-slate-400 mb-1 block">📝 Notes (optional)</label>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white mb-3" />
          </>
        )}

        <div className="flex gap-2 mt-4 sticky bottom-0 bg-slate-900 py-2">
          <button onClick={onClose} className="btn btn-ghost flex-1">Cancel</button>
          <button onClick={save} disabled={saving || !selectedCustomer} className="btn btn-primary flex-1">{saving ? '⏳ Saving...' : '💾 Save Receipt'}</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// PREVIEW + PDF + WhatsApp Share
// ═══════════════════════════════════════════════════════════════════
function ReceiptPreview({ receipt, onClose }) {
  const previewRef = useRef();
  const [busy, setBusy] = useState(false);
  const r = receipt;

  const generatePdfBlob = async () => {
    await ensurePdfLibs();
    const html2canvas = window.html2canvas;
    const { jsPDF } = window.jspdf;
    const el = previewRef.current;
    const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const imgHeight = (canvas.height * pageWidth) / canvas.width;
    pdf.addImage(imgData, 'JPEG', 0, 0, pageWidth, imgHeight);
    return pdf.output('blob');
  };

  const downloadPDF = async () => {
    try {
      setBusy(true);
      const blob = await generatePdfBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `Receipt-${r.receiptNumber}.pdf`; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) { alert('PDF failed: ' + err.message); }
    finally { setBusy(false); }
  };

  const shareWhatsApp = async () => {
    try {
      setBusy(true);
      const blob = await generatePdfBlob();
      const fileName = `Receipt-${r.receiptNumber}.pdf`;
      const file = new File([blob], fileName, { type: 'application/pdf' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: `Payment Receipt ${r.receiptNumber}`,
            text: `🧾 *MD Automobile — Payment Receipt*\nReceipt: ${r.receiptNumber}\nAmount: ${formatINR(r.amount)}\n${r.installmentLabel ? 'EMI: ' + r.installmentLabel : ''}`
          });
          return;
        } catch (e) { if (e.name !== 'AbortError') console.warn(e); }
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = fileName; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      const msg = `🧾 *MD Automobile — Payment Receipt*\n\nReceipt: *${r.receiptNumber}*\nCustomer: ${r.customerName}\nAmount: *${formatINR(r.amount)}*\n${r.installmentLabel ? 'EMI Installment: ' + r.installmentLabel : r.paymentType === 'downpayment' ? 'Down Payment' : ''}\nDate: ${formatDate(r.receiptDate)}\n\n📄 PDF download हो गई है — कृपया attach करके भेजें।`;
      setTimeout(() => openWhatsApp(r.mobileNo, msg), 500);
    } catch (err) { alert('Share failed: ' + err.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 overflow-y-auto" onClick={onClose}>
      <div className="max-w-md mx-auto my-4 p-2" onClick={(e) => e.stopPropagation()}>
        <div className="flex gap-2 mb-3 sticky top-0 bg-slate-900 p-2 rounded z-10">
          <button onClick={onClose} className="btn btn-ghost p-2"><X size={18} /></button>
          <div className="flex-1" />
          <button onClick={downloadPDF} disabled={busy} className="btn bg-blue-700 text-white flex items-center gap-1 px-3 py-2 rounded"><Download size={16} /> PDF</button>
          <button onClick={shareWhatsApp} disabled={busy} className="btn bg-green-700 text-white flex items-center gap-1 px-3 py-2 rounded"><Share2 size={16} /> WhatsApp</button>
        </div>

        <div ref={previewRef} style={{ background: '#fff', color: '#000', padding: 16, fontFamily: 'Arial, sans-serif', fontSize: 13, border: '2px solid #16a34a' }}>
          <div style={{ textAlign: 'center', borderBottom: '2px solid #16a34a', paddingBottom: 8, marginBottom: 8 }}>
            <div style={{ display: 'inline-block', background: '#16a34a', color: '#fff', padding: '2px 16px', fontSize: 11, fontWeight: 'bold', marginBottom: 6, borderRadius: 4 }}>PAYMENT RECEIPT</div>
            <h1 style={{ margin: 0, fontSize: 20, color: '#16a34a' }}>🛺 {BRAND.name} 🛵</h1>
            <div style={{ fontSize: 10 }}>{BRAND.address}</div>
            <div style={{ fontSize: 10 }}>📞 {BRAND.phones}</div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <div><b>Receipt No:</b> <span style={{ color: '#dc2626' }}>{r.receiptNumber}</span></div>
            <div><b>Date:</b> {formatDate(r.receiptDate)}</div>
          </div>

          <div style={{ borderTop: '1px dashed #999', borderBottom: '1px dashed #999', padding: '8px 0', marginBottom: 8 }}>
            <div><b>Received From:</b> {r.customerName}</div>
            <div><b>Mobile:</b> {r.mobileNo}</div>
            {r.vehicleModel && <div><b>Vehicle:</b> {r.vehicleModel}</div>}
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8 }}>
            <tbody>
              <tr><td style={{ padding: 4, fontWeight: 'bold' }}>Payment For:</td><td style={{ padding: 4, textAlign: 'right' }}>
                {r.paymentType === 'emi' ? `EMI Installment (${r.installmentLabel || ''})` : r.paymentType === 'downpayment' ? 'Down Payment' : 'Other Payment'}
              </td></tr>
              <tr><td style={{ padding: 4, fontWeight: 'bold' }}>Payment Method:</td><td style={{ padding: 4, textAlign: 'right', textTransform: 'capitalize' }}>{r.paymentMethod}</td></tr>
              {r.notes && <tr><td style={{ padding: 4, fontWeight: 'bold' }}>Notes:</td><td style={{ padding: 4, textAlign: 'right' }}>{r.notes}</td></tr>}
            </tbody>
          </table>

          <div style={{ background: '#16a34a', color: '#fff', padding: 10, borderRadius: 6, textAlign: 'center', marginBottom: 8 }}>
            <div style={{ fontSize: 11 }}>AMOUNT RECEIVED</div>
            <div style={{ fontSize: 22, fontWeight: 'bold' }}>{formatINR(r.amount)}</div>
          </div>

          <div style={{ fontSize: 10, marginBottom: 12 }}><b>In Words:</b> {numberToWords ? numberToWords(r.amount) : ''}</div>

          <div style={{ textAlign: 'right', fontWeight: 'bold', marginTop: 20 }}>
            <div style={{ borderTop: '1px solid #000', display: 'inline-block', paddingTop: 4, paddingLeft: 20 }}>For: MD Automobiles</div>
          </div>
        </div>

        {busy && <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"><div className="bg-slate-900 p-6 rounded text-white">⏳ PDF generate हो रहा है...</div></div>}
      </div>
    </div>
  );
}
