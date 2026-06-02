import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Printer, Search, RefreshCw, Save, MessageCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import { api, MD_CONFIG } from '../utils/apiConfig';
import { formatDate, toISODate, formatINR, numberToWords, shareInvoiceWhatsApp } from '../utils/smartUtils';

// Business constants (read from MD_CONFIG or fallback to VP Honda values)
const BIZ = {
  name: MD_CONFIG.brandName || 'MD AUTOMOBILE',
  address: MD_CONFIG.address || 'NARSINGHGARH ROAD, NEAR BRIDGE, PARWALIYA SADAK',
  city: `${MD_CONFIG.city || 'BHOPAL'}, ${MD_CONFIG.state || 'MADHYA PRADESH'}, ${MD_CONFIG.pincode || '462030'}`,
  phone: MD_CONFIG.phone || '9713394738',
  email: MD_CONFIG.email || 'admin@mdautomobile.com',
  gstin: MD_CONFIG.gstin || '23BCYPD9538B1ZG',
  pan: (MD_CONFIG.gstin || '23BCYPD9538B1ZG').slice(2, 12),
  hsn: '8703',
  upi: MD_CONFIG.upiId || '43679689022@sbi'
};

const round = (n) => Math.round(Number(n || 0) * 100) / 100;
const round0 = (n) => Math.round(Number(n || 0));

const blankInvoice = () => ({
  invoiceNo: '',
  invoiceDate: toISODate(new Date()),
  customerId: '',
  customerName: '',
  fatherName: '',
  mobile: '',
  altMobile: '',
  address: '',
  district: '',
  state: 'MADHYA PRADESH',
  stateCode: '23',
  pincode: '',
  dob: '',
  financerName: 'CASH',
  billBookNo: '',

  // Vehicle
  sNo: 1,
  model: '',
  variant: '',
  color: '',
  chassisNo: '',
  motorNo: '',
  taxableAmount: 0,

  // Vehicle additional
  chargerNo: '',
  controllerNo: '',
  keyNo: '',
  volt: '72 VOLT',
  year: new Date().getFullYear(),
  batteryNo: '',

  // Money
  discount: 0,
  grandTotal: 0,
  remarks: ''
});

export default function TaxInvoicePage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const editingId = params.get('id');

  const [invoice, setInvoice] = useState(blankInvoice());
  const [savedDbId, setSavedDbId] = useState(editingId || null);
  const [customers, setCustomers] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');
  const [printMode, setPrintMode] = useState(false);

  // ── Load customers on mount ──
  useEffect(() => {
    api.get('/api/customers').then(data => {
      setCustomers(Array.isArray(data) ? data : (data?.customers || []));
    }).catch(err => console.warn('Failed to load customers:', err));
  }, []);

  // ── Load existing invoice if editing ──
  useEffect(() => {
    if (!editingId) return;
    api.get(`/api/invoices/${editingId}`).then(data => {
      const inv = data.invoice || data;
      if (!inv) return;
      setInvoice({
        ...blankInvoice(),
        invoiceNo: inv.invoiceNo || inv.serialNo || '',
        invoiceDate: inv.invoiceDate ? toISODate(inv.invoiceDate) : (inv.saleDate ? toISODate(inv.saleDate) : toISODate(new Date())),
        customerId: inv.customerId || '',
        customerName: inv.customerName || '',
        fatherName: inv.fatherName || '',
        mobile: inv.customerMobile || inv.mobile || '',
        altMobile: inv.altMobile || inv.alternateMobile || '',
        address: inv.customerAddress || inv.address || '',
        district: inv.district || '',
        state: inv.state || 'MADHYA PRADESH',
        pincode: inv.pincode || '',
        dob: inv.dob ? toISODate(inv.dob) : '',
        financerName: inv.paymentMode || inv.financerName || 'CASH',
        billBookNo: inv.billBookNo || '',
        model: inv.vehicleModel || inv.model || '',
        variant: inv.vehicleVariant || inv.variant || '',
        color: inv.vehicleColor || inv.color || '',
        chassisNo: inv.chassisNo || '',
        motorNo: inv.motorNo || '',
        chargerNo: inv.chargerNo || '',
        controllerNo: inv.controllerNo || '',
        keyNo: inv.keyNo || '',
        volt: inv.volt || '72 VOLT',
        year: inv.year || new Date().getFullYear(),
        batteryNo: Array.isArray(inv.batteryNumbers) ? inv.batteryNumbers.join(', ') : (inv.batteryNo || inv.batteryNumbers || ''),
        discount: inv.discount || 0,
        grandTotal: inv.netAmount || inv.grandTotal || inv.price || 0,
        remarks: inv.remarks || ''
      });
      setSavedDbId(inv._id || editingId);
    }).catch(err => console.warn('Failed to load invoice:', err));
  }, [editingId]);

  // ── Computed money fields ──
  const calc = useMemo(() => {
    const grand = Number(invoice.grandTotal) || 0;
    const disc = Number(invoice.discount) || 0;
    const invoiceTotal = grand + disc;
    const taxable = invoiceTotal / 1.05;
    const sgst = taxable * 0.025;
    const cgst = taxable * 0.025;
    const exShowroom = taxable + sgst + cgst;
    const roundOff = invoiceTotal - exShowroom;
    return {
      taxable: round(taxable),
      sgst: round(sgst),
      cgst: round(cgst),
      exShowroom: round(exShowroom),
      subTotal: round(exShowroom),
      roundOff: round(roundOff),
      invoiceTotal: round0(invoiceTotal),
      discount: round0(disc),
      grandTotal: round0(grand),
      amountInWords: numberToWords(round0(invoiceTotal)) + ' Only'
    };
  }, [invoice.grandTotal, invoice.discount]);

  // ── Filtered customers ──
  const filtered = useMemo(() => {
    if (!searchQ.trim()) return customers.slice(0, 20);
    const q = searchQ.toLowerCase();
    return customers.filter(c =>
      String(c.customerName || c.name || '').toLowerCase().includes(q) ||
      String(c.mobile || c.mobileNo || '').includes(q) ||
      String(c.aadhar || '').includes(q)
    ).slice(0, 20);
  }, [customers, searchQ]);

  // ── Select customer → autofill ──
  const selectCustomer = async (c) => {
    setShowSearch(false);
    setSearchQ('');
    setLoading(true);

    // Set customer fields immediately
    const dob = c.dob ? toISODate(c.dob) : '';
    setInvoice(prev => ({
      ...prev,
      customerId: c._id,
      customerName: c.customerName || c.name || '',
      fatherName: c.fatherName || '',
      mobile: c.mobile || c.mobileNo || '',
      altMobile: c.alternateMobile || '',
      address: c.address || '',
      district: c.district || c.city || '',
      pincode: c.pincode || '',
      dob
    }));

    try {
      // Fetch invoices for this customer (latest sale)
      let sales = [];
      try {
        const data = await api.get(`/api/invoices?customerId=${c._id}`);
        sales = Array.isArray(data) ? data : (data?.invoices || []);
      } catch {
        // Fallback: fetch all and filter
        try {
          const allData = await api.get('/api/invoices');
          const all = Array.isArray(allData) ? allData : (allData?.invoices || []);
          sales = all.filter(s => String(s.customerId) === String(c._id));
        } catch {}
      }

      const sale = sales[0];
      if (sale) {
        const grand = sale.netAmount || sale.price || 0;
        const disc = (sale.price || 0) - grand > 0 ? (sale.price - grand) : 0;

        setInvoice(prev => ({
          ...prev,
          invoiceNo: sale.invoiceNo || sale.serialNo || '',
          invoiceDate: sale.saleDate ? toISODate(sale.saleDate) : prev.invoiceDate,
          financerName: sale.paymentMode || 'CASH',
          model: sale.vehicleModel || '',
          variant: sale.vehicleVariant || '',
          color: sale.vehicleColor || '',
          chassisNo: sale.chassisNo || '',
          motorNo: sale.motorNo || '',
          grandTotal: grand,
          discount: disc
        }));

        // Try fetch vehicle for battery/charger info
        if (sale.chassisNo) {
          try {
            const vDataRaw = await api.get(`/api/vehicles?chassisNo=${encodeURIComponent(sale.chassisNo)}`);
            const vList = Array.isArray(vDataRaw) ? vDataRaw : (vDataRaw?.vehicles || []);
            const v = vList.find(x => x.chassisNo === sale.chassisNo) || vList[0];
            if (v) {
              setInvoice(prev => ({
                ...prev,
                chargerNo: v.chargerNo || prev.chargerNo,
                controllerNo: v.controllerNo || prev.controllerNo,
                keyNo: v.keyNo || prev.keyNo || '0',
                volt: v.variant || prev.volt,
                year: v.manufactureDate ? new Date(v.manufactureDate).getFullYear() : prev.year,
                batteryNo: Array.isArray(v.batteryNumbers) ? v.batteryNumbers.join(', ') : (v.batteryNumbers || prev.batteryNo)
              }));
            }
          } catch {}
        }
      }
    } catch (err) {
      console.error('Autofill error:', err);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => { setInvoice(blankInvoice()); setSavedDbId(null); setSavedMsg(''); };
  const setF = (field, val) => setInvoice(prev => ({ ...prev, [field]: val }));

  const blankInvoice_ignore = null; // marker

  // Auto-generate invoice number (MDA/YY-YY NNN format)
  const generateInvoiceNo = () => {
    const now = new Date();
    const y = now.getFullYear();
    const fy = now.getMonth() < 3
      ? `${(y - 1).toString().slice(-2)}-${y.toString().slice(-2)}`
      : `${y.toString().slice(-2)}-${(y + 1).toString().slice(-2)}`;
    return `MDA/${fy} ${String(Date.now()).slice(-3)}`;
  };

  // ── Build payload for backend ──
  const buildPayload = () => {
    // Auto-generate invoice number if blank
    const invNo = invoice.invoiceNo || generateInvoiceNo();
    return {
      // SEND BOTH names for compatibility with backend schema
      invoiceNumber: invNo,  // ← required by backend Invoice model
      invoiceNo: invNo,
      serialNo: invNo,
      invoiceDate: invoice.invoiceDate,
      saleDate: invoice.invoiceDate,
      customerId: invoice.customerId || null,
      customerName: invoice.customerName,
      customerMobile: invoice.mobile,
      customerAddress: invoice.address,
      fatherName: invoice.fatherName,
      mobile: invoice.mobile,
      altMobile: invoice.altMobile,
      address: invoice.address,
      district: invoice.district,
      state: invoice.state,
      pincode: invoice.pincode,
      dob: invoice.dob || null,
      paymentMode: invoice.financerName,
      financerName: invoice.financerName,
      billBookNo: invoice.billBookNo,
      vehicleModel: invoice.model,
      vehicleVariant: invoice.variant,
      vehicleColor: invoice.color,
      model: invoice.model,
      variant: invoice.variant,
      color: invoice.color,
      chassisNo: invoice.chassisNo,
      motorNo: invoice.motorNo,
      chargerNo: invoice.chargerNo,
      controllerNo: invoice.controllerNo,
      keyNo: invoice.keyNo,
      volt: invoice.volt,
      year: invoice.year,
      batteryNumbers: invoice.batteryNo ? invoice.batteryNo.split(',').map(s => s.trim()) : [],
      batteryNo: invoice.batteryNo,
      taxableAmount: calc.taxable,
      sgst: calc.sgst,
      cgst: calc.cgst,
      exShowroom: calc.exShowroom,
      invoiceSubTotal: calc.subTotal,
      roundOff: calc.roundOff,
      invoiceTotal: calc.invoiceTotal,
      discount: calc.discount,
      grandTotal: calc.grandTotal,
      netAmount: calc.grandTotal,
      price: calc.invoiceTotal,
      amountInWords: calc.amountInWords,
      remarks: invoice.remarks,
      status: 'paid',
      source: 'tax-invoice-page'
    };
  };

  // ── Save invoice to backend ──
  const handleSave = async () => {
    if (!invoice.customerName) { alert('❌ Customer Name ज़रूरी है'); return null; }
    if (!invoice.grandTotal) { alert('❌ Grand Total ज़रूरी है'); return null; }

    setSaving(true);
    setSavedMsg('');
    try {
      const payload = buildPayload();
      // If auto-generated, fill it in the UI too
      if (!invoice.invoiceNo && payload.invoiceNumber) {
        setF('invoiceNo', payload.invoiceNumber);
      }
      let result;
      if (savedDbId) {
        // Update existing
        result = await api.put(`/api/invoices/${savedDbId}`, payload);
      } else {
        // Create new
        result = await api.post('/api/invoices', payload);
        const newId = result?._id || result?.invoice?._id || result?.id;
        if (newId) setSavedDbId(newId);
      }
      setSavedMsg('✅ Invoice saved successfully!');
      setTimeout(() => setSavedMsg(''), 3000);
      return result;
    } catch (err) {
      console.error('Save error:', err);
      alert('❌ Save failed: ' + err.message);
      return null;
    } finally {
      setSaving(false);
    }
  };

  // ── Share via WhatsApp ──
  const handleShareWhatsApp = async () => {
    if (!invoice.mobile) { alert('❌ Customer का mobile नंबर नहीं है'); return; }
    // Save first if not saved
    if (!savedDbId) {
      const saved = await handleSave();
      if (!saved) return;
    }
    // Build invoice object for WhatsApp message
    shareInvoiceWhatsApp({
      customerName: invoice.customerName,
      customerPhone: invoice.mobile,
      mobile: invoice.mobile,
      invoiceNumber: invoice.invoiceNo,
      invoiceNo: invoice.invoiceNo,
      invoiceDate: invoice.invoiceDate,
      saleDate: invoice.invoiceDate,
      vehicleModel: invoice.model,
      color: invoice.color,
      chassisNo: invoice.chassisNo,
      price: calc.grandTotal,
      netAmount: calc.grandTotal
    });
  };

  // ── Print (auto-saves first) ──
  const handlePrint = async () => {
    if (!savedDbId && invoice.customerName && invoice.grandTotal) {
      // Auto-save before printing
      await handleSave();
    }
    setPrintMode(true);
    setTimeout(() => { window.print(); setTimeout(() => setPrintMode(false), 500); }, 100);
  };

  // ────────── STYLES ──────────
  const S = {
    wrap: { padding: 12, paddingBottom: 120, background: '#020617', minHeight: '100vh', color: 'white' },
    toolbar: { display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', position: 'sticky', top: 0, background: '#020617', zIndex: 10, paddingTop: 4, paddingBottom: 8 },
    btn: { background: '#16a34a', color: 'white', border: 'none', padding: '10px 16px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 },
    btnGhost: { background: '#1e293b', color: 'white', border: 'none', padding: '10px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 },
    section: { background: '#0f172a', borderRadius: 12, padding: 12, marginBottom: 10 },
    input: { width: '100%', background: '#020617', border: '1px solid #1e293b', borderRadius: 6, padding: '8px 10px', color: 'white', fontSize: 13, boxSizing: 'border-box' },
    label: { color: '#94a3b8', fontSize: 11, display: 'block', marginBottom: 4 },
    grid2: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 },
    grid3: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }
  };

  // ────────── PRINT-ONLY VIEW (matches VP Honda PDF format) ──────────
  const PrintInvoice = () => (
    <div className="print-area" style={{ background: 'white', color: 'black', padding: 20, fontFamily: 'Arial, sans-serif', fontSize: 11, lineHeight: 1.4 }}>
      {/* Header */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontWeight: 'bold', fontSize: 14 }}>{BIZ.name}</div>
        <div>{BIZ.address}</div>
        <div>{BIZ.city}</div>
        <div>{BIZ.phone}</div>
        <div>Email :- {BIZ.email}</div>
        <div>GSTIN No : {BIZ.gstin}</div>
        <div style={{ marginTop: 8 }}>PAN No: - {BIZ.pan}</div>
      </div>

      {/* Title */}
      <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: 16, margin: '8px 0' }}>TAX INVOICE</div>

      {/* Customer block */}
      <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid black', fontSize: 11 }}>
        <tbody>
          <tr><td colSpan={4} style={{ border: '1px solid black', padding: 4, fontWeight: 'bold' }}>CUSTOMER NAME & ADDRESS</td>
            <td style={{ border: '1px solid black', padding: 4 }}><b>Invoice No</b></td>
            <td style={{ border: '1px solid black', padding: 4 }}>:</td>
            <td style={{ border: '1px solid black', padding: 4 }}>{invoice.invoiceNo || '—'}</td>
          </tr>
          <tr>
            <td style={{ border: '1px solid black', padding: 4, width: '12%' }}><b>Sold To</b></td>
            <td style={{ border: '1px solid black', padding: 4, width: '3%' }}>:</td>
            <td style={{ border: '1px solid black', padding: 4, width: '25%' }}>{invoice.customerName}</td>
            <td style={{ border: '1px solid black', padding: 4, width: '12%' }}>S/O</td>
            <td style={{ border: '1px solid black', padding: 4 }}>{invoice.fatherName}</td>
            <td style={{ border: '1px solid black', padding: 4 }}><b>Invoice Date</b></td>
            <td style={{ border: '1px solid black', padding: 4 }}>:</td>
            <td style={{ border: '1px solid black', padding: 4 }}>{formatDate(invoice.invoiceDate)}</td>
          </tr>
          <tr>
            <td style={{ border: '1px solid black', padding: 4 }}><b>Mobile</b></td>
            <td style={{ border: '1px solid black', padding: 4 }}>:</td>
            <td colSpan={3} style={{ border: '1px solid black', padding: 4 }}>{invoice.mobile}{invoice.altMobile ? ` / ${invoice.altMobile}` : ''}</td>
            <td style={{ border: '1px solid black', padding: 4 }}><b>IRN</b></td>
            <td style={{ border: '1px solid black', padding: 4 }}>:</td>
            <td style={{ border: '1px solid black', padding: 4 }}></td>
          </tr>
          <tr>
            <td style={{ border: '1px solid black', padding: 4 }}><b>Address</b></td>
            <td style={{ border: '1px solid black', padding: 4 }}>:</td>
            <td colSpan={6} style={{ border: '1px solid black', padding: 4 }}>{invoice.address}</td>
          </tr>
          <tr>
            <td style={{ border: '1px solid black', padding: 4 }}><b>Dist</b></td>
            <td style={{ border: '1px solid black', padding: 4 }}>:</td>
            <td style={{ border: '1px solid black', padding: 4 }}>{invoice.district}</td>
            <td style={{ border: '1px solid black', padding: 4 }}></td>
            <td style={{ border: '1px solid black', padding: 4 }}>{invoice.pincode}</td>
            <td colSpan={3} style={{ border: '1px solid black', padding: 4 }}></td>
          </tr>
          <tr>
            <td style={{ border: '1px solid black', padding: 4 }}><b>State</b></td>
            <td style={{ border: '1px solid black', padding: 4 }}>:</td>
            <td colSpan={3} style={{ border: '1px solid black', padding: 4 }}>{invoice.state} (State Code: {invoice.stateCode})</td>
            <td style={{ border: '1px solid black', padding: 4 }}><b>Bill book No</b></td>
            <td style={{ border: '1px solid black', padding: 4 }}>:</td>
            <td style={{ border: '1px solid black', padding: 4 }}>{invoice.billBookNo}</td>
          </tr>
          <tr>
            <td style={{ border: '1px solid black', padding: 4 }}><b>DOB</b></td>
            <td style={{ border: '1px solid black', padding: 4 }}>:</td>
            <td colSpan={6} style={{ border: '1px solid black', padding: 4 }}>{invoice.dob ? formatDate(invoice.dob) : ''}</td>
          </tr>
          <tr>
            <td style={{ border: '1px solid black', padding: 4 }}><b>Financer Name:</b></td>
            <td colSpan={7} style={{ border: '1px solid black', padding: 4 }}>{invoice.financerName}</td>
          </tr>
        </tbody>
      </table>

      {/* Vehicle table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid black', marginTop: 6, fontSize: 11 }}>
        <thead>
          <tr style={{ background: '#f0f0f0' }}>
            <th style={{ border: '1px solid black', padding: 4 }}>S No</th>
            <th style={{ border: '1px solid black', padding: 4 }}>Model</th>
            <th style={{ border: '1px solid black', padding: 4 }}>Variant</th>
            <th style={{ border: '1px solid black', padding: 4 }}>Color</th>
            <th style={{ border: '1px solid black', padding: 4 }}>HSN Number</th>
            <th style={{ border: '1px solid black', padding: 4 }}>Chassis No</th>
            <th style={{ border: '1px solid black', padding: 4 }}>Motor No</th>
            <th style={{ border: '1px solid black', padding: 4 }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ border: '1px solid black', padding: 4, textAlign: 'center' }}>{invoice.sNo}</td>
            <td style={{ border: '1px solid black', padding: 4 }}>{invoice.model}</td>
            <td style={{ border: '1px solid black', padding: 4 }}>{invoice.variant}</td>
            <td style={{ border: '1px solid black', padding: 4, textAlign: 'center' }}>{invoice.color}</td>
            <td style={{ border: '1px solid black', padding: 4, textAlign: 'center' }}>{BIZ.hsn}</td>
            <td style={{ border: '1px solid black', padding: 4 }}>{invoice.chassisNo}</td>
            <td style={{ border: '1px solid black', padding: 4 }}>{invoice.motorNo}</td>
            <td style={{ border: '1px solid black', padding: 4, textAlign: 'right' }}>{formatINR(calc.taxable)}</td>
          </tr>
        </tbody>
      </table>

      {/* Tax breakdown */}
      <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid black', marginTop: 6, fontSize: 11 }}>
        <tbody>
          <tr><td style={{ border: '1px solid black', padding: 4 }}><b>Taxable Price</b></td><td style={{ border: '1px solid black', padding: 4, textAlign: 'right', width: 120 }}>{formatINR(calc.taxable)}</td></tr>
          <tr><td style={{ border: '1px solid black', padding: 4 }}>SGST @ 2.5%</td><td style={{ border: '1px solid black', padding: 4, textAlign: 'right' }}>{formatINR(calc.sgst)}</td></tr>
          <tr><td style={{ border: '1px solid black', padding: 4 }}>CGST @ 2.5%</td><td style={{ border: '1px solid black', padding: 4, textAlign: 'right' }}>{formatINR(calc.cgst)}</td></tr>
          <tr><td style={{ border: '1px solid black', padding: 4 }}><b>Ex-Showroom Price</b></td><td style={{ border: '1px solid black', padding: 4, textAlign: 'right' }}>{formatINR(calc.exShowroom)}</td></tr>
          <tr><td style={{ border: '1px solid black', padding: 4 }}><b>Invoice Sub Total</b></td><td style={{ border: '1px solid black', padding: 4, textAlign: 'right' }}>{formatINR(calc.subTotal)}</td></tr>
          <tr><td style={{ border: '1px solid black', padding: 4 }}>(Round Off)</td><td style={{ border: '1px solid black', padding: 4, textAlign: 'right' }}>{formatINR(calc.roundOff)}</td></tr>
          <tr><td style={{ border: '1px solid black', padding: 4 }}><b>Invoice Total</b></td><td style={{ border: '1px solid black', padding: 4, textAlign: 'right' }}>{formatINR(calc.invoiceTotal)}</td></tr>
          <tr><td style={{ border: '1px solid black', padding: 4 }}><b>Amount in Words</b> : {calc.amountInWords}</td><td style={{ border: '1px solid black', padding: 4 }}></td></tr>
          <tr><td style={{ border: '1px solid black', padding: 4 }}><b>Remarks</b> : {invoice.remarks || (invoice.discount > 0 ? `DISCOUNT:- ${invoice.discount}` : '')} <span style={{ float: 'right', fontWeight: 'bold' }}>GRAND TOTAL</span></td><td style={{ border: '1px solid black', padding: 4, textAlign: 'right', fontWeight: 'bold' }}>{formatINR(calc.grandTotal)}</td></tr>
        </tbody>
      </table>

      {/* Vehicle extras */}
      <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid black', marginTop: 6, fontSize: 11 }}>
        <tbody>
          <tr>
            <th style={{ border: '1px solid black', padding: 4 }}>Charger No. #</th>
            <th style={{ border: '1px solid black', padding: 4 }}>Controller No. #</th>
            <th style={{ border: '1px solid black', padding: 4 }}>Key No.#</th>
            <th style={{ border: '1px solid black', padding: 4 }}>VOLT #</th>
            <th style={{ border: '1px solid black', padding: 4 }}>Year #</th>
          </tr>
          <tr>
            <td style={{ border: '1px solid black', padding: 4 }}>{invoice.chargerNo}</td>
            <td style={{ border: '1px solid black', padding: 4 }}>{invoice.controllerNo}</td>
            <td style={{ border: '1px solid black', padding: 4 }}>{invoice.keyNo}</td>
            <td style={{ border: '1px solid black', padding: 4 }}>{invoice.volt}</td>
            <td style={{ border: '1px solid black', padding: 4 }}>{invoice.year}</td>
          </tr>
          <tr>
            <td style={{ border: '1px solid black', padding: 4 }}><b>Battery No. #</b></td>
            <td colSpan={4} style={{ border: '1px solid black', padding: 4 }}>{invoice.batteryNo}</td>
          </tr>
        </tbody>
      </table>

      {/* Terms */}
      <div style={{ marginTop: 10, fontSize: 10 }}>
        <b>Terms & conditions-</b>
        <div>1. E & O.E.</div>
        <div>2. Goods once sold will not be returned or exchanged under any circumstances.</div>
        <div>3. The vehicle/documents has been thoroughly inspected, tested and is free of any kind of defect and is upto my satisfaction.</div>
        <div>4. I have also read the warranty terms and conditions as explained in the owner's manual & understand that my warranty claims if any, will be considered by the manufacturer only in accordance with the scope and limit of warranty as laid down in the warranty certificate.</div>
        <div>5. All disputes are subjected to the jurisdiction of courts of law at CITY.</div>
        <div>6. I have checked my particulars and are correct to best of my knowledge.</div>
        <div>7. I have received the vehicle in good condition along with tool and first aid kit and other compulsory accessories</div>
        <div>8. Registration and insurance will be done at the owner's risk and liability.</div>
        <div>9. I have understood all the conditions about Colour, Model and Manufacturing Date.</div>
      </div>

      {/* Signatures */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 30, fontSize: 11 }}>
        <div>
          <div style={{ marginTop: 30, borderTop: '1px solid black', paddingTop: 4 }}>Customer Signature</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div>For <b>{BIZ.name}</b></div>
          <div style={{ marginTop: 30, borderTop: '1px solid black', paddingTop: 4 }}>Authorized Signature</div>
        </div>
      </div>

      <div style={{ textAlign: 'center', marginTop: 12, fontWeight: 'bold' }}>THANKS. VISIT AGAIN</div>
    </div>
  );

  // ────────── RENDER ──────────
  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
          .print-area { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>

      {printMode && <PrintInvoice />}

      {!printMode && (
        <div style={S.wrap}>
          {/* Toolbar */}
          <div style={S.toolbar}>
            <button style={S.btnGhost} onClick={() => navigate('/invoices')}>
              <ArrowLeft size={16} /> Back
            </button>
            <button style={S.btn} onClick={() => setShowSearch(true)}>
              <Search size={16} /> Customer Select
            </button>
            <button style={S.btnGhost} onClick={reset}>
              <RefreshCw size={16} /> Reset
            </button>
            <button style={{ ...S.btn, background: '#7c3aed' }} onClick={handleSave} disabled={saving}>
              <Save size={16} /> {saving ? 'Saving...' : (savedDbId ? 'Update' : 'Save')}
            </button>
            <button style={{ ...S.btn, background: '#25D366' }} onClick={handleShareWhatsApp}>
              <MessageCircle size={16} /> WhatsApp
            </button>
            <button style={{ ...S.btn, background: '#2563eb' }} onClick={handlePrint}>
              <Printer size={16} /> Print
            </button>
          </div>

          {savedMsg && (
            <div style={{ background: '#14532d', border: '1px solid #16a34a', borderRadius: 8, padding: 10, marginBottom: 10, color: '#86efac', display: 'flex', alignItems: 'center', gap: 8 }}>
              <CheckCircle size={16} /> {savedMsg}
            </div>
          )}

          {/* Customer search modal */}
          {showSearch && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 16, paddingTop: 60 }} onClick={() => setShowSearch(false)}>
              <div style={{ background: '#0f172a', borderRadius: 12, padding: 16, width: '100%', maxWidth: 500, maxHeight: '70vh', overflow: 'auto' }} onClick={(e) => e.stopPropagation()}>
                <h3 style={{ color: '#16a34a', marginTop: 0 }}>Customer ढूंढें</h3>
                <input
                  style={S.input}
                  placeholder="Name, mobile, या aadhar से search करें"
                  value={searchQ}
                  onChange={(e) => setSearchQ(e.target.value)}
                  autoFocus
                />
                <div style={{ marginTop: 12 }}>
                  {filtered.length === 0 ? (
                    <p style={{ color: '#94a3b8' }}>कोई customer नहीं मिला</p>
                  ) : filtered.map(c => (
                    <div key={c._id} onClick={() => selectCustomer(c)} style={{ padding: 10, background: '#020617', borderRadius: 8, marginBottom: 6, cursor: 'pointer', border: '1px solid #1e293b' }}>
                      <div style={{ fontWeight: 'bold' }}>{c.customerName || c.name}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>
                        📞 {c.mobile || c.mobileNo || '—'} {c.aadhar ? `· 🆔 ${c.aadhar}` : ''}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {loading && <div style={{ color: '#16a34a', marginBottom: 8 }}>⏳ Loading customer data...</div>}

          {/* Editable form sections */}
          <div style={S.section}>
            <h3 style={{ color: '#16a34a', margin: '0 0 8px', fontSize: 14 }}>📄 Invoice Details</h3>
            <div style={S.grid3}>
              <div><label style={S.label}>Invoice No</label><input style={S.input} value={invoice.invoiceNo} onChange={(e) => setF('invoiceNo', e.target.value)} /></div>
              <div><label style={S.label}>Invoice Date</label><input type="date" style={S.input} value={invoice.invoiceDate} onChange={(e) => setF('invoiceDate', e.target.value)} /></div>
              <div><label style={S.label}>Bill Book No</label><input style={S.input} value={invoice.billBookNo} onChange={(e) => setF('billBookNo', e.target.value)} /></div>
            </div>
          </div>

          <div style={S.section}>
            <h3 style={{ color: '#16a34a', margin: '0 0 8px', fontSize: 14 }}>👤 Customer</h3>
            <div style={S.grid2}>
              <div><label style={S.label}>Sold To</label><input style={S.input} value={invoice.customerName} onChange={(e) => setF('customerName', e.target.value)} /></div>
              <div><label style={S.label}>Father (S/O)</label><input style={S.input} value={invoice.fatherName} onChange={(e) => setF('fatherName', e.target.value)} /></div>
              <div><label style={S.label}>Mobile</label><input style={S.input} value={invoice.mobile} onChange={(e) => setF('mobile', e.target.value)} /></div>
              <div><label style={S.label}>Alt Mobile</label><input style={S.input} value={invoice.altMobile} onChange={(e) => setF('altMobile', e.target.value)} /></div>
              <div style={{ gridColumn: 'span 2' }}><label style={S.label}>Address</label><input style={S.input} value={invoice.address} onChange={(e) => setF('address', e.target.value)} /></div>
              <div><label style={S.label}>District</label><input style={S.input} value={invoice.district} onChange={(e) => setF('district', e.target.value)} /></div>
              <div><label style={S.label}>Pincode</label><input style={S.input} value={invoice.pincode} onChange={(e) => setF('pincode', e.target.value)} /></div>
              <div><label style={S.label}>DOB</label><input type="date" style={S.input} value={invoice.dob} onChange={(e) => setF('dob', e.target.value)} /></div>
              <div><label style={S.label}>Financer Name</label><input style={S.input} value={invoice.financerName} onChange={(e) => setF('financerName', e.target.value)} /></div>
            </div>
          </div>

          <div style={S.section}>
            <h3 style={{ color: '#16a34a', margin: '0 0 8px', fontSize: 14 }}>🛵 Vehicle</h3>
            <div style={S.grid3}>
              <div><label style={S.label}>Model</label><input style={S.input} value={invoice.model} onChange={(e) => setF('model', e.target.value)} /></div>
              <div><label style={S.label}>Variant</label><input style={S.input} value={invoice.variant} onChange={(e) => setF('variant', e.target.value)} /></div>
              <div><label style={S.label}>Color</label><input style={S.input} value={invoice.color} onChange={(e) => setF('color', e.target.value)} /></div>
              <div><label style={S.label}>Chassis No</label><input style={S.input} value={invoice.chassisNo} onChange={(e) => setF('chassisNo', e.target.value)} /></div>
              <div><label style={S.label}>Motor No</label><input style={S.input} value={invoice.motorNo} onChange={(e) => setF('motorNo', e.target.value)} /></div>
              <div><label style={S.label}>Charger No</label><input style={S.input} value={invoice.chargerNo} onChange={(e) => setF('chargerNo', e.target.value)} /></div>
              <div><label style={S.label}>Controller No</label><input style={S.input} value={invoice.controllerNo} onChange={(e) => setF('controllerNo', e.target.value)} /></div>
              <div><label style={S.label}>Key No</label><input style={S.input} value={invoice.keyNo} onChange={(e) => setF('keyNo', e.target.value)} /></div>
              <div><label style={S.label}>Volt</label><input style={S.input} value={invoice.volt} onChange={(e) => setF('volt', e.target.value)} /></div>
              <div><label style={S.label}>Year</label><input style={S.input} value={invoice.year} onChange={(e) => setF('year', e.target.value)} /></div>
              <div style={{ gridColumn: 'span 3' }}><label style={S.label}>Battery No (comma-separated)</label><input style={S.input} value={invoice.batteryNo} onChange={(e) => setF('batteryNo', e.target.value)} /></div>
            </div>
          </div>

          <div style={S.section}>
            <h3 style={{ color: '#16a34a', margin: '0 0 8px', fontSize: 14 }}>💰 Pricing</h3>
            <div style={S.grid2}>
              <div><label style={S.label}>Grand Total (₹)</label><input type="number" style={S.input} value={invoice.grandTotal} onChange={(e) => setF('grandTotal', e.target.value)} /></div>
              <div><label style={S.label}>Discount (₹)</label><input type="number" style={S.input} value={invoice.discount} onChange={(e) => setF('discount', e.target.value)} /></div>
              <div style={{ gridColumn: 'span 2' }}><label style={S.label}>Remarks</label><input style={S.input} value={invoice.remarks} onChange={(e) => setF('remarks', e.target.value)} /></div>
            </div>

            {/* Live calc preview */}
            <div style={{ marginTop: 12, background: '#020617', borderRadius: 8, padding: 10, fontSize: 12 }}>
              <div style={{ color: '#94a3b8', marginBottom: 6 }}>📊 Auto-calculated (5% GST reverse):</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                <div>Taxable: <b>{formatINR(calc.taxable)}</b></div>
                <div>SGST 2.5%: <b>{formatINR(calc.sgst)}</b></div>
                <div>CGST 2.5%: <b>{formatINR(calc.cgst)}</b></div>
                <div>Ex-Showroom: <b>{formatINR(calc.exShowroom)}</b></div>
                <div>Round Off: <b>{formatINR(calc.roundOff)}</b></div>
                <div>Invoice Total: <b>{formatINR(calc.invoiceTotal)}</b></div>
                <div style={{ gridColumn: 'span 2', color: '#16a34a', fontSize: 14 }}>
                  Grand Total: <b>{formatINR(calc.grandTotal)}</b>
                </div>
                <div style={{ gridColumn: 'span 2', color: '#94a3b8', fontSize: 11 }}>
                  In words: {calc.amountInWords}
                </div>
              </div>
            </div>
          </div>

          <button style={{ ...S.btn, width: '100%', background: '#2563eb', justifyContent: 'center', padding: 14, fontSize: 15 }} onClick={handlePrint}>
            <Printer size={18} /> Print Invoice (PDF)
          </button>
        </div>
      )}
    </>
  );
}
