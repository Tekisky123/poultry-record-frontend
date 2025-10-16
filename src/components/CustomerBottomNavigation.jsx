import { Link, useLocation } from 'react-router-dom';
import { Home, ShoppingCart, User, Shield } from 'lucide-react';

const CustomerBottomNavigation = () => {
  const location = useLocation();

  const navItems = [
    { name: 'Dashboard', path: '/customer', icon: Home },
    { name: 'Sales', path: '/customer/sales', icon: ShoppingCart },
    { name: 'Profile', path: '/customer/profile', icon: User },
    { name: 'Security', path: '/customer/security', icon: Shield },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <div className="flex justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center py-2 px-3 min-w-0 flex-1 ${
                isActive
                  ? 'text-green-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon size={20} className="mb-1" />
              <span className="text-xs font-medium truncate">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default CustomerBottomNavigation;
