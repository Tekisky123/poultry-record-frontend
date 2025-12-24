import { useState, useEffect, useRef } from 'react';
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
  ChevronDown,
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
  RefreshCw,
  Columns
} from 'lucide-react';
import api from '../lib/axios';
import { useAuth } from '../contexts/AuthContext';
import { downloadCustomerLedgerExcelCustomer } from '../utils/downloadCustomerLedgerExcelCustomer';
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
    openingBalance: 0,
    outstandingBalance: 0
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
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [showAllColumns, setShowAllColumns] = useState(false);
  const [dateFilter, setDateFilter] = useState({
    startDate: '',
    endDate: ''
  });
  const [showDateFilterModal, setShowDateFilterModal] = useState(false);
  const [tempDateFilter, setTempDateFilter] = useState({
    startDate: '',
    endDate: ''
  });
  const [showPaymentTable, setShowPaymentTable] = useState(false);
  const [showDownloadOptions, setShowDownloadOptions] = useState(false);
  const [isDownloadingLedger, setIsDownloadingLedger] = useState(false);
  const downloadDropdownRef = useRef(null);

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
    setTimeout(() => {
      fetchPurchaseLedger(1, true)
    }, 1000)
  }, []) // infinite scrolling is not working on first load so added this

  useEffect(() => {
    if (user?._id || user?.id) {
      fetchDashboardData();
    }
  }, [user]);

  useEffect(() => {
    if (!showDownloadOptions) {
      return;
    }

    const handleClickOutside = (event) => {
      if (downloadDropdownRef.current && !downloadDropdownRef.current.contains(event.target)) {
        setShowDownloadOptions(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setShowDownloadOptions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showDownloadOptions]);

  const observerTarget = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && ledgerPagination.currentPage < ledgerPagination.totalPages && !loadingPagination && !refreshingPurchases) {
          fetchPurchaseLedger(ledgerPagination.currentPage + 1, false, true);
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [ledgerPagination.currentPage, ledgerPagination.totalPages, loadingPagination, refreshingPurchases]);

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

      // Fetch purchase ledger data (Start from page 1)
      await fetchPurchaseLedger(1);

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

  const fetchPurchaseLedger = async (page = 1, isRefresh = false, append = false) => {
    try {
      if (isRefresh) {
        setRefreshingPurchases(true);
      }
      if (append) {
        setLoadingPagination(true);
      }

      const userId = user?._id || user?.id;
      if (!userId) return;

      // Clear existing data first only if not appending and not refreshing
      if (!isRefresh && !append) {
        setPurchaseLedger([]);
      }

      // Determine limit: if filter active, fetch all (10000), else use pagination limit
      const limit = (dateFilter.startDate || dateFilter.endDate) ? 10000 : ledgerPagination.itemsPerPage;

      // Fetch purchase ledger data
      const ledgerResponse = await api.get(`/customer/panel/${userId}/purchase-ledger?page=${page}&limit=${limit}`);
      if (ledgerResponse.data.success) {
        const ledgerData = ledgerResponse.data.data;

        // Update pagination state
        if (ledgerData.pagination) {
          setLedgerPagination(ledgerData.pagination);
        }

        // Set ledger data
        setPurchaseLedger(prev => append ? [...prev, ...(ledgerData.ledger || [])] : (ledgerData.ledger || []));
        setLedgerTotals(ledgerData.totals || {});
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
      if (append) {
        setLoadingPagination(false);
      }
    }
  };

  // Pagination handlers for purchase ledger


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

  const handleDownloadExcel = async (type) => {
    if (!type) {
      setShowDownloadOptions(false);
      return;
    }

    if (type === 'current' && displayedPurchaseLedger.length === 0) {
      alert('No purchase data available on this page to download.');
      setShowDownloadOptions(false);
      return;
    }

    if (type === 'all' && ledgerPagination.totalItems === 0) {
      alert('No purchase data available to download.');
      setShowDownloadOptions(false);
      return;
    }

    setIsDownloadingLedger(true);

    try {
      if (type === 'current') {
        const success = downloadCustomerLedgerExcelCustomer(displayedPurchaseLedger, user?.name || 'Customer');
        alert(success ? 'Excel file downloaded successfully!' : 'Failed to download Excel file. Please try again.');
        return;
      }

      const userId = user?._id || user?.id;
      if (!userId) {
        alert('Unable to identify the user. Please try again.');
        return;
      }

      const limit = Math.max(ledgerPagination.totalItems || 0, ledgerPagination.itemsPerPage);
      const response = await api.get(`/customer/panel/${userId}/purchase-ledger?page=1&limit=${limit}`);

      if (!response.data.success) {
        alert('Failed to prepare Excel file. Please try again.');
        return;
      }

      let allLedger = response.data.data?.ledger || [];
      allLedger = filterLedgerByDate(allLedger, dateFilter);

      if (allLedger.length === 0) {
        alert('No records available to download for the selected filters.');
        return;
      }

      const success = downloadCustomerLedgerExcelCustomer(allLedger, user?.name || 'Customer');
      alert(success ? 'Excel file downloaded successfully!' : 'Failed to download Excel file. Please try again.');
    } catch (error) {
      console.error('Failed to download purchase ledger:', error);
      alert('Failed to download Excel file. Please try again.');
    } finally {
      setIsDownloadingLedger(false);
      setShowDownloadOptions(false);
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
      balance: stats.outstandingBalance,
      timestamp: new Date()
    };

    setSelectedSale(mockSale);
    setPaymentForm(prev => ({
      ...prev,
      amount: stats.outstandingBalance.toString(),
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
      case 'PURCHASE':
        return 'text-blue-600 bg-blue-100';
      case 'INDIRECT_PURCHASE':
        return 'text-red-600 bg-red-100';
      case 'INDIRECT_SALES':
        return 'text-red-600 bg-red-100';
      case 'RECEIPT':
        return 'text-green-600 bg-green-100';
      case 'PAYMENT':
        return 'text-green-600 bg-green-100';
      case 'DISCOUNT':
        return 'text-orange-600 bg-orange-100';
      case 'OP BAL':
        return 'text-purple-600 bg-purple-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  // Display function to map particulars in customer portal UI:
  // Payment voucher: show "PAYMENT"
  // Receipt voucher: show "RECEIPT"
  // Existing "RECEIPT": show "PAYMENT"
  const displayParticulars = (entry) => {
    if (entry.isVoucher && entry.voucherType) {
      if (entry.voucherType === 'Payment') {
        return 'RECEIPT';
      } else if (entry.voucherType === 'Receipt') {
        return 'PAYMENT';
      }
    }
    // Map existing "RECEIPT" to "PAYMENT" for customer portal
    if (entry.particulars === 'RECEIPT') {
      return 'PAYMENT';
    }
    if (entry.particulars === 'BY CASH RECEIPT') {
      return 'BY CASH PAYMENT';
    }
    if (entry.particulars === 'BY BANK RECEIPT') {
      return 'BY BANK PAYMENT';
    }
    if (entry.particulars === 'SALES') {
      return 'PURCHASE';
    }
    return entry.particulars;
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

  const filterLedgerByDate = (ledgerData = [], filter = {}) => {
    if (!filter.startDate && !filter.endDate) {
      return ledgerData;
    }

    return ledgerData.filter((entry) => {
      if (!entry?.date) return false;
      const entryDate = new Date(entry.date);
      if (Number.isNaN(entryDate.getTime())) return false;

      if (filter.startDate) {
        const start = new Date(filter.startDate);
        if (entryDate < start) {
          return false;
        }
      }

      if (filter.endDate) {
        const end = new Date(filter.endDate);
        end.setHours(23, 59, 59, 999);
        if (entryDate > end) {
          return false;
        }
      }

      return true;
    });
  };

  const getPaymentStatusColor = (outstandingBalance) => {
    if (outstandingBalance === 0) return 'text-green-600 bg-green-100';
    if (outstandingBalance > 0) return 'text-yellow-600 bg-yellow-100';
    return 'text-gray-600 bg-gray-100';
  };

  const getPaymentStatusText = (outstandingBalance) => {
    if (outstandingBalance === 0) return 'Paid';
    if (outstandingBalance > 0) return 'Pending';
    return 'Overpaid';
  };

  const isDateFilterActive = Boolean(dateFilter.startDate || dateFilter.endDate);
  const filteredPurchaseLedger = filterLedgerByDate(purchaseLedger, dateFilter);
  const displayedPurchaseLedger = isDateFilterActive ? filteredPurchaseLedger : purchaseLedger;

  const openDateFilterModal = () => {
    setTempDateFilter(dateFilter);
    setShowDateFilterModal(true);
  };

  const handleApplyDateFilter = () => {
    setDateFilter(tempDateFilter);
    setShowDateFilterModal(false);
  };

  const handleClearDateFilter = () => {
    setDateFilter({
      startDate: '',
      endDate: ''
    });
  };

  useEffect(() => {
    fetchPurchaseLedger(1, true);
  }, [dateFilter]);

  const formatDateDisplay = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit'
    });
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

        {/* First Row: Total Purchase | Total Birds / Total Weight | Total Amount */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Purchase</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalPurchases}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <ShoppingCart className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Birds / Total Weight</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold">{stats.totalBirds.toLocaleString()}</p>
                  <span className="text-2xl font-bold">/</span>
                  <p className="text-2xl font-bold ">{stats.totalWeight.toFixed(2)} kg</p>
                </div>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <Package className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Sales Amount</p>
                <p className="text-2xl font-bold text-gray-900">₹{stats.totalAmount.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Second Row: Total Receipt | Outstanding Balance */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-emerald-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Receipt</p>
                <p className="text-2xl font-bold text-gray-900">₹{(stats.totalPaid || 0).toLocaleString()}</p>
              </div>
              <div className="p-3 bg-emerald-100 rounded-lg">
                <Receipt className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </div>

          <div className="bg-orange-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Outstanding Balance</p>
                <p className="text-2xl font-bold text-gray-900">₹{(stats.outstandingBalance || 0).toLocaleString()}</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-lg">
                <CreditCard className="w-6 h-6 text-orange-600" />
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
              onClick={() => setShowPaymentTable(!showPaymentTable)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {showPaymentTable ? (
                <>
                  <EyeOff className="w-4 h-4" />
                  Hide Payments
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4" />
                  Show Payments
                </>
              )}
            </button>
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
        {/* <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <AlertCircle className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-blue-800">Opening Balance</h3>
                <p className="text-lg font-bold text-blue-900">₹{stats.openingBalance.toLocaleString()}</p>
                <p className="text-sm text-blue-700">
                  Initial balance set when account was created
                </p>
              </div>
            </div>
          </div>
        </div> */}

        {/* Outstanding Balance Display */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <AlertCircle className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <h3 className="font-semibold text-yellow-800">Outstanding Balance</h3>
                <p className="text-lg font-bold text-yellow-900">₹{stats.outstandingBalance.toLocaleString()}</p>
                <p className="text-sm text-yellow-700">
                  This is your current outstanding balance from all transactions
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
        {showPaymentTable && (
          <>
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
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${payment.status === 'verified' ? 'text-green-600 bg-green-100' :
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
          </>
        )}
      </div>

      {/* Customer Purchases Ledger Section */}
      <div className="card">
        <div className="flex flex-col gap-4 mb-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <Receipt className="w-5 h-5 mr-2 text-green-600" />
              Customer Purchases
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAllColumns(!showAllColumns)}
                className="flex items-center gap-2 px-3 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                title={showAllColumns ? "Hide additional columns" : "Show all columns"}
              >
                <Columns className="w-4 h-4" />
                {showAllColumns ? 'Hide Columns' : 'Show Columns'}
              </button>
              <button
                onClick={() => fetchPurchaseLedger(1, true)}
                disabled={refreshingPurchases}
                className="flex items-center gap-2 px-3 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Refresh purchase records"
              >
                <RefreshCw className={`w-4 h-4 ${refreshingPurchases ? 'animate-spin' : ''}`} />
                {refreshingPurchases ? 'Refreshing...' : 'Refresh'}
              </button>
              <div className="relative" ref={downloadDropdownRef}>
                <button
                  type="button"
                  onClick={() => setShowDownloadOptions((prev) => !prev)}
                  disabled={ledgerPagination.totalItems === 0 || isDownloadingLedger}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className="w-4 h-4" />
                  {isDownloadingLedger ? 'Preparing...' : 'Download Excel'}
                  <ChevronDown className={`w-4 h-4 transition-transform ${showDownloadOptions ? 'rotate-180' : ''}`} />
                </button>
                {showDownloadOptions && (
                  <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                    <button
                      type="button"
                      onClick={() => handleDownloadExcel('current')}
                      className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 flex flex-col"
                    >
                      <span className="font-medium text-gray-900">Download current page</span>
                      <span className="text-xs text-gray-500">{displayedPurchaseLedger.length} record(s)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownloadExcel('all')}
                      disabled={isDownloadingLedger}
                      className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 flex flex-col border-t border-gray-100 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <span className="font-medium text-gray-900">
                        {isDownloadingLedger ? 'Preparing all records…' : 'Download all records'}
                      </span>
                      <span className="text-xs text-gray-500">
                        {ledgerPagination.totalItems || 0} total record(s)
                      </span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={openDateFilterModal}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 transition-colors"
                title="Filter by Date Range"
              >
                <Calendar size={18} />
                <span>
                  {isDateFilterActive
                    ? `${formatDateDisplay(dateFilter.startDate)} - ${formatDateDisplay(dateFilter.endDate)}`
                    : 'Filter by Date'}
                </span>
              </button>

              {isDateFilterActive && (
                <button
                  onClick={handleClearDateFilter}
                  className="flex items-center gap-1 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium"
                >
                  <X size={16} />
                  Clear
                </button>
              )}
            </div>

            <div className="px-4 py-2 text-sm text-gray-600 border border-dashed border-gray-300 rounded-lg bg-gray-50">
              Showing: {isDateFilterActive ? `${displayedPurchaseLedger.length} filtered records` : `${purchaseLedger.length} records`}
            </div>
          </div>
        </div>

        {displayedPurchaseLedger.length === 0 ? (
          <div className="text-center py-8">
            <ShoppingCart className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-500">
              {isDateFilterActive
                ? 'No purchase records found for the selected date range.'
                : 'No purchase records yet'}
            </p>
            <p className="text-sm text-gray-400 mt-1">
              {isDateFilterActive
                ? 'Try adjusting the date range or clear the filter.'
                : 'Your purchase history will appear here'}
            </p>
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
                    <th className="px-3 py-3 text-left font-medium text-gray-700">Particulars</th>
                    {showAllColumns && <th className="px-3 py-3 text-left font-medium text-gray-700">Invoice No</th>}
                    {showAllColumns && <th className="px-3 py-3 text-right font-medium text-gray-700">Birds</th>}
                    {showAllColumns && <th className="px-3 py-3 text-right font-medium text-gray-700">Weight</th>}
                    {showAllColumns && <th className="px-3 py-3 text-right font-medium text-gray-700">Avg</th>}
                    {showAllColumns && <th className="px-3 py-3 text-right font-medium text-gray-700">Rate</th>}
                    <th className="px-3 py-3 text-right font-medium text-gray-700">Amount</th>
                    <th className="px-3 py-3 text-right font-medium text-gray-700">Balance</th>
                    {showAllColumns && <th className="px-3 py-3 text-left font-medium text-gray-700">Product</th>}
                    {showAllColumns && <th className="px-3 py-3 text-left font-medium text-gray-700">Supervisor</th>}
                    {showAllColumns && <th className="px-3 py-3 text-left font-medium text-gray-700">Vehicles No</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {displayedPurchaseLedger.map((entry, index) => (
                    <tr key={entry._id || index} className="hover:bg-gray-50">
                      <td className="px-3 py-3 text-gray-900">
                        {index + 1}
                      </td>
                      <td className="px-3 py-3 text-gray-900">{formatDate(entry.date)}</td>
                      <td className="px-3 py-3">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getParticularsColor(displayParticulars(entry))}`}>
                          {displayParticulars(entry)}
                        </span>
                      </td>
                      {showAllColumns && <td className="px-3 py-3 text-gray-900">{entry?.invoiceNo || '-'}</td>}
                      {showAllColumns && <td className="px-3 py-3 text-right text-gray-900">{entry?.birds || 0}</td>}
                      {showAllColumns && <td className="px-3 py-3 text-right text-gray-900">{(entry?.weight || 0).toFixed(2)}</td>}
                      {showAllColumns && <td className="px-3 py-3 text-right text-gray-900">{(entry?.avgWeight || 0).toFixed(2)}</td>}
                      {showAllColumns && <td className="px-3 py-3 text-right text-gray-900">₹{(entry?.rate || 0).toLocaleString()}</td>}
                      <td className="px-3 py-3 text-right text-gray-900">₹{(entry?.amount || 0).toLocaleString()}</td>
                      <td className="px-3 py-3 text-right text-gray-900">₹{(entry?.outstandingBalance || 0).toLocaleString()}</td>
                      {showAllColumns && <td className="px-3 py-3 text-gray-900">{entry.product || '-'}</td>}
                      {showAllColumns && <td className="px-3 py-3 text-gray-900">{entry.supervisor || '-'}</td>}
                      {showAllColumns && <td className="px-3 py-3 text-gray-900">{entry.vehiclesNo || '-'}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Infinite Scroll Loader */}
            <div ref={observerTarget} className="h-4 w-full flex items-center justify-center mt-4">
              {loadingPagination && (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                  <span className="text-xs text-gray-500">Loading more...</span>
                </div>
              )}
            </div>
          </>
        )}
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

export default CustomerDashboard;