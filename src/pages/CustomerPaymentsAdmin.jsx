import { useState, useEffect } from 'react';
import { 
  CreditCard, 
  Clock, 
  CheckCircle, 
  X, 
  Eye, 
  AlertCircle,
  DollarSign,
  User,
  Phone,
  Calendar,
  Building2,
  Smartphone,
  QrCode,
  Filter,
  Search,
  Download
} from 'lucide-react';
import api from '../lib/axios';

const CustomerPaymentsAdmin = () => {
  const [payments, setPayments] = useState([]);
  const [stats, setStats] = useState({
    pending: { count: 0, amount: 0 },
    verified: { count: 0, amount: 0 },
    rejected: { count: 0, amount: 0 },
    total: { count: 0, amount: 0 }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationData, setVerificationData] = useState({
    status: 'verified',
    adminNotes: ''
  });

  useEffect(() => {
    fetchPayments();
    fetchStats();
  }, [statusFilter]);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/payment/admin/pending?status=${statusFilter}`);
      console.log("pending response__",response)
      if (response.data.success) {
        console.log("Payments data:", response.data.data.payments);
        setPayments(response.data.data.payments);
      } else {
        console.log("Response not successful:", response.data);
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
      setError('Failed to load payment data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/payment/admin/stats');
      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
      setError('Failed to load payment statistics. Please try again.');
    }
  };

  const handleVerifyPayment = async () => {
    if (!selectedPayment) return;

    try {
      setIsVerifying(true);
      const response = await api.put(`/payment/${selectedPayment.id}/verify`, verificationData);
      
      if (response.data.success) {
        alert(`Payment ${verificationData.status} successfully!`);
        setShowModal(false);
        fetchPayments();
        fetchStats();
        setVerificationData({ status: 'verified', adminNotes: '' });
      }
    } catch (error) {
      console.error('Error verifying payment:', error);
      const errorMessage = error.response?.data?.message || 'Failed to verify payment. Please try again.';
      alert(errorMessage);
    } finally {
      setIsVerifying(false);
    }
  };

  const openPaymentModal = (payment) => {
    setSelectedPayment(payment);
    setVerificationData({ status: 'verified', adminNotes: '' });
    setShowModal(true);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'verified': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'verified': return <CheckCircle size={16} />;
      case 'rejected': return <X size={16} />;
      default: return <Clock size={16} />;
    }
  };

  const getPaymentMethodIcon = (method) => {
    switch (method) {
      case 'upi': return <Smartphone size={16} />;
      case 'qr_code': return <QrCode size={16} />;
      case 'bank_transfer': return <Building2 size={16} />;
      default: return <CreditCard size={16} />;
    }
  };

  const filteredPayments = payments?.filter(payment => {
    const matchesSearch = searchTerm === '' || 
      payment.customer?.shopName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.customer?.ownerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.customer?.contact?.includes(searchTerm) ||
      payment.trip?.tripId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.verificationDetails?.transactionId?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  }) || [];

  const handleDownloadPayments = () => {
    const csvContent = [
      ['Date', 'Customer', 'Trip ID', 'Amount', 'Method', 'Status', 'Transaction ID', 'Submitted By'].join(','),
      ...(filteredPayments || []).map(payment => [
        new Date(payment.createdAt).toLocaleDateString(),
        payment.customer?.shopName || 'N/A',
        payment.trip?.tripId || 'N/A',
        payment.amount || 0,
        payment.paymentMethod || 'N/A',
        payment.status || 'N/A',
        payment.verificationDetails?.transactionId || 'N/A',
        payment.submittedBy?.name || 'N/A'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `customer_payments_${statusFilter}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Handle error state
  if (error) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="mx-auto h-12 w-12 text-red-400 mb-4" />
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={() => {
            setError('');
            fetchPayments();
            fetchStats();
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customer Payments</h1>
          <p className="text-gray-600">Manage and verify customer payment submissions</p>
        </div>
        <button
          onClick={handleDownloadPayments}
          disabled={filteredPayments?.length === 0}
          className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
        >
          <Download size={16} />
          Download
        </button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">{stats?.pending?.count}</p>
              <p className="text-xs text-gray-500">₹{stats?.pending?.amount?.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-lg">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Verified</p>
              <p className="text-2xl font-bold text-green-600">{stats?.verified?.count}</p>
              <p className="text-xs text-gray-500">₹{stats?.verified?.amount?.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Rejected</p>
              <p className="text-2xl font-bold text-red-600">{stats?.rejected?.count}</p>
              <p className="text-xs text-gray-500">₹{stats?.rejected?.amount?.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-red-100 rounded-lg">
              <X className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total</p>
              <p className="text-2xl font-bold text-blue-600">{stats?.total?.count}</p>
              <p className="text-xs text-gray-500">₹{stats?.total?.amount?.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search by customer, trip ID, transaction ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="pending">Pending</option>
                <option value="verified">Verified</option>
                <option value="rejected">Rejected</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <CreditCard size={20} />
            {statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)} Payments ({filteredPayments?.length || 0})
          </h2>
        </div>

        {filteredPayments && filteredPayments?.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trip ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transaction ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPayments && filteredPayments.map((payment) => (
                  <tr key={payment._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center gap-1">
                        <Calendar size={14} className="text-gray-400" />
                        {new Date(payment.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>
                        <div className="font-medium">{payment.customer?.shopName || 'N/A'}</div>
                        <div className="text-gray-500">{payment.customer?.ownerName || 'N/A'}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {payment.trip?.tripId || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      ₹{payment.amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center gap-1">
                        {getPaymentMethodIcon(payment.paymentMethod)}
                        <span className="capitalize">{payment.paymentMethod.replace('_', ' ')}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {payment.verificationDetails?.transactionId || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(payment.status)}`}>
                        {getStatusIcon(payment.status)}
                        {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <button
                        onClick={() => openPaymentModal(payment)}
                        className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                      >
                        <Eye size={16} />
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : payments && payments.length > 0 ? (
          <div className="text-center py-12">
            <Search className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Search Results</h3>
            <p className="text-gray-500 mb-4">
              No payments found matching "{searchTerm}"
            </p>
            <div className="text-sm text-gray-400">
              <p>Try adjusting your search terms or filters.</p>
            </div>
            <button
              onClick={() => setSearchTerm('')}
              className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Clear Search
            </button>
          </div>
        ) : (
          <div className="text-center py-12">
            <CreditCard className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No {statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)} Payments
            </h3>
            <p className="text-gray-500 mb-4">
              {statusFilter === 'pending' 
                ? 'No pending payments to verify at the moment.'
                : statusFilter === 'verified'
                ? 'No verified payments found.'
                : 'No rejected payments found.'
              }
            </p>
            <div className="text-sm text-gray-400">
              <p>
                {statusFilter === 'pending' 
                  ? 'Customer payment submissions will appear here when they submit payments.'
                  : 'Payment records will appear here once they are processed.'
                }
              </p>
            </div>
            {statusFilter !== 'pending' && (
              <button
                onClick={() => setStatusFilter('pending')}
                className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                View Pending Payments
              </button>
            )}
          </div>
        )}
      </div>

      {/* Payment Details Modal */}
      {showModal && selectedPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">Payment Details</h3>
              <button 
                onClick={() => setShowModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Payment Information */}
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900">Payment Information</h4>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Amount:</span>
                    <span className="font-semibold">₹{selectedPayment.amount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Method:</span>
                    <span className="capitalize">{selectedPayment.paymentMethod.replace('_', ' ')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(selectedPayment.status)}`}>
                      {selectedPayment.status.charAt(0).toUpperCase() + selectedPayment.status.slice(1)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Submitted:</span>
                    <span>{new Date(selectedPayment.createdAt).toLocaleString()}</span>
                  </div>
                </div>

                {/* Customer Details */}
                <h4 className="font-semibold text-gray-900">Customer Details</h4>
                <div className="bg-blue-50 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Shop:</span>
                    <span className="font-medium">{selectedPayment.customer?.shopName || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Owner:</span>
                    <span>{selectedPayment.customer?.ownerName || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Contact:</span>
                    <span>{selectedPayment.customer?.contact || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Trip ID:</span>
                    <span>{selectedPayment.trip?.tripId || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Payer Details */}
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900">Payer Details</h4>
                <div className="bg-green-50 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Name:</span>
                    <span className="font-medium">{selectedPayment.customerDetails?.name || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Mobile:</span>
                    <span>{selectedPayment.customerDetails?.mobileNumber || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Email:</span>
                    <span>{selectedPayment.customerDetails?.email || 'N/A'}</span>
                  </div>
                  {selectedPayment.thirdPartyPayer?.name && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Paid By:</span>
                        <span className="font-medium">{selectedPayment.thirdPartyPayer.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Payer Mobile:</span>
                        <span>{selectedPayment.thirdPartyPayer.mobileNumber || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Relationship:</span>
                        <span className="capitalize">{selectedPayment.thirdPartyPayer.relationship.replace('_', ' ')}</span>
                      </div>
                    </>
                  )}
                </div>

                {/* Verification Details */}
                <h4 className="font-semibold text-gray-900">Verification Details</h4>
                <div className="bg-yellow-50 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Transaction ID:</span>
                    <span className="font-mono text-sm">{selectedPayment.verificationDetails?.transactionId || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Reference:</span>
                    <span className="font-mono text-sm">{selectedPayment.verificationDetails?.referenceNumber || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Bank:</span>
                    <span>{selectedPayment.verificationDetails?.bankName || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Payment Date:</span>
                    <span>{selectedPayment.verificationDetails?.paymentDate ? new Date(selectedPayment.verificationDetails.paymentDate).toLocaleDateString() : 'N/A'}</span>
                  </div>
                  {selectedPayment.verificationDetails?.notes && (
                    <div>
                      <span className="text-gray-600 block mb-1">Notes:</span>
                      <p className="text-sm bg-white p-2 rounded border">{selectedPayment.verificationDetails.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Admin Verification */}
            {selectedPayment.status === 'pending' && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-4">Admin Verification</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Verification Status</label>
                    <select
                      value={verificationData.status}
                      onChange={(e) => setVerificationData(prev => ({ ...prev, status: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="verified">Verify Payment</option>
                      <option value="rejected">Reject Payment</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Admin Notes</label>
                    <textarea
                      value={verificationData.adminNotes}
                      onChange={(e) => setVerificationData(prev => ({ ...prev, adminNotes: e.target.value }))}
                      placeholder="Add verification notes..."
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={() => setShowModal(false)}
                      className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleVerifyPayment}
                      disabled={isVerifying}
                      className={`px-4 py-2 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 ${
                        verificationData.status === 'verified' 
                          ? 'bg-green-600 hover:bg-green-700' 
                          : 'bg-red-600 hover:bg-red-700'
                      }`}
                    >
                      {isVerifying ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Processing...
                        </>
                      ) : (
                        <>
                          {verificationData.status === 'verified' ? <CheckCircle size={16} /> : <X size={16} />}
                          {verificationData.status === 'verified' ? 'Verify' : 'Reject'} Payment
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Verification History */}
            {selectedPayment.status !== 'pending' && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-4">Verification History</h4>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Verified By:</span>
                    <span className="font-medium">{selectedPayment.verifiedBy?.name || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Verified At:</span>
                    <span>{selectedPayment.verifiedAt ? new Date(selectedPayment.verifiedAt).toLocaleString() : 'N/A'}</span>
                  </div>
                  {selectedPayment.adminNotes && (
                    <div>
                      <span className="text-gray-600 block mb-1">Admin Notes:</span>
                      <p className="text-sm bg-white p-2 rounded border">{selectedPayment.adminNotes}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerPaymentsAdmin;
