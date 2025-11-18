import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Truck, 
  Plus,
  MapPin,
  Clock,
  AlertCircle
} from 'lucide-react';
import api from '../lib/axios';

const SupervisorDashboard = () => {
  const [stats, setStats] = useState({
    totalTrips: 0,
    completedTrips: 0
  });
  const [recentTrips, setRecentTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsResponse, tripsResponse] = await Promise.all([
        api.post('/dashboard/stats').catch(() => ({ data: { success: false } })),
        api.get('/trip?limit=5').catch(() => ({ data: { success: false } }))
      ]);
      
      if (statsResponse.data.success) {
        const dashboardData = statsResponse?.data?.data;
        setStats(dashboardData?.stats || { totalTrips: 0, completedTrips: 0 });
      } else {
        // If API call fails, ensure we have default values
        setStats({ totalTrips: 0, completedTrips: 0 });
      }
      
      if (tripsResponse.data.success) {
        const tripsData = tripsResponse.data.trips || [];
        setRecentTrips(tripsData);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      // Ensure we have default values even if there's an error
      setStats({ totalTrips: 0, completedTrips: 0 });
      setRecentTrips([]);
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
        <p className="text-primary-100">Ready to create your next round trip?</p>
        
        {/* Quick Actions */}
        <div className="mt-4 flex space-x-3">
          <Link
            to="/supervisor/trips/create"
            className="bg-white text-primary-600 px-4 py-2 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center space-x-2"
          >
            <Plus size={16} />
            <span>New Round Trip</span>
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
              <p className="text-2xl font-bold text-gray-900">{stats?.totalTrips || 0}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Truck className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Completed Trips</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.completedTrips || 0}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <Clock className="w-6 h-6 text-green-600" />
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
              <div key={trip._id || trip.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(trip.status)}`}>
                      {trip.status}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(trip.date || trip.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-900">
                    {trip.vehicle?.vehicleNumber || 'N/A'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {/* {trip.place || 'Round Trip'} */}
                  </p>
                </div>
                <Link
                  to={`/supervisor/trips/${trip.id}`}
                  className="text-primary-600 hover:text-primary-700 p-2"
                >
                  <MapPin size={16} />
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};

export default SupervisorDashboard;
