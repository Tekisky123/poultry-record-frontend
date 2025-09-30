import { useState, useEffect } from 'react';
import { X, User, Truck, Users, MapPin, Loader2, AlertTriangle } from 'lucide-react';
import api from '../lib/axios';

const TransferTripModal = ({ 
  isOpen, 
  onClose, 
  trip, 
  tripId,
  onTransferSuccess 
}) => {
  const [loading, setLoading] = useState(false);
  const [supervisors, setSupervisors] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [errors, setErrors] = useState({});

  // Form data state
  const [formData, setFormData] = useState({
    supervisorId: '',
    vehicleId: '',
    driver: '',
    labours: [''],
    place: '',
    vehicleReadings: {
      opening: 0
    },
    reason: '',
    notes: '',
    transferBirds: {
      birds: 0,
      weight: 0,
      rate: 0
    }
  });

  // Calculate remaining birds available for transfer
  const calculateRemainingBirds = () => {
    const totalPurchased = trip?.summary?.totalBirdsPurchased || 0;
    const totalSold = trip?.summary?.totalBirdsSold || 0;
    const totalInStock = trip?.stocks?.reduce((sum, stock) => sum + (stock.birds || 0), 0) || 0;
    const totalLost = trip?.summary?.totalBirdsLost || 0;
    const totalTransferred = trip?.summary?.birdsTransferred || 0;
    return totalPurchased - totalSold - totalInStock - totalLost - totalTransferred;
  };

  const remainingBirds = calculateRemainingBirds();
  const avgPurchaseRate = trip?.summary?.avgPurchaseRate || 0;

  useEffect(() => {
    if (isOpen) {
      console.log('TransferTripModal opened with:', { tripId, trip: trip ? { id: trip.id, _id: trip._id, tripId: trip.tripId } : null });
      fetchSupervisors();
      fetchVehicles();
      // Set default rate
      setFormData(prev => ({
        ...prev,
        transferBirds: {
          ...prev.transferBirds,
          rate: avgPurchaseRate
        }
      }));
    }
  }, [isOpen, avgPurchaseRate, tripId, trip]);

  const fetchSupervisors = async () => {
    try {
      const { data } = await api.get('/user');
      if (data.success) {
        // Filter only approved supervisors
        const approvedSupervisors = (data.data || []).filter(user => 
          user.role === 'supervisor' && 
          user.approvalStatus === 'approved' && 
          user.isActive === true
        );
        console.log(approvedSupervisors)
        setSupervisors(approvedSupervisors);
      }
    } catch (error) {
      console.error('Error fetching supervisors:', error);
    }
  };

  const fetchVehicles = async () => {
    try {
      const { data } = await api.get('/vehicle');
      console.log('Raw vehicle data:', data);
      if (data.success) {
        // Filter only idle vehicles
        const idleVehicles = (data.data || []).filter(vehicle => 
          vehicle.currentStatus === 'idle'
        );
        console.log('Idle vehicles:', idleVehicles);
        setVehicles(idleVehicles);
      }
    } catch (error) {
      console.error('Error fetching vehicles:', error);
    }
  };

  const handleInputChange = (field, value) => {
    if (field === 'vehicleId') {
      console.log('Vehicle selected:', value);
      const selectedVehicle = vehicles.find(v => (v.id || v._id) === value);
      console.log('Selected vehicle object:', selectedVehicle);
    }
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };

  const handleNestedChange = (parent, field, value) => {
    setFormData(prev => ({
      ...prev,
      [parent]: {
        ...prev[parent],
        [field]: value
      }
    }));
  };

  const handleLabourChange = (index, value) => {
    const newLabours = [...formData.labours];
    newLabours[index] = value;
    setFormData(prev => ({
      ...prev,
      labours: newLabours
    }));
  };

  const addLabour = () => {
    setFormData(prev => ({
      ...prev,
      labours: [...prev.labours, '']
    }));
  };

  const removeLabour = (index) => {
    if (formData.labours.length > 1) {
      const newLabours = formData.labours.filter((_, i) => i !== index);
      setFormData(prev => ({
        ...prev,
        labours: newLabours
      }));
    }
  };

  // Auto-calculate average weight and amount when birds or weight changes
  useEffect(() => {
    if (formData.transferBirds.birds > 0 && formData.transferBirds.weight > 0) {
      const avgWeight = (formData.transferBirds.weight / formData.transferBirds.birds).toFixed(2);
      setFormData(prev => ({
        ...prev,
        transferBirds: {
          ...prev.transferBirds,
          avgWeight: parseFloat(avgWeight)
        }
      }));
    }
  }, [formData.transferBirds.birds, formData.transferBirds.weight]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.supervisorId) newErrors.supervisorId = 'Supervisor is required';
    if (!formData.vehicleId) {
      newErrors.vehicleId = 'Vehicle is required';
    } else {
      // Validate that vehicleId is a valid ObjectId format (24 hex characters)
      if (!/^[a-fA-F0-9]{24}$/.test(formData.vehicleId)) {
        newErrors.vehicleId = 'Invalid vehicle selection. Please select a valid vehicle.';
        console.error('Invalid vehicle ID format:', formData.vehicleId);
      }
    }
    if (!formData.driver.trim()) newErrors.driver = 'Driver name is required';
    if (!formData.place.trim()) newErrors.place = 'Place is required';
    if (!formData.reason.trim()) newErrors.reason = 'Transfer reason is required';
    
    if (formData.vehicleReadings.opening <= 0) {
      newErrors.openingOdometer = 'Opening odometer reading is required';
    }

    // Validate transfer birds
    if (!formData.transferBirds.birds || formData.transferBirds.birds <= 0) {
      newErrors.transferBirds = 'Number of birds to transfer is required';
    } else if (formData.transferBirds.birds > remainingBirds) {
      newErrors.transferBirds = `Cannot transfer ${formData.transferBirds.birds} birds. Only ${remainingBirds} birds available`;
    }

    if (!formData.transferBirds.weight || formData.transferBirds.weight <= 0) {
      newErrors.transferWeight = 'Weight of birds to transfer is required';
    }

    if (!formData.transferBirds.rate || formData.transferBirds.rate <= 0) {
      newErrors.transferRate = 'Rate per kg is required';
    }

    // Validate labours
    const validLabours = formData.labours.filter(labour => labour.trim());
    if (validLabours.length === 0) {
      newErrors.labours = 'At least one labour worker is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    // Validate trip ID - use the passed tripId prop first, then fallback to trip object
    const tripIdToUse = tripId || trip._id || trip.id;
    if (!tripIdToUse) {
      alert('Trip ID is missing. Please refresh and try again.');
      return;
    }

    setLoading(true);
    try {
      const submitData = {
        ...formData,
        labours: formData.labours.filter(labour => labour.trim())
      };

      console.log('Transferring trip:', tripIdToUse, 'with data:', submitData);
      console.log('Vehicle ID being sent:', submitData.vehicleId);
      console.log('Available vehicles:', vehicles.map(v => ({ id: v.id || v._id, number: v.vehicleNumber })));
      const { data } = await api.post(`/trip/${tripIdToUse}/transfer`, submitData);
      
      if (data.success) {
        alert('Trip transferred successfully!');
        onTransferSuccess?.(data.data);
        onClose();
      }
    } catch (error) {
      console.error('Error transferring trip:', error);
      alert(error.response?.data?.message || 'Failed to transfer trip');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Transfer Trip</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={loading}
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* Transfer Information */}
          <div className="mb-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
                <AlertTriangle size={16} />
                Transfer Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-blue-700">Original Trip:</span>
                  <div className="font-medium text-blue-900">{trip?.tripId}</div>
                </div>
                <div>
                  <span className="text-blue-700">Remaining Birds Available:</span>
                  <div className="font-medium text-blue-900">{remainingBirds} birds</div>
                </div>
                <div>
                  <span className="text-blue-700">Current Rate:</span>
                  <div className="font-medium text-blue-900">₹{avgPurchaseRate.toFixed(2)}/kg</div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-4">
              {/* Supervisor Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <User size={16} className="inline mr-1" />
                  Transfer to Supervisor *
                </label>
                <select
                  value={formData.supervisorId}
                  onChange={(e) => handleInputChange('supervisorId', e.target.value)}
                  className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.supervisorId ? 'border-red-500' : 'border-gray-300'
                  }`}
                  disabled={loading}
                >
                  <option value="">Select Supervisor</option>
                  {supervisors.map((supervisor) => (
                    <option key={supervisor._id} value={supervisor._id}>
                      {supervisor.name} - {supervisor.mobileNumber}
                    </option>
                  ))}
                </select>
                {errors.supervisorId && <p className="text-red-500 text-sm mt-1">{errors.supervisorId}</p>}
              </div>

              {/* Vehicle Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Truck size={16} className="inline mr-1" />
                  Vehicle *
                </label>
                <select
                  value={formData.vehicleId}
                  onChange={(e) => handleInputChange('vehicleId', e.target.value)}
                  className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.vehicleId ? 'border-red-500' : 'border-gray-300'
                  }`}
                  disabled={loading}
                >
                  <option value="">Select Vehicle</option>
                  {vehicles.map((vehicle) => {
                    const vehicleId = vehicle.id || vehicle._id;
                    return (
                      <option key={vehicleId} value={vehicleId}>
                        {vehicle.vehicleNumber} - {vehicle.type}
                      </option>
                    );
                  })}
                </select>
                {errors.vehicleId && <p className="text-red-500 text-sm mt-1">{errors.vehicleId}</p>}
              </div>

              {/* Driver */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Driver Name *
                </label>
                <input
                  type="text"
                  value={formData.driver}
                  onChange={(e) => handleInputChange('driver', e.target.value)}
                  className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.driver ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter driver name"
                  disabled={loading}
                />
                {errors.driver && <p className="text-red-500 text-sm mt-1">{errors.driver}</p>}
              </div>

              {/* Place */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <MapPin size={16} className="inline mr-1" />
                  Base Location *
                </label>
                <input
                  type="text"
                  value={formData.place}
                  onChange={(e) => handleInputChange('place', e.target.value)}
                  className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.place ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter base location"
                  disabled={loading}
                />
                {errors.place && <p className="text-red-500 text-sm mt-1">{errors.place}</p>}
              </div>

              {/* Opening Odometer */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Opening Odometer Reading *
                </label>
                <input
                  type="number"
                  value={formData.vehicleReadings.opening}
                  onChange={(e) => handleNestedChange('vehicleReadings', 'opening', parseInt(e.target.value) || 0)}
                  className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.openingOdometer ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter opening odometer reading"
                  disabled={loading}
                />
                {errors.openingOdometer && <p className="text-red-500 text-sm mt-1">{errors.openingOdometer}</p>}
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              {/* Transfer Birds Details */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-medium text-green-900 mb-3">Transfer Birds Details</h4>
                
                {/* Birds Count */}
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Number of Birds to Transfer *
                  </label>
                  <input
                    type="number"
                    value={formData.transferBirds.birds}
                    onChange={(e) => handleNestedChange('transferBirds', 'birds', parseInt(e.target.value) || 0)}
                    className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.transferBirds ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter number of birds"
                    max={remainingBirds}
                    disabled={loading}
                  />
                  {errors.transferBirds && <p className="text-red-500 text-sm mt-1">{errors.transferBirds}</p>}
                </div>

                {/* Weight */}
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Total Weight (kg) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.transferBirds.weight}
                    onChange={(e) => handleNestedChange('transferBirds', 'weight', parseFloat(e.target.value) || 0)}
                    className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.transferWeight ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter total weight"
                    disabled={loading}
                  />
                  {errors.transferWeight && <p className="text-red-500 text-sm mt-1">{errors.transferWeight}</p>}
                </div>

                {/* Rate */}
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rate per kg *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.transferBirds.rate}
                    onChange={(e) => handleNestedChange('transferBirds', 'rate', parseFloat(e.target.value) || 0)}
                    className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.transferRate ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter rate per kg"
                    disabled={loading}
                  />
                  {errors.transferRate && <p className="text-red-500 text-sm mt-1">{errors.transferRate}</p>}
                </div>

                {/* Calculated Values */}
                {formData.transferBirds.birds > 0 && formData.transferBirds.weight > 0 && (
                  <div className="bg-white p-3 rounded border">
                    <div className="text-sm space-y-1">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Average Weight:</span>
                        <span className="font-medium">
                          {(formData.transferBirds.weight / formData.transferBirds.birds).toFixed(2)} kg/bird
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Amount:</span>
                        <span className="font-medium text-green-600">
                          ₹{(formData.transferBirds.weight * formData.transferBirds.rate).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Labour Workers */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Users size={16} className="inline mr-1" />
                  Labour Workers *
                </label>
                {formData.labours.map((labour, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={labour}
                      onChange={(e) => handleLabourChange(index, e.target.value)}
                      className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder={`Labour ${index + 1} name`}
                      disabled={loading}
                    />
                    {formData.labours.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeLabour(index)}
                        className="px-3 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                        disabled={loading}
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addLabour}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  disabled={loading}
                >
                  + Add Another Labour
                </button>
                {errors.labours && <p className="text-red-500 text-sm mt-1">{errors.labours}</p>}
              </div>

              {/* Transfer Reason */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for Transfer *
                </label>
                <textarea
                  value={formData.reason}
                  onChange={(e) => handleInputChange('reason', e.target.value)}
                  rows={3}
                  className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.reason ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Explain why you need to transfer this trip"
                  disabled={loading}
                />
                {errors.reason && <p className="text-red-500 text-sm mt-1">{errors.reason}</p>}
              </div>

              {/* Additional Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  rows={2}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Any additional notes or instructions"
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 mt-6 pt-6 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || remainingBirds <= 0}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              {loading ? 'Transferring...' : 'Transfer Trip'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TransferTripModal;