import React, { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../utils/apiConfig';

export default function UniversalSearch({ onClose }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ customers: [], vehicles: [], invoices: [] });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query || query.length < 2) {
      setResults({ customers: [], vehicles: [], invoices: [] });
      return;
    }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const [customers, vehicles, invoices] = await Promise.all([
          api.get('/api/customers', { search: query, limit: 5 }).catch(() => []),
          api.get('/api/vehicles', { search: query, limit: 5 }).catch(() => []),
          api.get('/api/invoices', { search: query, limit: 5 }).catch(() => [])
        ]);
        setResults({ customers, vehicles, invoices });
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 p-4" onClick={onClose}>
      <div className="max-w-2xl mx-auto mt-16 card" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 mb-4">
          <Search size={20} className="text-green-400" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search customers, vehicles, invoices..."
            className="flex-1"
          />
          <button onClick={onClose}><X size={20} /></button>
        </div>

        {loading && <div className="text-center py-4 text-slate-400">Searching...</div>}

        {!loading && query.length >= 2 && (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {results.customers.length > 0 && (
              <div>
                <div className="text-xs text-slate-500 mb-1">CUSTOMERS</div>
                {results.customers.map(c => (
                  <Link key={c._id} to={`/customers/${c._id}`} onClick={onClose} className="block p-2 rounded hover:bg-slate-800">
                    <div className="font-medium">{c.customerName}</div>
                    <div className="text-xs text-slate-400">{c.mobileNo} • {c.vehicleModel}</div>
                  </Link>
                ))}
              </div>
            )}
            {results.vehicles.length > 0 && (
              <div>
                <div className="text-xs text-slate-500 mb-1">VEHICLES</div>
                {results.vehicles.map(v => (
                  <Link key={v._id} to={`/vehicles`} onClick={onClose} className="block p-2 rounded hover:bg-slate-800">
                    <div className="font-medium">{v.chassisNo} — {v.vehicleModel}</div>
                    <div className="text-xs text-slate-400">{v.customerName || 'In stock'}</div>
                  </Link>
                ))}
              </div>
            )}
            {results.invoices.length > 0 && (
              <div>
                <div className="text-xs text-slate-500 mb-1">INVOICES</div>
                {results.invoices.map(i => (
                  <Link key={i._id} to={`/invoices`} onClick={onClose} className="block p-2 rounded hover:bg-slate-800">
                    <div className="font-medium">{i.invoiceNumber}</div>
                    <div className="text-xs text-slate-400">{i.customerName} • ₹{i.totalAmount}</div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
