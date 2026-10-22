import { Bell, Search, Home, FileText, Receipt, BookOpen, Store, Users } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import Dropdown from './Dropdown';

export default function Header() {
  const { user: currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const getNavButtonClass = (isActive) => {
    return `flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors border ${
      isActive
        ? 'text-blue-600 bg-blue-50 border-blue-100 font-semibold'
        : 'text-gray-700 hover:text-blue-600 hover:bg-blue-50 border-transparent hover:border-blue-100'
    }`;
  };

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Navigation Shortcuts */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <button
            onClick={() => navigate('/')}
            className={getNavButtonClass(location.pathname === '/')}
            title="Go to Profit & Loss"
          >
            <Home size={18} />
            <span className="hidden md:inline">Profit & Loss</span>
          </button>

          <button
            onClick={() => navigate('/balance-sheet')}
            className={getNavButtonClass(location.pathname === '/balance-sheet')}
            title="Go to Balance Sheet"
          >
            <FileText size={18} />
            <span className="hidden md:inline">Balance Sheet</span>
          </button>

          <button
            onClick={() => navigate('/vouchers/add')}
            className={getNavButtonClass(location.pathname.startsWith('/vouchers'))}
            title="Add Voucher"
          >
            <Receipt size={18} />
            <span className="hidden md:inline">Vouchers</span>
          </button>

          <button
            onClick={() => navigate('/ledgers')}
            className={getNavButtonClass(location.pathname.startsWith('/ledgers'))}
            title="Go to Ledgers"
          >
            <BookOpen size={18} />
            <span className="hidden md:inline">Ledgers</span>
          </button>

          <button
            onClick={() => navigate('/customers')}
            className={getNavButtonClass(location.pathname.startsWith('/customers') || location.pathname === '/add-customer')}
            title="Go to Customers"
          >
            <Store size={18} />
            <span className="hidden md:inline">Customers</span>
          </button>

          <button
            onClick={() => navigate('/vendors')}
            className={getNavButtonClass(location.pathname.startsWith('/vendors'))}
            title="Go to Vendors"
          >
            <Users size={18} />
            <span className="hidden md:inline">Vendors</span>
          </button>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-4">
          {/* Notifications */}
          {/* <button className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
            <Bell size={20} />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
          </button> */}

          {/* User Menu */}
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-gray-900">{currentUser?.name}</p>
              <p className="text-xs text-gray-500">{currentUser?.role}</p>
            </div>
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
              {currentUser?.name.charAt(0).toUpperCase()}
            </div>
          </div>

          {/* Settings Dropdown */}
          <Dropdown onLogout={logout} user={currentUser} />
        </div>
      </div>
    </header>
  );
}
