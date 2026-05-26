import React, { useState, useEffect } from 'react';
import { Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { api } from '../utils/apiConfig';
import { formatINR, formatDate, toISODate } from '../utils/smartUtils';

export default function ReportsAnalytics() {
  const [data, setData] = useState(null);
  const [filter, setFilter] = useState({ year: new Date().getFullYear(), month: '' });
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [dash, pnl] = await Promise.all([
        api.get('/api/dashboard', filter),
        api.get('/api/dashboard/pnl', filter)
      ]);
      setData({ ...dash, pnl });
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [filter.year, filter.month]);

  const exportReport = async () => {
    const invoices = await api.get('/api/invoices').catch(() => []);
    const ws = XLSX.utils.json_to_sheet(invoices.map(i => ({
      'Invoice No': i.invoiceNumber,
      'Date': i.invoiceDate,
      'Customer': i.customerName,
      'Mobile': i.mobileNo,
      'Vehicle': i.vehicleModel,
      'Total': i.totalAmount,
      'Subsidy': i.totalSubsidy,
      'Final': i.finalPayable,
      'Status': i.paymentStatus
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Invoices');
    XLSX.writeFile(wb, `mdautomobile-report-${toISODate(new Date())}.xlsx`);
  };

  return (
    <div className="p-4 max-w-7xl mx-auto fade-in">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-green-400">Reports & Analytics</h1>
        <div className="flex gap-2">
          <select value={filter.year} onChange={(e) => setFilter({ ...filter, year: e.target.value })}>
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={filter.month} onChange={(e) => setFilter({ ...filter, month: e.target.value })}>
            <option value="">All Months</option>
            {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{new Date(0, i).toLocaleString('default', { month: 'long' })}</option>)}
          </select>
          <button onClick={exportReport} className="btn btn-primary flex items-center gap-1"><Download size={16} /> Export</button>
        </div>
      </div>

      {loading ? <div className="text-center py-8">Loading...</div> : !data ? <div className="card text-center">No data</div> : (
        <>
          <div className="grid md:grid-cols-4 gap-3 mb-4">
            <Card label="Total Revenue" value={formatINR(data.summary?.totalRevenue)} />
            <Card label="Total Subsidy" value={formatINR(data.summary?.totalSubsidy)} />
            <Card label="Invoices" value={data.summary?.totalInvoices || 0} />
            <Card label="Estimated Profit" value={formatINR(data.pnl?.estimatedProfit)} highlight />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="card">
              <h3 className="font-semibold mb-3 text-green-400">Revenue Breakdown</h3>
              <Row label="Vehicle Sales" value={formatINR(data.pnl?.vehicleSales)} />
              <Row label="Service Revenue" value={formatINR(data.pnl?.serviceRevenue)} />
              <Row label="Parts Revenue" value={formatINR(data.pnl?.partsRevenue)} />
              <Row label="Salary Expense" value={`-${formatINR(data.pnl?.salaryExpense)}`} />
            </div>
            <div className="card">
              <h3 className="font-semibold mb-3 text-green-400">Top Models</h3>
              {(data.topModels || []).slice(0, 5).map((m, i) => (
                <div key={i} className="flex justify-between py-1">
                  <span className="text-sm">{m.model}</span>
                  <span className="text-sm text-green-400">{m.count} sold</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Card({ label, value, highlight }) {
  return <div className="card"><div className="text-xs text-slate-400">{label}</div><div className={`text-xl font-bold ${highlight ? 'text-green-400' : ''}`}>{value}</div></div>;
}

function Row({ label, value }) {
  return <div className="flex justify-between py-1 border-b border-slate-800"><span className="text-sm text-slate-400">{label}</span><span className="text-sm">{value}</span></div>;
}
