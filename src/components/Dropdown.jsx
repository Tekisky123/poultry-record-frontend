import { useState, useRef, useEffect } from 'react';
import { LogOut, Settings, ChevronDown } from 'lucide-react';

const Dropdown = ({ onLogout, user, position = 'bottom' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <Settings size={20} className="text-gray-500" />
        <ChevronDown size={16} className="text-gray-200" />
      </button>

      {isOpen && (
        <div
          className={`
            absolute ${
              position === 'top' ? 'bottom-full left-0 mb-2' : 'right-0 mt-2'
            } w-48 bg-white rounded-md shadow-lg py-1 border border-gray-200 z-50
          `}
        >
          <div className="px-4 py-2 border-b border-gray-200">
            <p className="text-sm font-medium text-gray-900">{user?.name}</p>
            <p className="text-xs text-gray-500">{user?.email}</p>
          </div>
          <button
            onClick={onLogout}
            className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <LogOut size={16} className="text-red-500" />
            <span>Logout</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default Dropdown;
