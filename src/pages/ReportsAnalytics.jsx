import React, { useState, useEffect, useMemo } from 'react';
import { Download, TrendingUp, Users, Car, FileText, IndianRupee, RefreshCw, Calendar } from 'lucide-react';
import * as XLSX from 'xlsx';
import { api } from '../utils/apiConfig';
import { formatINR, formatDate, formatDateIN } from '../utils/smartUtils';

export default function ReportsAnalytics() {
  const [customers, setCustomers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState('all'); // 'all' or 1-12

  const loadAll = async () => {
    setLoading(true);
    setError('');
    try {
      const [c, v, i] = await Promise.all([
        api.get('/api/customers').catch(() => []),
        api.get('/api/vehicles').catch(() => []),
        api.get('/api/invoices').catch(() => [])
      ]);
      setCustomers(Array.isArray(c) ? c : (c?.customers || []));
      setVehicles(Array.isArray(v) ? v : (v?.vehicles || []));
      setInvoices(Array.isArray(i) ? i : (i?.invoices || []));
    } catch (err) {
      setError('Failed to load: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  // ── Filter by year/month ──
  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const d = new Date(inv.saleDate || inv.invoiceDate || inv.createdAt);
      if (isNaN(d.getTime())) return year === 'all';
      if (year !== 'all' && d.getFullYear() !== Number(year)) return false;
      if (month !== 'all' && (d.getMonth() + 1) !== Number(month)) return false;
      return true;
    });
  }, [invoices, year, month]);

  // ── Stats ──
  const stats = useMemo(() => {
    const totalRevenue = filteredInvoices.reduce((s, i) => s + (Number(i.netAmount || i.grandTotal || i.price) || 0), 0);
    const totalSubsidy = filteredInvoices.reduce((s, i) => s + (Number(i.subsidy || i.fameSubsidy || 0) + Number(i.stateSubsidy || 0)), 0);

    // Top models
    const modelCount = {};
    filteredInvoices.forEach(inv => {
      const m = inv.vehicleModel || inv.model || 'Unknown';
      modelCount[m] = (modelCount[m] || 0) + 1;
    });
    const topModels = Object.entries(modelCount).sort((a, b) => b[1] - a[1]).slice(0, 10);

    // Monthly breakdown
    const monthlyData = {};
    filteredInvoices.forEach(inv => {
      const d = new Date(inv.saleDate || inv.invoiceDate || inv.createdAt);
      if (isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyData[key]) monthlyData[key] = { count: 0, revenue: 0, label: d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) };
      monthlyData[key].count++;
      monthlyData[key].revenue += Number(inv.netAmount || inv.grandTotal || inv.price) || 0;
    });
    const monthlySorted = Object.entries(monthlyData).sort((a, b) => a[0].localeCompare(b[0]));

    // Payment mode breakdown
    const paymentModes = {};
    filteredInvoices.forEach(inv => {
      const p = inv.paymentMode || inv.financerName || 'CASH';
      paymentModes[p] = (paymentModes[p] || 0) + 1;
    });

    // Color breakdown
    const colors = {};
    filteredInvoices.forEach(inv => {
      const c = inv.vehicleColor || inv.color || 'Unknown';
      colors[c] = (colors[c] || 0) + 1;
    });

    // Variant breakdown
    const variants = {};
    filteredInvoices.forEach(inv => {
      const v = inv.vehicleVariant || inv.variant || 'Unknown';
      variants[v] = (variants[v] || 0) + 1;
    });

    return {
      totalRevenue,
      totalSubsidy,
      estimatedProfit: Math.round(totalRevenue * 0.08), // assume 8% margin
      invoicesCount: filteredInvoices.length,
      customersCount: customers.length,
      vehiclesSold: vehicles.filter(v => v.status === 'sold').length,
      vehiclesInStock: vehicles.filter(v => v.status !== 'sold' && v.status !== 'cancelled').length,
      topModels,
      monthlySorted,
      paymentModes,
      colors,
      variants
    };
  }, [filteredInvoices, customers, vehicles]);

  // ── Export to Excel ──
  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();
    const data = filteredInvoices.map(inv => ({
      'Invoice No': inv.invoiceNo || inv.invoiceNumber || inv.serialNo,
      'Date': formatDate(inv.saleDate || inv.invoiceDate),
      'Customer': inv.customerName,
      'Mobile': inv.customerMobile || inv.mobile,
      'Vehicle': inv.vehicleModel,
      'Variant': inv.vehicleVariant,
      'Color': inv.vehicleColor,
      'Chassis': inv.chassisNo,
      'Motor': inv.motorNo,
      'Payment Mode': inv.paymentMode,
      'Price': inv.price || 0,
      'Discount': inv.discount || 0,
      'Net Amount': inv.netAmount || inv.grandTotal || inv.price || 0
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Invoices');
    XLSX.writeFile(wb, `MD_Automobile_Report_${year}_${month}.xlsx`);
  };

  // ── Styles ──
  const S = {
    wrap: { padding: 12, color: 'white', minHeight: '100vh', background: '#020617', paddingBottom: 100 },
    head: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 },
    title: { color: '#16a34a', fontSize: 22, fontWeight: 'bold', margin: 0 },
    filterBar: { display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' },
    select: { background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, padding: '8px 12px', color: 'white', fontSize: 13 },
    btn: { background: '#16a34a', color: 'white', border: 'none', padding: '8px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 },
    statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 16 },
    statCard: { background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: 14 },
    statLabel: { color: '#94a3b8', fontSize: 11, textTransform: 'uppercase', marginBottom: 4 },
    statValue: { color: '#16a34a', fontSize: 22, fontWeight: 'bold' },
    section: { background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: 14, marginBottom: 12 },
    sectionTitle: { color: '#fde68a', fontSize: 14, fontWeight: 'bold', marginTop: 0, marginBottom: 12 },
    row: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #1e293b', fontSize: 13 },
    bar: { background: '#1e293b', height: 6, borderRadius: 3, marginTop: 4, overflow: 'hidden' },
    barFill: { background: '#16a34a', height: '100%' }
  };

  const months = ['', 'जनवरी', 'फरवरी', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर'];
  const years = [2024, 2025, 2026, 2027];

  return (
    <div style={S.wrap}>
      <div style={S.head}>
        <h1 style={S.title}>📊 Reports & Analytics</h1>
        <div style={{ display: 'flex', gap: 6 }}>
          <button style={S.btn} onClick={loadAll}><RefreshCw size={14} /></button>
          <button style={S.btn} onClick={exportToExcel}><Download size={14} /> Excel</button>
        </div>
      </div>

      {/* Filter bar */}
      <div style={S.filterBar}>
        <select style={S.select} value={year} onChange={(e) => setYear(e.target.value)}>
          <option value="all">सब Years</option>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select style={S.select} value={month} onChange={(e) => setMonth(e.target.value)}>
          <option value="all">All Months</option>
          {months.slice(1).map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
        </select>
      </div>

      {loading && <p style={{ color: '#16a34a' }}>⏳ Loading...</p>}
      {error && <div style={{ background: '#7f1d1d', color: '#fca5a5', padding: 10, borderRadius: 8 }}>{error}</div>}

      {/* Top stats */}
      <div style={S.statsGrid}>
        <div style={S.statCard}>
          <div style={S.statLabel}>💰 Total Revenue</div>
          <div style={S.statValue}>{formatINR(stats.totalRevenue)}</div>
        </div>
        <div style={S.statCard}>
          <div style={S.statLabel}>📄 Invoices</div>
          <div style={S.statValue}>{stats.invoicesCount}</div>
        </div>
        <div style={S.statCard}>
          <div style={S.statLabel}>👤 Customers</div>
          <div style={S.statValue}>{stats.customersCount}</div>
        </div>
        <div style={S.statCard}>
          <div style={S.statLabel}>🛵 Vehicles Sold</div>
          <div style={S.statValue}>{stats.vehiclesSold}</div>
        </div>
        <div style={S.statCard}>
          <div style={S.statLabel}>📦 In Stock</div>
          <div style={{ ...S.statValue, color: '#fbbf24' }}>{stats.vehiclesInStock}</div>
        </div>
        <div style={S.statCard}>
          <div style={S.statLabel}>💸 Est. Profit (8%)</div>
          <div style={{ ...S.statValue, color: '#2563eb' }}>{formatINR(stats.estimatedProfit)}</div>
        </div>
      </div>

      {/* Top Models */}
      <div style={S.section}>
        <h3 style={S.sectionTitle}>🏆 Top Models {month !== 'all' && `(${months[month]})`}</h3>
        {stats.topModels.length === 0 ? (
          <p style={{ color: '#94a3b8', fontSize: 13 }}>No data</p>
        ) : (
          stats.topModels.map(([model, count]) => (
            <div key={model}>
              <div style={S.row}>
                <span>{model}</span>
                <span style={{ color: '#16a34a', fontWeight: 'bold' }}>{count} sold</span>
              </div>
              <div style={S.bar}>
                <div style={{ ...S.barFill, width: `${(count / stats.topModels[0][1]) * 100}%` }} />
              </div>
            </div>
          ))
        )}
      </div>

      {/* Monthly breakdown */}
      <div style={S.section}>
        <h3 style={S.sectionTitle}>📅 Monthly Breakdown</h3>
        {stats.monthlySorted.length === 0 ? (
          <p style={{ color: '#94a3b8', fontSize: 13 }}>No data</p>
        ) : (
          stats.monthlySorted.map(([key, data]) => (
            <div key={key} style={S.row}>
              <span>{data.label}</span>
              <div style={{ textAlign: 'right' }}>
                <div style={{ color: '#16a34a', fontWeight: 'bold' }}>{formatINR(data.revenue)}</div>
                <div style={{ color: '#94a3b8', fontSize: 11 }}>{data.count} sales</div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Payment Modes */}
      <div style={S.section}>
        <h3 style={S.sectionTitle}>💳 Payment Modes</h3>
        {Object.entries(stats.paymentModes).map(([mode, count]) => (
          <div key={mode} style={S.row}>
            <span>{mode}</span>
            <span style={{ color: '#16a34a', fontWeight: 'bold' }}>{count} ({Math.round((count / stats.invoicesCount) * 100)}%)</span>
          </div>
        ))}
      </div>

      {/* Variants */}
      <div style={S.section}>
        <h3 style={S.sectionTitle}>⚡ Variants</h3>
        {Object.entries(stats.variants).map(([variant, count]) => (
          <div key={variant} style={S.row}>
            <span>{variant}</span>
            <span style={{ color: '#16a34a', fontWeight: 'bold' }}>{count}</span>
          </div>
        ))}
      </div>

      {/* Colors */}
      <div style={S.section}>
        <h3 style={S.sectionTitle}>🎨 Colors</h3>
        {Object.entries(stats.colors).map(([color, count]) => (
          <div key={color} style={S.row}>
            <span>{color}</span>
            <span style={{ color: '#16a34a', fontWeight: 'bold' }}>{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
