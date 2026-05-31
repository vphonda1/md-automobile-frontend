import React, { lazy, Suspense, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import ErrorBoundary from './components/ErrorBoundary';
import NotifBanner from './components/NotifBanner';
import InstallPrompt from './components/InstallPrompt';

// Lazy load all pages
const LoginPage = lazy(() => import('./pages/LoginPage'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const ComprehensiveDashboard = lazy(() => import('./pages/ComprehensiveDashboard'));
const CustomerManagement = lazy(() => import('./pages/CustomerManagement'));
const NewCustomersPage = lazy(() => import('./pages/NewCustomersPage'));
const CustomerServiceProfile = lazy(() => import('./pages/CustomerServiceProfile'));
const VehDashboard = lazy(() => import('./pages/VehDashboard'));
const JobCardPage = lazy(() => import('./pages/JobCardPage'));
const InvoiceManagement = lazy(() => import('./pages/InvoiceManagement'));
const QuotationsPage = lazy(() => import('./pages/QuotationsPage'));
const PartsManagement = lazy(() => import('./pages/PartsManagement'));
const PaymentTracker = lazy(() => import('./pages/PaymentTracker'));
const ReportsAnalytics = lazy(() => import('./pages/ReportsAnalytics'));
const TeamChat = lazy(() => import('./pages/TeamChat'));
const MeetingRoom = lazy(() => import('./pages/MeetingRoom'));
const DocumentVault = lazy(() => import('./pages/DocumentVault'));
const RemindersPage = lazy(() => import('./pages/RemindersPage'));
const StaffManagement = lazy(() => import('./pages/StaffManagement'));
const Attendance = lazy(() => import('./pages/Attendance'));
const SalaryManagement = lazy(() => import('./pages/SalaryManagement'));
const AdminPanel = lazy(() => import('./pages/AdminPanel'));
const ManagerView = lazy(() => import('./pages/ManagerView'));
const CalendarView = lazy(() => import('./pages/CalendarView'));
const FollowupsPage = lazy(() => import('./pages/FollowupsPage'));
const OldScooters = lazy(() => import('./pages/OldScooters'));
const ServiceData = lazy(() => import('./pages/ServiceData'));
const Showroom = lazy(() => import('./pages/Showroom'));
const ChangePassword = lazy(() => import('./pages/ChangePassword'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const WarrantyReplacementPage = lazy(() => import('./pages/WarrantyReplacementPage'));
const TestRidesPage = lazy(() => import('./pages/TestRidesPage'));
const FeedbackPage = lazy(() => import('./pages/FeedbackPage'));
const ServiceAppointmentsPage = lazy(() => import('./pages/ServiceAppointmentsPage'));
const PriceListPage = lazy(() => import('./pages/PriceListPage'));
const TaxInvoicePage = lazy(() => import('./pages/TaxInvoicePage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));


// DEFENSIVE: Don't rely on context shape, read from localStorage too
function getUserSafe() {
  try {
    const stored = localStorage.getItem('md_user');
    return stored ? JSON.parse(stored) : null;
  } catch { return null; }
}

// Protected route — defensive
function PrivateRoute({ children, requireAdmin = false, requireManager = false }) {
  let user = null;
  try {
    const auth = useAuth();
    user = auth?.user || getUserSafe();
  } catch (e) {
    user = getUserSafe();
  }

  if (!user) return <Navigate to="/login" replace />;
  if (requireAdmin && !['owner', 'admin'].includes(user.role)) return <Navigate to="/dashboard" replace />;
  if (requireManager && !['owner', 'admin', 'manager'].includes(user.role)) return <Navigate to="/dashboard" replace />;
  return children;
}

function AppShell() {
  const [user, setUser] = useState(() => {
    // Try context first, fall back to localStorage
    try {
      // useAuth might fail during initial render
      return getUserSafe();
    } catch { return null; }
  });

  let auth;
  try { auth = useAuth(); } catch { auth = null; }

  // Sync user from context if available
  useEffect(() => {
    if (auth?.user) {
      setUser(auth.user);
    } else {
      setUser(getUserSafe());
    }
  }, [auth?.user]);

  // Listen to localStorage changes (login/logout from another tab)
  useEffect(() => {
    const onStorage = () => setUser(getUserSafe());
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const location = useLocation();
  const isPublic = location.pathname === '/login' || location.pathname === '/showroom';

  // Register service worker (non-blocking)
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/service-worker.js').catch(() => {});
    }
  }, []);

  return (
    <div className="min-h-screen bg-slate-950">
      {!isPublic && user && <Navbar user={user} />}
      {!isPublic && user && <NotifBanner user={user} />}
      <InstallPrompt />

      <Suspense fallback={<div className="p-4 text-center text-slate-400">Loading...</div>}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/showroom" element={<Showroom />} />

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/comprehensive" element={<PrivateRoute><ComprehensiveDashboard /></PrivateRoute>} />
          <Route path="/calendar" element={<PrivateRoute><CalendarView /></PrivateRoute>} />

          {/* Sales */}
          <Route path="/customers" element={<PrivateRoute><CustomerManagement /></PrivateRoute>} />
          <Route path="/customers/new" element={<PrivateRoute><NewCustomersPage /></PrivateRoute>} />
          <Route path="/customers/:id" element={<PrivateRoute><CustomerServiceProfile /></PrivateRoute>} />
          <Route path="/vehicles" element={<PrivateRoute><VehDashboard /></PrivateRoute>} />
          <Route path="/pricelist" element={<PrivateRoute><PriceListPage /></PrivateRoute>} />
          <Route path="/tax-invoice" element={<PrivateRoute><TaxInvoicePage /></PrivateRoute>} />
          <Route path="/invoices" element={<PrivateRoute><InvoiceManagement /></PrivateRoute>} />
          <Route path="/quotations" element={<PrivateRoute><QuotationsPage /></PrivateRoute>} />
          <Route path="/test-rides" element={<PrivateRoute><TestRidesPage /></PrivateRoute>} />
          <Route path="/followups" element={<PrivateRoute><FollowupsPage /></PrivateRoute>} />

          {/* Service */}
          <Route path="/appointments" element={<PrivateRoute><ServiceAppointmentsPage /></PrivateRoute>} />
          <Route path="/jobcards" element={<PrivateRoute><JobCardPage /></PrivateRoute>} />
          <Route path="/warranty" element={<PrivateRoute><WarrantyReplacementPage /></PrivateRoute>} />
          <Route path="/parts" element={<PrivateRoute><PartsManagement /></PrivateRoute>} />
          <Route path="/service-data" element={<PrivateRoute><ServiceData /></PrivateRoute>} />

          {/* Finance */}
          <Route path="/payments" element={<PrivateRoute><PaymentTracker /></PrivateRoute>} />
          <Route path="/reports" element={<PrivateRoute><ReportsAnalytics /></PrivateRoute>} />

          {/* Team */}
          <Route path="/chat" element={<PrivateRoute><TeamChat /></PrivateRoute>} />
          <Route path="/meeting" element={<PrivateRoute><MeetingRoom /></PrivateRoute>} />
          <Route path="/feedback" element={<PrivateRoute><FeedbackPage /></PrivateRoute>} />
          <Route path="/attendance" element={<PrivateRoute><Attendance /></PrivateRoute>} />
          <Route path="/reminders" element={<PrivateRoute><RemindersPage /></PrivateRoute>} />
          <Route path="/documents" element={<PrivateRoute><DocumentVault /></PrivateRoute>} />
          <Route path="/old-scooters" element={<PrivateRoute><OldScooters /></PrivateRoute>} />

          {/* Admin */}
          <Route path="/admin" element={<PrivateRoute requireAdmin><AdminPanel /></PrivateRoute>} />
          <Route path="/staff" element={<PrivateRoute requireAdmin><StaffManagement /></PrivateRoute>} />
          <Route path="/salary" element={<PrivateRoute requireAdmin><SalaryManagement /></PrivateRoute>} />
          <Route path="/manager" element={<PrivateRoute requireManager><ManagerView /></PrivateRoute>} />
          <Route path="/settings" element={<PrivateRoute requireAdmin><SettingsPage /></PrivateRoute>} />
          <Route path="/change-password" element={<PrivateRoute><ChangePassword /></PrivateRoute>} />

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>

      <div className="md:hidden pb-16" />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <AppShell />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
