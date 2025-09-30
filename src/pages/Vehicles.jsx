import { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { set, useForm } from 'react-hook-form';
import { z } from 'zod';
import axios from 'axios';
import {
  Plus, Search, Eye, Edit, Trash2, X, Loader2
} from 'lucide-react';
import api from '../lib/axios';

// Zod Schema for Vehicle
const vehicleSchema = z.object({
  vehicleNumber: z.string()
    .min(2, 'Vehicle number too short')
    .max(50, 'Vehicle number too long')
    .regex(/^[A-Z0-9-\s]+$/, 'Invalid vehicle number format'),
  type: z.enum(["pickup", "mini-truck", "truck", "tempo", "container", "trailer"], {
    required_error: "Type is required",
  }),
  fuelType: z.enum(["diesel", "petrol", "cng", "electric"], {
    required_error: "Fuel type is required",
  }),
  insuranceEndDate: z.string().min(1, "Insurance end date is required"),
  pucEndDate: z.string().min(1, "PUC end date is required"),
  roadTaxEndDate: z.string().min(1, "Road tax end date is required"),
  fitnessEndDate: z.string().min(1, "Fitness end date is required"),
  nationalPermitEndDate: z.string().min(1, "National permit end date is required"),
  rentPerKm: z.number().min(0, "Rent per KM cannot be negative"),
  currentStatus: z.enum(["idle", "in-transit", "maintenance"], {
    required_error: "Status is required",
  }).default("idle"),
  location: z.object({
    type: z.literal("Point").default("Point"),
    coordinates: z.array(z.number()).length(2, "Coordinates must be [longitude, latitude]").default([0, 0]),
  }).default({ type: "Point", coordinates: [0, 0] }),
});

// Helper functions for UI
const getVehicleTypeColor = (type) => {
  const colors = {
    'truck': 'bg-blue-100 text-blue-800',
    'mini-truck': 'bg-green-100 text-green-800',
    'container': 'bg-purple-100 text-purple-800',
    'pickup': 'bg-orange-100 text-orange-800',
    'tempo': 'bg-red-100 text-red-800',
    'trailer': 'bg-indigo-100 text-indigo-800'
  };
  return colors[type] || 'bg-gray-100 text-gray-800';
};

const getStatusColor = (status) => {
  const colors = {
    'idle': 'bg-gray-100 text-gray-800',
    'in-transit': 'bg-blue-100 text-blue-800',
    'maintenance': 'bg-red-100 text-red-800'
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
};

const getFuelTypeColor = (type) => {
  const colors = {
    'diesel': 'bg-blue-100 text-blue-800',
    'petrol': 'bg-green-100 text-green-800',
    'cng': 'bg-purple-100 text-purple-800',
    'electric': 'bg-emerald-100 text-emerald-800'
  };
  return colors[type] || 'bg-gray-100 text-gray-800';
};

export default function Vehicles() {
  const [vehicles, setVehicles] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch vehicles
  const fetchVehicles = async () => {
    try {
      setIsLoading(true);
      const { data } = await api.get('/vehicle');
      setVehicles(data.data || []);
      setIsError(false);
    } catch (err) {
      setIsError(true);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  // CRUD operations
  const addVehicle = async (vehicle) => {
    try {
      setIsSubmitting(true);
      const { data } = await api.post('/vehicle', vehicle);
      setVehicles(prev => [...prev, data.data]);
      setShowAddModal(false);
      reset();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateVehicle = async ({ id, ...vehicle }) => {
    try {
      setIsSubmitting(true);
      const { data } = await api.put(`/vehicle/${id}`, vehicle);
      setVehicles(prev => prev.map(v => v.id === id ? data.data : v));
      setShowAddModal(false);
      reset();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteVehicle = async (id) => {
    try {
      await api.delete(`/vehicle/${id}`);
      setVehicles(prev => prev.filter(v => v.id !== id));
    } catch (err) {
      setError(err.message);
    }
  };

  const fetchVehicleById = async (id) => {
    const { data } = await api.get(`/vehicle/${id}`);
    const vehicle = data.data;
    
    // Format dates for HTML date inputs (YYYY-MM-DD format)
    const formatDateForInput = (dateString) => {
      if (!dateString) return '';
      const date = new Date(dateString);
      return date.toISOString().split('T')[0];
    };
    
    return {
      ...vehicle,
      insuranceEndDate: formatDateForInput(vehicle.insuranceEndDate),
      pucEndDate: formatDateForInput(vehicle.pucEndDate),
      roadTaxEndDate: formatDateForInput(vehicle.roadTaxEndDate),
      fitnessEndDate: formatDateForInput(vehicle.fitnessEndDate),
      nationalPermitEndDate: formatDateForInput(vehicle.nationalPermitEndDate),
    };
  };

  const defaultFormValues = {
    vehicleNumber: '',
    type: 'truck',
    fuelType: 'diesel',
    insuranceEndDate: '',
    pucEndDate: '',
    roadTaxEndDate: '',
    fitnessEndDate: '',
    nationalPermitEndDate: '',
    rentPerKm: 0,
    currentStatus: 'idle',
    location: { type: 'Point', coordinates: [0, 0] },
  };
  // React Hook Form with Zod validation
  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(vehicleSchema),
    defaultValues: defaultFormValues ,
  });

  useEffect(() => {
    if (editingVehicle) {
      reset(editingVehicle);
    }
  }, [editingVehicle, reset]);

  // Filter vehicles
  const filteredVehicles = vehicles.filter(vehicle => {
    const matchesSearch = vehicle.vehicleNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || vehicle.currentStatus === statusFilter;
    const matchesType = typeFilter === 'all' || vehicle.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  // Handle form submission
  const onSubmit = (data) => {
    // Convert date strings to proper Date objects for backend
    const formattedData = {
      ...data,
      insuranceEndDate: data.insuranceEndDate ? new Date(data.insuranceEndDate) : null,
      pucEndDate: data.pucEndDate ? new Date(data.pucEndDate) : null,
      roadTaxEndDate: data.roadTaxEndDate ? new Date(data.roadTaxEndDate) : null,
      fitnessEndDate: data.fitnessEndDate ? new Date(data.fitnessEndDate) : null,
      nationalPermitEndDate: data.nationalPermitEndDate ? new Date(data.nationalPermitEndDate) : null,
    };
    
    if (editingVehicle) {
      updateVehicle({ id: editingVehicle.id, ...formattedData });
    } else {
      addVehicle(formattedData);
    }
  };

  // Open modal for editing
  const handleEdit = async (vehicle) => {
    const vehicleData = await fetchVehicleById(vehicle.id);
    setEditingVehicle(vehicleData);
    setShowAddModal(true);
  };

  // Open modal for adding
  const handleAdd = () => {
    setEditingVehicle(null);
    reset(defaultFormValues)
    setShowAddModal(true);
  };

  if (isLoading) return <div className="p-6 text-center">Loading...</div>;
  if (isError) return <div className="p-6 text-center text-red-600">Error: {error}</div>;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Vehicles Management</h1>
          <p className="text-gray-600 mt-1">Manage your poultry transportation fleet</p>
        </div>
        <button
          onClick={handleAdd}
          className="mt-4 sm:mt-0 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
        >
          <Plus size={20} /> Add Vehicle
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search vehicles by number or type..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="idle">Idle</option>
              <option value="in-transit">In Transit</option>
              <option value="maintenance">Maintenance</option>
            </select>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Types</option>
              <option value="truck">Truck</option>
              <option value="mini-truck">Mini Truck</option>
              <option value="container">Container</option>
              <option value="pickup">Pickup</option>
              <option value="tempo">Tempo</option>
              <option value="trailer">Trailer</option>
            </select>
          </div>
        </div>
      </div>

      {/* Vehicles Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehicle Number</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fuel</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rent/KM</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Insurance</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredVehicles.map((vehicle) => (
              <tr key={vehicle.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{vehicle.vehicleNumber}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getVehicleTypeColor(vehicle.type)}`}>
                    {vehicle.type.replace('-', ' ')}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getFuelTypeColor(vehicle.fuelType)}`}>
                    {vehicle.fuelType}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">₹{vehicle.rentPerKm?.toFixed(2) || '0.00'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    vehicle.insuranceEndDate && new Date(vehicle.insuranceEndDate) < new Date() 
                      ? 'bg-red-100 text-red-800' 
                      : vehicle.insuranceEndDate && new Date(vehicle.insuranceEndDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-green-100 text-green-800'
                  }`}>
                    {vehicle.insuranceEndDate ? new Date(vehicle.insuranceEndDate).toLocaleDateString() : 'N/A'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(vehicle.currentStatus)}`}>
                    {vehicle.currentStatus.replace('-', ' ')}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium flex gap-2">
                  <button className="text-blue-600 hover:text-blue-900">
                    <Eye size={18} />
                  </button>
                  <button
                    onClick={() => handleEdit(vehicle)}
                    className="text-green-600 hover:text-green-900"
                  >
                    <Edit size={18} />
                  </button>
                  <button
                    onClick={() => deleteVehicle(vehicle.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                {editingVehicle ? 'Edit Vehicle' : 'Add New Vehicle'}
              </h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Vehicle Number</label>
                  <input
                    {...register('vehicleNumber')}
                    className="mt-1 block w-full border border-gray-300 rounded-lg shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {errors.vehicleNumber && <p className="mt-1 text-sm text-red-600">{errors.vehicleNumber.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Type</label>
                  <select
                    {...register('type')}
                    className="mt-1 block w-full border border-gray-300 rounded-lg shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="truck">Truck</option>
                    <option value="mini-truck">Mini Truck</option>
                    <option value="container">Container</option>
                    <option value="pickup">Pickup</option>
                    <option value="tempo">Tempo</option>
                    <option value="trailer">Trailer</option>
                  </select>
                  {errors.type && <p className="mt-1 text-sm text-red-600">{errors.type.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Fuel Type</label>
                  <select
                    {...register('fuelType')}
                    className="mt-1 block w-full border border-gray-300 rounded-lg shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="diesel">Diesel</option>
                    <option value="petrol">Petrol</option>
                    <option value="cng">CNG</option>
                    <option value="electric">Electric</option>
                  </select>
                  {errors.fuelType && <p className="mt-1 text-sm text-red-600">{errors.fuelType.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <select
                    {...register('currentStatus')}
                    className="mt-1 block w-full border border-gray-300 rounded-lg shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="idle">Idle</option>
                    <option value="in-transit">In Transit</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                  {errors.currentStatus && <p className="mt-1 text-sm text-red-600">{errors.currentStatus.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Insurance End Date</label>
                  <input
                    type="date"
                    {...register('insuranceEndDate')}
                    className="mt-1 block w-full border border-gray-300 rounded-lg shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {errors.insuranceEndDate && <p className="mt-1 text-sm text-red-600">{errors.insuranceEndDate.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">PUC End Date</label>
                  <input
                    type="date"
                    {...register('pucEndDate')}
                    className="mt-1 block w-full border border-gray-300 rounded-lg shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {errors.pucEndDate && <p className="mt-1 text-sm text-red-600">{errors.pucEndDate.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Road Tax End Date</label>
                  <input
                    type="date"
                    {...register('roadTaxEndDate')}
                    className="mt-1 block w-full border border-gray-300 rounded-lg shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {errors.roadTaxEndDate && <p className="mt-1 text-sm text-red-600">{errors.roadTaxEndDate.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Fitness End Date</label>
                  <input
                    type="date"
                    {...register('fitnessEndDate')}
                    className="mt-1 block w-full border border-gray-300 rounded-lg shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {errors.fitnessEndDate && <p className="mt-1 text-sm text-red-600">{errors.fitnessEndDate.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">National Permit End Date</label>
                  <input
                    type="date"
                    {...register('nationalPermitEndDate')}
                    className="mt-1 block w-full border border-gray-300 rounded-lg shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {errors.nationalPermitEndDate && <p className="mt-1 text-sm text-red-600">{errors.nationalPermitEndDate.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Rent Per KM (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    {...register('rentPerKm', { valueAsNumber: true })}
                    className="mt-1 block w-full border border-gray-300 rounded-lg shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {errors.rentPerKm && <p className="mt-1 text-sm text-red-600">{errors.rentPerKm.message}</p>}
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => { setShowAddModal(false); setEditingVehicle(null) }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="animate-spin" size={16} />
                      Saving...
                    </>
                  ) : (
                    editingVehicle ? 'Update' : 'Add'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
