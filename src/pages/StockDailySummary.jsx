import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, Download, ArrowLeft, Calendar } from 'lucide-react';
import * as XLSX from 'xlsx';
import api from '../lib/axios';
import { useAuth } from '../contexts/AuthContext';

export default function StockDailySummary() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const year = searchParams.get('year') || new Date().getFullYear();
    const month = searchParams.get('month') || new Date().getMonth() + 1;

    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        if (user?.role === 'supervisor' && !user?.canManageStock) {
            navigate('/');
        }
    }, [user, navigate]);

    useEffect(() => {
        fetchDailySummary();
    }, [year, month]);

    const fetchDailySummary = async () => {
        try {
            setLoading(true);
            setError('');
            const response = await api.get('/inventory-stock/stats/daily', {
                params: { year, month }
            });
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

    const handleDayClick = (dayData) => {
        // Navigate to Detailed Report for that day (Stock View filtered by date)
        const basePath = user?.role === 'supervisor' ? '/supervisor/stocks/manage' : '/stocks/manage';
        navigate(`${basePath}?date=${dayData.formattedDate}`);
    };

    const handleExportToExcel = () => {
        if (!data) return;

        const exportData = data.days.map(day => ({
            Date: day.formattedDate,
            'Purchase Amount': day.totalPurchaseAmount || 0,
            'Sale Amount': day.totalSaleAmount || 0,
            'Mortality (Birds)': day.totalMortalityBirds || 0,
            'Feed Consume Amount': day.totalFeedConsumeAmount || 0
        }));

        // Add Totals Row
        exportData.push({
            Date: 'Grand Total',
            'Purchase Amount': data.totals.totalPurchaseAmount,
            'Sale Amount': data.totals.totalSaleAmount,
            'Mortality (Birds)': data.totals.totalMortalityBirds,
            'Feed Consume Amount': data.totals.totalFeedConsumeAmount
        });

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Daily Stock Summary");
        XLSX.writeFile(wb, `Stock_Daily_Summary_${year}_${month}.xlsx`);
    };

    const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long' });

    if (loading && !data) return <div className="flex justify-center p-12"><Loader2 className="animate-spin w-8 h-8 text-blue-600" /></div>;
    if (error) return <div className="p-4 text-center">
        <p className="text-red-500 mb-4">{error}</p>
        <button onClick={fetchDailySummary} className="px-4 py-2 bg-blue-600 text-white rounded">Retry</button>
    </div>;
    if (!data) return null;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(user?.role === 'supervisor' ? '/supervisor/stocks' : '/stocks')}
                        className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                            <Calendar className="w-8 h-8" />
                            {monthName} {year} - Daily Summary
                        </h1>
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
                                <th className="text-left py-3 px-4 font-semibold text-gray-900">Date</th>
                                <th className="text-right py-3 px-4 font-semibold text-gray-900">Purchase Amt</th>
                                <th className="text-right py-3 px-4 font-semibold text-gray-900">Sale Amt</th>
                                <th className="text-right py-3 px-4 font-semibold text-gray-900">Mortality (Birds)</th>
                                <th className="text-right py-3 px-4 font-semibold text-gray-900">Feed Consume Amt</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(() => {
                                // Generate all days in the month
                                const daysInMonth = new Date(year, month, 0).getDate();
                                const fullDays = [];
                                for (let i = 1; i <= daysInMonth; i++) {
                                    // Create date object in UTC/Local correctly to avoid timezone shifts
                                    // Using string construction to ensure YYYY-MM-DD format match
                                    const day = i < 10 ? `0${i}` : i;
                                    const monthStr = month < 10 ? `0${month}` : month;
                                    const dateStr = `${year}-${monthStr}-${day}`;

                                    const existingDay = data.days.find(d => d.formattedDate === dateStr);

                                    if (existingDay) {
                                        fullDays.push(existingDay);
                                    } else {
                                        fullDays.push({
                                            date: new Date(year, month - 1, i).toISOString(),
                                            formattedDate: dateStr,
                                            totalPurchaseAmount: 0,
                                            totalSaleAmount: 0,
                                            totalMortalityBirds: 0,
                                            totalFeedConsumeAmount: 0
                                        });
                                    }
                                }

                                // Sort descending (newest first)
                                fullDays.sort((a, b) => new Date(b.formattedDate) - new Date(a.formattedDate));

                                return fullDays.map((day) => (
                                    <tr
                                        key={day.formattedDate}
                                        className="border-b border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors"
                                        onClick={() => handleDayClick(day)}
                                    >
                                        <td className="py-3 px-4 text-blue-600 font-medium hover:underline">
                                            {new Date(day.date).toLocaleDateString()}
                                        </td>
                                        <td className="py-3 px-4 text-right text-gray-700">
                                            {day.totalPurchaseAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="py-3 px-4 text-right text-gray-700 font-medium">
                                            {day.totalSaleAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="py-3 px-4 text-right text-gray-700 font-medium text-red-600">
                                            {day.totalMortalityBirds}
                                        </td>
                                        <td className="py-3 px-4 text-right text-gray-700 font-medium">
                                            {day.totalFeedConsumeAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                ));
                            })()}
                            <tr className="bg-gray-100 font-bold border-t-2 border-gray-300">
                                <td className="py-3 px-4 text-gray-900">Grand Total</td>
                                <td className="py-3 px-4 text-right text-gray-900">
                                    {(data.totals.totalPurchaseAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="py-3 px-4 text-right text-gray-900">
                                    {(data.totals.totalSaleAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="py-3 px-4 text-right text-gray-900 text-red-600">
                                    {data.totals.totalMortalityBirds || 0}
                                </td>
                                <td className="py-3 px-4 text-right text-gray-900">
                                    {(data.totals.totalFeedConsumeAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
