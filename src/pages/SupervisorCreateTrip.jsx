import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Truck, 
  User, 
  MapPin, 
  DollarSign, 
  Save, 
  ArrowLeft,
  Plus,
  X
} from 'lucide-react';

const SupervisorCreateTrip = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tripType = searchParams.get('type') || 'purchase';
  
  const [formData, setFormData] = useState({
    tripType: tripType,
    date: new Date().toISOString().split('T')[0],
    vehicle: '',
    driver: '',
    labours: [],
    route: {
      from: '',
      to: '',
      distance: ''
    },
    notes: ''
  });

  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [labours, setLabours] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchFormData();
  }, []);

  const fetchFormData = async () => {
    try {
      const [vehiclesRes, driversRes, laboursRes] = await Promise.all([
        fetch('/api/vehicles', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }),
        fetch('/api/users?role=driver', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }),
        fetch('/api/users?role=labour', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        })
      ]);

      if (vehiclesRes.ok) {
        const vehiclesData = await vehiclesRes.json();
        setVehicles(vehiclesData.data);
      }

      if (driversRes.ok) {
        const driversData = await driversRes.json();
        setDrivers(driversData.data);
      }

      if (laboursRes.ok) {
        const laboursData = await laboursRes.json();
        setLabours(laboursData.data);
      }
    } catch (error) {
      console.error('Failed to fetch form data:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleLabourToggle = (labourId) => {
    setFormData(prev => ({
      ...prev,
      labours: prev.labours.includes(labourId)
        ? prev.labours.filter(id => id !== labourId)
        : [...prev.labours, labourId]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Generate unique trip ID
      const tripId = `TRIP-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      
      const tripData = {
        ...formData,
        tripId,
        status: 'started'
      };

      const response = await fetch('/api/trips', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(tripData)
      });

      if (response.ok) {
        const result = await response.json();
        navigate(`/supervisor/trips/${result.data._id}`);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to create trip');
      }
    } catch (error) {
      setError('An error occurred while creating the trip');
    } finally {
      setLoading(false);
    }
  };

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
        <div>
          <h1 className="text-xl font-bold text-gray-900">Create New Trip</h1>
          <p className="text-sm text-gray-500">
            {tripType === 'purchase' ? 'Purchase chickens from vendors' : 'Deliver chickens to customers'}
          </p>
        </div>
      </div>

      {/* Trip Type Toggle */}
      <div className="card">
        <label className="block text-sm font-medium text-gray-700 mb-3">Trip Type</label>
        <div className="flex rounded-lg border border-gray-300 p-1">
          <button
            type="button"
            onClick={() => setFormData(prev => ({ ...prev, tripType: 'purchase' }))}
            className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
              formData.tripType === 'purchase'
                ? 'bg-primary-600 text-white'
                : 'text-gray-700 hover:text-gray-900'
            }`}
          >
            Purchase Trip
          </button>
          <button
            type="button"
            onClick={() => setFormData(prev => ({ ...prev, tripType: 'delivery' }))}
            className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
              formData.tripType === 'delivery'
                ? 'bg-primary-600 text-white'
                : 'text-gray-700 hover:text-gray-900'
            }`}
          >
            Delivery Trip
          </button>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Details */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
                Trip Date *
              </label>
              <input
                type="date"
                id="date"
                name="date"
                required
                value={formData.date}
                onChange={handleChange}
                className="input-field"
              />
            </div>

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
                className="input-field"
              >
                <option value="">Select Vehicle</option>
                {vehicles.map(vehicle => (
                  <option key={vehicle._id} value={vehicle._id}>
                    {vehicle.registrationNumber} - {vehicle.model}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Team Assignment */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Team Assignment</h3>
          <div className="space-y-4">
            <div>
              <label htmlFor="driver" className="block text-sm font-medium text-gray-700 mb-1">
                Driver *
              </label>
              <select
                id="driver"
                name="driver"
                required
                value={formData.driver}
                onChange={handleChange}
                className="input-field"
              >
                <option value="">Select Driver</option>
                {drivers.map(driver => (
                  <option key={driver._id} value={driver._id}>
                    {driver.name} - {driver.mobileNumber}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Labour Workers *
              </label>
              <div className="grid grid-cols-2 gap-3">
                {labours.map(labour => (
                  <label key={labour._id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.labours.includes(labour._id)}
                      onChange={() => handleLabourToggle(labour._id)}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700">{labour.name}</span>
                  </label>
                ))}
              </div>
              {formData.labours.length === 0 && (
                <p className="text-sm text-red-600 mt-1">At least one labour worker is required</p>
              )}
            </div>
          </div>
        </div>

        {/* Route Information */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Route Information</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="route.from" className="block text-sm font-medium text-gray-700 mb-1">
                  From *
                </label>
                <input
                  type="text"
                  id="route.from"
                  name="route.from"
                  required
                  value={formData.route.from}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="Starting location"
                />
              </div>

              <div>
                <label htmlFor="route.to" className="block text-sm font-medium text-gray-700 mb-1">
                  To *
                </label>
                <input
                  type="text"
                  id="route.to"
                  name="route.to"
                  required
                  value={formData.route.to}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="Destination"
                />
              </div>
            </div>

            <div>
              <label htmlFor="route.distance" className="block text-sm font-medium text-gray-700 mb-1">
                Distance (km)
              </label>
              <input
                type="number"
                id="route.distance"
                name="route.distance"
                value={formData.route.distance}
                onChange={handleChange}
                className="input-field"
                placeholder="Distance in kilometers"
                min="0"
                step="0.1"
              />
            </div>
          </div>
        </div>

        {/* Additional Notes */}
        <div className="card">
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
            Additional Notes
          </label>
          <textarea
            id="notes"
            name="notes"
            rows="3"
            value={formData.notes}
            onChange={handleChange}
            className="input-field"
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
            onClick={() => navigate(-1)}
            className="btn-secondary flex-1"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || formData.labours.length === 0}
            className="btn-primary flex-1 flex items-center justify-center space-x-2"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <Save size={16} />
            )}
            <span>{loading ? 'Creating...' : 'Create Trip'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default SupervisorCreateTrip;
