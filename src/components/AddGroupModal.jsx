import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import api from '../lib/axios';

export default function AddGroupModal({ isOpen, onClose, onGroupCreated, defaultType = 'Assets' }) {
  const [name, setName] = useState('');
  const [type, setType] = useState(defaultType);
  const [parentGroup, setParentGroup] = useState('');
  const [groups, setGroups] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setType(defaultType);
      setParentGroup('');
      // Fetch existing groups to populate parentGroup dropdown
      const fetchGroups = async () => {
        try {
          const { data } = await api.get('/group');
          setGroups(data.data || []);
        } catch (err) {
          console.error('Failed to fetch groups', err);
        }
      };
      fetchGroups();
    }
  }, [isOpen, defaultType]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      setIsSubmitting(true);
      const payload = {
        name: name.trim(),
        type,
        parentGroup: parentGroup || null,
      };
      const { data } = await api.post('/group', payload);
      if (data.success) {
        onGroupCreated(data.data);
        onClose();
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to create group');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
      <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Add New Group</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Group Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Local Expenses"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Group Type *</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="Assets">Assets</option>
              <option value="Liability">Liability</option>
              <option value="Expenses">Expenses</option>
              <option value="Income">Income</option>
              <option value="Others">Others</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Parent Group (Optional)</label>
            <select
              value={parentGroup}
              onChange={(e) => setParentGroup(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">None (Root Group)</option>
              {groups.map((g) => (
                <option key={g.id || g._id} value={g.id || g._id}>
                  {g.name} ({g.type})
                </option>
              ))}
            </select>
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
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 font-medium"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Create Group
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
