import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Calendar, ArrowLeft, Loader2, X, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import api from '../lib/axios';
import { useAuth } from '../contexts/AuthContext';

export default function GroupSummary() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const [groupSummary, setGroupSummary] = useState(null);
  const [showPercentage, setShowPercentage] = useState(false);

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
    // Sync state with URL params if they change externally (e.g. navigation back)
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
    if (hasAdminAccess && id) {
      fetchGroupSummary();
    }
  }, [id, dateFilter, hasAdminAccess]);

  const fetchGroupSummary = async () => {
    try {
      setIsLoading(true);
      setIsError(false);
      const { data } = await api.get(`/group/${id}/summary`, {
        params: {
          startDate: dateFilter.startDate,
          endDate: dateFilter.endDate,
          asOnDate: dateFilter.endDate // For backward compatibility/fallback
        }
      });
      setGroupSummary(data.data);
    } catch (err) {
      console.error('Error fetching group summary:', err);
      setIsError(true);
      setError(err.response?.data?.message || err.message || 'Failed to fetch group summary');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportToExcel = () => {
    if (!groupSummary) return;

    const isExpandedView = (groupSummary.entries.some(e => e.birds > 0 || e.weight > 0) || groupSummary.group.name.toLowerCase().includes('debtor'));

    const exportData = groupSummary.entries.map(entry => {
      const row = {
        Particular: entry.name,
      };

      if (isExpandedView) {
        row['Total Birds'] = entry.birds || 0;
        row['Total Weight'] = entry.weight ? parseFloat(entry.weight.toFixed(2)) : 0;
        row['Debit (Sales)'] = entry.transactionDebit || entry.debit || 0;
        row['Credit (Receipts)'] = entry.transactionCredit || entry.credit || 0;
        row['Discount & Other'] = entry.discountAndOther || 0; // New Column

        const closingBal = entry.closingBalance !== undefined ? entry.closingBalance : (entry.debit - entry.credit);
        row['Closing Balance'] = Math.abs(closingBal).toFixed(2) + (closingBal >= 0 ? ' Dr' : ' Cr');
      } else {
        // Normal View: Show Transaction Totals + Closing Balance
        row['Debit'] = entry.transactionDebit || 0;
        row['Credit'] = entry.transactionCredit || 0;
        row['Discount & Other'] = entry.discountAndOther || 0; // New Column
        const closingBal = entry.closingBalance !== undefined ? entry.closingBalance : (entry.debit - entry.credit);
        row['Closing Balance'] = Math.abs(closingBal).toFixed(2) + (closingBal >= 0 ? ' Dr' : ' Cr');
      }
      return row;
    });

    // Add Totals Row
    const totalRow = {
      Particular: 'Grand Total',
    };

    if (isExpandedView) {
      totalRow['Total Birds'] = groupSummary.totals.birds || 0;
      totalRow['Total Weight'] = groupSummary.totals.weight ? parseFloat(groupSummary.totals.weight.toFixed(2)) : 0;

      const totalDebit = groupSummary.entries.reduce((sum, e) => sum + (e.transactionDebit || e.debit || 0), 0);
      const totalCredit = groupSummary.entries.reduce((sum, e) => sum + (e.transactionCredit || e.credit || 0), 0);
      const totalDiscountAndOther = groupSummary.entries.reduce((sum, e) => sum + (e.discountAndOther || 0), 0);

      totalRow['Debit (Sales)'] = totalDebit;
      totalRow['Credit (Receipts)'] = totalCredit;
      totalRow['Discount & Other'] = totalDiscountAndOther;

      const netBalance = groupSummary.entries.reduce((sum, e) => sum + (e.closingBalance || (e.debit - e.credit) || 0), 0);
      totalRow['Closing Balance'] = Math.abs(netBalance).toFixed(2) + (netBalance >= 0 ? ' Dr' : ' Cr');
    } else {
      // Normal View Totals
      const totalDebit = groupSummary.entries.reduce((sum, e) => sum + (e.transactionDebit || e.debit || 0), 0);
      const totalCredit = groupSummary.entries.reduce((sum, e) => sum + (e.transactionCredit || e.credit || 0), 0);
      const totalDiscountAndOther = groupSummary.entries.reduce((sum, e) => sum + (e.discountAndOther || 0), 0);

      const netBalance = groupSummary.entries.reduce((sum, e) => sum + (e.closingBalance || (e.debit - e.credit) || 0), 0);

      totalRow['Debit'] = totalDebit;
      totalRow['Credit'] = totalCredit;
      totalRow['Discount & Other'] = totalDiscountAndOther;
      totalRow['Closing Balance'] = Math.abs(netBalance).toFixed(2) + (netBalance >= 0 ? ' Dr' : ' Cr');
    }

    exportData.push(totalRow);

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Group Summary");
    XLSX.writeFile(wb, `${groupSummary.group.name.replace(/[^a-zA-Z0-9]/g, '_')}_Summary.xlsx`);
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

  if (!hasAdminAccess) {
    return (
      <div className="text-center py-8">
        <h2 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h2>
        <p className="text-gray-600 mb-4">
          You need admin privileges to access the Group Summary.
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
          onClick={fetchGroupSummary}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!groupSummary) {
    return null;
  }

  const isExpandedView = (groupSummary.entries.some(e => e.birds > 0 || e.weight > 0) || groupSummary.group.name.toLowerCase().includes('debtor'));

  const totals = {
    birds: groupSummary.totals.birds || 0,
    weight: groupSummary.totals.weight || 0,
    debitExpanded: groupSummary.entries.reduce((sum, e) => sum + (e.transactionDebit || e.debit || 0), 0),
    creditExpanded: groupSummary.entries.reduce((sum, e) => sum + (e.transactionCredit || e.credit || 0), 0),
    discountAndOther: groupSummary.entries.reduce((sum, e) => sum + (e.discountAndOther || 0), 0),
    netBalance: groupSummary.entries.reduce((sum, e) => sum + (e.closingBalance || (e.debit - e.credit) || 0), 0),
    debitNormal: groupSummary.totals.debit || 0,
    creditNormal: groupSummary.totals.credit || 0
  };

  const renderCellWithPercentage = (val, total, type = 'number', isClosing = false) => {
    // Treat 0 as '-' unless it's a closing balance or specifically 0 is valid (e.g. net balance 0 is rare but possible)
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
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <p className="text-gray-600 mt-1">Group Summary</p>
            <h1 className="text-3xl font-bold text-gray-900">{groupSummary.group.name}</h1>
            {groupSummary.parentGroup && (
              <div className="text-sm text-gray-500 mb-1">
                <button
                  onClick={() => navigate(`/group-summary/${groupSummary.parentGroup.id}`)}
                  className="hover:text-blue-600 hover:underline"
                >
                  {groupSummary.parentGroup.name}
                </button>
                <span className="mx-2">/</span>
                <span className="text-gray-700">{groupSummary.group.name}</span>
              </div>
            )}
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
        </div>
      </div>

      {/* Group Summary Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        {/* Table Header */}
        <div className="mb-4">
          <h2 className="text-xl font-bold text-gray-900 mb-2">{groupSummary.group.name}</h2>
          <p className="text-gray-600 text-sm">
            {dateFilter.startDate ? (
              <>Period: {formatDateDisplay(dateFilter.startDate)} to {formatDateDisplay(dateFilter.endDate)}</>
            ) : (
              <>As on {formatDateDisplay(dateFilter.endDate)}</>
            )}
          </p>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-300">
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Particular</th>
                {isExpandedView && (
                  <>
                    <th className="text-right py-3 px-4 font-semibold text-gray-900">Total Birds</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-900">Total Weight</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-900">Debit (Sales)</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-900">Credit (Receipts)</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-900">Discount & Other</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-900">Closing Balance</th>
                  </>
                )}
                {!isExpandedView && (
                  <>
                    <th className="text-right py-3 px-4 font-semibold text-gray-900">Debit</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-900">Credit</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-900">Discount & Other</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-900">Closing Balance</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>

              {groupSummary.entries.length > 0 ? (
                <>
                  {groupSummary.entries.map((entry, index) => {
                    return (
                      <tr
                        key={entry.id}
                        className={`border-b border-gray-200 hover:bg-gray-50 ${entry.type === 'subgroup' || entry.type === 'customer' || entry.type === 'vendor' || entry.type === 'ledger' ? 'cursor-pointer' : ''
                          }`}
                        onClick={() => {
                          const query = `?startDate=${dateFilter.startDate}&endDate=${dateFilter.endDate}`;
                          if (entry.type === 'subgroup') {
                            navigate(`/group-summary/${entry.id}${query}`);
                          } else if (entry.type === 'customer') {
                            navigate(`/monthly-summary/customer/${entry.id}${query}`);
                          } else if (entry.type === 'vendor') {
                            let qs = query;
                            if (groupSummary.group.name.trim().toLowerCase() === 'purchase account' || groupSummary.group.name.trim().toLowerCase() === 'purchase accounts') {
                              qs += '&filterType=PURCHASE';
                            }
                            navigate(`/monthly-summary/vendor/${entry.id}${qs}`);
                          } else if (entry.type === 'ledger') {
                            navigate(`/monthly-summary/ledger/${entry.id}${query}`);
                          }
                        }}
                      >
                        <td className="py-3 px-4 text-gray-700">
                          {entry.type === 'subgroup' ? (
                            <span className="text-blue-600 hover:text-blue-800 hover:underline font-medium">
                              {entry.name}
                              <span className="ml-2 text-xs text-gray-500">(Sub-group)</span>
                            </span>
                          ) : entry.type === 'customer' ? (
                            <span className="text-blue-600 hover:text-blue-800 hover:underline font-medium">
                              {entry.name}
                              <span className="ml-2 text-xs text-gray-500">(Customer)</span>
                            </span>
                          ) : entry.type === 'vendor' ? (
                            <span className="text-blue-600 hover:text-blue-800 hover:underline font-medium">
                              {entry.name}
                              <span className="ml-2 text-xs text-gray-500">(Vendor)</span>
                            </span>
                          ) : entry.type === 'ledger' ? (
                            <span className="text-blue-600 hover:text-blue-800 hover:underline font-medium">
                              {entry.name}
                            </span>
                          ) : (
                            entry.name
                          )}
                        </td>

                        {isExpandedView ? (
                          <>
                            <td className="py-3 px-4 text-right text-gray-700">
                              {renderCellWithPercentage(entry.birds, totals.birds)}
                            </td>
                            <td className="py-3 px-4 text-right text-gray-700">
                              {renderCellWithPercentage(entry.weight, totals.weight, 'weight')}
                            </td>
                            <td className="py-3 px-4 text-right text-gray-700">
                              {(() => {
                                const val = entry.transactionDebit || entry.debit || 0;
                                return renderCellWithPercentage(val, totals.debitExpanded, 'currency');
                              })()}
                            </td>
                            <td className="py-3 px-4 text-right text-gray-700">
                              {(() => {
                                const val = entry.transactionCredit || entry.credit || 0;
                                return renderCellWithPercentage(val, totals.creditExpanded, 'currency');
                              })()}
                            </td>
                            <td className="py-3 px-4 text-right text-gray-700">
                              {/* Discount & Other */}
                              {(() => {
                                const val = entry.discountAndOther || 0;
                                return renderCellWithPercentage(val, totals.discountAndOther, 'currency');
                              })()}
                            </td>
                            <td className="py-3 px-4 text-right font-semibold text-gray-900">
                              {(() => {
                                const closingBal = entry.closingBalance !== undefined ? entry.closingBalance : (entry.debit - entry.credit);
                                return renderCellWithPercentage(closingBal, totals.netBalance, 'currency', true);
                              })()}
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="py-3 px-4 text-right text-gray-700">
                              {/* Use transaction totals instead of net balance cols */}
                              {(() => {
                                const val = entry.transactionDebit || 0;
                                return renderCellWithPercentage(val, totals.debitExpanded, 'currency');
                              })()}
                            </td>
                            <td className="py-3 px-4 text-right text-gray-700">
                              {/* Use transaction totals instead of net balance cols */}
                              {(() => {
                                const val = entry.transactionCredit || 0;
                                return renderCellWithPercentage(val, totals.creditExpanded, 'currency');
                              })()}
                            </td>
                            <td className="py-3 px-4 text-right text-gray-700">
                              {/* Discount & Other */}
                              {(() => {
                                const val = entry.discountAndOther || 0;
                                return renderCellWithPercentage(val, totals.discountAndOther, 'currency');
                              })()}
                            </td>
                            <td className="py-3 px-4 text-right font-semibold text-gray-900">
                              {(() => {
                                const closingBal = entry.closingBalance !== undefined ? entry.closingBalance : (entry.debit - entry.credit);
                                return renderCellWithPercentage(closingBal, totals.netBalance, 'currency', true);
                              })()}
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })}

                  {(isExpandedView) ? (
                    <tr className="border-t-2 border-gray-400 bg-gray-50">
                      <td className="py-3 px-4 font-bold text-gray-900">Grand Total</td>
                      <td className="py-3 px-4 text-right font-bold text-gray-900">
                        {renderCellWithPercentage(totals.birds, totals.birds)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-gray-900">
                        {renderCellWithPercentage(totals.weight, totals.weight, 'weight')}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-gray-900">
                        {renderCellWithPercentage(totals.debitExpanded, totals.debitExpanded, 'currency')}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-gray-900">
                        {renderCellWithPercentage(totals.creditExpanded, totals.creditExpanded, 'currency')}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-gray-900">
                        {renderCellWithPercentage(totals.discountAndOther, totals.discountAndOther, 'currency')}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-gray-900">
                        {renderCellWithPercentage(totals.netBalance, totals.netBalance, 'currency', true)}
                      </td>
                    </tr>
                  ) : (
                    <tr className="border-t-2 border-gray-400 bg-gray-50">
                      <td className="py-3 px-4 font-bold text-gray-900">Grand Total</td>
                      <td className="py-3 px-4 text-right font-bold text-gray-900">
                        {/* Use Expanded totals (sums of transactions) */}
                        {renderCellWithPercentage(totals.debitExpanded, totals.debitExpanded, 'currency')}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-gray-900">
                        {/* Use Expanded totals (sums of transactions) */}
                        {renderCellWithPercentage(totals.creditExpanded, totals.creditExpanded, 'currency')}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-gray-900">
                        {renderCellWithPercentage(totals.discountAndOther, totals.discountAndOther, 'currency')}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-gray-900">
                        {renderCellWithPercentage(totals.netBalance, totals.netBalance, 'currency', true)}
                      </td>
                    </tr>
                  )}
                </>
              ) : (
                <tr>
                  <td colSpan={isExpandedView ? 6 : 3} className="py-8 text-center text-gray-500">
                    No ledgers or sub-groups found in this group
                  </td>
                </tr>
              )}
            </tbody>
          </table>
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

