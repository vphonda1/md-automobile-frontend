import React, { useState, useEffect } from 'react';
import { Plus, Search, Battery, AlertTriangle, Edit2, Trash2, Upload, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { api } from '../utils/apiConfig';
import { formatINR, toISODate } from '../utils/smartUtils';
import AdminPasswordModal from '../components/AdminPasswordModal';

export default function PartsManagement() {
  const [parts, setParts] = useState([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showLowStock, setShowLowStock] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const doDelete = async () => {
    await api.delete(`/api/parts/${confirmDelete._id}`);
    setConfirmDelete(null);
    load();
  };

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(parts.map(p => ({
      'Part No': p.partNumber, Name: p.partName, Category: p.category,
      Stock: p.stockQuantity, 'Min Stock': p.minStockLevel,
      'Cost': p.costPrice, 'Selling': p.sellingPrice, MRP: p.mrp,
      Supplier: p.supplier, Location: p.location
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Parts');
    XLSX.writeFile(wb, `md-parts-${toISODate(new Date())}.xlsx`);
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws);
        let added = 0, updated = 0;
        for (const r of rows) {
          const partNumber = r['Part No'] || r.partNumber;
          if (!partNumber) continue;
          const data = {
            partNumber, partName: r.Name || r.partName,
            category: (r.Category || 'general').toLowerCase(),
            stockQuantity: Number(r.Stock || 0), minStockLevel: Number(r['Min Stock'] || 5),
            costPrice: Number(r.Cost || 0), sellingPrice: Number(r.Selling || 0),
            mrp: Number(r.MRP || 0), supplier: r.Supplier || '', location: r.Location || ''
          };
          try {
            await api.post('/api/parts', data);
            added++;
          } catch {
            updated++;
          }
        }
        alert(`✅ Import done: ${added} added, ${updated} skipped (already exist)`);
        load();
      } catch (err) { alert('Import failed: ' + err.message); }
    };
    reader.readAsBinaryString(file);
  };

  const load = async () => {
    setLoading(true);
    try { setParts(await api.get('/api/parts')); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = parts.filter(p => {
    if (showLowStock && p.stockQuantity > p.minStockLevel) return false;
    if (categoryFilter !== 'all' && p.category !== categoryFilter) return false;
    if (!search) return true;
    return [p.partNumber, p.partName].some(f => String(f || '').toLowerCase().includes(search.toLowerCase()));
  });

  const categories = ['battery', 'motor', 'controller', 'brake', 'tyre', 'general'];

  return (
    <div className="p-4 max-w-7xl mx-auto fade-in">
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <h1 className="text-2xl font-bold text-green-400">Spare Parts ({filtered.length})</h1>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => { setEditing(null); setShowForm(true); }} className="btn btn-primary flex items-center gap-1"><Plus size={16} /> Add Part</button>
          <button onClick={handleExport} className="btn btn-ghost flex items-center gap-1"><Download size={16} /> Export</button>
          <label className="btn btn-ghost flex items-center gap-1 cursor-pointer">
            <Upload size={16} /> Import
            <input type="file" accept=".xlsx,.xls,.csv" onChange={handleImport} className="hidden" />
          </label>
        </div>
      </div>

      <div className="card mb-4 space-y-2">
        <div className="flex items-center gap-2"><Search size={18} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search parts..." /></div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setCategoryFilter('all')} className={`text-xs px-3 py-1 rounded ${categoryFilter === 'all' ? 'bg-green-700' : 'bg-slate-800'}`}>All</button>
          {categories.map(c => (
            <button key={c} onClick={() => setCategoryFilter(c)} className={`text-xs px-3 py-1 rounded capitalize ${categoryFilter === c ? 'bg-green-700' : 'bg-slate-800'}`}>{c}</button>
          ))}
          <button onClick={() => setShowLowStock(!showLowStock)} className={`text-xs px-3 py-1 rounded flex items-center gap-1 ${showLowStock ? 'bg-red-700' : 'bg-slate-800'}`}>
            <AlertTriangle size={12} /> Low Stock
          </button>
        </div>
      </div>

      {loading ? <div className="text-center py-8">Loading...</div> :
       filtered.length === 0 ? <div className="card text-center py-8 text-slate-500">No parts</div> :
       <div className="grid md:grid-cols-2 gap-3">
         {filtered.map(p => {
           const isLow = p.stockQuantity <= p.minStockLevel;
           return (
             <div key={p._id} className={`card card-hover ${isLow ? 'border-red-700' : ''}`}>
               <div className="flex items-start justify-between gap-2">
                 <div className="flex-1">
                   <div className="font-semibold">{p.partName}</div>
                   <div className="text-xs text-slate-400">{p.partNumber} • {p.category}</div>
                   <div className="flex gap-3 mt-1 text-xs">
                     <span className={isLow ? 'text-red-400' : 'text-green-400'}>Stock: {p.stockQuantity}</span>
                     <span className="text-slate-400">Min: {p.minStockLevel}</span>
                     <span className="text-yellow-400">{formatINR(p.sellingPrice)}</span>
                   </div>
                 </div>
                 <div className="flex flex-col gap-1">
                   <button onClick={() => { setEditing(p); setShowForm(true); }} className="p-1.5 rounded bg-slate-800"><Edit2 size={12} /></button>
                   <button onClick={() => setConfirmDelete(p)} className="p-1.5 rounded bg-red-900"><Trash2 size={12} /></button>
                 </div>
               </div>
             </div>
           );
         })}
       </div>
      }

      {showForm && <PartForm part={editing} onClose={() => { setShowForm(false); load(); }} />}
      {confirmDelete && (
        <AdminPasswordModal
          action="Delete part"
          itemName={`${confirmDelete.partName} (${confirmDelete.partNumber})`}
          onConfirm={doDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}

function PartForm({ part, onClose }) {
  const [form, setForm] = useState(part || {
    partNumber: '', partName: '', category: 'general', description: '',
    stockQuantity: 0, minStockLevel: 5, unit: 'piece',
    costPrice: 0, sellingPrice: 0, mrp: 0, gstPercent: 18,
    supplier: '', location: ''
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      if (part?._id) await api.put(`/api/parts/${part._id}`, form);
      else await api.post('/api/parts', form);
      onClose();
    } catch (err) { alert('Failed: ' + err.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 p-4 overflow-y-auto" onClick={onClose}>
      <div className="card max-w-2xl mx-auto my-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold mb-4 text-green-400">{part ? 'Edit Part' : 'Add Part'}</h2>
        <div className="grid md:grid-cols-2 gap-3">
          <Field label="Part No *" value={form.partNumber} onChange={(v) => setForm({ ...form, partNumber: v })} />
          <Field label="Part Name *" value={form.partName} onChange={(v) => setForm({ ...form, partName: v })} />
          <div>
            <label className="text-xs text-slate-400">Category</label>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {['battery', 'motor', 'controller', 'brake', 'tyre', 'general'].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <Field label="Stock" type="number" value={form.stockQuantity} onChange={(v) => setForm({ ...form, stockQuantity: v })} />
          <Field label="Min Stock" type="number" value={form.minStockLevel} onChange={(v) => setForm({ ...form, minStockLevel: v })} />
          <Field label="Cost Price" type="number" value={form.costPrice} onChange={(v) => setForm({ ...form, costPrice: v })} />
          <Field label="Selling Price" type="number" value={form.sellingPrice} onChange={(v) => setForm({ ...form, sellingPrice: v })} />
          <Field label="MRP" type="number" value={form.mrp} onChange={(v) => setForm({ ...form, mrp: v })} />
          <Field label="Supplier" value={form.supplier} onChange={(v) => setForm({ ...form, supplier: v })} />
          <Field label="Location/Rack" value={form.location} onChange={(v) => setForm({ ...form, location: v })} />
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
