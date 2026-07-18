import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Receipt, AlertTriangle, MessageCircle, Phone, TrendingUp, TrendingDown,
  Calendar, IndianRupee, Users, CheckCircle2, Clock, ArrowRight, Wallet, CreditCard
} from 'lucide-react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { api } from '../utils/apiConfig';
import { formatINR, formatDate, sendWhatsApp } from '../utils/smartUtils';

// ── Same schedule logic used across CalendarView & ReceivedPaymentPage ──
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
  const out = [];
  for (let i = 0; i < tenure; i++) {
    const dueDate = addMonthsSafe(start, i);
    out.push({ index: i, date: dueDate, amount: Number(emi.emiAmount) || 0, paid: i < paidCount });
  }
  return out;
}

const COLORS = ['#16a34a', '#f59e0b', '#dc2626', '#2563eb', '#7c3aed'];

export default function PaymentTracker() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [emis, setEmis] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [dues, setDues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [monthsRange, setMonthsRange] = useState(6);

  useEffect(() => {
    Promise.all([
      api.get('/api/customers').catch(() => []),
      api.get('/api/invoices').catch(() => []),
      api.get('/api/emis').catch(() => []),
      api.get('/api/payment-receipts').catch(() => []),
      api.get('/api/customer-dues').catch(() => [])
    ]).then(([c, i, e, r, d]) => {
      setCustomers(Array.isArray(c) ? c : (c?.customers || []));
      setInvoices(Array.isArray(i) ? i : (i?.invoices || []));
      setEmis(Array.isArray(e) ? e : (e?.emis || []));
      setReceipts(Array.isArray(r) ? r : (r?.receipts || []));
      setDues(Array.isArray(d) ? d : (d?.dues || []));
      setLoading(false);
    });
  }, []);

  // ── EMI schedules (bounded, tenure-safe) ──
  const emisWithSchedule = useMemo(() => {
    return emis.filter(e => e.status !== 'cancelled').map(emi => ({ emi, schedule: computeSchedule(emi) }));
  }, [emis]);

  // ── EMI summary ──
  const emiSummary = useMemo(() => {
    let pendingAmount = 0, pendingCount = 0, receivedAmount = 0, receivedCount = 0, overdueAmount = 0, overdueCount = 0;
    const now = new Date(); now.setHours(0,0,0,0);
    emisWithSchedule.forEach(({ schedule }) => {
      schedule.forEach(s => {
        if (s.paid) { receivedAmount += s.amount; receivedCount++; }
        else {
          pendingAmount += s.amount; pendingCount++;
          if (s.date < now) { overdueAmount += s.amount; overdueCount++; }
        }
      });
    });
    return { pendingAmount, pendingCount, receivedAmount, receivedCount, overdueAmount, overdueCount };
  }, [emisWithSchedule]);

  // ── Customer Dues / Udhaari summary ──
  const duesSummary = useMemo(() => {
    const outstanding = dues.filter(d => d.status !== 'paid');
    return {
      totalOutstanding: outstanding.reduce((s, d) => s + (Number(d.balanceAmount) || 0), 0),
      count: outstanding.length
    };
  }, [dues]);

  // ── Invoice dues ──
  const invoiceSummary = useMemo(() => {
    const pending = invoices.filter(i => i.paymentStatus !== 'paid' && (i.balanceDue || 0) > 0);
    const totalDue = pending.reduce((s, i) => s + (Number(i.balanceDue) || 0), 0);
    return { pendingCount: pending.length, totalDue, pending };
  }, [invoices]);

  // ── Down payment total received (from receipts) ──
  const receiptSummary = useMemo(() => {
    const emiReceipts = receipts.filter(r => r.paymentType === 'emi');
    const dpReceipts = receipts.filter(r => r.paymentType === 'downpayment');
    const otherReceipts = receipts.filter(r => r.paymentType === 'other');
    return {
      totalReceived: receipts.reduce((s, r) => s + (Number(r.amount) || 0), 0),
      emiTotal: emiReceipts.reduce((s, r) => s + (Number(r.amount) || 0), 0),
      dpTotal: dpReceipts.reduce((s, r) => s + (Number(r.amount) || 0), 0),
      otherTotal: otherReceipts.reduce((s, r) => s + (Number(r.amount) || 0), 0),
      recent: [...receipts].sort((a, b) => new Date(b.createdAt || b.receiptDate) - new Date(a.createdAt || a.receiptDate)).slice(0, 8)
    };
  }, [receipts]);

  // ── Monthly collection trend (last N months) — actual received via receipts ──
  const monthlyTrend = useMemo(() => {
    const months = [];
    const now = new Date();
    for (let i = monthsRange - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleString('en-IN', { month: 'short', year: '2-digit' }), emi: 0, downpayment: 0, other: 0 });
    }
    receipts.forEach(r => {
      const d = new Date(r.receiptDate || r.createdAt);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const m = months.find(x => x.key === key);
      if (m) {
        if (r.paymentType === 'emi') m.emi += Number(r.amount) || 0;
        else if (r.paymentType === 'downpayment') m.downpayment += Number(r.amount) || 0;
        else m.other += Number(r.amount) || 0;
      }
    });
    return months;
  }, [receipts, monthsRange]);

  // ── Upcoming EMI dues (next 30 days, unpaid) — actionable list ──
  const upcomingDues = useMemo(() => {
    const now = new Date(); now.setHours(0,0,0,0);
    const in30 = new Date(now); in30.setDate(in30.getDate() + 30);
    const out = [];
    emisWithSchedule.forEach(({ emi, schedule }) => {
      const nextPending = schedule.find(s => !s.paid);
      if (nextPending && nextPending.date <= in30) {
        out.push({ emi, entry: nextPending, overdue: nextPending.date < now });
      }
    });
    return out.sort((a, b) => a.entry.date - b.entry.date);
  }, [emisWithSchedule]);

  // ── Pie: payment type distribution ──
  const pieData = [
    { name: 'EMI', value: receiptSummary.emiTotal },
    { name: 'Down Payment', value: receiptSummary.dpTotal },
    { name: 'Other', value: receiptSummary.otherTotal }
  ].filter(d => d.value > 0);

  const remindEmi = (emi, entry) => {
    const phone = emi.customerPhone || emi.mobile;
    if (!phone) { alert('❌ Mobile number नहीं है'); return; }
    const msg = `नमस्ते ${emi.customerName} जी 🙏\n\nआपकी EMI ${formatINR(emi.emiAmount)} ${formatDate(entry.date)} को due है।\n\nकृपया समय पर payment करें।\n\n- MD Automobile, Bhopal`;
    sendWhatsApp(phone, msg);
  };

  if (loading) return <div className="p-8 text-center text-slate-400">Loading Payment Dashboard...</div>;

  return (
    <div className="p-4 max-w-7xl mx-auto fade-in" style={{ paddingBottom: 100 }}>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-green-400">💰 Payment Tracker</h1>
        <button onClick={() => navigate('/received-payments')} className="btn btn-primary flex items-center gap-1">
          <Receipt size={16} /> New Receipt
        </button>
      </div>

      {/* ═══ Top Summary Cards ═══ */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        <SummaryCard icon={<Wallet size={16} />} label="Total Received" value={formatINR(receiptSummary.totalReceived)} color="#16a34a" />
        <SummaryCard icon={<Clock size={16} />} label="EMI Pending" value={formatINR(emiSummary.pendingAmount)} sub={`${emiSummary.pendingCount} installments`} color="#f59e0b" />
        <SummaryCard icon={<AlertTriangle size={16} />} label="Overdue EMI" value={formatINR(emiSummary.overdueAmount)} sub={`${emiSummary.overdueCount} overdue`} color="#dc2626" />
        <SummaryCard icon={<CreditCard size={16} />} label="Invoice Dues" value={formatINR(invoiceSummary.totalDue)} sub={`${invoiceSummary.pendingCount} invoices`} color="#2563eb" />
        <SummaryCard icon={<Receipt size={16} />} label="📒 Udhaari बकाया" value={formatINR(duesSummary.totalOutstanding)} sub={`${duesSummary.count} entries`} color="#a855f7" onClick={() => navigate('/customer-dues')} />
      </div>

      {/* ═══ Charts Row ═══ */}
      <div className="grid md:grid-cols-3 gap-3 mb-4">
        {/* Monthly Collection Trend */}
        <div className="card md:col-span-2">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-bold text-slate-300">📈 Monthly Collection Trend</h3>
            <select value={monthsRange} onChange={(e) => setMonthsRange(Number(e.target.value))} className="bg-slate-800 text-xs text-white rounded px-2 py-1">
              <option value={3}>3 months</option>
              <option value={6}>6 months</option>
              <option value={12}>12 months</option>
            </select>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} />
              <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', fontSize: 12 }} formatter={(v) => formatINR(v)} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="emi" name="EMI" fill="#16a34a" stackId="a" />
              <Bar dataKey="downpayment" name="Down Payment" fill="#f59e0b" stackId="a" />
              <Bar dataKey="other" name="Other" fill="#64748b" stackId="a" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie: Payment Type Distribution */}
        <div className="card">
          <h3 className="text-sm font-bold text-slate-300 mb-2">🥧 Payment Types</h3>
          {pieData.length === 0 ? (
            <div className="text-center text-slate-500 text-xs py-12">कोई data नहीं</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={(e) => `${e.name}`}>
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => formatINR(v)} contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ═══ Upcoming EMI Dues (actionable, links to Calendar) ═══ */}
      <div className="card mb-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2"><Calendar size={16} /> Upcoming EMI Dues (अगले 30 दिन)</h3>
          <button onClick={() => navigate('/calendar')} className="text-xs text-green-400 flex items-center gap-1">Full Calendar <ArrowRight size={12} /></button>
        </div>
        {upcomingDues.length === 0 ? (
          <div className="text-center text-slate-500 text-sm py-6">🎉 अगले 30 दिन में कोई pending EMI नहीं!</div>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {upcomingDues.map(({ emi, entry, overdue }) => (
              <div key={emi._id} className={`flex items-center justify-between p-2 rounded ${overdue ? 'bg-red-900/30 border border-red-700' : 'bg-slate-800'}`}>
                <div>
                  <div className="text-sm font-bold">{emi.customerName}</div>
                  <div className="text-xs text-slate-400">🛵 {emi.vehicleModel} • 📞 {emi.customerPhone || emi.mobile}</div>
                  <div className={`text-xs ${overdue ? 'text-red-400' : 'text-yellow-400'}`}>{overdue ? '⚠️ OVERDUE' : '⏳'} {formatDate(entry.date)}</div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-green-400 font-bold text-sm">{formatINR(entry.amount)}</div>
                  <button onClick={() => remindEmi(emi, entry)} className="p-2 rounded bg-green-700"><MessageCircle size={12} /></button>
                  <button onClick={() => navigate('/received-payments')} className="p-2 rounded bg-blue-700"><Receipt size={12} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ═══ Pending Invoices (linked to Invoice Management) ═══ */}
      <div className="card mb-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2"><AlertTriangle size={16} className="text-yellow-400" /> Pending Invoice Dues</h3>
          <button onClick={() => navigate('/invoices')} className="text-xs text-green-400 flex items-center gap-1">All Invoices <ArrowRight size={12} /></button>
        </div>
        {invoiceSummary.pending.length === 0 ? (
          <div className="text-center text-slate-500 text-sm py-6">✅ All invoices paid!</div>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {invoiceSummary.pending.slice(0, 10).map(inv => (
              <div key={inv._id} className="flex items-center justify-between p-2 rounded bg-slate-800">
                <div>
                  <div className="text-sm font-bold">{inv.customerName}</div>
                  <div className="text-xs text-slate-400">🧾 {inv.invoiceNumber}</div>
                </div>
                <div className="text-red-400 font-bold text-sm">{formatINR(inv.balanceDue)}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ═══ Recent Payment Receipts (linked to Received Payments page) ═══ */}
      <div className="card">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2"><CheckCircle2 size={16} className="text-green-400" /> Recent Received Payments</h3>
          <button onClick={() => navigate('/received-payments')} className="text-xs text-green-400 flex items-center gap-1">All Receipts <ArrowRight size={12} /></button>
        </div>
        {receiptSummary.recent.length === 0 ? (
          <div className="text-center text-slate-500 text-sm py-6">अभी तक कोई payment receipt नहीं</div>
        ) : (
          <div className="space-y-2">
            {receiptSummary.recent.map(r => (
              <div key={r._id} className="flex items-center justify-between p-2 rounded bg-slate-800">
                <div>
                  <div className="text-sm font-bold">{r.customerName}</div>
                  <div className="text-xs text-slate-400">
                    {r.paymentType === 'emi' ? `📅 EMI ${r.installmentLabel || ''}` : r.paymentType === 'downpayment' ? '💵 Down Payment' : '💰 Other'} • {formatDate(r.receiptDate)}
                  </div>
                </div>
                <div className="text-green-400 font-bold text-sm">{formatINR(r.amount)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ icon, label, value, sub, color, onClick }) {
  return (
    <div className="card" style={{ borderLeft: `4px solid ${color}`, cursor: onClick ? 'pointer' : 'default' }} onClick={onClick}>
      <div className="flex items-center gap-1 text-xs text-slate-400 mb-1" style={{ color }}>{icon} {label}</div>
      <div className="text-lg font-bold" style={{ color }}>{value}</div>
      {sub && <div className="text-xs text-slate-500">{sub}</div>}
    </div>
  );
}
