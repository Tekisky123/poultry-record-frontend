import { useState, useEffect } from 'react';
import { 
  CreditCard, 
  Smartphone, 
  QrCode, 
  Building2, 
  DollarSign, 
  User, 
  Phone, 
  Mail, 
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  X,
  Plus,
  Upload,
  Eye,
  EyeOff
} from 'lucide-react';
import api from '../lib/axios';
import { useAuth } from '../contexts/AuthContext';

const CustomerPayments = () => {
  const { user } = useAuth();
  const [sales, setSales] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Payment form state
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    paymentMethod: 'upi',
    customerDetails: {
      name: '',
      mobileNumber: '',
      email: ''
    },
    thirdPartyPayer: {
      name: '',
      mobileNumber: '',
      relationship: 'self'
    },
    verificationDetails: {
      transactionId: '',
      referenceNumber: '',
      bankName: '',
      paymentDate: '',
      screenshot: '',
      notes: ''
    }
  });

  useEffect(() => {
    if (user?._id || user?.id) {
      fetchSales();
      fetchPayments();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchSales = async () => {
    try {
      const userId = user?._id || user?.id;
      const response = await api.get(`/customer/panel/${userId}/sales`);
      if (response.data.success) {
        // Filter sales with outstanding balance
        const salesWithBalance = response.data.data.filter(sale => sale.balance > 0);
        setSales(salesWithBalance);
      }
    } catch (error) {
      console.error('Error fetching sales:', error);
      setError('Failed to load sales data. Please try again.');
    }
  };

  const fetchPayments = async () => {
    try {
      const userId = user?._id || user?.id;
      const response = await api.get(`/payment/customer/${userId}`);
      if (response.data.success) {
        setPayments(response.data.payments);
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
      setError('Failed to load payment history. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSale) return;

    try {
      setIsSubmitting(true);
      // Add +91 prefix to payer mobile number if it exists
      const submitData = {
        saleId: selectedSale._id,
        ...paymentForm,
        thirdPartyPayer: {
          ...paymentForm.thirdPartyPayer,
          mobileNumber: paymentForm.thirdPartyPayer.mobileNumber 
            ? `+91${paymentForm.thirdPartyPayer.mobileNumber}` 
            : paymentForm.thirdPartyPayer.mobileNumber
        }
      };
      const response = await api.post('/payment/submit', submitData);

      if (response.data.success) {
        alert('Payment submitted successfully! Admin will verify your payment.');
        setShowPaymentModal(false);
        resetPaymentForm();
        fetchSales();
        fetchPayments();
      }
    } catch (error) {
      console.error('Error submitting payment:', error);
      const errorMessage = error.response?.data?.message || 'Failed to submit payment. Please try again.';
      alert(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetPaymentForm = () => {
    setPaymentForm({
      amount: '',
      paymentMethod: 'upi',
      customerDetails: {
        name: '',
        mobileNumber: '',
        email: ''
      },
      thirdPartyPayer: {
        name: '',
        mobileNumber: '',
        relationship: 'self'
      },
      verificationDetails: {
        transactionId: '',
        referenceNumber: '',
        bankName: '',
        paymentDate: '',
        screenshot: '',
        notes: ''
      }
    });
  };

  const openPaymentModal = (sale) => {
    setSelectedSale(sale);
    setPaymentForm(prev => ({
      ...prev,
      amount: sale.balance.toString(),
      customerDetails: {
        name: user?.name || '',
        mobileNumber: user?.mobileNumber || '',
        email: user?.email || ''
      }
    }));
    setShowPaymentModal(true);
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
            fetchSales();
            fetchPayments();
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  // Handle case when user is not available
  if (!user) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="mx-auto h-12 w-12 text-red-400 mb-4" />
        <p className="text-red-600">User information not available. Please log in again.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payment Management</h1>
          <p className="text-gray-600">Submit payments and track payment status</p>
        </div>
      </div>

      {/* Outstanding Balances */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <AlertCircle size={20} className="text-red-500" />
          Outstanding Balances
        </h2>
        
        {sales && sales.length > 0 ? (
          <div className="space-y-4">
            {sales.map((sale) => (
              <div key={sale._id} className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-200">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm text-gray-500">Bill No: {sale.billNumber}</span>
                    <span className="text-sm text-gray-500">•</span>
                    <span className="text-sm text-gray-500">Trip: {sale.tripId}</span>
                  </div>
                  <p className="text-sm text-gray-700">
                    {new Date(sale.timestamp).toLocaleDateString()} • {sale.birds} birds • ₹{sale.amount.toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-red-600">₹{sale.balance.toLocaleString()}</p>
                  <button
                    onClick={() => openPaymentModal(sale)}
                    className="mt-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                  >
                    <CreditCard size={16} />
                    Pay Now
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <CheckCircle className="mx-auto h-16 w-16 text-green-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">All Caught Up!</h3>
            <p className="text-gray-500 mb-4">No outstanding balances found.</p>
            <p className="text-green-600 font-medium">All your payments are up to date.</p>
            <div className="mt-4 text-sm text-gray-400">
              <p>New purchases will appear here when you have outstanding balances.</p>
            </div>
          </div>
        )}
      </div>

      {/* Payment History */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Clock size={20} />
            Payment History ({payments?.length || 0})
          </h2>
        </div>
        
        {payments && payments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bill No</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Verified By</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {payments.map((payment) => (
                  <tr key={payment._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center gap-1">
                        <Calendar size={14} className="text-gray-400" />
                        {new Date(payment.createdAt).toLocaleDateString()}
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
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(payment.status)}`}>
                        {getStatusIcon(payment.status)}
                        {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {payment.verifiedBy?.name || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <Clock className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Payment History</h3>
            <p className="text-gray-500 mb-4">You haven't submitted any payments yet.</p>
            <div className="text-sm text-gray-400">
              <p>Payment submissions will appear here once you make payments for outstanding balances.</p>
            </div>
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {showPaymentModal && selectedSale && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">Submit Payment</h3>
              <button 
                onClick={() => setShowPaymentModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>

            {/* Sale Details */}
            <div className="bg-blue-50 rounded-lg p-4 mb-6">
              <h4 className="font-semibold text-blue-900 mb-2">Payment Details</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-blue-700">Bill No:</span>
                  <span className="ml-2 font-medium">{selectedSale.billNumber}</span>
                </div>
                <div>
                  <span className="text-blue-700">Trip ID:</span>
                  <span className="ml-2 font-medium">{selectedSale.tripId}</span>
                </div>
                <div>
                  <span className="text-blue-700">Outstanding Balance:</span>
                  <span className="ml-2 font-bold text-red-600">₹{selectedSale.balance.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-blue-700">Date:</span>
                  <span className="ml-2">{new Date(selectedSale.timestamp).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            <form onSubmit={handlePaymentSubmit} className="space-y-6">
              {/* Payment Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Amount (₹)</label>
                <input
                  type="number"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, amount: e.target.value }))}
                  max={selectedSale.balance}
                  min="1"
                  step="0.01"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">Maximum: ₹{selectedSale.balance.toLocaleString()}</p>
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                <select
                  value={paymentForm.paymentMethod}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, paymentMethod: e.target.value }))}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="upi">UPI Payment</option>
                  <option value="qr_code">QR Code Payment</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cash">Cash Payment</option>
                  <option value="other">Other Method</option>
                </select>
              </div>

              {/* Payment Made By */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Payment Made By</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Relationship</label>
                    <select
                      value={paymentForm.thirdPartyPayer.relationship}
                      onChange={(e) => {
                        const relationship = e.target.value;
                        setPaymentForm(prev => ({
                          ...prev,
                          thirdPartyPayer: { ...prev.thirdPartyPayer, relationship },
                          // Always auto-populate customerDetails from logged-in user
                          customerDetails: {
                            name: user?.name || '',
                            mobileNumber: user?.mobileNumber || '',
                            email: user?.email || ''
                          }
                        }));
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="self">Self</option>
                      <option value="family_member">Family Member</option>
                      <option value="friend">Friend</option>
                      <option value="colleague">Colleague</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  
                  {paymentForm.thirdPartyPayer.relationship !== 'self' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Payer Name</label>
                        <input
                          type="text"
                          value={paymentForm.thirdPartyPayer.name}
                          onChange={(e) => setPaymentForm(prev => ({ 
                            ...prev, 
                            thirdPartyPayer: { ...prev.thirdPartyPayer, name: e.target.value }
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Payer Mobile Number</label>
                        <div className="flex">
                          <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                            +91
                          </span>
                          <input
                            type="tel"
                            value={paymentForm.thirdPartyPayer.mobileNumber || ''}
                            onChange={(e) => {
                              // Only allow digits, max 10 digits
                              const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                              setPaymentForm(prev => ({ 
                                ...prev, 
                                thirdPartyPayer: { ...prev.thirdPartyPayer, mobileNumber: value }
                              }));
                            }}
                            placeholder="Enter 10 digit mobile number"
                            maxLength={10}
                            className="flex-1 px-3 py-2 rounded-r-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        {paymentForm.thirdPartyPayer.mobileNumber && (
                          <p className="text-xs text-gray-500 mt-1">
                            Full number: +91{paymentForm.thirdPartyPayer.mobileNumber}
                          </p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Additional Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Additional Notes</label>
                <textarea
                  value={paymentForm.verificationDetails.notes}
                  onChange={(e) => setPaymentForm(prev => ({ 
                    ...prev, 
                    verificationDetails: { ...prev.verificationDetails, notes: e.target.value }
                  }))}
                  placeholder="Any additional information about the payment..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Submit Button */}
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <CreditCard size={16} />
                      Submit Payment
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerPayments;
