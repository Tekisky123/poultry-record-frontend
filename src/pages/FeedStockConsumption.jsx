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

export default function FeedStockConsumption() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    
    // We'll store normalized consumption records here
    const [consumptionRecords, setConsumptionRecords] = useState([]);

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
        navigate(`/feed-stock-consumption/monthly-summary?${params.toString()}`);
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
        navigate(`/feed-stock-consumption/monthly-summary?${params.toString()}`);
    };

    const handleClearDateFilter = () => {
        const fyDates = getFYDates(getCurrentFinancialYear());
        setSelectedFY(getCurrentFinancialYear());
        setDateFilter(fyDates);
        const params = new URLSearchParams(searchParams);
        params.delete('startDate');
        params.delete('endDate');
        navigate(`/feed-stock-consumption/monthly-summary?${params.toString()}`);
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

    useEffect(() => {
        fetchData();
    }, [dateFilter.startDate, dateFilter.endDate]);

    const fetchData = async () => {
        setLoading(true);
        setError('');
        try {
            let startOfPeriod, endOfPeriod;
            if (dateFilter.startDate && dateFilter.endDate) {
                startOfPeriod = dateFilter.startDate;
                endOfPeriod = dateFilter.endDate;
            } else if (dateFilter.startDate) {
                startOfPeriod = dateFilter.startDate;
                const d = new Date();
                endOfPeriod = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            } else if (dateFilter.endDate) {
                startOfPeriod = `${selectedFY}-04-01`;
                endOfPeriod = dateFilter.endDate;
            } else {
                startOfPeriod = `${selectedFY}-04-01`;
                endOfPeriod = `${selectedFY + 1}-03-31`;
            }

            // 1. Fetch Inventory for consume
            const invRes = await api.get('/inventory-stock', {
                params: {
                    startDate: startOfPeriod,
                    endDate: endOfPeriod,
                    type: 'consume'
                }
            });

            let combinedRecords = [];

            if (invRes.data.success && invRes.data.data) {
                invRes.data.data.forEach(stock => {
                    if (stock.inventoryType !== 'feed') return;

                    const particular = stock.notes || stock.narration || 'Feed Consumption';
                    let typeLabel = 'feed consumption';

                    const weight = Number(stock.feedQty) || Number(stock.weight) || 0;
                    const bags = Number(stock.bags) || 0;
                    const amount = Number(stock.amount) || 0;
                    const rate = Number(stock.rate) || (weight > 0 ? amount / weight : 0);

                    combinedRecords.push({
                        id: stock._id,
                        date: new Date(stock.date),
                        particular: particular,
                        type: typeLabel,
                        bags: bags,
                        quantity: weight,
                        rate: rate,
                        amount: amount
                    });
                });
            }

            combinedRecords.sort((a, b) => a.date - b.date);

            setConsumptionRecords(combinedRecords);
        } catch (err) {
            console.error('Error fetching consumption data:', err);
            setError(err.response?.data?.message || 'Failed to fetch consumption data');
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

        const months = MONTH_NAMES.map((name, index) => {
            const calendarMonthIndex = (index + 3) % 12;
            const calYear = index < 9 ? selectedFY : selectedFY + 1;
            const startDateStr = `${calYear}-${String(calendarMonthIndex + 1).padStart(2, '0')}-01`;
            return {
                name,
                year: calYear,
                monthIndex: calendarMonthIndex,
                startDate: startDateStr,
                bags: 0,
                quantity: 0,
                amount: 0,
                count: 0
            };
        });

        consumptionRecords.forEach(record => {
            if (!(record.date instanceof Date) || isNaN(record.date.getTime())) return;
            const rYear = record.date.getFullYear();
            const rMonth = record.date.getMonth();

            const slot = months.find(m => m.year === rYear && m.monthIndex === rMonth);
            if (slot) {
                slot.bags += Number(record.bags) || 0;
                slot.quantity += Number(record.quantity) || 0;
                slot.amount += Number(record.amount) || 0;
                slot.count += 1;
            }
        });

        return months;
    }, [consumptionRecords, selectedFY]);

    const handleMonthRowClick = (monthItem) => {
        const mNum = String(monthItem.monthIndex + 1).padStart(2, '0');
        const start = `${monthItem.year}-${mNum}-01`;
        const lastDay = new Date(monthItem.year, monthItem.monthIndex + 1, 0).getDate();
        const end = `${monthItem.year}-${mNum}-${String(lastDay).padStart(2, '0')}`;

        setDateFilter({ startDate: start, endDate: end });
        setViewMode('detailed');
    };

    const handleExportToExcel = () => {
        if (!consumptionRecords.length) return;

        if (viewMode === 'monthly') {
            const exportData = monthlySummaryData.map(m => ({
                'Month': `${m.name} ${m.year}`,
                'No. Of Bags': m.bags,
                'Quantity (kg)': m.quantity,
                'Total Amount': m.amount
            }));

            const grandBags = monthlySummaryData.reduce((sum, m) => sum + m.bags, 0);
            const grandQty = monthlySummaryData.reduce((sum, m) => sum + m.quantity, 0);
            const grandAmount = monthlySummaryData.reduce((sum, m) => sum + m.amount, 0);

            exportData.push({
                'Month': 'Grand Total',
                'No. Of Bags': grandBags,
                'Quantity (kg)': grandQty,
                'Total Amount': grandAmount
            });

            const ws = XLSX.utils.json_to_sheet(exportData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Monthly Consumption Summary");
            XLSX.writeFile(wb, `Feed_Stock_Consumption_Monthly_Summary_FY_${selectedFY}-${selectedFY + 1}.xlsx`);
            return;
        }

        const exportData = consumptionRecords.map(record => ({
            'Date': record.date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }).replace(/ /g, '-'),
            'No. Of Bags': record.bags,
            'Quantity (kg)': record.quantity,
            'Rate': record.rate.toFixed(2),
            'Amount': record.amount
        }));

        const totalBags = consumptionRecords.reduce((sum, r) => sum + (r.bags || 0), 0);
        const totalQty = consumptionRecords.reduce((sum, r) => sum + r.quantity, 0);
        const totalAmount = consumptionRecords.reduce((sum, r) => sum + r.amount, 0);

        exportData.push({
            'Date': 'Total',
            'No. Of Bags': totalBags,
            'Quantity (kg)': totalQty,
            'Rate': '',
            'Amount': totalAmount
        });

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Monthly Consumption");
        
        const fileName = (dateFilter.startDate || dateFilter.endDate)
            ? `Feed_Stock_Consumption_${dateFilter.startDate || 'start'}_to_${dateFilter.endDate || 'end'}.xlsx`
            : `Feed_Stock_Consumption_Year_${new Date().getFullYear()}.xlsx`;
        XLSX.writeFile(wb, fileName);
    };

    if (loading && !consumptionRecords.length) return <div className="flex justify-center p-12"><Loader2 className="animate-spin w-8 h-8 text-blue-600" /></div>;

    const totalBags = consumptionRecords.reduce((sum, r) => sum + (r.bags || 0), 0);
    const totalQty = consumptionRecords.reduce((sum, r) => sum + r.quantity, 0);
    const totalAmount = consumptionRecords.reduce((sum, r) => sum + r.amount, 0);

    const handleRowClick = (record) => {
        if (record.type === 'feed consumption' || record.type === 'FEED CONSUMPTION') {
            const y = record.date.getFullYear();
            const m = String(record.date.getMonth() + 1).padStart(2, '0');
            const d = String(record.date.getDate()).padStart(2, '0');
            navigate(`/stocks/manage?date=${y}-${m}-${d}`);
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
                        <h1 className="text-2xl font-bold text-gray-900">Feed Stock Sales &amp; Consumption</h1>
                        <p className="text-gray-600">Overview of Feed Stock Sales &amp; Consumption Records</p>
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
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-sm transition-colors text-sm"
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

            {viewMode === 'monthly' ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-3 font-medium text-gray-700 text-left">Month</th>
                                    <th className="px-6 py-3 font-medium text-gray-700 text-right">No. Of Bags</th>
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
                                            {m.bags > 0 ? m.bags.toLocaleString('en-IN') : '-'}
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
                                        {monthlySummaryData.reduce((sum, m) => sum + m.bags, 0).toLocaleString('en-IN')}
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
                                <th className="px-6 py-3 font-medium text-gray-700 text-right whitespace-nowrap">No. Of Bags</th>
                                <th className="px-6 py-3 font-medium text-gray-700 text-right whitespace-nowrap">Quantity (kg)</th>
                                <th className="px-6 py-3 font-medium text-gray-700 text-right whitespace-nowrap">Rate</th>
                                <th className="px-6 py-3 font-medium text-gray-700 text-right whitespace-nowrap">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {consumptionRecords.length > 0 ? (
                                consumptionRecords.map((record, idx) => (
                                    <tr 
                                        key={record.id || idx} 
                                        onClick={() => handleRowClick(record)}
                                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                                    >
                                        <td className="px-6 py-4 text-left text-gray-900 whitespace-nowrap">
                                            {record.date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }).replace(/ /g, '-')}
                                        </td>
                                        <td className="px-6 py-4 text-right text-gray-900 font-medium">
                                            {record.bags ? record.bags.toLocaleString('en-IN') : 0}
                                        </td>
                                        <td className="px-6 py-4 text-right text-gray-900 font-medium">
                                            {record.quantity.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-6 py-4 text-right text-gray-600">
                                            {record.rate.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-6 py-4 text-right text-gray-900 font-semibold">
                                            {record.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" className="py-8 text-center text-gray-500 italic">
                                        No consumption records found for {isDateFilterActive ? 'the selected date period' : `the current year`}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                        {consumptionRecords.length > 0 && (
                            <tfoot className="bg-gray-100 font-bold border-t-2 border-gray-300">
                                <tr>
                                    <td className="px-6 py-4 uppercase text-sm text-right text-gray-900">Totals</td>
                                    <td className="px-6 py-4 text-right text-gray-900">{totalBags.toLocaleString('en-IN')}</td>
                                    <td className="px-6 py-4 text-right text-gray-900">{totalQty.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                    <td className="px-6 py-4 text-right text-gray-900">
                                        {totalQty > 0 ? (totalAmount / totalQty).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                                    </td>
                                    <td className="px-6 py-4 text-right text-gray-900">
                                        ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </td>
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
