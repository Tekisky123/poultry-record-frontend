import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, ArrowLeft, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import api from '../lib/axios';

export default function LedgerMonthlySummary() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [error, setError] = useState('');
    const [year, setYear] = useState(new Date().getMonth() >= 3 ? new Date().getFullYear() : new Date().getFullYear() - 1);

    useEffect(() => {
        fetchMonthlySummary();
    }, [id, year]);

    const fetchMonthlySummary = async () => {
        try {
            setLoading(true);
            setError('');
            const response = await api.get(`/ledger/${id}/monthly-summary`, { params: { year } });
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

    const handleMonthClick = (monthData) => {
        // monthData.startDate is ISO string
        const date = new Date(monthData.startDate);
        const monthNum = date.getMonth() + 1; // 1-12
        const yearNum = date.getFullYear();

        navigate(`/ledgers/${id}/daily?year=${yearNum}&month=${monthNum}`);
    };

    const handleExportToExcel = () => {
        if (!data) return;

        const exportData = data.months.map(m => ({
            Month: m.name,
            'Total Debit': m.debit,
            'Total Credit': m.credit,
            'Closing Balance': `${Math.abs(m.closingBalance).toLocaleString('en-IN')} ${m.closingBalanceType.toUpperCase()}`
        }));

        // Add Totals
        exportData.push({
            Month: 'Grand Total',
            'Total Debit': data.totals.debit,
            'Total Credit': data.totals.credit,
            'Closing Balance': ''
        });

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Monthly Summary");
        XLSX.writeFile(wb, `${data.subject.name}_Monthly_Summary_${year}.xlsx`);
    };

    // Financial years options (e.g. 2024 -> Apr 2024 to Mar 2025)
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
                        onClick={() => navigate('/ledgers')}
                        className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{data?.subject?.name} - Monthly Summary</h1>
                        <p className="text-gray-600">
                            Opening Balance: ₹{Number(data?.openingBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })} {data?.openingBalanceType?.toUpperCase()}
                        </p>
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
                                <th className="px-6 py-3 text-right font-medium text-gray-700">Debit</th>
                                <th className="px-6 py-3 text-right font-medium text-gray-700">Credit</th>
                                <th className="px-6 py-3 text-right font-medium text-gray-700">Closing Balance</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {data?.months.map((month, index) => (
                                <tr
                                    key={index}
                                    onClick={() => handleMonthClick(month)}
                                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                                >
                                    <td className="px-6 py-4 font-medium text-blue-600 hover:underline">{month.name}</td>
                                    <td className="px-6 py-4 text-right text-gray-900">
                                        {month.debit > 0 ? `₹${month.debit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}
                                    </td>
                                    <td className="px-6 py-4 text-right text-gray-900">
                                        {month.credit > 0 ? `₹${month.credit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}
                                    </td>
                                    <td className="px-6 py-4 text-right font-medium text-gray-900">
                                        ₹{Math.abs(month.closingBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })} {month.closingBalanceType === 'debit' ? 'Dr' : 'Cr'}
                                    </td>
                                </tr>
                            ))}
                            <tr className="bg-gray-100 font-bold">
                                <td className="px-6 py-4 text-gray-900">Total</td>
                                <td className="px-6 py-4 text-right text-green-700">
                                    ₹{data?.totals.debit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="px-6 py-4 text-right text-red-700">
                                    ₹{data?.totals.credit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="px-6 py-4 text-right"></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
