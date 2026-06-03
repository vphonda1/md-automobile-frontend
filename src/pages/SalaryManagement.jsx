import React, { useState, useEffect } from 'react';
import { Plus, DollarSign } from 'lucide-react';
import { api } from '../utils/apiConfig';
import { formatINR } from '../utils/smartUtils';

export default function SalaryManagement() {
  const [items, setItems] = useState([]);
  const [staff, setStaff] = useState([]);
  const [month, setMonth] = useState(new Date().toISOString().substring(0, 7));
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [s, st] = await Promise.all([
        api.get('/api/salary', { month }),
        api.get('/api/staff', { active: 'true' })
      ]);
      setItems(s);
      setStaff(st);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [month]);

  const total = items.reduce((s, i) => s + (i.netSalary || 0), 0);

  return (
    <div className="p-4 max-w-7xl mx-auto fade-in" style={{ paddingBottom: 100 }}>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-green-400">Salary ({items.length})</h1>
        <div className="flex gap-2">
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-auto" />
          <button onClick={() => setShowForm(true)} className="btn btn-primary flex items-center gap-1"><Plus size={16} /> Pay</button>
        </div>
      </div>

      <div className="card mb-4 bg-green-900/20">
        <div className="text-sm">Total Salary for {month}: <span className="font-bold text-green-400">{formatINR(total)}</span></div>
      </div>

      {loading ? <div className="text-center py-8">Loading...</div> :
       items.length === 0 ? <div className="card text-center text-slate-500">No salary records for {month}</div> :
       <div className="space-y-2">
         {items.map(s => (
           <div key={s._id} className="card">
             <div className="flex justify-between items-start">
               <div>
                 <div className="font-semibold">{s.staffName}</div>
                 <div className="text-xs text-slate-400">{s.month} • {s.daysWorked} days</div>
                 <div className="text-xs">Base: {formatINR(s.baseSalary)} + Bonus: {formatINR(s.bonus)} - Deductions: {formatINR(s.deductions + s.advance)}</div>
               </div>
               <div className="text-right">
                 <div className="text-lg font-bold text-green-400">{formatINR(s.netSalary)}</div>
                 <div className={`text-xs ${s.paymentStatus === 'paid' ? 'text-green-400' : 'text-yellow-400'}`}>{s.paymentStatus}</div>
               </div>
             </div>
           </div>
         ))}
       </div>
      }

      {showForm && <SalaryForm staff={staff} month={month} onClose={() => { setShowForm(false); load(); }} />}
    </div>
  );
}

function SalaryForm({ staff, month, onClose }) {
  const [form, setForm] = useState({
    staffId: '', staffName: '', month,
    baseSalary: 0, daysWorked: 30, daysAbsent: 0,
    allowances: 0, bonus: 0, commission: 0, overtime: 0,
    deductions: 0, advance: 0, pf: 0, esi: 0, tds: 0,
    paymentStatus: 'pending', paymentMode: 'bank'
  });
  const [saving, setSaving] = useState(false);

  const handleStaff = (id) => {
    const s = staff.find(x => x._id === id);
    setForm({ ...form, staffId: s?.staffId, staffName: s?.name, baseSalary: s?.baseSalary || 0 });
  };

  const save = async () => {
    if (!form.staffId) { alert('Select staff'); return; }
    setSaving(true);
    try { await api.post('/api/salary', form); onClose(); }
    catch (err) { alert(err.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 p-4 overflow-y-auto" onClick={onClose}>
      <div className="card max-w-2xl mx-auto my-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold mb-4 text-green-400">Pay Salary</h2>
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-400">Staff *</label>
            <select onChange={(e) => handleStaff(e.target.value)}>
              <option value="">Select staff</option>
              {staff.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
          </div>
          <Field label="Month" value={form.month} onChange={(v) => setForm({ ...form, month: v })} />
          <Field label="Base Salary" type="number" value={form.baseSalary} onChange={(v) => setForm({ ...form, baseSalary: v })} />
          <Field label="Days Worked" type="number" value={form.daysWorked} onChange={(v) => setForm({ ...form, daysWorked: v })} />
          <Field label="Bonus" type="number" value={form.bonus} onChange={(v) => setForm({ ...form, bonus: v })} />
          <Field label="Commission" type="number" value={form.commission} onChange={(v) => setForm({ ...form, commission: v })} />
          <Field label="Deductions" type="number" value={form.deductions} onChange={(v) => setForm({ ...form, deductions: v })} />
          <Field label="Advance" type="number" value={form.advance} onChange={(v) => setForm({ ...form, advance: v })} />
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="btn btn-ghost flex-1">Cancel</button>
          <button onClick={save} disabled={saving} className="btn btn-primary flex-1">{saving ? 'Saving...' : 'Save'}</button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text' }) {
  return <div><label className="text-xs text-slate-400 mb-1 block">{label}</label><input type={type} value={value} onChange={(e) => onChange(e.target.value)} /></div>;
}
