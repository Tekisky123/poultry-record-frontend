import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Filter, 
  MapPin, 
  Truck, 
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

const SupervisorTrips = () => {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => {
    fetchTrips();
  }, []);

  const fetchTrips = async () => {
    try {
      const response = await fetch('/api/trips/supervisor', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setTrips(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch trips:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'started':
        return <Clock size={16} className="text-blue-600" />;
      case 'ongoing':
        return <AlertCircle size={16} className="text-yellow-600" />;
      case 'completed':
        return <CheckCircle size={16} className="text-green-600" />;
      default:
        return <Clock size={16} className="text-gray-600" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'started': return 'bg-blue-100 text-blue-800';
      case 'ongoing': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredTrips = trips.filter(trip => {
    const matchesSearch = trip.tripId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         trip.route?.from?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         trip.route?.to?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || trip.status === statusFilter;
    const matchesType = typeFilter === 'all' || trip.tripType === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Trips</h1>
          <p className="text-gray-600">Manage and track your trips</p>
        </div>
        <Link
          to="/supervisor/trips/create"
          className="btn-primary flex items-center space-x-2"
        >
          <Plus size={16} />
          <span>New Trip</span>
        </Link>
      </div>

      {/* Search and Filters */}
      <div className="card">
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search trips by ID, location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          {/* Filters */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="all">All Status</option>
                <option value="started">Started</option>
                <option value="ongoing">Ongoing</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="all">All Types</option>
                <option value="purchase">Purchase</option>
                <option value="delivery">Delivery</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Trips List */}
      {filteredTrips.length === 0 ? (
        <div className="card text-center py-12">
          <MapPin className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No trips found</h3>
          <p className="text-gray-500 mb-4">
            {searchTerm || statusFilter !== 'all' || typeFilter !== 'all'
              ? 'Try adjusting your search or filters'
              : 'Get started by creating your first trip'
            }
          </p>
          {!searchTerm && statusFilter === 'all' && typeFilter === 'all' && (
            <Link to="/supervisor/trips/create" className="btn-primary">
              <Plus size={16} className="mr-2" />
              Create Trip
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTrips.map((trip) => (
            <Link
              key={trip._id}
              to={`/supervisor/trips/${trip._id}`}
              className="card hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(trip.status)}`}>
                      {trip.status}
                    </span>
                    <span className="text-xs text-gray-500">
                      {trip.tripType === 'purchase' ? 'Purchase' : 'Delivery'}
                    </span>
                  </div>
                  
                  <h3 className="font-medium text-gray-900 mb-1">
                    {trip.tripId}
                  </h3>
                  
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <div className="flex items-center space-x-1">
                      <MapPin size={14} />
                      <span>{trip.route?.from} → {trip.route?.to}</span>
                    </div>
                    
                    <div className="flex items-center space-x-1">
                      <Truck size={14} />
                      <span>{trip.vehicle?.registrationNumber || 'N/A'}</span>
                    </div>
                    
                    <div className="flex items-center space-x-1">
                      <Calendar size={14} />
                      <span>{new Date(trip.date).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {trip.route?.distance && (
                    <p className="text-xs text-gray-500 mt-1">
                      Distance: {trip.route.distance} km
                    </p>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  {getStatusIcon(trip.status)}
                  <span className="text-gray-400">→</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Trip Count */}
      {filteredTrips.length > 0 && (
        <div className="text-center text-sm text-gray-500">
          Showing {filteredTrips.length} of {trips.length} trips
        </div>
      )}
    </div>
  );
};

export default SupervisorTrips;
