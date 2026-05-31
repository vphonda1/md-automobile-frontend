import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Home, Users, Car, FileText, MessageCircle, Bell, Menu, X,
  Battery, BarChart3, Wrench, Receipt, Calendar, LogOut, Settings,
  Lock, Shield, UserCog, Video
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { MD_CONFIG } from '../utils/apiConfig';

export default function Navbar({ user }) {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, isAdmin, isManager } = useAuth();

  const mainLinks = [
    { to: '/dashboard', icon: Home, label: 'Home' },
    { to: '/customers', icon: Users, label: 'Customers' },
    { to: '/vehicles', icon: Car, label: 'Vehicles' },
    { to: '/invoices', icon: FileText, label: 'Invoices' },
    { to: '/chat', icon: MessageCircle, label: 'Chat' }
  ];

  // Group links by category for cleaner drawer
  const linkGroups = [
    {
      title: 'Main',
      links: [
        { to: '/dashboard', icon: Home, label: 'Dashboard' },
        { to: '/analytics', icon: BarChart3, label: 'Analytics' },
        { to: '/calendar', icon: Calendar, label: 'Calendar' }
        { to: '/pricelist', icon: Receipt, label: '💰 Price List' },
      ]
    },
    {
      title: 'Sales',
      links: [
        { to: '/customers', icon: Users, label: 'Customers' },
        { to: '/customers/new', icon: Users, label: '+ New Customer' },
        { to: '/vehicles', icon: Car, label: 'Vehicle Inventory' },
        { to: '/test-rides', icon: Car, label: 'Test Rides 🆕' },
        { to: '/invoices', icon: FileText, label: 'Invoices' },
        { to: '/quotations', icon: Receipt, label: 'Quotations' },
        { to: '/followups', icon: MessageCircle, label: 'Follow-ups' }
      ]
    },
    {
      title: 'Service',
      links: [
        { to: '/appointments', icon: Calendar, label: 'Service Appointments 🆕' },
        { to: '/jobcards', icon: Wrench, label: 'Job Cards' },
        { to: '/warranty', icon: Battery, label: 'Warranty Replacements 🆕' },
        { to: '/parts', icon: Battery, label: 'Spare Parts' },
        { to: '/service-data', icon: Wrench, label: 'Service Schedule' }
      ]
    },
    {
      title: 'Finance',
      links: [
        { to: '/payments', icon: Receipt, label: 'Payments/EMI' },
        { to: '/reports', icon: BarChart3, label: 'Reports' },
        ...(isAdmin() ? [{ to: '/salary', icon: Receipt, label: 'Salary' }] : [])
      ]
    },
    {
      title: 'Team & Customer',
      links: [
        { to: '/chat', icon: MessageCircle, label: 'Team Chat' },
        { to: '/meeting', icon: Video, label: 'Video Meeting' },
        { to: '/feedback', icon: Bell, label: 'Customer Feedback 🆕' },
        { to: '/attendance', icon: Calendar, label: 'My Attendance' },
        { to: '/reminders', icon: Bell, label: 'Reminders' },
        { to: '/documents', icon: FileText, label: 'Document Vault' }
      ]
    },
    {
      title: 'Account',
      links: [
        { to: '/change-password', icon: Lock, label: 'Change Password' },
        ...(isAdmin() ? [
          { to: '/staff', icon: UserCog, label: 'Manage Staff', badge: 'Admin' },
          { to: '/admin', icon: Shield, label: 'Admin Panel', badge: 'Admin' },
          { to: '/settings', icon: Settings, label: 'App Settings', badge: 'Admin' }
        ] : [])
      ]
    }
  ];

  const handleLogout = () => {
    if (!confirm('Logout करना है?')) return;
    logout();
    navigate('/login');
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-slate-800">
        <div className="flex items-center justify-between px-4 h-16">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg gradient-green flex items-center justify-center font-bold text-white">⚡</div>
            <div>
              <div className="font-bold text-green-400">{MD_CONFIG.brandName}</div>
              <div className="text-xs text-slate-400 flex items-center gap-1">
                {user?.name || 'Welcome'}
                {isAdmin() && <span className="text-[10px] bg-red-900/50 text-red-300 px-1.5 rounded">ADMIN</span>}
                {!isAdmin() && isManager() && <span className="text-[10px] bg-blue-900/50 text-blue-300 px-1.5 rounded">MANAGER</span>}
                {user?.role && !isManager() && <span className="text-[10px] bg-slate-700 px-1.5 rounded capitalize">{user.role}</span>}
              </div>
            </div>
          </Link>

          <button onClick={() => setOpen(!open)} className="p-2 rounded-lg hover:bg-slate-800">
            {open ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </header>

      {open && (
        <div className="fixed inset-0 z-40 bg-black/60" onClick={() => setOpen(false)}>
          <div className="fixed right-0 top-16 bottom-0 w-80 max-w-[85vw] bg-slate-900 overflow-y-auto p-3" onClick={(e) => e.stopPropagation()}>
            {linkGroups.map(group => (
              <div key={group.title} className="mb-3">
                <div className="text-xs text-slate-500 uppercase tracking-wider px-2 py-1">{group.title}</div>
                <div className="space-y-0.5">
                  {group.links.map(link => (
                    <Link
                      key={link.to}
                      to={link.to}
                      onClick={() => setOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg transition text-sm ${
                        location.pathname === link.to ? 'bg-green-600 text-white' : 'hover:bg-slate-800'
                      }`}
                    >
                      <link.icon size={16} />
                      <span className="flex-1">{link.label}</span>
                      {link.badge && <span className="text-[10px] bg-red-900/50 text-red-300 px-1.5 rounded">{link.badge}</span>}
                    </Link>
                  ))}
                </div>
              </div>
            ))}

            <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2 mt-4 rounded-lg bg-red-600 hover:bg-red-700 text-white w-full text-sm">
              <LogOut size={16} /> Logout
            </button>
          </div>
        </div>
      )}

      {/* Bottom nav (mobile) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass border-t border-slate-800">
        <div className="grid grid-cols-5">
          {mainLinks.map(link => (
            <Link
              key={link.to}
              to={link.to}
              className={`flex flex-col items-center justify-center py-2 ${
                location.pathname === link.to ? 'text-green-400' : 'text-slate-400'
              }`}
            >
              <link.icon size={20} />
              <span className="text-[10px] mt-1">{link.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
