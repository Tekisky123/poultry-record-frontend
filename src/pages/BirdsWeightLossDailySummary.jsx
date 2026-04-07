import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, ArrowLeft, Download, FileText } from 'lucide-react';
import * as XLSX from 'xlsx';
import api from '../lib/axios';

const formatDateDisplay = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
};

export default function BirdsWeightLossDailySummary() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [error, setError] = useState('');

    const queryYear = searchParams.get('year');
    const queryMonth = searchParams.get('month');

    const [year, setYear] = useState(queryYear ? parseInt(queryYear) : new Date().getFullYear());
    const [month, setMonth] = useState(queryMonth ? parseInt(queryMonth) : new Date().getMonth() + 1);

    useEffect(() => {
        fetchDailySummary();
    }, [year, month]);

    const fetchDailySummary = async () => {
        try {
            setLoading(true);
            setError('');
            const params = { year, month };
            const response = await api.get('/birds-weight-loss/daily-summary', { params });
            if (response.data.success) {
                setData(response.data.data);
            }
        } catch (err) {
            console.error('Error fetching birds weight loss daily summary:', err);
            setError(err.response?.data?.message || 'Failed to fetch daily summary');
        } finally {
            setLoading(false);
        }
    };

    const handleExportToExcel = () => {
        if (!data) return;

        const exportData = data.records.map(record => ({
            Date: formatDateDisplay(record.date),
            Particular: record.particular,
            Reference: record.reference,
            Weight: record.weight || 0,
            Rate: record.rate || 0,
            Amount: record.amount
        }));

        exportData.push({
            Date: 'Grand Total',
            Particular: '',
            Reference: '',
            Weight: '',
            Rate: '',
            Amount: data.totals.amount
        });

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Daily Summary");
        XLSX.writeFile(wb, `Birds_Weight_Loss_Daily_Summary_${month}_${year}.xlsx`);
    };

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
                            Birds Weight Loss - Daily Breakdown
                        </h1>
                        <p className="text-gray-600">
                            {monthOptions.find(m => m.value === month)?.label} {year}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
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
                                <th className="px-6 py-3 text-left font-medium text-gray-700 whitespace-nowrap">Date</th>
                                <th className="px-6 py-3 text-left font-medium text-gray-700">Particular</th>
                                <th className="px-6 py-3 text-left font-medium text-gray-700">Reference</th>
                                <th className="px-6 py-3 text-left font-medium text-gray-700">Weight</th>
                                <th className="px-6 py-3 text-left font-medium text-gray-700">Rate</th>
                                <th className="px-6 py-3 text-right font-medium text-gray-700">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {data?.records.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                                        No birds weight loss found for this month.
                                    </td>
                                </tr>
                            ) : (
                                data?.records.map((record, index) => (
                                    <tr 
                                        key={index} 
                                        onClick={() => {
                                            if (record.tripDbId) {
                                                navigate(`/trips/${record.tripDbId}`);
                                            } else if (record.isStock) {
                                                const d = new Date(record.date);
                                                const year = d.getFullYear();
                                                const month = String(d.getMonth() + 1).padStart(2, '0');
                                                const day = String(d.getDate()).padStart(2, '0');
                                                navigate(`/stocks/manage?date=${year}-${month}-${day}`);
                                            } else if (record.indirectDbId) {
                                                navigate(`/indirect-sales/${record.indirectDbId}`);
                                            }
                                        }}
                                        className={`hover:bg-gray-50 transition-colors ${(record.tripDbId || record.isStock || record.indirectDbId) ? 'cursor-pointer' : ''}`}
                                    >
                                        <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">{formatDateDisplay(record.date)}</td>
                                        <td className="px-6 py-4 text-gray-900">{record.particular}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${record.reference !== '-' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'}`}>
                                                {record.reference}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-900">{record.weight ? Number(record.weight).toFixed(2) : '0.00'}</td>
                                        <td className="px-6 py-4 text-gray-900">₹{record.rate ? Number(record.rate).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00'}</td>
                                        <td className="px-6 py-4 text-right font-bold text-red-600">
                                            ₹{record.amount ? Number(record.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00'}
                                        </td>
                                    </tr>
                                ))
                            )}
                            <tr className="bg-gray-100 font-bold border-t-2 border-gray-300">
                                <td colSpan="5" className="px-6 py-4 text-gray-900 text-right">Grand Total</td>
                                <td className="px-6 py-4 text-right text-red-700 text-base">
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
