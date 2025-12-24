// src/pages/AddCustomer.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Loader2
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
  place: z.string()
    .max(100, 'Place name too long')
    .optional(),
  gstOrPanNumber: z.string()
    .max(100, 'GST or PAN number cannot exceed 100 characters')
    .optional(),
  openingBalance: z.number().optional().default(0),
  openingBalanceType: z.enum(['debit', 'credit']).optional().default('debit')
    .optional(),
  group: z.string().min(1, 'Group is required'),
  // Login credentials fields
  email: z.string()
    .email('Invalid email format')
    .min(1, 'Email is required'),
  password: z.string()
    .refine((val) => {
      // If not empty, validate password strength
      return val.length >= 6 && /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(val);
    }, 'Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  tdsApplicable: z.boolean().default(false)
});

export default function AddCustomer() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [groups, setGroups] = useState([]);
  const [flatGroups, setFlatGroups] = useState([]);
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);

  // Check if user has admin privileges
  const hasAdminAccess = user?.role === 'admin' || user?.role === 'superadmin';

  // React Hook Form with Zod validation
  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      shopName: '',
      ownerName: '',
      contact: '',
      address: '',
      place: '',
      gstOrPanNumber: '',
      openingBalance: 0,
      openingBalanceType: 'debit',
      email: '',
      password: '',
      tdsApplicable: false,
      group: ''
    }
  });

  // Add customer
  const addCustomer = async (customerData) => {
    try {
      setIsSubmitting(true);
      setError('');
      console.log('Adding customer:', customerData);
      const { data } = await api.post('/customer', customerData);
      console.log('Add customer response:', data);
      reset();
      // Show success message and navigate back
      alert('Customer added successfully!');
      navigate('/customers');
    } catch (err) {
      console.error('Error adding customer:', err);
      setError(err.response?.data?.message || err.message || 'Failed to add customer');
    } finally {
      setIsSubmitting(false);
    }
  };

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

  // Helper function to get all descendants of a group by SLUG
  const getGroupDescendants = (allGroups, parentGroupSlug) => {
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

    // Find the parent group by SLUG
    const findGroupBySlug = (groups, slug) => {
      for (const group of groups) {
        if (group.slug === slug) {
          return group;
        }
        if (group.children && group.children.length > 0) {
          const found = findGroupBySlug(group.children, slug);
          if (found) return found;
        }
      }
      return null;
    };

    const parentGroup = findGroupBySlug(rootGroups, parentGroupSlug);
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

  // Fetch groups on component mount
  useEffect(() => {
    const fetchGroups = async () => {
      try {
        setIsLoadingGroups(true);
        const groupsRes = await api.get('/group');
        const groupsData = groupsRes.data.data || [];
        setGroups(groupsData);

        // Filter groups to show only "Sundry Debtors" and its descendants using SLUG
        const sundryDebtorsGroups = getGroupDescendants(groupsData, 'sundry-debtors');

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

        // Filter to only include Sundry Debtors hierarchy
        let groupsToDisplay = groupsData;
        if (sundryDebtorsGroups.length > 0) {
          groupsToDisplay = groupsData.filter(g => {
            const allDescendants = sundryDebtorsGroups.map(gr => gr.id);
            return allDescendants.includes(g.id);
          });
        } else {
          console.warn('Sundry Debtors group not found by slug "sundry-debtors", displaying all groups');
        }

        const treeGroups = buildTree(groupsToDisplay);
        setFlatGroups(flattenGroups(treeGroups));


      } catch (err) {
        console.error('Error fetching groups:', err);
      } finally {
        setIsLoadingGroups(false);
      }
    };

    fetchGroups();
  }, []);

  const onSubmit = (data) => {
    // Add +91 prefix to contact number
    const customerData = {
      ...data,
      contact: `+91${data.contact}`,
      tdsApplicable: data.tdsApplicable ?? false
    };

    addCustomer(customerData);
  };

  if (!hasAdminAccess) {
    return (
      <div className="text-center py-8">
        <h2 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h2>
        <p className="text-gray-600 mb-4">
          You need admin privileges to access this page.
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
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/customers')}
          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Add New Customer</h1>
          <p className="text-gray-600 mt-1">Create a new customer account</p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Customer Form */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                Place *
              </label>
              <input
                type="text"
                {...register('place', { required: 'Place is required' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {errors.place && <p className="text-red-500 text-xs mt-1">{errors.place.message}</p>}
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
              {errors.openingBalanceType && <p className="text-red-500 text-xs mt-1">{errors.openingBalanceType.message}</p>}
              <p className="text-xs text-gray-500 mt-1">
                Customer's initial opening balance
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Group *
              </label>
              <select
                {...register('group')}
                disabled={isLoadingGroups}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
              >
                <option value="">{isLoadingGroups ? 'Loading groups...' : 'Select a group'}</option>
                {flatGroups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.displayName}
                  </option>
                ))}
              </select>
              {errors.group && <p className="text-red-500 text-xs mt-1">{errors.group.message}</p>}
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
                Enable this if TDS should be applied to this customer&apos;s transactions.
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    placeholder="Enter password"
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
                <strong>Login Info:</strong> Customer can login using their email address or mobile number (+91contact number) along with the password.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={() => navigate('/customers')}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Add Customer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

