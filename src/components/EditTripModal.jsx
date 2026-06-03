import { useState, useEffect } from 'react';
import { X, Save, Loader2 } from 'lucide-react';
import api from '../lib/axios';

const EditTripModal = ({ isOpen, onClose, trip, onSuccess }) => {
  const [formData, setFormData] = useState({
    date: '',
    place: '',
    driver: '',
    labour: '',
    route: {
      from: '',
      to: '',
      distance: 0
    },
    vehicleReadings: {
      opening: 0,
      closing: 0
    }
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (trip && isOpen) {
      setFormData({
        date: trip.date ? new Date(trip.date).toISOString().split('T')[0] : '',
        place: trip.place || '',
        driver: trip.driver || '',
        labour: trip.labour || '',
        route: {
          from: trip.route?.from || '',
          to: trip.route?.to || '',
          distance: trip.route?.distance || 0
        },
        vehicleReadings: {
          opening: trip.vehicleReadings?.opening || 0,
          closing: trip.vehicleReadings?.closing || 0
        }
      });
    }
  }, [trip, isOpen]);

  const handleInputChange = (e) => {
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const updateData = {
        ...formData,
        date: new Date(formData.date),
        vehicleReadings: {
          ...formData.vehicleReadings,
          opening: Number(formData.vehicleReadings.opening),
          closing: Number(formData.vehicleReadings.closing)
        },
        route: {
          ...formData.route,
          distance: Number(formData.route.distance)
        }
      };
      
      await api.put(`/trip/${trip.id}`, updateData);
      
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update trip');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Edit Trip Details</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Basic Trip Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Trip Date *
                </label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Place
                </label>
                <input
                  type="text"
                  name="place"
                  value={formData.place}
                  onChange={handleInputChange}
                  placeholder="Enter place"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Driver *
                </label>
                <input
                  type="text"
                  name="driver"
                  value={formData.driver}
                  onChange={handleInputChange}
                  required
                  placeholder="Enter driver name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Labour
                </label>
                <input
                  type="text"
                  name="labour"
                  value={formData.labour}
                  onChange={handleInputChange}
                  placeholder="Enter labour name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Route Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Route Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  From *
                </label>
                <input
                  type="text"
                  name="route.from"
                  value={formData.route.from}
                  onChange={handleInputChange}
                  required
                  placeholder="Start location"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  To *
                </label>
                <input
                  type="text"
                  name="route.to"
                  value={formData.route.to}
                  onChange={handleInputChange}
                  required
                  placeholder="End location"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Distance (km)
                </label>
                <input
                  type="number"
                  name="route.distance"
                  value={formData.route.distance}
                  onChange={handleInputChange}
                  min="0"
                  step="0.1"
                  placeholder="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Vehicle Readings */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Vehicle Readings</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Opening Odometer (km) *
                </label>
                <input
                  type="number"
                  name="vehicleReadings.opening"
                  value={formData.vehicleReadings.opening}
                  onChange={handleInputChange}
                  required
                  min="0"
                  step="0.1"
                  placeholder="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Closing Odometer (km)
                </label>
                <input
                  type="number"
                  name="vehicleReadings.closing"
                  value={formData.vehicleReadings.closing}
                  onChange={handleInputChange}
                  min="0"
                  step="0.1"
                  placeholder="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-6 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Save size={16} />
                  Update Trip
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditTripModal;
