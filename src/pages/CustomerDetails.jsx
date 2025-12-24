import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Calendar,
  Package,
  DollarSign,
  Truck,
  Eye,
  Download,
  AlertCircle,
  CheckCircle,
  Clock,
  Receipt,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  ChevronDown,
  X
} from 'lucide-react';
import api from '../lib/axios';
import { downloadCustomerLedgerExcel } from '../utils/downloadCustomerLedgerExcel';

const CustomerDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [customer, setCustomer] = useState(null);
  const [purchaseLedger, setPurchaseLedger] = useState([]);
  const [ledgerTotals, setLedgerTotals] = useState({});
  const [ledgerPagination, setLedgerPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10
  });
  const [loading, setLoading] = useState(true);
  // Separate loading state for initial fetch vs infinite scroll
  const [isLedgerInitialLoading, setIsLedgerInitialLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);

  // const [refreshingPurchases, setRefreshingPurchases] = useState(false);
  // const [showDownloadOptions, setShowDownloadOptions] = useState(false);
  const [refreshingPurchases, setRefreshingPurchases] = useState(false);
  const [showDownloadOptions, setShowDownloadOptions] = useState(false);
  const [isDownloadingLedger, setIsDownloadingLedger] = useState(false);
  const [error, setError] = useState('');
  const [initialLedgerLoad, setInitialLedgerLoad] = useState(true);
  const [dateFilter, setDateFilter] = useState({
    startDate: '',
    endDate: ''
  });
  // Date Filter Modal States
  const [showDateFilterModal, setShowDateFilterModal] = useState(false);
  const [tempDateFilter, setTempDateFilter] = useState({
    startDate: '',
    endDate: ''
  });

  const downloadDropdownRef = useRef(null);

  // Infinite Scroll Observer
  const observer = useRef();
  const lastEntryRef = useRef();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (downloadDropdownRef.current && !downloadDropdownRef.current.contains(event.target)) {
        setShowDownloadOptions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Setup intersection observer for infinite scroll
  useEffect(() => {
    if (isLedgerInitialLoading || isFetchingMore) return;
    if (observer.current) observer.current.disconnect();

    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && ledgerPagination.currentPage < ledgerPagination.totalPages) {
        // Increment page to trigger fetch
        fetchPurchaseLedger(ledgerPagination.currentPage + 1, false);
      }
    });

    if (lastEntryRef.current) observer.current.observe(lastEntryRef.current);

    return () => {
      if (observer.current) observer.current.disconnect();
    }
  }, [isLedgerInitialLoading, isFetchingMore, ledgerPagination.currentPage, ledgerPagination.totalPages]);


  useEffect(() => {
    if (id) {
      fetchCustomerDetails();
    }
  }, [id]);

  useEffect(() => {
    const start = searchParams.get('startDate');
    const end = searchParams.get('endDate');
    if (start || end) {
      setDateFilter({
        startDate: start || '',
        endDate: end || ''
      });
    }
  }, [searchParams]);

  // Re-fetch purchase ledger when customer data is loaded
  useEffect(() => {
    if (customer?.user?._id) {
      fetchPurchaseLedger(1); // Always start from page 1 when customer loads
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer]);

  const fetchCustomerDetails = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/customer/admin/${id}`);
      if (response.data.success) {
        setCustomer(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching customer details:', error);
      setError('Failed to fetch customer details');
    } finally {
      setLoading(false);
    }
  };

  const fetchPurchaseLedger = async (page = 1, isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshingPurchases(true);
      } else if (page === 1) {
        setIsLedgerInitialLoading(true);
      } else {
        setIsFetchingMore(true);
      }

      if (!customer?.user?._id) return;

      const itemsPerPage = ledgerPagination.itemsPerPage || 10;

      // If date filter is active, fetch all records (set a high limit) - User Request
      const limit = (dateFilter.startDate || dateFilter.endDate) ? 10000 : itemsPerPage;

      // Fetch purchase ledger data
      const ledgerResponse = await api.get(`/customer/panel/${customer.user._id}/purchase-ledger?page=${page}&limit=${limit}`);
      if (ledgerResponse.data.success) {
        const ledgerData = ledgerResponse.data.data;
        const newEntries = ledgerData.ledger || [];

        if (page === 1) {
          setPurchaseLedger(newEntries);
        } else {
          // Append new entries
          setPurchaseLedger(prev => {
            // Avoid duplicates
            const existingIds = new Set(prev.map(e => e._id));
            const uniqueEntries = newEntries.filter(e => !existingIds.has(e._id));
            return [...prev, ...uniqueEntries];
          });
        }

        setLedgerTotals(ledgerData.totals || {});

        if (ledgerData.pagination) {
          setLedgerPagination(ledgerData.pagination);
        }

        if (initialLedgerLoad) {
          setInitialLedgerLoad(false);
        }
      }
    } catch (error) {
      console.error('Error fetching purchase ledger:', error);
    } finally {
      if (isRefresh) {
        setRefreshingPurchases(false);
      } else if (page === 1) {
        setIsLedgerInitialLoading(false);
      } else {
        setIsFetchingMore(false);
      }
    }
  };



  const handleBack = () => {
    navigate(-1);
  };

  const handleDownloadLedger = async (type) => {
    if (!type) {
      setShowDownloadOptions(false);
      return;
    }

    if (type === 'current') {
      if (displayedPurchaseLedger.length === 0) {
        alert('No data available on this page to download.');
        setShowDownloadOptions(false);
        return;
      }
      const success = downloadCustomerLedgerExcel(displayedPurchaseLedger, customer?.shopName || 'Customer');
      alert(success ? 'Excel file downloaded successfully!' : 'Failed to download Excel file. Please try again.');
      setShowDownloadOptions(false);
      return;
    }

    if (ledgerPagination.totalItems === 0) {
      alert('No records available to download.');
      setShowDownloadOptions(false);
      return;
    }

    if (!customer?.user?._id) {
      alert('Unable to identify customer. Please try again.');
      setShowDownloadOptions(false);
      return;
    }

    setIsDownloadingLedger(true);
    try {
      const totalItems = ledgerPagination.totalItems || purchaseLedger.length;
      const limit = Math.max(totalItems, ledgerPagination.itemsPerPage || totalItems || 10);
      const response = await api.get(`/customer/panel/${customer.user._id}/purchase-ledger?page=1&limit=${limit}`);

      if (!response.data.success) {
        throw new Error('Failed to fetch ledger records for download.');
      }

      let allLedger = response.data.data?.ledger || [];
      allLedger = filterLedgerByDate(allLedger, dateFilter);

      if (allLedger.length === 0) {
        alert('No records available to download for the selected filters.');
        return;
      }

      const success = downloadCustomerLedgerExcel(allLedger, customer?.shopName || 'Customer');
      alert(success ? 'Excel file downloaded successfully!' : 'Failed to download Excel file. Please try again.');
    } catch (error) {
      console.error('Error downloading ledger:', error);
      alert('Failed to download Excel file. Please try again.');
    } finally {
      setIsDownloadingLedger(false);
      setShowDownloadOptions(false);
    }
  };

  const getParticularsColor = (particulars) => {
    switch (particulars) {
      case 'SALES':
        return 'bg-blue-100 text-blue-800';
      case 'INDIRECT_PURCHASE':
        return 'bg-red-100 text-red-800';
      case 'INDIRECT_SALES':
        return 'bg-red-100 text-red-800';
      case 'RECEIPT':
        return 'bg-green-100 text-green-800';
      case 'PAYMENT':
        return 'bg-green-100 text-green-800';
      case 'BY CASH RECEIPT':
        return 'bg-yellow-100 text-yellow-800';
      case 'BY BANK RECEIPT':
        return 'bg-indigo-100 text-indigo-800';
      case 'DISCOUNT':
        return 'bg-orange-100 text-orange-800';
      case 'OP BAL':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Map voucher particulars for admin panel:
  // Payment voucher: show "RECEIPT"
  // Receipt voucher: show "PAYMENT"
  const displayParticulars = (entry) => {
    if (entry.isVoucher && entry.voucherType) {
      if (entry.voucherType === 'Payment') {
        return 'RECEIPT';
      } else if (entry.voucherType === 'Receipt') {
        return 'PAYMENT';
      }
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
    // Explicitly fetch page 1 with new filter implicitly handled by useEffect dependency on dateFilter?
    // wait, fetchPurchaseLedger isn't dependent on dateFilter in useEffect.
    // We should trigger a fetch here.
    // And since we want "one page view", fetching page 1 with high limit (handled in fetchPurchaseLedger) is correct.
    // However, we need to pass the NEW date filter to fetchPurchaseLedger immediately or wait for state update.
    // State update is async. Better to use useEffect.
  };

  // Effect to refetch when dateFilter changes
  useEffect(() => {
    if (customer?.user?._id) {
      fetchPurchaseLedger(1, true); // Refresh list
    }
  }, [dateFilter]);

  const handleClearDateFilter = () => {
    setDateFilter({
      startDate: '',
      endDate: ''
    });
  };

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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="mx-auto h-12 w-12 text-red-400 mb-4" />
        <p className="text-red-600">{error || 'Customer not found'}</p>
        <button
          onClick={handleBack}
          className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          Back to Customers
        </button>
      </div>
    );
  }

  // Calculate statistics from ledger totals
  const totalSales = ledgerTotals.totalAmount || 0;
  const totalBirds = ledgerTotals.totalBirds || 0;
  const totalWeight = ledgerTotals.totalWeight || 0;
  const totalReceipt = ledgerTotals.totalReceipt || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{customer.shopName}</h1>
            <p className="text-gray-600">Customer Details & Sales History</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
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
              onClick={() => setShowDownloadOptions(prev => !prev)}
              disabled={(displayedPurchaseLedger.length === 0 && ledgerPagination.totalItems === 0) || isDownloadingLedger}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download size={16} />
              {isDownloadingLedger ? 'Preparing...' : 'Download Excel'}
              <ChevronDown className={`w-4 h-4 transition-transform ${showDownloadOptions ? 'rotate-180' : ''}`} />
            </button>
            {showDownloadOptions && (
              <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                <button
                  type="button"
                  onClick={() => handleDownloadLedger('current')}
                  className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 flex flex-col"
                >
                  <span className="font-medium text-gray-900">Download current page</span>
                  <span className="text-xs text-gray-500">{displayedPurchaseLedger.length} record(s)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadLedger('all')}
                  disabled={isDownloadingLedger}
                  className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 flex flex-col border-t border-gray-100 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <span className="font-medium text-gray-900">
                    {isDownloadingLedger ? 'Preparing all records…' : 'Download all records'}
                  </span>
                  <span className="text-xs text-gray-500">
                    {ledgerPagination.totalItems} total record(s)
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Customer Information */}
      {/* <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <User size={20} />
          Customer Information
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Shop Name</label>
              <p className="text-lg font-semibold text-gray-900">{customer.shopName}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Owner Name</label>
              <p className="text-gray-900">{customer.ownerName || 'Not provided'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Number</label>
              <div className="flex items-center gap-2">
                <Phone size={16} className="text-gray-400" />
                <span className="text-gray-900">{customer.contact}</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <div className="flex items-center gap-2">
                <Mail size={16} className="text-gray-400" />
                <span className="text-gray-900">{customer.user?.email || 'Not provided'}</span>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <div className="flex items-start gap-2">
                <MapPin size={16} className="text-gray-400 mt-1" />
                <span className="text-gray-900">{customer.address || 'Not provided'}</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Place</label>
              <p className="text-gray-900">{customer.place || 'Not specified'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">GST/PAN Number</label>
              <div className="flex items-center gap-2">
                <CreditCard size={16} className="text-gray-400" />
                <span className="text-gray-900">{customer.gstOrPanNumber || 'Not provided'}</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Opening Balance</label>
              <div className="flex items-center gap-2">
                <CreditCard size={16} className="text-gray-400" />
                <span className="text-gray-900 font-semibold">₹{(customer.openingBalance || 0).toLocaleString()}</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Current Outstanding Balance</label>
              <div className="flex items-center gap-2">
                <CreditCard size={16} className="text-gray-400" />
                <span className="text-gray-900 font-semibold">₹{(customer.outstandingBalance || 0).toLocaleString()}</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                customer.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {customer.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>
      </div> */}

      {/* Sales Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Birds / Total Weight */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-2">Total Birds / Total Weight</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-purple-600">{totalBirds.toLocaleString()}</p>
                <span className="text-2xl font-bold text-purple-600">/</span>
                <p className="text-2xl font-bold text-purple-600">{totalWeight.toFixed(2)} kg</p>
              </div>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <Package className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        {/* Amount */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Sales Amount</p>
              <p className="text-2xl font-bold text-blue-600">₹{totalSales.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Total Receipt */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Receipt</p>
              <p className="text-2xl font-bold text-green-600">₹{totalReceipt.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <Receipt className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        {/* Outstanding Balance */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Outstanding Balance</p>
              <p className="text-2xl font-bold text-orange-600">₹{(customer.outstandingBalance || 0).toLocaleString()}</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-lg">
              <CreditCard className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Purchase Ledger */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Receipt size={20} className="text-green-600" />
            Purchase Ledger ({ledgerPagination.totalItems} records)
          </h2>
        </div>

        {/* Date Filter & Active Filters Display */}
        <div className="p-6 border-b border-gray-200">
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

        {isLedgerInitialLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : displayedPurchaseLedger.length > 0 || purchaseLedger.length > 0 ? (
          <>
            {/* Ledger Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-3 py-3 text-left font-medium text-gray-700">Sr. No.</th>
                    <th className="px-3 py-3 text-left font-medium text-gray-700">Date</th>
                    <th className="px-3 py-3 text-left font-medium text-gray-700">Particulars</th>
                    <th className="px-3 py-3 text-left font-medium text-gray-700">Invoice No</th>
                    <th className="px-3 py-3 text-right font-medium text-gray-700">Birds</th>
                    <th className="px-3 py-3 text-right font-medium text-gray-700">Weight</th>
                    <th className="px-3 py-3 text-right font-medium text-gray-700">Avg</th>
                    <th className="px-3 py-3 text-right font-medium text-gray-700">Rate</th>
                    <th className="px-3 py-3 text-right font-medium text-gray-700">Amount</th>
                    <th className="px-3 py-3 text-right font-medium text-gray-700">Balance</th>
                    <th className="px-3 py-3 text-left font-medium text-gray-700">Product</th>
                    <th className="px-3 py-3 text-left font-medium text-gray-700">Supervisor</th>
                    <th className="px-3 py-3 text-left font-medium text-gray-700">Driver Name</th>
                    <th className="px-3 py-3 text-left font-medium text-gray-700">Vehicles No</th>
                    <th className="px-3 py-3 text-left font-medium text-gray-700">Trip ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {displayedPurchaseLedger.map((entry, index) => (
                    <tr key={entry._id || index} className="hover:bg-gray-50" ref={index === displayedPurchaseLedger.length - 1 ? lastEntryRef : null}>
                      <td className="px-3 py-3 text-gray-900">
                        {index + 1}
                      </td>
                      <td className="px-3 py-3 text-gray-900">{formatDate(entry.date)}</td>
                      <td className="px-3 py-3">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getParticularsColor(displayParticulars(entry))}`}>
                          {displayParticulars(entry)}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-gray-900">{entry.invoiceNo || '-'}</td>
                      <td className="px-3 py-3 text-right text-gray-900">{entry.birds || 0}</td>
                      <td className="px-3 py-3 text-right text-gray-900">{(entry.weight || 0).toFixed(2)}</td>
                      <td className="px-3 py-3 text-right text-gray-900">{(entry.avgWeight || 0).toFixed(2)}</td>
                      <td className="px-3 py-3 text-right text-gray-900">₹{(entry.rate || 0).toLocaleString()}</td>
                      <td className="px-3 py-3 text-right text-gray-900">₹{(entry.amount || 0).toLocaleString()}</td>
                      <td className="px-3 py-3 text-right font-semibold text-gray-900">₹{(entry.outstandingBalance || 0).toLocaleString()}</td>
                      <td className="px-3 py-3 text-gray-900">{entry.product || '-'}</td>
                      <td className="px-3 py-3 text-gray-900">{entry.supervisor || '-'}</td>
                      <td className="px-3 py-3 text-gray-900">{entry.driverName || '-'}</td>
                      <td className="px-3 py-3 text-gray-900">{entry.vehiclesNo || '-'}</td>
                      <td className="px-3 py-3 text-gray-900">
                        {entry.trip?.tripId ? (
                          <Link
                            to={`/trips/${entry.trip._id}`}
                            className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                          >
                            <Truck size={14} />
                            {entry.trip.tripId}
                          </Link>
                        ) : (
                          '-'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Loading State & End of List */}
            {isFetchingMore && (
              <div className="flex items-center justify-center py-4 border-t border-gray-200">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-sm text-gray-600">Loading more transactions...</span>
              </div>
            )}

            {!isFetchingMore && displayedPurchaseLedger.length > 0 && ledgerPagination.currentPage >= ledgerPagination.totalPages && (
              <div className="p-4 text-center text-sm text-gray-500 border-t border-gray-200 bg-gray-50">
                End of transactions
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8">
            <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-500">
              {isDateFilterActive
                ? 'No purchase records found for the selected date range.'
                : 'No purchase records found for this customer.'}
            </p>
            {isDateFilterActive && (
              <p className="text-sm text-gray-400 mt-1">
                Try adjusting the date range or clear the filter.
              </p>
            )}
          </div>
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
    </div>
  );
};

export default CustomerDetails;
