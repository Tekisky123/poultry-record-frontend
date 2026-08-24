import { useState, useEffect, useRef } from 'react';
import { X, Loader2, Search, ChevronDown } from 'lucide-react';
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

  const [groupSearchTerm, setGroupSearchTerm] = useState('');
  const [isGroupDropdownOpen, setIsGroupDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!isGroupDropdownOpen) return;
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsGroupDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isGroupDropdownOpen]);

  const selectedParentDoc = groups.find(g => (g.id || g._id) === parentGroup);

  const filteredParentGroups = groups.filter(g => {
    if (!groupSearchTerm.trim()) return true;
    const term = groupSearchTerm.toLowerCase();
    return (
      (g.name && g.name.toLowerCase().includes(term)) ||
      (g.type && g.type.toLowerCase().includes(term))
    );
  });

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
            <div className="relative" ref={dropdownRef}>
              <div
                onClick={() => setIsGroupDropdownOpen(!isGroupDropdownOpen)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer bg-white flex items-center justify-between"
              >
                <span className={selectedParentDoc ? "text-gray-900 font-medium text-sm truncate" : "text-gray-700 text-sm"}>
                  {selectedParentDoc ? `${selectedParentDoc.name} (${selectedParentDoc.type})` : "None (Root Group)"}
                </span>
                <ChevronDown size={18} className="text-gray-400 shrink-0 ml-2" />
              </div>

              {isGroupDropdownOpen && (
                <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-50 overflow-hidden">
                  <div className="p-2 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
                    <Search size={16} className="text-gray-400 ml-1 shrink-0" />
                    <input
                      type="text"
                      placeholder="Type to search group..."
                      value={groupSearchTerm}
                      onChange={(e) => setGroupSearchTerm(e.target.value)}
                      className="w-full bg-transparent text-sm focus:outline-none py-1"
                      autoFocus
                    />
                    {groupSearchTerm && (
                      <button
                        type="button"
                        onClick={() => setGroupSearchTerm('')}
                        className="text-gray-400 hover:text-gray-600 mr-1"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  <div className="max-h-60 overflow-y-auto divide-y divide-gray-50">
                    <div
                      onClick={() => {
                        setParentGroup('');
                        setIsGroupDropdownOpen(false);
                        setGroupSearchTerm('');
                      }}
                      className={`px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 flex items-center justify-between ${
                        !parentGroup ? 'bg-blue-50/80 font-semibold text-blue-600' : 'text-gray-700'
                      }`}
                    >
                      <span>None (Root Group)</span>
                    </div>
                    {filteredParentGroups.length > 0 ? (
                      filteredParentGroups.map((g) => (
                        <div
                          key={g.id || g._id}
                          onClick={() => {
                            setParentGroup(g.id || g._id);
                            setIsGroupDropdownOpen(false);
                            setGroupSearchTerm('');
                          }}
                          className={`px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 flex items-center justify-between ${
                            parentGroup === (g.id || g._id) ? 'bg-blue-50/80 font-semibold text-blue-600' : 'text-gray-700'
                          }`}
                        >
                          <span className="truncate pr-2">{g.name}</span>
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded shrink-0">
                            {g.type}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="p-3 text-center text-xs text-gray-500">
                        No matching groups found
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

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
