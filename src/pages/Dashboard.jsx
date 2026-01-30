import { useState, useEffect, useMemo, memo, useCallback } from 'react';
import { Calendar, Download, Loader2, X } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../lib/axios';
import { useAuth } from '../contexts/AuthContext';
import * as XLSX from 'xlsx';

// Render group node with one level of nesting (memoized for performance)
const GroupNode = memo(({ group, level = 0 }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const balance = Math.abs(group.balance || 0);
  const groupId = group.id || group._id;
  const hasChildren = group.children && group.children.length > 0;

  // Calculate indentation for hierarchy
  const indentWidth = 24;
  const leftPadding = level * indentWidth;

  const handleGroupClick = useCallback((e) => {
    e.stopPropagation();
    if (level === 0) return;

    // Pass date filter params
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || new Date().toISOString().split('T')[0];
    navigate(`/group-summary/${groupId}?startDate=${startDate}&endDate=${endDate}`);
  }, [navigate, groupId, searchParams, level]);

  return (
    <div className="select-none">
      {/* Parent Group */}
      <div
        className={`flex items-center gap-2 py-1 rounded px-2 transition-colors ${level > 0 ? 'hover:bg-gray-50 cursor-pointer' : ''}`}
        onClick={handleGroupClick}
        style={{
          paddingLeft: `${leftPadding}px`
        }}
      >
        {/* Group name */}
        <span className={`flex-1 ${level === 0 ? 'text-sm font-semibold text-gray-900' :
          'text-sm text-gray-700'
          }`}>
          {group.name}
        </span>

        {/* Balance */}
        <span className={`text-sm text-right w-32 flex-shrink-0 font-medium ${level > 0 ? 'mr-16 text-gray-600' : 'font-bold text-gray-900'}`}>
          {balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      </div>

      {/* Direct Children (one level only) */}
      {hasChildren && level === 0 && (
        <div>
          {group.children.map((child) => (
            <GroupNode
              key={child.id || child._id}
              group={child}
              level={1}
            />
          ))}
        </div>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison to prevent unnecessary re-renders
  return (
    prevProps.group.id === nextProps.group.id &&
    prevProps.group.balance === nextProps.group.balance &&
    prevProps.level === nextProps.level &&
    JSON.stringify(prevProps.group.children) === JSON.stringify(nextProps.group.children)
  );
});

export default function ProfitAndLoss() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [profitAndLoss, setProfitAndLoss] = useState(null);

  const [dateFilter, setDateFilter] = useState({
    startDate: searchParams.get('startDate') || '',
    endDate: searchParams.get('endDate') || new Date().toISOString().split('T')[0]
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState('');

  // Date Filter Modal States
  const [showDateFilterModal, setShowDateFilterModal] = useState(false);
  const [tempDateFilter, setTempDateFilter] = useState({
    startDate: '',
    endDate: ''
  });

  const hasAdminAccess = user?.role === 'admin' || user?.role === 'superadmin';

  useEffect(() => {
    // Sync state with URL params
    const start = searchParams.get('startDate');
    const end = searchParams.get('endDate');
    if (start !== dateFilter.startDate || end !== dateFilter.endDate) {
      setDateFilter({
        startDate: start || '',
        endDate: end || new Date().toISOString().split('T')[0]
      });
    }
  }, [searchParams]);

  useEffect(() => {
    if (hasAdminAccess) {
      fetchProfitAndLoss();
    }
  }, [dateFilter, hasAdminAccess]);

  const fetchProfitAndLoss = async () => {
    try {
      setIsLoading(true);
      setIsError(false);

      const response = await api.get('/dashboard/profit-loss', {
        params: {
          startDate: dateFilter.startDate,
          endDate: dateFilter.endDate
        }
      });

      setProfitAndLoss(response.data.data);

    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setIsError(true);
      setError(err.response?.data?.message || err.message || 'Failed to fetch dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  const openDateFilterModal = () => {
    setTempDateFilter(dateFilter);
    setShowDateFilterModal(true);
  };

  const handleApplyDateFilter = () => {
    setDateFilter(tempDateFilter);
    setSearchParams({
      startDate: tempDateFilter.startDate,
      endDate: tempDateFilter.endDate
    });
    setShowDateFilterModal(false);
  };

  const handleClearDateFilter = () => {
    const defaultEnd = new Date().toISOString().split('T')[0];
    const newFilter = { startDate: '', endDate: defaultEnd };
    setDateFilter(newFilter);
    setSearchParams({ endDate: defaultEnd });
    setTempDateFilter(newFilter);
    setShowDateFilterModal(false);
  };

  // Memoize flattened groups for Excel export
  const flattenedGroupsForExcel = useMemo(() => {
    if (!profitAndLoss) return { income: [], expenses: [] };

    const flattenGroups = (groups, level = 0) => {
      const result = [];
      groups.forEach(group => {
        const name = level === 0 ? group.name : `  ${group.name}`;
        const balance = Math.abs(group.balance || 0);
        result.push({ name, balance, level });

        // Include one level of children
        if (level === 0 && group.children && group.children.length > 0) {
          group.children.forEach(child => {
            const childBalance = Math.abs(child.balance || 0);
            result.push({
              name: `  ${child.name}`,
              balance: childBalance,
              level: 1
            });
          });
        }
      });
      return result;
    };

    return {
      income: flattenGroups(profitAndLoss.income.groups),
      expenses: flattenGroups(profitAndLoss.expenses.groups)
    };
  }, [profitAndLoss]);

  const downloadExcel = useCallback(() => {
    if (!profitAndLoss) return;

    const wb = XLSX.utils.book_new();

    // Prepare data
    const expensesData = [];
    const incomeData = [];

    expensesData.push(['EXPENSES', '']);
    expensesData.push(['', '']);
    flattenedGroupsForExcel.expenses.forEach(item => {
      expensesData.push([item.name, item.balance]);
    });
    expensesData.push(['', '']);
    expensesData.push(['Total Expenses', profitAndLoss.totals.totalExpenses]);

    incomeData.push(['INCOME', '']);
    incomeData.push(['', '']);
    flattenedGroupsForExcel.income.forEach(item => {
      incomeData.push([item.name, item.balance]);
    });
    incomeData.push(['', '']);
    incomeData.push(['Total Income', profitAndLoss.totals.totalIncome]);

    // Net Profit/Loss logic for display
    const netProfit = profitAndLoss.totals.netProfit;
    const isProfit = netProfit >= 0;

    if (isProfit) {
      expensesData.push(['Net Profit', netProfit]); // Add Net Profit to Expenses side to balance
    } else {
      incomeData.push(['Net Loss', Math.abs(netProfit)]); // Add Net Loss to Income side to balance
    }

    // Create worksheet
    const maxRows = Math.max(expensesData.length, incomeData.length);
    const wsData = [];

    // Header Row
    wsData.push(['Particulars', 'Amount', '', 'Particulars', 'Amount']);

    for (let i = 0; i < maxRows; i++) {
      const row = [];
      row.push(expensesData[i] ? expensesData[i][0] : '');
      row.push(expensesData[i] ? expensesData[i][1] : '');
      row.push(''); // Gap
      row.push(incomeData[i] ? incomeData[i][0] : '');
      row.push(incomeData[i] ? incomeData[i][1] : '');
      wsData.push(row);
    }

    // Totals Row
    const finalTotal = Math.max(profitAndLoss.totals.totalIncome, profitAndLoss.totals.totalExpenses);
    // If simplistic P&L, usually both sides balance out
    wsData.push(['Total', finalTotal, '', 'Total', finalTotal]);

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Set column widths
    ws['!cols'] = [
      { wch: 30 }, // Expenses name
      { wch: 15 }, // Expenses amount
      { wch: 5 },  // Gap
      { wch: 30 }, // Income name
      { wch: 15 }  // Income amount
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Profit & Loss');

    const dateStr = new Date(dateFilter.endDate).toLocaleDateString('en-GB').replace(/\//g, '');
    const filename = `Profit_Loss_${dateStr}.xlsx`;
    XLSX.writeFile(wb, filename);
  }, [profitAndLoss, dateFilter, flattenedGroupsForExcel]);

  if (!hasAdminAccess) {
    return (
      <div className="text-center py-8">
        <h2 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h2>
        <p className="text-gray-600 mb-4">
          You need admin privileges to access the Profit & Loss.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={fetchProfitAndLoss}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!profitAndLoss) {
    return null;
  }

  const formatDateDisplay = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const netProfit = profitAndLoss.totals.netProfit;
  const isProfit = netProfit >= 0;

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex justify-end gap-3">
        <button
          onClick={openDateFilterModal}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 shadow-sm"
        >
          <Calendar size={20} className="text-gray-500" />
          <span className="font-medium">
            {dateFilter.startDate ? `${formatDateDisplay(dateFilter.startDate)} - ` : 'Up to '}
            {formatDateDisplay(dateFilter.endDate)}
          </span>
        </button>
        <button
          onClick={downloadExcel}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
        >
          <Download size={20} />
          Export Excel
        </button>
      </div>

      {/* P&L Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Profit & Loss</h2>
          <p className="text-gray-600 mt-1">
            {dateFilter.startDate ? (
              <>Period: {formatDateDisplay(dateFilter.startDate)} to {formatDateDisplay(dateFilter.endDate)}</>
            ) : (
              <>As on {formatDateDisplay(dateFilter.endDate)}</>
            )}
          </p>
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Expenses Side (Left) */}
          <div className="border-r border-gray-200 pr-8">
            <div className="mb-4">
              {/* Expense Groups */}
              <div className="space-y-1 min-h-[200px]">
                {profitAndLoss.expenses.groups.map((group) => (
                  <GroupNode
                    key={group.id || group._id}
                    group={group}
                    level={0}
                  />
                ))}
              </div>

              {/* Net Profit (if Profit, add to Expenses side to balance) */}
              {isProfit && (
                <div className="mt-4 pt-2 border-t border-gray-200">
                  <div className="flex items-center justify-between py-1 px-2 bg-green-50 rounded">
                    <span className="text-sm font-bold text-green-700">Net Profit</span>
                    <span className="text-sm font-bold text-right w-32">
                      {netProfit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              )}

              <div className="mt-4 pt-3 border-t-2 border-gray-400">
                <div className="flex items-center justify-between">
                  <span className="text-base font-bold">Total</span>
                  <span className="text-base font-bold text-right w-32">
                    {/* If Profit, Total = Expenses + Net Profit = Income */}
                    {/* If Loss, Total = Expenses */}
                    {(profitAndLoss.totals.totalExpenses + (isProfit ? netProfit : 0)).toLocaleString('en-IN', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Income Side (Right) */}
          <div className="pl-8">
            <div className="mb-4">
              {/* Income Groups */}
              <div className="space-y-1 min-h-[200px]">
                {profitAndLoss.income.groups.map((group) => (
                  <GroupNode
                    key={group.id || group._id}
                    group={group}
                    level={0}
                  />
                ))}
              </div>

              {/* Net Loss (if Loss, add to Income side to balance) */}
              {!isProfit && (
                <div className="mt-4 pt-2 border-t border-gray-200">
                  <div className="flex items-center justify-between py-1 px-2 bg-red-50 rounded">
                    <span className="text-sm font-bold text-red-700">Net Loss</span>
                    <span className="text-sm font-bold text-right w-32">
                      {Math.abs(netProfit).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              )}

              <div className="mt-4 pt-3 border-t-2 border-gray-400">
                <div className="flex items-center justify-between">
                  <span className="text-base font-bold">Total</span>
                  <span className="text-base font-bold text-right w-32">
                    {/* If Profit, Total = Income */}
                    {/* If Loss, Total = Income + Net Loss = Expenses */}
                    {(profitAndLoss.totals.totalIncome + (!isProfit ? Math.abs(netProfit) : 0)).toLocaleString('en-IN', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Date Filter Modal */}
      {showDateFilterModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Calendar size={24} className="text-blue-600" />
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={tempDateFilter.endDate}
                  onChange={(e) => setTempDateFilter(prev => ({ ...prev, endDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={handleClearDateFilter}
                  className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors mr-auto"
                >
                  Reset
                </button>
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
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
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