import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Loader2, ArrowLeft, Download, Truck } from 'lucide-react';
import * as XLSX from 'xlsx';
import api from '../lib/axios';

export default function CustomerDailySummary() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [loading, setLoading] = useState(true);
    const [customer, setCustomer] = useState(null);
    const [ledger, setLedger] = useState([]);
    const [error, setError] = useState('');

    const queryYear = searchParams.get('year');
    const queryMonth = searchParams.get('month');

    const [year, setYear] = useState(queryYear ? parseInt(queryYear) : new Date().getFullYear());
    const [month, setMonth] = useState(queryMonth ? parseInt(queryMonth) : new Date().getMonth() + 1);

    useEffect(() => {
        if (id) {
            fetchCustomerAndLedger();
        }
    }, [id, year, month]);

    const fetchCustomerAndLedger = async () => {
        try {
            setLoading(true);
            setError('');
            // 1. Fetch customer details to get the user ID
            const custRes = await api.get(`/customer/admin/${id}`);
            if (!custRes.data.success) {
                throw new Error('Failed to load customer profile');
            }
            const cust = custRes.data.data;
            setCustomer(cust);

            if (!cust.user?._id) {
                setLedger([]);
                return;
            }

            // 2. Fetch purchase ledger with high limit to filter by date range
            const ledgerRes = await api.get(`/customer/panel/${cust.user._id}/purchase-ledger?page=1&limit=10000`);
            if (ledgerRes.data.success) {
                setLedger(ledgerRes.data.data.ledger || []);
            }
        } catch (err) {
            console.error('Error fetching customer ledger details:', err);
            setError(err.response?.data?.message || 'Failed to fetch daily summary');
        } finally {
            setLoading(false);
        }
    };

    const getSaleType = (particulars) => {
        switch (particulars) {
            case 'SALES':
                return 'Direct sale';
            case 'INDIRECT_SALES':
                return 'Indirect sale';
            case 'STOCK_SALE':
                return 'Stock sale';
            default:
                return particulars || 'Receipt';
        }
    };

    const getSaleTypeColor = (type) => {
        switch (type) {
            case 'Direct sale':
                return 'bg-blue-100 text-blue-800';
            case 'Indirect sale':
                return 'bg-purple-100 text-purple-800';
            case 'Stock sale':
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

    // Filter transactions to the selected month and exclude opening balance rows
    const transactions = useMemo(() => {
        return ledger.filter(entry => {
            if (!entry.date || entry.particulars === 'OP BAL') return false;
            const d = new Date(entry.date);
            return d.getFullYear() === year && (d.getMonth() + 1) === month;
        });
    }, [ledger, year, month]);

    const totals = useMemo(() => {
        return transactions.reduce((acc, t) => {
            acc.birds += Number(t.birds) || 0;
            acc.weight += Number(t.weight) || 0;
            acc.amount += Number(t.amount) || 0;
            return acc;
        }, { birds: 0, weight: 0, amount: 0 });
    }, [transactions]);

    const handleExportToExcel = () => {
        if (!customer) return;

        const exportData = transactions.map(t => ({
            Date: formatDate(t.date),
            Particulars: ['SALES', 'INDIRECT_SALES', 'STOCK_SALE'].includes(t.particulars) ? customer.shopName : (t.particulars || 'Receipt'),
            'Sale Type': getSaleType(t.particulars),
            Birds: t.birds || '-',
            'Weight (Kg)': t.weight || '-',
            Rate: t.rate || '-',
            Amount: t.amount || 0,
            'Trip ID': t.trip?.tripId || '-'
        }));

        exportData.push({
            Date: 'Grand Total',
            Particulars: '',
            'Sale Type': '',
            Birds: totals.birds,
            'Weight (Kg)': totals.weight.toFixed(2),
            Rate: '',
            Amount: totals.amount,
            'Trip ID': ''
        });

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Daily Summary");
        XLSX.writeFile(wb, `${customer.shopName}_Daily_Summary_${month}_${year}.xlsx`);
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

    if (loading && !customer) {
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
                        <h1 className="text-2xl font-bold text-gray-900">{customer?.shopName} - Daily Breakdown</h1>
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
                                <th className="px-6 py-3 text-left font-medium text-gray-700">Sale type</th>
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
                                    const sType = getSaleType(t.particulars);
                                    const isSale = ['Direct sale', 'Indirect sale', 'Stock sale'].includes(sType);
                                    return (
                                        <tr key={t._id || idx} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 text-gray-900 whitespace-nowrap">
                                                {formatDate(t.date)}
                                            </td>
                                            <td className="px-6 py-4 text-gray-900">
                                                {isSale ? customer.shopName : (t.particulars || 'Receipt')}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${getSaleTypeColor(sType)}`}>
                                                    {sType}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right text-gray-900">
                                                {isSale && t.birds ? t.birds.toLocaleString() : '-'}
                                            </td>
                                            <td className="px-6 py-4 text-right text-gray-900 font-mono">
                                                {isSale && t.weight ? (Number(t.weight)).toFixed(2) : '-'}
                                            </td>
                                            <td className="px-6 py-4 text-right text-gray-900 font-mono">
                                                {isSale && t.rate ? `₹${Number(t.rate).toFixed(2)}` : '-'}
                                            </td>
                                            <td className="px-6 py-4 text-right text-gray-900 font-mono font-medium">
                                                ₹{Number(t.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="px-6 py-4 text-blue-600 font-medium">
                                                {t.trip?.tripId ? (
                                                    <Link to={`/trips/${t.trip._id}`} className="hover:underline flex items-center gap-1">
                                                        <Truck size={14} />
                                                        {t.trip.tripId}
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
                                        No sales transactions found for this month.
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
