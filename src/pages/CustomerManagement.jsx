import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Download, Upload, Trash2, Phone, MessageCircle, Edit2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { api } from '../utils/apiConfig';
import { formatDate, openWhatsApp, parseUTCDate, toISODate } from '../utils/smartUtils';
import AdminPasswordModal from '../components/AdminPasswordModal';

export default function CustomerManagement() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const perPage = 20;

  const load = async () => {
    setLoading(true);
    try { setCustomers(await api.get('/api/customers')); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = customers.filter(c => {
    if (!search) return true;
    const q = search.toLowerCase();
    return [c.customerName, c.mobileNo, c.chassisNo, c.vehicleModel, c.batteryNumber]
      .some(f => String(f || '').toLowerCase().includes(q));
  });

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const doDelete = async () => {
    try {
      await api.delete(`/api/customers/${confirmDelete._id}`);
      setConfirmDelete(null);
      load();
    } catch (err) {
      alert('Delete failed: ' + err.message);
    }
  };

  const handleExport = () => {
    const exportData = filtered.map(c => ({
      Name: c.customerName, Mobile: c.mobileNo, Vehicle: c.vehicleModel,
      Chassis: c.chassisNo, Battery: c.batteryNumber, Motor: c.motorNumber,
      'Invoice Date': c.invoiceDate, 'Battery Warranty': c.batteryWarrantyDate,
      Address: c.address, City: c.city, Pincode: c.pincode
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Customers');
    XLSX.writeFile(wb, `md-customers-${toISODate(new Date())}.xlsx`);
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

        const customers = rows.map(r => ({
          customerName: r.Name || r.customerName || r['Customer Name'],
          mobileNo: String(r.Mobile || r.mobileNo || r.Phone || '').replace(/\D/g, ''),
          vehicleModel: r.Vehicle || r.vehicleModel || r.Model,
          chassisNo: r.Chassis || r.chassisNo,
          batteryNumber: r.Battery || r.batteryNumber,
          motorNumber: r.Motor || r.motorNumber,
          invoiceDate: r['Invoice Date'] ? toISODate(parseUTCDate(r['Invoice Date'])) : '',
          batteryWarrantyDate: r['Battery Warranty'] ? toISODate(parseUTCDate(r['Battery Warranty'])) : '',
          dob: r.DOB ? toISODate(parseUTCDate(r.DOB)) : '',
          address: r.Address || '', city: r.City || '', pincode: r.Pincode || ''
        })).filter(c => c.mobileNo);

        const res = await api.post('/api/customers/sync', { customers });
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
        <h1 className="text-2xl font-bold text-green-400">Customers ({filtered.length})</h1>
        <div className="flex gap-2 flex-wrap">
          <Link to="/customers/new" className="btn btn-primary flex items-center gap-1"><Plus size={16} /> New</Link>
          <button onClick={handleExport} className="btn btn-ghost flex items-center gap-1"><Download size={16} /> Export</button>
          <label className="btn btn-ghost flex items-center gap-1 cursor-pointer">
            <Upload size={16} /> Import
            <input type="file" accept=".xlsx,.xls,.csv" onChange={handleImport} className="hidden" />
          </label>
        </div>
      </div>

      <div className="card mb-4">
        <div className="flex items-center gap-2">
          <Search size={18} className="text-slate-400" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search name, mobile, chassis, battery..." />
        </div>
      </div>

      {loading ? <div className="text-center py-8 text-slate-400">Loading...</div> :
       paginated.length === 0 ? <div className="card text-center py-8 text-slate-500">No customers</div> :
       <div className="space-y-2">
         {paginated.map(c => (
           <div key={c._id} className="card card-hover">
             <div className="flex items-start justify-between gap-2">
               <Link to={`/customers/${c._id}`} className="flex-1 min-w-0">
                 <div className="font-semibold text-green-400">{c.customerName}</div>
                 <div className="text-sm text-slate-300">{c.vehicleModel} • {c.color}</div>
                 <div className="text-xs text-slate-400 mt-1">📞 {c.mobileNo} {c.chassisNo && `• 🔧 ${c.chassisNo}`}</div>
                 {c.batteryNumber && <div className="text-xs text-yellow-400 mt-1">🔋 Battery: {c.batteryNumber}</div>}
                 {c.invoiceDate && <div className="text-xs text-slate-500 mt-1">Purchased: {formatDate(c.invoiceDate)}</div>}
               </Link>
               <div className="flex flex-col gap-1">
                 <button onClick={() => openWhatsApp(c.mobileNo, `नमस्ते ${c.customerName}, MD Automobile से।`)} className="p-2 rounded bg-green-700"><MessageCircle size={14} /></button>
                 <a href={`tel:${c.mobileNo}`} className="p-2 rounded bg-blue-700"><Phone size={14} /></a>
                 <button onClick={() => setConfirmDelete(c)} className="p-2 rounded bg-red-700"><Trash2 size={14} /></button>
               </div>
             </div>
           </div>
         ))}
       </div>
      }

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn btn-ghost">←</button>
          <span className="text-sm">Page {page} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn btn-ghost">→</button>
        </div>
      )}

      {confirmDelete && (
        <AdminPasswordModal
          action="Delete customer"
          itemName={`${confirmDelete.customerName} (${confirmDelete.mobileNo})`}
          onConfirm={doDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}
