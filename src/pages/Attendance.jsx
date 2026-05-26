import React, { useState, useEffect } from 'react';
import { MapPin, Clock, Check, X } from 'lucide-react';
import { api, ls } from '../utils/apiConfig';
import { formatDate } from '../utils/smartUtils';

export default function Attendance() {
  const user = ls.get('mdautomobile_user') || {};
  const [today, setToday] = useState(null);
  const [history, setHistory] = useState([]);
  const [allStaff, setAllStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const todayDate = new Date().toISOString().split('T')[0];

  const load = async () => {
    setLoading(true);
    try {
      const [att, staff] = await Promise.all([
        api.get('/api/attendance', { staffId: user.staffId, fromDate: getDateNDaysAgo(30) }),
        api.get('/api/staff', { active: 'true' })
      ]);
      setToday(att.find(a => a.date === todayDate));
      setHistory(att);
      setAllStaff(staff);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const getDateNDaysAgo = (n) => {
    const d = new Date(); d.setDate(d.getDate() - n);
    return d.toISOString().split('T')[0];
  };

  const checkIn = () => {
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        await api.post('/api/attendance/checkin', {
          staffId: user.staffId, staffName: user.name,
          lat: pos.coords.latitude, lng: pos.coords.longitude,
          address: 'GPS captured'
        });
        load();
        alert('✅ Checked in!');
      } catch (err) { alert('Failed: ' + err.message); }
    }, (err) => alert('GPS error: ' + err.message));
  };

  const checkOut = () => {
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        await api.post('/api/attendance/checkout', {
          staffId: user.staffId,
          lat: pos.coords.latitude, lng: pos.coords.longitude,
          address: 'GPS captured'
        });
        load();
        alert('✅ Checked out!');
      } catch (err) { alert('Failed: ' + err.message); }
    });
  };

  return (
    <div className="p-4 max-w-4xl mx-auto fade-in">
      <h1 className="text-2xl font-bold text-green-400 mb-4">Attendance</h1>

      <div className="card mb-4">
        <h3 className="font-semibold mb-3">Today — {todayDate}</h3>
        {!today?.checkIn ? (
          <button onClick={checkIn} className="btn btn-primary w-full flex items-center justify-center gap-2">
            <MapPin size={16} /> Check In Now
          </button>
        ) : !today?.checkOut ? (
          <div>
            <div className="text-sm mb-2 text-green-400">✅ Checked in at {new Date(today.checkIn).toLocaleTimeString()}</div>
            <button onClick={checkOut} className="btn btn-secondary w-full flex items-center justify-center gap-2">
              <Clock size={16} /> Check Out
            </button>
          </div>
        ) : (
          <div>
            <div className="text-sm text-green-400">✅ In: {new Date(today.checkIn).toLocaleTimeString()}</div>
            <div className="text-sm text-blue-400">✅ Out: {new Date(today.checkOut).toLocaleTimeString()}</div>
            <div className="text-sm">Hours: {today.workHours}</div>
          </div>
        )}
      </div>

      <h3 className="font-semibold mb-2">Recent History</h3>
      {loading ? <div className="text-center py-4">Loading...</div> :
       history.length === 0 ? <div className="card text-center text-slate-500">No records</div> :
       <div className="space-y-2">
         {history.slice(0, 30).map(a => (
           <div key={a._id} className="card flex justify-between items-center">
             <div>
               <div className="text-sm">{formatDate(a.date)}</div>
               <div className="text-xs text-slate-400">
                 {a.checkIn && `In: ${new Date(a.checkIn).toLocaleTimeString()}`}
                 {a.checkOut && ` • Out: ${new Date(a.checkOut).toLocaleTimeString()}`}
               </div>
             </div>
             <div className="text-right">
               <div className={`text-xs ${a.status === 'present' ? 'text-green-400' : 'text-red-400'}`}>{a.status}</div>
               {a.workHours > 0 && <div className="text-xs text-slate-400">{a.workHours}h</div>}
             </div>
           </div>
         ))}
       </div>
      }
    </div>
  );
}
