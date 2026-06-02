import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Upload, FileSpreadsheet, CheckCircle, RefreshCw, AlertTriangle } from 'lucide-react';

const BASE_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || 'https://md-automobile-backend.onrender.com';

// ── Excel column → our field name mapping (cost_detl sheet) ──
const COLUMN_MAP = {
  'Cost Name': 'customerName',
  'Father': 'fatherName',
  'S No': 'serialNo',
  'Date': 'saleDate',
  'Veh': 'vehicleModel',
  'Colour': 'color',
  'Varit': 'variant',
  'DOB': 'dob',
  'Aadhar No': 'aadhar',
  'PAN No': 'pan',
  'Mob No': 'mobile',
  'Add': 'address',
  'Dist': 'district',
  'Pin Code': 'pincode',
  'Manufac Date': 'manufactureDate',
  'Nominee Name': 'nomineeName',
  'Motor No': 'motorNo',
  'Chassis No': 'chassisNo',
  'Key No': 'keyNo',
  'Down Pay': 'downPayment',
  'Old Veh': 'oldVehicleValue',
  'Disburse': 'disbursed',
  'Net amt': 'netAmount',
  'Price': 'price',
  'Accesses': 'accessoriesValue',
  'S W/ Accsr': 'saleWithAccessories',
  'Helmat': 'helmet',
  'Fin/ Cash': 'paymentMode',
  'Fincr Pay': 'financierPayment',
  'Lose /Baki': 'pendingAmount',
  'Bty No': 'batteryNumbers',
  'Charger No': 'chargerNo',
  'Controller No': 'controllerNo',
  'Gift Record': 'giftRecord',
  'Day': 'day',
  'Month': 'month',
  'Year': 'year',
  'COLO': 'oldColor'
};

const normHeader = (h) => String(h || '').trim().replace(/\s+/g, ' ');

export default function ExcelImportPage() {
  const [file, setFile] = useState(null);
  const [workbook, setWorkbook] = useState(null);
  const [sheets, setSheets] = useState([]);
  const [selectedSheet, setSelectedSheet] = useState('');
  const [headers, setHeaders] = useState([]);
  const [rows, setRows] = useState([]);
  const [mapping, setMapping] = useState({});
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const handleFileSelect = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setError('');
    setResult(null);
    try {
      const buf = await f.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array', cellDates: true });
      setWorkbook(wb);
      setSheets(wb.SheetNames);
      const def = wb.SheetNames.find(n => /cost.?detl/i.test(n)) || wb.SheetNames[0];
      setSelectedSheet(def);
      parseSheet(wb, def);
    } catch (err) {
      setError('File read failed: ' + err.message);
    }
  };

  const parseSheet = (wb, sheetName) => {
    try {
      const ws = wb.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: false });
      if (!json.length) {
        setError('Sheet empty है');
        return;
      }
      const hdrs = (json[0] || []).map(h => normHeader(h));
      setHeaders(hdrs);

      const m = {};
      hdrs.forEach((h, i) => {
        if (COLUMN_MAP[h]) m[i] = COLUMN_MAP[h];
      });
      setMapping(m);

      const dataRows = json.slice(1).filter(row =>
        row && row.some(c => c != null && String(c).trim() !== '')
      );
      setRows(dataRows);
    } catch (err) {
      setError('Sheet parse failed: ' + err.message);
    }
  };

  const onSheetChange = (s) => {
    setSelectedSheet(s);
    parseSheet(workbook, s);
  };

  const resetAll = () => {
    setFile(null); setWorkbook(null); setSheets([]); setSelectedSheet('');
    setHeaders([]); setRows([]); setMapping({}); setResult(null); setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleImport = async () => {
    if (rows.length === 0) { setError('कोई rows नहीं हैं import करने के लिए'); return; }
    setImporting(true); setError(''); setResult(null);

    try {
      const records = rows.map(row => {
        const obj = {};
        Object.entries(mapping).forEach(([colIdx, field]) => {
          obj[field] = row[colIdx];
        });
        return obj;
      }).filter(r => r.customerName && String(r.customerName).trim());

      if (records.length === 0) {
        setError('No valid rows (customerName missing)');
        setImporting(false);
        return;
      }

      const res = await fetch(`${BASE_URL}/api/excel-import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setImporting(false);
    }
  };

  const S = {
    wrap: { padding: 16, color: 'white', maxWidth: 1100, margin: '0 auto', paddingBottom: 80 },
    title: { color: '#16a34a', fontSize: 24, fontWeight: 'bold', margin: '0 0 4px' },
    sub: { color: '#94a3b8', fontSize: 13, marginTop: 0, marginBottom: 20 },
    card: { background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: 16, marginBottom: 12 },
    dropZone: { background: '#0f172a', border: '2px dashed #16a34a', borderRadius: 12, padding: 40, textAlign: 'center', cursor: 'pointer' },
    btn: { background: '#16a34a', color: 'white', border: 'none', padding: '10px 20px', borderRadius: 8, fontWeight: 'bold', cursor: 'pointer', fontSize: 14 },
    btnGhost: { background: '#1e293b', color: 'white', border: 'none', padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontSize: 13 },
    stat: { background: '#0f172a', borderRadius: 12, padding: 14, textAlign: 'center' },
    statN: { color: '#16a34a', fontSize: 26, fontWeight: 'bold', margin: 0 },
    statL: { color: '#94a3b8', fontSize: 11, margin: '4px 0 0', textTransform: 'uppercase' },
    err: { background: 'rgba(127,29,29,0.4)', border: '1px solid #7f1d1d', color: '#fca5a5', padding: 12, borderRadius: 8, fontSize: 13 },
    th: { textAlign: 'left', padding: 8, color: '#94a3b8', fontSize: 11, fontWeight: 600, borderBottom: '1px solid #1e293b' },
    td: { padding: 8, fontSize: 11, borderBottom: '1px solid #1e293b', color: '#e2e8f0' }
  };

  return (
    <div style={S.wrap}>
      <h1 style={S.title}>📊 Excel Data Import</h1>
      <p style={S.sub}>Customers + Vehicles + Sales को एक साथ Excel से import करें. Supports .xlsx, .xlsm, .xls</p>

      {/* Step 1: File Upload */}
      {!file ? (
        <div style={S.dropZone} onClick={() => fileInputRef.current?.click()}>
          <FileSpreadsheet size={56} color="#16a34a" style={{ margin: '0 auto 12px', display: 'block' }} />
          <h3 style={{ margin: '0 0 6px', color: '#fff' }}>Excel File Select करें</h3>
          <p style={{ color: '#94a3b8', fontSize: 13, marginTop: 0 }}>
            .xlsx, .xlsm format supported · Default sheet: <code style={{ color: '#fde68a' }}>cost_detl</code>
          </p>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xlsm,.xls,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={handleFileSelect} style={{ display: 'none' }} />
          <button style={{ ...S.btn, marginTop: 12 }}>
            <Upload size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />
            Choose File
          </button>
        </div>
      ) : (
        <>
          {/* File Info + Change */}
          <div style={{ ...S.card, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>📎 {file.name}</div>
              <div style={{ color: '#94a3b8', fontSize: 12 }}>{(file.size / 1024).toFixed(1)} KB</div>
            </div>
            <button onClick={resetAll} style={S.btnGhost}>
              <RefreshCw size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
              Change
            </button>
          </div>

          {/* Sheet Selector */}
          {sheets.length > 1 && (
            <div style={S.card}>
              <label style={{ color: '#94a3b8', fontSize: 12, display: 'block', marginBottom: 6 }}>📋 Sheet चुनें</label>
              <select value={selectedSheet} onChange={(e) => onSheetChange(e.target.value)} style={{ background: '#020617', color: 'white', border: '1px solid #1e293b', padding: '10px 12px', borderRadius: 8, width: '100%', fontSize: 14 }}>
                {sheets.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          )}

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 12 }}>
            <div style={S.stat}><div style={S.statN}>{rows.length}</div><div style={S.statL}>Data Rows</div></div>
            <div style={S.stat}><div style={S.statN}>{Object.keys(mapping).length}/{headers.length}</div><div style={S.statL}>Mapped</div></div>
            <div style={S.stat}><div style={{ ...S.statN, fontSize: 18 }}>{selectedSheet}</div><div style={S.statL}>Sheet</div></div>
          </div>

          {/* Column Mapping (collapsible) */}
          <details style={S.card}>
            <summary style={{ color: '#fde68a', cursor: 'pointer', fontWeight: 'bold' }}>📋 Column Mapping देखें ({Object.keys(mapping).length} mapped)</summary>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8 }}>
              <thead><tr><th style={S.th}>Excel Column</th><th style={S.th}>→ Field</th></tr></thead>
              <tbody>
                {headers.map((h, i) => (
                  <tr key={i}>
                    <td style={S.td}>{h || <em style={{ color: '#475569' }}>(empty)</em>}</td>
                    <td style={{ ...S.td, color: mapping[i] ? '#16a34a' : '#64748b' }}>
                      {mapping[i] || '— skipped —'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>

          {/* Preview */}
          {rows.length > 0 && (
            <details style={S.card} open>
              <summary style={{ color: '#fde68a', cursor: 'pointer', fontWeight: 'bold' }}>👀 Preview (पहली 3 rows)</summary>
              <div style={{ overflowX: 'auto', marginTop: 8 }}>
                <table style={{ borderCollapse: 'collapse', minWidth: '100%' }}>
                  <thead>
                    <tr>
                      {Object.entries(mapping).slice(0, 10).map(([ci, f]) => (
                        <th key={ci} style={S.th}>{f}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 3).map((row, ri) => (
                      <tr key={ri}>
                        {Object.entries(mapping).slice(0, 10).map(([ci, _]) => (
                          <td key={ci} style={{ ...S.td, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {row[ci] != null ? String(row[ci]) : '—'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p style={{ color: '#94a3b8', fontSize: 11, marginTop: 8 }}>केवल पहले 10 columns दिखाए हैं · सब import होंगे</p>
            </details>
          )}

          {/* Error */}
          {error && <div style={S.err}>❌ {error}</div>}

          {/* Import Button */}
          <button onClick={handleImport} disabled={importing || rows.length === 0}
            style={{ width: '100%', background: importing ? '#475569' : '#16a34a', color: 'white', border: 'none', padding: 16, borderRadius: 12, fontSize: 16, fontWeight: 'bold', cursor: importing ? 'wait' : 'pointer', marginTop: 12 }}>
            {importing ? '⏳ Importing... कृपया wait करें' : `📥 Import ${rows.length} Rows`}
          </button>

          {/* Result */}
          {result && (
            <div style={{ background: result.errors?.length ? '#451a03' : '#14532d', border: `1px solid ${result.errors?.length ? '#854d0e' : '#16a34a'}`, borderRadius: 12, padding: 16, marginTop: 12 }}>
              <h3 style={{ color: '#16a34a', margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircle size={20} /> Import Complete!
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 8 }}>
                <div style={{ background: '#0f172a', borderRadius: 8, padding: 10 }}>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>👤 Customers</div>
                  <div style={{ fontSize: 16, fontWeight: 'bold' }}>+{result.customers?.created || 0} new</div>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>↻ {result.customers?.updated || 0} updated</div>
                </div>
                <div style={{ background: '#0f172a', borderRadius: 8, padding: 10 }}>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>🛵 Vehicles</div>
                  <div style={{ fontSize: 16, fontWeight: 'bold' }}>+{result.vehicles?.created || 0} new</div>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>↻ {result.vehicles?.updated || 0} updated</div>
                </div>
                <div style={{ background: '#0f172a', borderRadius: 8, padding: 10 }}>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>🧾 Invoices</div>
                  <div style={{ fontSize: 16, fontWeight: 'bold' }}>+{result.invoices?.created || 0} new</div>
                </div>
              </div>
              {result.errors?.length > 0 && (
                <details style={{ marginTop: 10 }}>
                  <summary style={{ color: '#fbbf24', cursor: 'pointer', fontSize: 13 }}>
                    <AlertTriangle size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                    {result.errors.length} rows में errors
                  </summary>
                  <ul style={{ fontSize: 11, color: '#fca5a5', marginTop: 6, maxHeight: 150, overflowY: 'auto' }}>
                    {result.errors.slice(0, 30).map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                </details>
              )}
              <p style={{ color: '#94a3b8', fontSize: 12, margin: '10px 0 0' }}>
                ✅ Data अब Customers, Vehicles, और Invoices pages पर automatically दिखेगा।
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
