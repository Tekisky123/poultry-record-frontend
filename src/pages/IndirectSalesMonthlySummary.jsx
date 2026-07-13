import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, ArrowLeft, Download, PlusCircle, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import * as XLSX from 'xlsx';
import api from '../lib/axios';
import SearchableSelect from '../components/SearchableSelect';

// Define report columns - fixed columns cannot be deselected
const REPORT_COLUMNS = [
  {
    key: 'date',
    label: 'Date',
    locked: true,
    defaultSelected: true,
    render: (row) => `${row.name} ${new Date(row.startDate).getFullYear()}`
  },
  {
    key: 'records',
    label: 'Records',
    locked: true,
    defaultSelected: true,
    render: (row) => Number(row.count || 0).toLocaleString('en-IN')
  },
  {
    key: 'purchaseAmount',
    label: 'Purchase',
    locked: true,
    defaultSelected: true,
    render: (row) => {
      const amount = Number(row.purchaseAmount || 0);
      return amount > 0 ? `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-';
    }
  },
  {
    key: 'salesAmount',
    label: 'Sales',
    locked: true,
    defaultSelected: true,
    render: (row) => {
      const amount = Number(row.salesAmount || 0);
      return amount > 0 ? `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-';
    }
  },
  {
    key: 'netProfit',
    label: 'Profit',
    locked: true,
    defaultSelected: true,
    render: (row) => {
      const profit = Number(row.netProfit || 0);
      return profit !== 0 ? `₹${profit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-';
    }
  },
  {
    key: 'margin',
    label: 'Margine',
    locked: true,
    defaultSelected: true,
    render: (row) => {
      const margin = Number(row.margin || 0);
      return margin !== 0 ? `₹${margin.toLocaleString('en-IN', { minimumFractionDigits: 2 })}/Kg` : '-';
    }
  },
  {
    key: 'customers',
    label: 'Customers',
    render: (row) => row.customers || '-'
  },
  {
    key: 'vehicles',
    label: 'Vehicle No',
    render: (row) => row.vehicles || '-'
  },
  {
    key: 'drivers',
    label: 'Driver Name',
    render: (row) => row.drivers || '-'
  },
  {
    key: 'totalPurchaseBirds',
    label: 'Total No Of Birds Pur',
    render: (row) => `${Number(row.totalPurchaseBirds || 0).toLocaleString('en-IN')}`
  },
  {
    key: 'totalPurchaseWeight',
    label: 'Total Weight Of B Pur',
    render: (row) => `${Number(row.totalPurchaseWeight || 0).toLocaleString('en-IN')} Kg`
  },
  {
    key: 'totalPurchaseAmount',
    label: 'Total Amount Of B Pur',
    render: (row) => `₹${Number(row.purchaseAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
  },
  {
    key: 'totalSalesBirds',
    label: 'Total No Of Birds Sales',
    render: (row) => `${Number(row.totalSalesBirds || 0).toLocaleString('en-IN')}`
  },
  {
    key: 'totalSalesWeight',
    label: 'Total Weight Of Sales',
    render: (row) => `${Number(row.salesWeight || 0).toLocaleString('en-IN')} Kg`
  },
  {
    key: 'totalSalesAmount',
    label: 'Total Amount Of Sales',
    render: (row) => `₹${Number(row.salesAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
  },
  {
    key: 'totalMortalityBirds',
    label: 'Mortality Birds',
    render: (row) => `${Number(row.totalMortalityBirds || 0).toLocaleString('en-IN')}`
  },
  {
    key: 'totalMortalityWeight',
    label: 'Mortality Weight',
    render: (row) => `${Number(row.totalMortalityWeight || 0).toLocaleString('en-IN')} Kg`
  },
  {
    key: 'totalMortalityAmount',
    label: 'Mortality Amount',
    render: (row) => `₹${Number(row.totalMortalityAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
  }
];

const DEFAULT_SELECTED_COLUMNS = REPORT_COLUMNS.filter((col) => col.defaultSelected).map((col) => col.key);
const LOCKED_COLUMN_KEYS = new Set(REPORT_COLUMNS.filter((col) => col.locked).map((col) => col.key));

export default function IndirectSalesMonthlySummary() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [error, setError] = useState('');
    const [year, setYear] = useState(new Date().getFullYear());
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [customers, setCustomers] = useState([]);
    const [vendors, setVendors] = useState([]);
    const [formData, setFormData] = useState({
        date: new Date().toLocaleDateString('sv'), // Defaults to current date (YYYY-MM-DD in local time)
        customer: '',
        vendor: '',
        place: '',
        vehicleNumber: '',
        driver: '',
        notes: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const isSubmittingRef = useRef(false);
    const [selectedColumns, setSelectedColumns] = useState(DEFAULT_SELECTED_COLUMNS);
    const [isReportFilterOpen, setIsReportFilterOpen] = useState(false);
    const reportFilterRef = useRef(null);

    const loadCustomersAndVendors = async () => {
        try {
            const [customerRes, vendorRes] = await Promise.all([
                api.get('/customer'),
                api.get('/vendor')
            ]);
            setCustomers(customerRes.data?.data || []);
            setVendors(vendorRes.data?.data || []);
        } catch (err) {
            console.error('Failed to load dropdown data', err);
        }
    };

    useEffect(() => {
        fetchMonthlyStats();
        loadCustomersAndVendors();
    }, [year]);

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

    const activeColumns = useMemo(() => {
        return REPORT_COLUMNS.filter((column) => selectedColumns.includes(column.key));
    }, [selectedColumns]);

    const handleOpenCreate = () => {
        setFormData({
            date: new Date().toLocaleDateString('sv'), // Reset to current date
            customer: '',
            vendor: '',
            place: '',
            vehicleNumber: '',
            driver: '',
            notes: ''
        });
        setIsCreateModalOpen(true);
    };

    const handleCustomerChange = (value) => {
        const selected = customers.find(item => item.id === value || item._id === value);
        setFormData(prev => ({
            ...prev,
            customer: value,
            place: selected?.place || prev.place
        }));
    };

    const handleCreateSubmit = async (event) => {
        event.preventDefault();
        if (isSubmittingRef.current) return;
        try {
            isSubmittingRef.current = true;
            setIsSubmitting(true);
            const payload = {
                date: formData.date,
                customer: formData.customer,
                vendor: formData.vendor,
                place: formData.place,
                vehicleNumber: formData.vehicleNumber,
                driver: formData.driver,
                notes: formData.notes
            };

            const { data: resData } = await api.post('/indirect-sales', payload);
            setIsCreateModalOpen(false);
            fetchMonthlyStats();
            if (resData.data?.id) {
                navigate(`/indirect-sales/${resData.data.id}`);
            }
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.message || 'Failed to create indirect purchase and sale.');
        } finally {
            isSubmittingRef.current = false;
            setIsSubmitting(false);
        }
    };

    const customerOptions = useMemo(() => {
        return customers.map(c => ({
            value: c.id || c._id,
            label: `${c.shopName} — ${c.ownerName || 'N/A'}`
        }));
    }, [customers]);

    const vendorOptions = useMemo(() => {
        return vendors.map(v => ({
            value: v.id || v._id,
            label: `${v.vendorName}${v.companyName ? ` — ${v.companyName}` : ''}`
        }));
    }, [vendors]);

    const fetchMonthlyStats = async () => {
        try {
            setLoading(true);
            setError('');
            const response = await api.get('/indirect-sales/stats/monthly', { params: { year } });
            if (response.data.success) {
                setData(response.data.data);
            }
        } catch (err) {
            console.error('Error fetching monthly stats:', err);
            setError(err.response?.data?.message || 'Failed to fetch monthly statistics');
        } finally {
            setLoading(false);
        }
    };

    const handleMonthClick = (monthData) => {
        const date = new Date(monthData.startDate);
        const monthNum = date.getMonth() + 1;
        const yearNum = date.getFullYear();
        navigate(`/indirect-sales/daily?year=${yearNum}&month=${monthNum}`);
    };

    const getFinancialYearOrder = (monthData) => {
        if (!monthData) return [];
        return [...monthData].sort((a, b) => {
            const dateA = new Date(Date.parse(a.name + " 1, 2000"));
            const dateB = new Date(Date.parse(b.name + " 1, 2000"));
            const monthA = dateA.getMonth() + 1;
            const monthB = dateB.getMonth() + 1;

            const orderA = (monthA + 8) % 12;
            const orderB = (monthB + 8) % 12;
            return orderA - orderB;
        });
    };

    const handleExportToExcel = () => {
        if (!data) return;

        const sortedMonths = getFinancialYearOrder(data.months);

        const exportData = sortedMonths.map(m => {
            const row = {};
            activeColumns.forEach(column => {
                const displayValue = column.render(m);
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
        XLSX.utils.book_append_sheet(wb, ws, "Monthly Summary");
        XLSX.writeFile(wb, `IndirectSales_Monthly_${year}.xlsx`);
    };

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
                        onClick={() => navigate('/indirect-sales/')} // Loop back logic? No, this is the root for summary now.
                        className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors hidden"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Indirect Sales - Monthly Summary</h1>
                        <p className="text-gray-600">Overview of Indirect Sales Performance</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <select
                        value={year}
                        onChange={(e) => setYear(parseInt(e.target.value))}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                        {yearOptions.map(y => (
                            <option key={y} value={y}>FY {y}-{y + 1}</option>
                        ))}
                    </select>

                    <div className="relative" ref={reportFilterRef}>
                        <button
                            type="button"
                            onClick={() => setIsReportFilterOpen((prev) => !prev)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 border ${
                                isReportFilterOpen
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
                            <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-2xl z-50 overflow-hidden">
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
                                                className={`flex items-center justify-between gap-3 px-4 py-3 text-sm cursor-pointer transition-colors ${
                                                    option.locked
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
                                                        className={`h-4 w-4 rounded border-gray-300 focus:ring-2 focus:ring-blue-500 ${
                                                            option.locked
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
                    <button
                        onClick={() => navigate('/indirect-sales/list')}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 font-medium"
                    >
                        View All Records
                    </button>
                    <button
                        onClick={handleOpenCreate}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm transition-colors"
                    >
                        <PlusCircle size={20} />
                        <span className="font-medium">Create</span>
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
                                            ['records', 'purchaseAmount', 'salesAmount', 'netProfit', 'margin'].includes(column.key)
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
                            {getFinancialYearOrder(data?.months).map((month, index) => (
                                <tr
                                    key={index}
                                    onClick={() => handleMonthClick(month)}
                                    className={`hover:bg-gray-50 cursor-pointer transition-colors ${month.count === 0 ? 'opacity-60' : ''}`}
                                >
                                    {activeColumns.map((column) => (
                                        <td
                                            key={column.key}
                                            className={`px-6 py-4 ${
                                                column.key === 'date' ? 'font-medium text-blue-600 hover:underline text-left' : ''
                                            } ${
                                                ['records', 'purchaseAmount', 'salesAmount', 'netProfit', 'margin'].includes(column.key)
                                                ? 'text-right text-gray-900'
                                                : 'text-left text-gray-900'
                                            } ${
                                                column.key === 'netProfit' ? (month.netProfit >= 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold') : ''
                                            }`}
                                        >
                                            {column.render(month)}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                            <tr className="bg-gray-100 font-bold border-t-2 border-gray-300">
                                {activeColumns.map((column) => (
                                    <td
                                        key={column.key}
                                        className={`px-6 py-4 text-gray-900 ${
                                            ['records', 'purchaseAmount', 'salesAmount', 'netProfit', 'margin'].includes(column.key)
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
                                            '-'
                                        )}
                                    </td>
                                ))}
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 px-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl text-left">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                            <h2 className="text-xl font-semibold text-gray-900">Create Indirect Purchase &amp; Sale</h2>
                            <button
                                onClick={() => setIsCreateModalOpen(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleCreateSubmit} className="px-6 py-6 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Date *
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.date}
                                        onChange={(event) => setFormData(prev => ({ ...prev, date: event.target.value }))}
                                        required
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Customer *
                                    </label>
                                    <SearchableSelect
                                        value={formData.customer}
                                        onChange={handleCustomerChange}
                                        options={customerOptions}
                                        placeholder="Select customer"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Vendor *
                                    </label>
                                    <SearchableSelect
                                        value={formData.vendor}
                                        onChange={(val) => setFormData(prev => ({ ...prev, vendor: val }))}
                                        options={vendorOptions}
                                        placeholder="Select vendor"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Place *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.place}
                                        onChange={(event) => setFormData(prev => ({ ...prev, place: event.target.value }))}
                                        required
                                        placeholder="Customer place"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Vehicle Number
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.vehicleNumber}
                                        onChange={(event) => setFormData(prev => ({ ...prev, vehicleNumber: event.target.value }))}
                                        placeholder="Vehicle number"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Driver
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.driver}
                                        onChange={(event) => setFormData(prev => ({ ...prev, driver: event.target.value }))}
                                        placeholder="Driver name"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Notes
                                </label>
                                <textarea
                                    value={formData.notes}
                                    onChange={(event) => setFormData(prev => ({ ...prev, notes: event.target.value }))}
                                    rows={3}
                                    placeholder="Any additional information regarding this indirect sale..."
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateModalOpen(false)}
                                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors text-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 text-sm font-medium"
                                >
                                    {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                                    Create
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
