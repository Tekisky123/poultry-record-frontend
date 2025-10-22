import { Link, useLocation } from 'react-router-dom';
import { Home, MapPin, Plus, User } from 'lucide-react';

const BottomNavigation = () => {
  const location = useLocation();

  // Nav items for supervisor bottom navigation
  const navItems = [
    { name: 'Dashboard', path: '/supervisor', icon: Home },
    { name: 'Trips', path: '/supervisor/trips', icon: MapPin },
    { name: 'Create', path: '/supervisor/trips/create', icon: Plus },
    { name: 'Profile', path: '/supervisor/profile', icon: User },
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
                  ? 'text-primary-600'
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

export default BottomNavigation;
