import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Download, ArrowLeft } from 'lucide-react';
import * as XLSX from 'xlsx';
import api from '../lib/axios';

import { useSearchParams } from 'react-router-dom';

export default function TripDailySummary() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [error, setError] = useState('');

    // Default to current month and year, or from query params
    const today = new Date();
    const [month, setMonth] = useState(() => {
        const queryMonth = searchParams.get('month');
        return queryMonth ? parseInt(queryMonth) : today.getMonth() + 1;
    });
    const [year, setYear] = useState(() => {
        const queryYear = searchParams.get('year');
        return queryYear ? parseInt(queryYear) : today.getFullYear();
    });

    useEffect(() => {
        fetchDailySummary();
    }, [month, year]);

    const fetchDailySummary = async () => {
        try {
            setLoading(true);
            setError('');
            const params = { month, year };

            const response = await api.get('/trip/stats/daily', { params });
            if (response.data.success) {
                setData(response.data.data);
            }
        } catch (err) {
            console.error('Error fetching daily summary:', err);
            setError(err.response?.data?.message || 'Failed to fetch daily summary');
        } finally {
            setLoading(false);
        }
    };

    const handleDayClick = (day) => {
        // day.date is YYYY-MM-DD
        navigate(`/trips/list?startDate=${day.date}&endDate=${day.date}`);
    };

    const handleExportToExcel = () => {
        if (!data) return;

        const exportData = data.days.map(day => ({
            Date: day.displayDate,
            'Trip Count': day.tripCount,
            'Total Profit': day.netProfit || 0,
            'Total Rent': day.grossRent || 0
        }));

        // Add Totals Row
        exportData.push({
            Date: 'Grand Total',
            'Trip Count': data.totals.tripCount,
            'Total Profit': data.totals.netProfit,
            'Total Rent': data.totals.grossRent
        });

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Daily Trip Summary");
        XLSX.writeFile(wb, `Trip_Daily_Summary_${month}_${year}.xlsx`);
    };

    // Helper to generate year options
    const yearOptions = [];
    for (let y = 2024; y <= today.getFullYear() + 1; y++) {
        yearOptions.push(y);
    }

    const monthOptions = [
        { value: 1, label: 'January' },
        { value: 2, label: 'February' },
        { value: 3, label: 'March' },
        { value: 4, label: 'April' },
        { value: 5, label: 'May' },
        { value: 6, label: 'June' },
        { value: 7, label: 'July' },
        { value: 8, label: 'August' },
        { value: 9, label: 'September' },
        { value: 10, label: 'October' },
        { value: 11, label: 'November' },
        { value: 12, label: 'December' }
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Trip Daily Summary</h1>
                        <p className="text-gray-600 mt-1">Breakdown of Profit and Rent by Day</p>
                    </div>
                </div>

                <div className="flex flex-wrap gap-3 items-center">
                    {/* Filters */}
                    <select
                        value={month}
                        onChange={(e) => setMonth(parseInt(e.target.value))}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                        {monthOptions.map(m => (
                            <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                    </select>

                    <select
                        value={year}
                        onChange={(e) => setYear(parseInt(e.target.value))}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                        {yearOptions.map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>

                    <button
                        onClick={handleExportToExcel}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-sm transition-colors"
                        disabled={!data}
                    >
                        <Download size={20} />
                        <span className="font-medium">Export Excel</span>
                    </button>
                </div>
            </div>

            {loading && !data ? (
                <div className="flex justify-center p-12"><Loader2 className="animate-spin w-8 h-8 text-blue-600" /></div>
            ) : error ? (
                <div className="p-4 text-center">
                    <p className="text-red-500 mb-4">{error}</p>
                    <button onClick={fetchDailySummary} className="px-4 py-2 bg-blue-600 text-white rounded">Retry</button>
                </div>
            ) : data ? (
                /* Summary Table */
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="border-b-2 border-gray-300 bg-gray-50">
                                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Date</th>
                                    <th className="text-right py-3 px-4 font-semibold text-gray-900">Trip Count</th>
                                    <th className="text-right py-3 px-4 font-semibold text-gray-900">Total Profit</th>
                                    <th className="text-right py-3 px-4 font-semibold text-gray-900">Total Rent</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.days.map((day) => (
                                    <tr
                                        key={day.day}
                                        className={`border-b border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors ${day.tripCount === 0 ? 'opacity-50' : ''}`}
                                        onClick={() => day.tripCount > 0 && handleDayClick(day)}
                                    >
                                        <td className="py-3 px-4 text-blue-600 font-medium hover:underline">{day.displayDate}</td>
                                        <td className="py-3 px-4 text-right text-gray-700">
                                            {day.tripCount}
                                        </td>
                                        <td className="py-3 px-4 text-right text-gray-700 font-medium">
                                            {day.netProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="py-3 px-4 text-right text-gray-700 font-medium">
                                            {day.grossRent.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
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
            ) : null}
        </div>
    );
}
