import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, MessageCircle, Eye, Trash2, Printer, RefreshCw, FileText, Filter } from 'lucide-react';
import { api } from '../utils/apiConfig';
import { formatDate, formatINR, shareInvoiceWhatsApp } from '../utils/smartUtils';

export default function InvoiceManagement() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [actionMenuId, setActionMenuId] = useState(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.get('/api/invoices');
      const list = Array.isArray(data) ? data : (data?.invoices || []);
      // Sort by date desc
      list.sort((a, b) => new Date(b.saleDate || b.invoiceDate || b.createdAt) - new Date(a.saleDate || a.invoiceDate || a.createdAt));
      setInvoices(list);
    } catch (err) {
      setError('Failed to load: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // Filtered invoices
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return invoices.filter(inv => {
      // Status filter
      if (statusFilter !== 'all' && (inv.status || 'paid') !== statusFilter) return false;
      // Search filter
      if (!q) return true;
      return (
        String(inv.customerName || '').toLowerCase().includes(q) ||
        String(inv.invoiceNo || inv.serialNo || '').toLowerCase().includes(q) ||
        String(inv.vehicleModel || inv.model || '').toLowerCase().includes(q) ||
        String(inv.chassisNo || '').toLowerCase().includes(q) ||
        String(inv.customerMobile || inv.mobile || '').includes(q)
      );
    });
  }, [invoices, search, statusFilter]);

  // Stats
  const stats = useMemo(() => ({
    total: invoices.length,
    paid: invoices.filter(i => (i.status || 'paid') === 'paid').length,
    pending: invoices.filter(i => i.status === 'pending').length,
    totalRevenue: invoices.reduce((sum, i) => sum + (Number(i.netAmount || i.grandTotal || i.price) || 0), 0)
  }), [invoices]);

  // ── Handlers ──
  const handleView = (inv) => {
    navigate(`/tax-invoice?id=${inv._id}`);
    setActionMenuId(null);
  };

  const handleWhatsApp = (inv) => {
    setActionMenuId(null);
    if (!inv.customerMobile && !inv.mobile) {
      alert('❌ इस customer का mobile नंबर नहीं है');
      return;
    }
    shareInvoiceWhatsApp({
      customerName: inv.customerName,
      customerPhone: inv.customerMobile || inv.mobile,
      mobile: inv.customerMobile || inv.mobile,
      invoiceNumber: inv.invoiceNo || inv.serialNo,
      invoiceNo: inv.invoiceNo || inv.serialNo,
      invoiceDate: inv.invoiceDate || inv.saleDate,
      saleDate: inv.saleDate || inv.invoiceDate,
      vehicleModel: inv.vehicleModel || inv.model,
      color: inv.vehicleColor || inv.color,
      chassisNo: inv.chassisNo,
      price: inv.netAmount || inv.grandTotal || inv.price,
      netAmount: inv.netAmount || inv.grandTotal || inv.price
    });
  };

  const handleDelete = async (inv) => {
    setActionMenuId(null);
    if (!confirm(`Delete invoice ${inv.invoiceNo || 'this'}?\nयह action वापस नहीं हो सकेगा।`)) return;
    try {
      await api.delete(`/api/invoices/${inv._id}`);
      load();
    } catch (err) {
      alert('❌ Delete failed: ' + err.message);
    }
  };

  // Close action menu on outside click
  useEffect(() => {
    const onClick = () => setActionMenuId(null);
    if (actionMenuId) {
      document.addEventListener('click', onClick);
      return () => document.removeEventListener('click', onClick);
    }
  }, [actionMenuId]);

  // ── Styles ──
  const S = {
    wrap: { padding: 12, color: 'white', minHeight: '100vh', background: '#020617', paddingBottom: 80 },
    head: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    title: { color: '#16a34a', fontSize: 22, fontWeight: 'bold', margin: 0 },
    btn: { background: '#16a34a', color: 'white', border: 'none', padding: '10px 16px', borderRadius: 8, cursor: 'pointer', fontWeight: 'bold', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 },
    statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 12 },
    stat: { background: '#0f172a', borderRadius: 10, padding: 10, textAlign: 'center' },
    statN: { color: '#16a34a', fontSize: 18, fontWeight: 'bold' },
    statL: { color: '#94a3b8', fontSize: 10, marginTop: 2 },
    searchBox: { display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' },
    input: { flex: 1, background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, padding: '10px 12px', color: 'white', fontSize: 13 },
    select: { background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, padding: '10px 12px', color: 'white', fontSize: 13 },
    card: { background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: 14, marginBottom: 10, position: 'relative' },
    badge: { fontSize: 10, padding: '2px 8px', borderRadius: 4, fontWeight: 'bold', display: 'inline-block' },
    actionBtn: { background: '#1e293b', color: 'white', border: 'none', padding: '6px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }
  };

  const statusColor = (s) => {
    if (s === 'paid') return { bg: '#14532d', color: '#86efac' };
    if (s === 'pending') return { bg: '#451a03', color: '#fbbf24' };
    if (s === 'cancelled') return { bg: '#7f1d1d', color: '#fca5a5' };
    return { bg: '#1e293b', color: '#94a3b8' };
  };

  return (
    <div style={S.wrap}>
      <div style={S.head}>
        <h1 style={S.title}>🧾 Invoices ({filtered.length})</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={S.btn} onClick={load} title="Refresh">
            <RefreshCw size={14} />
          </button>
          <button style={S.btn} onClick={() => navigate('/tax-invoice')}>
            <Plus size={16} /> New Invoice
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={S.statsGrid}>
        <div style={S.stat}>
          <div style={S.statN}>{stats.total}</div>
          <div style={S.statL}>Total</div>
        </div>
        <div style={S.stat}>
          <div style={{ ...S.statN, color: '#86efac' }}>{stats.paid}</div>
          <div style={S.statL}>Paid</div>
        </div>
        <div style={S.stat}>
          <div style={{ ...S.statN, color: '#fbbf24' }}>{stats.pending}</div>
          <div style={S.statL}>Pending</div>
        </div>
        <div style={S.stat}>
          <div style={{ ...S.statN, fontSize: 14 }}>{formatINR(stats.totalRevenue)}</div>
          <div style={S.statL}>Revenue</div>
        </div>
      </div>

      {/* Search + Filter */}
      <div style={S.searchBox}>
        <input style={S.input} placeholder="Customer, invoice#, chassis, model से search…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select style={S.select} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All</option>
          <option value="paid">Paid</option>
          <option value="pending">Pending</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Status messages */}
      {loading && <p style={{ color: '#16a34a' }}>⏳ Loading invoices...</p>}
      {error && <div style={{ background: '#7f1d1d', color: '#fca5a5', padding: 12, borderRadius: 8 }}>❌ {error}</div>}
      {!loading && filtered.length === 0 && (
        <div style={{ background: '#0f172a', borderRadius: 12, padding: 40, textAlign: 'center' }}>
          <FileText size={48} color="#475569" style={{ margin: '0 auto 12px', display: 'block' }} />
          <p style={{ color: '#94a3b8' }}>{search || statusFilter !== 'all' ? 'कोई invoice नहीं मिला' : 'अभी तक कोई invoice नहीं'}</p>
          <button style={{ ...S.btn, margin: '12px auto 0' }} onClick={() => navigate('/tax-invoice')}>
            <Plus size={16} /> पहली Invoice बनाएं
          </button>
        </div>
      )}

      {/* Invoice cards */}
      {filtered.map(inv => {
        const sc = statusColor(inv.status || 'paid');
        const amount = inv.netAmount || inv.grandTotal || inv.price || 0;
        const isMenuOpen = actionMenuId === inv._id;

        return (
          <div key={inv._id} style={S.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ ...S.badge, background: sc.bg, color: sc.color }}>{(inv.status || 'paid').toUpperCase()}</span>
                  {inv.invoiceNo && <span style={{ fontSize: 11, color: '#94a3b8' }}>📄 {inv.invoiceNo}</span>}
                </div>
                <div style={{ fontWeight: 'bold', fontSize: 16, marginTop: 4 }}>
                  {inv.customerName || '—'}
                </div>
                <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                  🛵 {inv.vehicleModel || inv.model || '—'}
                  {inv.vehicleColor && ` · ${inv.vehicleColor}`}
                  {inv.chassisNo && ` · ${inv.chassisNo}`}
                </div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                  📞 {inv.customerMobile || inv.mobile || '—'}
                  {(inv.saleDate || inv.invoiceDate) && ` · 📅 ${formatDate(inv.saleDate || inv.invoiceDate)}`}
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ color: '#16a34a', fontWeight: 'bold', fontSize: 16 }}>{formatINR(amount)}</div>
                {inv.discount > 0 && <div style={{ fontSize: 10, color: '#94a3b8' }}>− {formatINR(inv.discount)} disc</div>}
              </div>
            </div>

            {/* Action buttons row */}
            <div style={{ display: 'flex', gap: 6, marginTop: 8, paddingTop: 8, borderTop: '1px solid #1e293b' }}>
              <button style={{ ...S.actionBtn, flex: 1, justifyContent: 'center' }} onClick={() => handleView(inv)}>
                <Eye size={14} /> View
              </button>
              <button style={{ ...S.actionBtn, flex: 1, justifyContent: 'center', background: '#25D366' }} onClick={() => handleWhatsApp(inv)}>
                <MessageCircle size={14} /> WhatsApp
              </button>
              <button style={{ ...S.actionBtn, flex: 1, justifyContent: 'center', background: '#2563eb' }} onClick={() => { navigate(`/tax-invoice?id=${inv._id}`); }}>
                <Printer size={14} /> Print
              </button>
              <button style={{ ...S.actionBtn, background: '#7f1d1d' }} onClick={() => handleDelete(inv)} title="Delete">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
