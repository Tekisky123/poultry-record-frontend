import { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Download, 
  Eye, 
  CreditCard,
  Calendar,
  Package,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Clock,
  X
} from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../lib/axios';
import { useAuth } from '../contexts/AuthContext';

const CustomerSales = () => {
  const { user } = useAuth();
  const [sales, setSales] = useState([]);
  const [filteredSales, setFilteredSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedSale, setSelectedSale] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (user?._id || user?.id) {
      fetchSales();
    }
  }, [user]);

  useEffect(() => {
    filterSales();
  }, [sales, searchTerm, statusFilter]);

    const fetchSales = async () => {
    try {
      const userId = user?._id || user?.id;
      if (!userId) {
        console.error('User ID not found');
        setLoading(false);
        return;
      }
      
      const response = await api.get(`/customer/panel/${userId}/sales`);
      if (response.data.success) {
        setSales(response.data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch sales:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterSales = () => {
    let filtered = sales;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(sale => 
        sale.billNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sale.tripId?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(sale => {
        const balance = sale.balance || 0;
        switch (statusFilter) {
          case 'paid':
            return balance === 0;
          case 'pending':
            return balance > 0;
          case 'overpaid':
            return balance < 0;
          default:
            return true;
        }
      });
    }

    setFilteredSales(filtered);
  };

  const getPaymentStatusColor = (balance) => {
    if (balance === 0) return 'text-green-600 bg-green-100';
    if (balance > 0) return 'text-yellow-600 bg-yellow-100';
    return 'text-blue-600 bg-blue-100';
  };

  const getPaymentStatusText = (balance) => {
    if (balance === 0) return 'Paid';
    if (balance > 0) return 'Pending';
    return 'Overpaid';
  };

  const getPaymentStatusIcon = (balance) => {
    if (balance === 0) return <CheckCircle className="w-4 h-4" />;
    if (balance > 0) return <Clock className="w-4 h-4" />;
    return <AlertCircle className="w-4 h-4" />;
  };

  const exportToCSV = () => {
    const csvContent = [
      ['Bill Number', 'Date', 'Birds', 'Weight (kg)', 'Rate', 'Amount', 'Cash Paid', 'Online Paid', 'Discount', 'Balance', 'Status'],
      ...filteredSales.map(sale => [
        sale.billNumber || '',
        new Date(sale.timestamp).toLocaleDateString(),
        sale.birds || 0,
        sale.weight || 0,
        sale.rate || 0,
        sale.amount || 0,
        sale.cashPaid || 0,
        sale.onlinePaid || 0,
        sale.discount || 0,
        sale.balance || 0,
        getPaymentStatusText(sale.balance || 0)
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `customer-sales-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Purchases</h1>
          <p className="text-gray-600">Track all your purchases and payment status</p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/customer/payments"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <CreditCard size={16} />
            Manage Payments
          </Link>
          <button
            onClick={exportToCSV}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <Download size={16} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search by bill number or trip ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="sm:w-48">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="overpaid">Overpaid</option>
            </select>
          </div>
        </div>
      </div>

      {/* Quick Actions for Outstanding Balances */}
      {filteredSales && filteredSales.some(sale => sale.balance > 0) && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-red-600" />
              <div>
                <h3 className="font-semibold text-red-900">Outstanding Balances</h3>
                <p className="text-sm text-red-700">
                  You have {(filteredSales || []).filter(sale => sale.balance > 0).length} unpaid purchases
                </p>
              </div>
            </div>
            <Link
              to="/customer/payments"
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <CreditCard size={16} />
              Pay Now
            </Link>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Purchases</p>
              <p className="text-2xl font-bold text-gray-900">{filteredSales?.length || 0}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Amount</p>
              <p className="text-2xl font-bold text-gray-900">
                ₹{(filteredSales || []).reduce((sum, sale) => sum + (sale.amount || 0), 0).toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Balance Due</p>
              <p className="text-2xl font-bold text-red-600">
                ₹{(filteredSales || []).reduce((sum, sale) => sum + (sale.balance || 0), 0).toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-red-100 rounded-lg">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Sales List */}
      <div className="card">
        {!filteredSales || filteredSales.length === 0 ? (
          <div className="text-center py-12">
            <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-500 text-lg">No purchases found</p>
            <p className="text-gray-400 mt-1">
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your search or filter criteria'
                : 'Your purchase history will appear here'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredSales.map((sale) => (
              <div key={sale._id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full flex items-center gap-1 ${getPaymentStatusColor(sale.balance || 0)}`}>
                        {getPaymentStatusIcon(sale.balance || 0)}
                        {getPaymentStatusText(sale.balance || 0)}
                      </span>
                      <span className="text-sm text-gray-500">
                        {new Date(sale.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <h3 className="font-semibold text-gray-900">Bill: {sale.billNumber || 'N/A'}</h3>
                        <p className="text-sm text-gray-600">Trip: {sale.tripId || 'N/A'}</p>
                        <p className="text-sm text-gray-600">
                          {sale.birds || 0} birds • {sale.weight || 0} kg • ₹{sale.rate || 0}/kg
                        </p>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-900">₹{(sale.amount || 0).toLocaleString()}</p>
                        <div className="text-sm text-gray-600 space-y-1">
                          <p>Cash: ₹{(sale.cashPaid || 0).toLocaleString()}</p>
                          <p>Online: ₹{(sale.onlinePaid || 0).toLocaleString()}</p>
                          <p>Discount: ₹{(sale.discount || 0).toLocaleString()}</p>
                          <p className="font-medium">Balance: ₹{(sale.balance || 0).toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => {
                      setSelectedSale(sale);
                      setShowModal(true);
                    }}
                    className="ml-4 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Eye size={20} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sale Details Modal */}
      {showModal && selectedSale && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Purchase Details</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Bill Number</label>
                  <p className="text-sm text-gray-900">{selectedSale.billNumber || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Trip ID</label>
                  <p className="text-sm text-gray-900">{selectedSale.tripId || 'N/A'}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Purchase Date</label>
                <p className="text-sm text-gray-900">{new Date(selectedSale.timestamp).toLocaleString()}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Birds</label>
                  <p className="text-sm text-gray-900">{selectedSale.birds || 0}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Weight</label>
                  <p className="text-sm text-gray-900">{selectedSale.weight || 0} kg</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Rate per kg</label>
                  <p className="text-sm text-gray-900">₹{selectedSale.rate || 0}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Total Amount</label>
                  <p className="text-sm font-bold text-gray-900">₹{(selectedSale.amount || 0).toLocaleString()}</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium text-gray-900 mb-2">Payment Details</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Cash Paid:</span>
                    <span className="text-sm text-gray-900">₹{(selectedSale.cashPaid || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Online Paid:</span>
                    <span className="text-sm text-gray-900">₹{(selectedSale.onlinePaid || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Discount:</span>
                    <span className="text-sm text-gray-900">₹{(selectedSale.discount || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-sm font-medium text-gray-900">Balance:</span>
                    <span className={`text-sm font-bold ${(selectedSale.balance || 0) === 0 ? 'text-green-600' : (selectedSale.balance || 0) > 0 ? 'text-red-600' : 'text-blue-600'}`}>
                      ₹{(selectedSale.balance || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerSales;
