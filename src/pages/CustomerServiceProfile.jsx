import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Edit2, Phone, MessageCircle, FileText, Wrench, Battery, Calendar, Bike, IndianRupee } from 'lucide-react';
import { api } from '../utils/apiConfig';
import { formatDate, formatINR, openWhatsApp, daysBetween } from '../utils/smartUtils';

export default function CustomerServiceProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [jobcards, setJobcards] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [emis, setEmis] = useState([]);
  const [dues, setDues] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const c = await api.get(`/api/customers/${id}`);
        const customerData = c?.customer || c;
        setCustomer(customerData);

        // Lookup by multiple keys (mobile + name + chassis + ID)
        const mobile = customerData.mobileNo || customerData.mobile || customerData.phone;
        const name = customerData.customerName || customerData.name;

        const promises = [
          api.get('/api/jobcards').catch(() => []),
          api.get('/api/invoices').catch(() => []),
          api.get('/api/vehicles').catch(() => []),
          api.get('/api/emis').catch(() => []),
          api.get(`/api/customer-dues?customerId=${id}`).catch(() => [])
        ];

        const [jcRaw, invRaw, vRaw, emiRaw, dueRaw] = await Promise.all(promises);
        const jc = Array.isArray(jcRaw) ? jcRaw : (jcRaw?.jobcards || []);
        const inv = Array.isArray(invRaw) ? invRaw : (invRaw?.invoices || []);
        const v = Array.isArray(vRaw) ? vRaw : (vRaw?.vehicles || []);
        const em = Array.isArray(emiRaw) ? emiRaw : (emiRaw?.emis || []);
        const du = Array.isArray(dueRaw) ? dueRaw : (dueRaw?.dues || []);

        // Filter for this customer
        const matchesCustomer = (item) => {
          if (!item) return false;
          if (item.customerId && (item.customerId === id || String(item.customerId) === id)) return true;
          if (mobile && (item.customerMobile === mobile || item.mobile === mobile || item.mobileNo === mobile)) return true;
          if (name && (item.customerName === name)) return true;
          return false;
        };

        setJobcards(jc.filter(matchesCustomer));
        setInvoices(inv.filter(matchesCustomer));
        setVehicles(v.filter(matchesCustomer));
        setEmis(em.filter(matchesCustomer));
        setDues(du.filter(d => matchesCustomer(d) || (mobile && d.mobileNo === mobile)));
      } catch (err) {
        console.error('Load failed:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) return <div className="p-8 text-center text-slate-400">⏳ Loading...</div>;
  if (!customer) return <div className="p-8 text-center text-red-400">❌ Customer not found</div>;

  // Field fallbacks for Excel-imported data
  const name = customer.customerName || customer.name || 'Unknown';
  const mobile = customer.mobileNo || customer.mobile || customer.phone || '';
  const altMobile = customer.alternateMobile || customer.altMobile || '';

  // Primary vehicle (linked first)
  const primaryVehicle = vehicles[0] || {};
  const purchaseDate = customer.invoiceDate || customer.soldAt || primaryVehicle.soldAt || primaryVehicle.manufactureDate;
  const batteryAge = purchaseDate ? Math.round(daysBetween(purchaseDate, new Date()) / 365 * 10) / 10 : 0;
  const warrantyMonthsLeft = purchaseDate ? Math.max(0, Math.round(12 - (daysBetween(purchaseDate, new Date()) / 30))) : 0;

  // Total revenue
  const totalSpent = invoices.reduce((s, i) => s + (Number(i.netAmount || i.grandTotal || i.price) || 0), 0);

  return (
    <div className="p-4 max-w-4xl mx-auto fade-in" style={{ paddingBottom: 100 }}>
      <button onClick={() => navigate(-1)} className="btn btn-ghost p-2 mb-3"><ArrowLeft size={18} /></button>

      {/* Header card */}
      <div className="card mb-4" style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)', color: 'white' }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{name}</h1>
            <div className="text-sm opacity-90 mt-1">
              {(primaryVehicle.model || customer.vehicleModel || '—')}
              {(primaryVehicle.color || customer.color) && ` • ${primaryVehicle.color || customer.color}`}
              {(primaryVehicle.variant || customer.variant) && ` • ${primaryVehicle.variant || customer.variant}`}
            </div>
            {mobile && <div className="text-xs opacity-75 mt-1">📞 {mobile}{altMobile && ` / ${altMobile}`}</div>}
          </div>
          <div className="flex gap-2">
            {mobile && <>
              <button onClick={() => openWhatsApp(mobile, `नमस्ते ${name}`)} className="p-3 rounded-full bg-white/20 hover:bg-white/30">
                <MessageCircle size={20} />
              </button>
              <a href={`tel:${mobile}`} className="p-3 rounded-full bg-white/20 hover:bg-white/30">
                <Phone size={20} />
              </a>
            </>}
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        <StatBox icon={<Bike size={16} />} label="Vehicles" value={vehicles.length} color="#16a34a" />
        <StatBox icon={<FileText size={16} />} label="Invoices" value={invoices.length} color="#2563eb" />
        <StatBox icon={<Wrench size={16} />} label="Services" value={jobcards.length} color="#fbbf24" />
        <StatBox icon={<IndianRupee size={16} />} label="Total" value={formatINR(totalSpent).replace('₹', '₹')} color="#16a34a" small />
      </div>

      {/* 🆕 Outstanding Udhaari/Due banner — links to Customer Dues page */}
      {(() => {
        const outstandingDues = dues.filter(d => d.status !== 'paid');
        const totalOutstanding = outstandingDues.reduce((s, d) => s + (Number(d.balanceAmount) || 0), 0);
        if (outstandingDues.length === 0) return null;
        return (
          <div
            className="card mb-4 cursor-pointer"
            style={{ borderLeft: '4px solid #dc2626', background: 'rgba(220,38,38,0.08)' }}
            onClick={() => navigate('/customer-dues')}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-red-400 font-bold">⚠️ Outstanding Udhaari / Due</div>
                <div className="text-lg font-bold text-red-400">{formatINR(totalOutstanding)}</div>
                <div className="text-xs text-slate-400">{outstandingDues.length} pending entries — tap to manage</div>
              </div>
              <IndianRupee size={24} className="text-red-400" />
            </div>
          </div>
        );
      })()}

      <div className="grid md:grid-cols-2 gap-4">
        {/* Personal info */}
        <div className="card">
          <h3 className="font-semibold mb-3 text-green-400">Personal Details</h3>
          <InfoRow label="Father" value={customer.fatherName} />
          <InfoRow label="DOB" value={formatDate(customer.dob)} />
          <InfoRow label="Email" value={customer.email} />
          <InfoRow label="Aadhar" value={customer.aadhar || customer.aadharNo} />
          <InfoRow label="PAN" value={customer.pan || customer.panNo} />
          <InfoRow label="Address" value={customer.address} />
          <InfoRow label="City" value={`${customer.city || customer.district || ''} ${customer.pincode || ''}`.trim()} />
          {customer.nomineeName && <InfoRow label="Nominee" value={customer.nomineeName} />}
        </div>

        {/* Vehicle + Battery */}
        <div className="card">
          <h3 className="font-semibold mb-3 text-green-400 flex items-center gap-2"><Battery size={16} /> Electric Vehicle</h3>
          <InfoRow label="Model" value={primaryVehicle.model || customer.vehicleModel} />
          <InfoRow label="Variant" value={primaryVehicle.variant || customer.variant} />
          <InfoRow label="Chassis" value={primaryVehicle.chassisNo || customer.chassisNo} />
          <InfoRow label="🔋 Battery" value={
            (primaryVehicle.batteryNumbers || []).join(', ') || customer.batteryNumber || primaryVehicle.batteryNo
          } />
          <InfoRow label="⚡ Motor No" value={primaryVehicle.motorNo || customer.motorNumber} />
          <InfoRow label="🔌 Charger No" value={primaryVehicle.chargerNo} />
          <InfoRow label="🎛️ Controller" value={primaryVehicle.controllerNo} />
          <InfoRow label="📏 Range" value={primaryVehicle.range || (primaryVehicle.rangeMax ? `${primaryVehicle.rangeMin || 0}-${primaryVehicle.rangeMax} km` : null)} />
          <InfoRow label="🚀 Top Speed" value={primaryVehicle.topSpeed ? `${primaryVehicle.topSpeed} km/h` : null} />
          <InfoRow label="Purchase Date" value={formatDate(purchaseDate)} />
          {purchaseDate && <InfoRow label="Battery Age" value={`${batteryAge} years (Warranty: ${warrantyMonthsLeft > 0 ? warrantyMonthsLeft + ' months left' : 'Expired'})`} highlight={warrantyMonthsLeft > 0} />}
        </div>

        {/* Pricing */}
        <div className="card">
          <h3 className="font-semibold mb-3 text-green-400">Pricing & Payment</h3>
          <InfoRow label="On-Road Price" value={formatINR(customer.onRoadPrice || customer.effectivePrice || customer.totalAmount || primaryVehicle.onRoadPrice)} />
          {customer.downPayment > 0 && <InfoRow label="Down Payment" value={formatINR(customer.downPayment)} />}
          {customer.disbursed > 0 && <InfoRow label="Bank Disbursed" value={formatINR(customer.disbursed)} />}
          {customer.fameSubsidy > 0 && <InfoRow label="FAME-II Subsidy" value={formatINR(customer.fameSubsidy)} />}
          {customer.stateSubsidy > 0 && <InfoRow label="State Subsidy" value={formatINR(customer.stateSubsidy)} />}
          <InfoRow label="Total Spent (All Invoices)" value={formatINR(totalSpent)} highlight />
          <InfoRow label="Payment Mode" value={customer.paymentMode || customer.financeCompany} />
          {customer.pendingAmount > 0 && <InfoRow label="⚠️ Pending" value={formatINR(customer.pendingAmount)} />}
        </div>

        {/* Service History */}
        <div className="card">
          <h3 className="font-semibold mb-3 text-green-400 flex items-center gap-2"><Wrench size={16} /> Service History ({jobcards.length})</h3>
          {jobcards.length === 0 ? (
            <div className="text-sm text-slate-500">No service records yet</div>
          ) : (
            <div className="space-y-2">
              {jobcards.slice(0, 5).map(jc => (
                <Link key={jc._id} to={`/jobcards/${jc._id}`} className="block">
                  <div className="text-sm p-2 bg-slate-800/50 rounded hover:bg-slate-800">
                    <div className="font-medium">{jc.jobCardNumber || jc.jobNumber || `Job #${String(jc._id).slice(-4)}`}</div>
                    <div className="text-xs text-slate-400">{formatDate(jc.jobCardDate || jc.date)} • {formatINR(jc.finalAmount || jc.totalAmount || 0)}</div>
                  </div>
                </Link>
              ))}
              {jobcards.length > 5 && <div className="text-xs text-slate-500 mt-1">+{jobcards.length - 5} more</div>}
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
              <Link key={inv._id} to={`/tax-invoice?id=${inv._id}`} className="block">
                <div className="p-2 bg-slate-800/50 rounded text-sm hover:bg-slate-800">
                  <div className="font-medium text-green-400">{inv.invoiceNumber || inv.invoiceNo || inv.serialNo}</div>
                  <div className="text-xs text-slate-400">{formatDate(inv.invoiceDate || inv.saleDate)}</div>
                  <div className="text-xs text-yellow-400">{formatINR(inv.netAmount || inv.grandTotal || inv.price || 0)}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* EMIs */}
      {emis.length > 0 && (
        <div className="card mt-4">
          <h3 className="font-semibold mb-3 text-green-400 flex items-center gap-2"><Calendar size={16} /> EMI Schedule ({emis.length})</h3>
          {emis.map(emi => (
            <div key={emi._id} className="flex justify-between items-center py-2 border-b border-slate-800 last:border-0">
              <div>
                <div className="font-medium">हर महीने {emi.emiDay} तारीख</div>
                <div className="text-xs text-slate-400">{emi.tenure} months · {emi.paidEmis || 0}/{emi.totalEmis || emi.tenure} paid</div>
              </div>
              <div className="text-green-400 font-bold">{formatINR(emi.emiAmount)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value, highlight }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex justify-between py-1.5 border-b border-slate-800 last:border-0">
      <span className="text-xs text-slate-400">{label}</span>
      <span className={`text-sm ${highlight ? 'font-bold text-green-400' : 'text-white'}`}>{value}</span>
    </div>
  );
}

function StatBox({ icon, label, value, color, small }) {
  return (
    <div className="card text-center" style={{ padding: 8 }}>
      <div style={{ color, display: 'flex', justifyContent: 'center', marginBottom: 2 }}>{icon}</div>
      <div style={{ color, fontWeight: 'bold', fontSize: small ? 12 : 18 }}>{value}</div>
      <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 2 }}>{label}</div>
    </div>
  );
}
