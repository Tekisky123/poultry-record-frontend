import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, ArrowLeft, Download, FileText } from 'lucide-react';
import * as XLSX from 'xlsx';
import api from '../lib/axios';

export default function BirdsWeightLossMonthlySummary() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [error, setError] = useState('');
    const [year, setYear] = useState(new Date().getMonth() >= 3 ? new Date().getFullYear() : new Date().getFullYear() - 1);

    useEffect(() => {
        fetchMonthlySummary();
    }, [year]);

    const fetchMonthlySummary = async () => {
        try {
            setLoading(true);
            setError('');
            const response = await api.get('/birds-weight-loss/monthly-summary', { params: { year } });
            if (response.data.success) {
                setData(response.data.data);
            }
        } catch (err) {
            console.error('Error fetching birds weight loss monthly summary:', err);
            setError(err.response?.data?.message || 'Failed to fetch monthly summary');
        } finally {
            setLoading(false);
        }
    };

    const handleMonthClick = (monthData) => {
        const d = new Date(monthData.startDate);
        const y = d.getFullYear();
        const m = d.getMonth() + 1;
        navigate(`/birds-weight-loss/daily-summary?month=${m}&year=${y}`);
    };

    const handleExportToExcel = () => {
        if (!data) return;

        const exportData = data.months.map(m => ({
            Month: `${m.name} ${m.startDate ? new Date(m.startDate).getFullYear() : ''}`,
            'Total Amount': m.amount
        }));

        exportData.push({
            Month: 'Grand Total',
            'Total Amount': data.totals.amount
        });

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Birds Weight Loss Summary");
        XLSX.writeFile(wb, `Birds_Weight_Loss_Monthly_Summary_${year}.xlsx`);
    };

    const yearOptions = [];
    const currentYear = new Date().getFullYear();
    for (let y = 2023; y <= currentYear + 1; y++) {
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
                        onClick={() => navigate(-1)}
                        className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <FileText size={24} className="text-blue-600" />
                            Birds Weight Loss - Monthly Summary
                        </h1>
                        <p className="text-gray-600">Overview of all birds weight loss</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <select
                        value={year}
                        onChange={(e) => setYear(parseInt(e.target.value))}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                        {yearOptions.map(y => (
                            <option key={y} value={y}>FY {y}-{y + 1}</option>
                        ))}
                    </select>

                    <button
                        onClick={handleExportToExcel}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-sm transition-colors"
                    >
                        <Download size={20} />
                        <span className="font-medium">Export</span>
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3 text-left font-medium text-gray-700">Month</th>
                                <th className="px-6 py-3 text-right font-medium text-gray-700">Total Expenses</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {data?.months.map((month, index) => (
                                <tr
                                    key={index}
                                    onClick={() => handleMonthClick(month)}
                                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                                >
                                    <td className="px-6 py-4 font-medium text-blue-600 hover:underline">
                                        {month.name} {month.startDate ? new Date(month.startDate).getFullYear() : ''}
                                    </td>
                                    <td className="px-6 py-4 text-right text-red-600 font-medium">
                                        {month.amount > 0 ? `₹${month.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}
                                    </td>
                                </tr>
                            ))}
                            <tr className="bg-gray-100 font-bold">
                                <td className="px-6 py-4 text-gray-900">Total</td>
                                <td className="px-6 py-4 text-right text-red-700">
                                    ₹{data?.totals.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
