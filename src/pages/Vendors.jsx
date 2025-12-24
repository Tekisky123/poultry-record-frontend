// src/pages/Vendors.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  Plus,
  Search,
  Filter,
  Users,
  MapPin,
  Phone,
  Mail,
  Building,
  Eye,
  Edit,
  Trash2,
  MoreHorizontal,
  Loader2,
  X,
  List,
  Grid3X3,
  LayoutGrid
} from 'lucide-react';
import api from '../lib/axios';
import { useAuth } from '../contexts/AuthContext';

// Zod Schema for Vendor validation
const vendorSchema = z.object({
  vendorName: z.string()
    .min(3, 'Vendor name must be at least 3 characters')
    .max(100, 'Vendor name cannot exceed 100 characters'),
  companyName: z.string()
    .max(150, 'Company name cannot exceed 150 characters')
    .optional(),
  gstNumber: z.string()
    // Make GST validation less strict for testing
    // .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Invalid GST number format')
    .optional(),
  contactNumber: z.string()
    .regex(/^\d{10}$/, 'Contact number must be exactly 10 digits'),
  email: z.string()
    .email('Invalid email address')
    .toLowerCase(),
  address: z.string()
    .max(200, 'Address cannot exceed 200 characters')
    .optional(),
  city: z.string()
    .max(100, 'City name too long')
    .optional(),
  state: z.string()
    .max(100, 'State name too long')
    .optional(),
  postalCode: z.string()
    .regex(/^[0-9A-Z\-\s]+$/, 'Invalid postal code format')
    .optional(),
  country: z.string()
    .max(100, 'Country name too long')
    .optional(),
  defaultPaymentMode: z.enum(['cash', 'credit', 'advance'], {
    required_error: 'Payment mode is required',
  }).default('cash'),
  group: z.string().min(1, 'Group is required'),
  openingBalance: z.number().optional().default(0),
  openingBalanceType: z.enum(['debit', 'credit']).optional().default('credit'),
  tdsApplicable: z.boolean().default(false)
});

const getPaymentModeColor = (mode) => {
  const colors = {
    cash: 'bg-green-100 text-green-800',
    credit: 'bg-blue-100 text-blue-800',
    advance: 'bg-purple-100 text-purple-800'
  };
  return colors[mode] || 'bg-gray-100 text-gray-800';
};

const getStatusColor = (isActive) => {
  return isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
};

export default function Vendors() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [vendors, setVendors] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [viewMode, setViewMode] = useState('table'); // 'table', 'grid-small', 'grid-large'
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [groups, setGroups] = useState([]);
  const [flatGroups, setFlatGroups] = useState([]);

  // Debug user information
  useEffect(() => {
    console.log('Current user:', user);
    console.log('User role:', user?.role);
  }, [user]);

  // Check if user has admin privileges
  const hasAdminAccess = user?.role === 'admin' || user?.role === 'superadmin';

  // React Hook Form with Zod validation
  const { register, handleSubmit, reset, formState: { errors }, setValue } = useForm({
    resolver: zodResolver(vendorSchema),
    defaultValues: {
      vendorName: '',
      companyName: '',
      gstNumber: '',
      contactNumber: '',
      email: '',
      address: '',
      city: '',
      state: '',
      postalCode: '',
      country: '',
      postalCode: '',
      country: '',
      defaultPaymentMode: 'cash',
      openingBalance: 0,
      openingBalanceType: 'credit',
      tdsApplicable: false,
      group: ''
    }
  });

  // Helper function to flatten groups with hierarchy
  const flattenGroups = (groups, level = 0, prefix = '') => {
    let result = [];
    groups.forEach(group => {
      const displayName = prefix + group.name;
      result.push({ ...group, displayName, level });
      if (group.children && group.children.length > 0) {
        result = result.concat(flattenGroups(group.children, level + 1, prefix + '  '));
      }
    });
    return result;
  };

  // Helper function to get all descendants of a group
  const getGroupDescendants = (allGroups, parentGroupName) => {
    // Build tree structure
    const groupMap = new Map();
    const rootGroups = [];
    allGroups.forEach(g => groupMap.set(g.id, { ...g, children: [] }));
    allGroups.forEach(g => {
      const node = groupMap.get(g.id);
      if (g.parentGroup && groupMap.has(g.parentGroup.id)) {
        groupMap.get(g.parentGroup.id).children.push(node);
      } else {
        rootGroups.push(node);
      }
    });

    // Find the parent group by slug or name
    const findGroupByIdentifier = (groups, identifier) => {
      for (const group of groups) {
        if (group.slug === identifier || group.name === identifier) {
          return group;
        }
        if (group.children && group.children.length > 0) {
          const found = findGroupByIdentifier(group.children, identifier);
          if (found) return found;
        }
      }
      return null;
    };

    const parentGroup = findGroupByIdentifier(rootGroups, parentGroupName);
    if (!parentGroup) {
      return [];
    }

    // Get all descendants including the parent itself
    const getAllDescendants = (group) => {
      let result = [group];
      if (group.children && group.children.length > 0) {
        group.children.forEach(child => {
          result = result.concat(getAllDescendants(child));
        });
      }
      return result;
    };

    return getAllDescendants(parentGroup);
  };

  // Fetch vendors and groups
  const fetchVendors = async () => {
    try {
      setIsLoading(true);
      console.log('Fetching vendors...');
      const { data } = await api.get('/vendor');
      setVendors(data.data || []);

      // Fetch groups
      const groupsRes = await api.get('/group');
      const groupsData = groupsRes.data.data || [];
      setGroups(groupsData);

      // Filter groups to show only "Sundry Creditors" and its descendants
      let sundryCreditorsGroups = getGroupDescendants(groupsData, 'sundry-creditors');

      // Fallback to name if slug search returns empty (though slug should exist)
      if (sundryCreditorsGroups.length === 0) {
        sundryCreditorsGroups = getGroupDescendants(groupsData, 'Sundry Creditors');
      }

      // Build tree for filtered groups
      const buildTree = (groups) => {
        const groupMap = new Map();
        const rootGroups = [];
        groups.forEach(g => groupMap.set(g.id, { ...g, children: [] }));
        groups.forEach(g => {
          const node = groupMap.get(g.id);
          if (g.parentGroup && groupMap.has(g.parentGroup.id)) {
            groupMap.get(g.parentGroup.id).children.push(node);
          } else {
            rootGroups.push(node);
          }
        });
        return rootGroups;
      };

      // Filter to only include Sundry Creditors hierarchy
      const filteredGroups = groupsData.filter(g => {
        const allDescendants = sundryCreditorsGroups.map(gr => gr.id);
        return allDescendants.includes(g.id);
      });

      const treeGroups = buildTree(filteredGroups);
      setFlatGroups(flattenGroups(treeGroups));

      setIsError(false);
    } catch (err) {
      console.error('Error fetching vendors:', err);
      setIsError(true);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, []);

  // CRUD operations
  const addVendor = async (vendorData) => {
    try {
      setIsSubmitting(true);
      console.log('Adding vendor:', vendorData);
      const { data } = await api.post('/vendor', vendorData);
      console.log('Add vendor response:', data);
      setVendors(prev => [...prev, data.data]);
      setShowAddModal(false);
      setEditingVendor(null);
      reset();
      // Show success message
      alert('Vendor added successfully!');
    } catch (err) {
      console.error('Error adding vendor:', err);
      setError(err.message);
      alert(`Error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateVendor = async ({ id, ...vendorData }) => {
    try {
      setIsSubmitting(true);
      console.log('Updating vendor:', { id, ...vendorData });
      const { data } = await api.put(`/vendor/${id}`, vendorData);
      console.log('Update vendor response:', data);
      setVendors(prev => prev.map(v => v.id === id ? data.data : v));
      setShowAddModal(false);
      setEditingVendor(null);
      reset();
      // Show success message
      alert('Vendor updated successfully!');
    } catch (err) {
      console.error('Error updating vendor:', err);
      setError(err.message);
      alert(`Error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteVendor = async (id) => {
    try {
      console.log('Deleting vendor:', id);
      await api.delete(`/vendor/${id}`);
      console.log('Vendor deleted successfully');
      setVendors(prev => prev.filter(v => v.id !== id));
      // Show success message
      alert('Vendor deleted successfully!');
    } catch (err) {
      console.error('Error deleting vendor:', err);
      setError(err.message);
      alert(`Error: ${err.message}`);
    }
  };

  const fetchVendorById = async (id) => {
    try {
      const { data } = await api.get(`/vendor/${id}`);
      return data.data;
    } catch (err) {
      setError(err.message);
      return null;
    }
  };

  const handleEdit = async (vendor) => {
    setEditingVendor(vendor);
    // Pre-fill form with vendor data
    setValue('vendorName', vendor.vendorName || '');
    setValue('companyName', vendor.companyName || '');
    setValue('gstNumber', vendor.gstNumber || '');
    // Strip +91 prefix for editing if it exists
    const contact = vendor.contactNumber || '';
    setValue('contactNumber', contact.startsWith('+91') ? contact.slice(3) : contact);
    setValue('email', vendor.email || '');
    setValue('address', vendor.address || '');
    setValue('city', vendor.city || '');
    setValue('state', vendor.state || '');
    setValue('postalCode', vendor.postalCode || '');
    setValue('country', vendor.country || '');
    setValue('defaultPaymentMode', vendor.defaultPaymentMode || 'cash');
    setValue('openingBalance', vendor.openingBalance || 0);
    setValue('openingBalanceType', vendor.openingBalanceType || 'credit');
    setValue('tdsApplicable', vendor.tdsApplicable || false);
    setValue('group', vendor.group?.id || '');
    setShowAddModal(true);
  };

  const handleDelete = async (vendor) => {
    if (window.confirm(`Are you sure you want to delete ${vendor.vendorName}?`)) {
      await deleteVendor(vendor.id);
    }
  };

  const handleView = (vendor) => {
    navigate(`/vendors/${vendor.id}`);
  };

  const onSubmit = (data) => {
    // Append +91 prefix to contact number
    const payload = {
      ...data,
      contactNumber: `+91${data.contactNumber}`,
      tdsApplicable: data.tdsApplicable ?? false
    };

    if (editingVendor) {
      updateVendor({ id: editingVendor.id, ...payload });
    } else {
      addVendor(payload);
    }
  };

  const handleAddNew = () => {
    setEditingVendor(null);
    reset();
    setShowAddModal(true);
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setEditingVendor(null);
    reset();
    setError('');
  };

  const filteredVendors = vendors.filter(vendor => {
    const matchesSearch = vendor.vendorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.contactNumber.includes(searchTerm) ||
      vendor.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'active' && vendor.isActive) ||
      (statusFilter === 'inactive' && !vendor.isActive);
    const matchesPayment = paymentFilter === 'all' || vendor.defaultPaymentMode === paymentFilter;
    return matchesSearch && matchesStatus && matchesPayment;
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
          onClick={fetchVendors}
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
          You need admin privileges to access the Vendors Management page.
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
          <h1 className="text-3xl font-bold text-gray-900">Vendors Management</h1>
          <p className="text-gray-600 mt-1">Manage your poultry suppliers and vendors</p>
        </div>
        <button
          onClick={handleAddNew}
          className="mt-4 sm:mt-0 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
        >
          <Plus size={20} />
          Add Vendor
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
                placeholder="Search vendors by name, company, contact, or email..."
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
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Payment Modes</option>
              <option value="cash">Cash</option>
              <option value="credit">Credit</option>
              <option value="advance">Advance</option>
            </select>
            <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2">
              <Filter size={16} />
              More Filters
            </button>

            {/* View Toggle Filters */}
            <div className="flex border border-gray-300 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-2 transition-colors ${viewMode === 'table'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                title="Table View"
              >
                <List size={16} />
              </button>
              <button
                onClick={() => setViewMode('grid-small')}
                className={`px-3 py-2 transition-colors ${viewMode === 'grid-small'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                title="Small Grid View"
              >
                <LayoutGrid size={16} />
              </button>
              <button
                onClick={() => setViewMode('grid-large')}
                className={`px-3 py-2 transition-colors ${viewMode === 'grid-large'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                title="Large Grid View"
              >
                <Grid3X3 size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Vendors Display */}
      {filteredVendors.length === 0 ? (
        <div className="text-center py-10 text-gray-600 bg-white rounded-xl shadow-sm border border-gray-200">
          <p>No vendors found matching your criteria.</p>
        </div>
      ) : (
        <>
          {/* Table View */}
          {viewMode === 'table' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden relative">
              <div className="overflow-x-auto max-h-[70vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor Info</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">GST No.</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Mode</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredVendors.map((vendor) => (
                      <tr key={vendor.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                              <Users className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">{vendor.vendorName}</div>
                              {vendor.companyName && (
                                <div className="text-xs text-gray-500">{vendor.companyName}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{vendor.contactNumber}</div>
                          <div className="text-xs text-gray-500">{vendor.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {vendor.city ? `${vendor.city}, ${vendor.state || ''}` : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                          {vendor.gstNumber || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPaymentModeColor(vendor.defaultPaymentMode)}`}>
                            {vendor.defaultPaymentMode.charAt(0).toUpperCase() + vendor.defaultPaymentMode.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(vendor.isActive)}`}>
                            {vendor.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium flex gap-2">
                          <button
                            onClick={() => handleView(vendor)}
                            className="text-blue-600 hover:text-blue-900"
                            title="View Details"
                          >
                            <Eye size={18} />
                          </button>
                          <button
                            onClick={() => handleEdit(vendor)}
                            className="text-green-600 hover:text-green-900"
                            title="Edit Vendor"
                          >
                            <Edit size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(vendor)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete Vendor"
                          >
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Small Grid View */}
          {viewMode === 'grid-small' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredVendors.map((vendor) => (
                <div key={vendor.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-all duration-200">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Users className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="overflow-hidden">
                        <h3 className="text-sm font-semibold text-gray-900 truncate">{vendor.vendorName}</h3>
                        {vendor.companyName && (
                          <p className="text-xs text-gray-500 truncate">{vendor.companyName}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleView(vendor)}
                        className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                        title="View"
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        onClick={() => handleEdit(vendor)}
                        className="p-1 text-gray-400 hover:text-green-600 transition-colors"
                        title="Edit"
                      >
                        <Edit size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2 mb-3">
                    <div className="flex items-center gap-1 text-xs text-gray-600">
                      <Phone className="w-3 h-3" />
                      <span className="truncate">{vendor.contactNumber}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-600">
                      <MapPin className="w-3 h-3" />
                      <span className="truncate">{vendor.city || 'No city'}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(vendor.isActive)}`}>
                      {vendor.isActive ? 'Active' : 'Inactive'}
                    </span>
                    <button
                      onClick={() => handleDelete(vendor)}
                      className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Large Grid View (Original) */}
          {viewMode === 'grid-large' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredVendors.map((vendor) => (
                <div key={vendor.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-all duration-200">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Users className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{vendor.vendorName}</h3>
                        {vendor.companyName && (
                          <p className="text-sm text-gray-500">{vendor.companyName}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleView(vendor)}
                        className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => handleEdit(vendor)}
                        className="p-1 text-gray-400 hover:text-green-600 transition-colors"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(vendor)}
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
                      <span>{vendor.contactNumber}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Mail className="w-4 h-4" />
                      <span>{vendor.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin className="w-4 h-4" />
                      <span>{vendor.address}, {vendor.city}, {vendor.state}</span>
                    </div>
                  </div>

                  {/* GST and Payment Info */}
                  <div className="space-y-3 mb-4">
                    {vendor.gstNumber && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Building className="w-4 h-4" />
                        <span className="font-mono">{vendor.gstNumber}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">Payment Mode:</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPaymentModeColor(vendor.defaultPaymentMode)}`}>
                        {vendor.defaultPaymentMode.charAt(0).toUpperCase() + vendor.defaultPaymentMode.slice(1)}
                      </span>
                    </div>
                  </div>

                  {/* Status and Actions */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(vendor.isActive)}`}>
                      {vendor.isActive ? 'Active' : 'Inactive'}
                    </span>
                    <button onClick={() => handleView(vendor)} className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                      View Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Summary Stats */}
      {/* <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-500">Total Vendors</div>
          <div className="text-2xl font-bold text-gray-900">{filteredVendors.length}</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-500">Active Vendors</div>
          <div className="text-2xl font-bold text-green-600">
            {filteredVendors.filter(v => v.isActive).length}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-500">Cash Payment</div>
          <div className="text-2xl font-bold text-blue-600">
            {filteredVendors.filter(v => v.defaultPaymentMode === 'cash').length}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-500">Credit Payment</div>
          <div className="text-2xl font-bold text-purple-600">
            {filteredVendors.filter(v => v.defaultPaymentMode === 'credit').length}
          </div>
        </div>
      </div> */}

      {/* Vendor Form Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingVendor ? 'Edit Vendor' : 'Add New Vendor'}
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
                    Vendor Name *
                  </label>
                  <input
                    type="text"
                    {...register('vendorName')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {errors.vendorName && <p className="text-red-500 text-xs mt-1">{errors.vendorName.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Company Name
                  </label>
                  <input
                    type="text"
                    {...register('companyName')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {errors.companyName && <p className="text-red-500 text-xs mt-1">{errors.companyName.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    GST Number
                  </label>
                  <input
                    type="text"
                    {...register('gstNumber')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {errors.gstNumber && <p className="text-red-500 text-xs mt-1">{errors.gstNumber.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contact Number *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">+91</span>
                    </div>
                    <input
                      type="tel"
                      {...register('contactNumber')}
                      className="w-full pl-12 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter 10 digit number"
                      maxLength={10}
                      onInput={(e) => {
                        e.target.value = e.target.value.replace(/[^0-9]/g, '').slice(0, 10);
                      }}
                    />
                  </div>
                  {errors.contactNumber && <p className="text-red-500 text-xs mt-1">{errors.contactNumber.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    {...register('email')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Group *
                  </label>
                  <select
                    {...register('group')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select a group</option>
                    {flatGroups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.displayName}
                      </option>
                    ))}
                  </select>
                  {errors.group && <p className="text-red-500 text-xs mt-1">{errors.group.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Opening Balance (₹)
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="number"
                      {...register('openingBalance', { valueAsNumber: true })}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <select
                      {...register('openingBalanceType')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="debit">Debit</option>
                      <option value="credit">Credit</option>
                    </select>
                  </div>
                  {errors.openingBalance && <p className="text-red-500 text-xs mt-1">{errors.openingBalance.message}</p>}
                  <p className="text-xs text-gray-500 mt-1">
                    Vendor&apos;s initial opening balance
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Default Payment Mode
                  </label>
                  <select
                    {...register('defaultPaymentMode')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="cash">Cash</option>
                    <option value="credit">Credit</option>
                    <option value="advance">Advance</option>
                  </select>
                  {errors.defaultPaymentMode && <p className="text-red-500 text-xs mt-1">{errors.defaultPaymentMode.message}</p>}
                </div>
                <div className="md:col-span-2">
                  <label className="flex items-center space-x-2 text-sm font-medium text-gray-700">
                    <input
                      type="checkbox"
                      {...register('tdsApplicable')}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span>TDS applicable</span>
                  </label>
                  <p className="text-xs text-gray-500 mt-1">
                    Enable this if TDS should be deducted for this vendor&apos;s payments.
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    City
                  </label>
                  <input
                    type="text"
                    {...register('city')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    State
                  </label>
                  <input
                    type="text"
                    {...register('state')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {errors.state && <p className="text-red-500 text-xs mt-1">{errors.state.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Postal Code
                  </label>
                  <input
                    type="text"
                    {...register('postalCode')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {errors.postalCode && <p className="text-red-500 text-xs mt-1">{errors.postalCode.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Country
                  </label>
                  <input
                    type="text"
                    {...register('country')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {errors.country && <p className="text-red-500 text-xs mt-1">{errors.country.message}</p>}
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
                  {editingVendor ? 'Update Vendor' : 'Add Vendor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}