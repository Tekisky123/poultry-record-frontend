import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import api from '../lib/axios';
import { useAuth } from '../contexts/AuthContext';

export default function TripMonthlySummary() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [error, setError] = useState('');
    const [year, setYear] = useState('');

    useEffect(() => {
        fetchMonthlySummary();
    }, [year]);

    const fetchMonthlySummary = async () => {
        try {
            setLoading(true);
            setError('');
            const params = {};
            if (year) params.year = year;

            const response = await api.get('/trip/stats/monthly', { params });
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
        const startDate = new Date(month.startDate).toISOString().split('T')[0];
        // backend returns endDate as 1st of next month.
        // We want the last day of current month for the filter.
        const actualEndDate = new Date(month.endDate);
        actualEndDate.setDate(actualEndDate.getDate() - 1);
        const endDateStr = actualEndDate.toISOString().split('T')[0];

        navigate(`/trips/list?startDate=${startDate}&endDate=${endDateStr}`);
    };

    const handleExportToExcel = () => {
        if (!data) return;

        const exportData = data.months.map(month => ({
            Month: month.name,
            'Trip Count': month.tripCount,
            'Total Profit': month.netProfit || 0,
            'Total Rent': month.grossRent || 0
        }));

        // Add Totals Row
        exportData.push({
            Month: 'Grand Total',
            'Trip Count': data.totals.tripCount,
            'Total Profit': data.totals.netProfit,
            'Total Rent': data.totals.grossRent
        });

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Monthly Trip Summary");
        XLSX.writeFile(wb, "Trip_Monthly_Summary.xlsx");
    };

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
                    {/* Back button logic can be adjusted if needed, but history back is fine */}
                    {/* <button
                        onClick={() => navigate(-1)}
                        className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <ArrowLeft size={20} />
                    </button> */}
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Trip Monthly Summary</h1>
                        <p className="text-gray-600 mt-1">Breakdown of Profit and Rent by Month</p>
                    </div>
                </div>
                <div className="flex gap-3 mt-4 sm:mt-0">
                    <button
                        onClick={handleExportToExcel}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-sm transition-colors"
                    >
                        <Download size={20} />
                        <span className="font-medium">Export Excel</span>
                    </button>
                </div>
            </div>

            {/* Summary Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="border-b-2 border-gray-300 bg-gray-50">
                                <th className="text-left py-3 px-4 font-semibold text-gray-900">Month</th>
                                <th className="text-right py-3 px-4 font-semibold text-gray-900">Trip Count</th>
                                <th className="text-right py-3 px-4 font-semibold text-gray-900">Total Profit</th>
                                <th className="text-right py-3 px-4 font-semibold text-gray-900">Total Rent</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.months.map((month) => (
                                <tr
                                    key={month.name}
                                    className="border-b border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors"
                                    onClick={() => handleMonthClick(month)}
                                >
                                    <td className="py-3 px-4 text-blue-600 font-medium hover:underline">{month.name}</td>
                                    <td className="py-3 px-4 text-right text-gray-700">
                                        {month.tripCount}
                                    </td>
                                    <td className="py-3 px-4 text-right text-gray-700 font-medium">
                                        {month.netProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="py-3 px-4 text-right text-gray-700 font-medium">
                                        {month.grossRent.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </td>
                                </tr>
                            ))}
                            <tr className="bg-gray-100 font-bold border-t-2 border-gray-300">
                                <td className="py-3 px-4 text-gray-900">Grand Total</td>
                                <td className="py-3 px-4 text-right text-gray-900">
                                    {data.totals.tripCount}
                                </td>
                                <td className="py-3 px-4 text-right text-gray-900">
                                    {data.totals.netProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="py-3 px-4 text-right text-gray-900">
                                    {data.totals.grossRent.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
