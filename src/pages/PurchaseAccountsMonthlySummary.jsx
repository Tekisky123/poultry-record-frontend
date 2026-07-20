import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Download, ChevronDown } from 'lucide-react';
import * as XLSX from 'xlsx';
import api from '../lib/axios';
import { useAuth } from '../contexts/AuthContext';

export default function PurchaseAccountsMonthlySummary() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { user } = useAuth();
    
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [groupId, setGroupId] = useState(searchParams.get('groupId') || '');
    const [ledgerId, setLedgerId] = useState('');
    const [transactions, setTransactions] = useState([]);

    // Financial Year helpers
    const getCurrentFinancialYear = () => {
        const now = new Date();
        return now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    };

    const [year, setYear] = useState(() => {
        const paramStart = searchParams.get('startDate');
        if (paramStart) {
            const d = new Date(paramStart);
            if (d.getMonth() === 3) return d.getFullYear();
        }
        return getCurrentFinancialYear();
    });

    // Generate FY options (2023 to current+1)
    const yearOptions = useMemo(() => {
        const currentYear = new Date().getFullYear();
        const options = [];
        for (let y = 2023; y <= currentYear + 1; y++) {
            options.push(y);
        }
        return options;
    }, []);

    // Get group ID dynamically if not provided in URL
    useEffect(() => {
        if (!groupId) {
            fetchGroupId();
        }
    }, [groupId]);

    const fetchGroupId = async () => {
        try {
            const res = await api.get('/group');
            if (res.data && res.data.data) {
                const groupList = res.data.data;
                const match = groupList.find(g => g.name.toLowerCase().trim() === 'purchase accounts');
                if (match) {
                    setGroupId(match._id || match.id);
                } else {
                    setError('Purchase Accounts group not found');
                    setLoading(false);
                }
            }
        } catch (err) {
            console.error('Error fetching groups:', err);
            setError('Failed to resolve Purchase Accounts group ID');
            setLoading(false);
        }
    };

    // Fetch the Birds Purchase ledger once group ID is available
    useEffect(() => {
        if (groupId) {
            fetchLedgers();
        }
    }, [groupId]);

    const fetchLedgers = async () => {
        try {
            setError('');
            const res = await api.get(`/ledger/group/${groupId}`);
            if (res.data && res.data.data) {
                const ledgers = res.data.data;
                const birdsPurchaseLedger = ledgers.find(l => l.name.toLowerCase().includes('birds purchase') || l.slug === 'birds-purchase') || ledgers[0];
                
                if (birdsPurchaseLedger) {
                    setLedgerId(birdsPurchaseLedger.id || birdsPurchaseLedger._id);
                } else {
                    setError('Birds Purchase ledger not found');
                    setLoading(false);
                }
            }
        } catch (err) {
            console.error('Error fetching ledgers by group:', err);
            setError('Failed to fetch ledgers under Purchase Accounts');
            setLoading(false);
        }
    };

    // Fetch transactions when ledger ID and year changes
    useEffect(() => {
        if (ledgerId) {
            fetchTransactions();
        }
    }, [ledgerId, year]);

    const fetchTransactions = async () => {
        try {
            setLoading(true);
            setError('');
            
            const startDate = `${year}-04-01`;
            const endDate = `${year + 1}-03-31`;

            const response = await api.get(`/ledger/${ledgerId}/purchase-sales-report`, {
                params: { startDate, endDate }
            });

            if (response.data.success) {
                setTransactions(response.data.data.transactions || []);
            } else {
                setError('Failed to fetch transactions report');
            }
        } catch (err) {
            console.error('Error fetching transactions:', err);
            setError(err.response?.data?.message || 'Failed to fetch purchase transactions');
        } finally {
            setLoading(false);
        }
    };

    // Monthly aggregation
    const monthlySummary = useMemo(() => {
        // Create 12 months array starting from April to March
        const months = [];
        for (let i = 0; i < 12; i++) {
            const mStart = new Date(year, 3 + i, 1);
            const mEnd = new Date(year, 3 + i + 1, 0); // Last day of month
            
            months.push({
                name: mStart.toLocaleString('en-US', { month: 'long', year: 'numeric' }),
                monthShort: mStart.toLocaleString('en-US', { month: 'short', year: 'numeric' }),
                startDate: mStart.toISOString().split('T')[0],
                endDate: mEnd.toISOString().split('T')[0],
                birds: 0,
                weight: 0,
                amount: 0
            });
        }

        // Aggregate transactions
        transactions.forEach(t => {
            const tDate = new Date(t.date);
            const tMonth = tDate.getMonth();
            const tYear = tDate.getFullYear();

            // Determine if the transaction falls into the selected financial year
            const fyStart = tMonth >= 3 ? tYear : tYear - 1;
            if (fyStart === year) {
                const monthIndex = tMonth >= 3 ? tMonth - 3 : tMonth + 9;
                if (monthIndex >= 0 && monthIndex < 12) {
                    months[monthIndex].birds += t.birds || 0;
                    months[monthIndex].weight += t.weight || 0;
                    months[monthIndex].amount += t.amount || 0;
                }
            }
        });

        // Calculate Totals
        const totals = {
            birds: 0,
            weight: 0,
            amount: 0
        };

        months.forEach(m => {
            totals.birds += m.birds;
            totals.weight += m.weight;
            totals.amount += m.amount;
        });

        return { months, totals };
    }, [transactions, year]);

    const handleMonthClick = (month) => {
        if (!ledgerId) return;
        navigate(`/monthly-summary/ledger/${ledgerId}?startDate=${month.startDate}&endDate=${month.endDate}&groupName=Purchase Accounts`);
    };

    const handleExportToExcel = () => {
        if (!monthlySummary) return;

        const exportData = monthlySummary.months.map(m => ({
            Month: m.name,
            'Total Birds': m.birds,
            'Total Weight (Kg)': parseFloat(m.weight.toFixed(2)),
            'Total Amount (Rs)': parseFloat(m.amount.toFixed(2))
        }));

        // Add Totals Row
        exportData.push({
            Month: 'Grand Total',
            'Total Birds': monthlySummary.totals.birds,
            'Total Weight (Kg)': parseFloat(monthlySummary.totals.weight.toFixed(2)),
            'Total Amount (Rs)': parseFloat(monthlySummary.totals.amount.toFixed(2))
        });

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Purchase Accounts Summary");
        XLSX.writeFile(wb, `Purchase_Accounts_Monthly_Summary_FY${year}_${year + 1}.xlsx`);
    };

    if (loading && transactions.length === 0) {
        return <div className="flex justify-center p-12"><Loader2 className="animate-spin w-8 h-8 text-blue-600" /></div>;
    }

    if (error) {
        return (
            <div className="p-8 text-center bg-white rounded-xl shadow-sm border border-gray-200 space-y-4">
                <p className="text-red-500 font-semibold">{error}</p>
                <button 
                    onClick={() => navigate(-1)} 
                    className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 shadow-sm"
                >
                    <ArrowLeft size={16} />
                    Go Back
                </button>
            </div>
        );
    }

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
                        <h1 className="text-3xl font-bold text-gray-900">Purchase Accounts Monthly Summary</h1>
                        <p className="text-gray-600 mt-1">Breakdown of Birds, Weight, and Amount by Month</p>
                    </div>
                </div>
                <div className="flex gap-3 mt-4 sm:mt-0">
                    {/* Financial Year Dropdown */}
                    <div className="relative">
                        <select
                            value={year}
                            onChange={(e) => setYear(Number(e.target.value))}
                            className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-10 font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition-colors cursor-pointer focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            {yearOptions.map((y) => (
                                <option key={y} value={y}>
                                    FY {y}-{y + 1}
                                </option>
                            ))}
                        </select>
                        <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                    </div>
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
                                <th className="text-right py-3 px-4 font-semibold text-gray-900">Total Birds</th>
                                <th className="text-right py-3 px-4 font-semibold text-gray-900">Total Weight (Kg)</th>
                                <th className="text-right py-3 px-4 font-semibold text-gray-900">Total Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {monthlySummary.months.map((month) => (
                                <tr
                                    key={month.name}
                                    className="border-b border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors"
                                    onClick={() => handleMonthClick(month)}
                                >
                                    <td className="py-3 px-4 text-blue-600 font-medium hover:underline">{month.name}</td>
                                    <td className="py-3 px-4 text-right text-gray-700">
                                        {month.birds.toLocaleString('en-IN')}
                                    </td>
                                    <td className="py-3 px-4 text-right text-gray-700 font-medium">
                                        {month.weight.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                    <td className="py-3 px-4 text-right text-gray-700 font-semibold">
                                        ₹{month.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                </tr>
                            ))}
                            <tr className="bg-gray-100 font-bold border-t-2 border-gray-300">
                                <td className="py-3 px-4 text-gray-900">Grand Total</td>
                                <td className="py-3 px-4 text-right text-gray-900">
                                    {monthlySummary.totals.birds.toLocaleString('en-IN')}
                                </td>
                                <td className="py-3 px-4 text-right text-gray-900">
                                    {monthlySummary.totals.weight.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                <td className="py-3 px-4 text-right text-gray-900">
                                    ₹{monthlySummary.totals.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
