import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Loader2 } from 'lucide-react';
import api from '../lib/axios';

const approvalSchema = z.object({
  group: z.string().min(1, 'Group is required'),
  openingBalance: z.number().min(0, 'Opening balance cannot be negative').optional().default(0)
});

const CustomerApprovalModal = ({ show, onClose, user, onApprove }) => {
  const [groups, setGroups] = useState([]);
  const [flatGroups, setFlatGroups] = useState([]);
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, formState: { errors }, reset } = useForm({
    resolver: zodResolver(approvalSchema),
    defaultValues: {
      group: '',
      openingBalance: 0
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
    if (show && user?.role === 'customer') {
      const fetchGroups = async () => {
        try {
          setIsLoadingGroups(true);
          const groupsRes = await api.get('/group');
          const groupsData = groupsRes.data.data || [];
          setGroups(groupsData);

          // Filter groups to show only "Sundry Debtors" and its descendants using SLUG
          // This relies on the backend migration having been run to populate slugs
          const sundryDebtorsGroups = getGroupDescendants(groupsData, 'sundry-debtors');

          let groupsToDisplay = [];

          if (sundryDebtorsGroups.length > 0) {
            groupsToDisplay = groupsData.filter(g => {
              const allDescendants = sundryDebtorsGroups.map(gr => gr.id);
              return allDescendants.includes(g.id);
            });
          } else {
            // Fallback if slug not found (e.g. migration didn't run or group missing)
            console.warn('Sundry Debtors group not found by slug "sundry-debtors", displaying all groups');
            groupsToDisplay = groupsData;
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

          const treeGroups = buildTree(groupsToDisplay);
          setFlatGroups(flattenGroups(treeGroups));
        } catch (err) {
          console.error('Error fetching groups:', err);
        } finally {
          setIsLoadingGroups(false);
        }
      };

      fetchGroups();
    }
  }, [show, user]);

  const onSubmit = async (data) => {
    try {
      setIsSubmitting(true);
      await onApprove(user._id, data);
      reset();
      onClose();
    } catch (err) {
      console.error('Error approving customer:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!show || !user || user.role !== 'customer') {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            Approve Customer
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={24} />
          </button>
        </div>

        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2">
            <strong>Customer:</strong> {user.name}
          </p>
          <p className="text-sm text-gray-600">
            <strong>Contact:</strong> {user.mobileNumber}
          </p>
        </div>

        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> Please select the customer's group and set the opening balance before approving. These details are required to complete the customer registration and will be used for accounting purposes.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
              Customer's initial opening balance
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isLoadingGroups}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Approve Customer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CustomerApprovalModal;

