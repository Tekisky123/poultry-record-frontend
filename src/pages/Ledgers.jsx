import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  Plus,
  Search,
  Filter,
  BookOpen,
  Edit,
  Trash2,
  Loader2,
  X,
  Tag,
  Eye
} from 'lucide-react';
import api from '../lib/axios';
import { useAuth } from '../contexts/AuthContext';

// Zod Schema for Ledger validation
const ledgerSchema = z.object({
  name: z.string().min(1, 'Ledger name is required'),
  group: z.string().min(1, 'Group is required'),
  openingBalance: z.number().optional().default(0),
  openingBalanceType: z.enum(['debit', 'credit']).optional().default('debit'),
});


// Build flat list of groups for dropdown (with hierarchy indication)
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

export default function Ledgers() {
  const { user } = useAuth();
  const [ledgers, setLedgers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [flatGroups, setFlatGroups] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [groupFilter, setGroupFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingLedger, setEditingLedger] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasAdminAccess = user?.role === 'admin' || user?.role === 'superadmin';

  const { register, handleSubmit, reset, formState: { errors }, setValue } = useForm({
    resolver: zodResolver(ledgerSchema),
    defaultValues: {
      name: '',
      group: '',
      openingBalance: 0,
      openingBalanceType: 'debit'
    }
  });

  // Fetch all data
  const fetchData = async () => {
    try {
      setIsLoading(true);

      // Fetch groups
      const groupsRes = await api.get('/group');
      const groupsData = groupsRes.data.data || [];
      setGroups(groupsData);

      // Build tree and flatten for dropdown
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
      const treeGroups = buildTree(groupsData);
      setFlatGroups(flattenGroups(treeGroups));

      // Fetch ledgers
      const ledgersRes = await api.get('/ledger');
      setLedgers(ledgersRes.data.data || []);

      setIsError(false);
    } catch (err) {
      console.error('Error fetching data:', err);
      setIsError(true);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (hasAdminAccess) {
      fetchData();
    }
  }, [hasAdminAccess]);

  const addLedger = async (ledgerData) => {
    try {
      setIsSubmitting(true);
      const payload = {
        name: ledgerData.name,
        group: ledgerData.group,
        openingBalance: ledgerData.openingBalance || 0,
        openingBalanceType: ledgerData.openingBalanceType || 'debit'
      };
      const { data } = await api.post('/ledger', payload);
      setShowAddModal(false);
      setEditingLedger(null);
      reset();
      await fetchData();
      alert('Ledger added successfully!');
    } catch (err) {
      console.error('Error adding ledger:', err);
      setError(err.message);
      alert(`Error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateLedger = async ({ id, ...ledgerData }) => {
    try {
      setIsSubmitting(true);
      const payload = {
        name: ledgerData.name,
        group: ledgerData.group,
        openingBalance: ledgerData.openingBalance || 0,
        openingBalanceType: ledgerData.openingBalanceType || 'debit'
      };
      const { data } = await api.put(`/ledger/${id}`, payload);
      setShowAddModal(false);
      setEditingLedger(null);
      reset();
      await fetchData();
      alert('Ledger updated successfully!');
    } catch (err) {
      console.error('Error updating ledger:', err);
      setError(err.message);
      alert(`Error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteLedger = async (id) => {
    try {
      await api.delete(`/ledger/${id}`);
      await fetchData();
      alert('Ledger deleted successfully!');
    } catch (err) {
      console.error('Error deleting ledger:', err);
      setError(err.message);
      alert(`Error: ${err.message}`);
    }
  };

  const handleEdit = (ledger) => {
    setEditingLedger(ledger);
    setValue('name', ledger.name || '');
    setValue('group', ledger.group?.id || '');
    setValue('openingBalance', ledger.openingBalance || 0);
    setValue('openingBalanceType', ledger.openingBalanceType || 'debit');
    setShowAddModal(true);
  };

  const handleDelete = async (ledger) => {
    if (window.confirm(`Are you sure you want to delete ${ledger.name}?`)) {
      await deleteLedger(ledger.id);
    }
  };

  const onSubmit = (data) => {
    if (editingLedger) {
      updateLedger({ id: editingLedger.id, ...data });
    } else {
      addLedger(data);
    }
  };

  const handleAddNew = () => {
    setEditingLedger(null);
    reset();
    setShowAddModal(true);
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setEditingLedger(null);
    reset();
    setError('');
  };

  // Filter ledgers
  const filteredLedgers = ledgers.filter(ledger => {
    const matchesSearch = ledger.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ledger.group?.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGroup = groupFilter === 'all' || ledger.group?.id === groupFilter;
    return matchesSearch && matchesGroup;
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
          onClick={fetchData}
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
          You need admin privileges to access the Ledgers Management page.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Ledgers Management</h1>
          <p className="text-gray-600 mt-1">Manage accounting ledgers and assign them to groups</p>
        </div>
        <button
          onClick={handleAddNew}
          className="mt-4 sm:mt-0 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
        >
          <Plus size={20} />
          Add Ledger
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
                placeholder="Search ledgers by name or group..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <select
              value={groupFilter}
              onChange={(e) => setGroupFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Groups</option>
              {flatGroups.map(group => (
                <option key={group.id} value={group.id}>
                  {group.displayName}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Ledgers Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Group</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Opening Balance</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Outstanding Balance</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredLedgers.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                    No ledgers found
                  </td>
                </tr>
              ) : (
                filteredLedgers.map((ledger) => (
                  <tr key={ledger.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <BookOpen size={16} className="text-blue-600 mr-2" />
                        <span className="font-medium text-gray-900">{ledger.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Tag size={16} className="text-gray-400 mr-2" />
                        <span className="text-gray-700">{ledger.group?.name || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-gray-700">
                        ₹{Number(ledger.openingBalance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-gray-700 font-medium">
                        ₹{Number(ledger.outstandingBalance || ledger.openingBalance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {(ledger.outstandingBalanceType || ledger.openingBalanceType || 'debit').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/ledgers/${ledger.id}`}
                          className="text-blue-600 hover:text-blue-900"
                          title="View Transactions"
                        >
                          <Eye size={16} />
                        </Link>
                        <button
                          onClick={() => handleEdit(ledger)}
                          className="text-green-600 hover:text-green-900"
                          title="Edit"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(ledger)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ledger Form Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingLedger ? 'Edit Ledger' : 'Add New Ledger'}
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            {/* Note about adding/updating ledgers */}
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                {editingLedger ? (
                  <>
                    <strong>Note:</strong> Updating a ledger will modify its details. Make sure to select the correct group and verify the opening balance before saving.
                  </>
                ) : (
                  <>
                    <strong>Note:</strong> When adding a new ledger, select the appropriate group and set the opening balance if required. The ledger will be associated with the selected group for accounting purposes.
                  </>
                )}
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ledger Name *
                </label>
                <input
                  type="text"
                  {...register('name')}
                  placeholder="Enter ledger name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
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
                  {flatGroups.map(group => (
                    <option key={group.id} value={group.id}>
                      {group.displayName} ({group.type})
                    </option>
                  ))}
                </select>
                {errors.group && <p className="text-red-500 text-xs mt-1">{errors.group.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Opening Balance (optional)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="number"
                    step="0.01"
                    {...register('openingBalance', { valueAsNumber: true })}
                    placeholder="0.00"
                    defaultValue={0}
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
                <p className="text-xs text-gray-500 mt-1">Default: 0.00 Debit</p>
              </div>

              <div className="flex justify-end gap-3 pt-4">
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
                  {editingLedger ? 'Update Ledger' : 'Add Ledger'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

