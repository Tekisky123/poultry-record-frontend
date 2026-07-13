import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, ArrowLeft, Download, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import * as XLSX from 'xlsx';
import api from '../lib/axios';

// Define report columns - fixed columns cannot be deselected
const REPORT_COLUMNS = [
  {
    key: 'date',
    label: 'Date',
    locked: true,
    defaultSelected: true,
    render: (day) => day.displayDate
  },
  {
    key: 'records',
    label: 'Records',
    locked: true,
    defaultSelected: true,
    render: (day) => Number(day.count || 0).toLocaleString('en-IN')
  },
  {
    key: 'purchaseAmount',
    label: 'Purchase',
    locked: true,
    defaultSelected: true,
    render: (day) => {
      const amount = Number(day.purchaseAmount || 0);
      return amount > 0 ? `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-';
    }
  },
  {
    key: 'salesAmount',
    label: 'Sales',
    locked: true,
    defaultSelected: true,
    render: (day) => {
      const amount = Number(day.salesAmount || 0);
      return amount > 0 ? `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-';
    }
  },
  {
    key: 'netProfit',
    label: 'Profit',
    locked: true,
    defaultSelected: true,
    render: (day) => {
      const profit = Number(day.netProfit || 0);
      return profit !== 0 ? `₹${profit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-';
    }
  },
  {
    key: 'margin',
    label: 'Margine',
    locked: true,
    defaultSelected: true,
    render: (day) => {
      const margin = Number(day.margin || 0);
      return margin !== 0 ? `₹${margin.toLocaleString('en-IN', { minimumFractionDigits: 2 })}/Kg` : '-';
    }
  },
  {
    key: 'customers',
    label: 'Customers',
    render: (day) => day.customers || '-'
  },
  {
    key: 'vehicles',
    label: 'Vehicle No',
    render: (day) => day.vehicles || '-'
  },
  {
    key: 'drivers',
    label: 'Driver Name',
    render: (day) => day.drivers || '-'
  },
  {
    key: 'totalPurchaseBirds',
    label: 'Total No Of Birds Pur',
    render: (day) => `${Number(day.totalPurchaseBirds || 0).toLocaleString('en-IN')}`
  },
  {
    key: 'totalPurchaseWeight',
    label: 'Total Weight Of B Pur',
    render: (day) => `${Number(day.totalPurchaseWeight || 0).toLocaleString('en-IN')} Kg`
  },
  {
    key: 'totalPurchaseAmount',
    label: 'Total Amount Of B Pur',
    render: (day) => `₹${Number(day.purchaseAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
  },
  {
    key: 'totalSalesBirds',
    label: 'Total No Of Birds Sales',
    render: (day) => `${Number(day.totalSalesBirds || 0).toLocaleString('en-IN')}`
  },
  {
    key: 'totalSalesWeight',
    label: 'Total Weight Of Sales',
    render: (day) => `${Number(day.salesWeight || 0).toLocaleString('en-IN')} Kg`
  },
  {
    key: 'totalSalesAmount',
    label: 'Total Amount Of Sales',
    render: (day) => `₹${Number(day.salesAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
  },
  {
    key: 'totalMortalityBirds',
    label: 'Mortality Birds',
    render: (day) => `${Number(day.totalMortalityBirds || 0).toLocaleString('en-IN')}`
  },
  {
    key: 'totalMortalityWeight',
    label: 'Mortality Weight',
    render: (day) => `${Number(day.totalMortalityWeight || 0).toLocaleString('en-IN')} Kg`
  },
  {
    key: 'totalMortalityAmount',
    label: 'Mortality Amount',
    render: (day) => `₹${Number(day.totalMortalityAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
  }
];

const DEFAULT_SELECTED_COLUMNS = REPORT_COLUMNS.filter((col) => col.defaultSelected).map((col) => col.key);
const LOCKED_COLUMN_KEYS = new Set(REPORT_COLUMNS.filter((col) => col.locked).map((col) => col.key));

export default function IndirectSalesDailySummary() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [error, setError] = useState('');
    const [selectedColumns, setSelectedColumns] = useState(DEFAULT_SELECTED_COLUMNS);
    const [isReportFilterOpen, setIsReportFilterOpen] = useState(false);
    const reportFilterRef = useRef(null);

    const queryYear = searchParams.get('year');
    const queryMonth = searchParams.get('month');

    const [year, setYear] = useState(queryYear ? parseInt(queryYear) : new Date().getFullYear());
    const [month, setMonth] = useState(queryMonth ? parseInt(queryMonth) : new Date().getMonth() + 1);

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
        fetchDailyStats();
    }, [year, month]);

    const activeColumns = useMemo(() => {
        return REPORT_COLUMNS.filter((column) => selectedColumns.includes(column.key));
    }, [selectedColumns]);

    const fetchDailyStats = async () => {
        try {
            setLoading(true);
            setError('');
            const params = { year, month };
            const response = await api.get('/indirect-sales/stats/daily', { params });
            if (response.data.success) {
                setData(response.data.data);
            }
        } catch (err) {
            console.error('Error fetching daily stats:', err);
            setError(err.response?.data?.message || 'Failed to fetch daily statistics');
        } finally {
            setLoading(false);
        }
    };

    const handleDayClick = (day) => {
        // day.date is YYYY-MM-DD
        navigate(`/indirect-sales/list?startDate=${day.date}&endDate=${day.date}`);
    };

    const handleExportToExcel = () => {
        if (!data) return;

        const exportData = data.days.map(day => {
            const row = {};
            activeColumns.forEach(column => {
                const displayValue = column.render(day);
                row[column.label] = displayValue;
            });
            return row;
        });

        const totalsRow = {};
        activeColumns.forEach(column => {
            if (column.key === 'date') {
                totalsRow[column.label] = 'Total';
            } else if (column.key === 'records') {
                totalsRow[column.label] = `${Number(data?.totals.count || 0).toLocaleString('en-IN')}`;
            } else if (column.key === 'purchaseAmount') {
                totalsRow[column.label] = `₹${Number(data?.totals.purchaseAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
            } else if (column.key === 'salesAmount') {
                totalsRow[column.label] = `₹${Number(data?.totals.salesAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
            } else if (column.key === 'netProfit') {
                totalsRow[column.label] = `₹${Number(data?.totals.netProfit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
            } else if (column.key === 'margin') {
                totalsRow[column.label] = `₹${Number(data?.totals.margin || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}/Kg`;
            } else if (column.key === 'totalPurchaseBirds') {
                totalsRow[column.label] = `${Number(data?.totals.totalPurchaseBirds || 0).toLocaleString('en-IN')}`;
            } else if (column.key === 'totalPurchaseWeight') {
                totalsRow[column.label] = `${Number(data?.totals.totalPurchaseWeight || 0).toLocaleString('en-IN')} Kg`;
            } else if (column.key === 'totalPurchaseAmount') {
                totalsRow[column.label] = `₹${Number(data?.totals.purchaseAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
            } else if (column.key === 'totalSalesBirds') {
                totalsRow[column.label] = `${Number(data?.totals.totalSalesBirds || 0).toLocaleString('en-IN')}`;
            } else if (column.key === 'totalSalesWeight') {
                totalsRow[column.label] = `${Number(data?.totals.salesWeight || 0).toLocaleString('en-IN')} Kg`;
            } else if (column.key === 'totalSalesAmount') {
                totalsRow[column.label] = `₹${Number(data?.totals.salesAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
            } else if (column.key === 'totalMortalityBirds') {
                totalsRow[column.label] = `${Number(data?.totals.totalMortalityBirds || 0).toLocaleString('en-IN')}`;
            } else if (column.key === 'totalMortalityWeight') {
                totalsRow[column.label] = `${Number(data?.totals.totalMortalityWeight || 0).toLocaleString('en-IN')} Kg`;
            } else if (column.key === 'totalMortalityAmount') {
                totalsRow[column.label] = `₹${Number(data?.totals.totalMortalityAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
            } else {
                totalsRow[column.label] = '-';
            }
        });
        exportData.push(totalsRow);

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Daily Summary");
        XLSX.writeFile(wb, `IndirectSales_Daily_${month}_${year}.xlsx`);
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
    for (let y = 2024; y <= currentYear + 1; y++) {
        yearOptions.push(y);
    }

    if (loading && !data) {
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
                        onClick={() => navigate('/indirect-sales')}
                        className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Indirect Sales - Daily Breakdown</h1>
                        <p className="text-gray-600">
                            {monthOptions.find(m => m.value === month)?.label} {year}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <select
                        value={month}
                        onChange={(e) => setMonth(parseInt(e.target.value))}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                        {monthOptions.map(m => (
                            <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                    </select>

                    <select
                        value={year}
                        onChange={(e) => setYear(parseInt(e.target.value))}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                        {yearOptions.map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
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
                                {activeColumns.map((column) => (
                                    <th
                                        key={column.key}
                                        className={`px-6 py-3 font-medium text-gray-700 ${
                                            ['salesAmount', 'purchaseAmount', 'netProfit', 'margin', 'totalPurchaseBirds',
                                             'totalPurchaseWeight', 'totalPurchaseAmount', 'totalSalesBirds', 'totalSalesWeight',
                                             'totalSalesAmount', 'totalMortalityBirds', 'totalMortalityWeight', 'totalMortalityAmount', 'records'].includes(column.key)
                                            ? 'text-right'
                                            : 'text-left'
                                        }`}
                                    >
                                        {column.label}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {data?.days.map((day) => (
                                <tr
                                    key={day.day}
                                    onClick={() => handleDayClick(day)}
                                    className={`hover:bg-gray-50 cursor-pointer transition-colors ${day.count === 0 ? 'opacity-60' : ''}`}
                                >
                                    {activeColumns.map((column) => (
                                        <td
                                            key={column.key}
                                            className={`px-6 py-4 text-gray-900 ${
                                                column.key === 'date' ? 'font-medium text-blue-600 hover:underline' : ''
                                            } ${
                                                ['salesAmount', 'purchaseAmount', 'netProfit', 'margin', 'totalPurchaseBirds',
                                                 'totalPurchaseWeight', 'totalPurchaseAmount', 'totalSalesBirds', 'totalSalesWeight',
                                                 'totalSalesAmount', 'totalMortalityBirds', 'totalMortalityWeight', 'totalMortalityAmount', 'records'].includes(column.key)
                                                ? 'text-right'
                                                : 'text-left'
                                            } ${
                                                column.key === 'netProfit' ? (Number(day.netProfit || 0) >= 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold') : ''
                                            } ${
                                                ['totalMortalityAmount'].includes(column.key) ? 'text-red-600 font-medium' : ''
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
                                        className={`px-6 py-4 text-gray-900 ${
                                            ['salesAmount', 'purchaseAmount', 'netProfit', 'margin', 'totalPurchaseBirds',
                                             'totalPurchaseWeight', 'totalPurchaseAmount', 'totalSalesBirds', 'totalSalesWeight',
                                             'totalSalesAmount', 'totalMortalityBirds', 'totalMortalityWeight', 'totalMortalityAmount', 'records'].includes(column.key)
                                            ? 'text-right'
                                            : 'text-left'
                                        }`}
                                    >
                                        {column.key === 'date' ? 'Total' : (
                                            column.key === 'records' ? `${Number(data?.totals.count || 0).toLocaleString('en-IN')}` :
                                            column.key === 'purchaseAmount' ? `₹${Number(data?.totals.purchaseAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` :
                                            column.key === 'salesAmount' ? `₹${Number(data?.totals.salesAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` :
                                            column.key === 'netProfit' ? `₹${Number(data?.totals.netProfit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` :
                                            column.key === 'margin' ? `₹${Number(data?.totals.margin || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}/Kg` :
                                            column.key === 'totalPurchaseBirds' ? `${Number(data?.totals.totalPurchaseBirds || 0).toLocaleString('en-IN')}` :
                                            column.key === 'totalPurchaseWeight' ? `${Number(data?.totals.totalPurchaseWeight || 0).toLocaleString('en-IN')} Kg` :
                                            column.key === 'totalPurchaseAmount' ? `₹${Number(data?.totals.purchaseAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` :
                                            column.key === 'totalSalesBirds' ? `${Number(data?.totals.totalSalesBirds || 0).toLocaleString('en-IN')}` :
                                            column.key === 'totalSalesWeight' ? `${Number(data?.totals.salesWeight || 0).toLocaleString('en-IN')} Kg` :
                                            column.key === 'totalSalesAmount' ? `₹${Number(data?.totals.salesAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` :
                                            column.key === 'totalMortalityBirds' ? `${Number(data?.totals.totalMortalityBirds || 0).toLocaleString('en-IN')}` :
                                            column.key === 'totalMortalityWeight' ? `${Number(data?.totals.totalMortalityWeight || 0).toLocaleString('en-IN')} Kg` :
                                            column.key === 'totalMortalityAmount' ? `₹${Number(data?.totals.totalMortalityAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` :
                                            '-'
                                        )}
                                    </td>
                                ))}
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
