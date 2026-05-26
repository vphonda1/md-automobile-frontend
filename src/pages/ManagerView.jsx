import React, { useState, useEffect } from 'react';
import { Users, TrendingUp, Bell, AlertTriangle } from 'lucide-react';
import { api } from '../utils/apiConfig';
import { formatINR, formatDate } from '../utils/smartUtils';

export default function ManagerView() {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/api/dashboard').catch(() => null),
      api.get('/api/reminders', { upcoming: 'true' }).catch(() => []),
      api.get('/api/jobcards', { status: 'open' }).catch(() => []),
      api.get('/api/followups', { status: 'open' }).catch(() => [])
    ]).then(([d, r, j, f]) => {
      setData({ dashboard: d, reminders: r, openJobs: j, followups: f });
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="p-8 text-center text-slate-400">Loading manager view...</div>;

  return (
    <div className="p-4 max-w-7xl mx-auto fade-in">
      <h1 className="text-2xl font-bold text-green-400 mb-4">Manager Dashboard</h1>

      <div className="grid md:grid-cols-4 gap-3 mb-4">
        <KPI icon={Users} label="Customers" value={data.dashboard?.summary?.totalCustomers || 0} />
        <KPI icon={TrendingUp} label="Revenue" value={formatINR(data.dashboard?.summary?.totalRevenue)} />
        <KPI icon={Bell} label="Pending Reminders" value={data.reminders?.length || 0} />
        <KPI icon={AlertTriangle} label="Open Jobs" value={data.openJobs?.length || 0} />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card">
          <h3 className="font-semibold mb-2 text-green-400">Pending Follow-ups</h3>
          {data.followups?.length === 0 ? <div className="text-sm text-slate-500">All caught up ✅</div> :
           data.followups?.slice(0, 10).map(f => (
            <div key={f._id} className="text-sm py-1 border-b border-slate-800">
              <div className="font-medium">{f.customerName}</div>
              <div className="text-xs text-slate-400">{f.interestedModel} • {formatDate(f.followupDate)}</div>
            </div>
          ))}
        </div>

        <div className="card">
          <h3 className="font-semibold mb-2 text-green-400">Upcoming Reminders</h3>
          {data.reminders?.length === 0 ? <div className="text-sm text-slate-500">None</div> :
           data.reminders?.slice(0, 10).map(r => (
            <div key={r._id} className="text-sm py-1 border-b border-slate-800">
              <div className="font-medium">{r.title}</div>
              <div className="text-xs text-slate-400">{r.customerName} • {formatDate(r.dueDate)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function KPI({ icon: Icon, label, value }) {
  return (
    <div className="card">
      <Icon size={18} className="text-green-400 mb-1" />
      <div className="text-xs text-slate-400">{label}</div>
      <div className="text-xl font-bold">{value}</div>
    </div>
  );
}
