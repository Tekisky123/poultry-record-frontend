import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  Search,
  Download,
  Edit,
  Trash2,
  Eye,
  Calendar,
  FileText,
  Users,
  AlertCircle,
  ArrowLeft,
  X
} from 'lucide-react';
import api from '../lib/axios';
import { exportVouchersToExcel, exportVouchersToPDF, getDebitAndCreditParties } from '../utils/voucherExport';

const VoucherList = () => {
  // Determine current financial year start (April 1st)
  const currentMonth = new Date().getMonth();
  const currentFullYear = new Date().getFullYear();
  const defaultFYStartYear = currentMonth >= 3 ? currentFullYear : currentFullYear - 1;

  const [selectedYear, setSelectedYear] = useState(defaultFYStartYear);
  const [selectedMonth, setSelectedMonth] = useState(null); // null = Monthly Breakdown Landing Page, or { monthIndex, name, year, startDate, endDate }

  const [allFyVouchers, setAllFyVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters for Month Details View
  const [vNoSearch, setVNoSearch] = useState('');
  const [voucherTypeFilter, setVoucherTypeFilter] = useState('');

  const voucherTypes = ['Sales', 'Purchase', 'Payment', 'Receipt', 'Contra', 'Journal'];

  // Financial years options (e.g., 2024 -> FY 2024-2025)
  const yearOptions = useMemo(() => {
    const options = [];
    const baseYear = new Date().getFullYear();
    for (let y = 2023; y <= baseYear + 1; y++) {
      options.push(y);
    }
    return options;
  }, []);

  // Fetch all FY vouchers when selectedYear changes
  useEffect(() => {
    fetchFYVouchers();
  }, [selectedYear]);

  const fetchFYVouchers = async () => {
    try {
      setLoading(true);
      setError('');
      const startDate = `${selectedYear}-04-01`;
      const endDate = `${selectedYear + 1}-03-31`;

      const params = new URLSearchParams({
        page: 1,
        limit: 10000,
        startDate,
        endDate
      });

      const response = await api.get(`/voucher?${params}`);
      if (response.data.success) {
        setAllFyVouchers(response.data.data.vouchers || []);
      }
    } catch (err) {
      console.error('Error fetching vouchers for FY:', err);
      setError('Failed to fetch voucher data');
    } finally {
      setLoading(false);
    }
  };

  // Generate 12 months for the selected Financial Year (April -> March)
  const monthsSummary = useMemo(() => {
    const monthNames = [
      'April', 'May', 'June', 'July', 'August', 'September',
      'October', 'November', 'December', 'January', 'February', 'March'
    ];

    let runningBalance = 0;

    return monthNames.map((mName, idx) => {
      // April (idx=0) to Dec (idx=8) belong to selectedYear; Jan (idx=9) to Mar (idx=11) belong to selectedYear + 1
      const year = idx <= 8 ? selectedYear : selectedYear + 1;
      const monthNum = idx <= 8 ? idx + 4 : idx - 8; // 1-indexed month number (April=4, ..., Dec=12, Jan=1, Feb=2, Mar=3)
      const monthKey = `${year}-${String(monthNum).padStart(2, '0')}`;

      // Filter vouchers in this month
      const monthVouchers = allFyVouchers.filter(v => {
        const d = new Date(v.date);
        const vKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        return vKey === monthKey;
      });

      const debitSum = monthVouchers.reduce((acc, v) => acc + (v.totalDebit || 0), 0);
      const creditSum = monthVouchers.reduce((acc, v) => acc + (v.totalCredit || 0), 0);
      runningBalance += (debitSum - creditSum);

      const lastDay = new Date(year, monthNum, 0).getDate();
      const startDate = `${year}-${String(monthNum).padStart(2, '0')}-01`;
      const endDate = `${year}-${String(monthNum).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

      return {
        monthIndex: idx,
        name: `${mName} ${year}`,
        monthNum,
        year,
        startDate,
        endDate,
        debit: debitSum,
        credit: creditSum,
        closingBalance: runningBalance,
        voucherCount: monthVouchers.length,
        vouchers: monthVouchers
      };
    });
  }, [allFyVouchers, selectedYear]);

  // Total FY Debit and Credit
  const fyTotals = useMemo(() => {
    const debit = monthsSummary.reduce((acc, m) => acc + m.debit, 0);
    const credit = monthsSummary.reduce((acc, m) => acc + m.credit, 0);
    return { debit, credit };
  }, [monthsSummary]);

  // Vouchers for currently selected month
  const selectedMonthVouchers = useMemo(() => {
    if (!selectedMonth) return [];
    
    // Find latest month data from monthsSummary
    const mData = monthsSummary.find(m => m.startDate === selectedMonth.startDate);
    const rawVouchers = mData ? mData.vouchers : selectedMonth.vouchers || [];

    return rawVouchers.filter(v => {
      // Apply voucher type filter
      if (voucherTypeFilter && v.voucherType !== voucherTypeFilter) {
        return false;
      }
      // Apply Voucher Number search
      if (vNoSearch) {
        const term = vNoSearch.trim().toLowerCase();
        const { debitParty, creditParty } = getDebitAndCreditParties(v);
        const matchNo = v.voucherNumber && String(v.voucherNumber).toLowerCase().includes(term);
        const matchParty = (debitParty && debitParty.toLowerCase().includes(term)) || (creditParty && creditParty.toLowerCase().includes(term));
        return matchNo || matchParty;
      }
      return true;
    });
  }, [selectedMonth, monthsSummary, voucherTypeFilter, vNoSearch]);

  // Group vouchers date-wise for selected month details view
  const dateWiseGroups = useMemo(() => {
    const dateMap = {};
    selectedMonthVouchers.forEach(v => {
      const d = new Date(v.date);
      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const formattedDate = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

      if (!dateMap[dateKey]) {
        dateMap[dateKey] = {
          dateKey,
          formattedDate,
          vouchers: [],
          totalDebit: 0,
          totalCredit: 0
        };
      }
      dateMap[dateKey].vouchers.push(v);
      dateMap[dateKey].totalDebit += (v.totalDebit || 0);
      dateMap[dateKey].totalCredit += (v.totalCredit || 0);
    });

    return Object.values(dateMap).sort((a, b) => b.dateKey.localeCompare(a.dateKey));
  }, [selectedMonthVouchers]);

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this voucher?')) {
      try {
        const response = await api.delete(`/voucher/${id}`);
        if (response.data.success) {
          fetchFYVouchers();
        }
      } catch (error) {
        console.error('Error deleting voucher:', error);
        setError('Failed to delete voucher');
      }
    }
  };

  const handleExport = (format) => {
    try {
      const exportList = selectedMonth ? selectedMonthVouchers : allFyVouchers;
      const fileName = selectedMonth ? `vouchers_${selectedMonth.name.replace(/\s+/g, '_')}` : `vouchers_FY_${selectedYear}`;
      if (format === 'excel') {
        exportVouchersToExcel(exportList, fileName);
      } else if (format === 'pdf') {
        exportVouchersToPDF(exportList, fileName);
      }
    } catch (err) {
      console.error('Error exporting:', err);
      setError('Failed to export vouchers');
    }
  };

  if (loading && allFyVouchers.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const renderVoucherRow = (voucher) => {
    const isNewVoucher = Boolean(voucher.isMultiPartyDisplay) || (voucher.parties && voucher.parties.length > 1) || (voucher.createdAt && new Date(voucher.createdAt) >= new Date('2026-08-15T00:00:00.000Z'));
    const isPayment = voucher.voucherType === 'Payment' || voucher.voucherType === 'Journal';
    const isReceipt = voucher.voucherType === 'Receipt';
    const accountName = voucher.account?.name || voucher.accountName || 'Cash/Bank Account';

    if (isNewVoucher && (isPayment || isReceipt) && voucher.parties && voucher.parties.length > 0) {
      return voucher.parties.map((p, idx) => {
        const partyName = p.partyName || p.partyId?.shopName || p.partyId?.vendorName || p.partyId?.name || p.partyId?.ownerName || 'Unknown Party';
        const amt = Number(p.amount) || 0;
        const debitParty = isPayment ? partyName : accountName;
        const creditParty = isPayment ? accountName : partyName;
        const debitAmt = amt;
        const creditAmt = amt;

        return (
          <tr key={`${voucher.id || voucher._id}-${idx}`} className="hover:bg-gray-50 text-sm">
            <td className="px-4 py-3.5 whitespace-nowrap text-gray-900">
              <div className="flex items-center gap-1.5">
                <Calendar size={14} className="text-gray-400" />
                {new Date(voucher.date).toLocaleDateString('en-GB')}
              </div>
            </td>
            <td className="px-4 py-3.5 whitespace-nowrap font-semibold text-gray-900">
              {voucher.voucherNumber}
            </td>
            <td className="px-4 py-3.5 whitespace-nowrap">
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {voucher.voucherType}
              </span>
            </td>
            <td className="px-4 py-3.5 text-gray-900 max-w-[200px] truncate" title={debitParty}>
              <div className="flex items-center gap-1.5 font-medium text-gray-800">
                <Users size={14} className="text-blue-500 shrink-0" />
                <span className="truncate">{debitParty}</span>
              </div>
            </td>
            <td className="px-4 py-3.5 whitespace-nowrap font-medium text-green-600">
              ₹{debitAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </td>
            <td className="px-4 py-3.5 text-gray-900 max-w-[200px] truncate" title={creditParty}>
              <div className="flex items-center gap-1.5 text-gray-700">
                <Users size={14} className="text-green-500 shrink-0" />
                <span className="truncate">{creditParty}</span>
              </div>
            </td>
            <td className="px-4 py-3.5 whitespace-nowrap font-medium text-red-600">
              ₹{creditAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </td>
            <td className="px-4 py-3.5 whitespace-nowrap font-medium text-right">
              <div className="flex items-center justify-end gap-2">
                <Link
                  to={`/vouchers/${voucher.id || voucher._id}`}
                  className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                  title="View"
                >
                  <Eye size={16} />
                </Link>
                <Link
                  to={`/vouchers/${voucher.id || voucher._id}/edit`}
                  className="text-green-600 hover:text-green-900 p-1 rounded hover:bg-green-50"
                  title="Edit"
                >
                  <Edit size={16} />
                </Link>
                <button
                  onClick={() => handleDelete(voucher.id || voucher._id)}
                  className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
                  title="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </td>
          </tr>
        );
      });
    }

    const { debitParty, creditParty } = getDebitAndCreditParties(voucher);
    const rawDebit = Number(voucher.totalDebit) || 0;
    const rawCredit = Number(voucher.totalCredit) || 0;
    const fallbackAmt = rawDebit > 0 ? rawDebit : rawCredit;
    const displayDebit = rawDebit > 0 ? rawDebit : fallbackAmt;
    const displayCredit = rawCredit > 0 ? rawCredit : fallbackAmt;

    return (
      <tr key={voucher.id || voucher._id} className="hover:bg-gray-50 text-sm">
        <td className="px-4 py-3.5 whitespace-nowrap text-gray-900">
          <div className="flex items-center gap-1.5">
            <Calendar size={14} className="text-gray-400" />
            {new Date(voucher.date).toLocaleDateString('en-GB')}
          </div>
        </td>
        <td className="px-4 py-3.5 whitespace-nowrap font-semibold text-gray-900">
          {voucher.voucherNumber}
        </td>
        <td className="px-4 py-3.5 whitespace-nowrap">
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            {voucher.voucherType}
          </span>
        </td>
        <td className="px-4 py-3.5 text-gray-900 max-w-[200px] truncate" title={debitParty}>
          <div className="flex items-center gap-1.5 font-medium text-gray-800">
            <Users size={14} className="text-blue-500 shrink-0" />
            <span className="truncate">{debitParty}</span>
          </div>
        </td>
        <td className="px-4 py-3.5 whitespace-nowrap font-medium text-green-600">
          ₹{displayDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </td>
        <td className="px-4 py-3.5 text-gray-900 max-w-[200px] truncate" title={creditParty}>
          <div className="flex items-center gap-1.5 text-gray-700">
            <Users size={14} className="text-green-500 shrink-0" />
            <span className="truncate">{creditParty}</span>
          </div>
        </td>
        <td className="px-4 py-3.5 whitespace-nowrap font-medium text-red-600">
          ₹{displayCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </td>
        <td className="px-4 py-3.5 whitespace-nowrap font-medium text-right">
          <div className="flex items-center justify-end gap-2">
            <Link
              to={`/vouchers/${voucher.id || voucher._id}`}
              className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
              title="View"
            >
              <Eye size={16} />
            </Link>
            <Link
              to={`/vouchers/${voucher.id || voucher._id}/edit`}
              className="text-green-600 hover:text-green-900 p-1 rounded hover:bg-green-50"
              title="Edit"
            >
              <Edit size={16} />
            </Link>
            <button
              onClick={() => handleDelete(voucher.id || voucher._id)}
              className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
              title="Delete"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </td>
      </tr>
    );
  };

  // ==========================================
  // VIEW 2: MONTH DETAILS PAGE (Vouchers for selected month)
  // ==========================================
  if (selectedMonth) {
    // Sort vouchers by date descending
    const sortedMonthVouchers = [...selectedMonthVouchers].sort((a, b) => new Date(b.date) - new Date(a.date));

    return (
      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedMonth(null)}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              title="Back to Monthly Summary"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Vouchers - {selectedMonth.name}</h1>
              <p className="text-gray-600 text-sm">Manage accounting vouchers for {selectedMonth.name}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => handleExport('excel')}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 text-sm"
            >
              <Download size={16} />
              Export Excel
            </button>

            <Link
              to="/vouchers/add"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 text-sm shadow-sm"
            >
              <Plus size={16} />
              Add Voucher
            </Link>
          </div>
        </div>

        {/* Content Container Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Card Sub-header */}
          <div className="p-6 border-b border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-wrap">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <FileText size={20} className="text-blue-600" />
                Vouchers ({sortedMonthVouchers.length} records)
              </h2>

              {/* Search V.NO */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Search V.NO..."
                  value={vNoSearch}
                  onChange={(e) => setVNoSearch(e.target.value)}
                  className="pl-9 pr-8 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent w-36 sm:w-44"
                />
                {vNoSearch && (
                  <button
                    onClick={() => setVNoSearch('')}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <select
                value={voucherTypeFilter}
                onChange={(e) => setVoucherTypeFilter(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">All Types</option>
                {voucherTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border-l-4 border-red-400">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-red-400" />
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          {sortedMonthVouchers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <th className="px-4 py-3.5 text-left">Date</th>
                    <th className="px-4 py-3.5 text-left">Voucher No</th>
                    <th className="px-4 py-3.5 text-left">Type</th>
                    <th className="px-4 py-3.5 text-left">Debit Party</th>
                    <th className="px-4 py-3.5 text-left">Debit</th>
                    <th className="px-4 py-3.5 text-left">Credit Party</th>
                    <th className="px-4 py-3.5 text-left">Credit</th>
                    <th className="px-4 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedMonthVouchers.map((voucher) => renderVoucherRow(voucher))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-16">
              <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-500 font-medium">No vouchers found for {selectedMonth.name}.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW 1: DEFAULT LANDING PAGE (Monthly Breakdown Summary)
  // ==========================================
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vouchers - Monthly Summary</h1>
          <p className="text-gray-600">Monthly breakdown of all accounting vouchers</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* FY Selector */}
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 bg-white"
          >
            {yearOptions.map(y => (
              <option key={y} value={y}>FY {y}-{y + 1}</option>
            ))}
          </select>

          <button
            onClick={() => handleExport('excel')}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-sm transition-colors text-sm font-medium"
          >
            <Download size={18} />
            <span>Export</span>
          </button>

          <Link
            to="/vouchers/add"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 text-sm shadow-sm"
          >
            <Plus size={18} />
            <span>Add Voucher</span>
          </Link>
        </div>
      </div>

      {/* Main Monthly Summary Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {error && (
          <div className="p-4 bg-red-50 border-l-4 border-red-400">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3.5 text-left font-semibold text-gray-700">Month</th>
                <th className="px-6 py-3.5 text-right font-semibold text-gray-700">Debit</th>
                <th className="px-6 py-3.5 text-right font-semibold text-gray-700">Credit</th>
                <th className="px-6 py-3.5 text-right font-semibold text-gray-700">Closing Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {monthsSummary.map((month) => (
                <tr
                  key={month.monthIndex}
                  onClick={() => setSelectedMonth(month)}
                  className="hover:bg-blue-50/50 cursor-pointer transition-colors"
                >
                  <td className="px-6 py-4 font-semibold text-blue-600 hover:underline">
                    {month.name}
                  </td>
                  <td className="px-6 py-4 text-right text-gray-900 font-medium">
                    {month.debit > 0 ? `₹${month.debit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}
                  </td>
                  <td className="px-6 py-4 text-right text-gray-900 font-medium">
                    {month.credit > 0 ? `₹${month.credit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}
                  </td>
                  <td className="px-6 py-4 text-right font-semibold text-gray-900">
                    ₹{Math.abs(month.closingBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })} {month.closingBalance >= 0 ? 'Dr' : 'Cr'}
                  </td>
                </tr>
              ))}
              <tr className="bg-gray-100 font-bold border-t-2 border-gray-300">
                <td className="px-6 py-4 text-gray-900 text-base">Total</td>
                <td className="px-6 py-4 text-right text-green-700 text-base">
                  ₹{fyTotals.debit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
                <td className="px-6 py-4 text-right text-red-700 text-base">
                  ₹{fyTotals.credit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
                <td className="px-6 py-4 text-right text-base text-gray-900">
                  ₹{Math.abs(fyTotals.debit - fyTotals.credit).toLocaleString('en-IN', { minimumFractionDigits: 2 })} {(fyTotals.debit - fyTotals.credit) >= 0 ? 'Dr' : 'Cr'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default VoucherList;
