import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, Download, TrendingUp, ArrowLeft, Calendar, X, ChevronDown } from 'lucide-react';
import * as XLSX from 'xlsx';
import api from '../lib/axios';

const formatDateDisplay = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const extractPanFromGst = (gst) => {
    if (!gst) return '-';
    const cleanGst = gst.trim().toUpperCase();
    if (cleanGst.length === 15) {
        return cleanGst.substring(2, 12);
    }
    return '-';
};

export default function LivePoultrySales() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // We'll store normalized sale records here
    const [saleRecords, setSaleRecords] = useState([]);

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
        navigate(`/live-poultry-sales/monthly-summary?${params.toString()}`);
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
        navigate(`/live-poultry-sales/monthly-summary?${params.toString()}`);
    };

    const handleClearDateFilter = () => {
        const fyDates = getFYDates(getCurrentFinancialYear());
        setSelectedFY(getCurrentFinancialYear());
        setDateFilter(fyDates);
        const params = new URLSearchParams(searchParams);
        params.delete('startDate');
        params.delete('endDate');
        navigate(`/live-poultry-sales/monthly-summary?${params.toString()}`);
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
            if (resolvedStart && resolvedEnd && !isNaN(new Date(resolvedStart).getTime()) && !isNaN(new Date(resolvedEnd).getTime())) {
                startOfPeriod = resolvedStart;
                endOfPeriod = resolvedEnd;
            } else if (resolvedStart && !isNaN(new Date(resolvedStart).getTime())) {
                startOfPeriod = resolvedStart;
                const d = new Date();
                endOfPeriod = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            } else if (resolvedEnd && !isNaN(new Date(resolvedEnd).getTime())) {
                startOfPeriod = `${selectedFY}-04-01`;
                endOfPeriod = resolvedEnd;
            } else {
                startOfPeriod = `${selectedFY}-04-01`;
                endOfPeriod = `${selectedFY + 1}-03-31`;
            }

            let combinedRecords = [];

            // 1. Fetch Inventory Stocks (type = 'sale')
            const invParams = { type: 'sale' };
            if (startOfPeriod) invParams.startDate = startOfPeriod;
            if (endOfPeriod) invParams.endDate = endOfPeriod;

            const invRes = await api.get('/inventory-stock', { params: invParams });

            if (invRes.data.success && invRes.data.data) {
                invRes.data.data.forEach(stock => {
                    const customer = stock.customerId;
                    const customerName = customer?.shopName || customer?.ownerName || customer?.name || stock.customerName || 'N/A';
                    const rawGst = customer?.gstNumber || stock.gstNo || stock.gstNumber || '';
                    const rawPan = customer?.panNumber || stock.panNo || stock.panNumber || extractPanFromGst(rawGst);
                    const gstNo = rawGst || '-';
                    const panNo = rawPan || '-';

                    let typeLabel = 'OTHER SALES';
                    if (stock.inventoryType === 'bird') {
                        typeLabel = 'STOCK POINT SALES';
                    } else if (stock.inventoryType === 'feed') {
                        typeLabel = 'FEED STOCK SALE';
                    }

                    const weight = Number(stock.weight) || 0;
                    const birds = Number(stock.birds) || 0;
                    const amount = Number(stock.amount) || 0;
                    const rate = Number(stock.rate) || (weight > 0 ? amount / weight : 0);
                    const vehicleNo = stock.vehicleNumber || stock.vehicleId?.vehicleNumber || stock.vehicleNo || '-';
                    const driver = stock.driver || stock.driverName || '-';

                    combinedRecords.push({
                        id: stock._id,
                        date: new Date(stock.date),
                        particular: customerName,
                        type: typeLabel,
                        birds: birds,
                        quantity: weight,
                        rate: rate,
                        amount: amount,
                        vehicleNo: vehicleNo,
                        driver: driver,
                        gstNo: gstNo,
                        panNo: panNo
                    });
                });
            }

            // 2. Fetch Trip Sales
            let tripPage = 1;
            let tripTotalPages = 1;
            do {
                const tripsRes = await api.get('/trip', {
                    params: {
                        startDate: startOfPeriod,
                        endDate: endOfPeriod,
                        page: tripPage,
                        limit: 500
                    }
                });
                if (tripsRes.data.success) {
                    const trips = tripsRes.data.trips || (tripsRes.data.data && tripsRes.data.data.trips) || [];
                    trips.forEach(trip => {
                        if (trip.sales && Array.isArray(trip.sales)) {
                            trip.sales.forEach(sale => {
                                const client = sale.client;
                                const customerName = client?.shopName || client?.ownerName || client?.name || sale.clientName || sale.customerName || 'N/A';
                                const rawGst = client?.gstNumber || sale.gstNo || sale.gstNumber || trip.gstNo || '';
                                const rawPan = client?.panNumber || sale.panNo || sale.panNumber || trip.panNo || extractPanFromGst(rawGst);
                                const gstNo = rawGst || '-';
                                const panNo = rawPan || '-';

                                const weight = Number(sale.weight) || 0;
                                const birds = Number(sale.birds) || 0;
                                const amount = Number(sale.amount) || 0;
                                const rate = Number(sale.rate) || 0;
                                const vehicleNo = trip.vehicle?.vehicleNumber || trip.vehicleNo || trip.vehicleNumber || '-';
                                const driver = trip.driver || trip.driverName || '-';

                                const saleDate = sale.timestamp ? new Date(sale.timestamp) : new Date(trip.date);
                                const saleDateStr = !isNaN(saleDate.getTime()) ? saleDate.toISOString().split('T')[0] : '';

                                if (!saleDateStr || (saleDateStr >= startOfPeriod && saleDateStr <= endOfPeriod)) {
                                    combinedRecords.push({
                                        id: sale._id || `${trip.id || trip._id}-${Math.random()}`,
                                        tripId: trip.id || trip._id,
                                        date: saleDate,
                                        particular: customerName,
                                        type: 'DIRECT SALES (Trip Sales)',
                                        birds: birds,
                                        quantity: weight,
                                        rate: rate,
                                        amount: amount,
                                        vehicleNo: vehicleNo,
                                        driver: driver,
                                        gstNo: gstNo,
                                        panNo: panNo
                                    });
                                }
                            });
                        }
                    });
                    tripTotalPages = tripsRes.data.pagination?.pages || tripsRes.data.data?.pagination?.pages || 1;
                } else {
                    break;
                }
                tripPage++;
            } while (tripPage <= tripTotalPages && tripPage <= 200);

            // 3. Fetch Indirect Sales
            let indPage = 1;
            let indTotalPages = 1;
            do {
                const indRes = await api.get('/indirect-sales', {
                    params: {
                        startDate: startOfPeriod,
                        endDate: endOfPeriod,
                        page: indPage,
                        limit: 500
                    }
                });

                if (indRes.data.success && indRes.data.data) {
                    const records = indRes.data.data.records || [];
                    records.forEach(indSale => {
                        const customer = indSale.customer;
                        const customerName = customer?.shopName || customer?.ownerName || customer?.name || indSale.customerName || 'N/A';
                        const rawGst = customer?.gstNumber || indSale.gstNo || indSale.gstNumber || '';
                        const rawPan = customer?.panNumber || indSale.panNo || indSale.panNumber || extractPanFromGst(rawGst);
                        const gstNo = rawGst || '-';
                        const panNo = rawPan || '-';
                        const vehicleNo = indSale.vehicleNumber || indSale.vehicleNo || '-';
                        const driver = indSale.driver || indSale.driverName || '-';

                        if (indSale.sales) {
                            const weight = Number(indSale.sales.weight) || 0;
                            const birds = Number(indSale.sales.birds) || 0;
                            const amount = Number(indSale.sales.amount) || 0;
                            const rate = Number(indSale.sales.rate) || 0;

                            if (weight > 0 || amount > 0) {
                                combinedRecords.push({
                                    id: indSale._id,
                                    indirectId: indSale._id,
                                    date: new Date(indSale.date),
                                    particular: customerName,
                                    type: 'INDIRECT SALES',
                                    birds: birds,
                                    quantity: weight,
                                    rate: rate,
                                    amount: amount,
                                    vehicleNo: vehicleNo,
                                    driver: driver,
                                    gstNo: gstNo,
                                    panNo: panNo
                                });
                            }
                        }
                    });
                    indTotalPages = indRes.data.data.pagination?.totalPages || 1;
                } else {
                    break;
                }
                indPage++;
            } while (indPage <= indTotalPages && indPage <= 200);

            // Sort chronologically
            combinedRecords.sort((a, b) => {
                const timeA = a.date instanceof Date && !isNaN(a.date) ? a.date.getTime() : 0;
                const timeB = b.date instanceof Date && !isNaN(b.date) ? b.date.getTime() : 0;
                return timeA - timeB;
            });

            setSaleRecords(combinedRecords);
        } catch (err) {
            console.error('Error fetching sales data:', err);
            setError(err.response?.data?.message || 'Failed to fetch sales data');
        } finally {
            setLoading(false);
        }
    };

    const [viewMode, setViewMode] = useState('monthly'); // 'monthly' or 'detailed'

    const monthlySummaryData = useMemo(() => {
        const MONTH_NAMES = [
            'April', 'May', 'June', 'July', 'August', 'September',
            'October', 'November', 'December', 'January', 'February', 'March'
        ];

        // Initialize 12 financial year months
        const months = MONTH_NAMES.map((name, index) => {
            const calendarMonthIndex = (index + 3) % 12; // Apr=3, ..., Mar=2
            const calYear = index < 9 ? selectedFY : selectedFY + 1;
            const startDateStr = `${calYear}-${String(calendarMonthIndex + 1).padStart(2, '0')}-01`;
            return {
                name,
                year: calYear,
                monthIndex: calendarMonthIndex,
                startDate: startDateStr,
                birds: 0,
                quantity: 0,
                amount: 0,
                count: 0
            };
        });

        saleRecords.forEach(record => {
            if (!(record.date instanceof Date) || isNaN(record.date.getTime())) return;
            const rYear = record.date.getFullYear();
            const rMonth = record.date.getMonth(); // 0-11

            // Find matching month slot
            const slot = months.find(m => m.year === rYear && m.monthIndex === rMonth);
            if (slot) {
                slot.birds += Number(record.birds) || 0;
                slot.quantity += Number(record.quantity) || 0;
                slot.amount += Number(record.amount) || 0;
                slot.count += 1;
            }
        });

        return months;
    }, [saleRecords, selectedFY]);

    const handleMonthRowClick = (monthItem) => {
        const mNum = String(monthItem.monthIndex + 1).padStart(2, '0');
        const start = `${monthItem.year}-${mNum}-01`;
        // Last day of month
        const lastDay = new Date(monthItem.year, monthItem.monthIndex + 1, 0).getDate();
        const end = `${monthItem.year}-${mNum}-${String(lastDay).padStart(2, '0')}`;

        setDateFilter({ startDate: start, endDate: end });
        setViewMode('detailed');
    };

    const handleExportToExcel = () => {
        if (!saleRecords.length) return;

        if (viewMode === 'monthly') {
            const exportData = monthlySummaryData.map(m => ({
                'Month': `${m.name} ${m.year}`,
                'No. Of Birds': m.birds,
                'Quantity (kg)': m.quantity,
                'Total Amount': m.amount
            }));

            const grandBirds = monthlySummaryData.reduce((sum, m) => sum + m.birds, 0);
            const grandQty = monthlySummaryData.reduce((sum, m) => sum + m.quantity, 0);
            const grandAmount = monthlySummaryData.reduce((sum, m) => sum + m.amount, 0);

            exportData.push({
                'Month': 'Grand Total',
                'No. Of Birds': grandBirds,
                'Quantity (kg)': grandQty,
                'Total Amount': grandAmount
            });

            const ws = XLSX.utils.json_to_sheet(exportData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Monthly Sales Summary");
            XLSX.writeFile(wb, `Live_Poultry_Sales_Monthly_Summary_FY_${selectedFY}-${selectedFY + 1}.xlsx`);
            return;
        }

        const exportData = saleRecords.map(record => {
            const validDate = record.date instanceof Date && !isNaN(record.date) ? record.date : null;
            const dateStr = validDate
                ? validDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }).replace(/ /g, '-')
                : '-';

            return {
                'Date': dateStr,
                'Particular': record.particular || '-',
                'Type': record.type || '-',
                'No. Of Birds': record.birds || 0,
                'Quantity (kg)': record.quantity || 0,
                'Rate': typeof record.rate === 'number' ? record.rate.toFixed(2) : '0.00',
                'Amount': record.amount || 0,
                'Vehicle No': record.vehicleNo || '-',
                'Driver': record.driver || '-',
                'GST No': record.gstNo || '-',
                'PAN No': record.panNo || '-'
            };
        });

        const totalBirds = saleRecords.reduce((sum, r) => sum + (r.birds || 0), 0);
        const totalQty = saleRecords.reduce((sum, r) => sum + r.quantity, 0);
        const totalAmount = saleRecords.reduce((sum, r) => sum + r.amount, 0);

        exportData.push({
            'Date': 'Total',
            'Particular': '',
            'Type': '',
            'No. Of Birds': totalBirds,
            'Quantity (kg)': totalQty,
            'Rate': '',
            'Amount': totalAmount,
            'Vehicle No': '',
            'Driver': '',
            'GST No': '',
            'PAN No': ''
        });

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Monthly Sales");

        const fileName = (dateFilter.startDate || dateFilter.endDate)
            ? `Live_Poultry_Sales_${dateFilter.startDate || 'start'}_to_${dateFilter.endDate || 'end'}.xlsx`
            : `Live_Poultry_Sales_Year_${new Date().getFullYear()}.xlsx`;
        XLSX.writeFile(wb, fileName);
    };

    if (loading && !saleRecords.length) return <div className="flex justify-center p-12"><Loader2 className="animate-spin w-8 h-8 text-blue-600" /></div>;

    const totalBirds = saleRecords.reduce((sum, r) => sum + (r.birds || 0), 0);
    const totalQty = saleRecords.reduce((sum, r) => sum + r.quantity, 0);
    const totalAmount = saleRecords.reduce((sum, r) => sum + r.amount, 0);

    const visibleRecords = saleRecords;

    const handleRowClick = (record) => {
        if (record.type === 'DIRECT SALES (Trip Sales)' && record.tripId) {
            navigate(`/trips/${record.tripId}`);
        } else if (record.type === 'STOCK POINT SALES' || record.type === 'FEED STOCK SALE') {
            const y = record.date.getFullYear();
            const m = String(record.date.getMonth() + 1).padStart(2, '0');
            const d = String(record.date.getDate()).padStart(2, '0');
            navigate(`/stocks/manage?date=${y}-${m}-${d}`);
        } else if (record.type === 'INDIRECT SALES' && record.indirectId) {
            navigate(`/indirect-sales/${record.indirectId}`);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 bg-white shadow-sm"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Live Poultry Birds Sales</h1>
                        <p className="text-gray-600">Overview of Live Poultry Birds Sales Records</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <select
                        value={selectedFY}
                        onChange={(e) => handleFYChange(Number(e.target.value))}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-sm"
                    >
                        {yearOptions.map((y) => (
                            <option key={y} value={y}>
                                FY {y}-{y + 1}
                            </option>
                        ))}
                    </select>

                    <button
                        onClick={() => setViewMode(viewMode === 'monthly' ? 'detailed' : 'monthly')}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 font-medium text-sm bg-white"
                    >
                        {viewMode === 'monthly' ? 'View All Records' : 'View Monthly Summary'}
                    </button>

                    <button
                        onClick={handleExportToExcel}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-sm transition-colors text-sm font-medium"
                    >
                        <Download size={18} />
                        <span>Export</span>
                    </button>
                </div>
            </div>

            {error && (
                <div className="p-4 bg-red-50 text-red-600 rounded-lg shadow-sm border border-red-200">
                    <p>{error}</p>
                    <button onClick={fetchData} className="mt-2 text-sm font-medium underline">Retry</button>
                </div>
            )}

            {viewMode === 'monthly' ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-3 font-medium text-gray-700 text-left">Month</th>
                                    <th className="px-6 py-3 font-medium text-gray-700 text-right">No. Of Birds</th>
                                    <th className="px-6 py-3 font-medium text-gray-700 text-right">Quantity (kg)</th>
                                    <th className="px-6 py-3 font-medium text-gray-700 text-right">Total Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {monthlySummaryData.map((m, index) => (
                                    <tr
                                        key={index}
                                        onClick={() => handleMonthRowClick(m)}
                                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                                    >
                                        <td className="px-6 py-4 font-medium text-blue-600 hover:underline text-left">
                                            {m.name} {m.year}
                                        </td>
                                        <td className="px-6 py-4 text-right text-gray-900">
                                            {m.birds > 0 ? m.birds.toLocaleString('en-IN') : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-right text-gray-900">
                                            {m.quantity > 0 ? m.quantity.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-right text-gray-900 font-semibold">
                                            {m.amount > 0 ? `₹${m.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}
                                        </td>
                                    </tr>
                                ))}
                                <tr className="bg-gray-100 font-bold border-t-2 border-gray-300">
                                    <td className="px-6 py-4 text-gray-900 text-left">Total</td>
                                    <td className="px-6 py-4 text-right text-gray-900">
                                        {monthlySummaryData.reduce((sum, m) => sum + m.birds, 0).toLocaleString('en-IN')}
                                    </td>
                                    <td className="px-6 py-4 text-right text-gray-900">
                                        {monthlySummaryData.reduce((sum, m) => sum + m.quantity, 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-6 py-4 text-right text-gray-900">
                                        ₹{monthlySummaryData.reduce((sum, m) => sum + m.amount, 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3 font-medium text-gray-700 text-left whitespace-nowrap">Date</th>
                                <th className="px-6 py-3 font-medium text-gray-700 text-left whitespace-nowrap">Particular</th>
                                <th className="px-6 py-3 font-medium text-gray-700 text-center whitespace-nowrap">Type</th>
                                <th className="px-6 py-3 font-medium text-gray-700 text-right whitespace-nowrap">No. Of Birds</th>
                                <th className="px-6 py-3 font-medium text-gray-700 text-right whitespace-nowrap">Quantity (kg)</th>
                                <th className="px-6 py-3 font-medium text-gray-700 text-right whitespace-nowrap">Rate</th>
                                <th className="px-6 py-3 font-medium text-gray-700 text-right whitespace-nowrap">Amount</th>
                                <th className="px-6 py-3 font-medium text-gray-700 text-left whitespace-nowrap">Vehicle No</th>
                                <th className="px-6 py-3 font-medium text-gray-700 text-left whitespace-nowrap">Driver</th>
                                <th className="px-6 py-3 font-medium text-gray-700 text-left whitespace-nowrap">GST No</th>
                                <th className="px-6 py-3 font-medium text-gray-700 text-left whitespace-nowrap">PAN No</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {visibleRecords.length > 0 ? (
                                visibleRecords.map((record, idx) => {
                                    const validDate = record.date instanceof Date && !isNaN(record.date) ? record.date : null;
                                    const dateStr = validDate
                                        ? validDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }).replace(/ /g, '-')
                                        : '-';

                                    return (
                                        <tr
                                            key={record.id || idx}
                                            onClick={() => handleRowClick(record)}
                                            className="hover:bg-gray-50 cursor-pointer transition-colors"
                                        >
                                            <td className="px-6 py-4 text-left text-gray-900 whitespace-nowrap">
                                                {dateStr}
                                            </td>
                                            <td className="px-6 py-4 text-left font-medium text-gray-900 whitespace-nowrap">
                                                {record.particular || '-'}
                                            </td>
                                            <td className="px-6 py-4 text-center text-gray-900 font-medium whitespace-nowrap">
                                                {record.type || '-'}
                                            </td>
                                            <td className="px-6 py-4 text-right text-gray-900 whitespace-nowrap">
                                                {record.birds ? record.birds.toLocaleString('en-IN') : 0}
                                            </td>
                                            <td className="px-6 py-4 text-right text-gray-900 whitespace-nowrap">
                                                {(record.quantity || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="px-6 py-4 text-right text-gray-600 whitespace-nowrap">
                                                {(record.rate || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </td>
                                            <td className="px-6 py-4 text-right text-gray-900 font-semibold whitespace-nowrap">
                                                {(record.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="px-6 py-4 text-left text-gray-900 whitespace-nowrap">
                                                {record.vehicleNo || '-'}
                                            </td>
                                            <td className="px-6 py-4 text-left text-gray-900 whitespace-nowrap">
                                                {record.driver || '-'}
                                            </td>
                                            <td className="px-6 py-4 text-left text-gray-900 whitespace-nowrap">
                                                {record.gstNo || '-'}
                                            </td>
                                            <td className="px-6 py-4 text-left text-gray-900 whitespace-nowrap">
                                                {record.panNo || '-'}
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan="11" className="py-8 text-center text-gray-500 italic">
                                        No sales records found for {isDateFilterActive ? 'the selected date period' : `the current year`}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                        {saleRecords.length > 0 && (
                            <tfoot className="bg-gray-100 font-bold border-t-2 border-gray-300">
                                <tr>
                                    <td colSpan="3" className="px-6 py-4 uppercase text-sm text-right text-gray-900 whitespace-nowrap">Totals</td>
                                    <td className="px-6 py-4 text-right text-gray-900 whitespace-nowrap">{totalBirds.toLocaleString('en-IN')}</td>
                                    <td className="px-6 py-4 text-right text-gray-900 whitespace-nowrap">{totalQty.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                    <td className="px-6 py-4 text-right text-gray-900 whitespace-nowrap">
                                        {totalQty > 0 ? (totalAmount / totalQty).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                                    </td>
                                    <td className="px-6 py-4 text-right text-gray-900 whitespace-nowrap">
                                        ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </td>
                                    <td colSpan="4" className="px-6 py-4"></td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            )}

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
