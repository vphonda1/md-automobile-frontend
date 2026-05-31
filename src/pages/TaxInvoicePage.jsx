import React, { useState, useEffect, useRef } from 'react';
import { Plus, Search, Printer, Save, Download, Trash2, FileText, MessageCircle } from 'lucide-react';
import { api, MD_CONFIG } from '../utils/apiConfig';
import { formatINR, formatDate, openWhatsApp, toISODate } from '../utils/smartUtils';
import AdminPasswordModal from '../components/AdminPasswordModal';
import AutoComplete from '../components/AutoComplete';

// Convert number to Indian English words
function numberToWords(num) {
  if (num === 0) return 'Zero';
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const inWords = (n) => {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n/10)] + (n%10 ? ' ' + a[n%10] : '');
    if (n < 1000) return a[Math.floor(n/100)] + ' Hundred' + (n%100 ? ' ' + inWords(n%100) : '');
    if (n < 100000) return inWords(Math.floor(n/1000)) + ' Thousand' + (n%1000 ? ' ' + inWords(n%1000) : '');
    if (n < 10000000) return inWords(Math.floor(n/100000)) + ' Lakh' + (n%100000 ? ' ' + inWords(n%100000) : '');
    return inWords(Math.floor(n/10000000)) + ' Crore' + (n%10000000 ? ' ' + inWords(n%10000000) : '');
  };
  const rupees = Math.floor(num);
  return inWords(rupees) + ' Only';
}

export default function TaxInvoicePage() {
  const [invoices, setInvoices] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [previewInvoice, setPreviewInvoice] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.get('/api/invoices');
      setInvoices(data.filter(i => i.invoiceType === 'sale' || !i.invoiceType));
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const doDelete = async () => {
    await api.delete(`/api/invoices/${confirmDelete._id}`);
    setConfirmDelete(null);
    load();
  };

  const filtered = invoices.filter(inv => {
    if (!search) return true;
    const q = search.toLowerCase();
    return [inv.invoiceNumber, inv.customerName, inv.mobileNo, inv.chassisNo]
      .some(f => String(f || '').toLowerCase().includes(q));
  });

  return (
    <div className="p-4 max-w-7xl mx-auto fade-in">
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-green-400">📋 Tax Invoices</h1>
          <p className="text-xs text-slate-400">{filtered.length} invoices • Customer select करते ही auto-fill</p>
        </div>
        <button onClick={() => { setEditingInvoice(null); setShowForm(true); }} className="btn btn-primary flex items-center gap-1">
          <Plus size={16} /> New Tax Invoice
        </button>
      </div>

      <div className="card mb-4">
        <div className="flex items-center gap-2"><Search size={18} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Invoice no, customer, mobile, chassis..." /></div>
      </div>

      {loading ? <div className="text-center py-8">Loading...</div> :
       filtered.length === 0 ? <div className="card text-center py-8 text-slate-500">कोई tax invoice नहीं</div> :
       <div className="space-y-2">
         {filtered.map(inv => (
           <div key={inv._id} className="card card-hover">
             <div className="flex items-start justify-between gap-2">
               <div className="flex-1">
                 <div className="flex items-center gap-2 mb-1">
                   <FileText size={14} className="text-green-400" />
                   <span className="font-semibold">{inv.invoiceNumber}</span>
                 </div>
                 <div className="text-sm">{inv.customerName} • {inv.vehicleModel} {inv.color && `(${inv.color})`}</div>
                 <div className="text-xs text-slate-400">📅 {formatDate(inv.invoiceDate)} • 📞 {inv.mobileNo} • 🔧 {inv.chassisNo}</div>
                 <div className="text-sm font-bold text-green-400 mt-1">{formatINR(inv.totalAmount)} (Final: {formatINR(inv.finalPayable || inv.totalAmount)})</div>
               </div>
               <div className="flex flex-col gap-1">
                 <button onClick={() => setPreviewInvoice(inv)} className="p-2 rounded bg-blue-700" title="Preview/Print"><Printer size={12} /></button>
                 <button onClick={() => { setEditingInvoice(inv); setShowForm(true); }} className="p-2 rounded bg-slate-700" title="Edit">✎</button>
                 <button onClick={() => openWhatsApp(inv.mobileNo, `Invoice ${inv.invoiceNumber} for ${inv.customerName}`)} className="p-2 rounded bg-green-700"><MessageCircle size={12} /></button>
                 <button onClick={() => setConfirmDelete(inv)} className="p-2 rounded bg-red-700"><Trash2 size={12} /></button>
               </div>
             </div>
           </div>
         ))}
       </div>
      }

      {showForm && <InvoiceForm invoice={editingInvoice} onClose={() => { setShowForm(false); load(); }} onPreview={setPreviewInvoice} />}
      {previewInvoice && <InvoicePreview invoice={previewInvoice} onClose={() => setPreviewInvoice(null)} />}
      {confirmDelete && (
        <AdminPasswordModal
          action="Delete tax invoice"
          itemName={`${confirmDelete.invoiceNumber} — ${confirmDelete.customerName}`}
          onConfirm={doDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}

// ============== INVOICE FORM ==============
function InvoiceForm({ invoice, onClose, onPreview }) {
  const [customers, setCustomers] = useState([]);
  const [variants, setVariants] = useState([]);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState(invoice || {
    invoiceNumber: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    invoiceType: 'sale',

    // Customer details
    customerName: '', fatherName: '', mobileNo: '', alternateMobile: '',
    customerAddress: '', district: 'BHOPAL', state: 'MADHYA PRADESH', stateCode: '23', pincode: '',
    dob: '', customerAadhar: '', customerPan: '',
    financerName: 'CASH',

    // Vehicle details
    vehicleModel: '', variant: '', color: '', hsnNumber: '8703',
    chassisNo: '', motorNo: '', motorNo2: '',
    batteryNo: '', chargerNo: '', controllerNo: '', keyNo: '0',
    voltVariant: '60 VOLT', manufactureYear: new Date().getFullYear(),

    // Pricing
    taxableAmount: 0,
    cgstPercent: 2.5, cgstAmount: 0,
    sgstPercent: 2.5, sgstAmount: 0,
    exShowroomPrice: 0,
    invoiceSubTotal: 0,
    roundOff: 0,
    totalAmount: 0,
    discount: 0,
    finalPayable: 0,

    paymentMode: 'cash', paymentStatus: 'paid',
    remarks: ''
  });

  // Load helper data on open
  useEffect(() => {
    Promise.all([
      api.get('/api/customers').catch(() => []),
      api.get('/api/pricelist/variants').catch(() => ['W OUT BTY', '48 VOLT', '60 VOLT', '72 VOLT', '60 V 43 AH'])
    ]).then(([c, v]) => {
      setCustomers(c);
      setVariants(v);
    });

    // Auto-generate invoice number for new
    if (!invoice) {
      api.get('/api/invoices/util/next-number').then(r => {
        // Convert YE/2026/0001 → MD/25-26/001 format
        const fy = (() => {
          const d = new Date();
          const year = d.getFullYear();
          const isAfterApril = d.getMonth() >= 3;
          return isAfterApril ? `${String(year).slice(-2)}-${String(year + 1).slice(-2)}` : `${String(year - 1).slice(-2)}-${String(year).slice(-2)}`;
        })();
        const num = (r.invoiceNumber || '').match(/(\d+)$/)?.[1] || '001';
        setForm(f => ({ ...f, invoiceNumber: `MDA/ ${fy} ${String(num).padStart(3, '0')}` }));
      }).catch(() => {});
    }
  }, []);

  // Auto-fill from customer
  const fillFromCustomer = async (mobile) => {
    if (!mobile) return;
    try {
      const r = await api.get(`/api/invoice-helper/customer-full/${mobile}`).catch(() => null);
      if (!r || !r.customer) return;

      const c = r.customer;
      setForm(f => ({
        ...f,
        customerName: c.customerName || f.customerName,
        fatherName: c.fatherName || f.fatherName,
        mobileNo: c.mobileNo || mobile,
        alternateMobile: c.alternateMobile || f.alternateMobile,
        customerAddress: c.address || f.customerAddress,
        district: c.city || f.district,
        pincode: c.pincode || f.pincode,
        dob: c.dob || f.dob,
        customerAadhar: c.aadhar || f.customerAadhar,
        customerPan: c.pan || f.customerPan,
        // Vehicle
        vehicleModel: c.vehicleModel || f.vehicleModel,
        color: c.color || f.color,
        chassisNo: c.chassisNo || f.chassisNo,
        batteryNo: c.batteryNumber || f.batteryNo,
        motorNo: c.motorNumber || f.motorNo,
        // Try price from price list
        ...((r.priceEntry && c.vehicleModel) ? autoPrice(r.priceEntry, f.voltVariant) : {})
      }));
    } catch (e) { console.error(e); }
  };

  const autoPrice = (priceEntry, voltVariant) => {
    const v = priceEntry?.variants?.find(x => x.name === voltVariant);
    if (!v || v.price == null) return {};
    return calculateGST(v.price);
  };

  // Reverse-calculate from total → taxable + GST 5%
  const calculateGST = (totalPrice) => {
    const taxable = Math.round((totalPrice / 1.05) * 100) / 100;
    const cgst = Math.round((taxable * 0.025) * 100) / 100;
    const sgst = Math.round((taxable * 0.025) * 100) / 100;
    const exShowroom = taxable + cgst + sgst;
    const rounded = Math.round(exShowroom);
    const roundOff = rounded - exShowroom;
    return {
      taxableAmount: taxable,
      cgstAmount: cgst,
      sgstAmount: sgst,
      exShowroomPrice: exShowroom,
      invoiceSubTotal: exShowroom,
      roundOff: Number(roundOff.toFixed(2)),
      totalAmount: rounded,
      finalPayable: rounded
    };
  };

  // When user changes total amount directly, reverse calc taxable
  const updateFromTotal = (total) => {
    const num = Number(total) || 0;
    const calc = calculateGST(num);
    setForm(f => ({ ...f, ...calc }));
  };

  // When variant changes, try to auto-update price from price list
  const updateVariant = async (newVariant) => {
    const updates = { voltVariant: newVariant };
    if (form.vehicleModel) {
      try {
        const r = await api.get(`/api/invoice-helper/price/${encodeURIComponent(form.vehicleModel)}/${encodeURIComponent(newVariant)}`).catch(() => null);
        if (r?.price) Object.assign(updates, calculateGST(r.price));
      } catch (e) {}
    }
    setForm(f => ({ ...f, ...updates }));
  };

  // When model changes, try to lookup price
  const updateModel = async (newModel) => {
    const upper = newModel.toUpperCase();
    const updates = { vehicleModel: upper };
    if (upper && form.voltVariant) {
      try {
        const r = await api.get(`/api/invoice-helper/price/${encodeURIComponent(upper)}/${encodeURIComponent(form.voltVariant)}`).catch(() => null);
        if (r?.price) Object.assign(updates, calculateGST(r.price));
      } catch (e) {}
    }
    setForm(f => ({ ...f, ...updates }));
  };

  const updateDiscount = (d) => {
    const disc = Number(d) || 0;
    setForm(f => ({ ...f, discount: disc, finalPayable: (f.totalAmount || 0) - disc }));
  };

  const save = async (andPreview = false) => {
    if (!form.customerName || !form.mobileNo || !form.invoiceNumber) {
      alert('Invoice number, customer name और mobile ज़रूरी हैं');
      return;
    }
    setSaving(true);
    try {
      // Add line items for backend compatibility
      const payload = {
        ...form,
        items: [{
          description: `${form.vehicleModel} ${form.color || ''} ${form.voltVariant}`.trim(),
          hsn: form.hsnNumber,
          quantity: 1,
          rate: form.taxableAmount,
          amount: form.taxableAmount,
          gstPercent: 5,
          gstAmount: form.cgstAmount + form.sgstAmount
        }],
        subtotal: form.taxableAmount,
        gstAmount: form.cgstAmount + form.sgstAmount
      };

      let saved;
      if (invoice?._id) {
        saved = await api.put(`/api/invoices/${invoice._id}`, payload);
      } else {
        saved = await api.post('/api/invoices', payload);
      }
      if (andPreview) onPreview(saved);
      onClose();
    } catch (err) {
      alert('Save failed: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 p-4 overflow-y-auto" onClick={onClose}>
      <div className="card max-w-3xl mx-auto my-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold mb-4 text-green-400">{invoice ? 'Edit' : 'New'} Tax Invoice</h2>

        {/* Customer lookup */}
        <div className="card bg-blue-900/20 mb-4">
          <label className="text-xs text-slate-400 mb-1 block">🔍 Customer Mobile (autocomplete से सब auto-fill होगा)</label>
          <AutoComplete
            value={form.mobileNo}
            onChange={(v) => setForm(f => ({ ...f, mobileNo: v }))}
            onSelect={(opt) => fillFromCustomer(opt.value)}
            options={customers.map(c => ({ value: c.mobileNo, label: `${c.customerName} (${c.mobileNo})`, meta: `${c.vehicleModel || ''} • ${c.chassisNo || ''}` }))}
            placeholder="Mobile number type करें..."
          />
        </div>

        {/* Invoice info */}
        <Section title="Invoice Info">
          <Field label="Invoice No *" value={form.invoiceNumber} onChange={v => setForm({ ...form, invoiceNumber: v })} />
          <Field label="Date *" type="date" value={form.invoiceDate} onChange={v => setForm({ ...form, invoiceDate: v })} />
        </Section>

        {/* Customer info */}
        <Section title="Customer Details">
          <Field label="Customer Name *" value={form.customerName} onChange={v => setForm({ ...form, customerName: v.toUpperCase() })} />
          <Field label="S/O (Father)" value={form.fatherName} onChange={v => setForm({ ...form, fatherName: v.toUpperCase() })} />
          <Field label="Mobile *" value={form.mobileNo} onChange={v => setForm({ ...form, mobileNo: v })} />
          <Field label="Alt Mobile" value={form.alternateMobile} onChange={v => setForm({ ...form, alternateMobile: v })} />
          <Field label="Address" value={form.customerAddress} onChange={v => setForm({ ...form, customerAddress: v })} className="md:col-span-2" />
          <Field label="District" value={form.district} onChange={v => setForm({ ...form, district: v })} />
          <Field label="State" value={form.state} onChange={v => setForm({ ...form, state: v })} />
          <Field label="State Code" value={form.stateCode} onChange={v => setForm({ ...form, stateCode: v })} />
          <Field label="Pincode" value={form.pincode} onChange={v => setForm({ ...form, pincode: v })} />
          <Field label="DOB" type="date" value={form.dob} onChange={v => setForm({ ...form, dob: v })} />
          <Field label="Financer Name" value={form.financerName} onChange={v => setForm({ ...form, financerName: v })} />
        </Section>

        {/* Vehicle info */}
        <Section title="Vehicle Details">
          <Field label="Model *" value={form.vehicleModel} onChange={updateModel} placeholder="LUCKA, RUBIE..." />
          <Field label="Color" value={form.color} onChange={v => setForm({ ...form, color: v.toUpperCase() })} />
          <Field label="Variant" value={form.variant} onChange={v => setForm({ ...form, variant: v })} />
          <div>
            <label className="text-xs text-slate-400 mb-1 block">VOLT Variant *</label>
            <select value={form.voltVariant} onChange={(e) => updateVariant(e.target.value)}>
              {variants.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <Field label="HSN Number" value={form.hsnNumber} onChange={v => setForm({ ...form, hsnNumber: v })} />
          <Field label="Year" type="number" value={form.manufactureYear} onChange={v => setForm({ ...form, manufactureYear: v })} />
          <Field label="Chassis No *" value={form.chassisNo} onChange={v => setForm({ ...form, chassisNo: v.toUpperCase() })} />
          <Field label="Motor No" value={form.motorNo} onChange={v => setForm({ ...form, motorNo: v.toUpperCase() })} />
          <Field label="Motor No 2 (if any)" value={form.motorNo2} onChange={v => setForm({ ...form, motorNo2: v.toUpperCase() })} />
          <Field label="🔋 Battery No(s)" value={form.batteryNo} onChange={v => setForm({ ...form, batteryNo: v.toUpperCase() })} className="md:col-span-2" placeholder="comma separated multiple" />
          <Field label="Charger No" value={form.chargerNo} onChange={v => setForm({ ...form, chargerNo: v.toUpperCase() })} />
          <Field label="Controller No" value={form.controllerNo} onChange={v => setForm({ ...form, controllerNo: v.toUpperCase() })} />
          <Field label="Key No" value={form.keyNo} onChange={v => setForm({ ...form, keyNo: v })} />
        </Section>

        {/* Pricing */}
        <Section title="Pricing (GST 5% reverse-calc)">
          <div className="md:col-span-2 card bg-yellow-900/20 text-xs">
            💡 बस "Total Amount" डालें — Taxable + CGST + SGST automatically calculate हो जाएंगे
          </div>
          <Field label="Total Amount (with GST) *" type="number" value={form.totalAmount} onChange={updateFromTotal} />
          <Field label="Discount" type="number" value={form.discount} onChange={updateDiscount} />
          <ReadOnly label="Taxable Amount" value={formatINR(form.taxableAmount)} />
          <ReadOnly label="CGST @ 2.5%" value={formatINR(form.cgstAmount)} />
          <ReadOnly label="SGST @ 2.5%" value={formatINR(form.sgstAmount)} />
          <ReadOnly label="Ex-Showroom" value={formatINR(form.exShowroomPrice)} />
          <ReadOnly label="Round Off" value={formatINR(form.roundOff)} />
          <ReadOnly label="GRAND TOTAL" value={formatINR(form.finalPayable)} highlight />
        </Section>

        <Section title="Other">
          <div className="md:col-span-2">
            <label className="text-xs text-slate-400 mb-1 block">Remarks</label>
            <textarea value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} rows="2" placeholder="जैसे: DISCOUNT:- 500" />
          </div>
        </Section>

        <div className="flex gap-2 mt-4 sticky bottom-0 bg-slate-900 py-2">
          <button onClick={onClose} className="btn btn-ghost flex-1">Cancel</button>
          <button onClick={() => save(false)} disabled={saving} className="btn btn-secondary flex-1 flex items-center justify-center gap-1">
            <Save size={14} /> {saving ? 'Saving...' : 'Save'}
          </button>
          <button onClick={() => save(true)} disabled={saving} className="btn btn-primary flex-1 flex items-center justify-center gap-1">
            <Printer size={14} /> Save & Print
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="mb-4">
      <h3 className="text-sm font-semibold text-green-400 mb-2 border-b border-slate-800 pb-1">{title}</h3>
      <div className="grid md:grid-cols-2 gap-3">{children}</div>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', className = '', ...rest }) {
  return (
    <div className={className}>
      <label className="text-xs text-slate-400 mb-1 block">{label}</label>
      <input type={type} value={value || ''} onChange={(e) => onChange(e.target.value)} {...rest} />
    </div>
  );
}

function ReadOnly({ label, value, highlight }) {
  return (
    <div>
      <label className="text-xs text-slate-400 mb-1 block">{label}</label>
      <div className={`px-3 py-2 rounded bg-slate-800/50 ${highlight ? 'text-green-400 font-bold text-lg' : 'text-slate-300'}`}>{value}</div>
    </div>
  );
}

// ============== INVOICE PREVIEW (Print/PDF — matches VP Honda format) ==============
function InvoicePreview({ invoice, onClose }) {
  const printRef = useRef();

  const handlePrint = () => {
    const content = printRef.current.innerHTML;
    const w = window.open('', '_blank', 'width=900,height=1200');
    w.document.write(`
      <html><head><title>${invoice.invoiceNumber}</title>
      <style>
        @page { size: A4; margin: 10mm; }
        body { font-family: Arial, sans-serif; font-size: 11px; color: #000; margin: 0; padding: 0; }
        .invoice-box { padding: 15px; border: 1.5px solid #000; }
        .seller { margin-bottom: 10px; }
        .seller h2 { margin: 0; font-size: 18px; }
        .seller p { margin: 1px 0; }
        h1.title { text-align: center; font-size: 18px; margin: 8px 0; letter-spacing: 1px; }
        table { width: 100%; border-collapse: collapse; }
        table.bordered td, table.bordered th { border: 1px solid #000; padding: 4px 6px; }
        .label-cell { font-weight: bold; width: 110px; }
        .price-row td { padding: 2px 6px; }
        .price-row td:last-child { text-align: right; }
        .grand { background: #f0f0f0; font-weight: bold; font-size: 13px; }
        .terms { font-size: 9px; line-height: 1.4; margin-top: 10px; }
        .sign { display: flex; justify-content: space-between; margin-top: 50px; font-size: 11px; }
        .center-text { text-align: center; margin-top: 5px; font-style: italic; }
      </style></head>
      <body>${content}</body></html>
    `);
    w.document.close();
    setTimeout(() => { w.print(); }, 500);
  };

  const cfg = MD_CONFIG;
  const fullAddress = [invoice.customerAddress, invoice.district, invoice.pincode].filter(Boolean).join(', ');

  return (
    <div className="fixed inset-0 z-50 bg-black/80 p-2 overflow-y-auto" onClick={onClose}>
      <div className="bg-white text-black max-w-4xl mx-auto my-4 rounded-lg" onClick={(e) => e.stopPropagation()}>
        <div className="p-3 flex gap-2 sticky top-0 bg-slate-800 text-white">
          <button onClick={onClose} className="btn btn-ghost text-white">← Back</button>
          <button onClick={handlePrint} className="btn btn-primary flex items-center gap-1"><Printer size={14} /> Print / Save PDF</button>
          <button onClick={() => openWhatsApp(invoice.mobileNo, `${cfg.brandName}\nInvoice: ${invoice.invoiceNumber}\nAmount: ${formatINR(invoice.finalPayable || invoice.totalAmount)}`)} className="btn btn-secondary flex items-center gap-1"><MessageCircle size={14} /> WhatsApp</button>
        </div>

        <div ref={printRef} className="p-6">
          <div className="invoice-box" style={{ border: '1.5px solid #000', padding: '15px' }}>
            {/* Seller Header */}
            <div className="seller">
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>{cfg.brandName.toUpperCase()}</h2>
              <p style={{ margin: '1px 0' }}>{cfg.address}</p>
              <p style={{ margin: '1px 0' }}>{cfg.city}, {cfg.state}, {cfg.pincode}</p>
              <p style={{ margin: '1px 0' }}>{cfg.phone}</p>
              <p style={{ margin: '1px 0' }}>Email :- {cfg.email}</p>
              <p style={{ margin: '1px 0' }}>GSTIN No : {cfg.gstin}</p>
              <p style={{ margin: '8px 0 1px' }}>PAN No: - {(cfg.gstin || '').slice(2, 12)}</p>
            </div>

            <h1 className="title" style={{ textAlign: 'center', fontSize: '18px', margin: '8px 0', letterSpacing: '1px' }}>TAX INVOICE</h1>

            {/* Customer + Invoice info table */}
            <table className="bordered" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                <tr>
                  <td colSpan="2" style={{ border: '1px solid #000', padding: '4px 6px', fontWeight: 'bold' }}>CUSTOMER NAME & ADDRESS</td>
                  <td style={{ border: '1px solid #000', padding: '4px 6px', fontWeight: 'bold' }}>Invoice No :</td>
                  <td style={{ border: '1px solid #000', padding: '4px 6px' }}>{invoice.invoiceNumber}</td>
                </tr>
                <tr>
                  <td style={{ border: '1px solid #000', padding: '4px 6px', fontWeight: 'bold', width: '90px' }}>Sold To :</td>
                  <td style={{ border: '1px solid #000', padding: '4px 6px' }}>{invoice.customerName}{invoice.fatherName && ` S/O ${invoice.fatherName}`}</td>
                  <td style={{ border: '1px solid #000', padding: '4px 6px', fontWeight: 'bold' }}>Invoice Date :</td>
                  <td style={{ border: '1px solid #000', padding: '4px 6px' }}>{formatDate(invoice.invoiceDate)}</td>
                </tr>
                <tr>
                  <td style={{ border: '1px solid #000', padding: '4px 6px', fontWeight: 'bold' }}>Mobile :</td>
                  <td style={{ border: '1px solid #000', padding: '4px 6px' }}>{invoice.mobileNo}{invoice.alternateMobile && `/ ${invoice.alternateMobile}`}</td>
                  <td style={{ border: '1px solid #000', padding: '4px 6px', fontWeight: 'bold' }}>IRN :</td>
                  <td style={{ border: '1px solid #000', padding: '4px 6px' }}></td>
                </tr>
                <tr>
                  <td style={{ border: '1px solid #000', padding: '4px 6px', fontWeight: 'bold' }}>Address :</td>
                  <td colSpan="3" style={{ border: '1px solid #000', padding: '4px 6px' }}>{fullAddress}</td>
                </tr>
                <tr>
                  <td style={{ border: '1px solid #000', padding: '4px 6px', fontWeight: 'bold' }}>Dist :</td>
                  <td style={{ border: '1px solid #000', padding: '4px 6px' }}>{invoice.district} {invoice.pincode}</td>
                  <td style={{ border: '1px solid #000', padding: '4px 6px', fontWeight: 'bold' }}>Bill book No</td>
                  <td style={{ border: '1px solid #000', padding: '4px 6px' }}></td>
                </tr>
                <tr>
                  <td style={{ border: '1px solid #000', padding: '4px 6px', fontWeight: 'bold' }}>State :</td>
                  <td colSpan="3" style={{ border: '1px solid #000', padding: '4px 6px' }}>{invoice.state} (State Code: {invoice.stateCode})</td>
                </tr>
                <tr>
                  <td style={{ border: '1px solid #000', padding: '4px 6px', fontWeight: 'bold' }}>DOB :</td>
                  <td colSpan="3" style={{ border: '1px solid #000', padding: '4px 6px' }}>{formatDate(invoice.dob)}</td>
                </tr>
                <tr>
                  <td style={{ border: '1px solid #000', padding: '4px 6px', fontWeight: 'bold' }}>Financer Name:</td>
                  <td colSpan="3" style={{ border: '1px solid #000', padding: '4px 6px' }}>{invoice.financerName}</td>
                </tr>
              </tbody>
            </table>

            {/* Line items */}
            <table className="bordered" style={{ width: '100%', borderCollapse: 'collapse', marginTop: '6px' }}>
              <thead>
                <tr style={{ background: '#f0f0f0' }}>
                  <th style={{ border: '1px solid #000', padding: '4px' }}>S No</th>
                  <th style={{ border: '1px solid #000', padding: '4px' }}>Model</th>
                  <th style={{ border: '1px solid #000', padding: '4px' }}>Variant</th>
                  <th style={{ border: '1px solid #000', padding: '4px' }}>Color</th>
                  <th style={{ border: '1px solid #000', padding: '4px' }}>HSN</th>
                  <th style={{ border: '1px solid #000', padding: '4px' }}>Chassis No</th>
                  <th style={{ border: '1px solid #000', padding: '4px' }}>Motor No</th>
                  <th style={{ border: '1px solid #000', padding: '4px', textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>1</td>
                  <td style={{ border: '1px solid #000', padding: '4px' }}>{invoice.vehicleModel}</td>
                  <td style={{ border: '1px solid #000', padding: '4px' }}>{invoice.variant}</td>
                  <td style={{ border: '1px solid #000', padding: '4px' }}>{invoice.color}</td>
                  <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>{invoice.hsnNumber}</td>
                  <td style={{ border: '1px solid #000', padding: '4px' }}>{invoice.chassisNo}</td>
                  <td style={{ border: '1px solid #000', padding: '4px' }}>{invoice.motorNo}{invoice.motorNo2 && `, ${invoice.motorNo2}`}</td>
                  <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'right' }}>{formatINR(invoice.taxableAmount)}</td>
                </tr>
              </tbody>
            </table>

            {/* Price breakdown */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '6px' }}>
              <tbody>
                <PriceRow label="Taxable Price" value={formatINR(invoice.taxableAmount)} />
                <PriceRow label="SGST @ 2.5%" value={formatINR(invoice.sgstAmount)} />
                <PriceRow label="CGST @ 2.5%" value={formatINR(invoice.cgstAmount)} />
                <PriceRow label="Ex-Showroom Price" value={formatINR(invoice.exShowroomPrice)} bold />
                <PriceRow label="Invoice Sub Total" value={formatINR(invoice.invoiceSubTotal)} />
                <PriceRow label="(Round Off)" value={formatINR(invoice.roundOff)} />
                <PriceRow label="Invoice Total" value={formatINR(invoice.totalAmount)} bold />
                <PriceRow label="Amount in Words :" value={numberToWords(Math.round(invoice.finalPayable || invoice.totalAmount))} />
                <PriceRow label={`Remarks : ${invoice.remarks || ''}`} value="GRAND TOTAL" rightLabel={formatINR(invoice.finalPayable || invoice.totalAmount)} bold grand />
              </tbody>
            </table>

            {/* Battery / Charger / Controller / Key */}
            <table className="bordered" style={{ width: '100%', borderCollapse: 'collapse', marginTop: '6px' }}>
              <thead>
                <tr style={{ background: '#f0f0f0' }}>
                  <th style={{ border: '1px solid #000', padding: '4px' }}>Charger No. #</th>
                  <th style={{ border: '1px solid #000', padding: '4px' }}>Controller No. #</th>
                  <th style={{ border: '1px solid #000', padding: '4px' }}>Key No.#</th>
                  <th style={{ border: '1px solid #000', padding: '4px' }}>VOLT #</th>
                  <th style={{ border: '1px solid #000', padding: '4px' }}>Year #</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ border: '1px solid #000', padding: '4px' }}>{invoice.chargerNo}</td>
                  <td style={{ border: '1px solid #000', padding: '4px' }}>{invoice.controllerNo}</td>
                  <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>{invoice.keyNo}</td>
                  <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>{invoice.voltVariant}</td>
                  <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>{invoice.manufactureYear}</td>
                </tr>
                <tr>
                  <td style={{ border: '1px solid #000', padding: '4px', fontWeight: 'bold' }}>Battery No. #</td>
                  <td colSpan="4" style={{ border: '1px solid #000', padding: '4px' }}>{invoice.batteryNo}</td>
                </tr>
              </tbody>
            </table>

            {/* Terms */}
            <div className="terms" style={{ fontSize: '9px', lineHeight: '1.4', marginTop: '10px' }}>
              <b>Terms &amp; conditions-</b><br/>
              1. E &amp; O.E.<br/>
              2. Goods once sold will not be returned or exchanged under any circumstances.<br/>
              3. The vehicle/documents has been thoroughly inspected, tested and is free of any kind of defect and is upto my satisfaction.<br/>
              4. I have also read the warranty terms and conditions as explained in the owner's manual &amp; understand that my warranty claims if any, will be considered by the manufacturer only in accordance with the scope and limit of warranty as laid down in the warranty certificate. (Battery, Motor, Controller — 1 year warranty)<br/>
              5. All disputes are subjected to the jurisdiction of courts of law at {cfg.city}.<br/>
              6. I have checked my particulars and are correct to best of my knowledge.<br/>
              7. I have received the vehicle in good condition along with tool and first aid kit and other compulsary accesories.<br/>
              8. Registration and insurance will be done at the owner's risk and liability.<br/>
              9. I have understood all the conditions about Colour, Model and Manufacturing Date.
            </div>

            <div style={{ marginTop: '40px', display: 'flex', justifyContent: 'space-between' }}>
              <div>Customer Signature</div>
              <div style={{ textAlign: 'right' }}>
                <div>For {cfg.brandName.toUpperCase()}</div>
                <div style={{ marginTop: '40px' }}>Authorized Signature</div>
              </div>
            </div>

            <div style={{ textAlign: 'center', marginTop: '10px', fontStyle: 'italic' }}>THANKS. VISIT AGAIN</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PriceRow({ label, value, bold, grand, rightLabel }) {
  const style = {
    padding: '3px 6px',
    fontWeight: bold ? 'bold' : 'normal',
    background: grand ? '#e8e8e8' : 'transparent',
    fontSize: grand ? '13px' : '11px'
  };
  return (
    <tr>
      <td style={{ ...style }}>{label}</td>
      {rightLabel ? (
        <>
          <td style={{ ...style, textAlign: 'right', fontWeight: 'bold' }}>{rightLabel}</td>
          <td style={{ ...style, textAlign: 'right' }}>{value}</td>
        </>
      ) : (
        <td style={{ ...style, textAlign: 'right' }}>{value}</td>
      )}
    </tr>
  );
}
