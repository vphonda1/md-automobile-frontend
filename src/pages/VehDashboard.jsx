import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Upload, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { api } from '../utils/apiConfig';
import { formatDate, formatINR, parseUTCDate, toISODate } from '../utils/smartUtils';
import AdminPasswordModal from '../components/AdminPasswordModal';
import AutoComplete from '../components/AutoComplete';

export default function VehDashboard() {
  const [vehicles, setVehicles] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const load = async () => {
    setLoading(true);
    try { setVehicles(await api.get('/api/vehicles')); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = vehicles.filter(v => {
    if (statusFilter !== 'all' && v.status !== statusFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return [v.chassisNo, v.vehicleModel, v.customerName, v.mobileNo, v.batteryNumber, v.motorNumber]
      .some(f => String(f || '').toLowerCase().includes(q));
  });

  const counts = {
    total: vehicles.length,
    inStock: vehicles.filter(v => v.status === 'in-stock').length,
    sold: vehicles.filter(v => v.status === 'sold').length,
    reserved: vehicles.filter(v => v.status === 'reserved').length
  };

  // Distinct models for autocomplete
  const distinctModels = [...new Set(vehicles.map(v => v.vehicleModel).filter(Boolean))];

  const doDelete = async () => {
    await api.delete(`/api/vehicles/${confirmDelete._id}`);
    setConfirmDelete(null);
    load();
  };

  const handleExport = () => {
    const data = filtered.map(v => ({
      Chassis: v.chassisNo, Model: v.vehicleModel, Color: v.color, Status: v.status,
      Battery: v.batteryNumber, Motor: v.motorNumber, 'Battery Capacity': v.batteryCapacity,
      'Range (km)': v.rangeKm, 'On Road Price': v.onRoadPrice,
      Customer: v.customerName, Mobile: v.mobileNo, 'Sale Date': v.saleDate
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Vehicles');
    XLSX.writeFile(wb, `md-vehicles-${toISODate(new Date())}.xlsx`);
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: 'binary', cellDates: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws);

        const items = rows.map(r => ({
          chassisNo: String(r.Chassis || r.chassisNo || '').toUpperCase().trim(),
          vehicleModel: r.Model || r.vehicleModel,
          color: r.Color || r.color,
          status: (r.Status || r.status || 'in-stock').toLowerCase(),
          batteryNumber: r.Battery || r.batteryNumber,
          motorNumber: r.Motor || r.motorNumber,
          batteryCapacity: r['Battery Capacity'] || r.batteryCapacity,
          rangeKm: Number(r['Range (km)'] || r.rangeKm || 0),
          onRoadPrice: Number(r['On Road Price'] || r.onRoadPrice || 0),
          exShowroomPrice: Number(r['Ex Showroom'] || r.exShowroomPrice || 0),
          customerName: r.Customer || r.customerName || '',
          mobileNo: String(r.Mobile || r.mobileNo || '').replace(/\D/g, ''),
          saleDate: r['Sale Date'] ? toISODate(parseUTCDate(r['Sale Date'])) : ''
        })).filter(v => v.chassisNo);

        const res = await api.post('/api/vehicles/sync', { vehicles: items });
        alert(`✅ Imported: ${res.added} added, ${res.updated} updated`);
        load();
      } catch (err) {
        alert('Import failed: ' + err.message);
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="p-4 max-w-7xl mx-auto fade-in">
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-green-400">Vehicle Inventory</h1>
          <p className="text-xs text-slate-400">Single source of truth for all vehicles</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => { setEditing(null); setShowForm(true); }} className="btn btn-primary flex items-center gap-1"><Plus size={16} /> Add</button>
          <button onClick={handleExport} className="btn btn-ghost flex items-center gap-1"><Download size={16} /> Export</button>
          <label className="btn btn-ghost flex items-center gap-1 cursor-pointer">
            <Upload size={16} /> Import
            <input type="file" accept=".xlsx,.xls,.csv" onChange={handleImport} className="hidden" />
          </label>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 mb-4">
        {[
          { key: 'all', label: 'All', count: counts.total },
          { key: 'in-stock', label: 'In Stock', count: counts.inStock },
          { key: 'sold', label: 'Sold', count: counts.sold },
          { key: 'reserved', label: 'Reserved', count: counts.reserved }
        ].map(s => (
          <button key={s.key} onClick={() => setStatusFilter(s.key)} className={`card text-center py-2 ${statusFilter === s.key ? 'border-green-500' : ''}`}>
            <div className="text-xl font-bold">{s.count}</div>
            <div className="text-xs text-slate-400">{s.label}</div>
          </button>
        ))}
      </div>

      <div className="card mb-4">
        <div className="flex items-center gap-2">
          <Search size={18} className="text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search chassis, model, customer, battery, motor..." />
        </div>
      </div>

      {loading ? <div className="text-center py-8">Loading...</div> :
       filtered.length === 0 ? <div className="card text-center py-8 text-slate-500">No vehicles</div> :
       <div className="grid md:grid-cols-2 gap-3">
         {filtered.map(v => (
           <div key={v._id} className="card card-hover">
             <div className="flex items-start justify-between gap-2 mb-2">
               <div className="flex-1 min-w-0">
                 <div className="flex items-center gap-2">
                   <span className="font-bold text-green-400">{v.chassisNo}</span>
                   <StatusBadge status={v.status} />
                 </div>
                 <div className="text-sm">{v.vehicleModel} • {v.color}</div>
               </div>
               <div className="flex gap-1">
                 <button onClick={() => { setEditing(v); setShowForm(true); }} className="p-1.5 rounded bg-slate-800"><Edit2 size={12} /></button>
                 <button onClick={() => setConfirmDelete(v)} className="p-1.5 rounded bg-red-900"><Trash2 size={12} /></button>
               </div>
             </div>
             <div className="text-xs text-slate-400 space-y-0.5">
               {v.customerName && <div>👤 {v.customerName} • {v.mobileNo}</div>}
               {v.batteryNumber && <div className="text-yellow-400">🔋 Battery: {v.batteryNumber}</div>}
               {v.motorNumber && <div>⚡ Motor: {v.motorNumber}</div>}
               {v.batteryCapacity && <div>🔋 Capacity: {v.batteryCapacity} • Range: {v.rangeKm}km</div>}
               {v.saleDate && <div>📅 Sold: {formatDate(v.saleDate)}</div>}
               {v.onRoadPrice > 0 && <div>💰 Price: {formatINR(v.onRoadPrice)}</div>}
             </div>
           </div>
         ))}
       </div>
      }

      {showForm && <VehicleForm vehicle={editing} models={distinctModels} onClose={() => { setShowForm(false); load(); }} />}
      {confirmDelete && (
        <AdminPasswordModal
          action="Delete vehicle"
          itemName={`${confirmDelete.chassisNo} (${confirmDelete.vehicleModel})`}
          onConfirm={doDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}

function StatusBadge({ status }) {
  const colors = {
    'in-stock': 'bg-green-900 text-green-300',
    'sold': 'bg-blue-900 text-blue-300',
    'reserved': 'bg-yellow-900 text-yellow-300',
    'transit': 'bg-purple-900 text-purple-300'
  };
  return <span className={`text-xs px-2 py-0.5 rounded ${colors[status] || 'bg-slate-800'}`}>{status}</span>;
}

function VehicleForm({ vehicle, models, onClose }) {
  const [form, setForm] = useState(vehicle || {
    chassisNo: '', vehicleModel: '', variant: '', color: '',
    batteryNumber: '', motorNumber: '', batteryCapacity: '', motorPower: '',
    rangeKm: 0, topSpeed: 0, chargingTime: '',
    exShowroomPrice: 0, onRoadPrice: 0,
    status: 'in-stock', manufactureYear: new Date().getFullYear()
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.chassisNo) return alert('Chassis number ज़रूरी है');
    setSaving(true);
    try {
      if (vehicle?._id) await api.put(`/api/vehicles/${vehicle._id}`, form);
      else await api.post('/api/vehicles', form);
      onClose();
    } catch (err) { alert('Failed: ' + err.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 p-4 overflow-y-auto" onClick={onClose}>
      <div className="card max-w-2xl mx-auto my-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold mb-4 text-green-400">{vehicle ? 'Edit Vehicle' : 'Add Vehicle'}</h2>
        <div className="grid md:grid-cols-2 gap-3">
          <div><label className="text-xs text-slate-400 mb-1 block">Chassis No *</label>
            <input value={form.chassisNo} onChange={(e) => setForm({ ...form, chassisNo: e.target.value.toUpperCase() })} /></div>
          <div><label className="text-xs text-slate-400 mb-1 block">Model (autocomplete से या नया)</label>
            <AutoComplete value={form.vehicleModel} onChange={(v) => setForm({ ...form, vehicleModel: v })} options={models} placeholder="Model..." /></div>
          <div><label className="text-xs text-slate-400 mb-1 block">Variant</label><input value={form.variant} onChange={(e) => setForm({ ...form, variant: e.target.value })} /></div>
          <div><label className="text-xs text-slate-400 mb-1 block">Color</label><input value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} /></div>
          <div><label className="text-xs text-slate-400 mb-1 block">🔋 Battery No</label><input value={form.batteryNumber} onChange={(e) => setForm({ ...form, batteryNumber: e.target.value })} /></div>
          <div><label className="text-xs text-slate-400 mb-1 block">⚡ Motor No</label><input value={form.motorNumber} onChange={(e) => setForm({ ...form, motorNumber: e.target.value })} /></div>
          <div><label className="text-xs text-slate-400 mb-1 block">Battery Capacity</label><input value={form.batteryCapacity} onChange={(e) => setForm({ ...form, batteryCapacity: e.target.value })} placeholder="3 kWh" /></div>
          <div><label className="text-xs text-slate-400 mb-1 block">Motor Power</label><input value={form.motorPower} onChange={(e) => setForm({ ...form, motorPower: e.target.value })} placeholder="5 kW" /></div>
          <div><label className="text-xs text-slate-400 mb-1 block">Range (km)</label><input type="number" value={form.rangeKm} onChange={(e) => setForm({ ...form, rangeKm: e.target.value })} /></div>
          <div><label className="text-xs text-slate-400 mb-1 block">Top Speed</label><input type="number" value={form.topSpeed} onChange={(e) => setForm({ ...form, topSpeed: e.target.value })} /></div>
          <div><label className="text-xs text-slate-400 mb-1 block">Ex-Showroom (₹)</label><input type="number" value={form.exShowroomPrice} onChange={(e) => setForm({ ...form, exShowroomPrice: e.target.value })} /></div>
          <div><label className="text-xs text-slate-400 mb-1 block">On-Road (₹)</label><input type="number" value={form.onRoadPrice} onChange={(e) => setForm({ ...form, onRoadPrice: e.target.value })} /></div>
          <div><label className="text-xs text-slate-400 mb-1 block">Status</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="in-stock">In Stock</option><option value="sold">Sold</option>
              <option value="reserved">Reserved</option><option value="transit">In Transit</option>
            </select>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="btn btn-ghost flex-1">Cancel</button>
          <button onClick={save} disabled={saving} className="btn btn-primary flex-1">{saving ? 'Saving...' : 'Save'}</button>
        </div>
      </div>
    </div>
  );
}
