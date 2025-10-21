// src/pages/Customers.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { 
  Plus, 
  Search, 
  Filter, 
  Store, 
  MapPin, 
  Phone, 
  CreditCard,
  Clock,
  Eye,
  EyeOff,
  Edit,
  Trash2,
  TrendingUp,
  Loader2,
  X
} from 'lucide-react';
import api from '../lib/axios';
import { useAuth } from '../contexts/AuthContext';

// Zod Schema for Customer validation
const customerSchema = z.object({
  shopName: z.string()
    .min(2, 'Shop name must be at least 2 characters')
    .max(100, 'Shop name cannot exceed 100 characters'),
  ownerName: z.string()
    .max(100, 'Owner name cannot exceed 100 characters')
    .optional(),
  contact: z.string()
    .min(10, 'Contact number must be at least 10 digits')
    .max(10, 'Contact number must be exactly 10 digits')
    .regex(/^[0-9]{10}$/, 'Contact number must be exactly 10 digits'),
  address: z.string()
    .max(200, 'Address cannot exceed 200 characters')
    .optional(),
  area: z.string()
    .max(100, 'Area name too long')
    .optional(),
  gstOrPanNumber: z.string()
    .max(100, 'GST or PAN number cannot exceed 100 characters')
    .optional(),
  openingBalance: z.number()
    .min(0, 'Opening balance cannot be negative')
    .optional(),
  // Login credentials fields
  email: z.string()
    .email('Invalid email format')
    .min(1, 'Email is required'),
  password: z.string()
    .refine((val) => {
      // Allow empty string for editing (keep current password)
      if (val === '') return true;
      // If not empty, validate password strength
      return val.length >= 6 && /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(val);
    }, 'Password must contain at least one uppercase letter, one lowercase letter, and one number')
});

const getShopTypeColor = (type) => {
  const colors = {
    'Retail': 'bg-blue-100 text-blue-800',
    'Supermarket': 'bg-green-100 text-green-800',
    'Corner Store': 'bg-purple-100 text-purple-800',
    'Wholesale': 'bg-orange-100 text-orange-800'
  };
  return colors[type] || 'bg-gray-100 text-gray-800';
};

const getStatusColor = (isActive) => {
  return isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
};

export default function Customers() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [shopTypeFilter, setShopTypeFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Debug user information
  useEffect(() => {
    console.log('Current user:', user);
    console.log('User role:', user?.role);
  }, [user]);

  // Check if user has admin privileges
  const hasAdminAccess = user?.role === 'admin' || user?.role === 'superadmin';

  // React Hook Form with Zod validation
  const { register, handleSubmit, reset, formState: { errors }, setValue } = useForm({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      shopName: '',
      ownerName: '',
      contact: '',
      address: '',
      area: '',
      gstOrPanNumber: '',
      openingBalance: 0,
      email: '',
      password: ''
    }
  });

  // Fetch customers
  const fetchCustomers = async () => {
    try {
      setIsLoading(true);
      console.log('Fetching customers...');
      const { data } = await api.get('/customer');
      console.log('Customers response:', data);
      setCustomers(data.data || []);
      setIsError(false);
    } catch (err) {
      console.error('Error fetching customers:', err);
      setIsError(true);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  // CRUD operations
  const addCustomer = async (customerData) => {
    try {
      setIsSubmitting(true);
      console.log('Adding customer:', customerData);
      const { data } = await api.post('/customer', customerData);
      console.log('Add customer response:', data);
      setCustomers(prev => [...prev, data.data]);
      setShowAddModal(false);
      setEditingCustomer(null);
      reset();
      // Show success message
      alert('Customer added successfully!');
    } catch (err) {
      console.error('Error adding customer:', err);
      setError(err.message);
      alert(`Error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateCustomer = async ({ id, ...customerData }) => {
    try {
      setIsSubmitting(true);
      console.log('Updating customer:', { id, ...customerData });
      const { data } = await api.put(`/customer/admin/${id}`, customerData);
      console.log('Update customer response:', data);
      setCustomers(prev => prev.map(c => c.id === id ? data.data : c));
      setShowAddModal(false);
      setEditingCustomer(null);
      reset();
      // Show success message
      alert('Customer updated successfully!');
    } catch (err) {
      console.error('Error updating customer:', err);
      setError(err.message);
      alert(`Error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteCustomer = async (id) => {
    try {
      console.log('Deleting customer:', id);
      await api.delete(`/customer/admin/${id}`);
      console.log('Customer deleted successfully');
      setCustomers(prev => prev.filter(c => c.id !== id));
      // Show success message
      alert('Customer deleted successfully!');
    } catch (err) {
      console.error('Error deleting customer:', err);
      setError(err.message);
      alert(`Error: ${err.message}`);
    }
  };

  const fetchCustomerById = async (id) => {
    try {
      const { data } = await api.get(`/customer/admin/${id}`);
      return data.data;
    } catch (err) {
      setError(err.message);
      return null;
    }
  };

  const handleEdit = async (customer) => {
    setEditingCustomer(customer);
    // Pre-fill form with customer data
    setValue('shopName', customer.shopName || '');
    setValue('ownerName', customer.ownerName || '');
    // Remove +91 prefix for editing (show only 10 digits)
    const contactNumber = customer.contact?.startsWith('+91') 
      ? customer.contact.substring(3) 
      : customer.contact || '';
    setValue('contact', contactNumber);
    setValue('address', customer.address || '');
    setValue('area', customer.area || '');
    setValue('gstOrPanNumber', customer.gstOrPanNumber || '');
    setValue('openingBalance', customer.openingBalance || 0);
    // Pre-fill user credentials if available
    if (customer.user) {
      setValue('email', customer.user.email || '');
      setValue('password', ''); // Don't pre-fill password for security
    }
    setShowAddModal(true);
    setShowPassword(false);
  };

  const handleDelete = async (customer) => {
    if (window.confirm(`Are you sure you want to delete ${customer.shopName}?`)) {
      await deleteCustomer(customer.id);
    }
  };

  const handleView = (customer) => {
    navigate(`/customers/${customer.id}`);
  };

  const onSubmit = (data) => {
    // Add +91 prefix to contact number
    const customerData = {
      ...data,
      contact: `+91${data.contact}`
    };
    
    // For editing, remove password if it's empty (keep current password)
    if (editingCustomer && !data.password) {
      delete customerData.password;
    }
    
    if (editingCustomer) {
      updateCustomer({ id: editingCustomer.id, ...customerData });
    } else {
      addCustomer(customerData);
    }
  };

  const handleAddNew = () => {
    setEditingCustomer(null);
    reset();
    setShowAddModal(true);
    setShowPassword(false);
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setEditingCustomer(null);
    reset();
    setError('');
    setShowPassword(false);
  };

  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = customer.shopName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         customer.ownerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         customer.contact.includes(searchTerm) ||
                         customer.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         customer.gstOrPanNumber?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'active' && customer.isActive) ||
                         (statusFilter === 'inactive' && !customer.isActive);
    const matchesType = shopTypeFilter === 'all' || customer.shopType === shopTypeFilter;
    return matchesSearch && matchesStatus && matchesType;
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
          onClick={fetchCustomers}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!hasAdminAccess) {
    return (
      <div className="text-center py-8">
        <h2 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h2>
        <p className="text-gray-600 mb-4">
          You need admin privileges to access the Customers Management page.
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
          <h1 className="text-3xl font-bold text-gray-900">Customers Management</h1>
          <p className="text-gray-600 mt-1">Manage your poultry customers and retail partners</p>
        </div>
        <button onClick={handleAddNew} className="mt-4 sm:mt-0 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2">
          <Plus size={20} />
          Add Customer
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
                placeholder="Search customers by shop name, owner, contact, or address..."
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
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <select
              value={shopTypeFilter}
              onChange={(e) => setShopTypeFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Shop Types</option>
              <option value="Retail">Retail</option>
              <option value="Supermarket">Supermarket</option>
              <option value="Corner Store">Corner Store</option>
              <option value="Wholesale">Wholesale</option>
            </select>
            <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2">
              <Filter size={16} />
              More Filters
            </button>
          </div>
        </div>
      </div>

      {/* Customers Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredCustomers.length === 0 ? (
          <div className="col-span-full text-center py-10 text-gray-600">
            <p>No customers found matching your criteria.</p>
          </div>
        ) : (
          filteredCustomers.map((customer) => (
            <div key={customer.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-all duration-200">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <Store className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{customer.shopName}</h3>
                      {customer.ownerName && (
                        <p className="text-sm text-gray-500">Owner: {customer.ownerName}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => handleView(customer)}
                      className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                    >
                      <Eye size={16} />
                    </button>
                    <button 
                      onClick={() => handleEdit(customer)}
                      className="p-1 text-gray-400 hover:text-green-600 transition-colors"
                    >
                      <Edit size={16} />
                    </button>
                    <button 
                      onClick={() => handleDelete(customer)}
                      className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Contact Info */}
                <div className="space-y-3 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone className="w-4 h-4" />
                    <span>{customer.contact}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPin className="w-4 h-4" />
                    <span>{customer.address}</span>
                  </div>
                  {customer.gstOrPanNumber && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <CreditCard className="w-4 h-4" />
                      <span>GST/PAN: {customer.gstOrPanNumber}</span>
                    </div>
                  )}
                </div>

                {/* Shop Type and Credit Info */}
                <div className="space-y-3 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">Area:</span>
                    <span className="text-sm font-medium text-gray-900">
                      {customer.area || 'Not specified'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">Status:</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(customer.isActive)}`}>
                      {customer.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>

                {/* Business Stats */}
                <div className="space-y-3 mb-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Created:</span>
                    <span className="font-medium text-gray-900">
                      {new Date(customer.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Last Updated:</span>
                    <span className="font-medium text-gray-900">
                      {new Date(customer.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Status and Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(customer.isActive)}`}>
                    {customer.isActive ? 'Active' : 'Inactive'}
                  </span>
                  <button onClick={() => handleView(customer)} className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                    View Details
                  </button>
                </div>
              </div>
            )
          )
        )}
      </div>

      {/* Summary Stats */}
      {/* <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-500">Total Customers</div>
          <div className="text-2xl font-bold text-gray-900">{filteredCustomers.length}</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-500">Active Customers</div>
          <div className="text-2xl font-bold text-green-600">
            {filteredCustomers.filter(c => c.isActive).length}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-500">Inactive Customers</div>
          <div className="text-2xl font-bold text-red-600">
            {filteredCustomers.filter(c => !c.isActive).length}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-500">With Area Info</div>
          <div className="text-2xl font-bold text-blue-600">
            {filteredCustomers.filter(c => c.area).length}
          </div>
        </div>
      </div> */}

      {/* Customer Form Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Shop Name *
                  </label>
                  <input
                    type="text"
                    {...register('shopName')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {errors.shopName && <p className="text-red-500 text-xs mt-1">{errors.shopName.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Owner Name
                  </label>
                  <input
                    type="text"
                    {...register('ownerName')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {errors.ownerName && <p className="text-red-500 text-xs mt-1">{errors.ownerName.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contact Number *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">+91</span>
                    </div>
                    <input
                      type="tel"
                      {...register('contact')}
                      placeholder="Enter 10-digit mobile number"
                      maxLength="10"
                      className="w-full pl-12 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  {errors.contact && <p className="text-red-500 text-xs mt-1">{errors.contact.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Area
                  </label>
                  <input
                    type="text"
                    {...register('area')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {errors.area && <p className="text-red-500 text-xs mt-1">{errors.area.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    GST/PAN Number
                  </label>
                  <input
                    type="text"
                    {...register('gstOrPanNumber')}
                    placeholder="Enter GST or PAN number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {errors.gstOrPanNumber && <p className="text-red-500 text-xs mt-1">{errors.gstOrPanNumber.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Opening Balance (₹)
                  </label>
                  <input
                    type="number"
                    {...register('openingBalance', { valueAsNumber: true })}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {errors.openingBalance && <p className="text-red-500 text-xs mt-1">{errors.openingBalance.message}</p>}
                  <p className="text-xs text-gray-500 mt-1">
                    Customer's initial outstanding balance
                  </p>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Address
                  </label>
                  <input
                    type="text"
                    {...register('address')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address.message}</p>}
                </div>
              </div>

              {/* Login Credentials Section */}
              <div className="border-t pt-6 mt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Login Credentials</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      {...register('email')}
                      placeholder="customer@example.com"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Password *
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        {...register('password')}
                        placeholder={editingCustomer ? "Leave blank to keep current password" : "Enter password"}
                        className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                    {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
                    <p className="text-xs text-gray-500 mt-1">
                      Password must contain at least one uppercase letter, one lowercase letter, and one number
                    </p>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Login Info:</strong> Customer can login using their email address or mobile number (+91{editingCustomer ? 'XXXXXXXXXX' : 'contact number'}) along with the password.
                  </p>
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
                  {editingCustomer ? 'Update Customer' : 'Add Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}