import React, { useState, useEffect } from 'react';
import { Upload, Search, Trash2, FileText, Image as ImageIcon } from 'lucide-react';
import AdminPasswordModal from '../components/AdminPasswordModal';
import { api } from '../utils/apiConfig';
import { formatDate, compressImage } from '../utils/smartUtils';

const DOC_TYPES = ['aadhar', 'pan', 'license', 'photo', 'address-proof', 'invoice', 'rc', 'insurance', 'other'];

export default function DocumentVault() {
  const [docs, setDocs] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const doDelete = async () => {
    await api.delete(`/api/documents/${confirmDelete._id}`);
    setConfirmDelete(null);
    load();
  };

  const load = async () => {
    setLoading(true);
    try { setDocs(await api.get('/api/documents')); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = docs.filter(d => {
    if (filter !== 'all' && d.documentType !== filter) return false;
    if (!search) return true;
    return [d.customerName, d.mobileNo, d.documentName, d.documentNumber]
      .some(f => String(f || '').toLowerCase().includes(search.toLowerCase()));
  });

  return (
    <div className="p-4 max-w-7xl mx-auto fade-in">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-green-400">Document Vault ({filtered.length})</h1>
        <button onClick={() => setShowForm(true)} className="btn btn-primary flex items-center gap-1">
          <Upload size={16} /> Upload
        </button>
      </div>

      <div className="card mb-4 space-y-2">
        <div className="flex items-center gap-2"><Search size={18} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search documents..." /></div>
        <div className="flex gap-1 overflow-x-auto">
          <button onClick={() => setFilter('all')} className={`text-xs px-2 py-1 rounded ${filter === 'all' ? 'bg-green-700' : 'bg-slate-800'}`}>All</button>
          {DOC_TYPES.map(t => (
            <button key={t} onClick={() => setFilter(t)} className={`text-xs px-2 py-1 rounded capitalize ${filter === t ? 'bg-green-700' : 'bg-slate-800'}`}>{t}</button>
          ))}
        </div>
      </div>

      {loading ? <div className="text-center py-8">Loading...</div> :
       filtered.length === 0 ? <div className="card text-center py-8 text-slate-500">No documents</div> :
       <div className="grid md:grid-cols-3 gap-3">
         {filtered.map(d => (
           <div key={d._id} className="card card-hover">
             <div className="flex items-start gap-2">
               {d.mimeType?.startsWith('image') ? <ImageIcon className="text-green-400" /> : <FileText className="text-green-400" />}
               <div className="flex-1 min-w-0">
                 <div className="font-semibold capitalize">{d.documentType}</div>
                 <div className="text-xs text-slate-400 truncate">{d.customerName}</div>
                 <div className="text-xs text-slate-500">{d.mobileNo}</div>
                 {d.documentNumber && <div className="text-xs text-yellow-400">{d.documentNumber}</div>}
                 <div className="text-xs text-slate-500">{formatDate(d.createdAt)}</div>
               </div>
               <button onClick={() => setConfirmDelete(d)} className="p-1.5 rounded bg-red-900">
                 <Trash2 size={12} />
               </button>
             </div>
             {d.fileBase64 && d.mimeType?.startsWith('image') && (
               <img src={d.fileBase64} alt="" className="w-full h-32 object-cover rounded mt-2" />
             )}
           </div>
         ))}
       </div>
      }

      {showForm && <UploadForm onClose={() => { setShowForm(false); load(); }} />}
      {confirmDelete && (
        <AdminPasswordModal
          action="Delete document"
          itemName={`${confirmDelete.documentType} — ${confirmDelete.customerName}`}
          onConfirm={doDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}

function UploadForm({ onClose }) {
  const [form, setForm] = useState({
    customerName: '', mobileNo: '',
    documentType: 'aadhar', documentNumber: '', documentName: '',
    fileBase64: '', mimeType: '', fileName: ''
  });
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type.startsWith('image')) {
      const blob = await compressImage(file);
      const reader = new FileReader();
      reader.onload = (evt) => setForm({ ...form, fileBase64: evt.target.result, mimeType: file.type, fileName: file.name });
      reader.readAsDataURL(blob);
    } else {
      const reader = new FileReader();
      reader.onload = (evt) => setForm({ ...form, fileBase64: evt.target.result, mimeType: file.type, fileName: file.name });
      reader.readAsDataURL(file);
    }
  };

  const save = async () => {
    if (!form.customerName || !form.mobileNo || !form.fileBase64) {
      alert('Please fill all fields and select a file');
      return;
    }
    setUploading(true);
    try { await api.post('/api/documents', form); onClose(); }
    catch (err) { alert('Failed: ' + err.message); }
    finally { setUploading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 p-4 overflow-y-auto" onClick={onClose}>
      <div className="card max-w-md mx-auto my-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold mb-4 text-green-400">Upload Document</h2>
        <div className="space-y-3">
          <Field label="Customer Name *" value={form.customerName} onChange={(v) => setForm({ ...form, customerName: v })} />
          <Field label="Mobile *" value={form.mobileNo} onChange={(v) => setForm({ ...form, mobileNo: v })} />
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Document Type</label>
            <select value={form.documentType} onChange={(e) => setForm({ ...form, documentType: e.target.value })}>
              {DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <Field label="Document Number" value={form.documentNumber} onChange={(v) => setForm({ ...form, documentNumber: v })} />
          <div>
            <label className="text-xs text-slate-400 mb-1 block">File</label>
            <input type="file" accept="image/*,application/pdf" onChange={handleFile} />
            {form.fileName && <div className="text-xs text-green-400 mt-1">✓ {form.fileName}</div>}
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="btn btn-ghost flex-1">Cancel</button>
          <button onClick={save} disabled={uploading} className="btn btn-primary flex-1">{uploading ? 'Uploading...' : 'Upload'}</button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text' }) {
  return <div><label className="text-xs text-slate-400 mb-1 block">{label}</label><input type={type} value={value} onChange={(e) => onChange(e.target.value)} /></div>;
}
