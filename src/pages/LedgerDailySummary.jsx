import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, ArrowLeft, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import api from '../lib/axios';

export default function LedgerDailySummary() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [error, setError] = useState('');

    // Get month/year from query params, or default to current
    const queryYear = searchParams.get('year');
    const queryMonth = searchParams.get('month');

    const [year, setYear] = useState(queryYear ? parseInt(queryYear) : new Date().getFullYear());
    const [month, setMonth] = useState(queryMonth ? parseInt(queryMonth) : new Date().getMonth() + 1);

    useEffect(() => {
        fetchDailySummary();
    }, [id, year, month]);

    const fetchDailySummary = async () => {
        try {
            setLoading(true);
            setError('');
            const params = { year, month };
            const response = await api.get(`/ledger/${id}/daily-summary`, { params });
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
        // Navigate to LedgerDetails with filtered date
        navigate(`/ledgers/${id}?startDate=${day.date}&endDate=${day.date}`);
    };

    const handleExportToExcel = () => {
        if (!data) return;

        const exportData = data.days.map(day => ({
            Date: day.displayDate,
            'Vouchers': day.voucherCount,
            'Debit': day.debit,
            'Credit': day.credit
        }));

        // Add Totals
        exportData.push({
            Date: 'Grand Total',
            'Vouchers': data.totals.voucherCount,
            'Debit': data.totals.debit,
            'Credit': data.totals.credit
        });

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Daily Summary");
        XLSX.writeFile(wb, `${data.subject.name}_Daily_Summary_${month}_${year}.xlsx`);
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
                        <h1 className="text-2xl font-bold text-gray-900">{data?.subject?.name} - Daily Breakdown</h1>
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
                                <th className="px-6 py-3 text-left font-medium text-gray-700">Date</th>
                                <th className="px-6 py-3 text-right font-medium text-gray-700">Vouchers/Txns</th>
                                <th className="px-6 py-3 text-right font-medium text-gray-700">Debit</th>
                                <th className="px-6 py-3 text-right font-medium text-gray-700">Credit</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {data?.days.map((day) => (
                                <tr
                                    key={day.day}
                                    onClick={() => handleDayClick(day)}
                                    className={`hover:bg-gray-50 cursor-pointer transition-colors ${day.voucherCount === 0 ? 'opacity-60' : ''}`}
                                >
                                    <td className="px-6 py-4 font-medium text-blue-600 hover:underline">{day.displayDate}</td>
                                    <td className="px-6 py-4 text-right text-gray-900">
                                        {day.voucherCount}
                                    </td>
                                    <td className="px-6 py-4 text-right text-gray-900">
                                        {day.debit > 0 ? `₹${day.debit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}
                                    </td>
                                    <td className="px-6 py-4 text-right text-gray-900">
                                        {day.credit > 0 ? `₹${day.credit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}
                                    </td>
                                </tr>
                            ))}
                            <tr className="bg-gray-100 font-bold border-t-2 border-gray-300">
                                <td className="px-6 py-4 text-gray-900">Total</td>
                                <td className="px-6 py-4 text-right text-gray-900">
                                    {data?.totals.voucherCount}
                                </td>
                                <td className="px-6 py-4 text-right text-green-700">
                                    ₹{data?.totals.debit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="px-6 py-4 text-right text-red-700">
                                    ₹{data?.totals.credit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
