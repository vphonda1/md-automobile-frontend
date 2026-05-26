import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, X } from 'lucide-react';

/**
 * AutoComplete with custom value support
 * 
 * Props:
 *   value, onChange — current value, change handler
 *   options — array of strings OR array of { value, label, meta }
 *   placeholder — input placeholder
 *   allowCustom — if true, user can type and use any value (default true)
 *   onSelect — callback when option selected (gets full option object)
 *   loadOptions — async function (query) => options (for server-side search)
 */
export default function AutoComplete({
  value = '',
  onChange,
  options = [],
  placeholder = 'Type to search...',
  allowCustom = true,
  onSelect,
  loadOptions
}) {
  const [open, setOpen] = useState(false);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);

  // Normalize options
  const normalize = (opt) => typeof opt === 'string' ? { value: opt, label: opt } : opt;

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (!open) return;
    
    if (loadOptions) {
      setLoading(true);
      const t = setTimeout(async () => {
        try {
          const opts = await loadOptions(value);
          setFiltered(opts.map(normalize));
        } catch (e) { setFiltered([]); }
        setLoading(false);
      }, 200);
      return () => clearTimeout(t);
    } else {
      const q = (value || '').toLowerCase();
      const f = options
        .map(normalize)
        .filter(o => !q || o.label.toLowerCase().includes(q) || (o.value || '').toString().toLowerCase().includes(q))
        .slice(0, 15);
      setFiltered(f);
    }
  }, [value, open, options.length]);

  const select = (opt) => {
    onChange(opt.value);
    if (onSelect) onSelect(opt);
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <div className="relative">
        <input
          value={value}
          onChange={(e) => { onChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="pr-8"
        />
        {value ? (
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
          >
            <X size={14} />
          </button>
        ) : (
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
        )}
      </div>

      {open && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded shadow-lg max-h-60 overflow-y-auto">
          {loading ? (
            <div className="p-3 text-xs text-slate-400 text-center">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="p-3 text-xs text-slate-500">
              {allowCustom ? `कोई match नहीं — "${value}" use करें ↵` : 'कोई option नहीं'}
            </div>
          ) : (
            filtered.map((opt, i) => (
              <button
                key={i}
                type="button"
                onClick={() => select(opt)}
                className="block w-full text-left px-3 py-2 text-sm hover:bg-green-700 transition"
              >
                <div>{opt.label}</div>
                {opt.meta && <div className="text-xs text-slate-400">{opt.meta}</div>}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
