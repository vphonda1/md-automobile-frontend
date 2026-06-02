import React, { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Plus, X, IndianRupee, Trash2, Edit3, Calendar as CalIcon, Phone } from 'lucide-react';
import { api } from '../utils/apiConfig';
import { formatINR, formatDate, toISODate, sendWhatsApp } from '../utils/smartUtils';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function CalendarView() {
  const [view, setView] = useState('emi'); // 'emi' or 'events'
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [monthIdx, setMonthIdx] = useState(today.getMonth());

  const [emis, setEmis] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddEmi, setShowAddEmi] = useState(false);
  const [editingEmi, setEditingEmi] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);

  // EMI form state
  const [emiForm, setEmiForm] = useState({
    customerId: '',
    customerName: '',
    customerPhone: '',
    vehicleModel: '',
    chassisNo: '',
    loanAmount: '',
    emiAmount: '',
    emiDay: 5,
    tenure: 12,
    startDate: toISODate(new Date()),
    notes: ''
  });

  // ── Load data ──
  const loadAll = async () => {
    setLoading(true);
    try {
      const [e, c] = await Promise.all([
        api.get('/api/emis').catch(() => []),
        api.get('/api/customers').catch(() => [])
      ]);
      setEmis(Array.isArray(e) ? e : (e?.emis || []));
      setCustomers(Array.isArray(c) ? c : (c?.customers || []));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { loadAll(); }, []);

  // ── Calculate days in month ──
  const daysInMonth = useMemo(() => {
    const d = new Date(year, monthIdx + 1, 0);
    return d.getDate();
  }, [year, monthIdx]);

  const firstDayOfMonth = useMemo(() => new Date(year, monthIdx, 1).getDay(), [year, monthIdx]);

  // ── EMIs grouped by day of month ──
  const emisByDay = useMemo(() => {
    const map = {};
    emis.forEach(emi => {
      if (emi.status === 'completed' || emi.status === 'cancelled') return;
      const day = Number(emi.emiDay);
      if (day >= 1 && day <= 31) {
        if (!map[day]) map[day] = [];
        map[day].push(emi);
      }
    });
    return map;
  }, [emis]);

  // ── Total monthly EMI collection ──
  const monthlyTotalEmi = useMemo(() => {
    return emis
      .filter(e => e.status !== 'completed' && e.status !== 'cancelled')
      .reduce((s, e) => s + (Number(e.emiAmount) || 0), 0);
  }, [emis]);

  // ── Navigation ──
  const prevMonth = () => {
    if (monthIdx === 0) { setYear(year - 1); setMonthIdx(11); }
    else setMonthIdx(monthIdx - 1);
  };
  const nextMonth = () => {
    if (monthIdx === 11) { setYear(year + 1); setMonthIdx(0); }
    else setMonthIdx(monthIdx + 1);
  };
  const goToday = () => {
    setYear(today.getFullYear());
    setMonthIdx(today.getMonth());
  };

  // ── EMI CRUD ──
  const openAddEmi = (day) => {
    setEditingEmi(null);
    setEmiForm({
      customerId: '', customerName: '', customerPhone: '',
      vehicleModel: '', chassisNo: '',
      loanAmount: '', emiAmount: '', emiDay: day || 5,
      tenure: 12, startDate: toISODate(new Date()), notes: ''
    });
    setShowAddEmi(true);
  };

  const openEditEmi = (emi) => {
    setEditingEmi(emi);
    setEmiForm({
      customerId: emi.customerId || '',
      customerName: emi.customerName || '',
      customerPhone: emi.customerPhone || emi.mobile || '',
      vehicleModel: emi.vehicleModel || '',
      chassisNo: emi.chassisNo || '',
      loanAmount: emi.loanAmount || '',
      emiAmount: emi.emiAmount || '',
      emiDay: emi.emiDay || 5,
      tenure: emi.tenure || 12,
      startDate: emi.startDate ? toISODate(emi.startDate) : toISODate(new Date()),
      notes: emi.notes || ''
    });
    setShowAddEmi(true);
  };

  const selectCustomerForEmi = (c) => {
    setEmiForm(prev => ({
      ...prev,
      customerId: c._id,
      customerName: c.customerName || c.name,
      customerPhone: c.mobile || c.mobileNo || ''
    }));
  };

  const saveEmi = async () => {
    if (!emiForm.customerName) { alert('❌ Customer ज़रूरी है'); return; }
    if (!emiForm.emiAmount) { alert('❌ EMI Amount ज़रूरी है'); return; }
    if (!emiForm.emiDay || emiForm.emiDay < 1 || emiForm.emiDay > 31) { alert('❌ EMI Day 1-31 में होना चाहिए'); return; }
    try {
      const payload = {
        ...emiForm,
        emiAmount: Number(emiForm.emiAmount),
        loanAmount: Number(emiForm.loanAmount) || 0,
        emiDay: Number(emiForm.emiDay),
        tenure: Number(emiForm.tenure) || 12,
        status: 'active'
      };
      if (editingEmi?._id) {
        await api.put(`/api/emis/${editingEmi._id}`, payload);
      } else {
        await api.post('/api/emis', payload);
      }
      setShowAddEmi(false);
      loadAll();
    } catch (err) {
      alert('❌ Save failed: ' + err.message);
    }
  };

  const deleteEmi = async (emi) => {
    if (!confirm(`Delete EMI for ${emi.customerName}?`)) return;
    try {
      await api.delete(`/api/emis/${emi._id}`);
      loadAll();
    } catch (err) {
      alert('❌ Delete failed: ' + err.message);
    }
  };

  const remindEmi = (emi) => {
    const phone = emi.customerPhone || emi.mobile;
    if (!phone) { alert('❌ Mobile number नहीं है'); return; }
    const msg = `नमस्ते ${emi.customerName} जी 🙏\n\nआपकी EMI ${formatINR(emi.emiAmount)} इस महीने ${emi.emiDay} तारीख को due है।\n\nकृपया समय पर payment करें।\n\n- MD Automobile, Bhopal`;
    sendWhatsApp(phone, msg);
  };

  // ── Styles ──
  const S = {
    wrap: { padding: 12, color: 'white', minHeight: '100vh', background: '#020617', paddingBottom: 100 },
    head: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    title: { color: '#16a34a', fontSize: 22, fontWeight: 'bold', margin: 0 },
    btn: { background: '#16a34a', color: 'white', border: 'none', padding: '8px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 },
    tabs: { display: 'flex', gap: 6, marginBottom: 12 },
    tab: (active) => ({ flex: 1, padding: '10px', background: active ? '#16a34a' : '#0f172a', color: 'white', border: 'none', borderRadius: 8, fontWeight: 'bold', cursor: 'pointer', fontSize: 13 }),
    monthNav: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0f172a', borderRadius: 12, padding: '8px 12px', marginBottom: 8 },
    monthBtn: { background: 'transparent', color: 'white', border: 'none', cursor: 'pointer', padding: 4 },
    monthLabel: { fontSize: 16, fontWeight: 'bold' },
    statsBar: { background: '#0f172a', border: '1px solid #1e293b', borderRadius: 10, padding: 10, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginTop: 8 },
    weekday: { color: '#94a3b8', fontSize: 11, textAlign: 'center', padding: '4px 0', fontWeight: 'bold' },
    day: (isToday, hasEmi, isSelected) => ({
      aspectRatio: '1',
      background: isSelected ? '#16a34a' : (hasEmi ? '#1e293b' : '#0f172a'),
      border: isToday ? '2px solid #16a34a' : '1px solid #1e293b',
      borderRadius: 8,
      padding: 4,
      cursor: 'pointer',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'flex-start',
      fontSize: 12,
      position: 'relative'
    }),
    dayNum: { fontWeight: 'bold' },
    dayBadge: { background: '#16a34a', color: 'white', borderRadius: 10, fontSize: 9, padding: '1px 5px', fontWeight: 'bold', marginTop: 2 },
    emiCard: { background: '#0f172a', borderRadius: 10, padding: 12, marginBottom: 8, border: '1px solid #1e293b' },
    modal: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 12, overflowY: 'auto' },
    modalBox: { background: '#0f172a', borderRadius: 12, padding: 16, width: '100%', maxWidth: 500, marginTop: 40 },
    input: { width: '100%', background: '#020617', border: '1px solid #1e293b', borderRadius: 6, padding: 10, color: 'white', fontSize: 13, boxSizing: 'border-box', marginBottom: 8 },
    label: { color: '#94a3b8', fontSize: 11, display: 'block', marginBottom: 4 }
  };

  // Build day grid (with leading empty cells for first day offset)
  const daysGrid = [];
  for (let i = 0; i < firstDayOfMonth; i++) daysGrid.push(null);
  for (let d = 1; d <= daysInMonth; d++) daysGrid.push(d);

  const filteredCustomers = useMemo(() => {
    const q = (emiForm.customerName || '').toLowerCase().trim();
    if (!q || emiForm.customerId) return [];
    return customers.filter(c =>
      (c.customerName || c.name || '').toLowerCase().includes(q) ||
      (c.mobile || c.mobileNo || '').includes(q)
    ).slice(0, 5);
  }, [customers, emiForm.customerName, emiForm.customerId]);

  return (
    <div style={S.wrap}>
      <div style={S.head}>
        <h1 style={S.title}>📅 Calendar</h1>
        <button style={S.btn} onClick={() => openAddEmi()}>
          <Plus size={14} /> Add EMI
        </button>
      </div>

      {/* View tabs */}
      <div style={S.tabs}>
        <button style={S.tab(view === 'emi')} onClick={() => setView('emi')}>💰 EMI Calendar</button>
        <button style={S.tab(view === 'events')} onClick={() => setView('events')}>📋 EMI List</button>
      </div>

      {/* Stats bar */}
      <div style={S.statsBar}>
        <div>
          <div style={{ fontSize: 11, color: '#94a3b8' }}>Active EMIs</div>
          <div style={{ fontWeight: 'bold', color: '#16a34a' }}>{emis.filter(e => e.status !== 'completed').length}</div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: '#94a3b8' }}>Monthly Collection</div>
          <div style={{ fontWeight: 'bold', color: '#16a34a' }}>{formatINR(monthlyTotalEmi)}</div>
        </div>
        <button style={{ ...S.btn, fontSize: 11, padding: '6px 10px' }} onClick={goToday}>Today</button>
      </div>

      {view === 'emi' ? (
        <>
          {/* Month navigation */}
          <div style={S.monthNav}>
            <button style={S.monthBtn} onClick={prevMonth}><ChevronLeft /></button>
            <div style={S.monthLabel}>{MONTHS[monthIdx]} {year}</div>
            <button style={S.monthBtn} onClick={nextMonth}><ChevronRight /></button>
          </div>

          {/* Calendar grid */}
          <div style={S.grid}>
            {WEEKDAYS.map(w => <div key={w} style={S.weekday}>{w}</div>)}
            {daysGrid.map((d, i) => {
              if (d === null) return <div key={`empty-${i}`} />;
              const isToday = d === today.getDate() && monthIdx === today.getMonth() && year === today.getFullYear();
              const dayEmis = emisByDay[d] || [];
              const hasEmi = dayEmis.length > 0;
              const isSelected = selectedDay === d;
              return (
                <div key={d} style={S.day(isToday, hasEmi, isSelected)} onClick={() => setSelectedDay(isSelected ? null : d)}>
                  <div style={S.dayNum}>{d}</div>
                  {hasEmi && <div style={S.dayBadge}>{dayEmis.length}</div>}
                </div>
              );
            })}
          </div>

          {/* Selected day EMIs */}
          {selectedDay && (
            <div style={{ marginTop: 16 }}>
              <h3 style={{ color: '#fde68a', fontSize: 14 }}>
                Day {selectedDay} — {emisByDay[selectedDay]?.length || 0} EMI(s)
              </h3>
              {!emisByDay[selectedDay] || emisByDay[selectedDay].length === 0 ? (
                <p style={{ color: '#94a3b8', fontSize: 13 }}>इस day पर कोई EMI नहीं</p>
              ) : (
                emisByDay[selectedDay].map(emi => (
                  <div key={emi._id} style={S.emiCard}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontWeight: 'bold' }}>{emi.customerName}</div>
                        <div style={{ fontSize: 11, color: '#94a3b8' }}>📞 {emi.customerPhone || emi.mobile}</div>
                        {emi.vehicleModel && <div style={{ fontSize: 11, color: '#94a3b8' }}>🛵 {emi.vehicleModel}</div>}
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ color: '#16a34a', fontWeight: 'bold' }}>{formatINR(emi.emiAmount)}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                      <button style={{ ...S.btn, flex: 1, fontSize: 11, padding: '6px 8px', background: '#25D366' }} onClick={() => remindEmi(emi)}><Phone size={12} /> Remind</button>
                      <button style={{ ...S.btn, fontSize: 11, padding: '6px 8px', background: '#2563eb' }} onClick={() => openEditEmi(emi)}><Edit3 size={12} /></button>
                      <button style={{ ...S.btn, fontSize: 11, padding: '6px 8px', background: '#7f1d1d' }} onClick={() => deleteEmi(emi)}><Trash2 size={12} /></button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </>
      ) : (
        /* EMI List view */
        <>
          {emis.length === 0 ? (
            <div style={{ background: '#0f172a', borderRadius: 12, padding: 40, textAlign: 'center' }}>
              <CalIcon size={48} color="#475569" style={{ margin: '0 auto 12px' }} />
              <p style={{ color: '#94a3b8' }}>अभी तक कोई EMI नहीं</p>
              <button style={{ ...S.btn, margin: '12px auto 0' }} onClick={() => openAddEmi()}>
                <Plus size={14} /> पहली EMI Add करें
              </button>
            </div>
          ) : (
            emis.map(emi => (
              <div key={emi._id} style={S.emiCard}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontWeight: 'bold' }}>{emi.customerName}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>
                      📅 हर महीने {emi.emiDay} तारीख · 📞 {emi.customerPhone || emi.mobile}
                    </div>
                    {emi.vehicleModel && <div style={{ fontSize: 11, color: '#94a3b8' }}>🛵 {emi.vehicleModel}</div>}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: '#16a34a', fontWeight: 'bold', fontSize: 16 }}>{formatINR(emi.emiAmount)}</div>
                    <div style={{ fontSize: 10, color: '#94a3b8' }}>{emi.tenure} months</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                  <button style={{ ...S.btn, flex: 1, fontSize: 11, padding: '6px 8px', background: '#25D366' }} onClick={() => remindEmi(emi)}><Phone size={12} /> Remind</button>
                  <button style={{ ...S.btn, fontSize: 11, padding: '6px 8px', background: '#2563eb' }} onClick={() => openEditEmi(emi)}><Edit3 size={12} /></button>
                  <button style={{ ...S.btn, fontSize: 11, padding: '6px 8px', background: '#7f1d1d' }} onClick={() => deleteEmi(emi)}><Trash2 size={12} /></button>
                </div>
              </div>
            ))
          )}
        </>
      )}

      {/* Add/Edit EMI Modal */}
      {showAddEmi && (
        <div style={S.modal} onClick={() => setShowAddEmi(false)}>
          <div style={S.modalBox} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <h3 style={{ color: '#16a34a', margin: 0 }}>{editingEmi ? '✏️ Edit EMI' : '➕ Add EMI'}</h3>
              <button onClick={() => setShowAddEmi(false)} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}><X /></button>
            </div>

            <label style={S.label}>Customer Name *</label>
            <input style={S.input} value={emiForm.customerName} onChange={(e) => setEmiForm({ ...emiForm, customerName: e.target.value, customerId: '' })} placeholder="Customer name type करें..." />
            {filteredCustomers.length > 0 && (
              <div style={{ background: '#020617', border: '1px solid #1e293b', borderRadius: 8, marginTop: -4, marginBottom: 8 }}>
                {filteredCustomers.map(c => (
                  <div key={c._id} onClick={() => selectCustomerForEmi(c)} style={{ padding: 8, borderBottom: '1px solid #1e293b', cursor: 'pointer' }}>
                    <div style={{ fontWeight: 'bold', fontSize: 12 }}>{c.customerName || c.name}</div>
                    <div style={{ fontSize: 10, color: '#94a3b8' }}>📞 {c.mobile || c.mobileNo}</div>
                  </div>
                ))}
              </div>
            )}

            <label style={S.label}>Mobile</label>
            <input style={S.input} value={emiForm.customerPhone} onChange={(e) => setEmiForm({ ...emiForm, customerPhone: e.target.value })} />

            <label style={S.label}>Vehicle Model</label>
            <input style={S.input} value={emiForm.vehicleModel} onChange={(e) => setEmiForm({ ...emiForm, vehicleModel: e.target.value })} />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div>
                <label style={S.label}>Loan Amount (₹)</label>
                <input style={S.input} type="number" value={emiForm.loanAmount} onChange={(e) => setEmiForm({ ...emiForm, loanAmount: e.target.value })} />
              </div>
              <div>
                <label style={S.label}>EMI Amount (₹) *</label>
                <input style={S.input} type="number" value={emiForm.emiAmount} onChange={(e) => setEmiForm({ ...emiForm, emiAmount: e.target.value })} />
              </div>
              <div>
                <label style={S.label}>EMI Day (1-31) *</label>
                <input style={S.input} type="number" min="1" max="31" value={emiForm.emiDay} onChange={(e) => setEmiForm({ ...emiForm, emiDay: e.target.value })} />
              </div>
              <div>
                <label style={S.label}>Tenure (months)</label>
                <input style={S.input} type="number" value={emiForm.tenure} onChange={(e) => setEmiForm({ ...emiForm, tenure: e.target.value })} />
              </div>
            </div>

            <label style={S.label}>Start Date</label>
            <input style={S.input} type="date" value={emiForm.startDate} onChange={(e) => setEmiForm({ ...emiForm, startDate: e.target.value })} />

            <label style={S.label}>Notes</label>
            <input style={S.input} value={emiForm.notes} onChange={(e) => setEmiForm({ ...emiForm, notes: e.target.value })} />

            <button style={{ ...S.btn, width: '100%', padding: 12, justifyContent: 'center', marginTop: 8 }} onClick={saveEmi}>
              💾 {editingEmi ? 'Update EMI' : 'Save EMI'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
