import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ShoppingCart, 
  CreditCard,
  AlertCircle,
  CheckCircle,
  Clock,
  Package
} from 'lucide-react';
import api from '../lib/axios';
import { useAuth } from '../contexts/AuthContext';

const CustomerDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalPurchases: 0,
    totalAmount: 0,
    totalPaid: 0,
    totalBalance: 0,
    totalBirds: 0,
    totalWeight: 0,
    pendingPayments: 0
  });
  const [recentSales, setRecentSales] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?._id || user?.id) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      const userId = user?._id || user?.id;
      if (!userId) {
        console.error('User ID not found');
        setLoading(false);
        return;
      }
      
      // Fetch customer's sales data
      const salesResponse = await api.get(`/customer/panel/${userId}/sales`);
      
      if (salesResponse.data.success) {
        const salesData = salesResponse.data.data || [];
        setRecentSales(salesData.slice(0, 5));
        
        // Calculate stats from sales data
        const calculatedStats = salesData.reduce((acc, sale) => {
          acc.totalPurchases += 1;
          acc.totalAmount += sale.amount || 0;
          acc.totalPaid += (sale.cashPaid || 0) + (sale.onlinePaid || 0);
          acc.totalBirds += sale.birds || 0;
          acc.totalWeight += sale.weight || 0;
          acc.pendingPayments += sale.balance || 0;
          return acc;
        }, {
          totalPurchases: 0,
          totalAmount: 0,
          totalPaid: 0,
          totalBalance: 0,
          totalBirds: 0,
          totalWeight: 0,
          pendingPayments: 0
        });
        
        calculatedStats.totalBalance = calculatedStats.totalAmount - calculatedStats.totalPaid;
        setStats(calculatedStats);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPaymentStatusColor = (balance) => {
    if (balance === 0) return 'text-green-600 bg-green-100';
    if (balance > 0) return 'text-yellow-600 bg-yellow-100';
    return 'text-gray-600 bg-gray-100';
  };

  const getPaymentStatusText = (balance) => {
    if (balance === 0) return 'Paid';
    if (balance > 0) return 'Pending';
    return 'Overpaid';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-lg p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">Welcome, {user?.name || 'Customer'}!</h1>
        <p className="text-green-100">Manage your purchases and track your balances</p>
        
        {/* Quick Actions */}
        <div className="mt-4 flex space-x-3">
          <Link
            to="/customer/sales"
            className="bg-white text-green-600 px-4 py-2 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center space-x-2"
          >
            <ShoppingCart size={16} />
            <span>View All Sales</span>
          </Link>
          <Link
            to="/customer/profile"
            className="border border-white text-white px-4 py-2 rounded-lg font-medium hover:bg-white hover:text-green-600 transition-colors flex items-center space-x-2"
          >
            <Package size={16} />
            <span>My Profile</span>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Purchases</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalPurchases}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <ShoppingCart className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Amount</p>
              <p className="text-2xl font-bold text-gray-900">₹{stats.totalAmount.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Amount Paid</p>
              <p className="text-2xl font-bold text-green-600">₹{stats.totalPaid.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Balance Due</p>
              <p className="text-2xl font-bold text-red-600">₹{stats.totalBalance.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-red-100 rounded-lg">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Birds</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalBirds}</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <Package className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Weight</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalWeight.toFixed(2)} kg</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Sales */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Recent Purchases</h2>
          <Link to="/customer/sales" className="text-green-600 text-sm font-medium hover:text-green-700">
            View All
          </Link>
        </div>

        {recentSales.length === 0 ? (
          <div className="text-center py-8">
            <ShoppingCart className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-500">No purchases yet</p>
            <p className="text-sm text-gray-400 mt-1">Your purchase history will appear here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentSales.map((sale) => (
              <div key={sale._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPaymentStatusColor(sale.balance || 0)}`}>
                      {getPaymentStatusText(sale.balance || 0)}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(sale.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-900">
                    Bill: {sale.billNumber || 'N/A'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {sale.birds || 0} birds • {sale.weight || 0} kg
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">₹{(sale.amount || 0).toLocaleString()}</p>
                  <p className="text-xs text-gray-500">Balance: ₹{(sale.balance || 0).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Payment Summary */}
      {stats.totalBalance > 0 && (
        <div className="card bg-yellow-50 border-yellow-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <AlertCircle className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <h3 className="font-semibold text-yellow-800">Outstanding Balance</h3>
              <p className="text-sm text-yellow-700">
                You have ₹{stats.totalBalance.toLocaleString()} pending payment across {stats.pendingPayments} transactions.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerDashboard;
