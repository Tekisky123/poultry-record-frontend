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
  ChevronDown,
  ChevronRight,
  Settings,
  CreditCard,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Dropdown from './Dropdown';

const getMenuItems = (userRole) => {
  const baseItems = [
    { name: 'Users', path: '/users', icon: UserCheck },
    { name: 'Customers', path: '/customers', icon: Store },
    { name: 'Customer Payments', path: '/customer-payments', icon: CreditCard },
    { 
      name: 'Create And Alter', 
      icon: Settings, 
      isParent: true,
      children: [
        { name: 'Vehicles', path: '/vehicles', icon: Car },
        { name: 'Vendors', path: '/vendors', icon: UsersIcon },
        
      ]
    },
  ];

  // Only show Trips for admin/superadmin (view only) and supervisor (full access)
  if (userRole === 'supervisor' || userRole === 'admin' || userRole === 'superadmin') {
    baseItems.unshift({ name: 'Trips', path: '/trips', icon: Truck });
  }

  // Only show Indirect Expenses for admin/superadmin
  if (userRole === 'admin' || userRole === 'superadmin') {
    baseItems.push({ name: 'Indirect Expenses', path: '/indirect-expenses', icon: FileText });
  }

  return baseItems;
};

export default function Sidebar() {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState({});
  const { user: currentUser, logout } = useAuth();

  const toggleExpanded = (itemName) => {
    setExpandedItems(prev => ({
      ...prev,
      [itemName]: !prev[itemName]
    }));
  };

  // Auto-expand parent menu when child route is active
  useEffect(() => {
    const menuItems = getMenuItems(currentUser?.role);
    menuItems.forEach(item => {
      if (item.isParent && item.children) {
        const hasActiveChild = item.children.some(child => location.pathname === child.path);
        if (hasActiveChild && !expandedItems[item.name]) {
          setExpandedItems(prev => ({
            ...prev,
            [item.name]: true
          }));
        }
      }
    });
  }, [location.pathname, currentUser?.role, expandedItems]);

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
          <p className="text-blue-200 text-sm mt-1">RCC AND TRADING COMPANY</p>
        </div>

        <nav className="mt-6 px-3">
          <ul className="space-y-2">
            {getMenuItems(currentUser?.role).map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              const isExpanded = expandedItems[item.name];

              // Check if any child is active
              const hasActiveChild = item.children?.some(child => location.pathname === child.path);

              if (item.isParent && item.children) {
                return (
                  <li key={item.name}>
                    <button
                      onClick={() => toggleExpanded(item.name)}
                      className={`
                        w-full flex items-center justify-between gap-3 p-3 rounded-lg transition-all duration-200
                        ${hasActiveChild
                          ? 'bg-blue-600 text-white shadow-lg'
                          : 'text-blue-100 hover:bg-blue-700 hover:text-white'
                        }
                      `}
                    >
                      <div className="flex items-center gap-3">
                        <Icon size={20} className="flex-shrink-0" />
                        <span className="font-medium">{item.name}</span>
                      </div>
                      {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </button>
                    
                    {/* Sub-menu */}
                    {isExpanded && (
                      <ul className="ml-6 mt-2 space-y-1">
                        {item.children.map((child) => {
                          const ChildIcon = child.icon;
                          const isChildActive = location.pathname === child.path;
                          
                          return (
                            <li key={child.path}>
                              <Link
                                to={child.path}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className={`
                                  flex items-center gap-3 p-2 rounded-lg transition-all duration-200 text-sm
                                  ${isChildActive
                                    ? 'bg-blue-500 text-white shadow-md'
                                    : 'text-blue-200 hover:bg-blue-600 hover:text-white'
                                  }
                                `}
                              >
                                <ChildIcon size={16} className="flex-shrink-0" />
                                <span className="font-medium">{child.name}</span>
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </li>
                );
              }

              // Regular menu item
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
