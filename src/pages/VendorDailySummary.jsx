import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Loader2, ArrowLeft, Download, Truck } from 'lucide-react';
import * as XLSX from 'xlsx';
import api from '../lib/axios';

export default function VendorDailySummary() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [loading, setLoading] = useState(true);
    const [ledgerData, setLedgerData] = useState(null);
    const [error, setError] = useState('');

    const queryYear = searchParams.get('year');
    const queryMonth = searchParams.get('month');

    const [year, setYear] = useState(queryYear ? parseInt(queryYear) : new Date().getFullYear());
    const [month, setMonth] = useState(queryMonth ? parseInt(queryMonth) : new Date().getMonth() + 1);

    useEffect(() => {
        fetchLedgerTransactions();
    }, [id, year, month]);

    const fetchLedgerTransactions = async () => {
        try {
            setLoading(true);
            setError('');
            const startStr = `${year}-${String(month).padStart(2, '0')}-01`;
            const lastDay = new Date(year, month, 0).getDate();
            const endStr = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

            const params = {
                startDate: startStr,
                endDate: endStr,
                limit: 10000 // Get all transactions of this month
            };

            const response = await api.get(`/vendor/${id}/ledger`, { params });
            if (response.data.success) {
                setLedgerData(response.data.data);
            }
        } catch (err) {
            console.error('Error fetching vendor ledger:', err);
            setError(err.response?.data?.message || 'Failed to fetch daily summary');
        } finally {
            setLoading(false);
        }
    };

    const getPurchaseType = (type) => {
        switch (type) {
            case 'PURCHASE':
                return 'Direct pur';
            case 'INDIRECT':
                return 'Indirect pur';
            case 'STOCK_PURCHASE':
                return 'Stock pur';
            default:
                return type || 'Payment';
        }
    };

    const getPurchaseTypeColor = (type) => {
        switch (type) {
            case 'Direct pur':
                return 'bg-blue-100 text-blue-800';
            case 'Indirect pur':
                return 'bg-purple-100 text-purple-800';
            case 'Stock pur':
                return 'bg-orange-100 text-orange-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const formatDate = (dateString) => {
        try {
            const date = new Date(dateString);
            const day = date.getDate().toString().padStart(2, '0');
            const monthName = date.toLocaleDateString('en-US', { month: 'short' });
            const yearVal = date.getFullYear();
            return `${day}/${monthName} ${yearVal}`;
        } catch (error) {
            return dateString;
        }
    };

    const transactions = useMemo(() => {
        if (!ledgerData?.ledger) return [];
        // Filter out opening balance row if it is just OP
        return ledgerData.ledger.filter(entry => entry.type !== 'OPENING');
    }, [ledgerData]);

    const totals = useMemo(() => {
        return transactions.reduce((acc, t) => {
            acc.birds += Number(t.birds) || 0;
            acc.weight += Number(t.weight) || Number(t.quantity) || 0;
            acc.amount += Number(t.amount) || 0;
            return acc;
        }, { birds: 0, weight: 0, amount: 0 });
    }, [transactions]);

    const handleExportToExcel = () => {
        if (!ledgerData) return;

        const exportData = transactions.map(t => ({
            Date: formatDate(t.liftingDate || t.date),
            Particulars: ['PURCHASE', 'INDIRECT', 'STOCK_PURCHASE'].includes(t.type) ? ledgerData.vendor.vendorName : (t.particulars || 'Payment'),
            'Purchase Type': getPurchaseType(t.type),
            Birds: t.birds || '-',
            'Weight (Kg)': t.weight || t.quantity || '-',
            Rate: t.rate || '-',
            Amount: t.amount || 0,
            'Trip ID': t.tripId || '-'
        }));

        exportData.push({
            Date: 'Grand Total',
            Particulars: '',
            'Purchase Type': '',
            Birds: totals.birds,
            'Weight (Kg)': totals.weight.toFixed(2),
            Rate: '',
            Amount: totals.amount,
            'Trip ID': ''
        });

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Daily Summary");
        XLSX.writeFile(wb, `${ledgerData.vendor.vendorName}_Daily_Summary_${month}_${year}.xlsx`);
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

    if (loading && !ledgerData) {
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
                        <h1 className="text-2xl font-bold text-gray-900">{ledgerData?.vendor?.vendorName} - Daily Breakdown</h1>
                        <p className="text-gray-600">
                            {monthOptions.find(m => m.value === month)?.label} {year}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <select
                        value={month}
                        onChange={(e) => setMonth(parseInt(e.target.value))}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                        {monthOptions.map(m => (
                            <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                    </select>

                    <select
                        value={year}
                        onChange={(e) => setYear(parseInt(e.target.value))}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
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
                                <th className="px-6 py-3 text-left font-medium text-gray-700">Particulars</th>
                                <th className="px-6 py-3 text-left font-medium text-gray-700">Purchase type</th>
                                <th className="px-6 py-3 text-right font-medium text-gray-700">Birds</th>
                                <th className="px-6 py-3 text-right font-medium text-gray-700">Weight</th>
                                <th className="px-6 py-3 text-right font-medium text-gray-700">Rate</th>
                                <th className="px-6 py-3 text-right font-medium text-gray-700">Amount</th>
                                <th className="px-6 py-3 text-left font-medium text-gray-700">Trip ID</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {transactions.length > 0 ? (
                                transactions.map((t, idx) => {
                                    const pType = getPurchaseType(t.type);
                                    const isPur = ['Direct pur', 'Indirect pur', 'Stock pur'].includes(pType);
                                    return (
                                        <tr key={t.uniqueId || idx} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 text-gray-900 whitespace-nowrap">
                                                {formatDate(t.liftingDate || t.date)}
                                            </td>
                                            <td className="px-6 py-4 text-gray-900">
                                                {isPur ? ledgerData.vendor.vendorName : (t.particulars || 'Payment')}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${getPurchaseTypeColor(pType)}`}>
                                                    {pType}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right text-gray-900">
                                                {isPur && t.birds ? t.birds.toLocaleString() : '-'}
                                            </td>
                                            <td className="px-6 py-4 text-right text-gray-900 font-mono">
                                                {isPur && (t.weight || t.quantity) ? (Number(t.weight || t.quantity)).toFixed(2) : '-'}
                                            </td>
                                            <td className="px-6 py-4 text-right text-gray-900 font-mono">
                                                {isPur && t.rate ? `₹${Number(t.rate).toFixed(2)}` : '-'}
                                            </td>
                                            <td className="px-6 py-4 text-right text-gray-900 font-mono font-medium">
                                                ₹{Number(t.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="px-6 py-4 text-blue-600 font-medium">
                                                {t.tripId ? (
                                                    <Link to={`/trips/${t._id}`} className="hover:underline flex items-center gap-1">
                                                        <Truck size={14} />
                                                        {t.tripId}
                                                    </Link>
                                                ) : (
                                                    '-'
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                                        No purchase transactions found for this month.
                                    </td>
                                </tr>
                            )}
                            <tr className="bg-gray-100 font-bold border-t-2 border-gray-300">
                                <td className="px-6 py-4 text-gray-900" colSpan="3">Total</td>
                                <td className="px-6 py-4 text-right text-gray-900">
                                    {totals.birds > 0 ? totals.birds.toLocaleString() : '-'}
                                </td>
                                <td className="px-6 py-4 text-right text-gray-900 font-mono">
                                    {totals.weight > 0 ? totals.weight.toFixed(2) : '-'}
                                </td>
                                <td className="px-6 py-4 text-right"></td>
                                <td className="px-6 py-4 text-right text-gray-900 font-mono">
                                    ₹{totals.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="px-6 py-4"></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
