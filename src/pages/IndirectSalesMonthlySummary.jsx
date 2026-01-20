import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, ArrowLeft, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import api from '../lib/axios';

export default function IndirectSalesMonthlySummary() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [error, setError] = useState('');
    const [year, setYear] = useState(new Date().getFullYear());

    useEffect(() => {
        fetchMonthlyStats();
    }, [year]);

    const fetchMonthlyStats = async () => {
        try {
            setLoading(true);
            setError('');
            const response = await api.get('/indirect-sales/stats/monthly', { params: { year } });
            if (response.data.success) {
                setData(response.data.data);
            }
        } catch (err) {
            console.error('Error fetching monthly stats:', err);
            setError(err.response?.data?.message || 'Failed to fetch monthly statistics');
        } finally {
            setLoading(false);
        }
    };

    const handleMonthClick = (monthData) => {
        const date = new Date(monthData.startDate);
        const monthNum = date.getMonth() + 1;
        const yearNum = date.getFullYear();
        navigate(`/indirect-sales/daily?year=${yearNum}&month=${monthNum}`);
    };

    const getFinancialYearOrder = (monthData) => {
        if (!monthData) return [];
        return [...monthData].sort((a, b) => {
            const dateA = new Date(Date.parse(a.name + " 1, 2000"));
            const dateB = new Date(Date.parse(b.name + " 1, 2000"));
            const monthA = dateA.getMonth() + 1;
            const monthB = dateB.getMonth() + 1;

            const orderA = (monthA + 8) % 12;
            const orderB = (monthB + 8) % 12;
            return orderA - orderB;
        });
    };

    const handleExportToExcel = () => {
        if (!data) return;

        const sortedMonths = getFinancialYearOrder(data.months);

        const exportData = sortedMonths.map(m => ({
            Month: m.name,
            'Count': m.count,
            'Total Sales': m.salesAmount || 0,
            'Total Purchase': m.purchaseAmount || 0,
            'Net Profit': m.netProfit || 0
        }));

        exportData.push({
            Month: 'Grand Total',
            'Count': data.totals.count,
            'Total Sales': data.totals.salesAmount,
            'Total Purchase': data.totals.purchaseAmount,
            'Net Profit': data.totals.netProfit
        });

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Monthly Summary");
        XLSX.writeFile(wb, `IndirectSales_Monthly_${year}.xlsx`);
    };

    const yearOptions = [];
    const currentYear = new Date().getFullYear();
    for (let y = 2024; y <= currentYear + 1; y++) {
        yearOptions.push(y);
    }

    if (loading && !data) {
        return <div className="flex justify-center p-12"><Loader2 className="animate-spin w-8 h-8 text-blue-600" /></div>;
    }

    if (error) {
        return (
            <div className="p-8 text-center">
                <p className="text-red-500 mb-4">{error}</p>
                <button onClick={() => navigate(-1)} className="text-blue-600 hover:underline">Go Back</button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/indirect-sales/')} // Loop back logic? No, this is the root for summary now.
                        className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors hidden"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Indirect Sales - Monthly Summary</h1>
                        <p className="text-gray-600">Overview of Indirect Sales Performance</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
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
                    >
                        <Download size={20} />
                        <span className="font-medium">Export</span>
                    </button>
                    <button
                        onClick={() => navigate('/indirect-sales/list')}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 font-medium"
                    >
                        View All Records
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3 text-left font-medium text-gray-700">Month</th>
                                <th className="px-6 py-3 text-right font-medium text-gray-700">Records</th>
                                <th className="px-6 py-3 text-right font-medium text-gray-700">Total Purchase</th>
                                <th className="px-6 py-3 text-right font-medium text-gray-700">Total Sales</th>
                                <th className="px-6 py-3 text-right font-medium text-gray-700">Net Profit</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {getFinancialYearOrder(data?.months).map((month, index) => (
                                <tr
                                    key={index}
                                    onClick={() => handleMonthClick(month)}
                                    className={`hover:bg-gray-50 cursor-pointer transition-colors ${month.count === 0 ? 'opacity-60' : ''}`}
                                >
                                    <td className="px-6 py-4 font-medium text-blue-600 hover:underline">{month.name}</td>
                                    <td className="px-6 py-4 text-right text-gray-900">{month.count}</td>
                                    <td className="px-6 py-4 text-right text-gray-900">
                                        {month.purchaseAmount > 0 ? `₹${month.purchaseAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}
                                    </td>
                                    <td className="px-6 py-4 text-right text-gray-900">
                                        {month.salesAmount > 0 ? `₹${month.salesAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}
                                    </td>
                                    <td className="px-6 py-4 text-right font-medium text-gray-900">
                                        {month.netProfit !== 0 ? `₹${month.netProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}
                                    </td>
                                </tr>
                            ))}
                            <tr className="bg-gray-100 font-bold border-t-2 border-gray-300">
                                <td className="px-6 py-4 text-gray-900">Total</td>
                                <td className="px-6 py-4 text-right text-gray-900">{data?.totals.count}</td>
                                <td className="px-6 py-4 text-right text-red-700">
                                    ₹{data?.totals.purchaseAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="px-6 py-4 text-right text-green-700">
                                    ₹{data?.totals.salesAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="px-6 py-4 text-right text-blue-700">
                                    ₹{data?.totals.netProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
