import { useState, useEffect } from 'react';
import { X, User, Truck, Users, MapPin, Loader2, AlertTriangle, Edit2 } from 'lucide-react';
import api from '../lib/axios';

const TransferTripModal = ({ 
  isOpen, 
  onClose, 
  trip, 
  tripId,
  onTransferSuccess,
  // Edit-mode props
  editMode = false,
  editTransfer = null,   // the existing transfer object from transferHistory
  editIndex = null,      // its index in transferHistory
  onEditSuccess = null   // callback after successful edit
}) => {
  const [loading, setLoading] = useState(false);
  const [supervisors, setSupervisors] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [errors, setErrors] = useState({});

  // Form data state
  const [formData, setFormData] = useState({
    supervisorId: '',
    vehicleId: '',
    reason: '',
    transferBirds: {
      birds: '',
      weight: '',
      rate: ''
    }
  });

  // Calculate remaining birds available for transfer (create mode)
  const calculateRemainingBirds = () => {
    const totalPurchased = trip?.summary?.totalBirdsPurchased || 0;
    const customerSold = trip?.summary?.customerBirdsSold || 0;
    const totalInStock = trip?.stocks?.reduce((sum, stock) => sum + (stock.birds || 0), 0) || 0;
    const totalLost = trip?.summary?.totalBirdsLost || 0;
    const totalTransferred = trip?.summary?.birdsTransferred || 0;
    return totalPurchased - customerSold - totalInStock - totalLost - totalTransferred;
  };

  // Calculate remaining weight available for transfer (create mode)
  const calculateRemainingWeight = () => {
    const totalPurchasedWeight = trip?.summary?.totalWeightPurchased || 0;
    const customerSoldWeight = trip?.summary?.customerWeightSold || 0;
    const totalInStockWeight = trip?.stocks?.reduce((sum, stock) => sum + (stock.weight || 0), 0) || 0;
    const totalLostWeight = trip?.summary?.totalWeightLost || 0;
    const totalTransferredWeight = trip?.summary?.weightTransferred || 0;
    return totalPurchasedWeight - customerSoldWeight - totalInStockWeight - totalLostWeight - totalTransferredWeight;
  };

  const rawRemainingBirds  = calculateRemainingBirds();
  const rawRemainingWeight = calculateRemainingWeight();

  // In edit mode, add back the existing transfer's values so the user can keep or increase them
  const currentTfrBirds  = editTransfer?.transferredStock?.birds  || 0;
  const currentTfrWeight = editTransfer?.transferredStock?.weight || 0;
  const remainingBirds   = editMode ? rawRemainingBirds  + currentTfrBirds  : rawRemainingBirds;
  const remainingWeight  = editMode ? rawRemainingWeight + currentTfrWeight : rawRemainingWeight;
  
  // Calculate average purchase rate from actual purchase data
  const calculateAvgPurchaseRate = () => {
    if (!trip?.purchases || trip.purchases.length === 0) return 0;
    const totalAmount = trip.purchases.reduce((sum, purchase) => sum + (purchase.amount || 0), 0);
    const totalWeight = trip.purchases.reduce((sum, purchase) => sum + (purchase.weight || 0), 0);
    return totalWeight > 0 ? totalAmount / totalWeight : 0;
  };
  
  const avgPurchaseRate = calculateAvgPurchaseRate();

  useEffect(() => {
    if (isOpen) {
      if (editMode && editTransfer) {
        // Pre-fill with existing transfer data
        setFormData({
          supervisorId: '',
          vehicleId: '',
          reason: editTransfer.reason || '',
          transferBirds: {
            birds:  editTransfer.transferredStock?.birds  || '',
            weight: editTransfer.transferredStock?.weight || '',
            rate:   editTransfer.transferredStock?.rate   || ''
          }
        });
      } else {
        // Create mode: fetch supervisors + vehicles, default rate
        fetchSupervisors();
        fetchVehicles();
        if (avgPurchaseRate > 0) {
          setFormData(prev => ({
            ...prev,
            transferBirds: { ...prev.transferBirds, rate: avgPurchaseRate }
          }));
        }
      }
      setErrors({});
    }
  }, [isOpen, editMode, editTransfer, avgPurchaseRate]);

  const fetchSupervisors = async () => {
    try {
      const { data } = await api.get('/user');
      if (data.success) {
        const approvedSupervisors = (data.data || []).filter(user => 
          user.role === 'supervisor' && 
          user.approvalStatus === 'approved' && 
          user.isActive === true
        );
        setSupervisors(approvedSupervisors);
      }
    } catch (error) {
      console.error('Error fetching supervisors:', error);
    }
  };

  const fetchVehicles = async () => {
    try {
      const { data } = await api.get('/vehicle');
      if (data.success) {
        const idleVehicles = (data.data || []).filter(vehicle => vehicle.currentStatus === 'idle');
        setVehicles(idleVehicles);
      }
    } catch (error) {
      console.error('Error fetching vehicles:', error);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }));
  };

  const handleNestedChange = (parent, field, value) => {
    setFormData(prev => ({
      ...prev,
      [parent]: { ...prev[parent], [field]: value }
    }));
  };

  // Auto-calculate avg weight when birds or weight changes
  useEffect(() => {
    const birds  = Number(formData.transferBirds.birds)  || 0;
    const weight = Number(formData.transferBirds.weight) || 0;
    if (birds > 0 && weight > 0) {
      setFormData(prev => ({
        ...prev,
        transferBirds: { ...prev.transferBirds, avgWeight: parseFloat((weight / birds).toFixed(2)) }
      }));
    }
  }, [formData.transferBirds.birds, formData.transferBirds.weight]);

  const validateForm = () => {
    const newErrors = {};

    if (!editMode) {
      if (!formData.supervisorId) newErrors.supervisorId = 'Supervisor is required';
      if (!formData.vehicleId) {
        newErrors.vehicleId = 'Vehicle is required';
      } else if (!/^[a-fA-F0-9]{24}$/.test(formData.vehicleId)) {
        newErrors.vehicleId = 'Invalid vehicle selection. Please select a valid vehicle.';
      }
    }
    if (!formData.reason.trim()) newErrors.reason = 'Transfer reason is required';

    const transferBirds  = Number(formData.transferBirds.birds);
    const transferWeight = Number(formData.transferBirds.weight);
    const transferRate   = Number(formData.transferBirds.rate);

    if (!formData.transferBirds.birds || transferBirds <= 0) {
      newErrors.transferBirds = 'Number of birds to transfer is required';
    } else if (transferBirds > remainingBirds) {
      newErrors.transferBirds = `Cannot transfer ${transferBirds} birds. Only ${remainingBirds} birds available`;
    }

    if (!formData.transferBirds.weight || transferWeight <= 0) {
      newErrors.transferWeight = 'Weight of birds to transfer is required';
    } else if (transferWeight > remainingWeight) {
      newErrors.transferWeight = `Cannot transfer ${transferWeight.toFixed(2)} kg. Only ${remainingWeight.toFixed(2)} kg available`;
    }

    if (!formData.transferBirds.rate || transferRate <= 0) {
      newErrors.transferRate = 'Rate per kg is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const tripIdToUse = tripId || trip._id || trip.id;
    if (!tripIdToUse) {
      alert('Trip ID is missing. Please refresh and try again.');
      return;
    }

    setLoading(true);
    try {
      if (editMode) {
        // ── Edit mode: PUT to update the existing transfer ──────────────────
        const { data } = await api.put(`/trip/${tripIdToUse}/transfer/${editIndex}`, {
          birds:  formData.transferBirds.birds,
          weight: formData.transferBirds.weight,
          rate:   formData.transferBirds.rate,
          reason: formData.reason
        });
        if (data.success) {
          onEditSuccess?.(data.data);
          onClose();
        }
      } else {
        // ── Create mode: POST to create a new transfer ──────────────────────
        const submitData = {
          supervisorId: formData.supervisorId,
          vehicleId:    formData.vehicleId,
          reason:       formData.reason,
          transferBirds: formData.transferBirds
        };
        const { data } = await api.post(`/trip/${tripIdToUse}/transfer`, submitData);
        if (data.success) {
          alert('Trip transferred successfully! The receiving supervisor will need to complete the trip details (driver, labour, odometer, locations).');
          onTransferSuccess?.(data.data);
          onClose();
        }
      }
    } catch (error) {
      console.error('Error submitting transfer:', error);
      alert(error.response?.data?.message || (editMode ? 'Failed to update transfer' : 'Failed to transfer trip'));
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
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            {editMode && <Edit2 size={20} className="text-orange-600" />}
            {editMode ? 'Edit Transfer' : 'Transfer Trip'}
          </h2>
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
          {/* Transfer Information Banner */}
          <div className="mb-6">
            <div className={`border rounded-lg p-4 ${editMode ? 'bg-orange-50 border-orange-200' : 'bg-blue-50 border-blue-200'}`}>
              <h3 className={`font-medium mb-2 flex items-center gap-2 ${editMode ? 'text-orange-900' : 'text-blue-900'}`}>
                <AlertTriangle size={16} />
                {editMode ? 'Edit Transfer Details' : 'Transfer Information'}
              </h3>
              <div className={`grid grid-cols-1 md:grid-cols-4 gap-4 text-sm mb-3`}>
                <div>
                  <span className={editMode ? 'text-orange-700' : 'text-blue-700'}>Original Trip:</span>
                  <div className={`font-medium ${editMode ? 'text-orange-900' : 'text-blue-900'}`}>{trip?.tripId}</div>
                </div>
                {editMode && editTransfer && (
                  <div>
                    <span className="text-orange-700">Transferred To:</span>
                    <div className="font-medium text-orange-900">
                      {editTransfer.transferredToSupervisor?.name || 'N/A'}
                    </div>
                  </div>
                )}
                <div>
                  <span className={editMode ? 'text-orange-700' : 'text-blue-700'}>Available Birds:</span>
                  <div className={`font-medium ${editMode ? 'text-orange-900' : 'text-blue-900'}`}>{remainingBirds} birds</div>
                </div>
                <div>
                  <span className={editMode ? 'text-orange-700' : 'text-blue-700'}>Available Weight:</span>
                  <div className={`font-medium ${editMode ? 'text-orange-900' : 'text-blue-900'}`}>{remainingWeight.toFixed(2)} kg</div>
                </div>
                {!editMode && (
                  <div>
                    <span className="text-blue-700">Purchase Rate:</span>
                    <div className="font-medium text-blue-900">₹{avgPurchaseRate.toFixed(2)}/kg</div>
                  </div>
                )}
              </div>
              {editMode ? (
                <div className="bg-white border-l-4 border-orange-500 p-3 text-sm text-orange-800">
                  <strong>Note:</strong> Changes to birds, weight, and rate will automatically sync to the receiving supervisor's trip purchase record.
                </div>
              ) : (
                <div className="bg-white border-l-4 border-blue-500 p-3 text-sm text-blue-800">
                  <strong>Note:</strong> After transfer, the <strong>receiving supervisor</strong> will need to complete the trip details including driver, labour workers, odometer reading, and route locations for their new trip.
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-4">
              {/* Supervisor Selection — create mode only */}
              {!editMode && (
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
              )}

              {/* Vehicle Selection — create mode only */}
              {!editMode && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Truck size={16} className="inline mr-1" />
                    Assign Vehicle for New Trip *
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
                  <p className="text-xs text-gray-500 mt-1">The receiving supervisor will provide driver and team details</p>
                </div>
              )}

              {/* Edit mode: show fixed supervisor info */}
              {editMode && editTransfer && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-700 mb-2">Fixed Transfer Details</h4>
                  <div className="text-sm space-y-1">
                    <div>
                      <span className="text-gray-500">Transferred To:</span>
                      <div className="font-medium text-gray-900">{editTransfer.transferredToSupervisor?.name || 'N/A'}</div>
                    </div>
                    <div>
                      <span className="text-gray-500">Receiver Trip:</span>
                      <div className="font-medium text-gray-900">{editTransfer.transferredTo?.tripId || 'N/A'}</div>
                    </div>
                    <div>
                      <span className="text-gray-500">Transfer Date:</span>
                      <div className="font-medium text-gray-900">
                        {new Date(editTransfer.transferredAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Transfer Reason */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for Transfer *
                </label>
                <textarea
                  value={formData.reason}
                  onChange={(e) => handleInputChange('reason', e.target.value)}
                  rows={editMode ? 3 : 4}
                  className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.reason ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Explain why you need to transfer this trip (e.g., vehicle breakdown, supervisor availability, route optimization, etc.)"
                  disabled={loading}
                />
                {errors.reason && <p className="text-red-500 text-sm mt-1">{errors.reason}</p>}
              </div>
            </div>

            {/* Right Column — Transfer Birds Details */}
            <div className="space-y-4">
              <div className={`border rounded-lg p-4 ${editMode ? 'bg-orange-50 border-orange-200' : 'bg-green-50 border-green-200'}`}>
                <h4 className={`font-medium mb-3 ${editMode ? 'text-orange-900' : 'text-green-900'}`}>Transfer Birds Details</h4>

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
                    Purchase Rate per kg *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.transferBirds.rate}
                    onChange={(e) => handleNestedChange('transferBirds', 'rate', parseFloat(e.target.value) || 0)}
                    className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.transferRate ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter purchase rate per kg"
                    disabled={loading}
                  />
                  {errors.transferRate && <p className="text-red-500 text-sm mt-1">{errors.transferRate}</p>}
                </div>

                {/* Available for transfer */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                  <h5 className="font-medium text-blue-900 mb-2">Available for Transfer:</h5>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-blue-700">Remaining Birds:</span>
                      <div className="font-medium text-blue-900">{remainingBirds} birds</div>
                    </div>
                    <div>
                      <span className="text-blue-700">Remaining Weight:</span>
                      <div className="font-medium text-blue-900">{remainingWeight.toFixed(2)} kg</div>
                    </div>
                  </div>
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
              className={`px-6 py-2 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${
                editMode
                  ? 'bg-orange-600 hover:bg-orange-700'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              {loading
                ? (editMode ? 'Updating...' : 'Transferring...')
                : (editMode ? 'Update Transfer' : 'Transfer Trip')
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TransferTripModal;