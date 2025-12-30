import React, { useState, useEffect } from 'react';
import { Settings, Save, Loader2, MessageSquare, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/axios'

export default function SettingsPage() {
    const { user } = useAuth();
    const [settings, setSettings] = useState({});
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            setLoading(true);
            const response = await api.get('/settings');
            if (response.data.success) {
                setSettings(response.data.data);
            }
        } catch (err) {
            console.error('Error fetching settings:', err);
            setError('Failed to load settings. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const updateSetting = async (key, value) => {
        try {
            setUpdating(key); // track which key is updating
            setError(null);
            setSuccess(null);

            const response = await api.post('/settings', { key, value });

            if (response.data.success) {
                setSettings(prev => ({
                    ...prev,
                    [key]: value
                }));
                setSuccess('Settings updated successfully');

                // Clear success message after 3 seconds
                setTimeout(() => setSuccess(null), 3000);
            }
        } catch (err) {
            console.error('Error updating setting:', err);
            setError('Failed to update setting. Please try again.');
        } finally {
            setUpdating(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="animate-spin text-blue-600" size={32} />
            </div>
        );
    }

    // Only Super Admin allowed
    if (user?.role !== 'superadmin') {
        return (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <AlertCircle size={48} className="mb-4 text-red-500" />
                <h2 className="text-xl font-semibold">Access Denied</h2>
                <p>You do not have permission to view this page.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
                        <Settings size={28} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
                        <p className="text-gray-500">Manage global application configurations</p>
                    </div>
                </div>
            </div>

            {error && (
                <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-2">
                    <AlertCircle size={20} />
                    {error}
                </div>
            )}

            {success && (
                <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg flex items-center gap-2">
                    <CheckCircle2 size={20} />
                    {success}
                </div>
            )}

            <div className="grid grid-cols-1 gap-6">
                {/* SMS Configuration Card */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-6 border-b border-gray-100 flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg">
                            <MessageSquare size={20} />
                        </div>
                        <h2 className="text-lg font-semibold text-gray-800">SMS Notifications</h2>
                    </div>

                    <div className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-base font-medium text-gray-900">Enable SMS Notifications</h3>
                                <p className="text-sm text-gray-500 mt-1">
                                    When enabled, the system will allow sending SMS alerts for Sales and Receipts.
                                    <br />
                                    <span className="text-xs text-orange-600 font-medium">Note: Costs may apply per SMS.</span>
                                </p>
                            </div>

                            <div className="flex items-center gap-3">
                                <span className={`text-sm font-medium ${settings.SMS_ENABLED ? 'text-green-600' : 'text-gray-500'}`}>
                                    {settings.SMS_ENABLED ? 'Active' : 'Inactive'}
                                </span>

                                <button
                                    onClick={() => updateSetting('SMS_ENABLED', !settings.SMS_ENABLED)}
                                    disabled={updating === 'SMS_ENABLED'}
                                    className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${settings.SMS_ENABLED ? 'bg-blue-600' : 'bg-gray-200'
                                        }`}
                                >
                                    <span
                                        className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform shadow-sm ${settings.SMS_ENABLED ? 'translate-x-6' : 'translate-x-1'
                                            }`}
                                    />
                                    {updating === 'SMS_ENABLED' && (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <Loader2 size={12} className="animate-spin text-blue-600 opacity-70" />
                                        </div>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gray-50 p-4 border-t border-gray-100 text-xs text-gray-500 flex justify-between items-center">
                        <span>Changes take effect immediately for all users.</span>
                    </div>
                </div>

                {/* Placeholder for future settings */}
                {/* <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 opacity-50 cursor-not-allowed">
           <h3 className="text-lg font-semibold mb-2">General Settings</h3>
           <p>More configuration options coming soon...</p>
        </div> */}
            </div>
        </div>
    );
}
