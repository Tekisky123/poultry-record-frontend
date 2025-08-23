import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Truck, 
  Plus,
  MapPin,
  Clock,
  AlertCircle
} from 'lucide-react';

const SupervisorDashboard = () => {
  const [stats, setStats] = useState({
    totalTrips: 0,
    activeTrips: 0,
    monthlyProfit: 0,
    monthlyExpenses: 0
  });
  const [recentTrips, setRecentTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsResponse, tripsResponse] = await Promise.all([
        fetch('/api/dashboard/supervisor-stats', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }),
        fetch('/api/trips/recent', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        })
      ]);

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData.data);
      }

      if (tripsResponse.ok) {
        const tripsData = await tripsResponse.json();
        setRecentTrips(tripsData.data);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'started': return 'text-blue-600 bg-blue-100';
      case 'ongoing': return 'text-yellow-600 bg-yellow-100';
      case 'completed': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-lg p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">Welcome back!</h1>
        <p className="text-primary-100">Ready to manage your next trip?</p>
        
        {/* Quick Actions */}
        <div className="mt-4 flex space-x-3">
          <Link
            to="/supervisor/trips/create"
            className="bg-white text-primary-600 px-4 py-2 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center space-x-2"
          >
            <Plus size={16} />
            <span>New Trip</span>
          </Link>
          <Link
            to="/supervisor/trips"
            className="border border-white text-white px-4 py-2 rounded-lg font-medium hover:bg-white hover:text-primary-600 transition-colors flex items-center space-x-2"
          >
            <MapPin size={16} />
            <span>View Trips</span>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Trips</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalTrips}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Truck className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Trips</p>
              <p className="text-2xl font-bold text-gray-900">{stats.activeTrips}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <Clock className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Monthly Profit</p>
              <p className="text-2xl font-bold text-green-600">₹{stats.monthlyProfit.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Monthly Expenses</p>
              <p className="text-2xl font-bold text-red-600">₹{stats.monthlyExpenses.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-red-100 rounded-lg">
              <TrendingDown className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Trips */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Recent Trips</h2>
          <Link to="/supervisor/trips" className="text-primary-600 text-sm font-medium hover:text-primary-700">
            View All
          </Link>
        </div>

        {recentTrips.length === 0 ? (
          <div className="text-center py-8">
            <MapPin className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-500">No trips yet</p>
            <Link to="/supervisor/trips/create" className="text-primary-600 hover:text-primary-700 font-medium">
              Create your first trip
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {recentTrips.slice(0, 5).map((trip) => (
              <div key={trip._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(trip.status)}`}>
                      {trip.status}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(trip.date).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-900">
                    {trip.route?.from} → {trip.route?.to}
                  </p>
                  <p className="text-xs text-gray-500">
                    Vehicle: {trip.vehicle?.registrationNumber || 'N/A'}
                  </p>
                </div>
                <Link
                  to={`/supervisor/trips/${trip._id}`}
                  className="text-primary-600 hover:text-primary-700 p-2"
                >
                  <MapPin size={16} />
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-3">
          <Link
            to="/supervisor/trips/create?type=purchase"
            className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-center hover:bg-blue-100 transition-colors"
          >
            <div className="w-8 h-8 bg-blue-600 rounded-lg mx-auto mb-2 flex items-center justify-center">
              <Plus className="w-5 h-5 text-white" />
            </div>
            <p className="text-sm font-medium text-blue-900">Purchase Trip</p>
            <p className="text-xs text-blue-600">Buy chickens</p>
          </Link>

          <Link
            to="/supervisor/trips/create?type=delivery"
            className="p-4 bg-green-50 border border-green-200 rounded-lg text-center hover:bg-green-100 transition-colors"
          >
            <div className="w-8 h-8 bg-green-600 rounded-lg mx-auto mb-2 flex items-center justify-center">
              <Truck className="w-5 h-5 text-white" />
            </div>
            <p className="text-sm font-medium text-green-900">Delivery Trip</p>
            <p className="text-xs text-green-600">Sell chickens</p>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default SupervisorDashboard;
