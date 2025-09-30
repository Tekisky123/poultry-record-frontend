import { useAuth } from '../contexts/AuthContext';
import { useUsers } from '../hooks/useUsers';
import UserModal from '../components/UserModal';
import UserTable from '../components/UserTable';
import PendingApprovals from '../components/PendingApprovals';
import { useState } from 'react';
import SuccessModal from '../components/SuccessModal';

const UsersList = () => {
  const { user: currentUser } = useAuth();
  const {
    users,
    pendingUsers,
    loading,
    error,
    setError,
    canApprove,
    approveUser,
    rejectUser,
    toggleUserStatus,
    addUser,
    editUser,
    deleteUser,
    refetchUsers,
  } = useUsers(currentUser);

  const [showModal, setShowModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [isEdit, setIsEdit] = useState(false);
  const [filterRole, setFilterRole] = useState('all');

  const handleAddUser = async (formData) => {
    const result = await addUser(formData);
    if (result.success) {
      setShowModal(false);
      setError('')
      setModalMessage('User created successfully!');
      setShowSuccessModal(true);
    }
  };

  const handleEditUser = async (formData) => {
    const result = await editUser(selectedUser._id, formData);
    if (result.success) {
      setShowModal(false);
      setError('')
      setModalMessage('User updated successfully!');
      setShowSuccessModal(true);
    }
  };

  const handleDeleteUser = async (userId) => {
    const result = await deleteUser(userId);
    if (result.success) {
      setShowModal(false);
      setError('')
      setModalMessage('User deleted successfully!');
      setShowSuccessModal(true);
    }
  };

  const filteredUsers = users.filter(user => {
    if (filterRole === 'all') return true;
    return user.role === filterRole;
  });

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
          <p className="mt-1 text-sm text-gray-500">Manage all users in the system</p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button
            onClick={() => {
              setIsEdit(false);
              setSelectedUser(null);
              setShowModal(true);
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <svg className="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add User
          </button>
        </div>
      </div>

      <SuccessModal
        show={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        message={modalMessage}
      />

      {/* Pending Approvals */}
      {canApprove && pendingUsers.length > 0 && (
        <PendingApprovals
          pendingUsers={pendingUsers}
          onApprove={approveUser}
          onReject={rejectUser}
        />
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
              <option value="customer">Customers</option>
            </select>
          </div>
        </div>
      </div>

      

      {/* Error Message */}
      {error && showModal && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {/* Users Table */}
      <UserTable
        users={filteredUsers}
        currentUserId={currentUser?._id}
        currentUser={currentUser}
        onStatusToggle={toggleUserStatus}
        onEdit={(user) => {
          setIsEdit(true);
          setSelectedUser(user);
          setShowModal(true);
        }}
      />
      

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
              : `No users found with the role "${filterRole}".`}
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
        currentUserId={currentUser?._id}
        currentUser={currentUser}
        error={error}
        setError={setError}
      />
      
    </div>
    
  );
};

export default UsersList;
