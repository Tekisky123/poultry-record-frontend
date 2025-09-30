const PendingApprovals = ({ pendingUsers, onApprove, onReject }) => {
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
                                        onClick={() => onApprove(u._id)}
                                        className="inline-flex items-center px-3 py-1.5 rounded-md text-white bg-green-600 hover:bg-green-700"
                                    >
                                        Approve
                                    </button>
                                    <button
                                        onClick={() => onReject(u._id)}
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
        </div>
    );
};

export default PendingApprovals;
