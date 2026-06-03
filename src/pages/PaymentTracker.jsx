import React, { useState, useEffect } from 'react';
import { Receipt, AlertTriangle, MessageCircle, Phone } from 'lucide-react';
import { api } from '../utils/apiConfig';
import { formatINR, formatDate, openWhatsApp } from '../utils/smartUtils';

export default function PaymentTracker() {
  const [customers, setCustomers] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/api/customers').catch(() => []),
      api.get('/api/invoices').catch(() => [])
    ]).then(([c, i]) => {
      setCustomers(Array.isArray(c) ? c : (c?.customers || []));
      setInvoices(Array.isArray(i) ? i : (i?.invoices || []));
      setLoading(false);
    });
  }, []);

  const emiCustomers = customers.filter(c => c.financeCompany && c.emiAmount > 0);
  const pendingInvoices = invoices.filter(i => i.paymentStatus !== 'paid' || (i.balanceDue || 0) > 0);

  return (
    <div className="p-4 max-w-7xl mx-auto fade-in" style={{ paddingBottom: 100 }}>
      <h1 className="text-2xl font-bold text-green-400 mb-4">Payment Tracker</h1>

      <div className="grid md:grid-cols-3 gap-3 mb-4">
        <div className="card">
          <div className="text-xs text-slate-400">Active EMIs</div>
          <div className="text-2xl font-bold text-green-400">{emiCustomers.length}</div>
        </div>
        <div className="card">
          <div className="text-xs text-slate-400">Pending Payments</div>
          <div className="text-2xl font-bold text-yellow-400">{pendingInvoices.length}</div>
        </div>
        <div className="card">
          <div className="text-xs text-slate-400">Total Due</div>
          <div className="text-2xl font-bold text-red-400">{formatINR(pendingInvoices.reduce((s, i) => s + (i.balanceDue || 0), 0))}</div>
        </div>
      </div>

      {loading ? <div className="text-center py-8">Loading...</div> : (
        <>
          <h3 className="font-semibold mb-2 mt-4 text-green-400">EMI Customers</h3>
          <div className="space-y-2 mb-6">
            {emiCustomers.map(c => (
              <div key={c._id} className="card card-hover">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="font-semibold">{c.customerName}</div>
                    <div className="text-xs text-slate-400">{c.financeCompany} • EMI {formatINR(c.emiAmount)}</div>
                    <div className="text-xs">Started: {formatDate(c.emiStartDate)} • Loan: {formatINR(c.loanAmount)}</div>
                  </div>
                  <button onClick={() => openWhatsApp(c.mobileNo, `EMI reminder: ${formatINR(c.emiAmount)}`)} className="p-2 rounded bg-green-700"><MessageCircle size={14} /></button>
                </div>
              </div>
            ))}
            {emiCustomers.length === 0 && <div className="card text-center text-slate-500">No EMI customers</div>}
          </div>

          <h3 className="font-semibold mb-2 mt-4 text-yellow-400 flex items-center gap-2"><AlertTriangle size={16} /> Pending Invoices</h3>
          <div className="space-y-2">
            {pendingInvoices.map(i => (
              <div key={i._id} className="card card-hover border-yellow-700">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="font-semibold">{i.invoiceNumber}</div>
                    <div className="text-sm">{i.customerName}</div>
                    <div className="text-xs text-slate-400">Due: {formatINR(i.balanceDue)}</div>
                  </div>
                  <button onClick={() => openWhatsApp(i.mobileNo, `Payment pending: ${formatINR(i.balanceDue)} for invoice ${i.invoiceNumber}`)} className="p-2 rounded bg-yellow-700"><MessageCircle size={14} /></button>
                </div>
              </div>
            ))}
            {pendingInvoices.length === 0 && <div className="card text-center text-slate-500">All paid! ✅</div>}
          </div>
        </>
      )}
    </div>
  );
}
