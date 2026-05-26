import React, { useState } from 'react';
import { Shield, Lock, X, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

/**
 * AdminPasswordModal - gates destructive actions behind admin password
 * 
 * Usage:
 *   const [confirmDelete, setConfirmDelete] = useState(false);
 *   ...
 *   <button onClick={() => setConfirmDelete(item)}>Delete</button>
 *   {confirmDelete && (
 *     <AdminPasswordModal
 *       action="delete customer"
 *       itemName={confirmDelete.name}
 *       onConfirm={async () => { await deleteItem(confirmDelete); setConfirmDelete(null); }}
 *       onCancel={() => setConfirmDelete(null)}
 *     />
 *   )}
 */
export default function AdminPasswordModal({ action, itemName, onConfirm, onCancel }) {
  const { user, isAdmin, isAdminFresh, verifyAdmin } = useAuth();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [verifying, setVerifying] = useState(false);

  // If user is admin AND was verified within last 5 min, skip password prompt
  const canSkipPassword = isAdmin() && isAdminFresh();

  const handleConfirm = async () => {
    setError('');

    if (canSkipPassword) {
      onConfirm();
      return;
    }

    if (!password) {
      setError('Password ज़रूरी है');
      return;
    }

    setVerifying(true);
    try {
      const valid = await verifyAdmin(password);
      if (!valid) {
        setError('गलत admin password');
        setVerifying(false);
        return;
      }
      onConfirm();
    } catch (err) {
      setError(err.message || 'Verification failed');
      setVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4" onClick={onCancel}>
      <div className="card max-w-md w-full border-red-700" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-red-900/50">
              <Shield className="text-red-400" size={20} />
            </div>
            <div>
              <h3 className="font-bold text-red-400">Admin Permission Required</h3>
              <p className="text-xs text-slate-400">यह action confirm करने के लिए admin password चाहिए</p>
            </div>
          </div>
          <button onClick={onCancel} className="text-slate-500 hover:text-white"><X size={20} /></button>
        </div>

        <div className="card bg-yellow-900/20 border-yellow-700 mb-3">
          <div className="flex items-start gap-2 text-sm">
            <AlertTriangle size={16} className="text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-yellow-400">Action: {action}</div>
              {itemName && <div className="text-xs text-slate-300 mt-1">Item: <span className="font-mono">{itemName}</span></div>}
            </div>
          </div>
        </div>

        {canSkipPassword ? (
          <div className="text-sm text-green-400 mb-3 flex items-center gap-2">
            <Shield size={14} /> Admin session active — password नहीं चाहिए
          </div>
        ) : (
          <div className="space-y-2 mb-3">
            <label className="text-xs text-slate-400 flex items-center gap-1">
              <Lock size={12} /> Admin password (logged in: {user?.name})
            </label>
            <input
              type="password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleConfirm(); }}
              placeholder="••••••••"
            />
            {error && <div className="text-xs text-red-400">{error}</div>}
          </div>
        )}

        <div className="flex gap-2">
          <button onClick={onCancel} className="btn btn-ghost flex-1">Cancel</button>
          <button
            onClick={handleConfirm}
            disabled={verifying || (!canSkipPassword && !password)}
            className="btn btn-danger flex-1"
          >
            {verifying ? 'Verifying...' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}
