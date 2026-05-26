import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Edit2, Phone, MessageCircle, FileText, Wrench, Battery, Calendar } from 'lucide-react';
import { api } from '../utils/apiConfig';
import { formatDate, formatINR, openWhatsApp, daysBetween } from '../utils/smartUtils';

export default function CustomerServiceProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [jobcards, setJobcards] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const c = await api.get(`/api/customers/${id}`);
        setCustomer(c);
        // Load related data by mobile number
        if (c.mobileNo) {
          const [jc, inv] = await Promise.all([
            api.get('/api/jobcards', { search: c.mobileNo }).catch(() => []),
            api.get('/api/invoices', { search: c.mobileNo }).catch(() => [])
          ]);
          setJobcards(jc);
          setInvoices(inv);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) return <div className="p-8 text-center text-slate-400">Loading...</div>;
  if (!customer) return <div className="p-8 text-center text-red-400">Customer not found</div>;

  const batteryAge = customer.invoiceDate ? Math.round(daysBetween(customer.invoiceDate, new Date()) / 365 * 10) / 10 : 0;
  const warrantyMonthsLeft = customer.invoiceDate ? Math.max(0, Math.round(12 - (daysBetween(customer.invoiceDate, new Date()) / 30))) : 0;

  return (
    <div className="p-4 max-w-4xl mx-auto fade-in">
      <button onClick={() => navigate(-1)} className="btn btn-ghost p-2 mb-3"><ArrowLeft size={18} /></button>

      {/* Header card */}
      <div className="card mb-4 gradient-green text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{customer.customerName}</h1>
            <div className="text-sm opacity-90 mt-1">{customer.vehicleModel} • {customer.color}</div>
            <div className="text-xs opacity-75 mt-1">📞 {customer.mobileNo}</div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => openWhatsApp(customer.mobileNo, `नमस्ते ${customer.customerName}`)} className="p-3 rounded-full bg-white/20 hover:bg-white/30">
              <MessageCircle size={20} />
            </button>
            <a href={`tel:${customer.mobileNo}`} className="p-3 rounded-full bg-white/20 hover:bg-white/30">
              <Phone size={20} />
            </a>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Personal info */}
        <div className="card">
          <h3 className="font-semibold mb-3 text-green-400">Personal Details</h3>
          <InfoRow label="Father" value={customer.fatherName} />
          <InfoRow label="DOB" value={formatDate(customer.dob)} />
          <InfoRow label="Email" value={customer.email} />
          <InfoRow label="Aadhar" value={customer.aadhar} />
          <InfoRow label="PAN" value={customer.pan} />
          <InfoRow label="Address" value={customer.address} />
          <InfoRow label="City" value={`${customer.city || ''} ${customer.pincode || ''}`} />
        </div>

        {/* Vehicle + Battery */}
        <div className="card">
          <h3 className="font-semibold mb-3 text-green-400 flex items-center gap-2"><Battery size={16} /> Electric Vehicle</h3>
          <InfoRow label="Model" value={customer.vehicleModel} />
          <InfoRow label="Chassis" value={customer.chassisNo} />
          <InfoRow label="🔋 Battery No" value={customer.batteryNumber} />
          <InfoRow label="⚡ Motor No" value={customer.motorNumber} />
          <InfoRow label="Purchase Date" value={formatDate(customer.invoiceDate)} />
          <InfoRow label="Battery Age" value={`${batteryAge} years (Warranty: ${warrantyMonthsLeft > 0 ? warrantyMonthsLeft + ' months left' : 'Expired'})`} />
          <InfoRow label="Battery Warranty Till" value={formatDate(customer.batteryWarrantyDate)} />
          <InfoRow label="Motor Warranty Till" value={formatDate(customer.motorWarrantyDate)} />
          <InfoRow label="Controller Warranty Till" value={formatDate(customer.controllerWarrantyDate)} />
        </div>

        {/* Pricing */}
        <div className="card">
          <h3 className="font-semibold mb-3 text-green-400">Pricing</h3>
          <InfoRow label="On-Road Price" value={formatINR(customer.onRoadPrice)} />
          <InfoRow label="FAME-II Subsidy" value={formatINR(customer.fameSubsidy)} />
          <InfoRow label="State Subsidy" value={formatINR(customer.stateSubsidy)} />
          <InfoRow label="Final Paid" value={formatINR(customer.finalPaidPrice)} highlight />
          {customer.financeCompany && (
            <>
              <InfoRow label="Finance" value={customer.financeCompany} />
              <InfoRow label="EMI" value={formatINR(customer.emiAmount)} />
            </>
          )}
        </div>

        {/* Service History */}
        <div className="card">
          <h3 className="font-semibold mb-3 text-green-400 flex items-center gap-2"><Wrench size={16} /> Service History ({jobcards.length})</h3>
          {jobcards.length === 0 ? (
            <div className="text-sm text-slate-500">No service records yet</div>
          ) : (
            <div className="space-y-2">
              {jobcards.slice(0, 5).map(jc => (
                <div key={jc._id} className="text-sm p-2 bg-slate-800/50 rounded">
                  <div className="font-medium">{jc.jobCardNumber}</div>
                  <div className="text-xs text-slate-400">{formatDate(jc.jobCardDate)} • {formatINR(jc.finalAmount)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Invoices */}
      {invoices.length > 0 && (
        <div className="card mt-4">
          <h3 className="font-semibold mb-3 text-green-400 flex items-center gap-2"><FileText size={16} /> Invoices ({invoices.length})</h3>
          <div className="grid md:grid-cols-2 gap-2">
            {invoices.map(inv => (
              <div key={inv._id} className="p-2 bg-slate-800/50 rounded text-sm">
                <div className="font-medium">{inv.invoiceNumber}</div>
                <div className="text-xs text-slate-400">{formatDate(inv.invoiceDate)} • {formatINR(inv.totalAmount)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value, highlight }) {
  if (!value) return null;
  return (
    <div className="flex justify-between py-1.5 border-b border-slate-800 last:border-0">
      <span className="text-xs text-slate-400">{label}</span>
      <span className={`text-sm ${highlight ? 'font-bold text-green-400' : ''}`}>{value}</span>
    </div>
  );
}
