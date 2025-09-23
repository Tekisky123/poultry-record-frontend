// src/pages/Trips.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Truck, 
  MapPin, 
  Calendar, 
  DollarSign,
  Eye,
  Edit,
  Trash2,
  Loader2,
  X,
  Users,
  Fuel,
  Receipt,
  ShoppingCart,
  TrendingUp
} from 'lucide-react';
import api from '../lib/axios';
import { useAuth } from '../contexts/AuthContext';

// Zod Schema for Trip validation - will be updated dynamically based on user role
const createTripSchema = (userRole) => z.object({
  place: z.string()
    .min(2, 'Place must be at least 2 characters')
    .max(50, 'Place cannot exceed 50 characters'),
  vehicle: z.string().min(1, 'Vehicle is required'),
  supervisor: userRole === 'admin' || userRole === 'superadmin' 
    ? z.string().min(1, 'Supervisor is required')
    : z.string().optional(),
  driver: z.string()
    .min(2, 'Driver name must be at least 2 characters')
    .max(50, 'Driver name cannot exceed 50 characters'),
  labours: z.array(z.string())
    .min(1, 'At least one labour is required'),
  route: z.object({
    from: z.string().optional(),
    to: z.string().optional(),
    distance: z.number().optional()
  }).optional(),
  vehicleReadings: z.object({
    opening: z.number().min(0, 'Opening reading must be positive')
  })
});

const getStatusColor = (status) => {
  const colors = {
    completed: 'bg-green-100 text-green-800',
    ongoing: 'bg-blue-100 text-blue-800',
    started: 'bg-yellow-100 text-yellow-800'
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
};

const getStatusText = (status) => {
  const texts = {
    completed: 'Completed',
    ongoing: 'In Progress',
    started: 'Started'
  };
  return texts[status] || status;
};

export default function Trips() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [trips, setTrips] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [vehicleFilter, setVehicleFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTrip, setEditingTrip] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Debug user information
  useEffect(() => {
    console.log('Current user:', user);
    console.log('User role:', user?.role);
  }, [user]);

  // Check if user has access
  const hasAccess = user?.role === 'admin' || user?.role === 'superadmin' || user?.role === 'supervisor';
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';
  const isSupervisor = user?.role === 'supervisor';
  const canCreateTrip = user?.role === 'supervisor';

  // React Hook Form with Zod validation
  const { register, handleSubmit, reset, formState: { errors }, setValue, watch } = useForm({
    resolver: zodResolver(createTripSchema(user?.role)),
    defaultValues: {
      place: '',
      vehicle: '',
      supervisor: user?.role === 'supervisor' ? user?.id : '',
      driver: '',
      labours: [''],
      route: {
        from: '',
        to: '',
        distance: 0
      },
      vehicleReadings: {
        opening: 0
      }
    }
  });

  // Watch labours array for dynamic form
  const labours = watch('labours');

  // Fetch trips
  const fetchTrips = async () => {
    try {
      setIsLoading(true);
      console.log('Fetching trips...');
      const { data } = await api.get('/trip');
      console.log('Trips response:', data);
      setTrips(data.data?.trips || data.data || data.trips || []);
      setIsError(false);
    } catch (err) {
      console.error('Error fetching trips:', err);
      setIsError(true);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch vehicles and supervisors for form
  const fetchFormData = async () => {
    try {
      if (isAdmin) {
        const [vehiclesRes, supervisorsRes] = await Promise.all([
          api.get('/vehicle'),
          api.get('/user?role=supervisor')
        ]);
        setVehicles(vehiclesRes.data.data || []);
        setSupervisors(supervisorsRes.data.data || []);
      } else if (isSupervisor) {
        const vehiclesRes = await api.get('/vehicle');
        setVehicles(vehiclesRes.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching form data:', err);
    }
  };

  useEffect(() => {
    fetchTrips();
    fetchFormData();
  }, [user?.role]);

  // Update form when user changes
  useEffect(() => {
    if (user?.role) {
      console.log('User role changed, updating form defaults');
      reset({
        place: '',
        vehicle: '',
        supervisor: user?.role === 'supervisor' ? user?.id : '',
        driver: '',
        labours: [''],
        route: { from: '', to: '', distance: 0 },
        vehicleReadings: { opening: 0 }
      });
    }
  }, [user?.role, user?.id, reset]);

  // CRUD operations
  const addTrip = async (tripData) => {
    try {
      setIsSubmitting(true);
      console.log('Adding trip:', tripData);
      console.log('Supervisor field value:', tripData.supervisor);
      console.log('Supervisor field type:', typeof tripData.supervisor);
      const { data } = await api.post('/trip', tripData);
      console.log('Add trip response:', data);
      setTrips(prev => [...prev, data.data]);
      setShowAddModal(false);
      setEditingTrip(null);
      reset();
      alert('Trip created successfully!');
    } catch (err) {
      console.error('Error adding trip:', err);
      setError(err.message);
      alert(`Error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateTrip = async ({ id, ...tripData }) => {
    try {
      setIsSubmitting(true);
      console.log('Updating trip:', { id, ...tripData });
      const { data } = await api.put(`/trip/${id}`, tripData);
      console.log('Update trip response:', data);
      setTrips(prev => prev.map(t => t.id === id ? data.data : t));
      setShowAddModal(false);
      setEditingTrip(null);
      reset();
      alert('Trip updated successfully!');
    } catch (err) {
      console.error('Error updating trip:', err);
      setError(err.message);
      alert(`Error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteTrip = async (id) => {
    try {
      console.log('Deleting trip:', id);
      await api.delete(`/trip/${id}`);
      console.log('Trip deleted successfully');
      setTrips(prev => prev.filter(t => t.id !== id));
      alert('Trip deleted successfully!');
    } catch (err) {
      console.error('Error deleting trip:', err);
      setError(err.message);
      alert(`Error: ${err.message}`);
    }
  };

  const handleEdit = async (trip) => {
    setEditingTrip(trip);
    setValue('place', trip.place || '');
    setValue('vehicle', trip.vehicle?.id || trip.vehicle || '');
    setValue('supervisor', trip.supervisor?.id || trip.supervisor || '');
    setValue('driver', trip.driver || '');
    setValue('labours', trip.labours || ['']);
    setValue('route.from', trip.route?.from || '');
    setValue('route.to', trip.route?.to || '');
    setValue('route.distance', trip.route?.distance || 0);
    setValue('vehicleReadings.opening', trip.vehicleReadings?.opening || 0);
    setShowAddModal(true);
  };

  const handleDelete = async (trip) => {
    if (window.confirm(`Are you sure you want to delete trip ${trip.tripId}?`)) {
      await deleteTrip(trip.id);
    }
  };

  const handleView = async (trip) => {
    // Navigate to trip details page using React Router
    navigate(`/trips/${trip.id}`);
  };

  const onSubmit = (data) => {
    console.log('Form data being submitted:', data);
    
    // Ensure supervisor field is set for supervisors
    if (user?.role === 'supervisor') {
      data.supervisor = user.id;
    }
    
    console.log('Final form data after processing:', data);
    
    if (editingTrip) {
      updateTrip({ id: editingTrip.id, ...data });
    } else {
      addTrip(data);
    }
  };

  const handleAddNew = () => {
    setEditingTrip(null);
    const defaultValues = {
      place: '',
      vehicle: '',
      supervisor: user?.role === 'supervisor' ? user?.id : '',
      driver: '',
      labours: [''],
      route: { from: '', to: '', distance: 0 },
      vehicleReadings: { opening: 0 }
    };
    console.log('Setting default values:', defaultValues);
    reset(defaultValues);
    setShowAddModal(true);
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setEditingTrip(null);
    reset();
    setError('');
  };

  const addLabourField = () => {
    setValue('labours', [...labours, '']);
  };

  const removeLabourField = (index) => {
    if (labours.length > 1) {
      const newLabours = labours.filter((_, i) => i !== index);
      setValue('labours', newLabours);
    }
  };

  const filteredTrips = trips.filter(trip => {
    const matchesSearch = trip.tripId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         trip.vehicle?.vehicleNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         trip.supervisor?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || trip.status === statusFilter;
    const matchesVehicle = vehicleFilter === 'all' || trip.vehicle?.id === vehicleFilter;
    return matchesSearch && matchesStatus && matchesVehicle;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 mb-4">{error}</p>
        <button 
          onClick={fetchTrips}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="text-center py-8">
        <h2 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h2>
        <p className="text-gray-600 mb-4">
          {user?.role === 'customer' 
            ? 'Customers cannot access trip information.' 
            : 'You need appropriate privileges to access the Trips Management page.'
          }
        </p>
        <p className="text-sm text-gray-500">
          Current role: {user?.role || 'Not logged in'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                 <div>
           <h1 className="text-3xl font-bold text-gray-900">Trips Management</h1>
           <p className="text-gray-600 mt-1">
             {isSupervisor 
               ? 'Create and manage your poultry transportation trips' 
               : 'View and track all poultry transportation trips (read-only access)'
             }
           </p>
           
           {/* Access level info */}
           {isAdmin && !isSupervisor && (
             <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
               <p className="text-sm text-blue-700">
                 <strong>Note:</strong> As an admin, you can view and manage trip details but cannot create new trips. 
                 Only supervisors can create new trips.
               </p>
             </div>
           )}
        </div>
                 {canCreateTrip && (
           <button 
             onClick={handleAddNew}
             className="mt-4 sm:mt-0 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
           >
             <Plus size={20} />
             New Trip
           </button>
         )}
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search trips by ID, vehicle, or supervisor..."
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
              <option value="started">Started</option>
              <option value="ongoing">Ongoing</option>
              <option value="completed">Completed</option>
            </select>
            <select
              value={vehicleFilter}
              onChange={(e) => setVehicleFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Vehicles</option>
              {vehicles.map(vehicle => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.vehicleNumber}
                </option>
              ))}
            </select>
            <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2">
              <Filter size={16} />
              More Filters
            </button>
          </div>
        </div>
      </div>

      {/* Trips Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trip Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Route
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Team
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Financial Summary
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTrips.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-10 text-center text-gray-500">
                    No trips found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredTrips.map((trip) => (
                  <tr key={trip.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Truck className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{trip.vehicle?.vehicleNumber || 'N/A'}</div>
                          <div className="text-sm text-gray-500">{trip.tripId}</div>
                          <div className="text-sm text-gray-400">
                            {new Date(trip.date).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <div className="text-sm">
                          <div className="text-gray-900">{trip.place}</div>
                          {trip.route?.from && trip.route?.to && (
                            <div className="text-gray-500">{trip.route.from} → {trip.route.to}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <div className="text-gray-900">Sup: {trip.supervisor?.name || 'N/A'}</div>
                        <div className="text-gray-500">Driver: {trip.driver}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <div className="text-gray-900 font-medium">
                          ₹{trip.summary?.netProfit?.toLocaleString() || '0'}
                        </div>
                        <div className="text-gray-500">
                          {trip.summary?.totalBirdsSold || 0} birds sold
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(trip.status)}`}>
                        {getStatusText(trip.status)}
                      </span>
                    </td>
                                         <td className="px-6 py-4">
                       <div className="flex items-center gap-2">
                         <button 
                           onClick={() => handleView(trip)}
                           className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                           title="View trip details"
                         >
                           <Eye size={16} />
                         </button>
                         {isAdmin && (
                           <button 
                             onClick={() => handleEdit(trip)}
                             className="p-1 text-gray-400 hover:text-green-600 transition-colors"
                             title="Edit trip (Admin only)"
                           >
                             <Edit size={16} />
                           </button>
                         )}
                         {isAdmin && (
                           <button 
                             onClick={() => handleDelete(trip)}
                             className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                             title="Delete trip (Admin only)"
                           >
                             <Trash2 size={16} />
                           </button>
                         )}
                       </div>
                     </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary Stats */}
      {/* <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-500">Total Trips</div>
          <div className="text-2xl font-bold text-gray-900">{filteredTrips.length}</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-500">Total Revenue</div>
          <div className="text-2xl font-bold text-green-600">
            ₹{filteredTrips.reduce((sum, trip) => sum + (trip.summary?.totalSalesAmount || 0), 0).toLocaleString()}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-500">Total Profit</div>
          <div className="text-2xl font-bold text-blue-600">
            ₹{filteredTrips.reduce((sum, trip) => sum + (trip.summary?.netProfit || 0), 0).toLocaleString()}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-500">Birds Sold</div>
          <div className="text-2xl font-bold text-purple-600">
            {filteredTrips.reduce((sum, trip) => sum + (trip.summary?.totalBirdsSold || 0), 0).toLocaleString()}
          </div>
        </div>
      </div> */}

      {/* Trip Form Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingTrip ? 'Edit Trip' : 'Create New Trip'}
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Place *
                  </label>
                  <input
                    type="text"
                    {...register('place')}
                    placeholder="e.g., SNK"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {errors.place && <p className="text-red-500 text-xs mt-1">{errors.place.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Vehicle *
                  </label>
                  <select
                    {...register('vehicle')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select Vehicle</option>
                    {vehicles.map(vehicle => (
                      <option key={vehicle.id} value={vehicle.id}>
                        {vehicle.vehicleNumber} - {vehicle.type}
                      </option>
                    ))}
                  </select>
                  {errors.vehicle && <p className="text-red-500 text-xs mt-1">{errors.vehicle.message}</p>}
                </div>

                {/* Always include supervisor field but hide for supervisors */}
                <div className={isAdmin ? '' : 'hidden'}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Supervisor *
                  </label>
                  <select
                    {...register('supervisor')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    onChange={(e) => console.log('Supervisor selected:', e.target.value)}
                  >
                    <option value="">Select Supervisor</option>
                    {supervisors.map(supervisor => (
                      <option key={supervisor.id} value={supervisor.id}>
                        {supervisor.name}
                      </option>
                    ))}
                  </select>
                  {errors.supervisor && <p className="text-red-500 text-xs mt-1">{errors.supervisor.message}</p>}
                </div>
                
                {/* Hidden supervisor field for supervisors */}
                {user?.role === 'supervisor' && (
                  <input
                    type="hidden"
                    {...register('supervisor')}
                    value={user?.id}
                  />
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Driver Name *
                  </label>
                  <input
                    type="text"
                    {...register('driver')}
                    placeholder="e.g., ALLABAKSH"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {errors.driver && <p className="text-red-500 text-xs mt-1">{errors.driver.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Opening Odometer *
                  </label>
                  <input
                    type="number"
                    {...register('vehicleReadings.opening', { valueAsNumber: true })}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {errors.vehicleReadings?.opening && <p className="text-red-500 text-xs mt-1">{errors.vehicleReadings.opening.message}</p>}
                </div>
              </div>

              {/* Labours Section */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Labours *
                </label>
                <div className="space-y-2">
                  {labours.map((_, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        {...register(`labours.${index}`)}
                        placeholder={`Labour ${index + 1} name`}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      {labours.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeLabourField(index)}
                          className="px-3 py-2 text-red-600 hover:text-red-800"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addLabourField}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    + Add Labour
                  </button>
                </div>
                {errors.labours && <p className="text-red-500 text-xs mt-1">{errors.labours.message}</p>}
              </div>

              {/* Route Section */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    From
                  </label>
                  <input
                    type="text"
                    {...register('route.from')}
                    placeholder="Starting point"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    To
                  </label>
                  <input
                    type="text"
                    {...register('route.to')}
                    placeholder="Destination"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Distance (km)
                  </label>
                  <input
                    type="number"
                    {...register('route.distance', { valueAsNumber: true })}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingTrip ? 'Update Trip' : 'Create Trip'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}