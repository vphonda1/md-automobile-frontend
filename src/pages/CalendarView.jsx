import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { api } from '../utils/apiConfig';
import { formatDate } from '../utils/smartUtils';

export default function CalendarView() {
  const [month, setMonth] = useState(new Date());
  const [reminders, setReminders] = useState([]);
  const [followups, setFollowups] = useState([]);

  useEffect(() => {
    const fromDate = new Date(month.getFullYear(), month.getMonth(), 1).toISOString().split('T')[0];
    const toDate = new Date(month.getFullYear(), month.getMonth() + 1, 0).toISOString().split('T')[0];
    Promise.all([
      api.get('/api/reminders', { fromDate, toDate }).catch(() => []),
      api.get('/api/followups').catch(() => [])
    ]).then(([r, f]) => {
      setReminders(r);
      setFollowups(f);
    });
  }, [month]);

  const year = month.getFullYear();
  const monthIdx = month.getMonth();
  const firstDay = new Date(year, monthIdx, 1).getDay();
  const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
  const cells = [];

  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let i = 1; i <= daysInMonth; i++) {
    const dateStr = `${year}-${String(monthIdx + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
    const dayReminders = reminders.filter(r => r.dueDate === dateStr);
    const dayFollowups = followups.filter(f => f.followupDate === dateStr);
    cells.push({ day: i, date: dateStr, reminders: dayReminders, followups: dayFollowups });
  }

  return (
    <div className="p-4 max-w-5xl mx-auto fade-in">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setMonth(new Date(year, monthIdx - 1))} className="btn btn-ghost"><ChevronLeft /></button>
        <h1 className="text-xl font-bold text-green-400 flex items-center gap-2">
          <CalendarIcon /> {month.toLocaleString('default', { month: 'long', year: 'numeric' })}
        </h1>
        <button onClick={() => setMonth(new Date(year, monthIdx + 1))} className="btn btn-ghost"><ChevronRight /></button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <div key={d} className="text-center text-xs text-slate-400 py-1">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((c, i) => (
          <div key={i} className={`min-h-[80px] p-1 rounded border ${c ? 'border-slate-800 bg-slate-900' : 'border-transparent'}`}>
            {c && (
              <>
                <div className="text-xs">{c.day}</div>
                {c.reminders.slice(0, 2).map(r => (
                  <div key={r._id} className="text-[10px] bg-green-900 text-green-300 rounded px-1 mt-1 truncate" title={r.title}>{r.title}</div>
                ))}
                {c.followups.slice(0, 2).map(f => (
                  <div key={f._id} className="text-[10px] bg-blue-900 text-blue-300 rounded px-1 mt-1 truncate" title={f.customerName}>{f.customerName}</div>
                ))}
                {(c.reminders.length + c.followups.length) > 4 && (
                  <div className="text-[10px] text-slate-500">+{c.reminders.length + c.followups.length - 4}</div>
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
