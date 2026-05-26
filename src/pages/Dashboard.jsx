import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, Car, FileText, Wrench, Battery, AlertTriangle,
  TrendingUp, DollarSign, Receipt, Bell, Calendar, Search
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { api, MD_CONFIG } from '../utils/apiConfig';
import { formatINR } from '../utils/smartUtils';
import UniversalSearch from '../components/UniversalSearch';

const COLORS = ['#16a34a', '#2563eb', '#f59e0b', '#dc2626', '#a855f7', '#06b6d4'];

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSearch, setShowSearch] = useState(false);
  const [filter, setFilter] = useState({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [dash, rems] = await Promise.all([
        api.get('/api/dashboard', filter).catch(() => null),
        api.get('/api/reminders', { upcoming: 'true' }).catch(() => [])
      ]);
      setData(dash);
      setReminders(rems.slice(0, 5));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000); // auto-refresh every 30s
    return () => clearInterval(interval);
  }, [filter.year, filter.month]);

  if (loading && !data) {
    return <div className="p-8 text-center text-slate-400">Loading dashboard...</div>;
  }

  const s = data?.summary || {};
  const kpis = [
    { label: 'Total Customers', value: s.totalCustomers || 0, icon: Users, color: 'green', link: '/customers' },
    { label: 'Vehicles Sold', value: s.soldVehicles || 0, icon: Car, color: 'blue', link: '/vehicles' },
    { label: 'In Stock', value: s.inStockVehicles || 0, icon: Battery, color: 'yellow', link: '/vehicles' },
    { label: 'Total Revenue', value: formatINR(s.totalRevenue), icon: DollarSign, color: 'green', link: '/reports' },
    { label: 'Govt Subsidy', value: formatINR(s.totalSubsidy), icon: TrendingUp, color: 'blue', link: '/invoices' },
    { label: 'Pending Jobs', value: s.pendingJobCards || 0, icon: Wrench, color: 'yellow', link: '/jobcards' },
    { label: 'Low Stock', value: s.lowStockParts || 0, icon: AlertTriangle, color: 'red', link: '/parts' },
    { label: 'Salary Paid', value: formatINR(s.totalSalaryPaid), icon: Receipt, color: 'blue', link: '/salary' }
  ];

  const monthlyData = Object.entries(data?.monthlyRevenue || {}).map(([month, revenue]) => ({ month, revenue }));
  const topModels = data?.topModels || [];

  return (
    <div className="p-4 max-w-7xl mx-auto fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-green-400">Dashboard</h1>
          <p className="text-xs text-slate-400">{MD_CONFIG.brandName} • Auto-refresh every 30s</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <select value={filter.year} onChange={(e) => setFilter({ ...filter, year: e.target.value })} className="w-auto">
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={filter.month} onChange={(e) => setFilter({ ...filter, month: e.target.value })} className="w-auto">
            <option value="">All Months</option>
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>{new Date(0, i).toLocaleString('default', { month: 'long' })}</option>
            ))}
          </select>
          <button onClick={() => setShowSearch(true)} className="btn btn-ghost flex items-center gap-2">
            <Search size={16} /> <span className="hidden sm:inline">Search</span>
          </button>
        </div>
      </div>

      {/* Ticker */}
      <div className="overflow-hidden bg-slate-900 border border-green-700 rounded-lg mb-4 py-2">
        <div className="ticker whitespace-nowrap text-sm text-green-400">
          ⚡ MD Automobile — Going Green Together! • 🔋 Battery, Motor, Controller — 1 year warranty • 💰 FAME-II subsidy available • 🌱 Zero emission • Service every 5000 km •
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {kpis.map((kpi, i) => (
          <Link key={i} to={kpi.link} className="card card-hover">
            <div className="flex items-center justify-between mb-2">
              <kpi.icon size={20} className={`text-${kpi.color}-400`} />
              <span className="text-xs text-slate-500">View →</span>
            </div>
            <div className="text-xl font-bold">{kpi.value}</div>
            <div className="text-xs text-slate-400">{kpi.label}</div>
          </Link>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid md:grid-cols-2 gap-4 mb-4">
        <div className="card">
          <h3 className="font-semibold mb-2">Monthly Revenue</h3>
          {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={monthlyData}>
                <XAxis dataKey="month" stroke="#64748b" fontSize={10} />
                <YAxis stroke="#64748b" fontSize={10} />
                <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155' }} />
                <Line type="monotone" dataKey="revenue" stroke="#16a34a" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-slate-500 text-sm">No data yet</div>
          )}
        </div>

        <div className="card">
          <h3 className="font-semibold mb-2">Top Selling Models</h3>
          {topModels.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={topModels.slice(0, 5)}>
                <XAxis dataKey="model" stroke="#64748b" fontSize={10} />
                <YAxis stroke="#64748b" fontSize={10} />
                <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155' }} />
                <Bar dataKey="count" fill="#2563eb" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-slate-500 text-sm">No data yet</div>
          )}
        </div>
      </div>

      {/* Reminders + Quick links */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold flex items-center gap-2"><Bell size={16} /> Upcoming Reminders</h3>
            <Link to="/reminders" className="text-xs text-green-400">View all →</Link>
          </div>
          {reminders.length === 0 ? (
            <div className="text-sm text-slate-500">No upcoming reminders</div>
          ) : (
            <div className="space-y-2">
              {reminders.map(r => (
                <div key={r._id} className="flex items-start gap-2 p-2 bg-slate-800/50 rounded">
                  <div className="text-xs px-2 py-0.5 rounded bg-green-900 text-green-300">{r.type}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">{r.title}</div>
                    <div className="text-xs text-slate-400">{r.customerName} • {r.dueDate}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h3 className="font-semibold mb-3">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-2">
            <Link to="/customers/new" className="btn btn-primary text-sm">+ New Customer</Link>
            <Link to="/invoices" className="btn btn-secondary text-sm">+ New Invoice</Link>
            <Link to="/jobcards" className="btn btn-ghost text-sm">+ Job Card</Link>
            <Link to="/quotations" className="btn btn-ghost text-sm">+ Quotation</Link>
            <Link to="/reminders" className="btn btn-ghost text-sm">+ Reminder</Link>
            <Link to="/chat" className="btn btn-ghost text-sm">Team Chat</Link>
          </div>
        </div>
      </div>

      {showSearch && <UniversalSearch onClose={() => setShowSearch(false)} />}
    </div>
  );
}
