import { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ShoppingCart, 
  CreditCard,
  AlertCircle,
  CheckCircle,
  Clock,
  Package,
  Receipt,
  Calendar,
  Download,
  ChevronLeft,
  ChevronRight,
  X,
  Smartphone,
  QrCode,
  Building2,
  User,
  Phone,
  Mail,
  Plus,
  Upload,
  Eye,
  EyeOff,
  RefreshCw
} from 'lucide-react';
import api from '../lib/axios';
import { useAuth } from '../contexts/AuthContext';
import { downloadCustomerLedgerExcel } from '../utils/downloadCustomerLedgerExcel';
import { downloadCustomerPaymentExcel } from '../utils/downloadCustomerPaymentExcel';

const CustomerDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalPurchases: 0,
    totalAmount: 0,
    totalPaid: 0,
    totalBalance: 0,
    totalBirds: 0,
    totalWeight: 0,
    pendingPayments: 0,
    openingBalance: 0
  });
  const [recentSales, setRecentSales] = useState([]);
  const [purchaseLedger, setPurchaseLedger] = useState([]);
  const [ledgerTotals, setLedgerTotals] = useState({});
  const [ledgerPagination, setLedgerPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10
  });
  const [paymentRecords, setPaymentRecords] = useState([]);
  const [paymentPagination, setPaymentPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshingPayments, setRefreshingPayments] = useState(false);
  const [refreshingPurchases, setRefreshingPurchases] = useState(false);
  const [loadingPagination, setLoadingPagination] = useState(false);
  
  // Payment Modal State
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
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      const userId = user?._id || user?.id;
      if (!userId) {
        console.error('User ID not found');
        setLoading(false);
        return;
      }
      
      // Fetch dashboard stats
      const statsResponse = await api.get(`/customer/panel/${userId}/dashboard-stats`);
      if (statsResponse.data.success) {
        setStats(statsResponse.data.data);
      }
      
      // Fetch purchase ledger data
      await fetchPurchaseLedger(ledgerPagination.currentPage);

      // Fetch payment records
      const paymentResponse = await api.get(`/customer/panel/${userId}/payments?page=${paymentPagination.currentPage}&limit=${paymentPagination.itemsPerPage}`);
      if (paymentResponse.data.success) {
        const paymentData = paymentResponse.data.data;
        setPaymentRecords(paymentData.payments || []);
        setPaymentPagination(paymentData.pagination || paymentPagination);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPurchaseLedger = async (page = 1, isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshingPurchases(true);
      }
      
      const userId = user?._id || user?.id;
      if (!userId) return;

      // Clear existing data first to ensure clean state
      if (!isRefresh) {
        setPurchaseLedger([]);
      }

      // Fetch purchase ledger data
      const ledgerResponse = await api.get(`/customer/panel/${userId}/purchase-ledger?page=${page}&limit=${ledgerPagination.itemsPerPage}`);
      if (ledgerResponse.data.success) {
        const ledgerData = ledgerResponse.data.data;
        
        // Ensure we're replacing the data completely
        setPurchaseLedger(ledgerData.ledger || []);
        setLedgerTotals(ledgerData.totals || {});
        
        // Update pagination state with new data
        if (ledgerData.pagination) {
          setLedgerPagination(ledgerData.pagination);
        }
      }

      // Also refresh dashboard stats if this is a refresh action
      if (isRefresh) {
        const statsResponse = await api.get(`/customer/panel/${userId}/dashboard-stats`);
        if (statsResponse.data.success) {
          setStats(statsResponse.data.data);
        }
      }

    } catch (error) {
      console.error('Failed to fetch purchase ledger:', error);
    } finally {
      if (isRefresh) {
        setRefreshingPurchases(false);
      }
    }
  };

  // Pagination handlers for purchase ledger
  const handlePreviousPage = async () => {
    if (ledgerPagination.currentPage > 1 && !loadingPagination) {
      setLoadingPagination(true);
      try {
        const newPage = ledgerPagination.currentPage - 1;
        await fetchPurchaseLedger(newPage);
      } finally {
        setLoadingPagination(false);
      }
    }
  };

  const handleNextPage = async () => {
    if (ledgerPagination.currentPage < ledgerPagination.totalPages && !loadingPagination) {
      setLoadingPagination(true);
      try {
        const newPage = ledgerPagination.currentPage + 1;
        await fetchPurchaseLedger(newPage);
      } finally {
        setLoadingPagination(false);
      }
    }
  };

  // Pagination handlers for payment records
  const handlePaymentPreviousPage = async () => {
    if (paymentPagination.currentPage > 1) {
      const newPage = paymentPagination.currentPage - 1;
      await fetchPaymentRecords(newPage);
    }
  };

  const handlePaymentNextPage = async () => {
    if (paymentPagination.currentPage < paymentPagination.totalPages) {
      const newPage = paymentPagination.currentPage + 1;
      await fetchPaymentRecords(newPage);
    }
  };

  const fetchPaymentRecords = async (page = 1, isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshingPayments(true);
      }
      
      const userId = user?._id || user?.id;
      if (!userId) return;

      // Clear existing data first to ensure clean state
      if (!isRefresh) {
        setPaymentRecords([]);
      }

      // Fetch payment records
      const paymentResponse = await api.get(`/customer/panel/${userId}/payments?page=${page}&limit=${paymentPagination.itemsPerPage}`);
      if (paymentResponse.data.success) {
        const paymentData = paymentResponse.data.data;
        
        // Ensure we're replacing the data completely
        setPaymentRecords(paymentData.payments || []);
        
        // Update pagination state with new data
        if (paymentData.pagination) {
          setPaymentPagination(paymentData.pagination);
        }
      }

      // Also refresh dashboard stats if this is a refresh action
      if (isRefresh) {
        const statsResponse = await api.get(`/customer/panel/${userId}/dashboard-stats`);
        if (statsResponse.data.success) {
          setStats(statsResponse.data.data);
        }
      }

    } catch (error) {
      console.error('Failed to fetch payment records:', error);
    } finally {
      if (isRefresh) {
        setRefreshingPayments(false);
      }
    }
  };

  const handleDownloadExcel = () => {
    if (purchaseLedger.length === 0) {
      alert('No data available to download');
      return;
    }
    
    const success = downloadCustomerLedgerExcel(purchaseLedger, user?.name || 'Customer');
    if (success) {
      alert('Excel file downloaded successfully!');
    } else {
      alert('Failed to download Excel file. Please try again.');
    }
  };

  const handleDownloadPaymentExcel = () => {
    if (paymentRecords.length === 0) {
      alert('No payment data available to download');
      return;
    }
    
    const success = downloadCustomerPaymentExcel(paymentRecords, user?.name || 'Customer');
    if (success) {
      alert('Payment Excel file downloaded successfully!');
    } else {
      alert('Failed to download payment Excel file. Please try again.');
    }
  };

  // Payment Modal Functions
  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSale) return;

    try {
      setIsSubmitting(true);
      const response = await api.post('/payment/submit', {
        saleId: selectedSale._id,
        ...paymentForm
      });

      if (response.data.success) {
        alert('Payment submitted successfully! Admin will verify your payment.');
        setShowPaymentModal(false);
        resetPaymentForm();
        fetchDashboardData(); // Refresh dashboard data
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

  const openPaymentModal = () => {
    // Create a mock sale object for the payment modal
    const mockSale = {
      _id: 'balance_payment',
      billNumber: 'BAL-' + Date.now(),
      tripId: 'BALANCE',
      balance: stats.openingBalance,
      timestamp: new Date()
    };
    
    setSelectedSale(mockSale);
    setPaymentForm(prev => ({
      ...prev,
      amount: stats.openingBalance.toString(),
      customerDetails: {
        name: user?.name || '',
        mobileNumber: user?.mobileNumber || '',
        email: user?.email || ''
      }
    }));
    setShowPaymentModal(true);
  };

  const getParticularsColor = (particulars) => {
    switch (particulars) {
      case 'SALES':
        return 'text-blue-600 bg-blue-100';
      case 'RECEIPT':
        return 'text-green-600 bg-green-100';
      case 'DISCOUNT':
        return 'text-orange-600 bg-orange-100';
      case 'OP BAL':
        return 'text-purple-600 bg-purple-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      const day = date.getDate().toString().padStart(2, '0');
      const month = date.toLocaleDateString('en-US', { month: 'short' });
      const year = date.getFullYear().toString().slice(-2);
      return `${day}-${month}-${year}`;
    } catch (error) {
      return dateString;
    }
  };

  const getPaymentStatusColor = (openingBalance) => {
    if (openingBalance === 0) return 'text-green-600 bg-green-100';
    if (openingBalance > 0) return 'text-yellow-600 bg-yellow-100';
    return 'text-gray-600 bg-gray-100';
  };

  const getPaymentStatusText = (openingBalance) => {
    if (openingBalance === 0) return 'Paid';
    if (openingBalance > 0) return 'Pending';
    return 'Overpaid';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-lg p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">Welcome, {user?.name || 'Customer'}!</h1>
        <p className="text-green-100">Track your purchases and manage your account</p>
      </div>

      {/* Dashboard Stats Section */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <TrendingUp className="w-5 h-5 mr-2 text-green-600" />
          Dashboard Stats
        </h2>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Purchases</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalPurchases}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <ShoppingCart className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Amount</p>
                <p className="text-2xl font-bold text-gray-900">₹{stats.totalAmount.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Birds</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalBirds}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <Package className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-orange-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Weight</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalWeight.toFixed(2)} kg</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payments Records Section */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <CreditCard className="w-5 h-5 mr-2 text-green-600" />
            Payment Records
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchPaymentRecords(paymentPagination.currentPage, true)}
              disabled={refreshingPayments}
              className="flex items-center gap-2 px-3 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Refresh payment records"
            >
              <RefreshCw className={`w-4 h-4 ${refreshingPayments ? 'animate-spin' : ''}`} />
              {refreshingPayments ? 'Refreshing...' : 'Refresh'}
            </button>
            <button
              onClick={handleDownloadPaymentExcel}
              disabled={paymentRecords.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              Download Excel
            </button>
          </div>
        </div>
        
        {/* Opening Balance Display */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <AlertCircle className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <h3 className="font-semibold text-yellow-800">Opening Balance</h3>
                <p className="text-lg font-bold text-yellow-900">₹{stats.openingBalance.toLocaleString()}</p>
                <p className="text-sm text-yellow-700">
                  This is your current opening balance from all transactions
                </p>
              </div>
            </div>
            <button
              onClick={openPaymentModal}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
            >
              Pay Now
            </button>
          </div>
        </div>

        {/* Payment Records Table */}
        {paymentRecords.length === 0 ? (
          <div className="text-center py-8">
            <CreditCard className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-500">No payment records yet</p>
            <p className="text-sm text-gray-400 mt-1">Your payment history will appear here</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-3 py-3 text-left font-medium text-gray-700">Date</th>
                    <th className="px-3 py-3 text-left font-medium text-gray-700">Payment Method</th>
                    <th className="px-3 py-3 text-left font-medium text-gray-700">Amount</th>
                    <th className="px-3 py-3 text-left font-medium text-gray-700">Status</th>
                    <th className="px-3 py-3 text-left font-medium text-gray-700">Transaction ID</th>
                    <th className="px-3 py-3 text-left font-medium text-gray-700">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {paymentRecords.map((payment, index) => (
                    <tr key={payment._id || index} className="hover:bg-gray-50">
                      <td className="px-3 py-3 text-gray-900">{formatDate(payment.createdAt)}</td>
                      <td className="px-3 py-3 text-gray-900">{payment.paymentMethod}</td>
                      <td className="px-3 py-3 text-right text-gray-900">₹{payment.amount.toLocaleString()}</td>
                      <td className="px-3 py-3">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          payment.status === 'verified' ? 'text-green-600 bg-green-100' :
                          payment.status === 'pending' ? 'text-yellow-600 bg-yellow-100' :
                          'text-red-600 bg-red-100'
                        }`}>
                          {payment.status}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-gray-900">{payment.verificationDetails?.transactionId || 'N/A'}</td>
                      <td className="px-3 py-3 text-gray-900">{payment.verificationDetails?.notes || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Payment Records Pagination */}
            {paymentPagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 px-3 py-3 bg-gray-50 border-t border-gray-200">
                <div className="text-sm text-gray-700">
                  Showing {((paymentPagination.currentPage - 1) * paymentPagination.itemsPerPage) + 1} to{' '}
                  {Math.min(paymentPagination.currentPage * paymentPagination.itemsPerPage, paymentPagination.totalItems)} of{' '}
                  {paymentPagination.totalItems} entries
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePaymentPreviousPage}
                    disabled={paymentPagination.currentPage === 1}
                    className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="px-3 py-1 text-sm text-gray-700">
                    Page {paymentPagination.currentPage} of {paymentPagination.totalPages}
                  </span>
                  <button
                    onClick={handlePaymentNextPage}
                    disabled={paymentPagination.currentPage === paymentPagination.totalPages}
                    className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Customer Purchases Ledger Section */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
          <Receipt className="w-5 h-5 mr-2 text-green-600" />
            Customer Purchases
        </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchPurchaseLedger(ledgerPagination.currentPage, true)}
              disabled={refreshingPurchases}
              className="flex items-center gap-2 px-3 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Refresh purchase records"
            >
              <RefreshCw className={`w-4 h-4 ${refreshingPurchases ? 'animate-spin' : ''}`} />
              {refreshingPurchases ? 'Refreshing...' : 'Refresh'}
            </button>
            <button
              onClick={handleDownloadExcel}
              disabled={purchaseLedger.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              Download Excel
            </button>
          </div>
        </div>

        {purchaseLedger.length === 0 ? (
          <div className="text-center py-8">
            <ShoppingCart className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-500">No purchase records yet</p>
            <p className="text-sm text-gray-400 mt-1">Your purchase history will appear here</p>
          </div>
        ) : (
          <>
            {/* Loading indicator for pagination */}
            {loadingPagination && (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600"></div>
                <span className="ml-2 text-sm text-gray-600">Loading...</span>
              </div>
            )}
            
            {/* Ledger Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-3 py-3 text-left font-medium text-gray-700">Sr. No.</th>
                    <th className="px-3 py-3 text-left font-medium text-gray-700">Date</th>
                    <th className="px-3 py-3 text-left font-medium text-gray-700">Vehicles No</th>
                    <th className="px-3 py-3 text-left font-medium text-gray-700">Driver Name</th>
                    <th className="px-3 py-3 text-left font-medium text-gray-700">Supervisor</th>
                    <th className="px-3 py-3 text-left font-medium text-gray-700">Product</th>
                    <th className="px-3 py-3 text-left font-medium text-gray-700">Particulars</th>
                    <th className="px-3 py-3 text-left font-medium text-gray-700">Invoice No</th>
                    <th className="px-3 py-3 text-right font-medium text-gray-700">Birds</th>
                    <th className="px-3 py-3 text-right font-medium text-gray-700">Weight</th>
                    <th className="px-3 py-3 text-right font-medium text-gray-700">Avg</th>
                    <th className="px-3 py-3 text-right font-medium text-gray-700">Rate</th>
                    <th className="px-3 py-3 text-right font-medium text-gray-700">Amount</th>
                    <th className="px-3 py-3 text-right font-medium text-gray-700">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {purchaseLedger.map((entry, index) => (
                    <tr key={entry._id || index} className="hover:bg-gray-50">
                      <td className="px-3 py-3 text-gray-900">
                        {(ledgerPagination.currentPage - 1) * ledgerPagination.itemsPerPage + index + 1}
                      </td>
                      <td className="px-3 py-3 text-gray-900">{formatDate(entry.date)}</td>
                      <td className="px-3 py-3 text-gray-900">{entry.vehiclesNo}</td>
                      <td className="px-3 py-3 text-gray-900">{entry.driverName}</td>
                      <td className="px-3 py-3 text-gray-900">{entry.supervisor}</td>
                      <td className="px-3 py-3 text-gray-900">{entry.product}</td>
                      <td className="px-3 py-3">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getParticularsColor(entry.particulars)}`}>
                          {entry.particulars}
                    </span>
                      </td>
                      <td className="px-3 py-3 text-gray-900">{entry.invoiceNo}</td>
                      <td className="px-3 py-3 text-right text-gray-900">{entry.birds}</td>
                      <td className="px-3 py-3 text-right text-gray-900">{entry.weight.toFixed(2)}</td>
                      <td className="px-3 py-3 text-right text-gray-900">{entry.avgWeight.toFixed(2)}</td>
                      <td className="px-3 py-3 text-right text-gray-900">₹{entry.rate.toLocaleString()}</td>
                      <td className="px-3 py-3 text-right text-gray-900">₹{entry.amount.toLocaleString()}</td>
                      <td className="px-3 py-3 text-right text-gray-900">₹{entry.openingBalance.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
                  </div>

            {/* Pagination */}
            {ledgerPagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 px-3 py-3 bg-gray-50 border-t border-gray-200">
                <div className="text-sm text-gray-700">
                  Showing {((ledgerPagination.currentPage - 1) * ledgerPagination.itemsPerPage) + 1} to{' '}
                  {Math.min(ledgerPagination.currentPage * ledgerPagination.itemsPerPage, ledgerPagination.totalItems)} of{' '}
                  {ledgerPagination.totalItems} entries
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePreviousPage}
                    disabled={ledgerPagination.currentPage === 1 || loadingPagination}
                    className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="px-3 py-1 text-sm text-gray-700">
                    Page {ledgerPagination.currentPage} of {ledgerPagination.totalPages}
                  </span>
                  <button
                    onClick={handleNextPage}
                    disabled={ledgerPagination.currentPage === ledgerPagination.totalPages || loadingPagination}
                    className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Payment Modal */}
      {showPaymentModal && selectedSale && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">Submit Payment</h3>
              <button 
                onClick={() => setShowPaymentModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>

            {/* Payment Details */}
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
                  <span className="text-blue-700">Opening Balance:</span>
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

              {/* Customer Details */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Your Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <input
                      type="text"
                      value={paymentForm.customerDetails.name}
                      onChange={(e) => setPaymentForm(prev => ({ 
                        ...prev, 
                        customerDetails: { ...prev.customerDetails, name: e.target.value }
                      }))}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number</label>
                    <input
                      type="tel"
                      value={paymentForm.customerDetails.mobileNumber}
                      onChange={(e) => setPaymentForm(prev => ({ 
                        ...prev, 
                        customerDetails: { ...prev.customerDetails, mobileNumber: e.target.value }
                      }))}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email (Optional)</label>
                    <input
                      type="email"
                      value={paymentForm.customerDetails.email}
                      onChange={(e) => setPaymentForm(prev => ({ 
                        ...prev, 
                        customerDetails: { ...prev.customerDetails, email: e.target.value }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Third Party Payer */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Payment Made By</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Relationship</label>
                    <select
                      value={paymentForm.thirdPartyPayer.relationship}
                      onChange={(e) => setPaymentForm(prev => ({ 
                        ...prev, 
                        thirdPartyPayer: { ...prev.thirdPartyPayer, relationship: e.target.value }
                      }))}
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
                        <input
                          type="tel"
                          value={paymentForm.thirdPartyPayer.mobileNumber}
                          onChange={(e) => setPaymentForm(prev => ({ 
                            ...prev, 
                            thirdPartyPayer: { ...prev.thirdPartyPayer, mobileNumber: e.target.value }
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Verification Details */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Payment Verification Details</h4>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Transaction ID</label>
                      <input
                        type="text"
                        value={paymentForm.verificationDetails.transactionId}
                        onChange={(e) => setPaymentForm(prev => ({ 
                          ...prev, 
                          verificationDetails: { ...prev.verificationDetails, transactionId: e.target.value }
                        }))}
                        placeholder="Enter transaction ID"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Reference Number</label>
                      <input
                        type="text"
                        value={paymentForm.verificationDetails.referenceNumber}
                        onChange={(e) => setPaymentForm(prev => ({ 
                          ...prev, 
                          verificationDetails: { ...prev.verificationDetails, referenceNumber: e.target.value }
                        }))}
                        placeholder="Enter reference number"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
                      <input
                        type="text"
                        value={paymentForm.verificationDetails.bankName}
                        onChange={(e) => setPaymentForm(prev => ({ 
                          ...prev, 
                          verificationDetails: { ...prev.verificationDetails, bankName: e.target.value }
                        }))}
                        placeholder="Enter bank name"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Payment Date</label>
                      <input
                        type="date"
                        value={paymentForm.verificationDetails.paymentDate}
                        onChange={(e) => setPaymentForm(prev => ({ 
                          ...prev, 
                          verificationDetails: { ...prev.verificationDetails, paymentDate: e.target.value }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Additional Notes</label>
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
                </div>
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

export default CustomerDashboard;