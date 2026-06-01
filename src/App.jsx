import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import Navbar from './components/Navbar';

// ============== All Pages ==============
const LoginPage = lazy(() => import('./pages/LoginPage'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const ComprehensiveDashboard = lazy(() => import('./pages/ComprehensiveDashboard'));
const CalendarView = lazy(() => import('./pages/CalendarView'));

// Sales
const CustomerManagement = lazy(() => import('./pages/CustomerManagement'));
const NewCustomersPage = lazy(() => import('./pages/NewCustomersPage'));
const CustomerServiceProfile = lazy(() => import('./pages/CustomerServiceProfile'));
const VehDashboard = lazy(() => import('./pages/VehDashboard'));
const PriceListPage = lazy(() => import('./pages/PriceListPage'));
const TaxInvoicePage = lazy(() => import('./pages/TaxInvoicePage'));
const InvoiceManagement = lazy(() => import('./pages/InvoiceManagement'));
const QuotationsPage = lazy(() => import('./pages/QuotationsPage'));
const TestRidesPage = lazy(() => import('./pages/TestRidesPage'));
const FollowupsPage = lazy(() => import('./pages/FollowupsPage'));

// Service
const ServiceAppointmentsPage = lazy(() => import('./pages/ServiceAppointmentsPage'));
const JobCardPage = lazy(() => import('./pages/JobCardPage'));
const WarrantyReplacementPage = lazy(() => import('./pages/WarrantyReplacementPage'));
const PartsManagement = lazy(() => import('./pages/PartsManagement'));
const ServiceData = lazy(() => import('./pages/ServiceData'));

// Finance
const PaymentTracker = lazy(() => import('./pages/PaymentTracker'));
const ReportsAnalytics = lazy(() => import('./pages/ReportsAnalytics'));

// Team
const TeamChat = lazy(() => import('./pages/TeamChat'));
const MeetingRoom = lazy(() => import('./pages/MeetingRoom'));
const FeedbackPage = lazy(() => import('./pages/FeedbackPage'));
const DocumentVault = lazy(() => import('./pages/DocumentVault'));
const RemindersPage = lazy(() => import('./pages/RemindersPage'));
const Attendance = lazy(() => import('./pages/Attendance'));

// Admin
const AdminPanel = lazy(() => import('./pages/AdminPanel'));
const ManagerView = lazy(() => import('./pages/ManagerView'));
const StaffManagement = lazy(() => import('./pages/StaffManagement'));
const SalaryManagement = lazy(() => import('./pages/SalaryManagement'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const ChangePassword = lazy(() => import('./pages/ChangePassword'));

// Misc
const OldScooters = lazy(() => import('./pages/OldScooters'));
const Showroom = lazy(() => import('./pages/Showroom'));

// ============== Helper ==============
function getUserSafe() {
  try {
    const stored = localStorage.getItem('md_user');
    return stored ? JSON.parse(stored) : null;
  } catch { return null; }
}

function PrivateRoute({ children, requireAdmin = false, requireManager = false }) {
  const user = getUserSafe();
  if (!user) return <Navigate to="/login" replace />;
  if (requireAdmin && !['owner', 'admin'].includes(user.role)) return <Navigate to="/dashboard" replace />;
  if (requireManager && !['owner', 'admin', 'manager'].includes(user.role)) return <Navigate to="/dashboard" replace />;
  return children;
}

// ============== AppShell ==============
function AppShell() {
  const user = getUserSafe();
  const location = useLocation();
  const isPublic = location.pathname === '/login' || location.pathname === '/showroom';

  React.useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/service-worker.js').catch(() => {});
    }
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#020617' }}>
      {!isPublic && user && <Navbar user={user} />}

      <Suspense fallback={<div style={{ padding: 20, color: 'white', textAlign: 'center' }}>Loading...</div>}>
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
          <Route path="/manager" element={<PrivateRoute requireManager><ManagerView /></PrivateRoute>} />
          <Route path="/staff" element={<PrivateRoute requireAdmin><StaffManagement /></PrivateRoute>} />
          <Route path="/salary" element={<PrivateRoute requireAdmin><SalaryManagement /></PrivateRoute>} />
          <Route path="/settings" element={<PrivateRoute requireAdmin><SettingsPage /></PrivateRoute>} />
          <Route path="/change-password" element={<PrivateRoute><ChangePassword /></PrivateRoute>} />

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>

      <div style={{ height: '64px' }} className="md:hidden" />
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
