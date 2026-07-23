import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { Download, Upload, CheckCircle2, AlertTriangle, Users, Car, Tag, Layers } from 'lucide-react';
import Layout from '../components/Layout';
import api from '../api/api';

const CUSTOMER_TEMPLATE_HEADERS = [
  'customerName', 'mobile', 'alternateMobile', 'aadhar', 'address',
  'fatherName', 'nominee', 'nomineeRelation', 'hypothecation', 'occupation', 'notes',
];

const VEHICLE_TEMPLATE_HEADERS = [
  'chassisNo', 'vehicleType', 'modelName', 'variant', 'color',
  'seatingCapacity', 'loadCapacityKg', 'batteryType', 'batteryVoltage',
  'batteryCapacityAh', 'batteryNos', 'motorNo', 'motorPowerKw', 'controllerNo',
  'chargerNo', 'exShowroomPrice', 'onRoadPrice', 'status', 'notes',
];

const PRICE_LIST_TEMPLATE_HEADERS = [
  'modelName', 'serialNo', 'brandName', 'vehicleType', 'variantName', 'price',
];

const CUSTOMER_SAMPLE_ROWS = [{
  customerName: 'Ramesh Kumar', mobile: '9876543210', alternateMobile: '',
  aadhar: '1234 5678 9012', address: 'Bhopal, MP', fatherName: 'Suresh Kumar',
  nominee: 'Sunita Kumar', nomineeRelation: 'Wife', hypothecation: '', occupation: 'Driver', notes: '',
}];

const VEHICLE_SAMPLE_ROWS = [{
  chassisNo: 'MM1234567890', vehicleType: 'E-Rickshaw', modelName: 'Model X', variant: 'Deluxe',
  color: 'Red', seatingCapacity: 4, loadCapacityKg: '', batteryType: 'Lithium', batteryVoltage: '60V',
  batteryCapacityAh: 100, batteryNos: 'BAT001,BAT002', motorNo: 'MOT001', motorPowerKw: 1.2,
  controllerNo: 'CTR001', chargerNo: 'CHG001', exShowroomPrice: 150000, onRoadPrice: 165000,
  status: 'In Stock', notes: '',
}];

// Two rows, SAME modelName — the "one row per variant" pattern the
// price-list import groups back together on the backend.
const PRICE_LIST_SAMPLE_ROWS = [
  { modelName: 'Model X', serialNo: 'PL001', brandName: 'Mini Metro', vehicleType: 'E-Rickshaw', variantName: 'Standard', price: 150000 },
  { modelName: 'Model X', serialNo: 'PL001', brandName: 'Mini Metro', vehicleType: 'E-Rickshaw', variantName: 'Deluxe', price: 165000 },
];

const TABS = {
  customers: {
    label: 'Customers', icon: Users, headers: CUSTOMER_TEMPLATE_HEADERS, sample: CUSTOMER_SAMPLE_ROWS,
    endpoint: '/excel-import/customers', file: 'customer-import-template.xlsx',
    hint: 'customerName aur mobile zaroori hain, baaki columns optional hain.',
  },
  vehicles: {
    label: 'Vehicles', icon: Car, headers: VEHICLE_TEMPLATE_HEADERS, sample: VEHICLE_SAMPLE_ROWS,
    endpoint: '/excel-import/vehicles', file: 'vehicle-import-template.xlsx',
    hint: 'chassisNo aur vehicleType (E-Rickshaw ya Loader) zaroori hain, baaki optional hain.',
  },
  priceList: {
    label: 'Price List', icon: Tag, headers: PRICE_LIST_TEMPLATE_HEADERS, sample: PRICE_LIST_SAMPLE_ROWS,
    endpoint: '/excel-import/price-list', file: 'price-list-import-template.xlsx',
    hint: 'Ek model ke multiple variants ho to modelName repeat karke alag row mein daalo (jaise sample mein hai) — sab ek hi model ke andar group ho jayenge.',
  },
};

function downloadTemplate(headers, sampleRows, fileName) {
  const ws = XLSX.utils.json_to_sheet(sampleRows, { header: headers });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  XLSX.writeFile(wb, fileName);
}

// Reads the whole workbook (supports .xlsx, .xls, .xlsm, .csv — .xlsm is the
// same underlying zip format as .xlsx, so it parses the same way; macros
// inside it are simply ignored, which is fine since we only need cell data).
function readWorkbook(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'binary' });
        resolve(wb);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsBinaryString(file);
  });
}

function sheetToRows(workbook, sheetName) {
  const sheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json(sheet, { defval: '' });
}

export default function ExcelImportPage() {
  const [tab, setTab] = useState('customers');
  const [workbook, setWorkbook] = useState(null);
  const [sheetNames, setSheetNames] = useState([]);
  const [selectedSheet, setSelectedSheet] = useState('');
  const [rows, setRows] = useState([]);
  const [fileName, setFileName] = useState('');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const config = TABS[tab];

  const resetFileState = () => {
    setWorkbook(null);
    setSheetNames([]);
    setSelectedSheet('');
    setRows([]);
    setFileName('');
    setResult(null);
    setError('');
  };

  const switchTab = (t) => {
    setTab(t);
    resetFileState();
  };

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setError('');
    setResult(null);
    setFileName(file.name);
    try {
      const wb = await readWorkbook(file);
      setWorkbook(wb);
      setSheetNames(wb.SheetNames);
      // Auto-pick a sheet whose name matches the current tab, else first sheet —
      // handles a single workbook that has separate Customers/Vehicles/Price
      // List sheets inside it (e.g. your combined MD Automobile Excel file).
      const guess =
        wb.SheetNames.find((n) => n.toLowerCase().includes(tab === 'priceList' ? 'price' : tab.slice(0, -1))) ||
        wb.SheetNames[0];
      setSelectedSheet(guess);
      setRows(sheetToRows(wb, guess));
    } catch (err) {
      setError('File parse nahi ho payi. Excel (.xlsx/.xls/.xlsm) ya CSV file try karo.');
      setRows([]);
    }
  };

  const handleSheetChange = (sheetName) => {
    setSelectedSheet(sheetName);
    if (workbook) setRows(sheetToRows(workbook, sheetName));
  };

  const handleImport = async () => {
    if (rows.length === 0) return;
    setImporting(true);
    setError('');
    try {
      const { data } = await api.post(config.endpoint, { rows });
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="font-display text-2xl text-mm-text font-semibold">Excel Import</h1>
        <p className="text-mm-muted text-sm">Bulk customer, vehicle, ya price list data ek baar mein import karo</p>
      </div>

      <div className="flex bg-mm-surface rounded-lg p-1 mb-5 max-w-md">
        {Object.entries(TABS).map(([key, t]) => (
          <button
            key={key}
            onClick={() => switchTab(key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-medium transition ${tab === key ? 'bg-mm-red text-white' : 'text-mm-muted'}`}
          >
            <t.icon size={15} /> {t.label}
          </button>
        ))}
      </div>

      <div className="bg-mm-surface rounded-2xl p-5 mb-5">
        <p className="text-mm-text font-medium mb-1">Step 1 — Template download karo</p>
        <p className="text-mm-muted text-sm mb-3">{config.hint}</p>
        <button
          onClick={() => downloadTemplate(config.headers, config.sample, config.file)}
          className="flex items-center gap-2 bg-mm-navy text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          <Download size={16} /> Download Template
        </button>
      </div>

      <div className="bg-mm-surface rounded-2xl p-5 mb-5">
        <p className="text-mm-text font-medium mb-1">Step 2 — Filled file upload karo</p>
        <p className="text-mm-muted text-sm mb-3">
          Excel (.xlsx, .xls, .xlsm) ya CSV — agar ek hi file mein Customers/Vehicles/Price List alag-alag
          sheets mein hain, to upload karne ke baad neeche sheet choose kar sakte ho.
        </p>
        <input
          type="file"
          accept=".xlsx,.xls,.xlsm,.csv"
          onChange={handleFile}
          className="w-full text-mm-text text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-mm-red file:text-white file:text-xs"
        />
        {fileName && <p className="text-mm-muted text-xs mt-2">Selected: {fileName}</p>}

        {sheetNames.length > 1 && (
          <div className="mt-3">
            <label className="flex items-center gap-1.5 text-mm-muted text-xs mb-1">
              <Layers size={13} /> Is file mein {sheetNames.length} sheets mili — kaunsi use karein?
            </label>
            <select
              value={selectedSheet}
              onChange={(e) => handleSheetChange(e.target.value)}
              className="w-full bg-mm-bg text-mm-text px-3 py-2 rounded-lg border border-mm-navy text-sm"
            >
              {sheetNames.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        )}

        {rows.length > 0 && <p className="text-mm-muted text-xs mt-2">{rows.length} rows found in "{selectedSheet}"</p>}
      </div>

      {error && <p className="text-mm-red mb-4">{error}</p>}

      {rows.length > 0 && !result && (
        <div className="bg-mm-surface rounded-2xl p-5 mb-5">
          <p className="text-mm-text font-medium mb-3">Step 3 — Preview (pehli 5 rows)</p>
          <div className="overflow-x-auto">
            <table className="text-xs text-mm-muted w-full">
              <thead>
                <tr>
                  {config.headers.slice(0, 5).map((h) => (
                    <th key={h} className="text-left px-2 py-1 border-b border-mm-navy whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 5).map((r, i) => (
                  <tr key={i}>
                    {config.headers.slice(0, 5).map((h) => (
                      <td key={h} className="px-2 py-1 border-b border-mm-navy/50 whitespace-nowrap">{String(r[h] ?? '')}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            onClick={handleImport}
            disabled={importing}
            className="flex items-center gap-2 bg-mm-red hover:bg-mm-redDark text-white px-4 py-2 rounded-lg text-sm font-medium mt-4 disabled:opacity-60"
          >
            <Upload size={16} /> {importing ? 'Importing...' : `Import ${rows.length} rows`}
          </button>
        </div>
      )}

      {result && (
        <div className="bg-mm-surface rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="text-mm-navy" size={20} />
            <p className="text-mm-text font-medium">Import complete</p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center mb-3">
            <div className="bg-mm-bg rounded-lg p-3">
              <p className="text-mm-muted text-xs">Inserted</p>
              <p className="text-mm-text font-semibold">{result.inserted}</p>
            </div>
            <div className="bg-mm-bg rounded-lg p-3">
              <p className="text-mm-muted text-xs">Updated</p>
              <p className="text-mm-text font-semibold">{result.updated}</p>
            </div>
            <div className="bg-mm-bg rounded-lg p-3">
              <p className="text-mm-muted text-xs">Skipped</p>
              <p className="text-mm-red font-semibold">{result.skipped}</p>
            </div>
          </div>
          {result.errors?.length > 0 && (
            <div className="space-y-1">
              <p className="flex items-center gap-1.5 text-mm-red text-xs font-medium">
                <AlertTriangle size={14} /> Skipped rows:
              </p>
              {result.errors.map((e, i) => (
                <p key={i} className="text-mm-muted text-xs">Row {e.row}: {e.reason}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </Layout>
  );
}
