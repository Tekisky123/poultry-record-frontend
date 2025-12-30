import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
    ArrowLeft,
    Calendar,
    Download,
    AlertCircle,
    Receipt,
    RefreshCw,
    X,
    CreditCard,
    ArrowUpRight,
    ArrowDownLeft
} from 'lucide-react';
import api from '../lib/axios';
import * as XLSX from 'xlsx';

const LedgerDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [ledgerData, setLedgerData] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');
    const [searchParams] = useSearchParams();
    const [dateFilter, setDateFilter] = useState({
        startDate: searchParams.get('startDate') || '',
        endDate: searchParams.get('endDate') || ''
    });
    const [showDateFilterModal, setShowDateFilterModal] = useState(false);
    const [tempDateFilter, setTempDateFilter] = useState({
        startDate: '',
        endDate: ''
    });
    const [showNarration, setShowNarration] = useState(false); // State for narration toggle

    const [totals, setTotals] = useState({
        openingBalance: 0,
        openingBalanceType: 'debit',
        closingBalance: 0,
        closingBalanceType: 'debit',
        totalDebit: 0,
        totalCredit: 0
    });

    useEffect(() => {
        const start = searchParams.get('startDate');
        const end = searchParams.get('endDate');
        if (start || end) {
            setDateFilter({
                startDate: start || '',
                endDate: end || ''
            });
        }
    }, [searchParams]);

    useEffect(() => {
        fetchLedgerDetails();
    }, [id, dateFilter]);

    const fetchLedgerDetails = async (isRefresh = false) => {
        try {
            if (isRefresh) setRefreshing(true);
            else setLoading(true);
            setError('');

            let query = `/ledger/${id}/transactions?`;
            if (dateFilter.startDate) query += `startDate=${dateFilter.startDate}&`;
            if (dateFilter.endDate) query += `endDate=${dateFilter.endDate}`;

            const response = await api.get(query);

            if (response.data.success) {
                const data = response.data.data;
                setLedgerData(data.ledger);
                setTransactions(data.transactions || []);

                // Calculate totals
                const totalDebit = (data.transactions || []).reduce((sum, t) => sum + (t.debit || 0), 0);
                const totalCredit = (data.transactions || []).reduce((sum, t) => sum + (t.credit || 0), 0);

                setTotals({
                    openingBalance: data.openingBalance || 0,
                    openingBalanceType: data.openingBalanceType || 'debit',
                    closingBalance: data.closingBalance || 0,
                    closingBalanceType: data.closingBalanceType || 'debit',
                    totalDebit,
                    totalCredit
                });
            }
        } catch (error) {
            console.error('Error fetching ledger details:', error);
            setError('Failed to fetch ledger transactions');
        } finally {
            if (isRefresh) setRefreshing(false);
            else setLoading(false);
        }
    };

    const handleRefresh = () => {
        fetchLedgerDetails(true);
    };

    const handleBack = () => {
        navigate(-1);
    };

    const openDateFilterModal = () => {
        setTempDateFilter(dateFilter);
        setShowDateFilterModal(true);
    };

    const handleApplyDateFilter = () => {
        setDateFilter(tempDateFilter);
        setShowDateFilterModal(false);
    };

    const handleClearDateFilter = () => {
        setDateFilter({ startDate: '', endDate: '' });
        setShowDateFilterModal(false);
    };

    const handleDownloadExcel = () => {
        if (!transactions.length) return;

        const excelData = transactions.map(t => ({
            'Date': new Date(t.date).toLocaleDateString('en-GB'),
            'Ref No': t.refNo,
            'Type': t.type,
            'Description': t.description,
            'Debit': t.debit || 0,
            'Credit': t.credit || 0,
            'Balance': `${Math.abs(t.runningBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })} ${t.runningBalanceType?.toUpperCase() || ''}`
        }));

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(excelData);
        XLSX.utils.book_append_sheet(wb, ws, 'Ledger Transactions');
        XLSX.writeFile(wb, `${ledgerData?.name}_Ledger.xlsx`);
    };

    const formatDateDisplay = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (error || !ledgerData) {
        return (
            <div className="text-center py-8">
                <AlertCircle className="mx-auto h-12 w-12 text-red-400 mb-4" />
                <p className="text-red-600">{error || 'Ledger not found'}</p>
                <button
                    onClick={handleBack}
                    className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                    Back to Ledgers
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
                        onClick={handleBack}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <ArrowLeft size={20} className="text-gray-600" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{ledgerData.name}</h1>
                        <p className="text-gray-600">{ledgerData.group?.name || 'Unknown Group'}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleDownloadExcel}
                        className="flex items-center gap-2 px-3 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        <Download size={18} />
                        <span className="hidden sm:inline">Export</span>
                    </button>
                    <button
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="flex items-center gap-2 px-3 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                        {refreshing ? 'Refreshing...' : 'Refresh'}
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Opening Balance</p>
                            <p className="text-lg font-bold text-gray-900 mt-1">
                                ₹{Number(totals.openingBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                <span className={`ml-1 text-xs ${totals.openingBalanceType === 'credit' ? 'text-red-500' : 'text-green-500'}`}>
                                    {totals.openingBalanceType?.toUpperCase()}
                                </span>
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Total Debit</p>
                            <p className="text-lg font-bold text-green-600 mt-1">
                                ₹{Number(totals.totalDebit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </p>
                        </div>
                        <div className="p-2 bg-green-50 rounded-lg">
                            <ArrowDownLeft className="w-5 h-5 text-green-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Total Credit</p>
                            <p className="text-lg font-bold text-red-600 mt-1">
                                ₹{Number(totals.totalCredit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </p>
                        </div>
                        <div className="p-2 bg-red-50 rounded-lg">
                            <ArrowUpRight className="w-5 h-5 text-red-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Closing Balance</p>
                            <p className="text-xl font-bold text-blue-600 mt-1">
                                ₹{Number(totals.closingBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                <span className={`ml-1 text-sm ${totals.closingBalanceType === 'credit' ? 'text-red-500' : 'text-green-500'}`}>
                                    {totals.closingBalanceType?.toUpperCase()}
                                </span>
                            </p>
                        </div>
                        <div className="p-2 bg-blue-50 rounded-lg">
                            <CreditCard className="w-5 h-5 text-blue-600" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Transactions Table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-4 border-b border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <Receipt size={20} className="text-gray-600" />
                        Transactions
                    </h2>

                    <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2 cursor-pointer bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                            <input
                                type="checkbox"
                                checked={showNarration}
                                onChange={(e) => setShowNarration(e.target.checked)}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm font-medium text-gray-700">Narration</span>
                        </label>
                        <button
                            onClick={openDateFilterModal}
                            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 text-gray-700 transition-colors bg-white text-sm"
                        >
                            <Calendar size={16} />
                            <span>
                                {dateFilter.startDate ?
                                    `${formatDateDisplay(dateFilter.startDate)} - ${formatDateDisplay(dateFilter.endDate)}` :
                                    'Filter by Date'}
                            </span>
                        </button>
                        {(dateFilter.startDate || dateFilter.endDate) && (
                            <button
                                onClick={handleClearDateFilter}
                                className="text-red-600 hover:text-red-800 text-sm font-medium"
                            >
                                Clear
                            </button>
                        )}
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-4 py-3 text-left font-medium text-gray-700">Date</th>
                                <th className="px-4 py-3 text-left font-medium text-gray-700">Particulars</th>
                                <th className="px-4 py-3 text-left font-medium text-gray-700">Vch Type</th>
                                <th className="px-4 py-3 text-left font-medium text-gray-700">Vch No</th>
                                <th className="px-4 py-3 text-right font-medium text-gray-700">Debit</th>
                                <th className="px-4 py-3 text-right font-medium text-gray-700">Credit</th>
                                <th className="px-4 py-3 text-right font-medium text-gray-700">Balance</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {transactions.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="px-4 py-8 text-center text-gray-500">
                                        No transactions found for this period.
                                    </td>
                                </tr>
                            ) : (
                                transactions.map((t, index) => (
                                    <tr key={index} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 text-gray-900 whitespace-nowrap">
                                            {formatDateDisplay(t.date)}
                                        </td>
                                        <td className="px-4 py-3 text-gray-900 max-w-xs" title={t.description}>
                                            <div className="truncate">{t.description}</div>
                                            {showNarration && t.narration && (
                                                <div className="text-xs text-gray-500 mt-1 italic whitespace-normal">
                                                    {t.narration}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-gray-900 whitespace-nowrap">
                                            {t.type}
                                        </td>
                                        <td className="px-4 py-3 text-gray-900 whitespace-nowrap">
                                            {t.refNo}
                                        </td>
                                        <td className="px-4 py-3 text-right text-green-600 font-medium whitespace-nowrap">
                                            {t.debit ? `₹${t.debit.toLocaleString('en-IN')}` : '-'}
                                        </td>
                                        <td className="px-4 py-3 text-right text-red-600 font-medium whitespace-nowrap">
                                            {t.credit ? `₹${t.credit.toLocaleString('en-IN')}` : '-'}
                                        </td>
                                        <td className="px-4 py-3 text-right font-bold text-gray-900 whitespace-nowrap">
                                            ₹{Math.abs(t.runningBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })} {t.runningBalanceType === 'debit' ? 'Dr' : 'Cr'}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Date Filter Modal */}
            {showDateFilterModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                <Calendar size={24} className="text-blue-600" />
                                Select Date Range
                            </h2>
                            <button
                                onClick={() => setShowDateFilterModal(false)}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                                <input
                                    type="date"
                                    value={tempDateFilter.startDate}
                                    onChange={(e) => setTempDateFilter(prev => ({ ...prev, startDate: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                                <input
                                    type="date"
                                    value={tempDateFilter.endDate}
                                    onChange={(e) => setTempDateFilter(prev => ({ ...prev, endDate: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowDateFilterModal(false)}
                                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleApplyDateFilter}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
                                >
                                    Apply Filter
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LedgerDetails;
