// src/components/StatCard.jsx
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function StatCard({ title, value, change, icon: Icon, color = 'blue' }) {
  const getChangeIcon = () => {
    if (!change) return <Minus size={16} className="text-gray-400" />;
    const isPositive = change.startsWith('+');
    return isPositive ? 
      <TrendingUp size={16} className="text-green-500" /> : 
      <TrendingDown size={16} className="text-red-500" />;
  };

  const getChangeColor = () => {
    if (!change) return 'text-gray-500';
    const isPositive = change.startsWith('+');
    return isPositive ? 'text-green-600' : 'text-red-600';
  };

  const getBgColor = () => {
    const colors = {
      blue: 'bg-blue-50 border-blue-200',
      green: 'bg-green-50 border-green-200',
      purple: 'bg-purple-50 border-purple-200',
      orange: 'bg-orange-50 border-orange-200',
      red: 'bg-red-50 border-red-200'
    };
    return colors[color] || colors.blue;
  };

  const getIconColor = () => {
    const colors = {
      blue: 'text-blue-600',
      green: 'text-green-600',
      purple: 'text-purple-600',
      orange: 'text-orange-600',
      red: 'text-red-600'
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className={`p-6 rounded-xl border ${getBgColor()} hover:shadow-lg transition-all duration-200`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {change && (
            <div className="flex items-center gap-1 mt-2">
              {getChangeIcon()}
              <span className={`text-sm font-medium ${getChangeColor()}`}>
                {change}
              </span>
            </div>
          )}
        </div>
        {Icon && (
          <div className={`p-3 rounded-lg bg-white ${getIconColor()}`}>
            <Icon size={24} />
          </div>
        )}
      </div>
    </div>
  );
}