import React, { useState, useEffect } from 'react';
import { Plus, Calendar, MessageCircle, Phone } from 'lucide-react';
import { api } from '../utils/apiConfig';
import { formatDate, openWhatsApp } from '../utils/smartUtils';
import AdminPasswordModal from '../components/AdminPasswordModal';
import AutoComplete from '../components/AutoComplete';

export default function ServiceAppointmentsPage() {
  const [items, setItems] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [filter, setFilter] = useState('scheduled');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [a, c] = await Promise.all([
        api.get('/api/appointments', filter !== 'all' ? { status: filter } : {}),
        api.get('/api/customers')
      ]);
      setItems(a);
      setCustomers(c);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [filter]);

  const updateStatus = async (id, status) => {
    await api.patch(`/api/appointments/${id}/status`, { status });
    load();
  };

  const doDelete = async () => {
    await api.delete(`/api/appointments/${confirmDelete._id}`);
    setConfirmDelete(null);
    load();
  };

  const STATUS_COLORS = {
    'scheduled': 'bg-blue-900 text-blue-300',
    'confirmed': 'bg-purple-900 text-purple-300',
    'in-progress': 'bg-yellow-900 text-yellow-300',
    'completed': 'bg-green-900 text-green-300',
    'cancelled': 'bg-red-900 text-red-300',
    'no-show': 'bg-slate-700 text-slate-400'
  };

  return (
    <div className="p-4 max-w-7xl mx-auto fade-in">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-green-400 flex items-center gap-2"><Calendar /> Service Appointments ({items.length})</h1>
          <p className="text-xs text-slate-400">Live tracking — receive, in-progress, ready for pickup</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn btn-primary flex items-center gap-1"><Plus size={16} /> Book Appointment</button>
      </div>

      <div className="flex gap-1 mb-4 overflow-x-auto">
        {['all', 'scheduled', 'confirmed', 'in-progress', 'completed', 'cancelled'].map(s => (
          <button key={s} onClick={() => setFilter(s)} className={`text-sm px-3 py-1 rounded capitalize whitespace-nowrap ${filter === s ? 'bg-green-700' : 'bg-slate-800'}`}>{s.replace('-', ' ')}</button>
        ))}
      </div>

      {loading ? <div className="text-center py-8">Loading...</div> :
       items.length === 0 ? <div className="card text-center py-8 text-slate-500">No appointments</div> :
       <div className="space-y-2">
         {items.map(a => (
           <div key={a._id} className="card card-hover">
             <div className="flex items-start justify-between gap-2">
               <div className="flex-1">
                 <div className="flex items-center gap-2 mb-1">
                   <span className="font-semibold">{a.customerName}</span>
                   <span className={`text-xs px-2 py-0.5 rounded ${STATUS_COLORS[a.status] || 'bg-slate-800'}`}>{a.status?.replace('-', ' ')}</span>
                   <span className="text-xs px-2 py-0.5 rounded bg-yellow-900 text-yellow-300">{a.serviceType?.replace('-', ' ')}</span>
                 </div>
                 <div className="text-sm">{a.vehicleModel} • {a.chassisNo}</div>
                 <div className="text-xs text-slate-400">📞 {a.mobileNo} {a.batteryNumber && `• 🔋 ${a.batteryNumber}`}</div>
                 <div className="text-xs text-yellow-400">📅 {formatDate(a.appointmentDate)} at {a.appointmentTime}</div>
                 {a.customerComplaint && <div className="text-xs text-slate-300 mt-1">⚠️ {a.customerComplaint}</div>}
                 {a.estimatedCompletion && <div className="text-xs text-blue-400">ETA: {a.estimatedCompletion}</div>}
                 {a.technician && <div className="text-xs">🔧 Tech: {a.technician}</div>}
               </div>
               <div className="flex flex-col gap-1">
                 <button onClick={() => openWhatsApp(a.mobileNo, `Hi ${a.customerName}, service appointment reminder for ${formatDate(a.appointmentDate)} at ${a.appointmentTime}`)} className="p-2 rounded bg-green-700"><MessageCircle size={12} /></button>
                 <a href={`tel:${a.mobileNo}`} className="p-2 rounded bg-blue-700"><Phone size={12} /></a>
                 {a.status === 'scheduled' && (
                   <button onClick={() => updateStatus(a._id, 'in-progress')} className="p-2 rounded bg-yellow-700" title="Start Service">▶️</button>
                 )}
                 {a.status === 'in-progress' && (
                   <button onClick={() => updateStatus(a._id, 'completed')} className="p-2 rounded bg-green-700" title="Complete">✓</button>
                 )}
                 <button onClick={() => setConfirmDelete(a)} className="p-2 rounded bg-red-700">×</button>
               </div>
             </div>
           </div>
         ))}
       </div>
      }

      {showForm && <AppointmentForm customers={customers} onClose={() => { setShowForm(false); load(); }} />}
      {confirmDelete && (
        <AdminPasswordModal
          action="Delete appointment"
          itemName={`${confirmDelete.customerName} — ${formatDate(confirmDelete.appointmentDate)}`}
          onConfirm={doDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}

function AppointmentForm({ customers, onClose }) {
  const [form, setForm] = useState({
    customerName: '', mobileNo: '', vehicleModel: '', chassisNo: '', batteryNumber: '',
    currentKm: 0,
    appointmentDate: new Date().toISOString().split('T')[0],
    appointmentTime: '10:00',
    serviceType: 'paid',
    customerComplaint: '', notes: ''
  });
  const [saving, setSaving] = useState(false);

  const fillFromCustomer = (mobile) => {
    const c = customers.find(x => x.mobileNo === mobile);
    if (c) setForm({ ...form, customerName: c.customerName, mobileNo: c.mobileNo, vehicleModel: c.vehicleModel, chassisNo: c.chassisNo, batteryNumber: c.batteryNumber });
  };

  const save = async () => {
    if (!form.customerName || !form.mobileNo) return alert('Required fields missing');
    setSaving(true);
    try { await api.post('/api/appointments', form); onClose(); }
    catch (err) { alert(err.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 p-4 overflow-y-auto" onClick={onClose}>
      <div className="card max-w-md mx-auto my-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold mb-4 text-green-400">Book Service Appointment</h2>
        <div className="space-y-3">
          <div className="card bg-blue-900/20">
            <label className="text-xs text-slate-400 mb-1 block">Customer Mobile (autocomplete)</label>
            <AutoComplete
              value={form.mobileNo}
              onChange={(v) => setForm({ ...form, mobileNo: v })}
              onSelect={(opt) => fillFromCustomer(opt.value)}
              options={customers.map(c => ({ value: c.mobileNo, label: `${c.customerName} (${c.mobileNo})`, meta: c.vehicleModel }))}
              placeholder="Mobile..."
            />
          </div>
          <Field label="Customer Name *" value={form.customerName} onChange={(v) => setForm({ ...form, customerName: v })} />
          <Field label="Vehicle Model" value={form.vehicleModel} onChange={(v) => setForm({ ...form, vehicleModel: v })} />
          <Field label="Chassis No" value={form.chassisNo} onChange={(v) => setForm({ ...form, chassisNo: v })} />
          <Field label="🔋 Battery No" value={form.batteryNumber} onChange={(v) => setForm({ ...form, batteryNumber: v })} />
          <Field label="Current KM" type="number" value={form.currentKm} onChange={(v) => setForm({ ...form, currentKm: v })} />
          <div className="grid grid-cols-2 gap-2">
            <Field label="Date *" type="date" value={form.appointmentDate} onChange={(v) => setForm({ ...form, appointmentDate: v })} />
            <Field label="Time *" type="time" value={form.appointmentTime} onChange={(v) => setForm({ ...form, appointmentTime: v })} />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Service Type</label>
            <select value={form.serviceType} onChange={(e) => setForm({ ...form, serviceType: e.target.value })}>
              <option value="free-1">1st Free Service</option>
              <option value="free-2">2nd Free Service</option>
              <option value="free-3">3rd Free Service</option>
              <option value="paid">Paid Service</option>
              <option value="warranty">Warranty Claim</option>
              <option value="breakdown">Breakdown</option>
              <option value="battery-check">Battery Health Check</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Customer Complaint / Issue</label>
            <textarea value={form.customerComplaint} onChange={(e) => setForm({ ...form, customerComplaint: e.target.value })} rows="3" />
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="btn btn-ghost flex-1">Cancel</button>
          <button onClick={save} disabled={saving} className="btn btn-primary flex-1">{saving ? 'Booking...' : 'Book'}</button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text' }) {
  return <div><label className="text-xs text-slate-400 mb-1 block">{label}</label><input type={type} value={value} onChange={(e) => onChange(e.target.value)} /></div>;
}
