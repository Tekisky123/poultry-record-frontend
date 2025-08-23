import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  MapPin, 
  Truck, 
  User, 
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  Edit
} from 'lucide-react';

const SupervisorTripDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTripDetails();
  }, [id]);

  const fetchTripDetails = async () => {
    try {
      const response = await fetch(`/api/trips/${id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setTrip(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch trip details:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'started':
        return <Clock size={20} className="text-blue-600" />;
      case 'ongoing':
        return <AlertCircle size={20} className="text-yellow-600" />;
      case 'completed':
        return <CheckCircle size={20} className="text-green-600" />;
      default:
        return <Clock size={20} className="text-gray-600" />;
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Trip not found</h3>
        <p className="text-gray-500">The trip you're looking for doesn't exist.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <button
          onClick={() => navigate(-1)}
          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">{trip.tripId}</h1>
          <p className="text-sm text-gray-500">
            {trip.tripType === 'purchase' ? 'Purchase Trip' : 'Delivery Trip'}
          </p>
        </div>
        <button className="btn-primary flex items-center space-x-2">
          <Edit size={16} />
          <span>Edit</span>
        </button>
      </div>

      {/* Status Card */}
      <div className="card">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {getStatusIcon(trip.status)}
            <div>
              <h3 className="font-medium text-gray-900">Status</h3>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(trip.status)}`}>
                {trip.status}
              </span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Trip Date</p>
            <p className="font-medium text-gray-900">
              {new Date(trip.date).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* Route Information */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Route Information</h3>
        <div className="space-y-3">
          <div className="flex items-center space-x-3">
            <MapPin size={18} className="text-gray-400" />
            <div>
              <p className="text-sm text-gray-500">From</p>
              <p className="font-medium text-gray-900">{trip.route?.from}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <MapPin size={18} className="text-gray-400" />
            <div>
              <p className="text-sm text-gray-500">To</p>
              <p className="font-medium text-gray-900">{trip.route?.to}</p>
            </div>
          </div>

          {trip.route?.distance && (
            <div className="flex items-center space-x-3">
              <MapPin size={18} className="text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Distance</p>
                <p className="font-medium text-gray-900">{trip.route.distance} km</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Team Information */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Team Information</h3>
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <Truck size={18} className="text-gray-400" />
            <div>
              <p className="text-sm text-gray-500">Vehicle</p>
              <p className="font-medium text-gray-900">
                {trip.vehicle?.registrationNumber} - {trip.vehicle?.model}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <User size={18} className="text-gray-400" />
            <div>
              <p className="text-sm text-gray-500">Driver</p>
              <p className="font-medium text-gray-900">{trip.driver?.name}</p>
            </div>
          </div>

          <div>
            <p className="text-sm text-gray-500 mb-2">Labour Workers</p>
            <div className="space-y-2">
              {trip.labours?.map((labour, index) => (
                <div key={labour._id} className="flex items-center space-x-3">
                  <User size={16} className="text-gray-400" />
                  <span className="text-gray-900">{labour.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Trip Summary */}
      {trip.summary && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Trip Summary</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Total Purchase</p>
              <p className="font-medium text-gray-900">₹{trip.summary.totalPurchaseAmount?.toLocaleString() || 0}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Sales</p>
              <p className="font-medium text-gray-900">₹{trip.summary.totalSalesAmount?.toLocaleString() || 0}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Expenses</p>
              <p className="font-medium text-gray-900">₹{trip.summary.totalExpenses?.toLocaleString() || 0}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Net Profit</p>
              <p className={`font-medium ${trip.summary.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ₹{trip.summary.netProfit?.toLocaleString() || 0}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Notes */}
      {trip.notes && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Notes</h3>
          <p className="text-gray-700">{trip.notes}</p>
        </div>
      )}
    </div>
  );
};

export default SupervisorTripDetails;
