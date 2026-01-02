// src/App.jsx
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Dashboard from './pages/Dashboard';
import Trips from './pages/Trips';
import TripMonthlySummary from './pages/TripMonthlySummary';
import TripDetails from './pages/TripDetails';
import Vendors from './pages/Vendors';
import VendorDetails from './pages/VendorDetails';
import Customers from './pages/Customers';
import AddCustomer from './pages/AddCustomer';
import CustomerDetails from './pages/CustomerDetails';
import CustomerPaymentsAdmin from './pages/CustomerPaymentsAdmin';
import Vehicles from './pages/Vehicles';
import Reports from './pages/Reports';
import Users from './pages/Users';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import IndirectSales from './pages/IndirectSales';
import IndirectSaleDetail from './pages/IndirectSaleDetail';
import VoucherList from './pages/VoucherList';
import AddEditVoucher from './pages/AddEditVoucher';
import VoucherDetails from './pages/VoucherDetails';
import Groups from './pages/Groups';
import Ledgers from './pages/Ledgers';
import DieselStations from './pages/DieselStations';
import LedgerDetails from './pages/LedgerDetails';
import BalanceSheet from './pages/BalanceSheet';
import GroupSummary from './pages/GroupSummary';
import MonthlySummary from './pages/MonthlySummary';
import Security from './pages/Security';
import SettingsPage from './pages/SettingsPage';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Supervisor Components
import SupervisorDashboard from './pages/SupervisorDashboard';
import SupervisorTrips from './pages/SupervisorTrips';
import SupervisorCreateTrip from './pages/SupervisorCreateTrip';
import SupervisorTripDetails from './pages/SupervisorTripDetails';
import SupervisorProfile from './pages/SupervisorProfile';
import SupervisorHeader from './components/SupervisorHeader';
import ManageStocks from './pages/ManageStocks';
import BottomNavigation from './components/BottomNavigation';

// Customer Components
import CustomerDashboard from './pages/CustomerDashboard';
import CustomerSales from './pages/CustomerSales';
import CustomerPayments from './pages/CustomerPayments';
import CustomerProfile from './pages/CustomerProfile';
import CustomerSecurity from './pages/CustomerSecurity';
import CustomerHeader from './components/CustomerHeader';
import CustomerBottomNavigation from './components/CustomerBottomNavigation';
import { LogOut } from 'lucide-react';

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/signin" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

// Main App Component
const AppContent = () => {
  const { user, logout } = useAuth();

  if (!user) {
    return (
      <Routes>
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="*" element={<Navigate to="/signin" replace />} />
      </Routes>
    );
  }

  // Supervisor PWA Interface
  if (user.role === 'supervisor' && user.approvalStatus === 'approved') {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <SupervisorHeader />
        <main className="px-4 py-4">
          <Routes>
            <Route path="/supervisor" element={<SupervisorDashboard />} />
            <Route path="/supervisor/trips" element={<SupervisorTrips />} />
            <Route path="/supervisor/trips/create" element={<SupervisorCreateTrip />} />
            <Route path="/supervisor/trips/:id" element={<SupervisorTripDetails />} />
            <Route path="/supervisor/stocks" element={<ManageStocks />} />
            <Route path="/supervisor/profile" element={<SupervisorProfile />} />
            <Route path="*" element={<Navigate to="/supervisor" replace />} />
          </Routes>
        </main>
        <BottomNavigation />
      </div>
    );
  }

  // Customer PWA Interface
  if (user.role === 'customer' && user.approvalStatus === 'approved') {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <CustomerHeader />
        <main className="px-4 py-4">
          <Routes>
            <Route path="/customer" element={<CustomerDashboard />} />
            <Route path="/customer/profile" element={<CustomerProfile />} />
            <Route path="*" element={<Navigate to="/customer" replace />} />
          </Routes>
        </main>
        <CustomerBottomNavigation />
      </div>
    );
  }

  // Admin Dashboard (can view trips but not create)
  if ((user.role === 'superadmin' || user.role === 'admin') && user.approvalStatus === 'approved') {
    return (
      <div className="flex h-screen bg-gray-50">
        {/* Sidebar */}
        <Sidebar />

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden lg:ml-0">
          <Header />

          <main className="flex-1 p-4 lg:p-6 overflow-y-auto">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/users" element={<Users />} />
              <Route path="/trips" element={<TripMonthlySummary />} />
              <Route path="/trips/list" element={<Trips />} />
              <Route path="/trips/:id" element={<TripDetails />} />
              <Route path="/vendors" element={<Vendors />} />
              <Route path="/vendors/:id" element={<VendorDetails />} />
              <Route path="/customers" element={<Customers />} />
              <Route path="/add-customer" element={<AddCustomer />} />
              <Route path="/customers/:id" element={<CustomerDetails />} />
              <Route path="/customer-payments" element={<CustomerPaymentsAdmin />} />
              <Route path="/vehicles" element={<Vehicles />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/indirect-sales" element={<IndirectSales />} />
              <Route path="/indirect-sales/:id" element={<IndirectSaleDetail />} />
              <Route path="/vouchers" element={<VoucherList />} />
              <Route path="/vouchers/add" element={<AddEditVoucher />} />
              <Route path="/vouchers/:id" element={<VoucherDetails />} />
              <Route path="/vouchers/:id/edit" element={<AddEditVoucher />} />
              <Route path="/groups" element={<ProtectedRoute allowedRoles={["admin", "superadmin"]}><Groups /></ProtectedRoute>} />
              <Route path="/ledgers" element={<ProtectedRoute allowedRoles={["admin", "superadmin"]}><Ledgers /></ProtectedRoute>} />
              <Route path="/ledgers/:id" element={<ProtectedRoute allowedRoles={["admin", "superadmin"]}><LedgerDetails /></ProtectedRoute>} />
              <Route path="/diesel-stations" element={<ProtectedRoute allowedRoles={["admin", "superadmin"]}><DieselStations /></ProtectedRoute>} />
              <Route path="/balance-sheet" element={<ProtectedRoute allowedRoles={["admin", "superadmin"]}><BalanceSheet /></ProtectedRoute>} />
              <Route path="/group-summary/:id" element={<ProtectedRoute allowedRoles={["admin", "superadmin"]}><GroupSummary /></ProtectedRoute>} />
              <Route path="/monthly-summary/:type/:id" element={<ProtectedRoute allowedRoles={["admin", "superadmin"]}><MonthlySummary /></ProtectedRoute>} />
              <Route path="/security" element={<ProtectedRoute allowedRoles={["admin", "superadmin"]}><Security /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute allowedRoles={["superadmin"]}><SettingsPage /></ProtectedRoute>} />

              <Route path="/stocks" element={<ManageStocks />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </div>
    );
  }

  return <Navigate to="/unauthorized" element={
    <>
      <div>
        <h1>!! Unauthorized Page Access !!</h1>
      </div>
    </>
  } replace />;
};

function App() {
  return (
    <AuthProvider >
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;