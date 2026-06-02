import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import Navbar from './components/Navbar';

// ============== Lazy Page Imports (matched to user's actual filenames) ==============
const LoginPage = lazy(() => import('./pages/LoginPage'));
const Showroom = lazy(() => import('./pages/Showroom'));

// Main
const Dashboard = lazy(() => import('./pages/Dashboard'));
const ComprehensiveDashboard = lazy(() => import('./pages/ComprehensiveDashboard'));
const CalendarView = lazy(() => import('./pages/CalendarView'));

// Sales
const CustomerManagement = lazy(() => import('./pages/CustomerManagement'));
const NewCustomersPage = lazy(() => import('./pages/NewCustomersPage'));
const CustomerServiceProfile = lazy(() => import('./pages/CustomerServiceProfile'));
const VehDashboard = lazy(() => import('./pages/VehDashboard'));
const OldScooters = lazy(() => import('./pages/OldScooters'));
const PriceListPage = lazy(() => import('./pages/PriceListPage'));
const TaxInvoicePage = lazy(() => import('./pages/TaxInvoicePage'));
const InvoiceManagement = lazy(() => import('./pages/InvoiceManagement'));
const QuotationsPage = lazy(() => import('./pages/QuotationsPage'));
const TestRidesPage = lazy(() => import('./pages/TestRidesPage'));
const FollowupsPage = lazy(() => import('./pages/FollowupsPage'));
const ExcelImportPage = lazy(() => import('./pages/ExcelImportPage'));

// Service
const ServiceAppointmentsPage = lazy(() => import('./pages/ServiceAppointmentsPage'));
const JobCardPage = lazy(() => import('./pages/JobCardPage'));
const WarrantyReplacementPage = lazy(() => import('./pages/WarrantyReplacementPage'));
const PartsManagement = lazy(() => import('./pages/PartsManagement'));
const ServiceData = lazy(() => import('./pages/ServiceData'));

// Finance
const PaymentTracker = lazy(() => import('./pages/PaymentTracker'));
const ReportsAnalytics = lazy(() => import('./pages/ReportsAnalytics'));

// Team & Customer
const TeamChat = lazy(() => import('./pages/TeamChat'));
const MeetingRoom = lazy(() => import('./pages/MeetingRoom'));
const FeedbackPage = lazy(() => import('./pages/FeedbackPage'));
const Attendance = lazy(() => import('./pages/Attendance'));
const RemindersPage = lazy(() => import('./pages/RemindersPage'));
const DocumentVault = lazy(() => import('./pages/DocumentVault'));

// Admin
const AdminPanel = lazy(() => import('./pages/AdminPanel'));
const StaffManagement = lazy(() => import('./pages/StaffManagement'));
const SalaryManagement = lazy(() => import('./pages/SalaryManagement'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const ManagerView = lazy(() => import('./pages/ManagerView'));

// Account
const ChangePassword = lazy(() => import('./pages/ChangePassword'));

// ============== Helpers ==============
function getUser() {
  try { return JSON.parse(localStorage.getItem('md_user') || 'null'); }
  catch { return null; }
}

function PrivateRoute({ children, adminOnly = false, managerOnly = false }) {
  const user = getUser();
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && !['owner', 'admin'].includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  if (managerOnly && !['owner', 'admin', 'manager'].includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

// ============== AppShell ==============
function AppShell() {
  const user = getUser();
  const location = useLocation();
  const isPublic = location.pathname === '/login' || location.pathname === '/showroom';

  return (
    <div style={{ minHeight: '100vh', background: '#020617' }}>
      {!isPublic && user && <Navbar user={user} />}
      <Suspense fallback={
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 32 }}>⚡</div>
          <div>Loading...</div>
        </div>
      }>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/showroom" element={<Showroom />} />

          {/* Main */}
          <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/comprehensive" element={<PrivateRoute><ComprehensiveDashboard /></PrivateRoute>} />
          <Route path="/calendar" element={<PrivateRoute><CalendarView /></PrivateRoute>} />

          {/* Sales */}
          <Route path="/customers" element={<PrivateRoute><CustomerManagement /></PrivateRoute>} />
          <Route path="/customers/new" element={<PrivateRoute><NewCustomersPage /></PrivateRoute>} />
          <Route path="/customers/:id" element={<PrivateRoute><CustomerServiceProfile /></PrivateRoute>} />
          <Route path="/vehicles" element={<PrivateRoute><VehDashboard /></PrivateRoute>} />
          <Route path="/old-scooters" element={<PrivateRoute><OldScooters /></PrivateRoute>} />
          <Route path="/pricelist" element={<PrivateRoute><PriceListPage /></PrivateRoute>} />
          <Route path="/tax-invoice" element={<PrivateRoute><TaxInvoicePage /></PrivateRoute>} />
          <Route path="/invoices" element={<PrivateRoute><InvoiceManagement /></PrivateRoute>} />
          <Route path="/quotations" element={<PrivateRoute><QuotationsPage /></PrivateRoute>} />
          <Route path="/test-rides" element={<PrivateRoute><TestRidesPage /></PrivateRoute>} />
          <Route path="/followups" element={<PrivateRoute><FollowupsPage /></PrivateRoute>} />
          <Route path="/excel-import" element={<PrivateRoute adminOnly><ExcelImportPage /></PrivateRoute>} />

          {/* Service */}
          <Route path="/appointments" element={<PrivateRoute><ServiceAppointmentsPage /></PrivateRoute>} />
          <Route path="/jobcards" element={<PrivateRoute><JobCardPage /></PrivateRoute>} />
          <Route path="/warranty" element={<PrivateRoute><WarrantyReplacementPage /></PrivateRoute>} />
          <Route path="/parts" element={<PrivateRoute><PartsManagement /></PrivateRoute>} />
          <Route path="/service-data" element={<PrivateRoute><ServiceData /></PrivateRoute>} />

          {/* Finance */}
          <Route path="/payments" element={<PrivateRoute><PaymentTracker /></PrivateRoute>} />
          <Route path="/reports" element={<PrivateRoute><ReportsAnalytics /></PrivateRoute>} />

          {/* Team & Customer */}
          <Route path="/chat" element={<PrivateRoute><TeamChat /></PrivateRoute>} />
          <Route path="/meeting" element={<PrivateRoute><MeetingRoom /></PrivateRoute>} />
          <Route path="/feedback" element={<PrivateRoute><FeedbackPage /></PrivateRoute>} />
          <Route path="/attendance" element={<PrivateRoute><Attendance /></PrivateRoute>} />
          <Route path="/reminders" element={<PrivateRoute><RemindersPage /></PrivateRoute>} />
          <Route path="/documents" element={<PrivateRoute><DocumentVault /></PrivateRoute>} />

          {/* Admin */}
          <Route path="/admin" element={<PrivateRoute adminOnly><AdminPanel /></PrivateRoute>} />
          <Route path="/staff" element={<PrivateRoute adminOnly><StaffManagement /></PrivateRoute>} />
          <Route path="/salary" element={<PrivateRoute adminOnly><SalaryManagement /></PrivateRoute>} />
          <Route path="/settings" element={<PrivateRoute adminOnly><SettingsPage /></PrivateRoute>} />
          <Route path="/manager" element={<PrivateRoute managerOnly><ManagerView /></PrivateRoute>} />

          {/* Account */}
          <Route path="/change-password" element={<PrivateRoute><ChangePassword /></PrivateRoute>} />

          {/* Default redirects */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
    </div>
  );
}

// ============== Main App ==============
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
