import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Download, ChevronDown, Calendar, X, Filter } from 'lucide-react';
import * as XLSX from 'xlsx';
import api from '../lib/axios';
import { useAuth } from '../contexts/AuthContext';

export default function MonthlySummary() {
    const { type, id } = useParams();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const { user } = useAuth();

    const groupName = searchParams.get('groupName') || '';
    const isFeedGroup = groupName.toLowerCase().includes('feed');
    const isSundryGroup = type === 'customer' || type === 'vendor' || groupName.toLowerCase().includes('debtor') || groupName.toLowerCase().includes('creditor') || groupName.toLowerCase().includes('sundry');

    const isPurchaseOrSalesGroup = groupName.toLowerCase().trim().includes('purchase') || groupName.toLowerCase().trim().includes('sales');

    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [reportData, setReportData] = useState(null);
    const [error, setError] = useState('');

    // Date Filter States
    const [dateFilter, setDateFilter] = useState({
        startDate: searchParams.get('startDate') || '',
        endDate: searchParams.get('endDate') || ''
    });
    const [showDateFilterModal, setShowDateFilterModal] = useState(false);
    const [tempDateFilter, setTempDateFilter] = useState({
        startDate: '',
        endDate: ''
    });

    // Column Filters for Purchase/Sales report
    const [vehicleFilter, setVehicleFilter] = useState('');
    const [driverFilter, setDriverFilter] = useState('');
    const [gstFilter, setGstFilter] = useState('');
    const [panFilter, setPanFilter] = useState('');

    // Derive financial year from URL search params or default
    const getInitialYear = () => {
        const paramStartDate = searchParams.get('startDate');
        if (paramStartDate) {
            const d = new Date(paramStartDate);
            if (d.getMonth() === 3) return d.getFullYear();
            return d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
        }
        const now = new Date();
        return now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    };

    const [year, setYear] = useState(getInitialYear);
    const [showPercentage, setShowPercentage] = useState(false);

    const yearOptions = (() => {
        const opts = [];
        const currentYear = new Date().getFullYear();
        for (let y = 2023; y <= currentYear + 1; y++) opts.push(y);
        return opts;
    })();

    const hasAdminAccess = user?.role === 'admin' || user?.role === 'superadmin';

    useEffect(() => {
        // Sync dateFilter with URL params if they change
        const start = searchParams.get('startDate');
        const end = searchParams.get('endDate');
        if (start !== dateFilter.startDate || end !== dateFilter.endDate) {
            setDateFilter({
                startDate: start || '',
                endDate: end || ''
            });
        }
    }, [searchParams]);

    useEffect(() => {
        if (hasAdminAccess && id) {
            if (isPurchaseOrSalesGroup) {
                fetchPurchaseSalesReport();
            } else {
                fetchMonthlySummary();
            }
        }
    }, [id, type, year, hasAdminAccess, dateFilter]);

    const fetchMonthlySummary = async () => {
        try {
            setLoading(true);
            setError('');
            const params = { type };
            if (year) params.year = year;

            const response = await api.get(`/ledger/${id}/monthly-summary`, { params });
            if (response.data.success) {
                setData(response.data.data);
            }
        } catch (err) {
            console.error('Error fetching monthly summary:', err);
            setError(err.response?.data?.message || 'Failed to fetch monthly summary');
        } finally {
            setLoading(false);
        }
    };

    const fetchPurchaseSalesReport = async () => {
        try {
            setLoading(true);
            setError('');
            const params = {};
            if (dateFilter.startDate) params.startDate = dateFilter.startDate;
            if (dateFilter.endDate) params.endDate = dateFilter.endDate;

            const response = await api.get(`/ledger/${id}/purchase-sales-report`, { params });
            if (response.data.success) {
                setReportData(response.data.data);
            }
        } catch (err) {
            console.error('Error fetching purchase/sales report:', err);
            setError(err.response?.data?.message || 'Failed to fetch report details');
        } finally {
            setLoading(false);
        }
    };

    // Client-side filtering of purchase/sales transactions
    const filteredTransactions = useMemo(() => {
        if (!reportData || !reportData.transactions) return [];

        return reportData.transactions.filter(t => {
            const matchVehicle = !vehicleFilter || t.vehicleNo.toLowerCase().includes(vehicleFilter.trim().toLowerCase());
            const matchDriver = !driverFilter || t.driver.toLowerCase().includes(driverFilter.trim().toLowerCase());
            const matchGst = !gstFilter || t.gstNo.toLowerCase().includes(gstFilter.trim().toLowerCase());
            const matchPan = !panFilter || t.panNo.toLowerCase().includes(panFilter.trim().toLowerCase());

            return matchVehicle && matchDriver && matchGst && matchPan;
        });
    }, [reportData, vehicleFilter, driverFilter, gstFilter, panFilter]);

    // Totals for purchase/sales report
    const reportTotals = useMemo(() => {
        const totals = { birds: 0, weight: 0, amount: 0 };
        filteredTransactions.forEach(t => {
            totals.birds += t.birds || 0;
            totals.weight += t.weight || 0;
            totals.amount += t.amount || 0;
        });
        totals.avg = totals.birds > 0 ? totals.weight / totals.birds : 0;
        return totals;
    }, [filteredTransactions]);

    const handleMonthClick = (month) => {
        const d = new Date(month.startDate);
        const yearVal = d.getFullYear();
        const monthVal = d.getMonth() + 1;

        if (type === 'customer') {
            navigate(`/customers/${id}/daily?year=${yearVal}&month=${monthVal}&groupName=${encodeURIComponent(groupName)}`);
            return;
        } else if (type === 'vendor') {
            navigate(`/vendors/${id}/daily?year=${yearVal}&month=${monthVal}&groupName=${encodeURIComponent(groupName)}`);
            return;
        } else if (type === 'ledger') {
            navigate(`/ledgers/${id}/daily?year=${yearVal}&month=${monthVal}&groupName=${encodeURIComponent(groupName)}`);
            return;
        }
    };

    const handleExportToExcel = () => {
        if (isPurchaseOrSalesGroup) {
            if (!reportData) return;
            const isPurchase = reportData.isPurchase;

            const exportData = filteredTransactions.map(t => ({
                Date: new Date(t.date).toLocaleDateString('en-GB'),
                Particulars: t.particulars,
                Birds: t.birds || 0,
                Avg: t.avg || 0,
                Weight: t.weight || 0,
                Rate: t.rate || 0,
                Amount: t.amount || 0,
                [isPurchase ? 'Purchase Details' : 'Sales Details']: t.details,
                'Vehicle No': t.vehicleNo,
                Driver: t.driver,
                'GST No': t.gstNo,
                'PAN No': t.panNo
            }));

            // Grand Total Row
            exportData.push({
                Date: 'Grand Total',
                Particulars: '',
                Birds: reportTotals.birds,
                Avg: Number(reportTotals.avg.toFixed(2)),
                Weight: Number(reportTotals.weight.toFixed(2)),
                Rate: '',
                Amount: reportTotals.amount,
                [isPurchase ? 'Purchase Details' : 'Sales Details']: '',
                'Vehicle No': '',
                Driver: '',
                'GST No': '',
                'PAN No': ''
            });

            const ws = XLSX.utils.json_to_sheet(exportData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, isPurchase ? "Purchase Account" : "Sales Account");
            XLSX.writeFile(wb, `${reportData.ledgerName}_Report.xlsx`);
            return;
        }

        if (!data) return;

        const exportData = data.months.map(month => {
            const row = {
                Month: month.name,
            };

            if (type === 'dieselStation') {
                row['Total Volume'] = month.volume || 0;
                row['Total Rate/ltr'] = month.volume ? parseFloat((month.credit / month.volume).toFixed(2)) : '-';
            } else {
                const groupName = searchParams.get('groupName') || '';
                const isFeedGroup = groupName.toLowerCase().includes('feed');

                if (isSundryGroup) {
                    if (isFeedGroup) {
                        row['Total Bags'] = month.birds || 0;
                        row['Total Quantity (Kg)'] = month.weight ? parseFloat(month.weight.toFixed(2)) : 0;
                    } else {
                        row['Total Birds'] = month.birds || 0;
                        row['Total Weight'] = month.weight ? parseFloat(month.weight.toFixed(2)) : 0;
                    }
                }
            }

            row[isSundryGroup ? 'Debit (Sales)' : 'Debit'] = month.debit || 0;
            row[isSundryGroup ? 'Credit (Receipts)' : 'Credit'] = month.credit || 0;
            row['Closing Balance'] = `${month.closingBalance.toFixed(2)} ${month.closingBalanceType === 'credit' ? 'Cr' : 'Dr'}`;

            return row;
        });

        const totalRow = {
            Month: 'Grand Total',
        };

        if (type === 'dieselStation') {
            totalRow['Total Volume'] = data.totals.volume || 0;
            totalRow['Total Rate/ltr'] = data.totals.volume ? parseFloat((data.totals.credit / data.totals.volume).toFixed(2)) : '-';
        } else {
            if (isSundryGroup) {
                const groupName = searchParams.get('groupName') || '';
                const isFeedGroup = groupName.toLowerCase().includes('feed');
                if (isFeedGroup) {
                    totalRow['Total Bags'] = data.totals.birds || 0;
                    totalRow['Total Quantity (Kg)'] = data.totals.weight ? parseFloat(data.totals.weight.toFixed(2)) : 0;
                } else {
                    totalRow['Total Birds'] = data.totals.birds || 0;
                    totalRow['Total Weight'] = data.totals.weight ? parseFloat(data.totals.weight.toFixed(2)) : 0;
                }
            }
        }

        totalRow[isSundryGroup ? 'Debit (Sales)' : 'Debit'] = data.totals.debit || 0;
        totalRow[isSundryGroup ? 'Credit (Receipts)' : 'Credit'] = data.totals.credit || 0;
        totalRow['Closing Balance'] = `${data.months[data.months.length - 1].closingBalance.toFixed(2)} ${data.months[data.months.length - 1].closingBalanceType === 'credit' ? 'Cr' : 'Dr'}`;

        exportData.push(totalRow);

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Monthly Summary");
        const fileName = `${data.subject.name.replace(/[^a-zA-Z0-9]/g, '_')}_Monthly_Summary.xlsx`;
        XLSX.writeFile(wb, fileName);
    };

    const renderCellWithPercentage = (val, total, type = 'number', isClosing = false) => {
        if ((!val && val !== 0) || (val === 0 && !isClosing)) return '-';

        let formatted;
        const absVal = Math.abs(val);

        if (type === 'currency') {
            formatted = absVal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            if (isClosing) {
                formatted += (val >= 0 ? ' Dr' : ' Cr');
            }
        } else if (type === 'weight') {
            formatted = absVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        } else {
            formatted = absVal.toLocaleString();
        }

        if (showPercentage && total) {
            const absTotal = Math.abs(total);
            if (absTotal === 0) return formatted;
            const pct = ((absVal / absTotal) * 100).toFixed(2);

            return (
                <span className="whitespace-nowrap">
                    {formatted} <span className="text-gray-500 text-xs ml-1">({pct}%)</span>
                </span>
            );
        }

        return formatted;
    };

    const openDateFilterModal = () => {
        setTempDateFilter(dateFilter);
        setShowDateFilterModal(true);
    };

    const handleApplyDateFilter = () => {
        setDateFilter(tempDateFilter);
        setSearchParams({
            groupName,
            startDate: tempDateFilter.startDate,
            endDate: tempDateFilter.endDate
        });
        setShowDateFilterModal(false);
    };

    const handleClearDateFilter = () => {
        setDateFilter({ startDate: '', endDate: '' });
        setSearchParams({ groupName });
        setTempDateFilter({ startDate: '', endDate: '' });
        setShowDateFilterModal(false);
    };

    const formatDateDisplay = (dateString) => {
        if (!dateString) return '';
        return new Date(dateString).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    if (!hasAdminAccess) return <div className="p-4 text-red-600">Access Denied</div>;
    if (loading && !data && !reportData) return <div className="flex justify-center p-12"><Loader2 className="animate-spin w-8 h-8 text-blue-600" /></div>;
    if (error) return <div className="p-4 text-center">
        <p className="text-red-500 mb-4">{error}</p>
        <button onClick={isPurchaseOrSalesGroup ? fetchPurchaseSalesReport : fetchMonthlySummary} className="px-4 py-2 bg-blue-600 text-white rounded">Retry</button>
    </div>;

    // Render Detailed Purchase/Sales Report
    if (isPurchaseOrSalesGroup && reportData) {
        const isPurchase = reportData.isPurchase;

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
                            <p className="text-gray-600 mt-1">{isPurchase ? 'Purchase Account' : 'Sales Account'}</p>
                            <h1 className="text-3xl font-bold text-gray-900 capitalize">{reportData.ledgerName}</h1>
                            <p className="text-sm text-gray-500 capitalize">{reportData.groupName}</p>
                        </div>
                    </div>
                    <div className="flex gap-3 mt-4 sm:mt-0 items-center">
                        <button
                            onClick={openDateFilterModal}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 shadow-sm"
                        >
                            <Calendar size={20} className="text-gray-500" />
                            <span className="font-medium">
                                {dateFilter.startDate ? `${formatDateDisplay(dateFilter.startDate)} - ` : 'All Time'}
                                {dateFilter.startDate && formatDateDisplay(dateFilter.endDate)}
                            </span>
                        </button>
                        <button
                            onClick={handleExportToExcel}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-sm transition-colors"
                        >
                            <Download size={20} />
                            <span className="font-medium">Export Excel</span>
                        </button>
                    </div>
                </div>

                {/* Filters Panel */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                        <Filter size={16} />
                        <span>Filters</span>
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Vehicle No</label>
                            <input
                                type="text"
                                value={vehicleFilter}
                                onChange={(e) => setVehicleFilter(e.target.value)}
                                placeholder="Filter by vehicle no..."
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Driver</label>
                            <input
                                type="text"
                                value={driverFilter}
                                onChange={(e) => setDriverFilter(e.target.value)}
                                placeholder="Filter by driver..."
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 uppercase mb-1">GST No</label>
                            <input
                                type="text"
                                value={gstFilter}
                                onChange={(e) => setGstFilter(e.target.value)}
                                placeholder="Filter by GST no..."
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 uppercase mb-1">PAN No</label>
                            <input
                                type="text"
                                value={panFilter}
                                onChange={(e) => setPanFilter(e.target.value)}
                                placeholder="Filter by PAN no..."
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                            />
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-4 py-3 text-left font-medium text-gray-700 whitespace-nowrap">Date</th>
                                    <th className="px-4 py-3 text-left font-medium text-gray-700 whitespace-nowrap">Particulars</th>
                                    <th className="px-4 py-3 text-right font-medium text-gray-700 whitespace-nowrap">Birds</th>
                                    <th className="px-4 py-3 text-right font-medium text-gray-700 whitespace-nowrap">Avg</th>
                                    <th className="px-4 py-3 text-right font-medium text-gray-700 whitespace-nowrap">Weight</th>
                                    <th className="px-4 py-3 text-right font-medium text-gray-700 whitespace-nowrap">Rate</th>
                                    <th className="px-4 py-3 text-right font-medium text-gray-700 whitespace-nowrap">Amount</th>
                                    <th className="px-4 py-3 text-left font-medium text-gray-700 whitespace-nowrap">{isPurchase ? 'Purchase Details' : 'Sales Details'}</th>
                                    <th className="px-4 py-3 text-left font-medium text-gray-700 whitespace-nowrap">Vehicle No</th>
                                    <th className="px-4 py-3 text-left font-medium text-gray-700 whitespace-nowrap">Driver</th>
                                    <th className="px-4 py-3 text-left font-medium text-gray-700 whitespace-nowrap">GST No</th>
                                    <th className="px-4 py-3 text-left font-medium text-gray-700 whitespace-nowrap">PAN No</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {filteredTransactions.length === 0 ? (
                                    <tr>
                                        <td colSpan="12" className="px-6 py-8 text-center text-gray-500">
                                            No transactions found matching the filters.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredTransactions.map((t) => (
                                        <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-4 py-3 text-gray-900 whitespace-nowrap">{formatDateDisplay(t.date)}</td>
                                            <td className="px-4 py-3 text-gray-900 font-medium">{t.particulars}</td>
                                            <td className="px-4 py-3 text-right text-gray-900">{t.birds || '-'}</td>
                                            <td className="px-4 py-3 text-right text-gray-900">{t.avg ? t.avg.toFixed(2) : '-'}</td>
                                            <td className="px-4 py-3 text-right text-gray-900">{t.weight ? t.weight.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}</td>
                                            <td className="px-4 py-3 text-right text-gray-900">{t.rate ? `₹${t.rate.toLocaleString('en-IN')}` : '-'}</td>
                                            <td className="px-4 py-3 text-right text-gray-900 font-semibold">₹{t.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                            <td className="px-4 py-3 text-gray-900 whitespace-nowrap">
                                                <span className={`px-2 py-0.5 rounded text-xs font-semibold ${t.details.startsWith('TRP') ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                                                    {t.details}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-gray-900 whitespace-nowrap">{t.vehicleNo}</td>
                                            <td className="px-4 py-3 text-gray-900 whitespace-nowrap">{t.driver}</td>
                                            <td className="px-4 py-3 text-gray-900 whitespace-nowrap">{t.gstNo}</td>
                                            <td className="px-4 py-3 text-gray-900 whitespace-nowrap">{t.panNo}</td>
                                        </tr>
                                    ))
                                )}
                                <tr className="bg-gray-100 font-bold border-t-2 border-gray-300">
                                    <td className="px-4 py-3 text-gray-900" colSpan="2">Total</td>
                                    <td className="px-4 py-3 text-right text-gray-900">{reportTotals.birds}</td>
                                    <td className="px-4 py-3 text-right text-gray-900">{reportTotals.avg ? reportTotals.avg.toFixed(2) : '-'}</td>
                                    <td className="px-4 py-3 text-right text-gray-900">{reportTotals.weight.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                    <td className="px-4 py-3 text-right text-gray-900">-</td>
                                    <td className="px-4 py-3 text-right text-gray-900">₹{reportTotals.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                    <td className="px-4 py-3 text-gray-900" colSpan="5">-</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Date Filter Modal */}
                {showDateFilterModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl animate-in fade-in zoom-in-95 duration-150">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                    <Calendar size={24} className="text-blue-600" />
                                    Select Date Range
                                </h2>
                                <button onClick={() => setShowDateFilterModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                    <X size={24} />
                                </button>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                                    <input type="date" value={tempDateFilter.startDate}
                                        onChange={(e) => setTempDateFilter(prev => ({ ...prev, startDate: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                                    <input type="date" value={tempDateFilter.endDate}
                                        onChange={(e) => setTempDateFilter(prev => ({ ...prev, endDate: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                                    />
                                </div>
                                <div className="flex justify-end gap-3 mt-6">
                                    <button type="button" onClick={handleClearDateFilter} className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors mr-auto">Reset</button>
                                    <button type="button" onClick={() => setShowDateFilterModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors">Cancel</button>
                                    <button type="button" onClick={handleApplyDateFilter} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors">Apply Filter</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    if (!data) return null;
    console.log("groupName", groupName)

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <p className="text-gray-600 mt-1">Monthly Summary</p>
                        <h1 className="text-3xl font-bold text-gray-900 capitalize">{data.subject.name}</h1>
                        <p className="text-sm text-gray-500 capitalize">{data.subject.type}</p>
                    </div>
                </div>
                <div className="flex gap-3 mt-4 sm:mt-0 items-center">
                    {/* Financial Year Dropdown */}
                    <div className="relative">
                        <select
                            value={year}
                            onChange={(e) => setYear(parseInt(e.target.value))}
                            className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-10 font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition-colors cursor-pointer focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        >
                            {yearOptions.map(y => (
                                <option key={y} value={y}>FY {y}-{y + 1}</option>
                            ))}
                        </select>
                        <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                    </div>

                    <button
                        onClick={() => setShowPercentage(!showPercentage)}
                        className={`px-4 py-2 border rounded-lg font-medium transition-colors shadow-sm ${
                            showPercentage
                                ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'
                                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                        }`}
                    >
                        % Percentage
                    </button>
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
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-900">Monthly Breakdown</h2>
                    <div className="text-sm text-gray-600">
                        Opening Balance: <span className="font-semibold">
                            {data.openingBalance?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            <span className="ml-1 uppercase text-xs">{data.openingBalanceType?.charAt(0) || 'D'}r</span>
                        </span>
                    </div>
                </div>
                {hasAdminAccess && (
                    <div className="text-gray-500 mb-4">
                        <p className="text-sm">
                            Group: {searchParams.get('groupName')}
                        </p>
                    </div>
                )}
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3 text-left font-medium text-gray-700">Month</th>
                                {type === 'dieselStation' ? (
                                    <>
                                        <th className="px-6 py-3 text-right font-medium text-gray-700">Total Volume</th>
                                        <th className="px-6 py-3 text-right font-medium text-gray-700">Total Rate/ltr</th>
                                    </>
                                ) : isSundryGroup ? (
                                    <>
                                        <th className="px-6 py-3 text-right font-medium text-gray-700">{isFeedGroup ? 'Total Bags' : 'Total Birds'}</th>
                                        <th className="px-6 py-3 text-right font-medium text-gray-700">{isFeedGroup ? 'Total Quantity (Kg)' : 'Total Weight'}</th>
                                    </>
                                ) : null}
                                <th className="px-6 py-3 text-right font-medium text-gray-700">{isSundryGroup ? 'Debit (Sales)' : 'Debit'}</th>
                                <th className="px-6 py-3 text-right font-medium text-gray-700">{isSundryGroup ? 'Credit (Receipts)' : 'Credit'}</th>
                                <th className="px-6 py-3 text-right font-medium text-gray-700">Closing Balance</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.months.map((month, index) => (
                                <tr
                                    key={month.name}
                                    className="border-b border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors"
                                    onClick={() => handleMonthClick(month)}
                                >
                                    <td className="py-3 px-4 text-blue-600 font-medium hover:underline">
                                        {new Date(month.startDate).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
                                    </td>
                                    {type === 'dieselStation' ? (
                                        <>
                                            <td className="py-3 px-4 text-right text-gray-700">
                                                {renderCellWithPercentage(month.volume, data.totals.volume, 'weight')}
                                            </td>
                                            <td className="py-3 px-4 text-right text-gray-700">
                                                {month.volume ? (month.credit / month.volume).toFixed(2) : '-'}
                                            </td>
                                        </>
                                    ) : isSundryGroup ? (
                                        <>
                                            <td className="py-3 px-4 text-right text-gray-700">
                                                {renderCellWithPercentage(month.birds, data.totals.birds)}
                                            </td>
                                            <td className="py-3 px-4 text-right text-gray-700">
                                                {renderCellWithPercentage(month.weight, data.totals.weight, 'weight')}
                                            </td>
                                        </>
                                    ) : null}
                                    <td className="py-3 px-4 text-right text-gray-700">
                                        {renderCellWithPercentage(month.debit, data.totals.debit, 'currency')}
                                    </td>
                                    <td className="py-3 px-4 text-right text-gray-700">
                                        {renderCellWithPercentage(month.credit, data.totals.credit, 'currency')}
                                    </td>
                                    <td className="py-3 px-4 text-right font-medium text-gray-900">
                                        {month.closingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        <span className="ml-1 text-xs text-gray-500 uppercase">{month.closingBalanceType ? month.closingBalanceType.charAt(0) + 'r' : ''}</span>
                                    </td>
                                </tr>
                            ))}
                            <tr className="bg-gray-100 font-bold border-t-2 border-gray-300">
                                <td className="py-3 px-4 text-gray-900">Total</td>
                                {type === 'dieselStation' ? (
                                    <>
                                        <td className="py-3 px-4 text-right text-gray-900">
                                            {renderCellWithPercentage(data.totals.volume, data.totals.volume, 'weight')}
                                        </td>
                                        <td className="py-3 px-4 text-right text-gray-900">
                                            {data.totals.volume ? (data.totals.credit / data.totals.volume).toFixed(2) : '-'}
                                        </td>
                                    </>
                                ) : isSundryGroup ? (
                                    <>
                                        <td className="py-3 px-4 text-right text-gray-900">
                                            {renderCellWithPercentage(data.totals.birds, data.totals.birds)}
                                        </td>
                                        <td className="py-3 px-4 text-right text-gray-900">
                                            {renderCellWithPercentage(data.totals.weight, data.totals.weight, 'weight')}
                                        </td>
                                    </>
                                ) : null}
                                <td className="py-3 px-4 text-right text-gray-900">
                                    {renderCellWithPercentage(data.totals.debit, data.totals.debit, 'currency')}
                                </td>
                                <td className="py-3 px-4 text-right text-gray-900">
                                    {renderCellWithPercentage(data.totals.credit, data.totals.credit, 'currency')}
                                </td>
                                <td className="py-3 px-4 text-right text-gray-900">
                                    {data.months[data.months.length - 1].closingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    <span className="ml-1 text-xs text-gray-500 uppercase">
                                        {data.months[data.months.length - 1].closingBalanceType?.charAt(0) + 'r'}
                                    </span>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Date Filter Modal */}
            {showDateFilterModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                <Calendar size={24} className="text-blue-600" />
                                Select Date Range
                            </h2>
                            <button onClick={() => setShowDateFilterModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                                <input type="date" value={tempDateFilter.startDate}
                                    onChange={(e) => setTempDateFilter(prev => ({ ...prev, startDate: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                                <input type="date" value={tempDateFilter.endDate}
                                    onChange={(e) => setTempDateFilter(prev => ({ ...prev, endDate: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                                />
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <button type="button" onClick={handleClearDateFilter} className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors mr-auto">Reset</button>
                                <button type="button" onClick={() => setShowDateFilterModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors">Cancel</button>
                                <button type="button" onClick={handleApplyDateFilter} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors">Apply Filter</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
