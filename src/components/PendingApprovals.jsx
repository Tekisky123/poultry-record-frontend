import { useState } from 'react';
import CustomerApprovalModal from './CustomerApprovalModal';
import ConfirmationModal from './ConfirmationModal';

const PendingApprovals = ({ pendingUsers, onApprove, onReject }) => {
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [pendingAction, setPendingAction] = useState(null); // 'approve' or 'reject'
    const getRoleBadgeColor = (role) => {
        switch (role) {
            case 'superadmin': return 'bg-green-100 text-green-800';
            case 'admin': return 'bg-red-100 text-red-800';
            case 'supervisor': return 'bg-blue-100 text-blue-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
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
                                <td className="px-6 py-3 text-sm">
                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getRoleBadgeColor(u.role)}`}>
                                        {u.role}
                                    </span>
                                </td>
                                <td className="px-6 py-3 text-sm text-gray-700">
                                    <div>{u.mobileNumber}</div>
                                    {u.email && <div className="text-gray-500">{u.email}</div>}
                                </td>
                                <td className="px-6 py-3 text-right space-x-2">
                                    <button
                                        onClick={() => {
                                          setSelectedUser(u);
                                          setPendingAction('approve');
                                          setShowConfirmationModal(true);
                                        }}
                                        className="inline-flex items-center px-3 py-1.5 rounded-md text-white bg-green-600 hover:bg-green-700"
                                    >
                                        Approve
                                    </button>
                                    <button
                                        onClick={() => {
                                          setSelectedUser(u);
                                          setPendingAction('reject');
                                          setShowConfirmationModal(true);
                                        }}
                                        className="inline-flex items-center px-3 py-1.5 rounded-md text-white bg-red-600 hover:bg-red-700"
                                    >
                                        Reject
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            
            {/* Confirmation Modal */}
            <ConfirmationModal
              show={showConfirmationModal}
              onClose={() => {
                setShowConfirmationModal(false);
                setSelectedUser(null);
                setPendingAction(null);
              }}
              onConfirm={() => {
                setShowConfirmationModal(false);
                if (pendingAction === 'approve') {
                  if (selectedUser?.role === 'customer') {
                    setShowApprovalModal(true);
                  } else {
                    onApprove(selectedUser._id);
                    setSelectedUser(null);
                    setPendingAction(null);
                  }
                } else if (pendingAction === 'reject') {
                  onReject(selectedUser._id);
                  setSelectedUser(null);
                  setPendingAction(null);
                }
              }}
              title={pendingAction === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
              message={
                pendingAction === 'approve'
                  ? `Are you sure you want to approve ${selectedUser?.name}? This action will grant them access to the system.`
                  : `Are you sure you want to reject ${selectedUser?.name}? This action cannot be undone.`
              }
              confirmText={pendingAction === 'approve' ? 'Yes, Approve' : 'Yes, Reject'}
              cancelText="Cancel"
              confirmColor={pendingAction === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
            />
            
            {/* Customer Approval Modal */}
            <CustomerApprovalModal
              show={showApprovalModal}
              onClose={() => {
                setShowApprovalModal(false);
                setSelectedUser(null);
                setPendingAction(null);
              }}
              user={selectedUser}
              onApprove={onApprove}
            />
        </div>
    );
};

export default PendingApprovals;
