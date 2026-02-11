import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import api from '../lib/axios';
import { useAuth } from '../contexts/AuthContext';

export default function MonthlySummary() {
    const { type, id } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { user } = useAuth();

    const groupName = searchParams.get('groupName') || '';
    const isFeedGroup = groupName.toLowerCase().includes('feed');

    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [error, setError] = useState('');
    const [year, setYear] = useState(''); // Optional, default to current FY in backend if empty
    const [showPercentage, setShowPercentage] = useState(false);

    const hasAdminAccess = user?.role === 'admin' || user?.role === 'superadmin';

    useEffect(() => {
        if (hasAdminAccess && id) {
            fetchMonthlySummary();
        }
    }, [id, type, year, hasAdminAccess]);

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

    const handleMonthClick = (month) => {
        // Navigate to details page with date filter
        // Format dates as YYYY-MM-DD
        const startDate = new Date(month.startDate).toISOString().split('T')[0];
        const endDate = new Date(month.endDate).toISOString().split('T')[0]; // This is actually start of next month in backend logic?
        // Backend: month.endDate = Start of Next Month.
        // Frontend date filter expects inclusive end date?
        // CustomerDetails: filter.endDate -> setHours(23,59,59,999).
        // So if I pass '2025-05-01' as endDate, it covers up to May 1st 23:59.
        // If backend returns Apr 1 to May 1.
        // I should pass End Date as April 30.
        // Let's adjust endDate.
        const actualEndDate = new Date(month.endDate);
        actualEndDate.setDate(actualEndDate.getDate() - 1);
        const endDateStr = actualEndDate.toISOString().split('T')[0];

        const targetPath = type === 'customer' ? `/customers/${id}` :
            type === 'vendor' ? `/vendors/${id}` :
                type === 'ledger' ? `/ledgers/${id}` :
                    type === 'dieselStation' ? `/diesel-stations/${id}` : null;

        const filterType = new URLSearchParams(window.location.search).get('filterType');

        if (targetPath) {
            // Pass via state or query params. CustomerDetails needs update to read query params.
            // For now let's use search params
            let navUrl = `${targetPath}?startDate=${startDate}&endDate=${endDateStr}`;
            if (filterType) navUrl += `&filterType=${filterType}`;
            navigate(navUrl);
        }
    };

    const handleExportToExcel = () => {
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
                if (isFeedGroup) {
                    row['Total Bags'] = month.birds || 0;
                    row['Total Quantity (Kg)'] = month.weight ? parseFloat(month.weight.toFixed(2)) : 0;
                } else {
                    row['Total Birds'] = month.birds || 0;
                    row['Total Weight'] = month.weight ? parseFloat(month.weight.toFixed(2)) : 0;
                }
            }

            row['Debit (Sales)'] = month.debit || 0;
            row['Credit (Receipts)'] = month.credit || 0;
            row['Closing Balance'] = `${month.closingBalance.toFixed(2)} ${month.closingBalanceType === 'credit' ? 'Cr' : 'Dr'}`;

            return row;
        });

        // Add Totals Row
        const totalRow = {
            Month: 'Grand Total',
        };

        if (type === 'dieselStation') {
            totalRow['Total Volume'] = data.totals.volume || 0;
            totalRow['Total Rate/ltr'] = data.totals.volume ? parseFloat((data.totals.credit / data.totals.volume).toFixed(2)) : '-';
        } else {
            totalRow['Total Birds'] = data.totals.birds || 0;
            totalRow['Total Weight'] = data.totals.weight ? parseFloat(data.totals.weight.toFixed(2)) : 0;
        }

        totalRow['Debit (Sales)'] = data.totals.debit || 0;
        totalRow['Credit (Receipts)'] = data.totals.credit || 0;
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

    if (!hasAdminAccess) return <div className="p-4 text-red-600">Access Denied</div>;
    if (loading && !data) return <div className="flex justify-center p-12"><Loader2 className="animate-spin w-8 h-8 text-blue-600" /></div>;
    if (error) return <div className="p-4 text-center">
        <p className="text-red-500 mb-4">{error}</p>
        <button onClick={fetchMonthlySummary} className="px-4 py-2 bg-blue-600 text-white rounded">Retry</button>
    </div>;
    if (!data) return null;

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
                <div className="flex gap-3 mt-4 sm:mt-0">
                    <button
                        onClick={() => setShowPercentage(!showPercentage)}
                        className={`px-4 py-2 border rounded-lg font-medium transition-colors shadow-sm ${showPercentage
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
                                {/* Conditional Headers */}
                                {type === 'dieselStation' ? (
                                    <>
                                        <th className="px-6 py-3 text-right font-medium text-gray-700">Total Volume</th>
                                        <th className="px-6 py-3 text-right font-medium text-gray-700">Total Rate/ltr</th>
                                    </>
                                ) : (
                                    <>
                                        <th className="px-6 py-3 text-right font-medium text-gray-700">{isFeedGroup ? 'Total Bags' : 'Total Birds'}</th>
                                        <th className="px-6 py-3 text-right font-medium text-gray-700">{isFeedGroup ? 'Total Quantity (Kg)' : 'Total Weight'}</th>
                                    </>
                                )}
                                <th className="px-6 py-3 text-right font-medium text-gray-700">Debit (Sales)</th>
                                <th className="px-6 py-3 text-right font-medium text-gray-700">Credit (Receipts)</th>
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
                                    ) : (
                                        <>
                                            <td className="py-3 px-4 text-right text-gray-700">
                                                {renderCellWithPercentage(month.birds, data.totals.birds)}
                                            </td>
                                            <td className="py-3 px-4 text-right text-gray-700">
                                                {renderCellWithPercentage(month.weight, data.totals.weight, 'weight')}
                                            </td>
                                        </>
                                    )}
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
                                ) : (
                                    <>
                                        <td className="py-3 px-4 text-right text-gray-900">
                                            {renderCellWithPercentage(data.totals.birds, data.totals.birds)}
                                        </td>
                                        <td className="py-3 px-4 text-right text-gray-900">
                                            {renderCellWithPercentage(data.totals.weight, data.totals.weight, 'weight')}
                                        </td>
                                    </>
                                )}
                                <td className="py-3 px-4 text-right text-gray-900">
                                    {renderCellWithPercentage(data.totals.debit, data.totals.debit, 'currency')}
                                </td>
                                <td className="py-3 px-4 text-right text-gray-900">
                                    {renderCellWithPercentage(data.totals.credit, data.totals.credit, 'currency')}
                                </td>
                                <td className="py-3 px-4 text-right text-gray-900">
                                    {/* Closing Balance of the year is the closing balance of the last month */}
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
        </div>
    );
}
