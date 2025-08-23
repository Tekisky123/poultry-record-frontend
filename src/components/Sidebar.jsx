import { Link, useLocation } from 'react-router-dom';
import {
  BarChart3,
  Truck,
  Users as UsersIcon,
  Store,
  Car,
  FileText,
  Menu,
  X,
  UserCheck,
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Dropdown from './Dropdown';

const menuItems = [
  { name: 'Dashboard', path: '/', icon: BarChart3 },
  { name: 'Trips', path: '/trips', icon: Truck },
  { name: 'Vendors', path: '/vendors', icon: UsersIcon },
  { name: 'Customers', path: '/customers', icon: Store },
  { name: 'Vehicles', path: '/vehicles', icon: Car },
  { name: 'Reports', path: '/reports', icon: FileText },
  { name: 'Users', path: '/users', icon: UserCheck },
];

export default function Sidebar() {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user: currentUser, logout } = useAuth();

  return (
    <>
      {/* Mobile menu button */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-blue-800 text-white rounded-md"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      >
        {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-40
          w-64 bg-gradient-to-b from-blue-900 to-blue-800 text-white
          transform transition-transform duration-300 ease-in-out
          lg:translate-x-0
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="p-6 border-b border-blue-700">
          <h1 className="text-2xl font-bold text-white">Poultry Admin</h1>
          <p className="text-blue-200 text-sm mt-1">Farm Management System</p>
        </div>

        <nav className="mt-6 px-3">
          <ul className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;

              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`
                      flex items-center gap-3 p-3 rounded-lg transition-all duration-200
                      ${isActive
                        ? 'bg-blue-600 text-white shadow-lg'
                        : 'text-blue-100 hover:bg-blue-700 hover:text-white'
                      }
                    `}
                  >
                    <Icon size={20} className="flex-shrink-0" />
                    <span className="font-medium">{item.name}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User section at bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-blue-700">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-sm font-semibold">
                  {currentUser?.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-white">{currentUser?.name}</p>
                <p className="text-xs text-blue-200">{currentUser?.email}</p>
              </div>
            </div>
            <Dropdown onLogout={logout} user={currentUser} position="top" />
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </>
  );
}
