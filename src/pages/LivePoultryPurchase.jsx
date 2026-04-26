import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, Download, Package, Calendar, ArrowLeft, X, ChevronDown } from 'lucide-react';
import * as XLSX from 'xlsx';
import api from '../lib/axios';

const formatDateDisplay = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function LivePoultryPurchase() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // We'll store normalized purchase records here
    const [purchaseRecords, setPurchaseRecords] = useState([]);

    // Financial Year helpers
    const getCurrentFinancialYear = () => {
        const now = new Date();
        return now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    };

    const getFYDates = (fyStartYear) => {
        const startDate = `${fyStartYear}-04-01`;
        const endDate = `${fyStartYear + 1}-03-31`;
        return { startDate, endDate };
    };

    const yearOptions = useMemo(() => {
        const currentYear = new Date().getFullYear();
        const options = [];
        for (let y = 2023; y <= currentYear + 1; y++) {
            options.push(y);
        }
        return options;
    }, []);

    const getInitialYear = () => {
        const paramStart = searchParams.get('startDate');
        if (paramStart) {
            const d = new Date(paramStart);
            if (d.getMonth() === 3) return d.getFullYear();
            return d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
        }
        return getCurrentFinancialYear();
    };

    const [selectedFY, setSelectedFY] = useState(getInitialYear);

    const [dateFilter, setDateFilter] = useState(() => {
        const paramStart = searchParams.get('startDate');
        const paramEnd = searchParams.get('endDate');
        if (paramStart || paramEnd) {
            return { startDate: paramStart || '', endDate: paramEnd || '' };
        }
        return getFYDates(getCurrentFinancialYear());
    });

    const handleFYChange = (fyYear) => {
        setSelectedFY(fyYear);
        const { startDate, endDate } = getFYDates(fyYear);
        setDateFilter({ startDate, endDate });

        const params = new URLSearchParams(searchParams);
        params.set('startDate', startDate);
        params.set('endDate', endDate);
        navigate(`/live-poultry-purchase/monthly-summary?${params.toString()}`);
    };

    // Date Filter Modal States
    const [showDateFilterModal, setShowDateFilterModal] = useState(false);
    const [tempDateFilter, setTempDateFilter] = useState({
        startDate: '',
        endDate: ''
    });

    const isDateFilterActive = !!(dateFilter.startDate || dateFilter.endDate);

    const getEffectiveDates = () => {
        let start = dateFilter.startDate;
        let end = dateFilter.endDate;
        const d = new Date();
        const year = d.getFullYear();
        if (start && !end) {
            end = `${year}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        } else if (!start && end) {
            start = `${year}-01-01`;
        }
        return { start, end };
    };

    const { start: effectiveStart, end: effectiveEnd } = getEffectiveDates();

    const openDateFilterModal = () => {
        setTempDateFilter(dateFilter);
        setShowDateFilterModal(true);
    };

    const handleApplyDateFilter = () => {
        setDateFilter(tempDateFilter);
        setShowDateFilterModal(false);
        const params = new URLSearchParams(searchParams);
        if (tempDateFilter.startDate) params.set('startDate', tempDateFilter.startDate);
        else params.delete('startDate');
        if (tempDateFilter.endDate) params.set('endDate', tempDateFilter.endDate);
        else params.delete('endDate');
        navigate(`/live-poultry-purchase/monthly-summary?${params.toString()}`);
    };

    const handleClearDateFilter = () => {
        const fyDates = getFYDates(getCurrentFinancialYear());
        setSelectedFY(getCurrentFinancialYear());
        setDateFilter(fyDates);
        const params = new URLSearchParams(searchParams);
        params.delete('startDate');
        params.delete('endDate');
        navigate(`/live-poultry-purchase/monthly-summary?${params.toString()}`);
    };

    // Sync FY from URL if navigates back/forth
    useEffect(() => {
        const start = searchParams.get('startDate');
        const end = searchParams.get('endDate');
        if (start || end) {
            setDateFilter({ startDate: start || '', endDate: end || '' });
            if (start) {
                const d = new Date(start);
                if (d.getMonth() === 3) setSelectedFY(d.getFullYear());
            }
        } else {
            setDateFilter(getFYDates(getCurrentFinancialYear()));
            setSelectedFY(getCurrentFinancialYear());
        }
    }, [searchParams]);

    // For infinite scroll
    useEffect(() => {
        fetchData(dateFilter.startDate, dateFilter.endDate);
    }, [dateFilter.startDate, dateFilter.endDate]);

    const fetchData = async (startDateParam, endDateParam) => {
        // Use passed params (from useEffect) to avoid stale closure issues
        const resolvedStart = startDateParam !== undefined ? startDateParam : dateFilter.startDate;
        const resolvedEnd = endDateParam !== undefined ? endDateParam : dateFilter.endDate;

        setLoading(true);
        setError('');
        try {
            let startOfPeriod, endOfPeriod;
            if (resolvedStart && resolvedEnd) {
                startOfPeriod = resolvedStart;
                endOfPeriod = resolvedEnd;
            } else if (resolvedStart) {
                startOfPeriod = resolvedStart;
                const d = new Date();
                endOfPeriod = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            } else if (resolvedEnd) {
                startOfPeriod = `${selectedFY}-04-01`;
                endOfPeriod = resolvedEnd;
            } else {
                startOfPeriod = `${selectedFY}-04-01`;
                endOfPeriod = `${selectedFY + 1}-03-31`;
            }

            // 1. Fetch Inventory & Trip Stocks
            const invRes = await api.get('/inventory-stock', {
                params: {
                    startDate: startOfPeriod,
                    endDate: endOfPeriod,
                    type: 'purchase'
                }
            });

            // 2. Fetch Indirect Sales (contains indirect purchases)
            let indirectSalesList = [];
            let page = 1;
            let totalPages = 1;
            do {
                const indRes = await api.get('/indirect-sales', {
                    params: {
                        startDate: startOfPeriod,
                        endDate: endOfPeriod,
                        page,
                        limit: 500
                    }
                });

                if (indRes.data.success && indRes.data.data) {
                    indirectSalesList.push(...indRes.data.data.records);
                    totalPages = indRes.data.data.pagination?.totalPages || 1;
                } else {
                    break;
                }
                page++;
            } while (page <= totalPages && page <= 200); // fetches all pages (up to 100,000 records)
            // 3. Fetch Trips (contains direct purchases)
            let tripsList = [];
            let tripPage = 1;
            let tripTotalPages = 1;
            do {
                const tripRes = await api.get('/trip', {
                    params: {
                        startDate: startOfPeriod,
                        endDate: endOfPeriod,
                        page: tripPage,
                        limit: 500
                    }
                });

                if (tripRes.data.success && tripRes.data.trips) {
                    tripsList.push(...tripRes.data.trips);
                    tripTotalPages = tripRes.data.pagination?.pages || 1;
                } else if (tripRes.data.data && tripRes.data.data.trips) {
                    tripsList.push(...tripRes.data.data.trips);
                    tripTotalPages = tripRes.data.data.pagination?.pages || 1;
                } else {
                    break;
                }
                tripPage++;
            } while (tripPage <= tripTotalPages && tripPage <= 200); // fetches all pages (up to 100,000 records)

            // Process and normalize records
            let combinedRecords = [];

            // A. Process Inventory & Trip Stocks
            if (invRes.data.success && invRes.data.data) {
                invRes.data.data.forEach(stock => {
                    const vendorName = stock.vendorId?.vendorName || stock.vendorId?.companyName || stock.vendorId?.name || 'N/A';

                    if (stock.inventoryType === 'feed') return;

                    let typeLabel = 'OTHER PURCHASE';
                    if (stock.source === 'trip') {
                        // Skip 'trip' source stocks because we now fetch them from exact trip purchases
                        return;
                    } else if (stock.inventoryType === 'bird') {
                        typeLabel = 'STOCK POINT PURCHASE';
                    }

                    const weight = Number(stock.weight) || 0;
                    const birds = Number(stock.birds) || 0;
                    const amount = Number(stock.amount) || 0;
                    const rate = Number(stock.rate) || (weight > 0 ? amount / weight : 0);

                    combinedRecords.push({
                        id: stock._id,
                        tripId: stock.tripId,
                        date: new Date(stock.date),
                        particular: vendorName,
                        type: typeLabel,
                        birds: birds,
                        quantity: weight,
                        rate: rate,
                        amount: amount
                    });
                });
            }

            // B. Process Indirect Purchases
            indirectSalesList.forEach(indSale => {
                const vendorName = indSale.vendor?.vendorName || indSale.vendor?.companyName || 'N/A';

                if (indSale.purchases && Array.isArray(indSale.purchases)) {
                    indSale.purchases.forEach(p => {
                        const weight = Number(p.weight) || 0;
                        const birds = Number(p.birds) || 0;
                        const amount = Number(p.amount) || 0;
                        const rate = Number(p.rate) || 0;

                        combinedRecords.push({
                            id: p._id || `${indSale._id}-${Math.random()}`,
                            indirectId: indSale._id,
                            date: new Date(indSale.date), // The indirect sale date applies to its purchases
                            particular: vendorName,
                            type: 'INDIRECT PURCHASE',
                            birds: birds,
                            quantity: weight,
                            rate: rate,
                            amount: amount
                        });
                    });
                }
            });

            // C. Process Direct Purchases from Trips
            tripsList.forEach(trip => {
                if (trip.purchases && Array.isArray(trip.purchases)) {
                    trip.purchases.forEach(p => {
                        const vendorName = p.supplier?.vendorName || p.supplier?.companyName || p.supplier?.name || p.vendorName || p.supplierName || 'N/A';
                        const weight = Number(p.weight) || 0;
                        const birds = Number(p.birds) || 0;
                        const amount = Number(p.amount) || 0;
                        // For rate: sometimes p.rate is set, otherwise calculate from weight/amount
                        const rate = Number(p.rate) || (weight > 0 ? amount / weight : 0);

                        combinedRecords.push({
                            id: p._id || `${trip._id}-${Math.random()}`,
                            tripId: trip.id || trip._id,
                            date: new Date(trip.date || p.date), // The trip date
                            particular: vendorName,
                            type: 'DIRECT PURCHASE (Trip Purchase)',
                            birds: birds,
                            quantity: weight,
                            rate: rate,
                            amount: amount
                        });
                    });
                }
            });

            // Sort chronologically
            combinedRecords.sort((a, b) => a.date - b.date);

            setPurchaseRecords(combinedRecords);
        } catch (err) {
            console.error('Error fetching purchases data:', err);
            setError(err.response?.data?.message || 'Failed to fetch purchases data');
        } finally {
            setLoading(false);
        }
    };

    const handleExportToExcel = () => {
        if (!purchaseRecords.length) return;

        const exportData = purchaseRecords.map(record => ({
            'Date': record.date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }).replace(/ /g, '-'),
            'Particular': record.particular,
            'Type': record.type,
            'No. Of Birds': record.birds,
            'Quantity (kg)': record.quantity,
            'Rate': record.rate.toFixed(2),
            'Amount': record.amount
        }));

        const totalBirds = purchaseRecords.reduce((sum, r) => sum + (r.birds || 0), 0);
        const totalQty = purchaseRecords.reduce((sum, r) => sum + r.quantity, 0);
        const totalAmount = purchaseRecords.reduce((sum, r) => sum + r.amount, 0);

        exportData.push({
            'Date': 'Total',
            'Particular': '',
            'Type': '',
            'No. Of Birds': totalBirds,
            'Quantity (kg)': totalQty,
            'Rate': '',
            'Amount': totalAmount
        });

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Monthly Purchases");

        const fileName = (dateFilter.startDate || dateFilter.endDate)
            ? `Live_Poultry_Purchases_${dateFilter.startDate || 'start'}_to_${dateFilter.endDate || 'end'}.xlsx`
            : `Live_Poultry_Purchases_Year_${new Date().getFullYear()}.xlsx`;

        XLSX.writeFile(wb, fileName);
    };



    if (loading && !purchaseRecords.length) return <div className="flex justify-center p-12"><Loader2 className="animate-spin w-8 h-8 text-blue-600" /></div>;

    const totalBirds = purchaseRecords.reduce((sum, r) => sum + (r.birds || 0), 0);
    const totalQty = purchaseRecords.reduce((sum, r) => sum + r.quantity, 0);
    const totalAmount = purchaseRecords.reduce((sum, r) => sum + r.amount, 0);

    const visibleRecords = purchaseRecords;

    const handleRowClick = (record) => {
        if (record.type === 'DIRECT PURCHASE (Trip Purchase)' && record.tripId) {
            navigate(`/trips/${record.tripId}`);
        } else if (record.type === 'STOCK POINT PURCHASE') {
            const y = record.date.getFullYear();
            const m = String(record.date.getMonth() + 1).padStart(2, '0');
            const d = String(record.date.getDate()).padStart(2, '0');
            navigate(`/stocks/manage?date=${y}-${m}-${d}`);
        } else if (record.type === 'INDIRECT PURCHASE' && record.indirectId) {
            navigate(`/indirect-sales/${record.indirectId}`);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 bg-white shadow-sm"
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                            <Package className="w-8 h-8 text-indigo-600" />
                            Live Poultry Birds Purchase
                        </h1>
                    </div>
                    <p className="text-gray-600 mt-1">{isDateFilterActive ? 'Summary for Selected Period' : 'Yearly Summary of All Purchases'}</p>
                </div>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-3 border-t md:border-none border-gray-200">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <select
                                value={selectedFY}
                                onChange={(e) => handleFYChange(Number(e.target.value))}
                                className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-10 font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition-colors cursor-pointer focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
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
                            onClick={openDateFilterModal}
                            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 transition-colors bg-white shadow-sm"
                            title="Filter by Date Range"
                        >
                            <Calendar size={18} className="text-gray-500" />
                            <span className="font-medium">
                                {isDateFilterActive
                                    ? `${formatDateDisplay(effectiveStart)} - ${formatDateDisplay(effectiveEnd)}`
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
                    <button
                        onClick={handleExportToExcel}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-sm transition-colors"
                    >
                        <Download size={20} />
                        <span className="font-medium">Export</span>
                    </button>
                </div>
            </div>

            {error && (
                <div className="p-4 bg-red-50 text-red-600 rounded-lg shadow-sm border border-red-200">
                    <p>{error}</p>
                    <button onClick={fetchData} className="mt-2 text-sm font-medium underline">Retry</button>
                </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
                <table className="w-full text-sm text-center">
                    <thead className="bg-gray-100 text-gray-700 uppercase font-semibold border-b-2 border-gray-300">
                        <tr>
                            <th className="py-3 px-4 text-left border-r border-gray-300">Date</th>
                            <th className="py-3 px-4 text-left border-r border-gray-300">Particular</th>
                            <th className="py-3 px-4 border-r border-gray-300">Type</th>
                            <th className="py-3 px-4 border-r border-gray-300 text-right">No. Of Birds</th>
                            <th className="py-3 px-4 border-r border-gray-300 text-right">Quantity (kg)</th>
                            <th className="py-3 px-4 border-r border-gray-300 text-right">Rate</th>
                            <th className="py-3 px-4 text-right">Amount</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {visibleRecords.length > 0 ? (
                            visibleRecords.map((record, idx) => (
                                <tr
                                    key={record.id || idx}
                                    onClick={() => handleRowClick(record)}
                                    className="hover:bg-gray-100 transition-colors cursor-pointer"
                                >
                                    <td className="py-3 px-4 border-r text-left text-gray-900 whitespace-nowrap">
                                        {record.date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }).replace(/ /g, '-')}
                                    </td>
                                    <td className="py-3 px-4 border-r text-left font-medium text-gray-900">
                                        {record.particular}
                                    </td>
                                    <td className="py-3 px-4 border-r font-medium text-center">
                                        <span className={`px-2 py-1 rounded-md border uppercase text-xs whitespace-nowrap ${record.type.toLowerCase().includes('indirect')
                                            ? 'bg-purple-50 border-purple-200 text-purple-700'
                                            : record.type.toLowerCase().includes('direct')
                                                ? 'bg-blue-50 border-blue-200 text-blue-700'
                                                : record.type.toLowerCase().includes('stock point')
                                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                                    : 'bg-gray-50 border-gray-200 text-gray-700'
                                            }`}>
                                            {record.type}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4 text-right border-r text-gray-900 font-medium">
                                        {record.birds ? record.birds.toLocaleString('en-IN') : 0}
                                    </td>
                                    <td className="py-3 px-4 text-right border-r text-gray-900 font-medium">
                                        {record.quantity.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="py-3 px-4 text-right border-r text-gray-600">
                                        {record.rate.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                    <td className="py-3 px-4 text-right text-gray-900 font-bold">
                                        {record.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="7" className="py-8 text-center text-gray-500 italic">
                                    No purchase records found for {isDateFilterActive ? 'the selected date period' : `the current year`}
                                </td>
                            </tr>
                        )}
                    </tbody>
                    {purchaseRecords.length > 0 && (
                        <tfoot className="bg-gray-100 font-bold text-gray-900 border-t-2 border-gray-400">
                            <tr>
                                <td colSpan="3" className="py-3 px-4 border-r uppercase text-sm text-right">Totals</td>
                                <td className="py-3 px-4 text-right border-r">{totalBirds.toLocaleString('en-IN')}</td>
                                <td className="py-3 px-4 text-right border-r">{totalQty.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                <td className="py-3 px-4 text-right border-r">
                                    {totalQty > 0 ? (totalAmount / totalQty).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                                </td>
                                <td className="py-3 px-4 text-right text-indigo-700">
                                    {totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </td>
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>

            {/* Date Filter Modal */}
            {showDateFilterModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                <Calendar size={24} className="text-indigo-600" />
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
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                                <input
                                    type="date"
                                    value={tempDateFilter.endDate}
                                    onChange={(e) => setTempDateFilter(prev => ({ ...prev, endDate: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
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
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors border border-transparent"
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
}
