import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import ErrorBoundary from './components/ErrorBoundary';
import NotifBanner from './components/NotifBanner';
import InstallPrompt from './components/InstallPrompt';

// Lazy-loaded pages
const LoginPage = lazy(() => import('./pages/LoginPage'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
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
const ComprehensiveDashboard = lazy(() => import('./pages/ComprehensiveDashboard'));
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

function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="inline-block w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-green-400">Loading MD Automobile...</p>
      </div>
    </div>
  );
}

function PrivateRoute({ children, requireAdmin = false }) {
  const { user, isAdmin } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (requireAdmin && !isAdmin()) return <Navigate to="/dashboard" replace />;
  return children;
}

function AppShell() {
  const location = useLocation();
  const { user } = useAuth();
  const isPublic = ['/login', '/showroom'].includes(location.pathname);

  return (
    <div className="min-h-screen bg-slate-950">
      {!isPublic && user && <Navbar user={user} />}
      {!isPublic && user && <NotifBanner user={user} />}
      <InstallPrompt />

      <main className={!isPublic && user ? 'pt-16 pb-20 md:pb-4' : ''}>
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/showroom" element={<Showroom />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
            <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
            <Route path="/customers" element={<PrivateRoute><CustomerManagement /></PrivateRoute>} />
            <Route path="/customers/new" element={<PrivateRoute><NewCustomersPage /></PrivateRoute>} />
            <Route path="/customers/:id" element={<PrivateRoute><CustomerServiceProfile /></PrivateRoute>} />
            <Route path="/vehicles" element={<PrivateRoute><VehDashboard /></PrivateRoute>} />
            <Route path="/jobcards" element={<PrivateRoute><JobCardPage /></PrivateRoute>} />
            <Route path="/invoices" element={<PrivateRoute><InvoiceManagement /></PrivateRoute>} />
            <Route path="/quotations" element={<PrivateRoute><QuotationsPage /></PrivateRoute>} />
            <Route path="/parts" element={<PrivateRoute><PartsManagement /></PrivateRoute>} />
            <Route path="/payments" element={<PrivateRoute><PaymentTracker /></PrivateRoute>} />
            <Route path="/reports" element={<PrivateRoute><ReportsAnalytics /></PrivateRoute>} />
            <Route path="/analytics" element={<PrivateRoute><ComprehensiveDashboard /></PrivateRoute>} />
            <Route path="/chat" element={<PrivateRoute><TeamChat /></PrivateRoute>} />
            <Route path="/meeting" element={<PrivateRoute><MeetingRoom /></PrivateRoute>} />
            <Route path="/documents" element={<PrivateRoute><DocumentVault /></PrivateRoute>} />
            <Route path="/reminders" element={<PrivateRoute><RemindersPage /></PrivateRoute>} />
            <Route path="/staff" element={<PrivateRoute requireAdmin><StaffManagement /></PrivateRoute>} />
            <Route path="/attendance" element={<PrivateRoute><Attendance /></PrivateRoute>} />
            <Route path="/salary" element={<PrivateRoute requireAdmin><SalaryManagement /></PrivateRoute>} />
            <Route path="/admin" element={<PrivateRoute requireAdmin><AdminPanel /></PrivateRoute>} />
            <Route path="/manager" element={<PrivateRoute><ManagerView /></PrivateRoute>} />
            <Route path="/calendar" element={<PrivateRoute><CalendarView /></PrivateRoute>} />
            <Route path="/followups" element={<PrivateRoute><FollowupsPage /></PrivateRoute>} />
            <Route path="/old-scooters" element={<PrivateRoute><OldScooters /></PrivateRoute>} />
            <Route path="/service-data" element={<PrivateRoute><ServiceData /></PrivateRoute>} />
            <Route path="/change-password" element={<PrivateRoute><ChangePassword /></PrivateRoute>} />
            <Route path="/settings" element={<PrivateRoute requireAdmin><SettingsPage /></PrivateRoute>} />
            <Route path="/warranty" element={<PrivateRoute><WarrantyReplacementPage /></PrivateRoute>} />
            <Route path="/test-rides" element={<PrivateRoute><TestRidesPage /></PrivateRoute>} />
            <Route path="/feedback" element={<PrivateRoute><FeedbackPage /></PrivateRoute>} />
            <Route path="/appointments" element={<PrivateRoute><ServiceAppointmentsPage /></PrivateRoute>} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </ErrorBoundary>
  );
}
