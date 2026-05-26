import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, ArrowLeft } from 'lucide-react';
import { api } from '../utils/apiConfig';
import { addYears } from '../utils/smartUtils';

export default function NewCustomersPage() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    customerName: '', mobileNo: '', alternateMobile: '', fatherName: '',
    address: '', city: 'Bhopal', pincode: '', aadhar: '', pan: '', dob: '', email: '',
    vehicleModel: '', chassisNo: '', color: '',
    batteryNumber: '', motorNumber: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    invoiceNumber: '',
    onRoadPrice: 0, fameSubsidy: 0, stateSubsidy: 0, finalPaidPrice: 0,
    financeCompany: '', loanAmount: 0, emiAmount: 0, emiStartDate: '',
    source: 'walk-in'
  });

  const update = (key, value) => {
    const updated = { ...form, [key]: value };
    // Auto-calc final price
    if (['onRoadPrice', 'fameSubsidy', 'stateSubsidy'].includes(key)) {
      updated.finalPaidPrice = (Number(updated.onRoadPrice) || 0) - (Number(updated.fameSubsidy) || 0) - (Number(updated.stateSubsidy) || 0);
    }
    // Auto-set 1-year warranty (battery, motor, controller — all same)
    if (key === 'invoiceDate' && value) {
      updated.batteryWarrantyDate = addYears(value, 1);
      updated.motorWarrantyDate = addYears(value, 1);
      updated.controllerWarrantyDate = addYears(value, 1);
    }
    setForm(updated);
  };

  const handleSubmit = async () => {
    if (!form.customerName || !form.mobileNo) {
      alert('Name और Mobile आवश्यक है');
      return;
    }
    setSaving(true);
    try {
      const result = await api.post('/api/customers', form);
      alert('✅ Customer saved!');
      navigate(`/customers/${result._id}`);
    } catch (err) {
      alert('❌ Save failed: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 max-w-3xl mx-auto fade-in">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate(-1)} className="btn btn-ghost p-2"><ArrowLeft size={18} /></button>
        <h1 className="text-2xl font-bold text-green-400">New Customer</h1>
      </div>

      <div className="space-y-4">
        {/* Personal */}
        <div className="card">
          <h3 className="font-semibold mb-3 text-green-400">Personal Details</h3>
          <div className="grid md:grid-cols-2 gap-3">
            <Field label="Customer Name *" value={form.customerName} onChange={(v) => update('customerName', v)} />
            <Field label="Mobile Number *" value={form.mobileNo} onChange={(v) => update('mobileNo', v.replace(/\D/g, ''))} maxLength={10} />
            <Field label="Alternate Mobile" value={form.alternateMobile} onChange={(v) => update('alternateMobile', v)} />
            <Field label="Father's Name" value={form.fatherName} onChange={(v) => update('fatherName', v)} />
            <Field label="Date of Birth" type="date" value={form.dob} onChange={(v) => update('dob', v)} />
            <Field label="Email" value={form.email} onChange={(v) => update('email', v)} />
            <Field label="Aadhar" value={form.aadhar} onChange={(v) => update('aadhar', v)} />
            <Field label="PAN" value={form.pan} onChange={(v) => update('pan', v.toUpperCase())} />
            <Field label="Address" value={form.address} onChange={(v) => update('address', v)} className="md:col-span-2" />
            <Field label="City" value={form.city} onChange={(v) => update('city', v)} />
            <Field label="Pincode" value={form.pincode} onChange={(v) => update('pincode', v)} />
          </div>
        </div>

        {/* Vehicle */}
        <div className="card">
          <h3 className="font-semibold mb-3 text-green-400">Vehicle Details (Electric ⚡)</h3>
          <div className="grid md:grid-cols-2 gap-3">
            <Field label="Vehicle Model" value={form.vehicleModel} onChange={(v) => update('vehicleModel', v)} placeholder="e.g., MD Automobile Sprint, MD Automobile Eco" />
            <Field label="Color" value={form.color} onChange={(v) => update('color', v)} />
            <Field label="Chassis Number" value={form.chassisNo} onChange={(v) => update('chassisNo', v.toUpperCase())} />
            <Field label="🔋 Battery Number" value={form.batteryNumber} onChange={(v) => update('batteryNumber', v.toUpperCase())} />
            <Field label="⚡ Motor Number" value={form.motorNumber} onChange={(v) => update('motorNumber', v.toUpperCase())} />
            <Field label="Invoice Date" type="date" value={form.invoiceDate} onChange={(v) => update('invoiceDate', v)} />
            <Field label="Invoice Number" value={form.invoiceNumber} onChange={(v) => update('invoiceNumber', v)} />
            <Field label="Source" type="select" value={form.source} onChange={(v) => update('source', v)} options={['walk-in', 'online', 'referral', 'campaign']} />
          </div>
        </div>

        {/* Pricing with subsidy */}
        <div className="card">
          <h3 className="font-semibold mb-3 text-green-400">Pricing & Subsidy 💰</h3>
          <div className="grid md:grid-cols-2 gap-3">
            <Field label="On-Road Price (₹)" type="number" value={form.onRoadPrice} onChange={(v) => update('onRoadPrice', v)} />
            <Field label="FAME-II Subsidy (₹)" type="number" value={form.fameSubsidy} onChange={(v) => update('fameSubsidy', v)} placeholder="10000-15000" />
            <Field label="State Subsidy (₹)" type="number" value={form.stateSubsidy} onChange={(v) => update('stateSubsidy', v)} placeholder="5000" />
            <Field label="Final Paid Price (₹)" type="number" value={form.finalPaidPrice} onChange={(v) => update('finalPaidPrice', v)} disabled />
          </div>
          <div className="mt-3 text-xs text-slate-400">Note: Battery, Motor, Controller — सबकी 1 साल warranty (auto-set from invoice date)</div>
        </div>

        {/* Finance */}
        <div className="card">
          <h3 className="font-semibold mb-3 text-green-400">Finance (Optional)</h3>
          <div className="grid md:grid-cols-2 gap-3">
            <Field label="Finance Company" value={form.financeCompany} onChange={(v) => update('financeCompany', v)} />
            <Field label="Loan Amount (₹)" type="number" value={form.loanAmount} onChange={(v) => update('loanAmount', v)} />
            <Field label="EMI Amount (₹)" type="number" value={form.emiAmount} onChange={(v) => update('emiAmount', v)} />
            <Field label="EMI Start Date" type="date" value={form.emiStartDate} onChange={(v) => update('emiStartDate', v)} />
          </div>
        </div>

        <div className="flex gap-2 sticky bottom-4">
          <button onClick={() => navigate(-1)} className="btn btn-ghost flex-1">Cancel</button>
          <button onClick={handleSubmit} disabled={saving} className="btn btn-primary flex-1 flex items-center justify-center gap-2">
            <Save size={16} /> {saving ? 'Saving...' : 'Save Customer'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', options, className = '', ...rest }) {
  return (
    <div className={className}>
      <label className="text-xs text-slate-400 mb-1 block">{label}</label>
      {type === 'select' ? (
        <select value={value} onChange={(e) => onChange(e.target.value)} {...rest}>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} {...rest} />
      )}
    </div>
  );
}
