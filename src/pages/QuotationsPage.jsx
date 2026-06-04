import React, { useState, useEffect, useRef } from 'react';
import { Plus, Search, Receipt, MessageCircle, Trash2, Download, Eye, X, FileText, Share2 } from 'lucide-react';
import AdminPasswordModal from '../components/AdminPasswordModal';
import { api, MD_CONFIG } from '../utils/apiConfig';
import { formatDate, formatINR, openWhatsApp } from '../utils/smartUtils';

// ─── Brand info for the quotation ────────────────────────────────────
const BRAND = {
  name: 'MD AUTOMOBILES',
  address: 'पता: नरसिंहगढ रोड, (वी.पी.होण्डा) शोरूम के पास परवलिया सडक भोपाल',
  phones: '8103476883, 8962620890, 8817166596',
  gstin: MD_CONFIG?.gstin || '23BCYPD9538B1ZG',
  signFor: 'For: MD Automobiles'
};

// ─── Bank Details (बाद में change करना हो तो यहाँ edit करें) ──────────
// TODO: Move to Settings DB for runtime editing
const BANK = {
  bankName: 'State Bank of India (SBI)',
  branch: 'परवलिया सड़क, भोपाल',
  accountNo: '________________',     // ← अपना actual account number यहाँ डालें
  ifsc: 'SBIN0015080',
  beneficiary: 'MD AUTOMOBILES',
  upi: MD_CONFIG?.upi || ''
};

// ─── Dynamic CDN loader for html2canvas + jsPDF ──────────────────────
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

// ─── Number → Hindi words (basic, for "Rupees in Words") ────────────
const numberToWords = (num) => {
  if (!num || num === 0) return 'Zero Rupees Only';
  const a = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
  const b = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
  const numToWord = (n) => {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n/10)] + (n%10 ? ' ' + a[n%10] : '');
    if (n < 1000) return a[Math.floor(n/100)] + ' Hundred' + (n%100 ? ' ' + numToWord(n%100) : '');
    if (n < 100000) return numToWord(Math.floor(n/1000)) + ' Thousand' + (n%1000 ? ' ' + numToWord(n%1000) : '');
    if (n < 10000000) return numToWord(Math.floor(n/100000)) + ' Lakh' + (n%100000 ? ' ' + numToWord(n%100000) : '');
    return numToWord(Math.floor(n/10000000)) + ' Crore' + (n%10000000 ? ' ' + numToWord(n%10000000) : '');
  };
  return numToWord(Math.round(Number(num))) + ' Rupees Only';
};

const TERMS = [
  'नियम और शर्तें लागू हैं।',
  '1. यह फाइनल रेट नहीं है — फाइनल रेट कम/ज्यादा हो सकती है।',
  '2. EMI और loan amount आपकी CIBIL Score पर निर्भर करती है।',
  '3. इसमें बैंक के charges और processing fees शामिल नहीं हैं।',
  '4. ब्याज दर (Interest rate) Customer की CIBIL Score के अनुसार बदल सकती है।',
  '5. यह सिर्फ एक manual estimation है — final quotation नहीं।'
];

// ═══════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════
export default function QuotationsPage() {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [previewItem, setPreviewItem] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const raw = await api.get('/api/quotations');
      setItems(Array.isArray(raw) ? raw : (raw?.quotations || []));
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const doDelete = async () => {
    await api.delete(`/api/quotations/${confirmDelete._id}`);
    setConfirmDelete(null);
    load();
  };

  const filtered = items.filter(q =>
    !search || [q.quotationNumber, q.customerName, q.mobileNo, q.vehicleModel]
      .some(f => String(f || '').toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="p-4 max-w-7xl mx-auto fade-in" style={{ paddingBottom: 100 }}>
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <h1 className="text-2xl font-bold text-green-400">📋 Quotations ({filtered.length})</h1>
        <button onClick={() => { setEditingItem(null); setShowForm(true); }} className="btn btn-primary flex items-center gap-1"><Plus size={16} /> New</button>
      </div>

      <div className="card mb-4">
        <div className="flex items-center gap-2"><Search size={18} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search quotations..." /></div>
      </div>

      {loading ? <div className="text-center py-8 text-slate-400">Loading...</div> :
       filtered.length === 0 ? (
         <div className="card text-center py-8 text-slate-500">
           <Receipt size={48} className="mx-auto mb-3 opacity-50" />
           <p>अभी तक कोई quotation नहीं</p>
           <button onClick={() => setShowForm(true)} className="btn btn-primary mt-3"><Plus size={14} /> First Quotation</button>
         </div>
       ) :
       <div className="space-y-2">
         {filtered.map(q => (
           <div key={q._id} className="card card-hover">
             <div className="flex items-start justify-between gap-2">
               <div className="flex-1 cursor-pointer" onClick={() => setPreviewItem(q)}>
                 <div className="flex items-center gap-2 mb-1">
                   <Receipt size={14} className="text-green-400" />
                   <span className="font-semibold text-green-400">{q.quotationNumber}</span>
                 </div>
                 <div className="text-sm font-medium">{q.customerName}</div>
                 <div className="text-xs text-slate-400">🛵 {q.vehicleModel} • 📞 {q.mobileNo}</div>
                 <div className="text-xs text-slate-500">📅 {formatDate(q.quotationDate)}</div>
                 <div className="text-sm text-green-400 mt-1 font-bold">{formatINR(q.grandTotal || q.finalPrice)}</div>
                 {q.emiAmount > 0 && <div className="text-xs text-yellow-400">EMI: {formatINR(q.emiAmount)}/mo × {q.tenureMonths}m</div>}
               </div>
               <div className="flex flex-col gap-1">
                 <button onClick={() => setPreviewItem(q)} className="p-2 rounded bg-blue-700" title="Preview"><Eye size={12} /></button>
                 <button onClick={() => { setEditingItem(q); setShowForm(true); }} className="p-2 rounded bg-yellow-700" title="Edit"><FileText size={12} /></button>
                 <button onClick={() => setConfirmDelete(q)} className="p-2 rounded bg-red-700"><Trash2 size={12} /></button>
               </div>
             </div>
           </div>
         ))}
       </div>
      }

      {showForm && <QuotationForm initial={editingItem} onClose={() => { setShowForm(false); setEditingItem(null); load(); }} onSaved={(q) => { setShowForm(false); setEditingItem(null); load(); setPreviewItem(q); }} />}
      {previewItem && <QuotationPreview quotation={previewItem} onClose={() => setPreviewItem(null)} />}
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

// ═══════════════════════════════════════════════════════════════════
// FORM (Create / Edit)
// ═══════════════════════════════════════════════════════════════════
function QuotationForm({ initial, onClose, onSaved }) {
  const [form, setForm] = useState(initial || {
    quotationNumber: '',
    quotationDate: new Date().toISOString().split('T')[0],
    customerName: '', mobileNo: '', address: '', hypothecation: '', customerGstin: '',
    vehicleModel: '', variant: '', color: '',
    price: 0,
    batteryWarranty: '1 Year', motorWarranty: '1 Year',
    controllerWarranty: '1 Year', chargerWarranty: '1 Year',
    fameSubsidy: 0, stateSubsidy: 0,
    accessories: 0,
    downPayment: 0, loanAmount: 0, tenureMonths: 36, interestRate: 12,
    totalSubsidy: 0, emiAmount: 0, grandTotal: 0,
    notes: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!initial?.quotationNumber) {
      api.get('/api/quotations/util/next-number').then(r => setForm(f => ({ ...f, quotationNumber: r.quotationNumber || r.next || `MD-Q/${new Date().getFullYear()}/${String(Date.now()).slice(-4)}` }))).catch(() => {
        setForm(f => ({ ...f, quotationNumber: `MD-Q/${new Date().getFullYear()}/${String(Date.now()).slice(-4)}` }));
      });
    }
  }, []);

  const update = (key, value) => {
    const u = { ...form, [key]: value };
    const n = (v) => Number(v) || 0;
    u.totalSubsidy = n(u.fameSubsidy) + n(u.stateSubsidy);

    // Grand Total = price + accessories - subsidy (या अगर price 0 है तो down + loan use करो)
    const fromPrice = n(u.price) + n(u.accessories) - u.totalSubsidy;
    const fromFinance = n(u.downPayment) + n(u.loanAmount);
    u.grandTotal = fromPrice > 0 ? fromPrice : fromFinance;

    // EMI calc: P * r * (1+r)^n / ((1+r)^n - 1)
    const P = n(u.loanAmount);
    const r = n(u.interestRate) / 1200;
    const months = n(u.tenureMonths);
    u.emiAmount = (P > 0 && r > 0 && months > 0)
      ? Math.round(P * r * Math.pow(1 + r, months) / (Math.pow(1 + r, months) - 1))
      : 0;
    setForm(u);
  };

  const save = async () => {
    if (!form.customerName || !form.mobileNo) { alert('Customer Name और Mobile ज़रूरी हैं'); return; }
    setSaving(true);
    try {
      let saved;
      if (initial?._id) {
        saved = await api.put(`/api/quotations/${initial._id}`, form);
      } else {
        saved = await api.post('/api/quotations', form);
      }
      onSaved(saved);
    } catch (err) {
      alert('❌ Save failed: ' + err.message);
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 p-4 overflow-y-auto" onClick={onClose}>
      <div className="card max-w-2xl mx-auto my-4" onClick={(e) => e.stopPropagation()} style={{ paddingBottom: 60 }}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-green-400">{initial?._id ? '✏️ Edit Quotation' : '➕ New Quotation'}</h2>
          <button onClick={onClose}><X size={20} /></button>
        </div>

        {/* Header info */}
        <h3 className="text-sm text-yellow-400 font-bold mt-2 mb-2">📄 Header</h3>
        <div className="grid md:grid-cols-2 gap-3">
          <Field label="Quote No" value={form.quotationNumber} onChange={(v) => update('quotationNumber', v)} />
          <Field label="Date" type="date" value={form.quotationDate} onChange={(v) => update('quotationDate', v)} />
        </div>

        {/* Customer */}
        <h3 className="text-sm text-yellow-400 font-bold mt-4 mb-2">👤 Customer</h3>
        <div className="grid md:grid-cols-2 gap-3">
          <Field label="Customer Name *" value={form.customerName} onChange={(v) => update('customerName', v)} />
          <Field label="Mobile *" value={form.mobileNo} onChange={(v) => update('mobileNo', v.replace(/\D/g, '').slice(0,10))} />
          <Field label="Address" value={form.address} onChange={(v) => update('address', v)} fullWidth />
          <Field label="Hypothecation (Bank)" value={form.hypothecation} onChange={(v) => update('hypothecation', v)} placeholder="HDFC, ICICI..." />
          <Field label="Customer GSTIN (अगर हो)" value={form.customerGstin} onChange={(v) => update('customerGstin', v)} />
        </div>

        {/* Vehicle */}
        <h3 className="text-sm text-yellow-400 font-bold mt-4 mb-2">🛵 Vehicle</h3>
        <div className="grid md:grid-cols-2 gap-3">
          <Field label="Model" value={form.vehicleModel} onChange={(v) => update('vehicleModel', v.toUpperCase())} placeholder="ASVA, LUCKA, RUBIE..." />
          <Field label="Variant" value={form.variant} onChange={(v) => update('variant', v.toUpperCase())} placeholder="60 VOLT" />
          <Field label="Color" value={form.color} onChange={(v) => update('color', v.toUpperCase())} />
          <Field label="💰 Price (Ex-Showroom)" type="number" value={form.price} onChange={(v) => update('price', v)} />
        </div>

        {/* Warranties */}
        <h3 className="text-sm text-yellow-400 font-bold mt-4 mb-2">🛡️ Warranties</h3>
        <div className="grid md:grid-cols-2 gap-3">
          <Field label="Battery Warranty" value={form.batteryWarranty} onChange={(v) => update('batteryWarranty', v)} />
          <Field label="Motor Warranty" value={form.motorWarranty} onChange={(v) => update('motorWarranty', v)} />
          <Field label="Controller Warranty" value={form.controllerWarranty} onChange={(v) => update('controllerWarranty', v)} />
          <Field label="Charger Warranty" value={form.chargerWarranty} onChange={(v) => update('chargerWarranty', v)} />
        </div>

        {/* Government Subsidy */}
        <h3 className="text-sm text-yellow-400 font-bold mt-4 mb-2">🏛️ Subsidies</h3>
        <div className="grid md:grid-cols-2 gap-3">
          <Field label="FAME-II Subsidy" type="number" value={form.fameSubsidy} onChange={(v) => update('fameSubsidy', v)} />
          <Field label="State Subsidy" type="number" value={form.stateSubsidy} onChange={(v) => update('stateSubsidy', v)} />
        </div>

        {/* Accessories */}
        <h3 className="text-sm text-yellow-400 font-bold mt-4 mb-2">🎁 Accessories</h3>
        <div className="grid md:grid-cols-2 gap-3">
          <Field label="Accessories Amount" type="number" value={form.accessories} onChange={(v) => update('accessories', v)} />
        </div>

        {/* Finance */}
        <h3 className="text-sm text-yellow-400 font-bold mt-4 mb-2">🏦 Finance / EMI</h3>
        <div className="grid md:grid-cols-2 gap-3">
          <Field label="Down Payment" type="number" value={form.downPayment} onChange={(v) => update('downPayment', v)} />
          <Field label="Loan Amount" type="number" value={form.loanAmount} onChange={(v) => update('loanAmount', v)} />
          <Field label="Tenure (months)" type="number" value={form.tenureMonths} onChange={(v) => update('tenureMonths', v)} />
          <Field label="Interest Rate %" type="number" value={form.interestRate} onChange={(v) => update('interestRate', v)} />
        </div>

        {/* Summary */}
        <div className="card mt-4 bg-green-900/20 border border-green-700">
          <div className="text-sm flex justify-between"><span>Total Subsidy:</span> <span className="font-bold text-green-400">- {formatINR(form.totalSubsidy)}</span></div>
          <div className="text-sm flex justify-between"><span>Grand Total:</span> <span className="font-bold text-green-400 text-lg">{formatINR(form.grandTotal)}</span></div>
          {form.emiAmount > 0 && (
            <div className="text-sm flex justify-between mt-1"><span>EMI ({form.tenureMonths}m @ {form.interestRate}%):</span> <span className="font-bold text-yellow-400">{formatINR(form.emiAmount)}/month</span></div>
          )}
        </div>

        <Field label="Notes (optional)" value={form.notes} onChange={(v) => update('notes', v)} fullWidth />

        <div className="flex gap-2 mt-4 sticky bottom-0 bg-slate-900 py-2 z-10">
          <button onClick={onClose} className="btn btn-ghost flex-1">Cancel</button>
          <button onClick={save} disabled={saving} className="btn btn-primary flex-1">{saving ? '⏳ Saving...' : '💾 Save & Preview'}</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// PREVIEW + PDF + WhatsApp Share
// ═══════════════════════════════════════════════════════════════════
function QuotationPreview({ quotation, onClose }) {
  const previewRef = useRef();
  const [busy, setBusy] = useState(false);

  const generatePdfBlob = async () => {
    await ensurePdfLibs();
    const html2canvas = window.html2canvas;
    const { jsPDF } = window.jspdf;
    const el = previewRef.current;
    if (!el) throw new Error('Preview element missing');

    const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    return pdf.output('blob');
  };

  const downloadPDF = async () => {
    try {
      setBusy(true);
      const blob = await generatePdfBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Quotation-${quotation.quotationNumber || 'MD'}.pdf`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      alert('PDF generation failed: ' + err.message);
    } finally { setBusy(false); }
  };

  const shareWhatsApp = async () => {
    try {
      setBusy(true);
      const blob = await generatePdfBlob();
      const fileName = `Quotation-${quotation.quotationNumber || 'MD'}.pdf`;
      const file = new File([blob], fileName, { type: 'application/pdf' });

      // Try Web Share API (native — WhatsApp option appears)
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: `Quotation ${quotation.quotationNumber}`,
            text: `🛵 *MD Automobile*\nQuotation: ${quotation.quotationNumber}\nVehicle: ${quotation.vehicleModel}\nGrand Total: ${formatINR(quotation.grandTotal)}\n\nFull details PDF में attached हैं 👆`
          });
          return;
        } catch (e) {
          if (e.name !== 'AbortError') console.warn('Native share failed:', e.message);
        }
      }

      // Fallback: download PDF + open WhatsApp with text
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);

      const msg = `🛵 *MD Automobile*\n\nQuotation: *${quotation.quotationNumber}*\nVehicle: ${quotation.vehicleModel} ${quotation.variant || ''} ${quotation.color || ''}\nGrand Total: ${formatINR(quotation.grandTotal)}\nEMI: ${formatINR(quotation.emiAmount)}/month × ${quotation.tenureMonths}\n\n📄 PDF download हो गई है — कृपया attach करके भेजें।`;
      setTimeout(() => openWhatsApp(quotation.mobileNo, msg), 500);
    } catch (err) {
      alert('Share failed: ' + err.message);
    } finally { setBusy(false); }
  };

  const q = quotation;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 overflow-y-auto" onClick={onClose}>
      <div className="max-w-3xl mx-auto my-4 p-2" onClick={(e) => e.stopPropagation()}>
        {/* Action buttons */}
        <div className="flex gap-2 mb-3 sticky top-0 bg-slate-900 p-2 rounded z-10">
          <button onClick={onClose} className="btn btn-ghost p-2"><X size={18} /></button>
          <div className="flex-1" />
          <button onClick={downloadPDF} disabled={busy} className="btn bg-blue-700 text-white flex items-center gap-1 px-3 py-2 rounded">
            <Download size={16} /> {busy ? '...' : 'PDF'}
          </button>
          <button onClick={shareWhatsApp} disabled={busy} className="btn bg-green-700 text-white flex items-center gap-1 px-3 py-2 rounded">
            <Share2 size={16} /> WhatsApp
          </button>
        </div>

        {/* ─── Printable Quotation HTML (replica of paper slip) ──── */}
        <div ref={previewRef} style={{
          background: '#fff',
          color: '#000',
          padding: 16,
          fontFamily: '"Noto Sans", Arial, sans-serif',
          fontSize: 12,
          lineHeight: 1.4,
          border: '2px solid #1e3a8a'
        }}>
          {/* Header */}
          <div style={{ borderBottom: '2px solid #1e3a8a', paddingBottom: 8, marginBottom: 8, textAlign: 'center' }}>
            <div style={{ display: 'inline-block', background: '#000', color: '#fff', padding: '2px 16px', fontSize: 11, fontWeight: 'bold', marginBottom: 6 }}>QUOTATION</div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 'bold', color: '#1e3a8a' }}>🛺 {BRAND.name} 🛵</h1>
            <div style={{ fontSize: 11, marginTop: 4 }}>{BRAND.address}</div>
            <div style={{ fontSize: 11 }}>📞 {BRAND.phones}</div>
          </div>

          {/* No + Date */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <div><b>No.</b> <span style={{ color: '#dc2626', fontWeight: 'bold' }}>{q.quotationNumber}</span></div>
            <div><b>Date:</b> {formatDate(q.quotationDate)}</div>
          </div>

          {/* Customer */}
          <div style={{ borderBottom: '1px solid #999', paddingBottom: 6, marginBottom: 6 }}>
            <div><b>Name:</b> {q.customerName}</div>
            <div><b>Add:</b> {q.address || '—'}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div><b>Mob:</b> {q.mobileNo}</div>
              <div><b>GSTIN:</b> {q.customerGstin || BRAND.gstin}</div>
            </div>
            <div><b>Hypothecation:</b> {q.hypothecation || '—'}</div>
          </div>

          {/* Particulars Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 4 }}>
            <thead>
              <tr style={{ background: '#1e3a8a', color: '#fff' }}>
                <th style={{ border: '1px solid #000', padding: 4, width: 30 }}>S.No</th>
                <th style={{ border: '1px solid #000', padding: 4, textAlign: 'left' }}>Particulars</th>
                <th style={{ border: '1px solid #000', padding: 4, width: 90 }}>Rate / Detail</th>
                <th style={{ border: '1px solid #000', padding: 4, width: 90 }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              <Row n={1} p="Model Name" rate={`${q.vehicleModel || ''} ${q.variant || ''} ${q.color || ''}`.trim()} amt="" />
              <Row n={2} p="Price (Ex-Showroom)" rate="" amt={formatINR(q.price || 0)} />
              <Row n={3} p="Battery Warranty" rate={q.batteryWarranty || '1 Year'} amt="" />
              <Row n={4} p="Motor Warranty" rate={q.motorWarranty || '1 Year'} amt="" />
              <Row n={5} p="Controller Warranty" rate={q.controllerWarranty || '1 Year'} amt="" />
              <Row n={6} p="Charger Warranty" rate={q.chargerWarranty || '1 Year'} amt="" />
              <Row n={7} p="Finance Down Payment" rate="" amt={formatINR(q.downPayment || 0)} />
              <Row n={8} p={`EMI ${q.tenureMonths || 0}m @ ${q.interestRate || 0}%`} rate={`Loan: ${formatINR(q.loanAmount || 0)}`} amt={`${formatINR(q.emiAmount || 0)}/mo`} />
              {q.accessories > 0 && <Row n={9} p="Accessories" rate="" amt={formatINR(q.accessories)} />}
              {q.totalSubsidy > 0 && <Row n={10} p="Total Subsidy (FAME+State)" rate="" amt={`- ${formatINR(q.totalSubsidy)}`} />}
            </tbody>
          </table>

          {/* Documents Required */}
          <div style={{ marginTop: 10, border: '1px solid #999', padding: 6 }}>
            <div style={{ display: 'flex', gap: 16 }}>
              <div style={{ flex: 1 }}>
                <b style={{ color: '#1e3a8a' }}>लोन दस्तावेज</b>
                <ol style={{ margin: '4px 0 0 18px', padding: 0, fontSize: 11 }}>
                  <li>आधार कार्ड</li>
                  <li>पेन कार्ड</li>
                  <li>बिजली बिल</li>
                  <li>बैंक पासबुक (6 माह की एंट्री)</li>
                  <li>चैक - 6</li>
                </ol>
              </div>
              <div style={{ flex: 1 }}>
                <b style={{ color: '#1e3a8a' }}>गवाह के दस्तावेज</b>
                <ol style={{ margin: '4px 0 0 18px', padding: 0, fontSize: 11 }}>
                  <li>आधार कार्ड</li>
                  <li>पेन कार्ड</li>
                  <li>ड्राइविंग लाइसेंस</li>
                  <li>वोटर आई.डी</li>
                  <li>बिजली बिल</li>
                </ol>
              </div>
            </div>
          </div>

          {/* Grand Total — prominent */}
          <div style={{ marginTop: 12, marginLeft: 'auto', width: '60%' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                <tr style={{ background: '#1e3a8a', color: '#fff' }}>
                  <td style={{ border: '2px solid #000', padding: 10, fontWeight: 'bold', fontSize: 16 }}>GRAND TOTAL</td>
                  <td style={{ border: '2px solid #000', padding: 10, textAlign: 'right', fontWeight: 'bold', fontSize: 18 }}>{formatINR(q.grandTotal || 0)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: 6, fontSize: 11 }}>
            <b>Rupees in Words:</b> {numberToWords(q.grandTotal || 0)}
          </div>

          {/* === Bank Details === */}
          <div style={{ marginTop: 12, padding: 8, border: '2px solid #1e3a8a', background: '#eff6ff' }}>
            <div style={{ color: '#1e3a8a', fontWeight: 'bold', marginBottom: 6, fontSize: 12 }}>💳 Payment Details — Bank Transfer</div>
            <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
              <tbody>
                <tr><td style={{ padding: '2px 4px', fontWeight: 'bold', width: '30%' }}>Beneficiary:</td><td style={{ padding: '2px 4px' }}>{BANK.beneficiary}</td></tr>
                <tr><td style={{ padding: '2px 4px', fontWeight: 'bold' }}>Bank:</td><td style={{ padding: '2px 4px' }}>{BANK.bankName}</td></tr>
                <tr><td style={{ padding: '2px 4px', fontWeight: 'bold' }}>Branch:</td><td style={{ padding: '2px 4px' }}>{BANK.branch}</td></tr>
                <tr><td style={{ padding: '2px 4px', fontWeight: 'bold' }}>Account No:</td><td style={{ padding: '2px 4px', fontFamily: 'monospace' }}>{BANK.accountNo}</td></tr>
                <tr><td style={{ padding: '2px 4px', fontWeight: 'bold' }}>IFSC Code:</td><td style={{ padding: '2px 4px', fontFamily: 'monospace' }}>{BANK.ifsc}</td></tr>
                {BANK.upi && <tr><td style={{ padding: '2px 4px', fontWeight: 'bold' }}>UPI:</td><td style={{ padding: '2px 4px', fontFamily: 'monospace' }}>{BANK.upi}</td></tr>}
              </tbody>
            </table>
          </div>

          {/* Terms & Conditions */}
          <div style={{ marginTop: 10, padding: 6, border: '1px dashed #dc2626', background: '#fef2f2' }}>
            <div style={{ color: '#dc2626', fontWeight: 'bold', marginBottom: 4, fontSize: 11 }}>⚠️ नियम और शर्तें (Terms & Conditions):</div>
            {TERMS.slice(1).map((t, i) => (
              <div key={i} style={{ fontSize: 10, color: '#7f1d1d', marginBottom: 2 }}>{t}</div>
            ))}
          </div>

          {/* Footer signature */}
          <div style={{ marginTop: 20, textAlign: 'right', fontWeight: 'bold' }}>
            <div style={{ borderTop: '1px solid #000', display: 'inline-block', paddingTop: 4, paddingLeft: 20 }}>
              {BRAND.signFor}
            </div>
          </div>
        </div>

        {busy && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="bg-slate-900 p-6 rounded text-white">⏳ PDF generate हो रहा है...</div>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ n, p, rate, amt }) {
  return (
    <tr>
      <td style={{ border: '1px solid #000', padding: 4, textAlign: 'center' }}>{n}</td>
      <td style={{ border: '1px solid #000', padding: 4 }}>{p}</td>
      <td style={{ border: '1px solid #000', padding: 4, fontSize: 10 }}>{rate}</td>
      <td style={{ border: '1px solid #000', padding: 4, textAlign: 'right', fontWeight: 'bold' }}>{amt}</td>
    </tr>
  );
}

function Field({ label, value, onChange, type = 'text', placeholder, fullWidth }) {
  return (
    <div style={fullWidth ? { gridColumn: '1 / -1' } : {}}>
      <label className="text-xs text-slate-400 mb-1 block">{label}</label>
      <input
        type={type}
        value={value || ''}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white"
      />
    </div>
  );
}
