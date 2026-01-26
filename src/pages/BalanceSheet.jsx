import { useState, useEffect, useMemo, memo, useCallback } from 'react';
import { Calendar, Download, Loader2, ChevronDown, ChevronRight, FileText, X } from 'lucide-react';
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
    // Pass date filter params
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || new Date().toISOString().split('T')[0];
    navigate(`/group-summary/${groupId}?startDate=${startDate}&endDate=${endDate}`);
  }, [navigate, groupId, searchParams]);

  return (
    <div className="select-none">
      {/* Parent Group */}
      <div
        className="flex items-center gap-2 py-1 hover:bg-gray-50 cursor-pointer rounded px-2 transition-colors"
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
        <span className="text-sm text-right w-32 flex-shrink-0 font-medium">
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

export default function BalanceSheet() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [balanceSheet, setBalanceSheet] = useState(null);

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

  const sortedLiabilityGroups = useMemo(() => {
    if (!balanceSheet?.liabilities?.groups) return [];
    const priorityMap = {
      'capital-account': 0,
      'loans-liability': 1,
      'current-liabilities': 2,
      // Fallback for names
      'Capital Account': 0,
      'Loans (Liability)': 1,
      'Current Liabilities': 2
    };
    return [...balanceSheet.liabilities.groups].sort((a, b) => {
      const priorityA = priorityMap[a.slug] ?? priorityMap[a.name] ?? 99;
      const priorityB = priorityMap[b.slug] ?? priorityMap[b.name] ?? 99;
      if (priorityA === priorityB) return 0;
      return priorityA < priorityB ? -1 : 1;
    });
  }, [balanceSheet]);
  const sortedAssetGroups = useMemo(() => {
    if (!balanceSheet?.assets?.groups) return [];
    const priorityMap = {
      'fixed-assets': 0,
      'investments': 1,
      'current-assets': 2,
      'suspense-a-c': 3,
      'branch-divisions': 4,
      // Fallback for names
      'Fixed Assets': 0,
      'Investments': 1,
      'Current Assets': 2,
      'Suspense A/c': 3,
      'Branch / Divisions': 4
    };
    return [...balanceSheet.assets.groups].sort((a, b) => {
      const priorityA = priorityMap[a.slug] ?? priorityMap[a.name] ?? 99;
      const priorityB = priorityMap[b.slug] ?? priorityMap[b.name] ?? 99;
      if (priorityA === priorityB) return 0;
      return priorityA < priorityB ? -1 : 1;
    });
  }, [balanceSheet]);

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
      fetchBalanceSheet();
    }
  }, [dateFilter, hasAdminAccess]);

  const fetchBalanceSheet = async () => {
    try {
      setIsLoading(true);
      setIsError(false);

      const { data } = await api.get('/balance-sheet', {
        params: {
          asOnDate: dateFilter.endDate, // Backward compatibility
          startDate: dateFilter.startDate,
          endDate: dateFilter.endDate
        }
      });

      // Filter to show only top-level groups (no parent) and process one level of nesting
      // Use useMemo pattern for filtering
      const filterTopLevelGroups = (groups) => {
        if (!groups || !Array.isArray(groups)) return [];
        return groups.filter(group => !group.parentGroup);
      };

      const filteredData = {
        ...data.data,
        assets: {
          ...data.data.assets,
          groups: filterTopLevelGroups(data.data.assets.groups || [])
        },
        liabilities: {
          ...data.data.liabilities,
          groups: filterTopLevelGroups(data.data.liabilities.groups || [])
        }
      };

      setBalanceSheet(filteredData);
    } catch (err) {
      console.error('Error fetching balance sheet:', err);
      setIsError(true);
      setError(err.response?.data?.message || err.message || 'Failed to fetch balance sheet');
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
    if (!balanceSheet) return { assets: [], liabilities: [] };

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
      assets: flattenGroups(sortedAssetGroups.length ? sortedAssetGroups : balanceSheet.assets.groups),
      liabilities: flattenGroups(sortedLiabilityGroups.length ? sortedLiabilityGroups : balanceSheet.liabilities.groups)
    };
  }, [balanceSheet, sortedAssetGroups, sortedLiabilityGroups]);

  const downloadExcel = useCallback(() => {
    if (!balanceSheet) return;

    const wb = XLSX.utils.book_new();

    // Prepare data using memoized flattened groups
    const assetsData = [];
    const liabilitiesData = [];

    assetsData.push(['ASSETS', '']);
    assetsData.push(['', '']);
    flattenedGroupsForExcel.assets.forEach(item => {
      assetsData.push([item.name, item.balance]);
    });
    assetsData.push(['', '']);
    assetsData.push(['Total Assets', balanceSheet.totals.totalAssets]);

    liabilitiesData.push(['LIABILITIES', '']);
    flattenedGroupsForExcel.liabilities.forEach(item => {
      liabilitiesData.push([item.name, item.balance]);
    });
    liabilitiesData.push(['', '']);
    liabilitiesData.push(['Total Liabilities', balanceSheet.totals.totalLiabilities]);

    // Create worksheet
    const maxRows = Math.max(assetsData.length, liabilitiesData.length);
    const wsData = [];

    for (let i = 0; i < maxRows; i++) {
      const row = [];
      if (i < assetsData.length) {
        row.push(assetsData[i][0] || '', assetsData[i][1] || '');
      } else {
        row.push('', '');
      }
      row.push('', ''); // Gap
      if (i < liabilitiesData.length) {
        row.push(liabilitiesData[i][0] || '', liabilitiesData[i][1] || '');
      } else {
        row.push('', '');
      }
      wsData.push(row);
    }

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Set column widths
    ws['!cols'] = [
      { wch: 30 }, // Assets name
      { wch: 15 }, // Assets amount
      { wch: 5 },  // Gap
      { wch: 30 }, // Liabilities name
      { wch: 15 }  // Liabilities amount
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Balance Sheet');

    const dateStr = new Date(dateFilter.endDate).toLocaleDateString('en-GB').replace(/\//g, '');
    const filename = `Balance_Sheet_${dateStr}.xlsx`;
    XLSX.writeFile(wb, filename);
  }, [balanceSheet, dateFilter, flattenedGroupsForExcel]);

  if (!hasAdminAccess) {
    return (
      <div className="text-center py-8">
        <h2 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h2>
        <p className="text-gray-600 mb-4">
          You need admin privileges to access the Balance Sheet.
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
          onClick={fetchBalanceSheet}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!balanceSheet) {
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Balance Sheet</h1>
          <p className="text-gray-600 mt-1">Financial position as on selected date</p>
        </div>
        <div className="flex gap-3 mt-4 sm:mt-0">
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
      </div>

      {/* Balance Sheet */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">BALANCE SHEET</h2>
          <p className="text-gray-600 mt-1">
            {dateFilter.startDate ? (
              <>Period: {formatDateDisplay(dateFilter.startDate)} to {formatDateDisplay(dateFilter.endDate)}</>
            ) : (
              <>As on {formatDateDisplay(dateFilter.endDate)}</>
            )}
          </p>
        </div>

        {/* Balance Sheet Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Liabilities & Capital Side */}
          <div className="border-r border-gray-200 pr-8 flex flex-col justify-between">
            <div className="flex-1">
              {/* Liabilities */}
              <div className="mb-4">
                <h4 className="text-md font-semibold text-purple-600 mb-2">LIABILITIES</h4>
                <div className="space-y-1">
                  {sortedLiabilityGroups.map((group) => (
                    <GroupNode
                      key={group.id || group._id}
                      group={group}
                      level={0}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t-2 border-gray-400">
              <div className="flex items-center justify-between">
                <span className="text-base font-bold">Total Liabilities</span>
                <span className="text-base font-bold text-right w-32">
                  {balanceSheet.totals.totalLiabilities.toLocaleString('en-IN', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* Assets Side */}
          <div className="pl-8 flex flex-col justify-between">
            <div className="flex-1">
              <div className="mb-4">
                <h3 className="text-lg font-bold text-blue-700 mb-3">ASSETS</h3>
                <div className="space-y-1">
                  {(sortedAssetGroups.length ? sortedAssetGroups : balanceSheet.assets.groups).map((group) => (
                    <GroupNode
                      key={group.id || group._id}
                      group={group}
                      level={0}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t-2 border-gray-400">
              <div className="flex items-center justify-between">
                <span className="text-base font-bold">Total Assets</span>
                <span className="text-base font-bold text-right w-32">
                  {balanceSheet.totals.totalAssets.toLocaleString('en-IN', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Capital Calculation */}
        <div className="mt-8 flex flex-col items-center justify-center p-6 bg-gray-50 border-t border-gray-200 rounded-b-xl">
          <h3 className="text-xl font-bold text-gray-800 tracking-wide">CAPITAL</h3>
          <div className="text-3xl font-extrabold text-green-700 mt-2">
            ₹ {(balanceSheet.totals.totalAssets - balanceSheet.totals.totalLiabilities).toLocaleString('en-IN', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })}
          </div>
          <p className="text-sm text-gray-500 mt-2 font-medium">( Total Assets - Total Liabilities )</p>
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

