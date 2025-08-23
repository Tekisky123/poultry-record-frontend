import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/axios';

const UserModal = ({
  show,
  onClose,
  user,
  isEdit,
  onSubmit,
  onDelete,
 currentUser,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobileNumber: '',
    role: 'supervisor',
    isActive: true,
  });

  useEffect(() => {
    if (isEdit && user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        mobileNumber: user.mobileNumber || '',
        role: user.role || 'supervisor',
        isActive: user.isActive || true,
      });
    } else {
      setFormData({
        name: '',
        email: '',
        mobileNumber: '',
        role: 'supervisor',
        isActive: true,
      });
    }
  }, [user, isEdit, show]);
  

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      onDelete(user._id);
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  {isEdit ? 'Edit User' : 'Add New User'}
                </h3>
                <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                      Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      id="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                      Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      id="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="mobileNumber" className="block text-sm font-medium text-gray-700">
                      Mobile Number
                    </label>
                    <input
                      type="text"
                      name="mobileNumber"
                      id="mobileNumber"
                      value={formData.mobileNumber}
                      onChange={handleChange}
                      required
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                      Role
                    </label>
                    <select
                      name="role"
                      id="role"
                      value={formData.role}
                      onChange={handleChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      {currentUser.role === 'superadmin' && (<option value="superadmin">Super Admin</option>)}
                      <option value="admin">Admin</option>
                      <option value="supervisor">Supervisor</option>
                    </select>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      name="isActive"
                      id="isActive"
                      checked={formData.isActive}
                      onChange={handleChange}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label htmlFor="isActive" className="ml-2 block text-sm text-gray-700">
                      Active
                    </label>
                  </div>
                  <div className="flex justify-end space-x-3">
                    {isEdit && user?._id !== currentUser?._id && (
                      <button
                        type="button"
                        onClick={handleDelete}
                        className="inline-flex items-center px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                      >
                        Delete
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={onClose}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="inline-flex items-center px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      {isEdit ? 'Update' : 'Add'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Users = () => {
  const [users, setUsers] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [filterRole, setFilterRole] = useState('all');
  const [isEdit, setIsEdit] = useState(false);
  const { user: currentUser } = useAuth();
  const canApprove = currentUser?.role === 'admin' || currentUser?.role === 'superadmin';

  useEffect(() => {
    fetchUsers();
    if (canApprove) {
      fetchPendingApprovals();
    }
  }, []);

  const fetchUsers = async () => {
    try {
      const { data } = await api.get('/user');
      setUsers(data?.data || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingApprovals = async () => {
    try {
      const { data } = await api.get('/user/approvals/pending');
      setPendingUsers(data?.data || []);
    } catch (err) {
      console.error('Pending approvals fetch error:', err.message);
    }
  };

  const approveUser = async (userId) => {
    try {
      await api.patch(`/user/${userId}/approve`);
      setPendingUsers((prev) => prev.filter((u) => u._id !== userId));
      fetchUsers();
    } catch (err) {
      setError(err.message || 'Failed to approve user');
    }
  };

  const rejectUser = async (userId) => {
    try {
      await api.patch(`/user/${userId}/reject`);
      setPendingUsers((prev) => prev.filter((u) => u._id !== userId));
    } catch (err) {
      setError(err.message || 'Failed to reject user');
    }
  };

  const handleStatusToggle = async (userId, currentStatus) => {
    try {
      await api.patch(`/user/${userId}/status`, { isActive: !currentStatus });
      setUsers(users.map(user =>
        user._id === userId
          ? { ...user, isActive: !currentStatus }
          : user
      ));
    } catch (err) {
      setError(err.message || 'Failed to update user status');
    }
  };

  const handleAddUser = async (formData) => {
    try {
      const { data } = await api.post('/user', formData);
      setUsers([...users, data.data]);
      setShowModal(false);
    } catch (err) {
      setError(err.message || 'Failed to add user');
    }
  };

  const handleEditUser = async (formData) => {
    try {
      const { data } = await api.put(`/user/${selectedUser._id}`, formData);
      setUsers(users.map(user =>
        user._id === selectedUser._id ? data.data : user
      ));
      setShowModal(false);
    } catch (err) {
      setError(err.message || 'Failed to edit user');
    }
  };

  const handleDeleteUser = async (userId) => {
    try {
      await api.delete(`/user/${userId}`);
      setUsers(users.filter(user => user._id !== userId));
      setShowModal(false);
    } catch (err) {
      setError(err.message || 'Failed to delete user');
    }
  };

  const filteredUsers = users.filter(user => {
    if (filterRole === 'all') return true;
    return user.role === filterRole;
  });

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'superadmin': return 'bg-green-100 text-green-800';
      case 'admin': return 'bg-red-100 text-red-800';
      case 'supervisor': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusBadgeColor = (isActive) => {
    return isActive
      ? 'bg-green-100 text-green-800'
      : 'bg-red-100 text-red-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage all users in the system
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button
            onClick={() => {
              setIsEdit(false);
              setSelectedUser(null);
              setShowModal(true);
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <svg className="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add User
          </button>
        </div>
      </div>

      {/* Pending Approvals */}
      {canApprove && pendingUsers.length > 0 && (
        <div className="bg-white p-4 rounded-lg shadow border border-yellow-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Pending Approvals</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-3 text-right"></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {pendingUsers.map((u) => (
                  <tr key={u._id}>
                    <td className="px-6 py-3 text-sm text-gray-900">{u.name}</td>
                    <td className="px-6 py-3 text-sm"><span className={`px-2 py-1 rounded-full text-xs font-semibold ${getRoleBadgeColor(u.role)}`}>{u.role}</span></td>
                    <td className="px-6 py-3 text-sm text-gray-700">
                      <div>{u.mobileNumber}</div>
                      {u.email && <div className="text-gray-500">{u.email}</div>}
                    </td>
                    <td className="px-6 py-3 text-right space-x-2">
                      <button onClick={() => approveUser(u._id)} className="inline-flex items-center px-3 py-1.5 rounded-md text-white bg-green-600 hover:bg-green-700">
                        Approve
                      </button>
                      <button onClick={() => rejectUser(u._id)} className="inline-flex items-center px-3 py-1.5 rounded-md text-white bg-red-600 hover:bg-red-700">
                        Reject
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex flex-wrap gap-4">
          <div>
            <label htmlFor="role-filter" className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Role
            </label>
            <select
              id="role-filter"
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="all">All Roles</option>
              <option value="superadmin">Super Admin</option>
              <option value="admin">Admin</option>
              <option value="supervisor">Supervisor</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Login</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        {user.profileImage ? (
                          <img className="h-10 w-10 rounded-full" src={user.profileImage} alt="" />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-indigo-600 flex items-center justify-center">
                            <span className="text-white font-medium text-sm">
                              {user.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{user.name}</div>
                        <div className="text-sm text-gray-500">ID: {user._id.slice(-6)}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleBadgeColor(user.role)}`}>
                      {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{user.mobileNumber}</div>
                    {user.email && (
                      <div className="text-sm text-gray-500">{user.email}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(user.isActive)}`}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.lastLogin
                      ? new Date(user.lastLogin).toLocaleDateString()
                      : 'Never'
                    }
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleStatusToggle(user._id, user.isActive)}
                        disabled={user._id === currentUser?._id || user.role === 'superadmin'}
                        className={`text-sm px-3 py-1 rounded-md ${user._id === currentUser?._id || user.role === 'superadmin'
                          ? 'text-gray-400 cursor-not-allowed'
                          : user.isActive
                            ? 'text-red-600 hover:text-red-900'
                            : 'text-green-600 hover:text-green-900'
                          }`}
                      >
                        {user.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        disabled={currentUser?.role === 'admin' && user.role === 'superadmin'}
                        onClick={() => {
                          setIsEdit(true);
                          setSelectedUser(user);
                          setShowModal(true);
                        }}
                        className={`${currentUser?.role === 'admin' && user.role === 'superadmin' ? 'text-gray-400 cursor-not-allowed' : 'text-indigo-600 hover:text-indigo-900 '}`}
                      >
                        Edit
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Empty State */}
      {filteredUsers.length === 0 && (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No users found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {filterRole === 'all'
              ? 'Get started by creating a new user.'
              : `No users found with the role "${filterRole}".`
            }
          </p>
        </div>
      )}

      {/* Modal */}
      <UserModal
        show={showModal}
        onClose={() => setShowModal(false)}
        user={selectedUser}
        isEdit={isEdit}
        onSubmit={isEdit ? handleEditUser : handleAddUser}
        onDelete={handleDeleteUser}
       currentUser={currentUser}
      />
    </div>
  );
};

export default Users;
