import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Car, FileText, IndianRupee, AlertTriangle, Wrench, Battery, TrendingUp, RefreshCw, Zap, Calendar, CheckCircle, Package } from 'lucide-react';
import { api } from '../utils/apiConfig';
import { formatINR, formatDate } from '../utils/smartUtils';

export default function Dashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState({ customers: [], vehicles: [], invoices: [], jobcards: [], parts: [], emis: [] });
  const [loading, setLoading] = useState(false);
  const [diagnostic, setDiagnostic] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [recomputing, setRecomputing] = useState(false);
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const [bulkPrices, setBulkPrices] = useState({});

  const load = async () => {
    setLoading(true);
    try {
      const [c, v, i, j, p, e, diag] = await Promise.all([
        api.get('/api/customers').catch(() => []),
        api.get('/api/vehicles').catch(() => []),
        api.get('/api/invoices').catch(() => []),
        api.get('/api/jobcards').catch(() => []),
        api.get('/api/parts').catch(() => []),
        api.get('/api/emis').catch(() => []),
        api.get('/api/admin/diagnostic').catch(() => null)
      ]);
      setData({
        customers: Array.isArray(c) ? c : (c?.customers || []),
        vehicles: Array.isArray(v) ? v : (v?.vehicles || []),
        invoices: Array.isArray(i) ? i : (i?.invoices || []),
        jobcards: Array.isArray(j) ? j : (j?.jobcards || []),
        parts: Array.isArray(p) ? p : (p?.parts || []),
        emis: Array.isArray(e) ? e : (e?.emis || [])
      });
      setDiagnostic(diag);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSync = async () => {
    if (!confirm('🔄 Sync All\n\nयह सब "sold" vehicles के लिए invoice बनाएगा जिनकी अभी invoice नहीं है।\n\nContinue?')) return;
    setSyncing(true);
    setSyncResult(null);
    try {
      const result = await api.post('/api/admin/sync-invoices-from-vehicles');
      setSyncResult(result);
      setTimeout(() => load(), 500);
    } catch (err) {
      alert('❌ Sync failed: ' + err.message);
    } finally {
      setSyncing(false);
    }
  };

  const handleRecomputePrices = async () => {
    if (!confirm('💰 Recompute Prices\n\nजो invoices में price ₹0 है, उनके लिए customer + vehicle data से auto-derive करेगा।\n\nContinue?')) return;
    setRecomputing(true);
    try {
      const result = await api.post('/api/admin/recompute-prices');
      const stillZero = result.stillZero?.length || 0;
      alert(`✅ Prices Recomputed!\n\n${result.updated} invoices updated\n${result.skipped} already had prices\n${stillZero} still need manual entry`);
      load();
      if (stillZero > 0) {
        if (confirm(`${stillZero} invoices को manual price entry चाहिए। अभी Bulk Edit खोलें?`)) {
          openBulkEdit();
        }
      }
    } catch (err) {
      alert('❌ Recompute failed: ' + err.message);
    } finally {
      setRecomputing(false);
    }
  };

  const openBulkEdit = () => {
    const initial = {};
    data.invoices.forEach(inv => {
      initial[inv._id] = inv.netAmount || inv.grandTotal || inv.price || '';
    });
    setBulkPrices(initial);
    setShowBulkEdit(true);
  };

  const saveBulkPrices = async () => {
    const updates = Object.entries(bulkPrices)
      .filter(([id, price]) => price && Number(price) > 0)
      .map(([invoiceId, price]) => ({ invoiceId, price: Number(price) }));
    if (updates.length === 0) { alert('कोई valid price entry नहीं'); return; }
    try {
      const result = await api.post('/api/admin/bulk-update-prices', { updates });
      alert(`✅ ${result.updated} invoices update हो गई`);
      setShowBulkEdit(false);
      load();
    } catch (err) {
      alert('❌ Save failed: ' + err.message);
    }
  };

  // ── Compute stats from real data ──
  const stats = useMemo(() => {
    const totalRevenue = data.invoices.reduce((s, i) => s + (Number(i.netAmount || i.grandTotal || i.price) || 0), 0);
    const totalSubsidy = data.invoices.reduce((s, i) => s + (Number(i.fameSubsidy || 0) + Number(i.stateSubsidy || 0)), 0);
    const vehiclesSold = data.vehicles.filter(v => v.status === 'sold').length;
    const inStock = data.vehicles.filter(v => v.status !== 'sold' && v.status !== 'cancelled').length;
    const pendingJobs = data.jobcards.filter(j => j.status !== 'completed' && j.status !== 'cancelled').length;
    const lowStock = data.parts.filter(p => Number(p.stock || 0) < (Number(p.minStock || 5))).length;
    const activeEmis = data.emis.filter(e => e.status === 'active' || !e.status).length;
    const monthlyEmiCollection = data.emis.filter(e => e.status === 'active' || !e.status).reduce((s, e) => s + (Number(e.emiAmount) || 0), 0);

    // Monthly breakdown
    const monthlyMap = {};
    data.invoices.forEach(inv => {
      const d = new Date(inv.saleDate || inv.invoiceDate || inv.createdAt);
      if (isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyMap[key]) monthlyMap[key] = { revenue: 0, count: 0, label: d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }) };
      monthlyMap[key].revenue += Number(inv.netAmount || inv.grandTotal || inv.price) || 0;
      monthlyMap[key].count++;
    });
    const monthly = Object.entries(monthlyMap).sort((a, b) => a[0].localeCompare(b[0])).slice(-6);

    // Recent invoices (last 5)
    const recentInvoices = [...data.invoices]
      .sort((a, b) => new Date(b.saleDate || b.createdAt) - new Date(a.saleDate || a.createdAt))
      .slice(0, 5);

    // Inconsistency check
    const inconsistency = vehiclesSold - data.invoices.length;

    return { totalRevenue, totalSubsidy, vehiclesSold, inStock, pendingJobs, lowStock, activeEmis, monthlyEmiCollection, monthly, recentInvoices, inconsistency };
  }, [data]);

  // ── Styles ──
  const S = {
    wrap: { padding: 12, color: 'white', minHeight: '100vh', background: '#020617', paddingBottom: 100 },
    head: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    title: { color: '#16a34a', fontSize: 20, fontWeight: 'bold', margin: 0 },
    btnGroup: { display: 'flex', gap: 6 },
    btn: { background: '#16a34a', color: 'white', border: 'none', padding: '8px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, fontWeight: 'bold' },
    warning: { background: '#451a03', border: '1px solid #d97706', borderRadius: 12, padding: 12, marginBottom: 12 },
    statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 12 },
    statCard: (color) => ({ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: 14, cursor: 'pointer', transition: 'transform 0.1s' }),
    statIcon: { fontSize: 18 },
    statValue: (color) => ({ color: color || '#16a34a', fontSize: 24, fontWeight: 'bold', marginTop: 6 }),
    statLabel: { color: '#94a3b8', fontSize: 11, marginTop: 2 },
    section: { background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: 14, marginBottom: 12 },
    sectionTitle: { color: '#fde68a', fontSize: 14, fontWeight: 'bold', marginTop: 0, marginBottom: 12 },
    barRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', fontSize: 13 },
    bar: { background: '#1e293b', height: 5, borderRadius: 3, marginTop: 3, overflow: 'hidden' },
    barFill: { background: '#16a34a', height: '100%' },
    recentItem: { padding: 10, background: '#020617', borderRadius: 8, marginBottom: 6, fontSize: 12 }
  };

  const navTo = (path) => navigate(path);
  const maxRevenue = Math.max(1, ...stats.monthly.map(([, d]) => d.revenue));

  return (
    <div style={S.wrap}>
      <div style={S.head}>
        <h1 style={S.title}>🏠 Dashboard</h1>
        <div style={S.btnGroup}>
          <button style={{ ...S.btn, background: '#1e293b' }} onClick={load} title="Refresh">
            <RefreshCw size={14} />
          </button>
          <button style={{ ...S.btn, background: '#d97706' }} onClick={handleRecomputePrices} disabled={recomputing} title="Auto-fill missing prices">
            <IndianRupee size={14} /> {recomputing ? '...' : 'Prices'}
          </button>
          <button style={{ ...S.btn, background: stats.inconsistency > 0 ? '#dc2626' : '#7c3aed' }} onClick={handleSync} disabled={syncing}>
            <Zap size={14} /> {syncing ? '...' : 'Sync'}
          </button>
        </div>
      </div>

      {/* Zero Price Warning */}
      {(() => {
        const zeroPriceInvoices = data.invoices.filter(i => !i.netAmount && !i.grandTotal && !i.price);
        if (zeroPriceInvoices.length === 0) return null;
        return (
          <div style={{ ...S.warning, background: '#451a03', border: '1px solid #d97706' }}>
            <div style={{ color: '#fbbf24', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 6 }}>
              <AlertTriangle size={16} /> Price Missing!
            </div>
            <div style={{ color: '#e2e8f0', fontSize: 12, marginTop: 6 }}>
              <b>{zeroPriceInvoices.length}</b> invoices में Grand Total ₹0 है (Excel में price column खाली था)।
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              <button style={{ ...S.btn, background: '#d97706', flex: 1, justifyContent: 'center' }} onClick={handleRecomputePrices} disabled={recomputing}>
                💰 Auto-Fill from Data
              </button>
              <button style={{ ...S.btn, background: '#2563eb', flex: 1, justifyContent: 'center' }} onClick={openBulkEdit}>
                ✏️ Bulk Edit
              </button>
            </div>
          </div>
        );
      })()}

      {/* Bulk Price Edit Modal */}
      {showBulkEdit && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 100, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 12, overflowY: 'auto' }} onClick={() => setShowBulkEdit(false)}>
          <div style={{ background: '#0f172a', borderRadius: 12, padding: 16, width: '100%', maxWidth: 600, marginTop: 20 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <h3 style={{ color: '#16a34a', margin: 0 }}>✏️ Bulk Edit Prices</h3>
              <button style={{ background: 'transparent', border: 'none', color: 'white', fontSize: 20, cursor: 'pointer' }} onClick={() => setShowBulkEdit(false)}>×</button>
            </div>
            <p style={{ color: '#94a3b8', fontSize: 12, marginTop: 0 }}>हर invoice का Grand Total enter करें और Save दबाएं</p>
            <div style={{ maxHeight: '60vh', overflowY: 'auto', marginBottom: 12 }}>
              {data.invoices.map(inv => (
                <div key={inv._id} style={{ background: '#020617', padding: 10, marginBottom: 6, borderRadius: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 'bold' }}>{inv.customerName}</div>
                  <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 6 }}>
                    {inv.invoiceNo || inv.invoiceNumber} · {inv.vehicleModel} · {inv.vehicleColor}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: '#94a3b8' }}>₹</span>
                    <input
                      type="number"
                      placeholder="Grand Total"
                      value={bulkPrices[inv._id] || ''}
                      onChange={(e) => setBulkPrices({ ...bulkPrices, [inv._id]: e.target.value })}
                      style={{ flex: 1, background: '#0f172a', border: '1px solid #1e293b', borderRadius: 6, padding: 8, color: 'white', fontSize: 14, fontWeight: 'bold' }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <button style={{ ...S.btn, width: '100%', padding: 12, justifyContent: 'center', background: '#16a34a' }} onClick={saveBulkPrices}>
              💾 Save All Prices
            </button>
          </div>
        </div>
      )}

      {/* Inconsistency Warning */}
      {stats.inconsistency > 0 && (
        <div style={S.warning}>
          <div style={{ color: '#fbbf24', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 6 }}>
            <AlertTriangle size={16} /> Data Mismatch Detected!
          </div>
          <div style={{ color: '#e2e8f0', fontSize: 12, marginTop: 6 }}>
            <b>{stats.vehiclesSold}</b> vehicles sold पर सिर्फ <b>{data.invoices.length}</b> invoices हैं। <b>{stats.inconsistency} invoices missing</b> हैं।
          </div>
          <button style={{ ...S.btn, background: '#dc2626', marginTop: 8, width: '100%', justifyContent: 'center' }} onClick={handleSync} disabled={syncing}>
            <Zap size={14} /> {syncing ? 'Syncing...' : `${stats.inconsistency} Missing Invoices बनाएं`}
          </button>
        </div>
      )}

      {/* Sync result */}
      {syncResult && (
        <div style={{ background: '#14532d', border: '1px solid #16a34a', borderRadius: 12, padding: 12, marginBottom: 12 }}>
          <div style={{ color: '#86efac', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 6 }}>
            <CheckCircle size={16} /> Sync Complete!
          </div>
          <div style={{ color: '#e2e8f0', fontSize: 12, marginTop: 4 }}>
            ✅ {syncResult.created} new invoices created · {syncResult.alreadyExists} already existed
            {syncResult.errors?.length > 0 && ` · ⚠️ ${syncResult.errors.length} errors`}
          </div>
        </div>
      )}

      {/* Top Stats Grid */}
      <div style={S.statsGrid}>
        <div style={S.statCard()} onClick={() => navTo('/customers')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Users size={16} color="#16a34a" /><span style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase' }}>Customers</span>
          </div>
          <div style={S.statValue('#16a34a')}>{data.customers.length}</div>
          <div style={S.statLabel}>👉 Tap to view</div>
        </div>

        <div style={S.statCard()} onClick={() => navTo('/vehicles')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Car size={16} color="#16a34a" /><span style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase' }}>Vehicles Sold</span>
          </div>
          <div style={S.statValue('#16a34a')}>{stats.vehiclesSold}</div>
          <div style={S.statLabel}>📦 {stats.inStock} in stock</div>
        </div>

        <div style={S.statCard()} onClick={() => navTo('/invoices')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <FileText size={16} color="#16a34a" /><span style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase' }}>Invoices</span>
          </div>
          <div style={S.statValue('#16a34a')}>{data.invoices.length}</div>
          <div style={S.statLabel}>👉 View all</div>
        </div>

        <div style={S.statCard()} onClick={() => navTo('/reports')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <IndianRupee size={16} color="#16a34a" /><span style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase' }}>Revenue</span>
          </div>
          <div style={{ ...S.statValue('#16a34a'), fontSize: 18 }}>{formatINR(stats.totalRevenue)}</div>
          <div style={S.statLabel}>📊 See reports</div>
        </div>

        <div style={S.statCard()} onClick={() => navTo('/calendar')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Calendar size={16} color="#2563eb" /><span style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase' }}>Active EMIs</span>
          </div>
          <div style={S.statValue('#2563eb')}>{stats.activeEmis}</div>
          <div style={S.statLabel}>💰 {formatINR(stats.monthlyEmiCollection)}/mo</div>
        </div>

        <div style={S.statCard()} onClick={() => navTo('/jobcards')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Wrench size={16} color="#fbbf24" /><span style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase' }}>Pending Jobs</span>
          </div>
          <div style={S.statValue('#fbbf24')}>{stats.pendingJobs}</div>
          <div style={S.statLabel}>🔧 Service</div>
        </div>

        <div style={S.statCard()} onClick={() => navTo('/parts')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Package size={16} color="#dc2626" /><span style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase' }}>Low Stock</span>
          </div>
          <div style={S.statValue('#dc2626')}>{stats.lowStock}</div>
          <div style={S.statLabel}>⚠️ Reorder</div>
        </div>

        <div style={S.statCard()} onClick={() => navTo('/reports')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <TrendingUp size={16} color="#2563eb" /><span style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase' }}>Est. Profit</span>
          </div>
          <div style={{ ...S.statValue('#2563eb'), fontSize: 18 }}>{formatINR(Math.round(stats.totalRevenue * 0.08))}</div>
          <div style={S.statLabel}>📈 8% margin</div>
        </div>
      </div>

      {/* Monthly Revenue Chart */}
      <div style={S.section}>
        <h3 style={S.sectionTitle}>📅 Monthly Revenue (Last 6 months)</h3>
        {stats.monthly.length === 0 ? (
          <p style={{ color: '#94a3b8', fontSize: 13 }}>No invoice data yet</p>
        ) : stats.monthly.map(([key, m]) => (
          <div key={key}>
            <div style={S.barRow}>
              <span>{m.label}</span>
              <span style={{ color: '#16a34a', fontWeight: 'bold' }}>{formatINR(m.revenue)} <span style={{ color: '#94a3b8', fontSize: 11 }}>({m.count})</span></span>
            </div>
            <div style={S.bar}><div style={{ ...S.barFill, width: `${(m.revenue / maxRevenue) * 100}%` }} /></div>
          </div>
        ))}
      </div>

      {/* Recent Invoices */}
      <div style={S.section}>
        <h3 style={S.sectionTitle}>🧾 Recent Invoices</h3>
        {stats.recentInvoices.length === 0 ? (
          <p style={{ color: '#94a3b8', fontSize: 13 }}>No invoices yet. <span style={{ color: '#16a34a', cursor: 'pointer' }} onClick={() => navTo('/tax-invoice')}>+ Create one</span></p>
        ) : stats.recentInvoices.map(inv => (
          <div key={inv._id} style={S.recentItem} onClick={() => navTo(`/tax-invoice?id=${inv._id}`)}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 'bold' }}>{inv.customerName}</div>
                <div style={{ color: '#94a3b8', fontSize: 11 }}>{inv.invoiceNo || inv.invoiceNumber} · {inv.vehicleModel}</div>
              </div>
              <div style={{ color: '#16a34a', fontWeight: 'bold' }}>{formatINR(inv.netAmount || inv.price || 0)}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Diagnostic info */}
      {diagnostic && (
        <details style={S.section}>
          <summary style={{ color: '#94a3b8', cursor: 'pointer', fontSize: 12 }}>🔍 Diagnostic (DB counts)</summary>
          <pre style={{ color: '#64748b', fontSize: 10, marginTop: 8, overflow: 'auto' }}>{JSON.stringify(diagnostic, null, 2)}</pre>
        </details>
      )}
    </div>
  );
}
