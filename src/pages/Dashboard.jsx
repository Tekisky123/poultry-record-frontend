import { useState, useEffect, useMemo, memo, useCallback } from 'react';
import { Calendar, Download, Loader2, X, ChevronDown } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../lib/axios';
import { useAuth } from '../contexts/AuthContext';
import * as XLSX from 'xlsx';

// Render group node with infinite level of nesting (memoized for performance)
const GroupNode = memo(({ group, level = 0, parentName = '' }) => {
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

    // Redirect LIVE POULTRY BIRDS group to its special stock pages
    const lowerName = group.name ? group.name.toLowerCase() : "";
    const lowerParentName = parentName ? parentName.toLowerCase() : "";

    if (lowerName.includes("live poultry birds") && lowerName.includes("purchase")) {
      navigate(`/live-poultry-purchase/monthly-summary?startDate=${startDate}&endDate=${endDate}&groupId=${groupId}`);
      return;
    } else if (lowerName.includes("poultry feed purchase")) {
      navigate(`/feed-stock-purchase/monthly-summary?startDate=${startDate}&endDate=${endDate}&groupId=${groupId}`);
      return;
    } else if (lowerName.includes("feed consumption")) {
      navigate(`/feed-stock-consumption/monthly-summary?startDate=${startDate}&endDate=${endDate}&groupId=${groupId}`);
      return;
    } else if (lowerName.includes("live poultry birds") && lowerName.includes("sales")) {
      navigate(`/live-poultry-sales/monthly-summary?startDate=${startDate}&endDate=${endDate}&groupId=${groupId}`);
      return;
    } else if (lowerName.includes("live poultry birds") && lowerParentName.includes("closing")) {
      navigate(`/live-poultry-closing-stock/monthly-summary?startDate=${startDate}&endDate=${endDate}&groupId=${groupId}`);
      return;
    } else if (lowerName.includes("live poultry birds")) {
      navigate(`/live-poultry-stock/monthly-summary?startDate=${startDate}&endDate=${endDate}&groupId=${groupId}`);
      return;
    } else if (lowerName.includes("trip expenses")) {
      navigate(`/trip-expenses/monthly-summary?startDate=${startDate}&endDate=${endDate}&groupId=${groupId}`);
      return;
    } else if (lowerName.includes("diesel expenses") || lowerName.includes("diesel expense")) {
      navigate(`/diesel-expenses/monthly-summary?startDate=${startDate}&endDate=${endDate}&groupId=${groupId}`);
      return;
    } else if (lowerName.includes("birds mortality")) {
      navigate(`/birds-mortality/monthly-summary?startDate=${startDate}&endDate=${endDate}&groupId=${groupId}`);
      return;
    } else if (lowerName.includes("birds weight loss")) {
      navigate(`/birds-weight-loss/monthly-summary?startDate=${startDate}&endDate=${endDate}&groupId=${groupId}`);
      return;
    } else if (lowerName.includes("birds opening stock")) {
      navigate(`/birds-opening-stock/monthly-summary?startDate=${startDate}&endDate=${endDate}&groupId=${groupId}`);
      return;
    } else if (lowerName.includes("feed opening stock")) {
      navigate(`/feed-opening-stock/monthly-summary?startDate=${startDate}&endDate=${endDate}&groupId=${groupId}`);
      return;
    } else if (lowerName.includes("birds stock")) {
      navigate(`/birds-closing-stock/monthly-summary?startDate=${startDate}&endDate=${endDate}&groupId=${groupId}`);
      return;
    } else if (lowerName.includes("feed stock")) {
      navigate(`/feed-closing-stock/monthly-summary?startDate=${startDate}&endDate=${endDate}&groupId=${groupId}`);
      return;
    }

    navigate(`/group-summary/${groupId}?startDate=${startDate}&endDate=${endDate}`);
  }, [navigate, groupId, searchParams, level, group.name, parentName]);

  return (
    <div className="select-none">
      {/* Parent Group */}
      <div
        className={`flex items-stretch rounded px-2 transition-colors ${level > 0 ? 'hover:bg-gray-50 cursor-pointer' : ''}`}
        onClick={handleGroupClick}
        style={{
          paddingLeft: `${leftPadding}px`
        }}
      >
        {/* Group name */}
        <span className={`flex items-center flex-1 py-1 mr-2 ${level === 0 ? 'text-sm font-semibold text-gray-900' :
          'text-sm text-gray-700'
          }`}>
          {group.name}
        </span>

        {/* Inner Balance (Child) */}
        <span className={`flex items-center justify-end text-sm w-32 flex-shrink-0 font-medium border-gray-300 pr-2 py-1 ${level > 0 ? 'text-gray-600' : ''}`}>
          {level > 0 ? balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}
        </span>

        {/* Outer Balance (Parent) */}
        <span className={`flex items-center justify-end text-sm w-32 flex-shrink-0 font-medium border-l border-gray-300 pl-2 py-1 ${level === 0 ? 'font-bold text-gray-900' : ''}`}>
          {level === 0 ? balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}
        </span>
      </div>

      {/* Direct Children (render recursively) */}
      {hasChildren && (
        <div className="ml-1">
          {group.children.map((child) => (
            <GroupNode
              key={child.id || child._id}
              group={child}
              level={level + 1}
              parentName={group.name}
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
    prevProps.parentName === nextProps.parentName &&
    JSON.stringify(prevProps.group.children) === JSON.stringify(nextProps.group.children)
  );
});

export default function ProfitAndLoss() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [profitAndLoss, setProfitAndLoss] = useState(null);

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

  // FY dropdown options (2023 to current+1)
  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const options = [];
    for (let y = 2023; y <= currentYear + 1; y++) {
      options.push(y);
    }
    return options;
  }, []);

  // Determine initial FY from URL params or default to current FY
  const getInitialYear = () => {
    const paramStart = searchParams.get('startDate');
    if (paramStart) {
      const d = new Date(paramStart);
      if (d.getMonth() === 3) return d.getFullYear();
    }
    return getCurrentFinancialYear();
  };

  const [selectedFY, setSelectedFY] = useState(getInitialYear);

  const [dateFilter, setDateFilter] = useState(() => {
    const paramStart = searchParams.get('startDate');
    const paramEnd = searchParams.get('endDate');
    if (paramStart && paramEnd) {
      return { startDate: paramStart, endDate: paramEnd };
    }
    // Default to current FY dates
    return getFYDates(getCurrentFinancialYear());
  });

  const handleFYChange = (fyYear) => {
    setSelectedFY(fyYear);
    const { startDate, endDate } = getFYDates(fyYear);
    setDateFilter({ startDate, endDate });
    setSearchParams({ startDate, endDate });
  };

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
    // On initial load, ensure URL has the date params
    const start = searchParams.get('startDate');
    const end = searchParams.get('endDate');
    if (!start || !end) {
      // Push default FY dates to URL without triggering re-render loop
      setSearchParams({ startDate: dateFilter.startDate, endDate: dateFilter.endDate }, { replace: true });
    }
  }, []);

  useEffect(() => {
    // Sync state with URL params when they change
    const start = searchParams.get('startDate');
    const end = searchParams.get('endDate');
    if (start && end && (start !== dateFilter.startDate || end !== dateFilter.endDate)) {
      setDateFilter({ startDate: start, endDate: end });
      // Sync FY dropdown
      const d = new Date(start);
      if (d.getMonth() === 3) setSelectedFY(d.getFullYear());
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

  // ── Sort order (includes both direct and indirect names) ──
  const expensesOrder = ['Opening Stock', 'Purchase Accounts', 'Direct Expenses', 'Indirect Expenses'];
  const incomeOrder  = ['Sales Accounts', 'Closing Stock', 'Direct Income', 'Direct Incomes', 'Indirect Income', 'Indirect Incomes'];

  const sortGroups = (groups, orderArray) =>
    [...groups].sort((a, b) => {
      const ia = orderArray.indexOf(a.name), ib = orderArray.indexOf(b.name);
      if (ia !== -1 && ib !== -1) return ia - ib;
      if (ia !== -1) return -1;
      if (ib !== -1) return 1;
      return a.name.localeCompare(b.name);
    });

  const sortedExpenses = sortGroups(profitAndLoss.expenses.groups, expensesOrder);
  const sortedIncome  = sortGroups(profitAndLoss.income.groups,  incomeOrder);

  // ── Split: direct (gross section) vs indirect (net section) ──
  const directExpenseGroups   = sortedExpenses.filter(g => !g.name.toLowerCase().includes('indirect'));
  const indirectExpenseGroups = sortedExpenses.filter(g =>  g.name.toLowerCase().includes('indirect'));
  const directIncomeGroups    = sortedIncome.filter(g =>  !g.name.toLowerCase().includes('indirect'));
  const indirectIncomeGroups  = sortedIncome.filter(g =>   g.name.toLowerCase().includes('indirect'));

  // ── Gross P&L ──
  const topLeftTotal  = directExpenseGroups.reduce((s, g)  => s + Math.abs(g.balance || 0), 0);
  const topRightTotal = directIncomeGroups.reduce((s, g)   => s + Math.abs(g.balance || 0), 0);
  const grossDiff   = topRightTotal - topLeftTotal;
  const grossProfit = grossDiff > 0 ? grossDiff : 0;
  const grossLoss   = grossDiff < 0 ? Math.abs(grossDiff) : 0;

  // ── Net P&L ──
  const bottomLeftTotal  = indirectExpenseGroups.reduce((s, g) => s + Math.abs(g.balance || 0), 0);
  const bottomRightTotal = indirectIncomeGroups.reduce((s, g)  => s + Math.abs(g.balance || 0), 0);
  const netDiff   = (bottomRightTotal - bottomLeftTotal) + grossProfit - grossLoss;
  const netProfit = netDiff > 0 ? netDiff : 0;
  const netLoss   = netDiff < 0 ? Math.abs(netDiff) : 0;

  const fmt = (n) => (n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex justify-end gap-3">
        {/* Financial Year Dropdown */}
        <div className="relative">
          <select
            value={selectedFY}
            onChange={(e) => handleFYChange(Number(e.target.value))}
            className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-10 font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition-colors cursor-pointer focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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

        {/* ══ TOP SECTION — Gross P&L ══ */}
        <div className="border border-gray-200 rounded-t-lg overflow-hidden">
          {/* Groups area */}
          <div className="grid grid-cols-2 divide-x divide-gray-200">
            {/* Left: Direct Expenses */}
            <div className="p-4">
              <div className="space-y-1 min-h-[160px]">
                {directExpenseGroups.map((group) => (
                  <GroupNode key={group.id || group._id} group={group} level={0} />
                ))}
              </div>
            </div>
            {/* Right: Direct Income */}
            <div className="p-4">
              <div className="space-y-1 min-h-[160px]">
                {directIncomeGroups.map((group) => (
                  <GroupNode key={group.id || group._id} group={group} level={0} />
                ))}
              </div>
            </div>
          </div>

          {/* Total row — both sides side by side */}
          <div className="grid grid-cols-2 divide-x divide-gray-200 border-t-2 border-gray-400">
            <div className="flex items-center justify-between px-4 py-2">
              <span className="text-sm font-bold">Total</span>
              <span className="text-sm font-bold">{fmt(topLeftTotal)}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-2">
              <span className="text-sm font-bold">Total</span>
              <span className="text-sm font-bold">{fmt(topRightTotal)}</span>
            </div>
          </div>

          {/* Gross Profit | Gross Loss row */}
          <div className="grid grid-cols-2 divide-x divide-gray-200 border-t border-gray-300 bg-gray-50">
            <div className="flex items-center justify-between px-4 py-2">
              <span className="text-sm font-bold italic text-green-700">Gross Profit</span>
              <span className="text-sm font-bold text-green-700">{fmt(grossProfit)}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-2">
              <span className="text-sm font-bold italic text-red-600">Gross loss</span>
              <span className="text-sm font-bold text-red-600">{fmt(grossLoss)}</span>
            </div>
          </div>
        </div>

        {/* ══ BOTTOM SECTION — Net P&L ══ */}
        <div className="border border-t-0 border-gray-200 rounded-b-lg overflow-hidden">
          {/* Groups area */}
          <div className="grid grid-cols-2 divide-x divide-gray-200">
            {/* Left: Indirect Expenses */}
            <div className="p-4">
              <div className="space-y-1 min-h-[100px]">
                {indirectExpenseGroups.length > 0
                  ? indirectExpenseGroups.map((group) => (
                      <GroupNode key={group.id || group._id} group={group} level={0} />
                    ))
                  : <p className="text-sm text-gray-400 italic py-2">No indirect expenses</p>
                }
              </div>
            </div>
            {/* Right: Indirect Income */}
            <div className="p-4">
              <div className="space-y-1 min-h-[100px]">
                {indirectIncomeGroups.length > 0
                  ? indirectIncomeGroups.map((group) => (
                      <GroupNode key={group.id || group._id} group={group} level={0} />
                    ))
                  : <p className="text-sm text-gray-400 italic py-2">No indirect income</p>
                }
              </div>
            </div>
          </div>

          {/* Total row — both sides side by side */}
          <div className="grid grid-cols-2 divide-x divide-gray-200 border-t-2 border-gray-400">
            <div className="flex items-center justify-between px-4 py-2">
              <span className="text-sm font-bold">Total</span>
              <span className="text-sm font-bold">{fmt(bottomLeftTotal)}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-2">
              <span className="text-sm font-bold">Total</span>
              <span className="text-sm font-bold">{fmt(bottomRightTotal)}</span>
            </div>
          </div>

          {/* Net Profit | Net Loss row */}
          <div className="grid grid-cols-2 divide-x divide-gray-200 border-t border-gray-300 bg-gray-50">
            <div className="flex items-center justify-between px-4 py-2">
              <span className="text-sm font-bold italic text-green-700">Net Profit</span>
              <span className="text-sm font-bold text-green-700">{fmt(netProfit)}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-2">
              <span className="text-sm font-bold italic text-red-600">Net Loss</span>
              <span className="text-sm font-bold text-red-600">{fmt(netLoss)}</span>
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
              <button onClick={() => setShowDateFilterModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={24} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input type="date" value={tempDateFilter.startDate}
                  onChange={(e) => setTempDateFilter(prev => ({ ...prev, startDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input type="date" value={tempDateFilter.endDate}
                  onChange={(e) => setTempDateFilter(prev => ({ ...prev, endDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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