import { useAuth } from '../contexts/AuthContext';
import { Bell, Menu, LogOut, ShoppingCart } from 'lucide-react';
import { useState } from 'react';
import chickenLogo from '../assets/chicken-logo.png';

const CustomerHeader = () => {
  const { user, logout } = useAuth();
  const [showMenu, setShowMenu] = useState(false);

  const handleLogout = async () => {
    await logout();
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
      <div className="px-4 py-3 flex items-center justify-between">
        {/* Logo and Title */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center">
            {/* <ShoppingCart className="w-5 h-5 text-white" /> */}
            <img src={chickenLogo} alt="Logo" className="w-10 h-10" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Customer Portal</h1>
            <p className="text-xs text-gray-500">RCC AND TRADING COMPANY</p>
          </div>
        </div>

        {/* Right Side Actions */}
        <div className="flex items-center space-x-3">
          {/* Notifications */}
          <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
            <Bell size={20} />
          </button>

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="flex items-center space-x-2 p-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-green-700">
                  {user?.name?.charAt(0)?.toUpperCase() || 'C'}
                </span>
              </div>
              <Menu size={16} />
            </button>

            {/* Dropdown Menu */}
            {showMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                <div className="px-4 py-2 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900">{user?.name || 'Customer'}</p>
                  <p className="text-xs text-gray-500">{user?.email || user?.mobileNumber}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                >
                  <LogOut size={16} />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default CustomerHeader;
