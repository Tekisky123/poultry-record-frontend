import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Truck, 
  User, 
  MapPin, 
  DollarSign, 
  Save, 
  ArrowLeft,
  Plus,
  X,
  Loader2
} from 'lucide-react';
import api from '../lib/axios';
import { useAuth } from '../contexts/AuthContext';

const SupervisorCreateTrip = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [formData, setFormData] = useState({
    place: '',
    route: {
      from: '',
      to: '',
      distance: ''
    },
    vehicle: '',
    driver: '',
    labour: '',
    vehicleReadings: {
      opening: ''
    },
    notes: ''
  });

  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showVehicleStatusModal, setShowVehicleStatusModal] = useState(false);
  const [selectedVehicleStatus, setSelectedVehicleStatus] = useState('');

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/vehicle');
      setVehicles(data.data || []);
    } catch (error) {
      console.error('Failed to fetch vehicles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Check if vehicle is being selected
    if (name === 'vehicle' && value) {
      const selectedVehicle = vehicles.find(v => v.id === value);
      if (selectedVehicle && selectedVehicle.currentStatus !== 'idle') {
        // Vehicle is not idle, show modal and reset selection
        setSelectedVehicleStatus(selectedVehicle.currentStatus);
        setShowVehicleStatusModal(true);
        setFormData(prev => ({
          ...prev,
          [name]: '' // Reset vehicle selection
        }));
        return;
      }
    }
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: name.includes('opening') || name.includes('distance') ? Number(value) : value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      // Validate required fields
      if (!formData.route.from || !formData.route.to || !formData.vehicle || !formData.driver) {
        setError('Please fill in all required fields (Start Location, End Location, Vehicle, and Driver)');
        return;
      }

      const tripData = {
        place: formData.place,
        route: {
          from: formData.route.from,
          to: formData.route.to,
          distance: Number(formData.route.distance) || 0
        },
        vehicle: formData.vehicle,
        driver: formData.driver,
        labour: formData.labour || '',
        vehicleReadings: {
          opening: Number(formData.vehicleReadings.opening) || 0
        },
        notes: formData.notes,
        supervisor: user.id, // Automatically set the supervisor
        createdBy: user.id,
        updatedBy: user.id
      };

      console.log('Creating trip with data:', tripData);

      const { data } = await api.post('/trip', tripData);
      
      if (data.success) {
        alert('Trip created successfully!');
        navigate('/supervisor/trips');
      } else {
        setError(data.message || 'Failed to create trip');
      }
    } catch (error) {
      console.error('Error creating trip:', error);
      setError(error.response?.data?.message || 'An error occurred while creating the trip');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <button
          onClick={() => navigate('/supervisor/trips')}
          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Create New Trip</h1>
          <p className="text-sm text-gray-500">
            Create a new poultry trip with start and end locations. For round trips, set the same location for both start and end points.
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Details */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Trip Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="routeFrom" className="block text-sm font-medium text-gray-700 mb-1">
                Start Location ( Route ) *
              </label>
              <input
                type="text"
                id="routeFrom"
                name="route.from"
                required
                value={formData.route.from}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., SNK, Hyderabad, Main Office"
              />
              <p className="text-xs text-gray-500 mt-1">Where the trip starts</p>
            </div>

            <div>
              <label htmlFor="routeTo" className="block text-sm font-medium text-gray-700 mb-1">
                End Location ( Route ) *
              </label>
              <input
                type="text"
                id="routeTo"
                name="route.to"
                required
                value={formData.route.to}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., SNK, Hyderabad, Main Office"
              />
              <p className="text-xs text-gray-500 mt-1">Where the trip ends (can be same as start for round trips)</p>
            </div>

            {/* <div>
              <label htmlFor="place" className="block text-sm font-medium text-gray-700 mb-1">
                Area/Region Reference (Optional)
              </label>
              <input
                type="text"
                id="place"
                name="place"
                value={formData.place}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., SNK Area, North Zone"
              />
              <p className="text-xs text-gray-500 mt-1">General area reference (optional)</p>
            </div> */}

            <div>
              <label htmlFor="vehicle" className="block text-sm font-medium text-gray-700 mb-1">
                Vehicle *
              </label>
              <select
                id="vehicle"
                name="vehicle"
                required
                value={formData.vehicle}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select Vehicle</option>
                {vehicles.map(vehicle => (
                  <option 
                    key={vehicle.id} 
                    value={vehicle.id}
                    className={vehicle.currentStatus !== 'idle' ? 'text-gray-500' : ''}
                  >
                    {vehicle.vehicleNumber}
                    {vehicle.currentStatus !== 'idle' && `- (${vehicle.currentStatus})`}
                  </option>
                ))}
              </select>
              <p className="text-sm text-gray-500 mt-1">
                Only vehicles with 'idle' status can be selected for new trips
              </p>
            </div>

            <div>
              <label htmlFor="driver" className="block text-sm font-medium text-gray-700 mb-1">
                Driver Name *
              </label>
              <input
                type="text"
                id="driver"
                name="driver"
                required
                value={formData.driver}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., ALLABAKSH"
              />
            </div>

            <div>
              <label htmlFor="opening" className="block text-sm font-medium text-gray-700 mb-1">
                Opening Odometer *
              </label>
              <input
                type="number"
                id="opening"
                name="vehicleReadings.opening"
                required
                value={formData.vehicleReadings.opening}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0"
                min="0"
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter the vehicle's odometer reading at trip start
              </p>
            </div>
          </div>
        </div>

        {/* Labour Section */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Labour Worker (Optional)</h3>
          <div>
            <label htmlFor="labour" className="block text-sm font-medium text-gray-700 mb-1">
              Labour Worker Name
            </label>
            <input
              type="text"
              id="labour"
              name="labour"
              value={formData.labour}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter labour worker name (optional)"
            />
            <p className="text-xs text-gray-500 mt-1">You can add a labour worker if needed</p>
          </div>
        </div>



        {/* Additional Notes */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
            Additional Notes
          </label>
          <textarea
            id="notes"
            name="notes"
            rows="3"
            value={formData.notes}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Any additional information about the trip..."
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Submit Button */}
        <div className="flex space-x-3">
          <button
            type="button"
            onClick={() => navigate('/supervisor/trips')}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save size={16} />
            )}
            <span>{isSubmitting ? 'Creating...' : 'Create Trip'}</span>
          </button>
        </div>
      </form>

      {/* Vehicle Status Modal */}
      {showVehicleStatusModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Vehicle Not Available</h3>
              <button
                onClick={() => setShowVehicleStatusModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="mb-6">
              <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full">
                <Truck className="w-8 h-8 text-red-600" />
              </div>
              <p className="text-center text-gray-700">
                Vehicle Not Available Due to <span className="font-semibold capitalize">{selectedVehicleStatus}</span>
              </p>
              <p className="text-center text-sm text-gray-500 mt-2">
                Please select a vehicle with 'idle' status to create a new trip.
              </p>
            </div>
            
            <div className="flex justify-end">
              <button
                onClick={() => setShowVehicleStatusModal(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupervisorCreateTrip;
