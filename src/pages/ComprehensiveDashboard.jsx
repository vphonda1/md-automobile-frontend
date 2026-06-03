import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from '../utils/apiConfig';
import { formatINR } from '../utils/smartUtils';

const COLORS = ['#16a34a', '#2563eb', '#f59e0b', '#dc2626', '#a855f7', '#06b6d4', '#10b981', '#f97316'];

export default function ComprehensiveDashboard() {
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [filter, setFilter] = useState({ year: new Date().getFullYear(), month: '' });

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'sales', label: 'Sales' },
    { id: 'service', label: 'Service' },
    { id: 'parts', label: 'Parts' },
    { id: 'staff', label: 'Staff' },
    { id: 'customers', label: 'Customers' },
    { id: 'inventory', label: 'Inventory' },
    { id: 'pnl', label: 'P&L' }
  ];

  useEffect(() => {
    Promise.all([
      api.get('/api/dashboard', filter).catch(() => null),
      api.get('/api/dashboard/pnl', filter).catch(() => null)
    ]).then(([d, p]) => setData({ ...d, pnl: p }));
    const i = setInterval(() => setData(d => d), 30000);
    return () => clearInterval(i);
  }, [filter.year, filter.month]);

  return (
    <div className="p-4 max-w-7xl mx-auto fade-in" style={{ paddingBottom: 100 }}>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-green-400">Analytics Dashboard</h1>
        <div className="flex gap-2">
          <select value={filter.year} onChange={(e) => setFilter({ ...filter, year: e.target.value })}>
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={filter.month} onChange={(e) => setFilter({ ...filter, month: e.target.value })}>
            <option value="">All Months</option>
            {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{new Date(0, i).toLocaleString('default', { month: 'short' })}</option>)}
          </select>
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto mb-4 pb-2">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 rounded text-sm whitespace-nowrap ${activeTab === t.id ? 'bg-green-700 text-white' : 'bg-slate-800 text-slate-400'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {!data ? <div className="text-center py-8">Loading...</div> : (
        <div className="space-y-4">
          {activeTab === 'overview' && (
            <>
              <div className="grid md:grid-cols-4 gap-3">
                <KPI label="Revenue" value={formatINR(data.summary?.totalRevenue)} />
                <KPI label="Subsidy" value={formatINR(data.summary?.totalSubsidy)} />
                <KPI label="Customers" value={data.summary?.totalCustomers || 0} />
                <KPI label="Vehicles Sold" value={data.summary?.soldVehicles || 0} />
              </div>
              {Object.keys(data.monthlyRevenue || {}).length > 0 && (
                <div className="card">
                  <h3 className="font-semibold mb-2">Monthly Revenue Trend</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={Object.entries(data.monthlyRevenue).map(([month, revenue]) => ({ month, revenue }))}>
                      <XAxis dataKey="month" stroke="#64748b" />
                      <YAxis stroke="#64748b" />
                      <Tooltip contentStyle={{ background: '#0f172a' }} />
                      <Line type="monotone" dataKey="revenue" stroke="#16a34a" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </>
          )}

          {activeTab === 'sales' && (
            <div className="card">
              <h3 className="font-semibold mb-3">Top Selling Models</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={(data.topModels || []).slice(0, 8)}>
                  <XAxis dataKey="model" stroke="#64748b" />
                  <YAxis stroke="#64748b" />
                  <Tooltip contentStyle={{ background: '#0f172a' }} />
                  <Bar dataKey="count" fill="#16a34a" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {activeTab === 'service' && (
            <div className="grid md:grid-cols-2 gap-3">
              <KPI label="Pending Job Cards" value={data.summary?.pendingJobCards || 0} />
              <KPI label="Service Revenue" value={formatINR(data.pnl?.serviceRevenue)} />
            </div>
          )}

          {activeTab === 'parts' && (
            <div className="grid md:grid-cols-2 gap-3">
              <KPI label="Low Stock Parts" value={data.summary?.lowStockParts || 0} />
              <KPI label="Parts Revenue" value={formatINR(data.pnl?.partsRevenue)} />
              <div className="card md:col-span-2">
                <h3 className="font-semibold mb-2">Low Stock Items</h3>
                {(data.lowStockParts || []).map(p => (
                  <div key={p._id} className="flex justify-between py-1 text-sm">
                    <span>{p.partName}</span>
                    <span className="text-red-400">{p.stockQuantity} / {p.minStockLevel}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'staff' && (
            <KPI label="Salary Paid" value={formatINR(data.summary?.totalSalaryPaid)} />
          )}

          {activeTab === 'customers' && (
            <KPI label="Total Customers" value={data.summary?.totalCustomers || 0} />
          )}

          {activeTab === 'inventory' && (
            <div className="grid md:grid-cols-3 gap-3">
              <KPI label="Total Vehicles" value={data.summary?.totalVehicles || 0} />
              <KPI label="In Stock" value={data.summary?.inStockVehicles || 0} />
              <KPI label="Sold" value={data.summary?.soldVehicles || 0} />
            </div>
          )}

          {activeTab === 'pnl' && data.pnl && (
            <div className="card">
              <h3 className="font-semibold mb-3 text-green-400">Profit & Loss</h3>
              <Row label="Vehicle Sales (×0.08 margin)" value={formatINR(data.pnl.vehicleSales * 0.08)} />
              <Row label="Service Revenue" value={formatINR(data.pnl.serviceRevenue)} />
              <Row label="Parts Revenue" value={formatINR(data.pnl.partsRevenue)} />
              <Row label="Salary Expense" value={`-${formatINR(data.pnl.salaryExpense)}`} />
              <div className="border-t border-green-700 mt-2 pt-2">
                <Row label="Estimated Profit" value={formatINR(data.pnl.estimatedProfit)} highlight />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function KPI({ label, value }) {
  return <div className="card"><div className="text-xs text-slate-400">{label}</div><div className="text-xl font-bold text-green-400">{value}</div></div>;
}

function Row({ label, value, highlight }) {
  return (
    <div className="flex justify-between py-1.5 border-b border-slate-800">
      <span className="text-sm text-slate-400">{label}</span>
      <span className={`text-sm ${highlight ? 'font-bold text-green-400 text-lg' : ''}`}>{value}</span>
    </div>
  );
}
