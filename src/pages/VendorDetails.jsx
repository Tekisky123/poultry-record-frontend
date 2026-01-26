import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import {
    ArrowLeft,
    Calendar,
    Package,
    DollarSign,
    Truck,
    Download,
    AlertCircle,
    Receipt,
    RefreshCw,
    ChevronDown,
    X,
    CreditCard
} from 'lucide-react';
import api from '../lib/axios';
import { downloadVendorLedgerExcel } from '../utils/downloadVendorLedgerExcel';

const VendorDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [vendor, setVendor] = useState(null);
    const [ledger, setLedger] = useState([]);
    const [ledgerTotals, setLedgerTotals] = useState({});
    const [ledgerPagination, setLedgerPagination] = useState({
        currentPage: 1,
        totalPages: 1,
        totalItems: 0,
        itemsPerPage: 10
    });
    const [loading, setLoading] = useState(true);
    const [isLedgerInitialLoading, setIsLedgerInitialLoading] = useState(true);
    const [isFetchingMore, setIsFetchingMore] = useState(false);
    const [refreshingLedger, setRefreshingLedger] = useState(false);
    const [error, setError] = useState('');
    const [initialLedgerLoad, setInitialLedgerLoad] = useState(true);
    const [isDownloading, setIsDownloading] = useState(false);

    const handleDownloadExcel = async () => {
        try {
            setIsDownloading(true);
            // Fetch all records for export (limit 10000)
            const params = {
                page: 1,
                limit: 10000,
                ...(dateFilter.startDate && { startDate: dateFilter.startDate }),
                ...(dateFilter.endDate && { endDate: dateFilter.endDate })
            };

            const response = await api.get(`/vendor/${id}/ledger`, { params });

            if (response.data.success) {
                const fullLedger = response.data.data.ledger;
                await downloadVendorLedgerExcel(fullLedger, vendor.vendorName);
            }
        } catch (error) {
            console.error('Error downloading Excel:', error);
            // You might want to show a toast/alert here
        } finally {
            setIsDownloading(false);
        }
    };

    const [dateFilter, setDateFilter] = useState({
        startDate: '',
        endDate: ''
    });
    const [showDateFilterModal, setShowDateFilterModal] = useState(false);
    const [tempDateFilter, setTempDateFilter] = useState({
        startDate: '',
        endDate: ''
    });
    const [showNarration, setShowNarration] = useState(false); // State for narration toggle

    // Observer for infinite scroll
    const observer = useRef();
    const lastEntryRef = useRef();

    // Setup intersection observer
    useEffect(() => {
        if (isLedgerInitialLoading || isFetchingMore) return;
        if (observer.current) observer.current.disconnect();

        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && ledgerPagination.currentPage < ledgerPagination.totalPages) {
                fetchLedger(ledgerPagination.currentPage + 1, false);
            }
        });

        if (lastEntryRef.current) observer.current.observe(lastEntryRef.current);

        return () => {
            if (observer.current) observer.current.disconnect();
        }
    }, [isLedgerInitialLoading, isFetchingMore, ledgerPagination.currentPage, ledgerPagination.totalPages]);

    useEffect(() => {
        if (id) {
            fetchVendorDetails();
        }
    }, [id]);

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
        if (vendor) {
            fetchLedger(1);
        }
    }, [vendor, dateFilter]); // Added dateFilter dependency to refetch

    const fetchVendorDetails = async (showLoading = true) => {
        try {
            if (showLoading) setLoading(true);
            const response = await api.get(`/vendor/${id}`);
            if (response.data.success) {
                setVendor(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching vendor details:', error);
            setError('Failed to fetch vendor details');
        } finally {
            if (showLoading) setLoading(false);
        }
    };

    const handleRefresh = async () => {
        setRefreshingLedger(true);
        try {
            await Promise.all([
                setTimeout(() => fetchVendorDetails(false), 1000),
                fetchLedger(1, false)
            ]);
        } catch (error) {
            console.error("Error refreshing:", error);
        } finally {
            setRefreshingLedger(false);
        }
    };

    const fetchLedger = async (page = 1, isRefresh = false) => {
        try {
            if (isRefresh) {
                setRefreshingLedger(true);
            } else if (page === 1) {
                setIsLedgerInitialLoading(true);
            } else {
                setIsFetchingMore(true);
            }

            const limit = 10;
            let query = `/vendor/${id}/ledger?page=${page}&limit=${limit}`;

            if (dateFilter.startDate) query += `&startDate=${dateFilter.startDate}`;
            if (dateFilter.endDate) query += `&endDate=${dateFilter.endDate}`;

            const filterType = searchParams.get('filterType');
            if (filterType) query += `&filterType=${filterType}`;

            const response = await api.get(query);

            if (response.data.success) {
                const data = response.data.data;
                const newEntries = data.ledger || [];

                if (page === 1) {
                    setLedger(newEntries);
                } else {
                    setLedger(prev => {
                        const existingIds = new Set(prev.map(e => e._id));
                        const uniqueEntries = newEntries.filter(e => !existingIds.has(e._id));
                        return [...prev, ...uniqueEntries];
                    });
                }

                setLedgerTotals(data.totals || {});
                if (data.pagination) setLedgerPagination(data.pagination);
            }
        } catch (error) {
            console.error('Error fetching vendor ledger:', error);
        } finally {
            if (isRefresh) setRefreshingLedger(false);
            else if (page === 1) setIsLedgerInitialLoading(false);
            else setIsFetchingMore(false);
        }
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
    };

    const formatDate = (dateString, includeTime = false) => {
        if (!dateString) return '-';
        try {
            const date = new Date(dateString);
            const day = date.getDate().toString().padStart(2, '0');
            const month = date.toLocaleDateString('en-US', { month: 'short' });
            const year = date.getFullYear().toString().slice(-2);
            return `${day}-${month}-${year}`;
        } catch (error) {
            return dateString;
        }
    };

    const formatDateDisplay = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: '2-digit'
        });
    };

    const isDateFilterActive = Boolean(dateFilter.startDate || dateFilter.endDate);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (error || !vendor) {
        return (
            <div className="text-center py-8">
                <AlertCircle className="mx-auto h-12 w-12 text-red-400 mb-4" />
                <p className="text-red-600">{error || 'Vendor not found'}</p>
                <button
                    onClick={handleBack}
                    className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                    Back to Vendors
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={handleBack}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <ArrowLeft size={20} className="text-gray-600" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{vendor.vendorName}</h1>
                        <p className="text-gray-600">{vendor.companyName}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleDownloadExcel}
                        disabled={isDownloading}
                        className="flex items-center gap-2 px-3 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Download Excel"
                    >
                        {isDownloading ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                        ) : (
                            <Download size={18} />
                        )}
                        <span className="hidden sm:inline">{isDownloading ? 'Downloading...' : 'Export'}</span>
                    </button>
                    <button
                        onClick={handleRefresh}
                        disabled={refreshingLedger}
                        className="flex items-center gap-2 px-3 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <RefreshCw className={`w-4 h-4 ${refreshingLedger ? 'animate-spin' : ''}`} />
                        {refreshingLedger ? 'Refreshing...' : 'Refresh'}
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Total Purchases</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">₹{ledgerTotals.totalAmount?.toLocaleString() || 0}</p>
                        </div>
                        <div className="p-2 bg-blue-50 rounded-lg">
                            <DollarSign className="w-5 h-5 text-blue-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Total Birds</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">{ledgerTotals.totalBirds?.toLocaleString() || 0}</p>
                        </div>
                        <div className="p-2 bg-green-50 rounded-lg">
                            <Package className="w-5 h-5 text-green-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Total Weight</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">{ledgerTotals.totalWeight?.toLocaleString() || 0} kg</p>
                        </div>
                        <div className="p-2 bg-purple-50 rounded-lg">
                            <Package className="w-5 h-5 text-purple-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Outstanding Balance</p>
                            <p className="text-2xl font-bold text-orange-600 mt-1">₹{(vendor.outstandingBalance ?? 0).toLocaleString('en-IN', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                            })}</p>
                        </div>
                        <div className="p-2 bg-orange-50 rounded-lg">
                            <CreditCard className="w-5 h-5 text-orange-600" />
                        </div>
                    </div>
                </div>
            </div>


            {/* Ledger Table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <Receipt size={20} className="text-gray-600" />
                        Vendor Reports
                    </h2>
                </div>

                {/* Date Filter Bar */}
                <div className="p-6 border-b border-gray-200 bg-gray-50">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={openDateFilterModal}
                                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 text-gray-700 transition-colors bg-white"
                                title="Filter by Date Range"
                            >
                                <Calendar size={18} />
                                <span>
                                    {isDateFilterActive
                                        ? `${formatDateDisplay(dateFilter.startDate)} - ${formatDateDisplay(dateFilter.endDate)}`
                                        : 'Filter by Date'}
                                </span>
                            </button>

                            {isDateFilterActive && (
                                <button
                                    onClick={handleClearDateFilter}
                                    className="flex items-center gap-1 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium"
                                >
                                    <X size={16} />
                                    Clear
                                </button>
                            )}
                        </div>

                        <div className="px-4 py-2 text-sm text-gray-600 border border-dashed border-gray-300 rounded-lg bg-white flex items-center gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={showNarration}
                                    onChange={(e) => setShowNarration(e.target.checked)}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-gray-700 font-medium">Show Narration</span>
                            </label>
                            <span>|</span>
                            <span>Showing: {isDateFilterActive ? `${ledger.length} filtered records` : `${ledgerPagination.totalItems} records`}</span>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                                <th className="px-3 py-3 text-left font-medium text-gray-700 whitespace-nowrap">Lifting Date</th>
                                <th className="px-3 py-3 text-left font-medium text-gray-700 whitespace-nowrap">Delivery Date</th>
                                <th className="px-3 py-3 text-left font-medium text-gray-700 whitespace-nowrap">Vehicle No</th>
                                <th className="px-3 py-3 text-left font-medium text-gray-700 whitespace-nowrap">Driver Name</th>
                                <th className="px-3 py-3 text-left font-medium text-gray-700 whitespace-nowrap">Supervisor</th>
                                <th className="px-3 py-3 text-left font-medium text-gray-700 whitespace-nowrap">Particular</th>
                                <th className="px-3 py-3 text-left font-medium text-gray-700 whitespace-nowrap">DC NO</th>
                                <th className="px-3 py-3 text-right font-medium text-gray-700 whitespace-nowrap">Birds</th>
                                <th className="px-3 py-3 text-right font-medium text-gray-700 whitespace-nowrap">Weight</th>
                                <th className="px-3 py-3 text-right font-medium text-gray-700 whitespace-nowrap">Avg</th>
                                <th className="px-3 py-3 text-right font-medium text-gray-700 whitespace-nowrap">Rate</th>
                                <th className="px-3 py-3 text-right font-medium text-gray-700 whitespace-nowrap">Debit</th>
                                <th className="px-3 py-3 text-right font-medium text-gray-700 whitespace-nowrap">Credit</th>
                                <th className="px-3 py-3 text-right font-medium text-gray-700 whitespace-nowrap">Less TDS</th>
                                <th className="px-3 py-3 text-right font-medium text-gray-700 whitespace-nowrap">Balance</th>
                                <th className="px-3 py-3 text-left font-medium text-gray-700 whitespace-nowrap">Trip ID</th>
                                <th className="px-3 py-3 text-left font-medium text-gray-700 whitespace-nowrap">Voucher No</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {ledger.map((entry, index) => (
                                <tr key={entry.uniqueId} className="hover:bg-gray-50" ref={index === ledger.length - 1 ? lastEntryRef : null}>
                                    <td className="px-3 py-3 text-gray-900 whitespace-nowrap">{formatDate(entry.liftingDate || entry.date)}</td>
                                    <td className="px-3 py-3 text-gray-900 whitespace-nowrap">{entry.type === 'OPENING' ? '-' : formatDate(entry.deliveryDate)}</td>
                                    <td className="px-3 py-3 text-gray-900 whitespace-nowrap">{entry.vehicleNo}</td>
                                    <td className="px-3 py-3 text-gray-900 whitespace-nowrap">{entry.driverName}</td>
                                    <td className="px-3 py-3 text-gray-900 whitespace-nowrap">{entry.supervisor}</td>
                                    <td className="px-3 py-3 text-gray-900 whitespace-nowrap text-xs">
                                        <span className={`px-2 py-1 rounded-full font-medium ${entry.type === 'PURCHASE' ? 'bg-blue-100 text-blue-800' :
                                            entry.type === 'PAYMENT' ? 'bg-green-100 text-green-800' :
                                                entry.type === 'OPENING' ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-800'
                                            }`}>
                                            {entry.particulars}
                                        </span>
                                        {showNarration && entry.narration && (
                                            <div className="text-xs text-gray-500 mt-1 italic whitespace-normal max-w-[200px]">
                                                {entry.narration}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-3 py-3 text-gray-900 whitespace-nowrap">{entry.dcNumber}</td>
                                    <td className="px-3 py-3 text-right text-gray-900 whitespace-nowrap">{entry.type === 'OPENING' ? '-' : (entry.birds || 0)}</td>
                                    <td className="px-3 py-3 text-right text-gray-900 whitespace-nowrap">{entry.type === 'OPENING' ? '-' : (entry.weight || 0).toFixed(2)}</td>
                                    <td className="px-3 py-3 text-right text-gray-900 whitespace-nowrap">{entry.type === 'OPENING' ? '-' : (entry.avgWeight || 0).toFixed(2)}</td>
                                    <td className="px-3 py-3 text-right text-gray-900 whitespace-nowrap">{entry.type === 'OPENING' ? '-' : `₹${(entry.rate || 0).toLocaleString()}`}</td>
                                    <td className="px-3 py-3 text-right text-green-600 font-medium whitespace-nowrap">
                                        {(() => {
                                            if (entry.type === 'OPENING') return '-';
                                            // Debit side: Payment, Journal Debit
                                            const isDebit = entry.amountType === 'debit';
                                            return isDebit ? `₹${(entry.amount || 0).toLocaleString()}` : '-';
                                        })()}
                                    </td>
                                    <td className="px-3 py-3 text-right text-red-600 font-medium whitespace-nowrap">
                                        {(() => {
                                            if (entry.type === 'OPENING') return '-';
                                            // Credit side: Purchase, Journal Credit
                                            const isCredit = entry.type === 'PURCHASE' || entry.amountType === 'credit';
                                            return isCredit ? `₹${(entry.amount || 0).toLocaleString()}` : '-';
                                        })()}
                                    </td>
                                    <td className="px-3 py-3 text-right text-gray-900 whitespace-nowrap">{entry.type === 'OPENING' ? '-' : (entry.lessTDS || 0).toLocaleString()}</td>
                                    <td className="px-3 py-3 text-right font-semibold text-gray-900 whitespace-nowrap">₹{(entry.balance || 0).toLocaleString()}</td>
                                    <td className="px-3 py-3 text-gray-900 whitespace-nowrap">
                                        {entry.tripId?.startsWith('TRP') ? (
                                            <Link to={`/trips/${entry._id}`} className="text-blue-600 hover:text-blue-800 hover:underline">
                                                {entry.tripId}
                                            </Link>
                                        ) : entry.tripId}
                                    </td>
                                    <td className="px-3 py-3 text-gray-900 whitespace-nowrap">
                                        {entry.voucherNo}
                                    </td>
                                </tr>
                            ))
                            }
                        </tbody>
                    </table>

                    {isLedgerInitialLoading && (
                        <div className="flex justify-center p-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                    )}

                    {!isLedgerInitialLoading && ledger.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                            No transactions found.
                        </div>
                    )}

                    {isFetchingMore && (
                        <div className="flex items-center justify-center py-4 border-t border-gray-200">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                            <span className="ml-2 text-sm text-gray-600">Loading more transactions...</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Date Filter Modal */}
            {
                showDateFilterModal && (
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
                )
            }
        </div >
    );
};

export default VendorDetails;
