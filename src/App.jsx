// src/App.jsx
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Dashboard from './pages/Dashboard';
import Trips from './pages/Trips';
import TripDetails from './pages/TripDetails';
import Vendors from './pages/Vendors';
import Customers from './pages/Customers';
import Vehicles from './pages/Vehicles';
import Reports from './pages/Reports';
import Users from './pages/Users';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import IndirectExpenses from './pages/IndirectExpenses';
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
import BottomNavigation from './components/BottomNavigation';

// Customer Components
import CustomerDashboard from './pages/CustomerDashboard';
import CustomerSales from './pages/CustomerSales';
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
            <Route path="/customer/sales" element={<CustomerSales />} />
            <Route path="/customer/profile" element={<CustomerProfile />} />
            <Route path="/customer/security" element={<CustomerSecurity />} />
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
                <Route path="/trips" element={<Trips />} />
                <Route path="/trips/:id" element={<TripDetails />} />
                <Route path="/vendors" element={<Vendors />} />
                <Route path="/customers" element={<Customers />} />
                <Route path="/vehicles" element={<Vehicles />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/indirect-expenses" element={<IndirectExpenses />} />
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