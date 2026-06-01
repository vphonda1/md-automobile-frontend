import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Home, Users, Car, FileText, MessageCircle, Bell, Menu, X,
  Battery, BarChart3, Wrench, Receipt, Calendar, LogOut, Settings,
  Lock, Shield, UserCog, Video, Star, Zap
} from 'lucide-react';

// Hardcoded brand info (Settings page से dynamic बनाएंगे बाद में)
const BRAND_NAME = 'MD Automobile';

function lsRemove(key) {
  try { localStorage.removeItem(key); } catch {}
}

export default function Navbar({ user }) {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const logout = () => {
    if (!confirm('Logout करें?')) return;
    lsRemove('md_user');
    lsRemove('md_admin_session');
    navigate('/login');
    setTimeout(() => window.location.reload(), 100);
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
        { to: '/invoices', icon: FileText, label: 'Invoices' },
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
      <div style={{
        background: '#0f172a', borderBottom: '1px solid #1e293b',
        padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 30
      }}>
        <Link to="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
          <div style={{
            width: 40, height: 40, borderRadius: 8,
            background: 'linear-gradient(135deg, #16a34a, #15803d)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Zap size={22} color="white" />
          </div>
          <div>
            <div style={{ fontWeight: 'bold', color: '#16a34a' }}>{BRAND_NAME}</div>
            <div style={{ fontSize: 11, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4 }}>
              {user?.name || ''}
              {isAdmin && <span style={{ fontSize: 9, background: '#7f1d1d', padding: '2px 4px', borderRadius: 3 }}>ADMIN</span>}
              {!isAdmin && isManager && <span style={{ fontSize: 9, background: '#854d0e', padding: '2px 4px', borderRadius: 3 }}>MANAGER</span>}
            </div>
          </div>
        </Link>
        <button onClick={() => setOpen(true)} style={{ background: 'transparent', border: 'none', color: 'white', padding: 8, cursor: 'pointer' }}>
          <Menu size={22} />
        </button>
      </div>

      <div className="md:hidden" style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: '#0f172a', borderTop: '1px solid #1e293b', zIndex: 20,
        display: 'flex', justifyContent: 'space-around', padding: '8px 0'
      }}>
        {[
          { to: '/dashboard', icon: Home, label: 'Home' },
          { to: '/customers', icon: Users, label: 'Customers' },
          { to: '/vehicles', icon: Car, label: 'Vehicles' },
          { to: '/tax-invoice', icon: FileText, label: 'Invoice' },
          { to: '/chat', icon: MessageCircle, label: 'Chat' }
        ].map(l => (
          <Link key={l.to} to={l.to} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            fontSize: 11, textDecoration: 'none',
            color: isActive(l.to) ? '#16a34a' : '#94a3b8'
          }}>
            <l.icon size={20} />
            {l.label}
          </Link>
        ))}
      </div>

      {open && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(0,0,0,0.7)' }} onClick={() => setOpen(false)}>
          <div style={{
            position: 'absolute', right: 0, top: 0, bottom: 0, width: 288,
            background: '#0f172a', overflowY: 'auto'
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: 12, borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 'bold', color: '#16a34a' }}>Menu</span>
              <button onClick={() => setOpen(false)} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}>
                <X />
              </button>
            </div>

            {linkGroups.map((group, gi) => (
              <div key={gi} style={{ padding: 8 }}>
                <div style={{ fontSize: 11, textTransform: 'uppercase', color: '#64748b', padding: '4px 8px' }}>{group.title}</div>
                {group.links.map(link => (
                  <Link key={link.to} to={link.to} onClick={() => setOpen(false)} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 12px', borderRadius: 6,
                    textDecoration: 'none',
                    color: isActive(link.to) ? '#16a34a' : '#cbd5e1',
                    background: isActive(link.to) ? 'rgba(22, 163, 74, 0.2)' : 'transparent'
                  }}>
                    <link.icon size={16} />
                    <span style={{ fontSize: 14 }}>{link.label}</span>
                  </Link>
                ))}
              </div>
            ))}

            <div style={{ padding: 8, borderTop: '1px solid #1e293b' }}>
              <button onClick={logout} style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 12px', borderRadius: 6,
                background: 'transparent', border: 'none', color: '#fca5a5',
                cursor: 'pointer'
              }}>
                <LogOut size={16} />
                <span style={{ fontSize: 14 }}>Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
EOF
echo "Fixed Navbar without require()"
