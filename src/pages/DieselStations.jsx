import { useEffect, useState } from 'react';
import { Plus, Search, Edit2, Trash2, X, Loader2, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../lib/axios';

const initialForm = {
  name: '',
  location: '',
  group: '',
  openingBalance: 0,
  openingBalanceType: 'debit',
};

const DieselStations = () => {
  const [stations, setStations] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState(initialForm);
  const [editingStation, setEditingStation] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [groups, setGroups] = useState([]);
  const [flatGroups, setFlatGroups] = useState([]);

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

  const fetchStations = async () => {
    try {
      setLoading(true);
      const [stationsRes, groupsRes] = await Promise.all([
        api.get('/diesel-stations'),
        api.get('/group')
      ]);

      setStations(stationsRes.data.data || []);

      const groupsData = groupsRes.data.data || [];
      setGroups(groupsData);
      const treeGroups = buildTree(groupsData);
      setFlatGroups(flattenGroups(treeGroups));

      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStations();
  }, []);

  const closeModal = () => {
    setShowModal(false);
    setFormData(initialForm);
    setEditingStation(null);
    setError('');
  };

  const openAddModal = () => {
    setEditingStation(null);
    setFormData(initialForm);
    setShowModal(true);
  };

  const openEditModal = (station) => {
    setEditingStation(station);
    setFormData({
      name: station.name || '',
      location: station.location || '',
      group: station.group?._id || station.group || '',
      openingBalance: station.openingBalance || 0,
      openingBalanceType: station.openingBalanceType || 'debit',
    });
    setShowModal(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Station name is required');
      return;
    }
    // if (!formData.group) {
    //   setError('Group is required');
    //   return;
    // }

    try {
      setSubmitting(true);
      if (editingStation) {
        await api.put(`/diesel-stations/${editingStation.id}`, formData);
      } else {
        await api.post('/diesel-stations', formData);
      }
      await fetchStations();
      closeModal();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to save diesel station');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (stationId) => {
    const confirmDelete = window.confirm('Are you sure you want to delete this diesel station?');
    if (!confirmDelete) return;
    try {
      await api.delete(`/diesel-stations/${stationId}`);
      setStations((prev) => prev.filter((station) => station.id !== stationId));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete diesel station');
    }
  };

  const filteredStations = stations.filter((station) => {
    const term = searchTerm.toLowerCase();
    return (
      station.name?.toLowerCase().includes(term) ||
      station.location?.toLowerCase().includes(term)
    );
  });

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Diesel Stations</h1>
          <p className="text-gray-600 mt-1">Manage fuel station references for trip diesel entries</p>
        </div>
        <button
          onClick={openAddModal}
          className="mt-4 sm:mt-0 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
        >
          <Plus size={18} />
          Add Station
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search by station name or location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {filteredStations.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No diesel stations found. Click “Add Station” to create one.
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Station Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Group
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Opening Balance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Outstanding Balance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Updated
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredStations.map((station) => (
                <tr key={station.id}>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {station.name}
                    {station.location && (
                      <div className="text-xs text-gray-500">{station.location}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {station.group?.name || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {station.openingBalance ? `₹${station.openingBalance.toLocaleString()} ${station.openingBalanceType === 'credit' ? 'Cr' : 'Dr'}` : '₹0'}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium">
                    <span className={station.outstandingBalanceType === 'credit' ? 'text-red-600' : 'text-green-600'}>
                      {station.outstandingBalance ? `₹${station.outstandingBalance.toLocaleString()} ${station.outstandingBalanceType === 'credit' ? 'Cr' : 'Dr'}` : '₹0'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {station.updatedAt ? new Date(station.updatedAt).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => openEditModal(station)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(station.id)}
                        className="text-red-600 hover:text-red-800"
                        title="Delete"
                      >
                        <Trash2 size={18} />
                      </button>
                      <Link
                        to={`/diesel-stations/${station.id}`}
                        className="text-gray-600 hover:text-gray-800"
                        title="View Ledger"
                      >
                        <Eye size={18} />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingStation ? 'Edit Diesel Station' : 'Add Diesel Station'}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Station Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., HP Fuel Station"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location <span className="text-xs text-gray-400">(optional)</span>
                </label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., NH48, Pune"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Group
                </label>
                <select
                  name="group"
                  value={formData.group}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select Group</option>
                  {flatGroups.map(group => (
                    <option key={group.id} value={group.id}>
                      {group.displayName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Opening Balance
                  </label>
                  <input
                    type="number"
                    name="openingBalance"
                    value={formData.openingBalance}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Dr/Cr
                  </label>
                  <select
                    name="openingBalanceType"
                    value={formData.openingBalanceType}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="debit">Debit</option>
                    <option value="credit">Credit</option>
                  </select>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    editingStation ? 'Update' : 'Create'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DieselStations;

