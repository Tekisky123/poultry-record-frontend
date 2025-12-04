import { useState, useEffect, useMemo, memo, useCallback } from 'react';
import { Calendar, Download, Loader2, ChevronDown, ChevronRight, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/axios';
import { useAuth } from '../contexts/AuthContext';
import * as XLSX from 'xlsx';

// Memoized balance cache to avoid recalculating
const balanceCache = new Map();

// Aggregate balances from nested children into parent (optimized with caching)
const aggregateChildrenBalances = (group) => {
  const cacheKey = `${group.id || group._id}_${group.balance}`;
  
  if (balanceCache.has(cacheKey)) {
    return balanceCache.get(cacheKey);
  }
  
  let totalBalance = Math.abs(group.balance || 0);
  
  // If this group has children, aggregate their balances
  if (group.children && group.children.length > 0) {
    group.children.forEach(child => {
      totalBalance += aggregateChildrenBalances(child);
    });
  }
  
  balanceCache.set(cacheKey, totalBalance);
  return totalBalance;
};

// Clear cache when balance sheet changes
const clearBalanceCache = () => {
  balanceCache.clear();
};

// Render group node with one level of nesting (memoized for performance)
const GroupNode = memo(({ group, level = 0 }) => {
  const navigate = useNavigate();
  const balance = Math.abs(group.balance || 0);
  const groupId = group.id || group._id;
  const hasChildren = group.children && group.children.length > 0;
  
  // Calculate indentation for hierarchy
  const indentWidth = 24;
  const leftPadding = level * indentWidth;

  const handleGroupClick = useCallback((e) => {
    e.stopPropagation();
    navigate(`/group-summary/${groupId}`);
  }, [navigate, groupId]);

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
        <span className={`flex-1 ${
          level === 0 ? 'text-sm font-semibold text-gray-900' : 
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
          {group.children.map((child) => {
            // Aggregate deeper children's balances into this child
            const aggregatedBalance = aggregateChildrenBalances(child);
            return (
              <GroupNode
                key={child.id || child._id}
                group={{ ...child, balance: aggregatedBalance }}
                level={1}
              />
            );
          })}
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
  const [balanceSheet, setBalanceSheet] = useState(null);
  const [asOnDate, setAsOnDate] = useState(new Date().toISOString().split('T')[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState('');

  const hasAdminAccess = user?.role === 'admin' || user?.role === 'superadmin';
  const sortedLiabilityGroups = useMemo(() => {
    if (!balanceSheet?.liabilities?.groups) return [];
    const priorityMap = {
      'Capital Account': 0,
      'Loans (Liability)': 1,
      'Current Liabilities': 2
    };
    return [...balanceSheet.liabilities.groups].sort((a, b) => {
      const priorityA = priorityMap[a.name] ?? 99;
      const priorityB = priorityMap[b.name] ?? 99;
      if (priorityA === priorityB) return 0;
      return priorityA < priorityB ? -1 : 1;
    });
  }, [balanceSheet]);
  const sortedAssetGroups = useMemo(() => {
    if (!balanceSheet?.assets?.groups) return [];
    const priorityMap = {
      'Fixed Assets': 0,
      'Current Assets': 1,
      'Suspense A/c': 2
    };
    return [...balanceSheet.assets.groups].sort((a, b) => {
      const priorityA = priorityMap[a.name] ?? 99;
      const priorityB = priorityMap[b.name] ?? 99;
      if (priorityA === priorityB) return 0;
      return priorityA < priorityB ? -1 : 1;
    });
  }, [balanceSheet]);

  useEffect(() => {
    if (hasAdminAccess) {
      fetchBalanceSheet();
    }
  }, [asOnDate, hasAdminAccess]);

  const fetchBalanceSheet = async () => {
    try {
      setIsLoading(true);
      setIsError(false);
      
      // Clear cache before fetching new data
      clearBalanceCache();
      
      const { data } = await api.get('/balance-sheet', {
        params: { asOnDate }
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


  // Memoize flattened groups for Excel export
  const flattenedGroupsForExcel = useMemo(() => {
    if (!balanceSheet) return { assets: [], liabilities: [] };
    
    const flattenGroups = (groups, level = 0) => {
      const result = [];
      groups.forEach(group => {
        const name = level === 0 ? group.name : `  ${group.name}`;
        const balance = aggregateChildrenBalances(group);
        result.push({ name, balance, level });
        
        // Include one level of children
        if (level === 0 && group.children && group.children.length > 0) {
          group.children.forEach(child => {
            const childBalance = aggregateChildrenBalances(child);
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

    liabilitiesData.push(['LIABILITIES & CAPITAL', '']);
    liabilitiesData.push(['', '']);
    liabilitiesData.push(['LIABILITIES', '']);
    flattenedGroupsForExcel.liabilities.forEach(item => {
      liabilitiesData.push([item.name, item.balance]);
    });
    liabilitiesData.push(['', '']);
    liabilitiesData.push(['Total Liabilities', balanceSheet.totals.totalLiabilities]);
    liabilitiesData.push(['', '']);
    liabilitiesData.push(['CAPITAL', '']);
    liabilitiesData.push(['Capital/Equity', balanceSheet.capital.amount]);
    liabilitiesData.push(['', '']);
    liabilitiesData.push(['Total Liabilities & Capital', balanceSheet.totals.totalLiabilitiesAndCapital]);

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

    const dateStr = new Date(asOnDate).toLocaleDateString('en-GB').replace(/\//g, '');
    const filename = `Balance_Sheet_${dateStr}.xlsx`;
    XLSX.writeFile(wb, filename);
  }, [balanceSheet, asOnDate, flattenedGroupsForExcel]);

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Balance Sheet</h1>
          <p className="text-gray-600 mt-1">Financial position as on selected date</p>
        </div>
        <div className="flex gap-3 mt-4 sm:mt-0">
          <div className="flex items-center gap-2">
            <Calendar className="text-gray-400" size={20} />
            <input
              type="date"
              value={asOnDate}
              onChange={(e) => setAsOnDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
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
            As on {new Date(asOnDate).toLocaleDateString('en-GB', { 
              day: '2-digit', 
              month: 'long', 
              year: 'numeric' 
            })}
          </p>
        </div>

        {/* Balance Sheet Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Liabilities & Capital Side */}
          <div className="border-r border-gray-200 pr-8">
            <div className="mb-4">
              <h3 className="text-lg font-bold text-purple-700 mb-3">LIABILITIES & CAPITAL</h3>
              
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
                <div className="mt-3 pt-2 border-t border-gray-300">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">Total Liabilities</span>
                    <span className="text-sm font-semibold text-right w-32">
                      {balanceSheet.totals.totalLiabilities.toLocaleString('en-IN', { 
                        minimumFractionDigits: 2, 
                        maximumFractionDigits: 2 
                      })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Capital */}
              <div className="mb-4">
                <h4 className="text-md font-semibold text-green-600 mb-2">CAPITAL</h4>
                <div className="space-y-1">
                  <div className="flex items-center justify-between py-1">
                    <span className="text-sm font-medium ml-5">Capital/Equity</span>
                    <span className="text-sm font-semibold text-right w-32">
                      {balanceSheet.capital.amount.toLocaleString('en-IN', { 
                        minimumFractionDigits: 2, 
                        maximumFractionDigits: 2 
                      })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Total */}
              <div className="mt-4 pt-3 border-t-2 border-gray-400">
                <div className="flex items-center justify-between">
                  <span className="text-base font-bold">Total Liabilities & Capital</span>
                  <span className="text-base font-bold text-right w-32">
                    {balanceSheet.totals.totalLiabilitiesAndCapital.toLocaleString('en-IN', { 
                      minimumFractionDigits: 2, 
                      maximumFractionDigits: 2 
                    })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Assets Side */}
          <div className="pl-8">
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
        </div>

        {/* Balance Check */}
        {Math.abs(balanceSheet.totals.balance) > 0.01 && (
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800 text-sm">
              <strong>Note:</strong> Balance difference: ₹{balanceSheet.totals.balance.toFixed(2)}. 
              Assets and Liabilities & Capital should match.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

