import React, { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { enablePushNotifications } from '../utils/smartUtils';
import { ls } from '../utils/apiConfig';

export default function NotifBanner({ user }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const dismissed = ls.get('mdautomobile_push_dismissed');
    if (dismissed) return;
    if (!('Notification' in window)) return;
    if (Notification.permission === 'default') {
      setTimeout(() => setShow(true), 3000);
    }
  }, []);

  const handleEnable = async () => {
    const result = await enablePushNotifications(user?._id || user?.staffId, user?.name);
    if (result.success) {
      setShow(false);
      alert('✅ Notifications enabled!');
    } else {
      alert('❌ ' + result.error);
    }
  };

  const handleDismiss = () => {
    setShow(false);
    ls.set('mdautomobile_push_dismissed', true);
  };

  if (!show) return null;

  return (
    <div className="fixed top-16 left-4 right-4 md:left-auto md:right-4 md:w-96 z-40 fade-in">
      <div className="card border-green-500 flex items-start gap-3">
        <Bell className="text-green-400 flex-shrink-0 mt-1" size={20} />
        <div className="flex-1">
          <div className="font-semibold mb-1">Enable Notifications</div>
          <div className="text-xs text-slate-400 mb-2">Service reminders, chat messages, और payment alerts प्राप्त करें।</div>
          <div className="flex gap-2">
            <button onClick={handleEnable} className="btn btn-primary text-sm py-1">Enable</button>
            <button onClick={handleDismiss} className="btn btn-ghost text-sm py-1">Not now</button>
          </div>
        </div>
        <button onClick={handleDismiss} className="text-slate-500 hover:text-white">
          <X size={18} />
        </button>
      </div>
    </div>
  );
}
