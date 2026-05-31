import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Home, Users, Car, FileText, MessageCircle, Bell, Menu, X,
  Battery, BarChart3, Wrench, Receipt, Calendar, LogOut, Settings,
  Lock, Shield, UserCog, Video, Star, Zap
} from 'lucide-react';
import { ls, MD_CONFIG } from '../utils/apiConfig';

export default function Navbar({ user }) {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const logout = () => {
    if (!confirm('Logout करें?')) return;
    ls.remove('md_user');
    ls.remove('md_admin_session');
    navigate('/login');
  };

  const isAdmin = ['owner', 'admin'].includes(user?.role);
  const isManager = ['owner', 'admin', 'manager'].includes(user?.role);

  const linkGroups = [
    {
      title: 'Main',
      links: [
        { to: '/dashboard', icon: Home, label: 'Dashboard' },
        { to: '/comprehensive', icon: BarChart3, label: 'Analytics' },
        { to: '/calendar', icon: Calendar, label: 'Calendar' }
      ]
    },
    {
      title: 'Sales',
      links: [
        { to: '/customers', icon: Users, label: 'Customers' },
        { to: '/customers/new', icon: Users, label: '+ New Customer' },
        { to: '/vehicles', icon: Car, label: 'Vehicle Inventory' },
        { to: '/pricelist', icon: Receipt, label: '💰 Price List' },
        { to: '/tax-invoice', icon: FileText, label: '🧾 Tax Invoice' },
        { to: '/invoices', icon: FileText, label: 'Invoices (Old)' },
        { to: '/quotations', icon: Receipt, label: 'Quotations' },
        { to: '/test-rides', icon: Zap, label: '🛵 Test Rides' },
        { to: '/followups', icon: MessageCircle, label: 'Follow-ups' }
      ]
    },
    {
      title: 'Service',
      links: [
        { to: '/appointments', icon: Calendar, label: '📅 Service Appointments' },
        { to: '/jobcards', icon: Wrench, label: 'Job Cards' },
        { to: '/warranty', icon: Battery, label: '🔋 Warranty Replacements' },
        { to: '/parts', icon: Battery, label: 'Spare Parts' },
        { to: '/service-data', icon: Wrench, label: 'Service Schedule' }
      ]
    },
    {
      title: 'Finance',
      links: [
        { to: '/payments', icon: Receipt, label: 'Payments' },
        { to: '/reports', icon: BarChart3, label: 'Reports' }
      ]
    },
    {
      title: 'Team & Customer',
      links: [
        { to: '/chat', icon: MessageCircle, label: 'Team Chat' },
        { to: '/meeting', icon: Video, label: 'Video Meeting' },
        { to: '/feedback', icon: Star, label: '⭐ Customer Feedback' },
        { to: '/attendance', icon: Calendar, label: 'My Attendance' },
        { to: '/reminders', icon: Bell, label: 'Reminders' },
        { to: '/documents', icon: FileText, label: 'Document Vault' }
      ]
    },
    isAdmin && {
      title: 'Admin',
      links: [
        { to: '/admin', icon: Shield, label: 'Admin Panel' },
        { to: '/staff', icon: UserCog, label: 'Manage Staff' },
        { to: '/salary', icon: Receipt, label: 'Salary' },
        { to: '/settings', icon: Settings, label: 'App Settings' }
      ]
    },
    isManager && !isAdmin && {
      title: 'Manager',
      links: [{ to: '/manager', icon: UserCog, label: 'Manager View' }]
    },
    {
      title: 'Account',
      links: [
        { to: '/change-password', icon: Lock, label: 'Change Password' }
      ]
    }
  ].filter(Boolean);

  const isActive = (to) => location.pathname === to;

  return (
    <>
      {/* Top bar */}
      <div className="bg-slate-900 border-b border-slate-800 p-3 flex items-center justify-between sticky top-0 z-30">
        <Link to="/dashboard" className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-lg gradient-green flex items-center justify-center">
            <Zap size={22} className="text-white" />
          </div>
          <div>
            <div className="font-bold text-green-400">{MD_CONFIG.brandName}</div>
            <div className="text-xs text-slate-400 flex items-center gap-1">
              {user?.name}
              {isAdmin && <span className="text-[10px] bg-red-900 px-1 rounded">ADMIN</span>}
              {!isAdmin && isManager && <span className="text-[10px] bg-yellow-900 px-1 rounded">MANAGER</span>}
            </div>
          </div>
        </Link>
        <button onClick={() => setOpen(true)} className="btn btn-ghost p-2"><Menu size={22} /></button>
      </div>

      {/* Bottom mobile nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 z-20 flex justify-around py-2">
        {[
          { to: '/dashboard', icon: Home, label: 'Home' },
          { to: '/customers', icon: Users, label: 'Customers' },
          { to: '/vehicles', icon: Car, label: 'Vehicles' },
          { to: '/tax-invoice', icon: FileText, label: 'Invoices' },
          { to: '/chat', icon: MessageCircle, label: 'Chat' }
        ].map(l => (
          <Link key={l.to} to={l.to} className={`flex flex-col items-center text-xs ${isActive(l.to) ? 'text-green-400' : 'text-slate-400'}`}>
            <l.icon size={20} /> {l.label}
          </Link>
        ))}
      </div>

      {/* Drawer */}
      {open && (
        <div className="fixed inset-0 z-40 bg-black/70" onClick={() => setOpen(false)}>
          <div className="absolute right-0 top-0 bottom-0 w-72 bg-slate-900 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-3 border-b border-slate-800 flex items-center justify-between">
              <span className="font-bold text-green-400">Menu</span>
              <button onClick={() => setOpen(false)}><X /></button>
            </div>
            {linkGroups.map((group, gi) => (
              <div key={gi} className="p-2">
                <div className="text-xs uppercase text-slate-500 px-2 py-1">{group.title}</div>
                {group.links.map(link => (
                  <Link key={link.to} to={link.to} onClick={() => setOpen(false)}
                    className={`flex items-center gap-2 px-3 py-2 rounded ${isActive(link.to) ? 'bg-green-900/40 text-green-400' : 'hover:bg-slate-800'}`}>
                    <link.icon size={16} />
                    <span className="text-sm">{link.label}</span>
                  </Link>
                ))}
              </div>
            ))}
            <div className="p-2 border-t border-slate-800">
              <button onClick={logout} className="w-full flex items-center gap-2 px-3 py-2 rounded hover:bg-red-900/30 text-red-400">
                <LogOut size={16} /> <span className="text-sm">Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
