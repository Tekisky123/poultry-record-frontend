import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, Download, ArrowLeft, Calendar, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import * as XLSX from 'xlsx';
import api from '../lib/axios';
import { useAuth } from '../contexts/AuthContext';

// Define report columns - fixed columns cannot be deselected
const REPORT_COLUMNS = [
  {
    key: 'date',
    label: 'Date',
    locked: true,
    defaultSelected: true,
    render: (day) => new Date(day.date).toLocaleDateString('en-GB')
  },
  {
    key: 'purchaseWeight',
    label: 'Purchase Weight',
    locked: true,
    defaultSelected: true,
    render: (day) => day.totalPurchaseWeight > 0 ? `${day.totalPurchaseWeight.toLocaleString()} Kg` : '-'
  },
  {
    key: 'purchaseAmount',
    label: 'Pur Amount',
    locked: true,
    defaultSelected: true,
    render: (day) => day.totalPurchaseAmount > 0 ? `₹${day.totalPurchaseAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'
  },
  {
    key: 'salesWeight',
    label: 'Sales Weight',
    locked: true,
    defaultSelected: true,
    render: (day) => day.totalSaleWeight > 0 ? `${day.totalSaleWeight.toLocaleString()} Kg` : '-'
  },
  {
    key: 'salesAmount',
    label: 'Sales Amount',
    locked: true,
    defaultSelected: true,
    render: (day) => day.totalSaleAmount > 0 ? `₹${day.totalSaleAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'
  },
  {
    key: 'profit',
    label: 'Profit',
    locked: true,
    defaultSelected: true,
    render: (day) => {
      const profit = day.totalSaleAmount - day.totalPurchaseAmount;
      return profit !== 0 ? `₹${profit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-';
    }
  },
  {
    key: 'mortalityBirds',
    label: 'Birds Mortality Qty',
    render: (day) => `${Number(day.totalMortalityBirds || 0).toLocaleString('en-IN')} Birds`
  },
  {
    key: 'mortalityWeight',
    label: 'Birds Mortality Weight',
    render: (day) => `${Number(day.totalMortalityWeight || 0).toLocaleString('en-IN')} Kg`
  },
  {
    key: 'mortalityAmount',
    label: 'Birds Mortality Amount',
    render: (day) => `₹${Number(day.totalMortalityAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
  },
  {
    key: 'actualWeightlossWeight',
    label: 'Actual Weightloss Weight',
    render: (day) => `${Number(day.totalWeightLossWeight || 0).toLocaleString('en-IN')} Kg`
  },
  {
    key: 'actualWeightlossAmount',
    label: 'Actual Weightloss Amount',
    render: (day) => `₹${Number(day.totalWeightLossAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
  },
  {
    key: 'naturalWeightlossWeight',
    label: 'Natural Weightloss Weight',
    render: (day) => `${Number(day.totalNaturalWeightLossWeight || 0).toLocaleString('en-IN')} Kg`
  },
  {
    key: 'naturalWeightlossAmount',
    label: 'Natural Weightloss Amount',
    render: (day) => `₹${Number(day.totalNaturalWeightLossAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
  },
  {
    key: 'feedConsumeQty',
    label: 'Feed Consume Qty',
    render: (day) => `${Number(day.totalFeedConsumeQty || 0).toLocaleString('en-IN')} bags`
  },
  {
    key: 'feedConsumeAmount',
    label: 'Feed Consume Amount',
    render: (day) => `₹${Number(day.totalFeedConsumeAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
  }
];

const DEFAULT_SELECTED_COLUMNS = REPORT_COLUMNS.filter((col) => col.defaultSelected).map((col) => col.key);
const LOCKED_COLUMN_KEYS = new Set(REPORT_COLUMNS.filter((col) => col.locked).map((col) => col.key));

export default function StockDailySummary() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const year = Number(searchParams.get('year')) || new Date().getFullYear();
    const month = Number(searchParams.get('month')) || new Date().getMonth() + 1;
    const supervisorId = searchParams.get('supervisorId') || '';
    const inventoryType = searchParams.get('inventoryType') || '';

    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [error, setError] = useState('');
    const [supervisors, setSupervisors] = useState([]);
    const [selectedColumns, setSelectedColumns] = useState(DEFAULT_SELECTED_COLUMNS);
    const [isReportFilterOpen, setIsReportFilterOpen] = useState(false);
    const reportFilterRef = useRef(null);

    useEffect(() => {
        if (user?.role === 'supervisor' && !user?.canManageStock) {
            navigate('/');
        }
    }, [user, navigate]);

    useEffect(() => {
        if (user && user.role !== 'supervisor') {
            fetchSupervisors();
        }
    }, [user]);

    const fetchSupervisors = async () => {
        try {
            const { data } = await api.get('/user');
            if (data.success) {
                const approvedSupervisors = (data.data || []).filter(u => 
                    u.role === 'supervisor' && 
                    u.approvalStatus === 'approved' && 
                    u.isActive === true
                );
                setSupervisors(approvedSupervisors);
            }
        } catch (error) {
            console.error('Error fetching supervisors:', error);
        }
    };

    const handleSupervisorChange = (val) => {
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            if (val) next.set('supervisorId', val);
            else next.delete('supervisorId');
            return next;
        });
    };

    const handleInventoryTypeChange = (val) => {
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            if (val) next.set('inventoryType', val);
            else next.delete('inventoryType');
            return next;
        });
    };

    const toggleColumnSelection = (key) => {
        if (LOCKED_COLUMN_KEYS.has(key)) {
            return;
        }
        setSelectedColumns((prev) =>
            prev.includes(key) ? prev.filter((colKey) => colKey !== key) : [...prev, key]
        );
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (reportFilterRef.current && !reportFilterRef.current.contains(event.target)) {
                setIsReportFilterOpen(false);
            }
        };

        if (isReportFilterOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isReportFilterOpen]);

    useEffect(() => {
        fetchDailySummary();
    }, [year, month, supervisorId, inventoryType]);

    const fetchDailySummary = async () => {
        try {
            setLoading(true);
            setError('');
            const params = { year, month };
            if (supervisorId) params.supervisorId = supervisorId;
            if (inventoryType) params.inventoryType = inventoryType;

            const response = await api.get('/inventory-stock/stats/daily', { params });
            if (response.data.success) {
                setData(response.data.data);
            }
        } catch (err) {
            console.error('Error fetching daily summary:', err);
            setError(err.response?.data?.message || 'Failed to fetch daily summary');
        } finally {
            setLoading(false);
        }
    };

    const fullDays = useMemo(() => {
        if (!data) return [];
        // Generate all days in the month
        const daysInMonth = new Date(year, month, 0).getDate();
        const days = [];
        for (let i = 1; i <= daysInMonth; i++) {
            const day = i < 10 ? `0${i}` : i;
            const monthStr = month < 10 ? `0${month}` : month;
            const dateStr = `${year}-${monthStr}-${day}`;

            const existingDay = data.days.find(d => d.formattedDate === dateStr);

            if (existingDay) {
                // Ensure all fields exist with proper numeric values
                days.push({
                    ...existingDay,
                    totalPurchaseWeight: Number(existingDay.totalPurchaseWeight || 0),
                    totalPurchaseAmount: Number(existingDay.totalPurchaseAmount || 0),
                    totalSaleWeight: Number(existingDay.totalSaleWeight || 0),
                    totalSaleAmount: Number(existingDay.totalSaleAmount || 0),
                    totalMortalityBirds: Number(existingDay.totalMortalityBirds || 0),
                    totalMortalityWeight: Number(existingDay.totalMortalityWeight || 0),
                    totalMortalityAmount: Number(existingDay.totalMortalityAmount || 0),
                    totalWeightLossWeight: Number(existingDay.totalWeightLossWeight || 0),
                    totalWeightLossAmount: Number(existingDay.totalWeightLossAmount || 0),
                    totalNaturalWeightLossWeight: Number(existingDay.totalNaturalWeightLossWeight || 0),
                    totalNaturalWeightLossAmount: Number(existingDay.totalNaturalWeightLossAmount || 0),
                    totalFeedConsumeQty: Number(existingDay.totalFeedConsumeQty || 0),
                    totalFeedConsumeAmount: Number(existingDay.totalFeedConsumeAmount || 0)
                });
            } else {
                days.push({
                    date: new Date(year, month - 1, i).toISOString(),
                    formattedDate: dateStr,
                    totalPurchaseWeight: 0,
                    totalPurchaseAmount: 0,
                    totalSaleWeight: 0,
                    totalSaleAmount: 0,
                    totalMortalityBirds: 0,
                    totalMortalityWeight: 0,
                    totalMortalityAmount: 0,
                    totalWeightLossWeight: 0,
                    totalWeightLossAmount: 0,
                    totalNaturalWeightLossWeight: 0,
                    totalNaturalWeightLossAmount: 0,
                    totalFeedConsumeQty: 0,
                    totalFeedConsumeAmount: 0
                });
            }
        }

        // Sort descending (newest first)
        days.sort((a, b) => new Date(b.formattedDate) - new Date(a.formattedDate));
        return days;
    }, [data, year, month]);

    const handleDayClick = (dayData) => {
        const basePath = user?.role === 'supervisor' ? '/supervisor/stocks/manage' : '/stocks/manage';
        navigate(`${basePath}?date=${dayData.formattedDate}`);
    };

    const handleExportToExcel = () => {
        if (!fullDays.length) return;

        const exportData = fullDays.map(day => ({
            DATE: day.formattedDate,
            'PURCHASE WEIGHT': day.totalPurchaseWeight || 0,
            'PUR AMOUNT': day.totalPurchaseAmount || 0,
            'SALES WEIGHT': day.totalSaleWeight || 0,
            'SALES AMOUNT': day.totalSaleAmount || 0,
            PROFIT: (day.totalSaleAmount || 0) - (day.totalPurchaseAmount || 0)
        }));

        // Add Totals Row
        exportData.push({
            DATE: 'Grand Total',
            'PURCHASE WEIGHT': data.totals.totalPurchaseWeight,
            'PUR AMOUNT': data.totals.totalPurchaseAmount,
            'SALES WEIGHT': data.totals.totalSaleWeight,
            'SALES AMOUNT': data.totals.totalSaleAmount,
            PROFIT: data.totals.totalSaleAmount - data.totals.totalPurchaseAmount
        });

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Daily Stock Summary");
        XLSX.writeFile(wb, `Stock_Daily_Summary_${year}_${month}.xlsx`);
    };

    const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long' });
    const activeColumns = REPORT_COLUMNS.filter((column) => selectedColumns.includes(column.key));

    if (loading && !data) return <div className="flex justify-center p-12"><Loader2 className="animate-spin w-8 h-8 text-blue-600" /></div>;
    if (error) return <div className="p-4 text-center">
        <p className="text-red-500 mb-4">{error}</p>
        <button onClick={fetchDailySummary} className="px-4 py-2 bg-blue-600 text-white rounded">Retry</button>
    </div>;
    if (!data) return null;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => {
                            let basePath = user?.role === 'supervisor' ? '/supervisor/stocks' : '/stocks';
                            const params = [];
                            if (supervisorId) params.push(`supervisorId=${supervisorId}`);
                            if (inventoryType) params.push(`inventoryType=${inventoryType}`);
                            if (params.length > 0) {
                                basePath += `?${params.join('&')}`;
                            }
                            navigate(basePath);
                        }}
                        className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                            <Calendar className="w-8 h-8" />
                            {monthName} {year} - Daily Summary
                        </h1>
                    </div>
                </div>
                <div className="flex gap-3 mt-4 sm:mt-0 items-center flex-wrap">
                    {user?.role !== 'supervisor' && (
                        <select
                            value={supervisorId}
                            onChange={(e) => handleSupervisorChange(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm font-medium text-gray-700 bg-white"
                        >
                            <option value="">All Supervisors</option>
                            {supervisors.map(sup => (
                                <option key={sup._id} value={sup._id}>{sup.name}</option>
                            ))}
                        </select>
                    )}
                    <select
                        value={inventoryType}
                        onChange={(e) => handleInventoryTypeChange(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm font-medium text-gray-700 bg-white"
                    >
                        <option value="">All Stock Types</option>
                        <option value="bird">Birds</option>
                        <option value="feed">Feed</option>
                    </select>
                    <div className="relative" ref={reportFilterRef}>
                        <button
                            type="button"
                            onClick={() => setIsReportFilterOpen((prev) => !prev)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 border ${isReportFilterOpen
                                ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400'
                                }`}
                        >
                            <Filter size={16} />
                            <span>Reports Filter</span>
                            {isReportFilterOpen ? (
                                <ChevronUp size={16} />
                            ) : (
                                <ChevronDown size={16} />
                            )}
                        </button>
                        {isReportFilterOpen && (
                            <div className="absolute right-0 mt-2 w-96 bg-white border border-gray-200 rounded-lg shadow-2xl z-50 overflow-hidden">
                                <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-4 text-white">
                                    <h3 className="text-sm font-semibold">Choose Columns to Display</h3>
                                    <p className="text-xs text-blue-100 mt-1">
                                        Yellow highlighted items are default and cannot be deselected
                                    </p>
                                </div>
                                <div className="max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                                    {REPORT_COLUMNS.map((option) => {
                                        const isChecked = selectedColumns.includes(option.key);
                                        return (
                                            <label
                                                key={option.key}
                                                className={`flex items-center justify-between gap-3 px-4 py-3 text-sm cursor-pointer transition-colors ${option.locked
                                                    ? 'bg-yellow-50 hover:bg-yellow-100 border-l-4 border-yellow-400'
                                                    : 'hover:bg-gray-50 border-l-4 border-transparent'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-3 flex-1">
                                                    <input
                                                        type="checkbox"
                                                        checked={isChecked}
                                                        disabled={option.locked}
                                                        onChange={() => toggleColumnSelection(option.key)}
                                                        className={`h-4 w-4 rounded border-gray-300 focus:ring-2 focus:ring-blue-500 ${option.locked
                                                            ? 'text-yellow-600 cursor-not-allowed'
                                                            : 'text-blue-600 cursor-pointer'
                                                            }`}
                                                    />
                                                    <span className={`flex-1 ${option.locked ? 'font-medium text-gray-900' : 'text-gray-700'}`}>
                                                        {option.label}
                                                    </span>
                                                </div>
                                                {option.locked && (
                                                    <span className="px-2 py-0.5 text-xs font-medium bg-yellow-200 text-yellow-800 rounded-full">
                                                        Default
                                                    </span>
                                                )}
                                            </label>
                                        );
                                    })}
                                </div>
                                <div className="p-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                                    <span className="text-xs text-gray-600">
                                        {selectedColumns.length} of {REPORT_COLUMNS.length} columns selected
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setIsReportFilterOpen(false)}
                                        className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                    <button
                        onClick={handleExportToExcel}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-sm transition-colors text-sm font-medium"
                    >
                        <Download size={20} />
                        <span>Export Excel</span>
                    </button>
                </div>
            </div>

            {/* Split Layout: Table on left, Filters/Summary Sidebar on right */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 overflow-x-auto">
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="border-b-2 border-gray-300 bg-gray-50">
                            {activeColumns.map((column) => (
                                <th
                                    key={column.key}
                                    className={`py-3 px-4 font-semibold text-gray-900 ${
                                        ['salesAmount', 'salesWeight', 'purchaseAmount', 'purchaseWeight', 'profit', 
                                         'mortalityWeight', 'mortalityAmount', 'actualWeightlossWeight', 'actualWeightlossAmount',
                                         'naturalWeightlossWeight', 'naturalWeightlossAmount', 'feedConsumeQty', 'feedConsumeAmount'].includes(column.key)
                                        ? 'text-right'
                                        : 'text-left'
                                    }`}
                                >
                                    {column.label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {fullDays.map((day) => (
                            <tr
                                key={day.formattedDate}
                                className="border-b border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors"
                                onClick={() => handleDayClick(day)}
                            >
                                {activeColumns.map((column) => (
                                    <td
                                        key={column.key}
                                        className={`py-3 px-4 text-gray-700 ${
                                            column.key === 'date' ? 'text-blue-600 font-medium hover:underline' : ''
                                        } ${
                                            ['salesAmount', 'salesWeight', 'purchaseAmount', 'purchaseWeight', 'profit',
                                             'mortalityWeight', 'mortalityAmount', 'actualWeightlossWeight', 'actualWeightlossAmount',
                                             'naturalWeightlossWeight', 'naturalWeightlossAmount', 'feedConsumeQty', 'feedConsumeAmount'].includes(column.key)
                                            ? 'text-right'
                                            : 'text-left'
                                        } ${
                                            column.key === 'profit' ? (day.totalSaleAmount - day.totalPurchaseAmount >= 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold') : ''
                                        } ${
                                            ['mortalityAmount', 'actualWeightlossAmount', 'naturalWeightlossAmount'].includes(column.key) ? 'text-red-600 font-medium' : ''
                                        } ${
                                            column.key === 'feedConsumeAmount' ? 'text-blue-600 font-medium' : ''
                                        }`}
                                    >
                                        {column.render(day)}
                                    </td>
                                ))}
                            </tr>
                        ))}
                        <tr className="bg-gray-100 font-bold border-t-2 border-gray-300">
                            {activeColumns.map((column) => (
                                <td
                                    key={column.key}
                                    className={`py-3 px-4 text-gray-900 ${
                                        ['salesAmount', 'salesWeight', 'purchaseAmount', 'purchaseWeight', 'profit',
                                         'mortalityWeight', 'mortalityAmount', 'actualWeightlossWeight', 'actualWeightlossAmount',
                                         'naturalWeightlossWeight', 'naturalWeightlossAmount', 'feedConsumeQty', 'feedConsumeAmount'].includes(column.key)
                                        ? 'text-right'
                                        : 'text-left'
                                    }`}
                                >
                                    {column.key === 'date' ? 'Grand Total' : (
                                        column.key === 'purchaseWeight' ? `${Number(data.totals.totalPurchaseWeight || 0).toLocaleString('en-IN')} Kg` :
                                        column.key === 'purchaseAmount' ? `₹${Number(data.totals.totalPurchaseAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` :
                                        column.key === 'salesWeight' ? `${Number(data.totals.totalSaleWeight || 0).toLocaleString('en-IN')} Kg` :
                                        column.key === 'salesAmount' ? `₹${Number(data.totals.totalSaleAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` :
                                        column.key === 'profit' ? `₹${Number(Number(data.totals.totalSaleAmount || 0) - Number(data.totals.totalPurchaseAmount || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` :
                                        column.key === 'mortalityBirds' ? `${Number(data.totals.totalMortalityBirds || 0).toLocaleString('en-IN')} Birds` :
                                        column.key === 'mortalityWeight' ? `${Number(data.totals.totalMortalityWeight || 0).toLocaleString('en-IN')} Kg` :
                                        column.key === 'mortalityAmount' ? `₹${Number(data.totals.totalMortalityAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` :
                                        column.key === 'actualWeightlossWeight' ? `${Number(data.totals.totalWeightLossWeight || 0).toLocaleString('en-IN')} Kg` :
                                        column.key === 'actualWeightlossAmount' ? `₹${Number(data.totals.totalWeightLossAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` :
                                        column.key === 'naturalWeightlossWeight' ? `${Number(data.totals.totalNaturalWeightLossWeight || 0).toLocaleString('en-IN')} Kg` :
                                        column.key === 'naturalWeightlossAmount' ? `₹${Number(data.totals.totalNaturalWeightLossAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` :
                                        column.key === 'feedConsumeQty' ? `${Number(data.totals.totalFeedConsumeQty || 0).toLocaleString('en-IN')} bags` :
                                        column.key === 'feedConsumeAmount' ? `₹${Number(data.totals.totalFeedConsumeAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` :
                                        ''
                                    )}
                                </td>
                            ))}
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
}
