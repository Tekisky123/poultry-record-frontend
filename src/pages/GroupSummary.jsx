import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Calendar, ArrowLeft, Loader2, X } from 'lucide-react';
import api from '../lib/axios';
import { useAuth } from '../contexts/AuthContext';

export default function GroupSummary() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const [groupSummary, setGroupSummary] = useState(null);

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
                {(groupSummary.entries.some(e => e.birds > 0 || e.weight > 0) || groupSummary.group.name.toLowerCase().includes('debtor')) && (
                  <>
                    <th className="text-right py-3 px-4 font-semibold text-gray-900">Total Birds</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-900">Total Weight</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-900">Debit (Sales)</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-900">Credit (Receipts)</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-900">Closing Balance</th>
                  </>
                )}
                {!(groupSummary.entries.some(e => e.birds > 0 || e.weight > 0) || groupSummary.group.name.toLowerCase().includes('debtor')) && (
                  <>
                    <th className="text-right py-3 px-4 font-semibold text-gray-900">Debit</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-900">Credit</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {groupSummary.entries.length > 0 ? (
                <>
                  {groupSummary.entries.map((entry, index) => {
                    const isExpandedView = (groupSummary.entries.some(e => e.birds > 0 || e.weight > 0) || groupSummary.group.name.toLowerCase().includes('debtor'));

                    return (
                      <tr
                        key={entry.id}
                        className={`border-b border-gray-200 hover:bg-gray-50 ${entry.type === 'subgroup' || entry.type === 'customer' || entry.type === 'vendor' ? 'cursor-pointer' : ''
                          }`}
                        onClick={() => {
                          const query = `?startDate=${dateFilter.startDate}&endDate=${dateFilter.endDate}`;
                          if (entry.type === 'subgroup') {
                            navigate(`/group-summary/${entry.id}${query}`);
                          } else if (entry.type === 'customer') {
                            navigate(`/monthly-summary/customer/${entry.id}${query}`);
                          } else if (entry.type === 'vendor') {
                            navigate(`/monthly-summary/vendor/${entry.id}${query}`);
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
                          ) : (
                            entry.name
                          )}
                        </td>

                        {isExpandedView ? (
                          <>
                            <td className="py-3 px-4 text-right text-gray-700">
                              {entry.birds ? entry.birds.toLocaleString() : '-'}
                            </td>
                            <td className="py-3 px-4 text-right text-gray-700">
                              {entry.weight ? entry.weight.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                            </td>
                            <td className="py-3 px-4 text-right text-gray-700">
                              {entry.transactionDebit ? entry.transactionDebit.toLocaleString('en-IN', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                              }) : (entry.debit > 0 ? entry.debit.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-')}
                            </td>
                            <td className="py-3 px-4 text-right text-gray-700">
                              {entry.transactionCredit ? entry.transactionCredit.toLocaleString('en-IN', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                              }) : (entry.credit > 0 ? entry.credit.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-')}
                            </td>
                            <td className="py-3 px-4 text-right font-semibold text-gray-900">
                              {entry.closingBalance !== undefined ? (
                                Math.abs(entry.closingBalance).toLocaleString('en-IN', {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2
                                }) + (entry.closingBalance >= 0 ? ' Dr' : ' Cr')
                              ) : (
                                // Fallback to debit/credit check if closingBalance not explicitly sent
                                entry.debit > 0 ? entry.debit.toLocaleString('en-IN', { minimumFractionDigits: 2 }) + ' Dr'
                                  : entry.credit > 0 ? entry.credit.toLocaleString('en-IN', { minimumFractionDigits: 2 }) + ' Cr'
                                    : '0.00'
                              )}
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="py-3 px-4 text-right text-gray-700">
                              {entry.debit > 0 ? entry.debit.toLocaleString('en-IN', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                              }) : '-'}
                            </td>
                            <td className="py-3 px-4 text-right text-gray-700">
                              {entry.credit > 0 ? entry.credit.toLocaleString('en-IN', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                              }) : '-'}
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })}

                  {/* Grand Total Row */}
                  {(groupSummary.entries.some(e => e.birds > 0 || e.weight > 0) || groupSummary.group.name.toLowerCase().includes('debtor')) ? (
                    <tr className="border-t-2 border-gray-400 bg-gray-50">
                      <td className="py-3 px-4 font-bold text-gray-900">Grand Total</td>
                      <td className="py-3 px-4 text-right font-bold text-gray-900">
                        {groupSummary.totals.birds?.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-gray-900">
                        {groupSummary.totals.weight?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-gray-900">
                        {/* Calculate Sum of Transaction Debits */}
                        {groupSummary.entries.reduce((sum, e) => sum + (e.transactionDebit || e.debit || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-gray-900">
                        {/* Calculate Sum of Transaction Credits */}
                        {groupSummary.entries.reduce((sum, e) => sum + (e.transactionCredit || e.credit || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-gray-900">
                        {/* Net Closing Balance */}
                        {(() => {
                          const netBalance = groupSummary.entries.reduce((sum, e) => sum + (e.closingBalance || (e.debit - e.credit) || 0), 0);
                          return Math.abs(netBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 }) + (netBalance >= 0 ? ' Dr' : ' Cr');
                        })()}
                      </td>
                    </tr>
                  ) : (
                    <tr className="border-t-2 border-gray-400 bg-gray-50">
                      <td className="py-3 px-4 font-bold text-gray-900">Grand Total</td>
                      <td className="py-3 px-4 text-right font-bold text-gray-900">
                        {groupSummary.totals.debit.toLocaleString('en-IN', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-gray-900">
                        {groupSummary.totals.credit.toLocaleString('en-IN', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}
                      </td>
                    </tr>
                  )}
                </>
              ) : (
                <tr>
                  <td colSpan={(groupSummary.entries.some(e => e.birds > 0 || e.weight > 0) || groupSummary.group.name.toLowerCase().includes('debtor')) ? 6 : 3} className="py-8 text-center text-gray-500">
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

