import { Bell, Search, Home, FileText, Receipt } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import Dropdown from './Dropdown';

export default function Header() {
  const { user: currentUser, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Search Bar */}
        {/* Navigation Shortcuts */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors border border-transparent hover:border-blue-100"
            title="Go to Profit & Loss"
          >
            <Home size={18} />
            <span className="hidden md:inline">Profit & Loss</span>
          </button>

          <button
            onClick={() => navigate('/balance-sheet')}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors border border-transparent hover:border-blue-100"
            title="Go to Balance Sheet"
          >
            <FileText size={18} />
            <span className="hidden md:inline">Balance Sheet</span>
          </button>

          <button
            onClick={() => navigate('/vouchers/add')}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors border border-transparent hover:border-blue-100"
            title="Add Voucher"
          >
            <Receipt size={18} />
            <span className="hidden md:inline">Vouchers</span>
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
