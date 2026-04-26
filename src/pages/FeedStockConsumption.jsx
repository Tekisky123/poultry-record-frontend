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

    const handleExportToExcel = () => {
        if (!consumptionRecords.length) return;

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
        const y = record.date.getFullYear();
        const m = String(record.date.getMonth() + 1).padStart(2, '0');
        const d = String(record.date.getDate()).padStart(2, '0');
        navigate(`/stocks/manage?date=${y}-${m}-${d}`);
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
                            Feed Stock Consumption
                        </h1>
                    </div>
                    <p className="text-gray-600 mt-1">{isDateFilterActive ? 'Summary for Selected Period' : 'Yearly Summary of All Feed Consumption'}</p>
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
                            <th className="py-3 px-4 border-r border-gray-300 text-right">No. Of Bags</th>
                            <th className="py-3 px-4 border-r border-gray-300 text-right">Quantity (kg)</th>
                            <th className="py-3 px-4 border-r border-gray-300 text-right">Rate</th>
                            <th className="py-3 px-4 text-right">Amount</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {consumptionRecords.length > 0 ? (
                            consumptionRecords.map((record, idx) => (
                                <tr 
                                    key={record.id || idx} 
                                    onClick={() => handleRowClick(record)}
                                    className="hover:bg-gray-100 transition-colors cursor-pointer"
                                >
                                    <td className="py-3 px-4 border-r text-left text-gray-900 whitespace-nowrap">
                                        {record.date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }).replace(/ /g, '-')}
                                    </td>
                                    <td className="py-3 px-4 text-right border-r text-gray-900 font-medium">
                                        {record.bags ? record.bags.toLocaleString('en-IN') : 0}
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
                                <td colSpan="5" className="py-8 text-center text-gray-500 italic">
                                    No consumption records found for {isDateFilterActive ? 'the selected date period' : `the current year`}
                                </td>
                            </tr>
                        )}
                    </tbody>
                    {consumptionRecords.length > 0 && (
                        <tfoot className="bg-gray-100 font-bold text-gray-900 border-t-2 border-gray-400">
                            <tr>
                                <td colSpan="1" className="py-3 px-4 border-r uppercase text-sm text-right">Totals</td>
                                <td className="py-3 px-4 text-right border-r">{totalBags.toLocaleString('en-IN')}</td>
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
