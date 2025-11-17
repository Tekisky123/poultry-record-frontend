import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, PlusCircle, Loader2 } from 'lucide-react';
import api from '../lib/axios';
import dayjs from 'dayjs';

const INITIAL_FORM = {
  date: dayjs().format('YYYY-MM-DD'),
  customer: '',
  vendor: '',
  place: '',
  vehicleNumber: '',
  driver: '',
  notes: ''
};

export default function IndirectSales() {
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    itemsPerPage: 10,
    totalPages: 1,
    totalItems: 0
  });

  const loadCustomersAndVendors = async () => {
    try {
      const [customerRes, vendorRes] = await Promise.all([
        api.get('/customer'),
        api.get('/vendor')
      ]);
      setCustomers(customerRes.data?.data || []);
      setVendors(vendorRes.data?.data || []);
    } catch (err) {
      console.error('Failed to load dropdown data', err);
    }
  };

  const fetchRecords = async (page = pagination.currentPage, query = searchTerm) => {
    try {
      setLoading(true);
      const { data } = await api.get('/indirect-sales', {
        params: {
          page,
          limit: pagination.itemsPerPage,
          search: query || undefined
        }
      });

      setRecords(data.data?.records || []);
      if (data.data?.pagination) {
        setPagination(data.data.pagination);
      } else {
        setPagination(prev => ({
          ...prev,
          currentPage: page
        }));
      }
      setError('');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to load indirect purchases and sales.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords(1);
    loadCustomersAndVendors();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = (event) => {
    event.preventDefault();
    fetchRecords(1, searchTerm);
  };

  const handlePageChange = (direction) => {
    const newPage = pagination.currentPage + direction;
    if (newPage < 1 || newPage > pagination.totalPages) return;
    fetchRecords(newPage);
  };

  const handleOpenCreate = () => {
    setFormData(INITIAL_FORM);
    setIsCreateModalOpen(true);
  };

  const handleCustomerChange = (value) => {
    const selected = customers.find(item => item.id === value || item._id === value);
    setFormData(prev => ({
      ...prev,
      customer: value,
      place: selected?.place || prev.place
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      setIsSubmitting(true);
      const payload = {
        date: formData.date,
        customer: formData.customer,
        vendor: formData.vendor,
        place: formData.place,
        vehicleNumber: formData.vehicleNumber,
        driver: formData.driver,
        notes: formData.notes
      };

      const { data } = await api.post('/indirect-sales', payload);
      setIsCreateModalOpen(false);
      setFormData(INITIAL_FORM);
      fetchRecords(1);
      if (data.data?.id) {
        navigate(`/indirect-sales/${data.data.id}`);
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to create indirect purchase and sale.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasRecords = records.length > 0;

  const tableRows = useMemo(() => {
    return records.map(record => {
      const profit = record.summary?.netProfit || 0;
      const margin = record.summary?.margin || 0;
      return {
        id: record.id,
        date: record.date,
        invoiceNumber: record.invoiceNumber || '—',
        customer: record.customer?.shopName || 'N/A',
        vendor: record.vendor?.vendorName || 'N/A',
        place: record.place || 'N/A',
        profit,
        margin
      };
    });
  }, [records]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Indirect Purchase &amp; Sales</h1>
          <p className="text-gray-600 mt-1">
            Manage third-party purchase and sales engagements with automatic profitability tracking.
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow transition-colors"
        >
          <PlusCircle size={18} />
          Create
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <form onSubmit={handleSearch} className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by place, driver, vehicle number..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Search
          </button>
          <button
            type="button"
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 text-gray-700"
          >
            <Filter size={16} />
            Filters
          </button>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Invoice No</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Client</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Vendor</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Place</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Net Profit (₹)</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Margin (₹/Kg)</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                      Loading records...
                    </div>
                  </td>
                </tr>
              )}

              {!loading && !hasRecords && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No indirect purchase and sales records found. Create one to get started.
                  </td>
                </tr>
              )}

              {!loading && tableRows.map(row => (
                <tr
                  key={row.id}
                  className="hover:bg-blue-50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/indirect-sales/${row.id}`)}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {dayjs(row.date).format('DD MMM YYYY')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {row.invoiceNumber}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {row.customer}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {row.vendor}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {row.place}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                    ₹{row.profit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                    ₹{row.margin.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {hasRecords && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
            <p className="text-sm text-gray-600">
              Page {pagination.currentPage} of {pagination.totalPages} — {pagination.totalItems} records
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => handlePageChange(-1)}
                disabled={pagination.currentPage === 1}
                className="px-3 py-1 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => handlePageChange(1)}
                disabled={pagination.currentPage === pagination.totalPages}
                className="px-3 py-1 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 px-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Create Indirect Purchase &amp; Sale</h2>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(event) => setFormData(prev => ({ ...prev, date: event.target.value }))}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Customer *
                  </label>
                  <select
                    value={formData.customer}
                    onChange={(event) => handleCustomerChange(event.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select customer</option>
                    {customers.map(customer => (
                      <option key={customer.id || customer._id} value={customer.id || customer._id}>
                        {customer.shopName} — {customer.ownerName || 'N/A'}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vendor *
                  </label>
                  <select
                    value={formData.vendor}
                    onChange={(event) => setFormData(prev => ({ ...prev, vendor: event.target.value }))}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select vendor</option>
                    {vendors.map(vendor => (
                      <option key={vendor.id || vendor._id} value={vendor.id || vendor._id}>
                        {vendor.vendorName} {vendor.companyName ? `— ${vendor.companyName}` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Place *
                  </label>
                  <input
                    type="text"
                    value={formData.place}
                    onChange={(event) => setFormData(prev => ({ ...prev, place: event.target.value }))}
                    required
                    placeholder="Customer place"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vehicle Number
                  </label>
                  <input
                    type="text"
                    value={formData.vehicleNumber}
                    onChange={(event) => setFormData(prev => ({ ...prev, vehicleNumber: event.target.value }))}
                    placeholder="Vehicle number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Driver
                  </label>
                  <input
                    type="text"
                    value={formData.driver}
                    onChange={(event) => setFormData(prev => ({ ...prev, driver: event.target.value }))}
                    placeholder="Driver name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(event) => setFormData(prev => ({ ...prev, notes: event.target.value }))}
                  rows={3}
                  placeholder="Any additional information regarding this indirect sale..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

