import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import Navbar from './components/Navbar';

// ============== Lazy Page Imports ==============
const LoginPage = lazy(() => import('./pages/LoginPage'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const ComprehensiveAnalytics = lazy(() => import('./pages/ComprehensiveAnalytics'));
const CalendarPage = lazy(() => import('./pages/CalendarPage'));

// Sales
const CustomerManagement = lazy(() => import('./pages/CustomerManagement'));
const NewCustomer = lazy(() => import('./pages/NewCustomer'));
const CustomerProfile = lazy(() => import('./pages/CustomerProfile'));
const VehicleDashboard = lazy(() => import('./pages/VehicleDashboard'));
const PriceListPage = lazy(() => import('./pages/PriceListPage'));
const TaxInvoicePage = lazy(() => import('./pages/TaxInvoicePage'));
const InvoiceManagement = lazy(() => import('./pages/InvoiceManagement'));
const Quotations = lazy(() => import('./pages/Quotations'));
const TestRidesPage = lazy(() => import('./pages/TestRidesPage'));
const FollowUps = lazy(() => import('./pages/FollowUps'));

// Service
const ServiceAppointmentsPage = lazy(() => import('./pages/ServiceAppointmentsPage'));
const JobCards = lazy(() => import('./pages/JobCards'));
const WarrantyReplacementPage = lazy(() => import('./pages/WarrantyReplacementPage'));
const SpareParts = lazy(() => import('./pages/SpareParts'));
const ServiceData = lazy(() => import('./pages/ServiceData'));

// Finance
const Payments = lazy(() => import('./pages/Payments'));
const Reports = lazy(() => import('./pages/Reports'));

// Team & Customer
const TeamChat = lazy(() => import('./pages/TeamChat'));
const VideoMeeting = lazy(() => import('./pages/VideoMeeting'));
const FeedbackPage = lazy(() => import('./pages/FeedbackPage'));
const Attendance = lazy(() => import('./pages/Attendance'));
const Reminders = lazy(() => import('./pages/Reminders'));
const Documents = lazy(() => import('./pages/Documents'));

// Admin
const AdminPanel = lazy(() => import('./pages/AdminPanel'));
const StaffManagement = lazy(() => import('./pages/StaffManagement'));
const Salary = lazy(() => import('./pages/Salary'));
const AppSettings = lazy(() => import('./pages/AppSettings'));
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
  const isPublic = location.pathname === '/login';

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
          {/* Auth */}
          <Route path="/login" element={<LoginPage />} />

          {/* Main */}
          <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/comprehensive" element={<PrivateRoute><ComprehensiveAnalytics /></PrivateRoute>} />
          <Route path="/calendar" element={<PrivateRoute><CalendarPage /></PrivateRoute>} />

          {/* Sales */}
          <Route path="/customers" element={<PrivateRoute><CustomerManagement /></PrivateRoute>} />
          <Route path="/customers/new" element={<PrivateRoute><NewCustomer /></PrivateRoute>} />
          <Route path="/customers/:id" element={<PrivateRoute><CustomerProfile /></PrivateRoute>} />
          <Route path="/vehicles" element={<PrivateRoute><VehicleDashboard /></PrivateRoute>} />
          <Route path="/pricelist" element={<PrivateRoute><PriceListPage /></PrivateRoute>} />
          <Route path="/tax-invoice" element={<PrivateRoute><TaxInvoicePage /></PrivateRoute>} />
          <Route path="/invoices" element={<PrivateRoute><InvoiceManagement /></PrivateRoute>} />
          <Route path="/quotations" element={<PrivateRoute><Quotations /></PrivateRoute>} />
          <Route path="/test-rides" element={<PrivateRoute><TestRidesPage /></PrivateRoute>} />
          <Route path="/followups" element={<PrivateRoute><FollowUps /></PrivateRoute>} />

          {/* Service */}
          <Route path="/appointments" element={<PrivateRoute><ServiceAppointmentsPage /></PrivateRoute>} />
          <Route path="/jobcards" element={<PrivateRoute><JobCards /></PrivateRoute>} />
          <Route path="/warranty" element={<PrivateRoute><WarrantyReplacementPage /></PrivateRoute>} />
          <Route path="/parts" element={<PrivateRoute><SpareParts /></PrivateRoute>} />
          <Route path="/service-data" element={<PrivateRoute><ServiceData /></PrivateRoute>} />

          {/* Finance */}
          <Route path="/payments" element={<PrivateRoute><Payments /></PrivateRoute>} />
          <Route path="/reports" element={<PrivateRoute><Reports /></PrivateRoute>} />

          {/* Team & Customer */}
          <Route path="/chat" element={<PrivateRoute><TeamChat /></PrivateRoute>} />
          <Route path="/meeting" element={<PrivateRoute><VideoMeeting /></PrivateRoute>} />
          <Route path="/feedback" element={<PrivateRoute><FeedbackPage /></PrivateRoute>} />
          <Route path="/attendance" element={<PrivateRoute><Attendance /></PrivateRoute>} />
          <Route path="/reminders" element={<PrivateRoute><Reminders /></PrivateRoute>} />
          <Route path="/documents" element={<PrivateRoute><Documents /></PrivateRoute>} />

          {/* Admin */}
          <Route path="/admin" element={<PrivateRoute adminOnly><AdminPanel /></PrivateRoute>} />
          <Route path="/staff" element={<PrivateRoute adminOnly><StaffManagement /></PrivateRoute>} />
          <Route path="/salary" element={<PrivateRoute adminOnly><Salary /></PrivateRoute>} />
          <Route path="/settings" element={<PrivateRoute adminOnly><AppSettings /></PrivateRoute>} />
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
