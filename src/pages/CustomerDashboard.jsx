import { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ShoppingCart, 
  CreditCard,
  AlertCircle,
  CheckCircle,
  Clock,
  Package,
  Receipt,
  Calendar
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
    pendingPayments: 0,
    openingBalance: 0
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
      
      // Fetch dashboard stats
      const statsResponse = await api.get(`/customer/panel/${userId}/dashboard-stats`);
      if (statsResponse.data.success) {
        setStats(statsResponse.data.data);
      }
      
      // Fetch recent sales data
      const salesResponse = await api.get(`/customer/panel/${userId}/sales`);
      if (salesResponse.data.success) {
        const salesData = salesResponse.data.data || [];
        setRecentSales(salesData.slice(0, 5));
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPaymentStatusColor = (openingBalance) => {
    if (openingBalance === 0) return 'text-green-600 bg-green-100';
    if (openingBalance > 0) return 'text-yellow-600 bg-yellow-100';
    return 'text-gray-600 bg-gray-100';
  };

  const getPaymentStatusText = (openingBalance) => {
    if (openingBalance === 0) return 'Paid';
    if (openingBalance > 0) return 'Pending';
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
        <p className="text-green-100">Track your purchases and manage your account</p>
      </div>

      {/* Dashboard Stats Section */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <TrendingUp className="w-5 h-5 mr-2 text-green-600" />
          Dashboard Stats
        </h2>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
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

          <div className="bg-green-50 p-4 rounded-lg">
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

          <div className="bg-purple-50 p-4 rounded-lg">
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

          <div className="bg-orange-50 p-4 rounded-lg">
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
      </div>

      {/* Payments Records Section */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <CreditCard className="w-5 h-5 mr-2 text-green-600" />
          Payment Records
        </h2>
        
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <AlertCircle className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <h3 className="font-semibold text-yellow-800">Outstanding Balance</h3>
              <p className="text-lg font-bold text-yellow-900">₹{stats.openingBalance.toLocaleString()}</p>
              <p className="text-sm text-yellow-700">
                This is your current outstanding balance from all transactions
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Amount Paid</p>
                <p className="text-xl font-bold text-green-600">₹{stats.totalPaid.toLocaleString()}</p>
              </div>
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-red-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Balance Due</p>
                <p className="text-xl font-bold text-red-600">₹{stats.totalBalance.toLocaleString()}</p>
              </div>
              <div className="p-2 bg-red-100 rounded-lg">
                <Clock className="w-5 h-5 text-red-600" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Purchases Section */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Receipt className="w-5 h-5 mr-2 text-green-600" />
          Recent Purchases
        </h2>

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
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPaymentStatusColor(sale.openingBalance || 0)}`}>
                      {getPaymentStatusText(sale.openingBalance || 0)}
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
                  <p className="text-xs text-gray-500 mt-1">
                    Opening Balance: ₹{(sale.openingBalance || 0).toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">₹{(sale.amount || 0).toLocaleString()}</p>
                  <p className="text-xs text-gray-500">Opening Balance: ₹{(sale.openingBalance || 0).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerDashboard;