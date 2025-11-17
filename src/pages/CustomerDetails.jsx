import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
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
  RefreshCw
} from 'lucide-react';
import api from '../lib/axios';
import { downloadCustomerLedgerExcel } from '../utils/downloadCustomerLedgerExcel';

const CustomerDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
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
  const [ledgerLoading, setLedgerLoading] = useState(true);
  const [loadingPagination, setLoadingPagination] = useState(false);
  const [refreshingPurchases, setRefreshingPurchases] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) {
      fetchCustomerDetails();
    }
  }, [id]);

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
      } else {
        setLedgerLoading(true);
      }
      
      if (!customer?.user?._id) return;

      const itemsPerPage = ledgerPagination.itemsPerPage || 10;
      
      // Fetch purchase ledger data
      const ledgerResponse = await api.get(`/customer/panel/${customer.user._id}/purchase-ledger?page=${page}&limit=${itemsPerPage}`);
      if (ledgerResponse.data.success) {
        const ledgerData = ledgerResponse.data.data;
        setPurchaseLedger(ledgerData.ledger || []);
        setLedgerTotals(ledgerData.totals || {});
        
        // Update pagination state
        if (ledgerData.pagination) {
          setLedgerPagination(ledgerData.pagination);
        }
      }
    } catch (error) {
      console.error('Error fetching purchase ledger:', error);
    } finally {
      if (isRefresh) {
        setRefreshingPurchases(false);
      } else {
        setLedgerLoading(false);
      }
      setLoadingPagination(false);
    }
  };

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

  const handleBack = () => {
    navigate('/customers');
  };

  const handleDownloadLedger = () => {
    if (purchaseLedger.length === 0) {
      alert('No data available to download');
      return;
    }
    
    const success = downloadCustomerLedgerExcel(purchaseLedger, customer?.shopName || 'Customer');
    if (success) {
      alert('Excel file downloaded successfully!');
    } else {
      alert('Failed to download Excel file. Please try again.');
    }
  };

  const getParticularsColor = (particulars) => {
    switch (particulars) {
      case 'SALES':
        return 'bg-blue-100 text-blue-800';
      case 'RECEIPT':
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
            onClick={() => fetchPurchaseLedger(ledgerPagination.currentPage, true)}
            disabled={refreshingPurchases}
            className="flex items-center gap-2 px-3 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Refresh purchase records"
          >
            <RefreshCw className={`w-4 h-4 ${refreshingPurchases ? 'animate-spin' : ''}`} />
            {refreshingPurchases ? 'Refreshing...' : 'Refresh'}
          </button>
          <button
            onClick={handleDownloadLedger}
            disabled={purchaseLedger.length === 0}
            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <Download size={16} />
            Download Excel
          </button>
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
                <span className="text-sm text-gray-500">/</span>
                <p className="text-lg font-semibold text-gray-700">{totalWeight.toFixed(2)} kg</p>
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
              <p className="text-sm text-gray-600">Amount</p>
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

        {ledgerLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : purchaseLedger.length > 0 ? (
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
                    <th className="px-3 py-3 text-left font-medium text-gray-700">Trip ID</th>
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
                      <td className="px-3 py-3 text-gray-900">{entry.vehiclesNo || '-'}</td>
                      <td className="px-3 py-3 text-gray-900">{entry.driverName || '-'}</td>
                      <td className="px-3 py-3 text-gray-900">{entry.supervisor || '-'}</td>
                      <td className="px-3 py-3 text-gray-900">{entry.product || '-'}</td>
                      <td className="px-3 py-3">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getParticularsColor(entry.particulars)}`}>
                          {entry.particulars}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-gray-900">{entry.invoiceNo || '-'}</td>
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
                      <td className="px-3 py-3 text-right text-gray-900">{entry.birds || 0}</td>
                      <td className="px-3 py-3 text-right text-gray-900">{(entry.weight || 0).toFixed(2)}</td>
                      <td className="px-3 py-3 text-right text-gray-900">{(entry.avgWeight || 0).toFixed(2)}</td>
                      <td className="px-3 py-3 text-right text-gray-900">₹{(entry.rate || 0).toLocaleString()}</td>
                      <td className="px-3 py-3 text-right text-gray-900">₹{(entry.amount || 0).toLocaleString()}</td>
                      <td className="px-3 py-3 text-right font-semibold text-gray-900">₹{(entry.outstandingBalance || 0).toLocaleString()}</td>
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
        ) : (
          <div className="text-center py-8">
            <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-500">No purchase records found for this customer.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerDetails;
