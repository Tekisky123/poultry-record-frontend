import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Download } from 'lucide-react';
import api from '../lib/axios';
import { useAuth } from '../contexts/AuthContext';

export default function MonthlySummary() {
    const { type, id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [error, setError] = useState('');
    const [year, setYear] = useState(''); // Optional, default to current FY in backend if empty

    const hasAdminAccess = user?.role === 'admin' || user?.role === 'superadmin';

    useEffect(() => {
        if (hasAdminAccess && id) {
            fetchMonthlySummary();
        }
    }, [id, type, year, hasAdminAccess]);

    const fetchMonthlySummary = async () => {
        try {
            setLoading(true);
            setError('');
            const params = { type };
            if (year) params.year = year;

            const response = await api.get(`/ledger/${id}/monthly-summary`, { params });
            if (response.data.success) {
                setData(response.data.data);
            }
        } catch (err) {
            console.error('Error fetching monthly summary:', err);
            setError(err.response?.data?.message || 'Failed to fetch monthly summary');
        } finally {
            setLoading(false);
        }
    };

    const handleMonthClick = (month) => {
        // Navigate to details page with date filter
        // Format dates as YYYY-MM-DD
        const startDate = new Date(month.startDate).toISOString().split('T')[0];
        const endDate = new Date(month.endDate).toISOString().split('T')[0]; // This is actually start of next month in backend logic?
        // Backend: month.endDate = Start of Next Month.
        // Frontend date filter expects inclusive end date?
        // CustomerDetails: filter.endDate -> setHours(23,59,59,999).
        // So if I pass '2025-05-01' as endDate, it covers up to May 1st 23:59.
        // If backend returns Apr 1 to May 1.
        // I should pass End Date as April 30.
        // Let's adjust endDate.
        const actualEndDate = new Date(month.endDate);
        actualEndDate.setDate(actualEndDate.getDate() - 1);
        const endDateStr = actualEndDate.toISOString().split('T')[0];

        const targetPath = type === 'customer' ? `/customers/${id}` :
            type === 'vendor' ? `/vendors/${id}` : null;

        if (targetPath) {
            // Pass via state or query params. CustomerDetails needs update to read query params.
            // For now let's use search params
            navigate(`${targetPath}?startDate=${startDate}&endDate=${endDateStr}`);
        }
    };

    if (!hasAdminAccess) return <div className="p-4 text-red-600">Access Denied</div>;
    if (loading && !data) return <div className="flex justify-center p-12"><Loader2 className="animate-spin w-8 h-8 text-blue-600" /></div>;
    if (error) return <div className="p-4 text-center">
        <p className="text-red-500 mb-4">{error}</p>
        <button onClick={fetchMonthlySummary} className="px-4 py-2 bg-blue-600 text-white rounded">Retry</button>
    </div>;
    if (!data) return null;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <p className="text-gray-600 mt-1">Monthly Summary</p>
                        <h1 className="text-3xl font-bold text-gray-900 capitalize">{data.subject.name}</h1>
                        <p className="text-sm text-gray-500 capitalize">{data.subject.type}</p>
                    </div>
                </div>
            </div>

            {/* Summary Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-900">Monthly Breakdown</h2>
                    <div className="text-sm text-gray-600">
                        Opening Balance: <span className="font-semibold">
                            {data.openingBalance?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            <span className="ml-1 uppercase text-xs">{data.openingBalanceType?.charAt(0) || 'D'}r</span>
                        </span>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="border-b-2 border-gray-300 bg-gray-50">
                                <th className="text-left py-3 px-4 font-semibold text-gray-900">Month</th>
                                <th className="text-right py-3 px-4 font-semibold text-gray-900">Debit</th>
                                <th className="text-right py-3 px-4 font-semibold text-gray-900">Credit</th>
                                <th className="text-right py-3 px-4 font-semibold text-gray-900">Closing Balance</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.months.map((month, index) => (
                                <tr
                                    key={month.name}
                                    className="border-b border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors"
                                    onClick={() => handleMonthClick(month)}
                                >
                                    <td className="py-3 px-4 text-blue-600 font-medium hover:underline">{month.name}</td>
                                    <td className="py-3 px-4 text-right text-gray-700">
                                        {month.debit > 0 ? month.debit.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}
                                    </td>
                                    <td className="py-3 px-4 text-right text-gray-700">
                                        {month.credit > 0 ? month.credit.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}
                                    </td>
                                    <td className="py-3 px-4 text-right font-medium text-gray-900">
                                        {month.closingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        <span className="ml-1 text-xs text-gray-500 uppercase">{month.closingBalanceType ? month.closingBalanceType.charAt(0) + 'r' : ''}</span>
                                    </td>
                                </tr>
                            ))}
                            <tr className="bg-gray-100 font-bold border-t-2 border-gray-300">
                                <td className="py-3 px-4 text-gray-900">Total</td>
                                <td className="py-3 px-4 text-right text-gray-900">
                                    {data.totals.debit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="py-3 px-4 text-right text-gray-900">
                                    {data.totals.credit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="py-3 px-4 text-right text-gray-900">
                                    {/* Closing Balance of the year is the closing balance of the last month */}
                                    {data.months[data.months.length - 1].closingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    <span className="ml-1 text-xs text-gray-500 uppercase">
                                        {data.months[data.months.length - 1].closingBalanceType?.charAt(0) + 'r'}
                                    </span>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
