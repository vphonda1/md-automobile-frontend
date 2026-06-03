import React, { useState, useEffect } from 'react';
import { Plus, Search } from 'lucide-react';
import { api } from '../utils/apiConfig';
import { formatINR, formatDate } from '../utils/smartUtils';

export default function OldScooters() {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      // Use vehicles with status filter or notes containing 'exchange'/'used'
      const raw = await api.get('/api/vehicles');
      const data = Array.isArray(raw) ? raw : (raw?.vehicles || []);
      setItems(data.filter(v => v.notes?.toLowerCase().includes('used') || v.notes?.toLowerCase().includes('exchange') || v.status === 'exchange'));
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="p-4 max-w-7xl mx-auto fade-in" style={{ paddingBottom: 100 }}>
      <h1 className="text-2xl font-bold text-green-400 mb-4">Old Scooters / Exchange Inventory</h1>

      <div className="card mb-4">
        <div className="flex items-center gap-2"><Search size={18} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." /></div>
      </div>

      <div className="card text-center text-slate-500">
        <p>Old scooter exchange tracking</p>
        <p className="text-xs mt-2">Add vehicles via VehDashboard with status "exchange" or note "used"</p>
      </div>
    </div>
  );
}
