import React, { useState, useEffect } from 'react';
import { Plus, Search, FileText, Download, MessageCircle, Eye, Trash2 } from 'lucide-react';
import AdminPasswordModal from '../components/AdminPasswordModal';
import { api, MD_CONFIG } from '../utils/apiConfig';
import { formatDate, formatINR, shareInvoiceWhatsApp, toISODate } from '../utils/smartUtils';

export default function InvoiceManagement() {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const doDelete = async () => {
    await api.delete(`/api/invoices/${confirmDelete._id}`);
    setConfirmDelete(null);
    load();
  };

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.get('/api/invoices');
      setItems(data);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = items.filter(inv => {
    if (!search) return true;
    const q = search.toLowerCase();
    return [inv.invoiceNumber, inv.customerName, inv.mobileNo, inv.chassisNo]
      .some(f => String(f || '').toLowerCase().includes(q));
  });

  const handleDelete = (inv) => setConfirmDelete(inv);

  // Simple print-based PDF generation
  const handlePrint = (inv) => {
    const w = window.open('', '_blank');
    w.document.write(`
      <html><head><title>${inv.invoiceNumber}</title>
      <style>
        body { font-family: Arial; padding: 20px; }
        h1 { color: #16a34a; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
        .total { font-weight: bold; font-size: 18px; color: #16a34a; }
      </style></head>
      <body>
        <h1>⚡ ${MD_CONFIG.brandName}</h1>
        <div>${MD_CONFIG.address} • GSTIN: ${MD_CONFIG.gstin}</div>
        <hr/>
        <h2>Invoice: ${inv.invoiceNumber}</h2>
        <p><strong>Date:</strong> ${formatDate(inv.invoiceDate)}</p>
        <p><strong>Customer:</strong> ${inv.customerName}<br/>
        Mobile: ${inv.mobileNo}<br/>
        Address: ${inv.customerAddress || '-'}</p>
        <table>
          <tr><th>Description</th><th>Qty</th><th>Rate</th><th>Amount</th></tr>
          ${(inv.items || []).map(i => `<tr><td>${i.description}</td><td>${i.quantity}</td><td>₹${i.rate}</td><td>₹${i.amount}</td></tr>`).join('')}
        </table>
        <table style="margin-top:10px">
          <tr><td>Subtotal</td><td>₹${inv.subtotal || 0}</td></tr>
          <tr><td>GST (5%)</td><td>₹${inv.gstAmount || 0}</td></tr>
          <tr><td>Total Amount</td><td>₹${inv.totalAmount || 0}</td></tr>
          <tr><td>FAME-II Subsidy</td><td>-₹${inv.fameSubsidy || 0}</td></tr>
          <tr><td>State Subsidy</td><td>-₹${inv.stateSubsidy || 0}</td></tr>
          <tr class="total"><td>Final Payable</td><td>₹${inv.finalPayable || 0}</td></tr>
        </table>
        <p style="margin-top:30px">UPI: ${MD_CONFIG.upiId}</p>
        <p>Thank you for choosing MD Automobile! 🌱⚡</p>
      </body></html>
    `);
    w.document.close();
    setTimeout(() => w.print(), 500);
  };

  return (
    <div className="p-4 max-w-7xl mx-auto fade-in">
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <h1 className="text-2xl font-bold text-green-400">Invoices ({filtered.length})</h1>
        <button onClick={() => setShowForm(true)} className="btn btn-primary flex items-center gap-1">
          <Plus size={16} /> New Invoice
        </button>
      </div>

      <div className="card mb-4">
        <div className="flex items-center gap-2">
          <Search size={18} className="text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search invoices..." />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 text-slate-400">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-8 text-slate-500">No invoices yet</div>
      ) : (
        <div className="space-y-2">
          {filtered.map(inv => (
            <div key={inv._id} className="card card-hover">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <FileText size={14} className="text-green-400" />
                    <span className="font-semibold">{inv.invoiceNumber}</span>
                    <span className={`text-xs px-2 py-0.5 rounded ${inv.paymentStatus === 'paid' ? 'bg-green-900 text-green-300' : 'bg-yellow-900 text-yellow-300'}`}>
                      {inv.paymentStatus}
                    </span>
                  </div>
                  <div className="text-sm">{inv.customerName} • {inv.vehicleModel}</div>
                  <div className="text-xs text-slate-400">📅 {formatDate(inv.invoiceDate)} • 📞 {inv.mobileNo}</div>
                  <div className="text-xs text-yellow-400 mt-1">
                    💰 {formatINR(inv.totalAmount)} - Subsidy {formatINR(inv.totalSubsidy)} = {formatINR(inv.finalPayable)}
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <button onClick={() => handlePrint(inv)} className="p-2 rounded bg-slate-700"><Download size={12} /></button>
                  <button onClick={() => shareInvoiceWhatsApp(inv)} className="p-2 rounded bg-green-700"><MessageCircle size={12} /></button>
                  <button onClick={() => setViewing(inv)} className="p-2 rounded bg-blue-700"><Eye size={12} /></button>
                  <button onClick={() => handleDelete(inv)} className="p-2 rounded bg-red-700"><Trash2 size={12} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && <InvoiceForm onClose={() => { setShowForm(false); load(); }} />}
      {viewing && <InvoiceView invoice={viewing} onClose={() => setViewing(null)} />}
      {confirmDelete && (
        <AdminPasswordModal
          action="Delete invoice"
          itemName={`${confirmDelete.invoiceNumber} — ${confirmDelete.customerName}`}
          onConfirm={doDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}

function InvoiceForm({ onClose }) {
  const [form, setForm] = useState({
    invoiceNumber: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    invoiceType: 'sale',
    customerName: '', mobileNo: '', customerAddress: '',
    vehicleModel: '', chassisNo: '', batteryNumber: '', motorNumber: '', color: '',
    items: [{ description: '', quantity: 1, rate: 0, amount: 0, gstPercent: 5, gstAmount: 0 }],
    subtotal: 0, gstAmount: 0, totalAmount: 0,
    fameSubsidy: 0, stateSubsidy: 0, totalSubsidy: 0, finalPayable: 0,
    paymentMode: 'cash', paymentStatus: 'paid', amountPaid: 0,
    sellerGSTIN: MD_CONFIG.gstin, sellerName: MD_CONFIG.brandName
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/api/invoices/util/next-number').then(r => setForm(f => ({ ...f, invoiceNumber: r.invoiceNumber }))).catch(() => {});
  }, []);

  const updateItem = (idx, field, value) => {
    const items = [...form.items];
    items[idx] = { ...items[idx], [field]: value };
    items[idx].amount = (Number(items[idx].quantity) || 0) * (Number(items[idx].rate) || 0);
    items[idx].gstAmount = items[idx].amount * (Number(items[idx].gstPercent) || 0) / 100;

    const subtotal = items.reduce((s, i) => s + (Number(i.amount) || 0), 0);
    const gstAmount = items.reduce((s, i) => s + (Number(i.gstAmount) || 0), 0);
    const totalAmount = subtotal + gstAmount;
    const totalSubsidy = (Number(form.fameSubsidy) || 0) + (Number(form.stateSubsidy) || 0);
    const finalPayable = totalAmount - totalSubsidy;

    setForm({ ...form, items, subtotal, gstAmount, totalAmount, totalSubsidy, finalPayable });
  };

  const updateSubsidy = (field, value) => {
    const updated = { ...form, [field]: value };
    updated.totalSubsidy = (Number(updated.fameSubsidy) || 0) + (Number(updated.stateSubsidy) || 0);
    updated.finalPayable = (Number(updated.totalAmount) || 0) - updated.totalSubsidy;
    setForm(updated);
  };

  const addItem = () => setForm({ ...form, items: [...form.items, { description: '', quantity: 1, rate: 0, amount: 0, gstPercent: 5, gstAmount: 0 }] });

  const save = async () => {
    if (!form.customerName || !form.mobileNo) {
      alert('Customer name और mobile आवश्यक है');
      return;
    }
    setSaving(true);
    try {
      await api.post('/api/invoices', form);
      onClose();
    } catch (err) {
      alert('Failed: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 p-4 overflow-y-auto" onClick={onClose}>
      <div className="card max-w-3xl mx-auto my-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold mb-4 text-green-400">New Invoice</h2>
        <div className="grid md:grid-cols-3 gap-3 mb-4">
          <div><label className="text-xs text-slate-400">Invoice No</label><input value={form.invoiceNumber} onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })} /></div>
          <div><label className="text-xs text-slate-400">Date</label><input type="date" value={form.invoiceDate} onChange={(e) => setForm({ ...form, invoiceDate: e.target.value })} /></div>
          <div><label className="text-xs text-slate-400">Type</label>
            <select value={form.invoiceType} onChange={(e) => setForm({ ...form, invoiceType: e.target.value })}>
              <option value="sale">Sale</option><option value="service">Service</option><option value="parts">Parts</option>
            </select>
          </div>
          <div><label className="text-xs text-slate-400">Customer *</label><input value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} /></div>
          <div><label className="text-xs text-slate-400">Mobile *</label><input value={form.mobileNo} onChange={(e) => setForm({ ...form, mobileNo: e.target.value })} /></div>
          <div><label className="text-xs text-slate-400">Address</label><input value={form.customerAddress} onChange={(e) => setForm({ ...form, customerAddress: e.target.value })} /></div>
          <div><label className="text-xs text-slate-400">Vehicle Model</label><input value={form.vehicleModel} onChange={(e) => setForm({ ...form, vehicleModel: e.target.value })} /></div>
          <div><label className="text-xs text-slate-400">Chassis</label><input value={form.chassisNo} onChange={(e) => setForm({ ...form, chassisNo: e.target.value })} /></div>
          <div><label className="text-xs text-slate-400">Battery No</label><input value={form.batteryNumber} onChange={(e) => setForm({ ...form, batteryNumber: e.target.value })} /></div>
        </div>

        <h3 className="font-semibold mb-2 text-green-400">Line Items</h3>
        {form.items.map((item, idx) => (
          <div key={idx} className="grid grid-cols-12 gap-2 mb-2">
            <input className="col-span-5" placeholder="Description" value={item.description} onChange={(e) => updateItem(idx, 'description', e.target.value)} />
            <input className="col-span-2" type="number" placeholder="Qty" value={item.quantity} onChange={(e) => updateItem(idx, 'quantity', e.target.value)} />
            <input className="col-span-2" type="number" placeholder="Rate" value={item.rate} onChange={(e) => updateItem(idx, 'rate', e.target.value)} />
            <input className="col-span-2" type="number" placeholder="GST%" value={item.gstPercent} onChange={(e) => updateItem(idx, 'gstPercent', e.target.value)} />
            <div className="col-span-1 text-xs flex items-center">{formatINR(item.amount)}</div>
          </div>
        ))}
        <button onClick={addItem} className="btn btn-ghost text-sm">+ Add Item</button>

        <div className="grid md:grid-cols-2 gap-3 mt-4">
          <div className="card">
            <h4 className="text-sm font-semibold mb-2 text-green-400">Subsidies (MD Automobile-specific)</h4>
            <Field label="FAME-II Subsidy" type="number" value={form.fameSubsidy} onChange={(v) => updateSubsidy('fameSubsidy', v)} />
            <Field label="State Subsidy" type="number" value={form.stateSubsidy} onChange={(v) => updateSubsidy('stateSubsidy', v)} />
          </div>
          <div className="card">
            <h4 className="text-sm font-semibold mb-2 text-green-400">Totals</h4>
            <Row label="Subtotal" value={formatINR(form.subtotal)} />
            <Row label="GST" value={formatINR(form.gstAmount)} />
            <Row label="Total" value={formatINR(form.totalAmount)} />
            <Row label="Subsidy" value={`-${formatINR(form.totalSubsidy)}`} />
            <Row label="Final Payable" value={formatINR(form.finalPayable)} bold />
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="btn btn-ghost flex-1">Cancel</button>
          <button onClick={save} disabled={saving} className="btn btn-primary flex-1">{saving ? 'Saving...' : 'Save Invoice'}</button>
        </div>
      </div>
    </div>
  );
}

function InvoiceView({ invoice, onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 p-4 overflow-y-auto" onClick={onClose}>
      <div className="card max-w-2xl mx-auto my-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold mb-4 text-green-400">{invoice.invoiceNumber}</h2>
        <div className="space-y-1 text-sm">
          <Row label="Customer" value={invoice.customerName} />
          <Row label="Mobile" value={invoice.mobileNo} />
          <Row label="Date" value={formatDate(invoice.invoiceDate)} />
          <Row label="Vehicle" value={invoice.vehicleModel} />
          <Row label="Chassis" value={invoice.chassisNo} />
          <Row label="Battery" value={invoice.batteryNumber} />
          <Row label="Total" value={formatINR(invoice.totalAmount)} />
          <Row label="Subsidy" value={formatINR(invoice.totalSubsidy)} />
          <Row label="Final Payable" value={formatINR(invoice.finalPayable)} bold />
        </div>
        <button onClick={onClose} className="btn btn-primary w-full mt-4">Close</button>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text' }) {
  return (
    <div className="mb-2">
      <label className="text-xs text-slate-400">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function Row({ label, value, bold }) {
  return (
    <div className="flex justify-between py-1">
      <span className="text-slate-400 text-xs">{label}</span>
      <span className={`${bold ? 'font-bold text-green-400 text-base' : 'text-sm'}`}>{value}</span>
    </div>
  );
}
