import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, ArrowLeft, Loader2 } from 'lucide-react';
import api from '../lib/axios';
import { useAuth } from '../contexts/AuthContext';

export default function GroupSummary() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [groupSummary, setGroupSummary] = useState(null);
  const [asOnDate, setAsOnDate] = useState(new Date().toISOString().split('T')[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState('');

  const hasAdminAccess = user?.role === 'admin' || user?.role === 'superadmin';

  useEffect(() => {
    if (hasAdminAccess && id) {
      fetchGroupSummary();
    }
  }, [id, asOnDate, hasAdminAccess]);

  const fetchGroupSummary = async () => {
    try {
      setIsLoading(true);
      setIsError(false);
      const { data } = await api.get(`/group/${id}/summary`, {
        params: { asOnDate }
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              if (groupSummary.parentGroup) {
                navigate(`/group-summary/${groupSummary.parentGroup.id}`);
              } else {
                navigate('/balance-sheet');
              }
            }}
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
          <div className="flex items-center gap-2">
            <Calendar className="text-gray-400" size={20} />
            <input
              type="date"
              value={asOnDate}
              onChange={(e) => setAsOnDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Group Summary Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        {/* Table Header */}
        <div className="mb-4">
          <h2 className="text-xl font-bold text-gray-900 mb-2">{groupSummary.group.name}</h2>
          <p className="text-gray-600 text-sm">
            As on {new Date(asOnDate).toLocaleDateString('en-GB', { 
              day: '2-digit', 
              month: 'long', 
              year: 'numeric' 
            })}
          </p>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-300">
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Particular</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-900">Debit</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-900">Credit</th>
              </tr>
            </thead>
            <tbody>
              {groupSummary.entries.length > 0 ? (
                <>
                  {groupSummary.entries.map((entry, index) => (
                    <tr 
                      key={entry.id} 
                      className={`border-b border-gray-200 hover:bg-gray-50 ${
                        entry.type === 'subgroup' || entry.type === 'customer' ? 'cursor-pointer' : ''
                      }`}
                      onClick={() => {
                        if (entry.type === 'subgroup') {
                          navigate(`/group-summary/${entry.id}`);
                        } else if (entry.type === 'customer') {
                          navigate(`/customers/${entry.id}`);
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
                          <span>
                            {entry.name}
                            <span className="ml-2 text-xs text-gray-500">(Vendor)</span>
                          </span>
                        ) : (
                          entry.name
                        )}
                      </td>
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
                    </tr>
                  ))}
                  {/* Grand Total Row */}
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
                </>
              ) : (
                <tr>
                  <td colSpan="3" className="py-8 text-center text-gray-500">
                    No ledgers or sub-groups found in this group
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

