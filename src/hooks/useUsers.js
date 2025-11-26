import { useState, useEffect } from 'react';
import api from '../lib/axios';

export const useUsers = (currentUser) => {
    const [users, setUsers] = useState([]);
    const [pendingUsers, setPendingUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const canApprove = currentUser?.role === 'admin' || currentUser?.role === 'superadmin';

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

    const approveUser = async (userId, customerData = null) => {
        try {
            const payload = customerData ? { group: customerData.group, openingBalance: customerData.openingBalance || 0 } : {};
            await api.patch(`/user/${userId}/approve`, payload);
            setPendingUsers((prev) => prev.filter((u) => u._id !== userId));
            fetchUsers();
        } catch (err) {
            setError(err.message || 'Failed to approve user');
            throw err;
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

    const toggleUserStatus = async (userId, currentStatus) => {
        try {
            await api.patch(`/user/${userId}/status`, { isActive: !currentStatus });
            setUsers(users.map(user =>
                user._id === userId ? { ...user, isActive: !currentStatus } : user
            ));
        } catch (err) {
            setError(err.message || 'Failed to update user status');
        }
    };

    const addUser = async (formData) => {
        try {
            const { data } = await api.post('/user', formData);
            setPendingUsers([...pendingUsers, data.data]);
            return { success: true };
        } catch (err) {
            setError(err.message || 'Failed to add user');
            return { success: false, message: err.message };
        }
    };

    const editUser = async (userId, formData) => {
        try {
            const { data } = await api.patch(`/user/${userId}`, formData);
            setUsers(users.map(user =>
                user._id === userId ? data.data : user
            ));
            return { success: true };
        } catch (err) {
            setError(err.message || 'Failed to edit user');
            return { success: false, message: err.message };
        }
    };

    const deleteUser = async (userId) => {
        try {
            await api.delete(`/user/${userId}`);
            setUsers(users.filter(user => user._id !== userId));
            return { success: true };
        } catch (err) {
            setError(err.message || 'Failed to delete user');
            return { success: false, message: err.message };
        }
    };

    useEffect(() => {
        fetchUsers();
        if (canApprove) {
            fetchPendingApprovals();
        }
    }, []);

    return {
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
        refetchUsers: fetchUsers,
    };
};
