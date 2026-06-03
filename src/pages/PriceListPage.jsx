import React, { useState, useEffect } from 'react';
import { Plus, Search, Trash2, Edit2, Download, Upload, Database, X, ArrowUp, ArrowDown } from 'lucide-react';
import * as XLSX from 'xlsx';
import { api } from '../utils/apiConfig';
import { formatINR, toISODate } from '../utils/smartUtils';
import AdminPasswordModal from '../components/AdminPasswordModal';

export default function PriceListPage() {
  const [items, setItems] = useState([]);
  const [variants, setVariants] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [showAddModel, setShowAddModel] = useState(false);
  const [showEditVariants, setShowEditVariants] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [msg, setMsg] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [it, v] = await Promise.all([
        api.get('/api/pricelist'),
        api.get('/api/pricelist/variants').catch(() => ['W OUT BTY', '48 VOLT', '60 VOLT', '72 VOLT', '60 V 43 AH'])
      ]);
      setItems(it);
      setVariants(v);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const getPrice = (item, variantName) => item.variants?.find(x => x.name === variantName)?.price;

  const startEdit = (itemId, variantName, currentPrice) => {
    setEditing({ itemId, variantName });
    setEditValue(currentPrice != null ? String(currentPrice) : '');
  };

  const saveEdit = async () => {
    if (!editing) return;
    const raw = editValue.trim();
    const price = raw === '' || raw.toUpperCase() === 'NA' ? null : Number(raw);
    if (price !== null && isNaN(price)) {
      alert('Valid number डालें या खाली छोड़ें');
      return;
    }
    try {
      const updated = await api.patch(`/api/pricelist/${editing.itemId}/price`, {
        variantName: editing.variantName,
        price
      });
      setItems(items.map(i => i._id === editing.itemId ? updated : i));
      setEditing(null);
      setEditValue('');
    } catch (err) {
      alert('Save failed: ' + err.message);
    }
  };

  const cancelEdit = () => { setEditing(null); setEditValue(''); };

  const doDelete = async () => {
    await api.delete(`/api/pricelist/${confirmDelete._id}`);
    setConfirmDelete(null);
    load();
  };

  const seedYakuza = async () => {
    if (!confirm('Yakuza 26 models seed करें? (केवल empty database पर काम करेगा)')) return;
    try {
      const r = await api.get('/api/pricelist/seed-yakuza');
      setMsg(r.message || `${r.seeded} models added`);
      setTimeout(() => setMsg(''), 5000);
      load();
    } catch (err) { alert(err.message); }
  };

  const handleExport = () => {
    const data = items.map(it => {
      const row = { 'S No': it.serialNo, 'Model': it.modelName };
      variants.forEach(v => { row[v] = getPrice(it, v) ?? 'NA'; });
      return row;
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Price List');
    XLSX.writeFile(wb, `yakuza-pricelist-${toISODate(new Date())}.xlsx`);
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

        const newItems = rows.map(r => {
          const variantArr = [];
          variants.forEach(v => {
            const val = r[v];
            if (val !== undefined && val !== 'NA' && val !== '' && val !== null) {
              variantArr.push({ name: v, price: Number(val) });
            } else {
              variantArr.push({ name: v, price: null });
            }
          });
          return {
            modelName: String(r.Model || r['Model Name'] || '').toUpperCase().trim(),
            serialNo: Number(r['S No'] || r.serialNo || 0),
            brandName: r.Brand || 'Yakuza',
            variants: variantArr
          };
        }).filter(i => i.modelName);

        const res = await api.post('/api/pricelist/sync', { items: newItems });
        setMsg(`✅ ${res.added} added, ${res.updated} updated`);
        setTimeout(() => setMsg(''), 5000);
        load();
      } catch (err) { alert('Import failed: ' + err.message); }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  const filtered = items.filter(i => !search || i.modelName.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-4 max-w-7xl mx-auto fade-in" style={{ paddingBottom: 100 }}>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-green-400">💰 Price List</h1>
          <p className="text-xs text-slate-400">Yakuza Electric • {filtered.length} models • हर cell click करके edit करें</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setShowAddModel(true)} className="btn btn-primary flex items-center gap-1"><Plus size={14} /> Model</button>
          <button onClick={() => setShowEditVariants(true)} className="btn btn-secondary flex items-center gap-1"><Edit2 size={14} /> Columns</button>
          <button onClick={handleExport} className="btn btn-ghost flex items-center gap-1"><Download size={14} /> Export</button>
          <label className="btn btn-ghost flex items-center gap-1 cursor-pointer">
            <Upload size={14} /> Import
            <input type="file" accept=".xlsx,.xls,.csv" onChange={handleImport} className="hidden" />
          </label>
        </div>
      </div>

      {msg && <div className="card bg-blue-900/30 border-blue-700 mb-4 text-sm">{msg}</div>}

      <div className="card mb-4">
        <div className="flex items-center gap-2">
          <Search size={18} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Model search (RUBIE, SPARROW...)..." />
        </div>
      </div>

      {loading ? <div className="text-center py-8 text-slate-400">Loading...</div> :
       items.length === 0 ? (
         <div className="card text-center py-12">
           <Database size={48} className="mx-auto text-slate-600 mb-3" />
           <p className="text-slate-400 mb-1">Price list खाली है</p>
           <p className="text-xs text-slate-500 mb-4">Yakuza के 26 standard models एक click से load करें</p>
           <button onClick={seedYakuza} className="btn btn-primary flex items-center gap-2 mx-auto">
             <Database size={16} /> Yakuza 26 Models Seed करें
           </button>
         </div>
       ) :
       <div className="card overflow-x-auto p-0">
         <table className="w-full text-sm">
           <thead>
             <tr className="border-b-2 border-green-700 bg-slate-900">
               <th className="text-left py-3 px-2 whitespace-nowrap">S.No</th>
               <th className="text-left py-3 px-3 whitespace-nowrap">Model</th>
               {variants.map(v => (
                 <th key={v} className="text-right py-3 px-3 text-yellow-400 whitespace-nowrap font-mono text-xs">{v}</th>
               ))}
               <th className="text-right py-3 px-2 w-10">⚙️</th>
             </tr>
           </thead>
           <tbody>
             {filtered.map(item => (
               <tr key={item._id} className="border-b border-slate-800 hover:bg-slate-800/40">
                 <td className="py-1 px-2 text-slate-500">{item.serialNo}</td>
                 <td className="py-1 px-3 font-bold text-green-400 whitespace-nowrap">{item.modelName}</td>
                 {variants.map(v => {
                   const price = getPrice(item, v);
                   const isCellEditing = editing?.itemId === item._id && editing?.variantName === v;
                   return (
                     <td key={v} className="text-right py-0.5 px-1 whitespace-nowrap">
                       {isCellEditing ? (
                         <input
                           autoFocus
                           value={editValue}
                           onChange={(e) => setEditValue(e.target.value)}
                           onBlur={saveEdit}
                           onKeyDown={(e) => {
                             if (e.key === 'Enter') saveEdit();
                             if (e.key === 'Escape') cancelEdit();
                           }}
                           className="w-28 text-right text-sm py-1"
                           placeholder="NA"
                         />
                       ) : (
                         <button
                           onClick={() => startEdit(item._id, v, price)}
                           className={`w-full text-right px-2 py-1.5 rounded transition ${price != null ? 'hover:bg-green-900/40 text-white' : 'text-slate-600 hover:bg-slate-800 italic'}`}
                           title="Click to edit"
                         >
                           {price != null ? formatINR(price) : 'NA'}
                         </button>
                       )}
                     </td>
                   );
                 })}
                 <td className="text-right py-1 px-2">
                   <button onClick={() => setConfirmDelete(item)} className="p-1.5 rounded bg-red-900 hover:bg-red-800" title="Delete">
                     <Trash2 size={12} />
                   </button>
                 </td>
               </tr>
             ))}
           </tbody>
         </table>
         <div className="p-3 text-xs text-slate-500 text-center border-t border-slate-800">
           💡 Tip: कोई price बदलनी हो तो उस cell पर click करें, नया price type करें, Enter दबाएं। खाली छोड़ने पर NA हो जाएगा।
         </div>
       </div>
      }

      {showAddModel && <AddModelForm variants={variants} onClose={() => { setShowAddModel(false); load(); }} />}
      {showEditVariants && <EditVariantsForm currentVariants={variants} onClose={() => { setShowEditVariants(false); load(); }} />}
      {confirmDelete && (
        <AdminPasswordModal
          action="Delete model from price list"
          itemName={confirmDelete.modelName}
          onConfirm={doDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}

function AddModelForm({ variants, onClose }) {
  const [modelName, setModelName] = useState('');
  const [serialNo, setSerialNo] = useState('');
  const [prices, setPrices] = useState({});
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!modelName.trim()) return alert('Model name ज़रूरी है');
    setSaving(true);
    try {
      const variantsArr = variants.map(v => ({
        name: v,
        price: prices[v] && prices[v].trim() !== '' ? Number(prices[v]) : null
      }));
      await api.post('/api/pricelist', {
        modelName: modelName.toUpperCase().trim(),
        serialNo: Number(serialNo) || 0,
        brandName: 'Yakuza',
        variants: variantsArr
      });
      onClose();
    } catch (err) { alert(err.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 p-4 overflow-y-auto" onClick={onClose}>
      <div className="card max-w-md mx-auto my-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold mb-4 text-green-400">+ New Model</h2>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Model Name *</label>
            <input value={modelName} onChange={(e) => setModelName(e.target.value.toUpperCase())} placeholder="e.g. RUBIE, SPARROW" />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Serial No</label>
            <input type="number" value={serialNo} onChange={(e) => setSerialNo(e.target.value)} />
          </div>
          <div className="text-xs text-slate-500 mt-2">Prices (खाली छोड़ने पर NA होगा):</div>
          {variants.map(v => (
            <div key={v}>
              <label className="text-xs text-slate-400 mb-1 block">{v}</label>
              <input type="number" value={prices[v] || ''} onChange={(e) => setPrices({ ...prices, [v]: e.target.value })} placeholder="NA" />
            </div>
          ))}
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="btn btn-ghost flex-1">Cancel</button>
          <button onClick={save} disabled={saving} className="btn btn-primary flex-1">{saving ? 'Saving...' : 'Save'}</button>
        </div>
      </div>
    </div>
  );
}

function EditVariantsForm({ currentVariants, onClose }) {
  const [variants, setVariants] = useState([...currentVariants]);
  const [newVariant, setNewVariant] = useState('');
  const [saving, setSaving] = useState(false);

  const addVariant = () => {
    const v = newVariant.trim();
    if (!v) return;
    if (variants.includes(v)) return alert('यह column पहले से है');
    setVariants([...variants, v]);
    setNewVariant('');
  };

  const removeVariant = (v) => {
    if (!confirm(`Column "${v}" remove करें? (Models से data नहीं हटेगा, बस column hide होगा)`)) return;
    setVariants(variants.filter(x => x !== v));
  };

  const move = (idx, dir) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= variants.length) return;
    const a = [...variants];
    [a[idx], a[newIdx]] = [a[newIdx], a[idx]];
    setVariants(a);
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.put('/api/pricelist/variants', { variants });
      onClose();
    } catch (err) { alert(err.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 p-4 overflow-y-auto" onClick={onClose}>
      <div className="card max-w-md mx-auto my-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-bold text-green-400">Columns Manage करें</h2>
          <button onClick={onClose}><X size={20} /></button>
        </div>
        <p className="text-xs text-slate-400 mb-3">Battery variants — order बदलें, add/remove करें</p>

        <div className="space-y-2 mb-4">
          {variants.map((v, idx) => (
            <div key={v} className="flex items-center gap-2 p-2 bg-slate-800 rounded">
              <span className="flex-1 font-mono text-sm">{v}</span>
              <button onClick={() => move(idx, -1)} disabled={idx === 0} className="text-slate-400 disabled:opacity-30 p-1"><ArrowUp size={14} /></button>
              <button onClick={() => move(idx, 1)} disabled={idx === variants.length - 1} className="text-slate-400 disabled:opacity-30 p-1"><ArrowDown size={14} /></button>
              <button onClick={() => removeVariant(v)} className="text-red-400 p-1"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>

        <div className="flex gap-2 mb-4">
          <input value={newVariant} onChange={(e) => setNewVariant(e.target.value)} placeholder="नया जैसे: 84 VOLT" onKeyDown={(e) => e.key === 'Enter' && addVariant()} />
          <button onClick={addVariant} className="btn btn-primary px-3"><Plus size={16} /></button>
        </div>

        <div className="flex gap-2">
          <button onClick={onClose} className="btn btn-ghost flex-1">Cancel</button>
          <button onClick={save} disabled={saving} className="btn btn-primary flex-1">{saving ? 'Saving...' : 'Save'}</button>
        </div>
      </div>
    </div>
  );
}
