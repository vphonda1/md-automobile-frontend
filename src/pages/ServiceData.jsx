import React from 'react';
import { Battery, Wrench, Calendar } from 'lucide-react';

const SCHEDULE = [
  { num: 1, label: '1st Free Service', km: '500 km', months: '1 month', items: ['Battery health check', 'Motor inspection', 'Brake adjustment', 'Cable check', 'Tyre pressure'] },
  { num: 2, label: '2nd Free Service', km: '2,500 km', months: '6 months', items: ['Full battery diagnostic', 'Motor torque check', 'Brake pad inspection', 'Wheel alignment', 'Software update'] },
  { num: 3, label: '3rd Free Service', km: '5,000 km', months: '12 months', items: ['Battery cell balancing', 'Motor bearings check', 'Brake fluid', 'Suspension check', 'Lights & electricals'] },
  { num: 4, label: '4th Paid Service', km: '10,000 km', months: '18 months', items: ['Battery full report', 'Motor service', 'Brake pads replacement (if needed)', 'Tyre rotation', 'Charging port inspection'] },
  { num: 5, label: '5th Paid Service', km: '15,000 km', months: '24 months', items: ['Battery deep cycle test', 'Controller diagnostic', 'Suspension service', 'Full electrical audit'] }
];

const BATTERY_CARE = [
  '🔋 Charge battery between 20-80% for longest life',
  '🌡️ Avoid charging in extreme heat (>40°C) or cold (<5°C)',
  '⚡ Use only the original MD Automobile charger',
  '🔌 Don\'t leave plugged in for long periods after full charge',
  '🚗 Avoid completely draining the battery',
  '🛡️ Battery, Motor, Controller — 1 year warranty (invoice date से)'
];

export default function ServiceData() {
  return (
    <div className="p-4 max-w-4xl mx-auto fade-in" style={{ paddingBottom: 100 }}>
      <h1 className="text-2xl font-bold text-green-400 mb-4 flex items-center gap-2"><Wrench /> Service Schedule</h1>

      <div className="card mb-4 bg-green-900/20">
        <h3 className="font-semibold text-green-400 flex items-center gap-2 mb-2"><Battery /> Battery Care Tips</h3>
        <ul className="space-y-1 text-sm">
          {BATTERY_CARE.map((tip, i) => <li key={i}>{tip}</li>)}
        </ul>
      </div>

      <div className="space-y-3">
        {SCHEDULE.map(s => (
          <div key={s.num} className="card">
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="text-lg font-bold text-green-400">{s.label}</div>
                <div className="text-xs text-slate-400 flex items-center gap-3 mt-1">
                  <span>🛣️ {s.km}</span>
                  <span>📅 {s.months}</span>
                </div>
              </div>
            </div>
            <div className="text-xs">
              <strong className="text-slate-400">Service items:</strong>
              <ul className="mt-1 space-y-0.5">
                {s.items.map((item, i) => <li key={i} className="ml-4">• {item}</li>)}
              </ul>
            </div>
          </div>
        ))}
      </div>

      <div className="card mt-4 bg-yellow-900/20 border-yellow-700">
        <h3 className="font-semibold text-yellow-400 mb-2">⚠️ Important Notes</h3>
        <ul className="text-xs space-y-1">
          <li>• Whichever (km or time) comes first triggers the service</li>
          <li>• Free services are valid only at authorized MD Automobile service centers</li>
          <li>• Missing free service voids battery warranty extension benefits</li>
          <li>• Carry vehicle invoice and warranty card to every service</li>
        </ul>
      </div>
    </div>
  );
}
