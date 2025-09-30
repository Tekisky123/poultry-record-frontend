// src/pages/SupervisorTrips.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Filter,
  Truck,
  MapPin,
  Eye,
  ShoppingCart,
  Receipt,
  Fuel,
  Users,
  Loader2,
  X,
  Calendar
} from 'lucide-react';
import api from '../lib/axios';
import { useAuth } from '../contexts/AuthContext';

export default function SupervisorTrips() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [trips, setTrips] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    if (user?.role === 'supervisor') {
      fetchTrips();
    }
  }, [user]);

  const fetchTrips = async () => {
    try {
      if (trips.length === 0) {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }
      setError('');
      const { data } = await api.get('/trip');

      // Handle the actual response structure from backend
      let tripsArray = [];
      if (data.success) {
        // Backend returns trips in the root level 'trips' field
        if (data.trips && Array.isArray(data.trips)) {
          tripsArray = data.trips;
        } else if (data.data && Array.isArray(data.data)) {
          tripsArray = data.data;
        }
      }

      setTrips(tripsArray);
    } catch (err) {
      console.error('Error fetching trips:', err);
      setError('Failed to fetch trips. Please try again.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const filteredTrips = trips.filter(trip => {
    const matchesSearch = trip.tripId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trip.vehicle?.vehicleNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trip.place?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trip.driver?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || trip.status === statusFilter;
    return matchesSearch && matchesStatus;
  }).sort((a, b) => {
    // Define status priority: started (1) > ongoing (2) > completed (3)
    const statusPriority = {
      'started': 1,
      'ongoing': 2,
      'completed': 3
    };

    const aPriority = statusPriority[a.status] || 4;
    const bPriority = statusPriority[b.status] || 4;

    // First sort by status priority
    if (aPriority !== bPriority) {
      return aPriority - bPriority;
    }

    // Then sort by creation date (newest first)
    return new Date(b.createdAt) - new Date(a.createdAt);
  });



  if (user?.role !== 'supervisor') {
    return (
      <div className="text-center py-8">
        <h2 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h2>
        <p className="text-gray-600">This page is only for supervisors.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Round Trips</h1>
          <p className="text-gray-600 mt-1">Manage your poultry round trips: base → vendors → customers → base</p>
          <div className="flex gap-4 mt-2 text-sm">
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              <span className="text-gray-600">Started: {trips.filter(t => t.status === 'started').length}</span>
            </span>
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-gray-600">Ongoing: {trips.filter(t => t.status === 'ongoing').length}</span>
            </span>
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-gray-600">Completed: {trips.filter(t => t.status === 'completed').length}</span>
            </span>
          </div>
        </div>
        <div className="flex gap-2 mt-4 sm:mt-0">
          <button
            onClick={fetchTrips}
            disabled={isRefreshing}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {isRefreshing ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <Loader2 size={20} />
            )}
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          <button
            onClick={() => navigate('/supervisor/trips/create')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <Plus size={20} />
            New Trip
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          <div className="flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={() => setError('')}
              className="text-red-500 hover:text-red-700"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search trips..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="started">Started</option>
            <option value="ongoing">Ongoing</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>

      {/* Trips Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full text-center py-10">
            <Loader2 className="w-10 h-10 text-blue-500 animate-spin mx-auto" />
            <p className="text-gray-600 mt-4">Loading trips...</p>
          </div>
        ) : filteredTrips.length === 0 ? (
          <div className="col-span-full text-center py-10 text-gray-600">
            <div className="space-y-4">
              <Truck className="w-16 h-16 text-gray-300 mx-auto" />
              <p className="text-lg font-medium">No trips found</p>
              <p className="text-sm text-gray-500">
                {trips.length === 0 ? 'You haven\'t created any trips yet.' : 'No trips match your search criteria.'}
              </p>
              {trips.length === 0 && (
                <button
                  onClick={() => navigate('/supervisor/trips/create')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Create Your First Trip
                </button>
              )}
            </div>
          </div>
        ) : (
          filteredTrips.map((trip) => (
            <div key={trip._id || trip.id} className={`rounded-xl shadow-sm border p-6 hover:shadow-lg transition-all duration-200 ${trip.status === 'started'
                ? 'bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200 ring-2 ring-yellow-100'
                : 'bg-white border-gray-200'
              }`}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${trip.status === 'started'
                      ? 'bg-gradient-to-br from-yellow-100 to-orange-100 ring-2 ring-yellow-200'
                      : 'bg-blue-100'
                    }`}>
                    <Truck className={`w-6 h-6 ${trip.status === 'started' ? 'text-yellow-700' : 'text-blue-600'
                      }`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-gray-900">{trip.vehicle?.vehicleNumber || 'N/A'}</h3>
                      {trip.status === 'started' && (
                        <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">{trip.tripId}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${trip.status === 'completed' ? 'bg-green-100 text-green-800' :
                    trip.status === 'ongoing' ? 'bg-blue-100 text-blue-800' :
                      trip.status === 'started' ? 'bg-yellow-200 text-yellow-900 font-bold ring-1 ring-yellow-300' :
                        'bg-gray-100 text-gray-800'
                  }`}>
                  {trip.status}
                </span>
              </div>

              <div className="space-y-3 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="w-4 h-4" />
                  <span>{trip.place}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Users className="w-4 h-4" />
                  <span>Driver: {trip.driver}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="w-4 h-4" />
                  <span>{new Date(trip.createdAt).toLocaleDateString()}</span>
                </div>

              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-500">Birds Purchased</div>
                  <div className="text-lg font-bold text-blue-600">
                    {trip.summary?.totalBirdsPurchased || 0}
                  </div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-500">Birds Sold</div>
                  <div className="text-lg font-bold text-green-600">
                    {trip.summary?.totalBirdsSold || 0}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <div className="text-sm text-gray-500">
                  Net Profit: <span className="font-medium text-gray-900">
                    ₹{trip.summary?.netProfit?.toLocaleString() || '0'}
                  </span>
                </div>
                <button
                  onClick={() => navigate(`/supervisor/trips/${trip._id || trip.id}`)}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Manage Trip
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
