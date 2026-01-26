import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Download, Package, Calendar } from 'lucide-react';
import * as XLSX from 'xlsx';
import api from '../lib/axios';
import { useAuth } from '../contexts/AuthContext';

export default function StockMonthlySummary() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [error, setError] = useState('');
    const [year, setYear] = useState(new Date().getFullYear());

    useEffect(() => {
        if (user?.role === 'supervisor' && !user?.canManageStock) {
            navigate('/');
        }
    }, [user, navigate]);

    useEffect(() => {
        fetchMonthlySummary();
    }, [year]);

    const fetchMonthlySummary = async () => {
        try {
            setLoading(true);
            setError('');
            const params = {};
            if (year) params.year = year;

            const response = await api.get('/inventory-stock/stats/monthly', { params });
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
        const basePath = user?.role === 'supervisor' ? '/supervisor/stocks/daily' : '/stocks/daily';
        navigate(`${basePath}?year=${year}&month=${month.month}`);
    };

    const getFinancialYearOrder = (monthData) => {
        if (!monthData) return [];
        return [...monthData].sort((a, b) => {
            const orderA = (a.month + 8) % 12;
            const orderB = (b.month + 8) % 12;
            return orderA - orderB;
        });
    };

    const handleExportToExcel = () => {
        if (!data) return;

        const sortedMonths = getFinancialYearOrder(data.months);

        const exportData = sortedMonths.map(month => ({
            Month: month.name,
            'Purchase Amount': month.purchaseAmount || 0,
            'Sale Amount': month.saleAmount || 0,
            'Mortality (Birds)': month.mortalityBirds || 0,
            'Feed Consume Amount': month.feedConsumeAmount || 0
        }));

        // Add Totals Row
        exportData.push({
            Month: 'Grand Total',
            'Purchase Amount': data.totals.purchaseAmount,
            'Sale Amount': data.totals.saleAmount,
            'Mortality (Birds)': data.totals.mortalityBirds,
            'Feed Consume Amount': data.totals.feedConsumeAmount
        });

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Monthly Stock Summary");
        XLSX.writeFile(wb, "Stock_Monthly_Summary.xlsx");
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
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                            <Package className="w-8 h-8" />
                            Stock Monthly Summary
                        </h1>
                        <p className="text-gray-600 mt-1">Overview of Purchases, Sales, and Consumption by Month</p>
                    </div>
                    {/* <button
                        onClick={() => navigate('/stocks/manage')}
                        className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm transition-colors text-sm font-medium"
                    >
                        Manage Stocks
                    </button> */}
                </div>
                <div className="flex gap-3 mt-4 sm:mt-0 items-center">
                    <button
                        onClick={() => {
                            const today = new Date();
                            const y = today.getFullYear();
                            const m = today.getMonth() + 1;
                            const basePath = user?.role === 'supervisor' ? '/supervisor/stocks/daily' : '/stocks/daily';
                            navigate(`${basePath}?year=${y}&month=${m}`);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm transition-colors"
                    >
                        <Calendar size={20} />
                        <span className="font-medium">Current Month</span>
                    </button>
                    <select
                        value={year}
                        onChange={(e) => setYear(Number(e.target.value))}
                        className="p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    >
                        {[0, 1, 2, 3, 4].map(i => {
                            const y = new Date().getFullYear() - i;
                            return <option key={y} value={y}>{y}</option>;
                        })}
                    </select>
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
                                <th className="text-right py-3 px-4 font-semibold text-gray-900">Purchase Amt</th>
                                <th className="text-right py-3 px-4 font-semibold text-gray-900">Sale Amt</th>
                                <th className="text-right py-3 px-4 font-semibold text-gray-900">Mortality (Birds)</th>
                                <th className="text-right py-3 px-4 font-semibold text-gray-900">Feed Consume Amt</th>
                            </tr>
                        </thead>
                        <tbody>
                            {getFinancialYearOrder(data.months).map((month) => (
                                <tr
                                    key={month.name}
                                    className="border-b border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors"
                                    onClick={() => handleMonthClick(month)}
                                >
                                    <td className="py-3 px-4 text-blue-600 font-medium hover:underline">{month.name}</td>
                                    <td className="py-3 px-4 text-right text-gray-700">
                                        {month.purchaseAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="py-3 px-4 text-right text-gray-700 font-medium">
                                        {month.saleAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="py-3 px-4 text-right text-gray-700 font-medium text-red-600">
                                        {month.mortalityBirds}
                                    </td>
                                    <td className="py-3 px-4 text-right text-gray-700 font-medium">
                                        {month.feedConsumeAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </td>
                                </tr>
                            ))}
                            <tr className="bg-gray-100 font-bold border-t-2 border-gray-300">
                                <td className="py-3 px-4 text-gray-900">Grand Total</td>
                                <td className="py-3 px-4 text-right text-gray-900">
                                    {data.totals.purchaseAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="py-3 px-4 text-right text-gray-900">
                                    {data.totals.saleAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="py-3 px-4 text-right text-gray-900 text-red-600">
                                    {data.totals.mortalityBirds}
                                </td>
                                <td className="py-3 px-4 text-right text-gray-900">
                                    {data.totals.feedConsumeAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
