import { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { 
  Plus, 
  Search, 
  Filter, 
  FolderTree,
  Edit,
  Trash2,
  ChevronRight,
  ChevronDown,
  Loader2,
  X,
  Tag
} from 'lucide-react';
import api from '../lib/axios';
import { useAuth } from '../contexts/AuthContext';

// Zod Schema for Group validation
const groupSchema = z.object({
  name: z.string()
    .min(2, 'Group name must be at least 2 characters')
    .max(100, 'Group name cannot exceed 100 characters'),
  type: z.enum(['Liability', 'Assets', 'Expenses', 'Income'], {
    required_error: 'Group type is required',
  }),
  parentGroup: z.string().optional().nullable(),
});

const getTypeColor = (type) => {
  const colors = {
    Assets: 'bg-blue-100 text-blue-800',
    Liability: 'bg-purple-100 text-purple-800',
    Expenses: 'bg-red-100 text-red-800',
    Income: 'bg-green-100 text-green-800'
  };
  return colors[type] || 'bg-gray-100 text-gray-800';
};

// Build hierarchical tree structure
const buildTree = (groups) => {
  const groupMap = new Map();
  const rootGroups = [];

  // First pass: create map of all groups
  groups.forEach(group => {
    groupMap.set(group.id, { ...group, children: [] });
  });

  // Second pass: build tree
  groups.forEach(group => {
    const node = groupMap.get(group.id);
    if (group.parentGroup && groupMap.has(group.parentGroup.id)) {
      const parent = groupMap.get(group.parentGroup.id);
      parent.children.push(node);
    } else {
      rootGroups.push(node);
    }
  });

  return rootGroups;
};

// Render tree node component
const TreeNode = ({ group, level = 0, onEdit, onDelete, expanded, onToggle, getLedgersCount }) => {
  const hasChildren = group.children && group.children.length > 0;
  const isExpanded = expanded[group.id] || false;

  return (
    <div className="select-none">
      <div 
        className={`flex items-center gap-2 p-2 hover:bg-gray-50 rounded-lg ${level > 0 ? 'ml-6' : ''}`}
        style={{ paddingLeft: `${level * 24 + 8}px` }}
      >
        {hasChildren ? (
          <button onClick={() => onToggle(group.id)} className="p-1 hover:bg-gray-200 rounded">
            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
        ) : (
          <span className="w-6" />
        )}
        <FolderTree size={16} className="text-blue-600" />
        <span className="flex-1 font-medium">{group.name}</span>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(group.type)}`}>
          {group.type}
        </span>
        {getLedgersCount && (
          <span className="text-sm text-gray-500">
            ({getLedgersCount(group.id)} ledgers)
          </span>
        )}
        <div className="flex items-center gap-1">
          <button 
            onClick={() => onEdit(group)}
            className="p-1 text-gray-400 hover:text-green-600 transition-colors"
            title="Edit"
          >
            <Edit size={16} />
          </button>
          {!group.isPredefined && (
            <button 
              onClick={() => onDelete(group)}
              className="p-1 text-gray-400 hover:text-red-600 transition-colors"
              title="Delete"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>
      {hasChildren && isExpanded && (
        <div>
          {group.children.map(child => (
            <TreeNode
              key={child.id}
              group={child}
              level={level + 1}
              onEdit={onEdit}
              onDelete={onDelete}
              expanded={expanded}
              onToggle={onToggle}
              getLedgersCount={getLedgersCount}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default function Groups() {
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [treeGroups, setTreeGroups] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [expanded, setExpanded] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ledgersCount, setLedgersCount] = useState({});

  const hasAdminAccess = user?.role === 'admin' || user?.role === 'superadmin';

  const { register, handleSubmit, reset, formState: { errors }, setValue, watch } = useForm({
    resolver: zodResolver(groupSchema),
    defaultValues: {
      name: '',
      type: 'Assets',
      parentGroup: null
    }
  });

  const selectedType = watch('type');

  // Fetch groups
  const fetchGroups = async () => {
    try {
      setIsLoading(true);
      const { data } = await api.get('/group');
      setGroups(data.data || []);
      const tree = buildTree(data.data || []);
      setTreeGroups(tree);
      setIsError(false);
      
      // Fetch ledgers count for each group
      const counts = {};
      for (const group of data.data || []) {
        try {
          const ledgerRes = await api.get(`/ledger?group=${group.id}`);
          counts[group.id] = ledgerRes.data.data?.length || 0;
        } catch (err) {
          counts[group.id] = 0;
        }
      }
      setLedgersCount(counts);
    } catch (err) {
      console.error('Error fetching groups:', err);
      setIsError(true);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (hasAdminAccess) {
      fetchGroups();
    }
  }, [hasAdminAccess]);

  const toggleExpanded = (groupId) => {
    setExpanded(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  const addGroup = async (groupData) => {
    try {
      setIsSubmitting(true);
      const payload = {
        ...groupData,
        parentGroup: groupData.parentGroup || null
      };
      const { data } = await api.post('/group', payload);
      setShowAddModal(false);
      setEditingGroup(null);
      reset();
      await fetchGroups();
      alert('Group added successfully!');
    } catch (err) {
      console.error('Error adding group:', err);
      setError(err.message);
      alert(`Error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateGroup = async ({ id, ...groupData }) => {
    try {
      setIsSubmitting(true);
      const payload = {
        ...groupData,
        parentGroup: groupData.parentGroup || null
      };
      const { data } = await api.put(`/group/${id}`, payload);
      setShowAddModal(false);
      setEditingGroup(null);
      reset();
      await fetchGroups();
      alert('Group updated successfully!');
    } catch (err) {
      console.error('Error updating group:', err);
      setError(err.message);
      alert(`Error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteGroup = async (id) => {
    try {
      await api.delete(`/group/${id}`);
      await fetchGroups();
      alert('Group deleted successfully!');
    } catch (err) {
      console.error('Error deleting group:', err);
      setError(err.message);
      alert(`Error: ${err.message}`);
    }
  };

  const handleEdit = (group) => {
    setEditingGroup(group);
    setValue('name', group.name || '');
    setValue('type', group.type || 'Assets');
    setValue('parentGroup', group.parentGroup?.id || null);
    setShowAddModal(true);
  };

  const handleDelete = async (group) => {
    if (window.confirm(`Are you sure you want to delete ${group.name}? This will fail if the group has child groups or ledgers.`)) {
      await deleteGroup(group.id);
    }
  };

  const onSubmit = (data) => {
    if (editingGroup) {
      updateGroup({ id: editingGroup.id, ...data });
    } else {
      addGroup(data);
    }
  };

  const handleAddNew = () => {
    setEditingGroup(null);
    reset();
    setShowAddModal(true);
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setEditingGroup(null);
    reset();
    setError('');
  };

  // Filter groups
  const filteredTree = treeGroups.filter(group => {
    const matchesSearch = group.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || group.type === typeFilter;
    return matchesSearch && matchesType;
  });

  // Get available parent groups (filter by type and exclude current group and its descendants)
  const getAvailableParents = () => {
    if (!selectedType) return [];
    return groups.filter(g => 
      g.type === selectedType && 
      g.id !== editingGroup?.id &&
      g.isActive
    );
  };

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
          onClick={fetchGroups}
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
          You need admin privileges to access the Groups Management page.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Groups Management</h1>
          <p className="text-gray-600 mt-1">Manage accounting groups and their hierarchy</p>
        </div>
        <button 
          onClick={handleAddNew}
          className="mt-4 sm:mt-0 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
        >
          <Plus size={20} />
          Add Group
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
                placeholder="Search groups..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Types</option>
              <option value="Assets">Assets</option>
              <option value="Liability">Liability</option>
              <option value="Expenses">Expenses</option>
              <option value="Income">Income</option>
            </select>
          </div>
        </div>
      </div>

      {/* Groups Tree */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold mb-4">Groups Hierarchy</h2>
        {filteredTree.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No groups found</p>
        ) : (
          <div className="space-y-1">
            {filteredTree.map(group => (
              <TreeNode
                key={group.id}
                group={group}
                onEdit={handleEdit}
                onDelete={handleDelete}
                expanded={expanded}
                onToggle={toggleExpanded}
                getLedgersCount={(id) => ledgersCount[id] || 0}
              />
            ))}
          </div>
        )}
      </div>

      {/* Group Form Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingGroup ? 'Edit Group' : 'Add New Group'}
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Group Name *
                </label>
                <input
                  type="text"
                  {...register('name')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Group Type *
                </label>
                <select
                  {...register('type')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="Assets">Assets</option>
                  <option value="Liability">Liability</option>
                  <option value="Expenses">Expenses</option>
                  <option value="Income">Income</option>
                </select>
                {errors.type && <p className="text-red-500 text-xs mt-1">{errors.type.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Parent Group (Optional)
                </label>
                <select
                  {...register('parentGroup')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">None (Root Group)</option>
                  {getAvailableParents().map(parent => (
                    <option key={parent.id} value={parent.id}>
                      {parent.name} ({parent.type})
                    </option>
                  ))}
                </select>
                {errors.parentGroup && <p className="text-red-500 text-xs mt-1">{errors.parentGroup.message}</p>}
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
                  {editingGroup ? 'Update Group' : 'Add Group'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

