import { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Filter, PlusCircle, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import api from '../lib/axios';
import dayjs from 'dayjs';
import SearchableSelect from '../components/SearchableSelect';

// Define report columns - fixed columns cannot be deselected
const REPORT_COLUMNS = [
  {
    key: 'date',
    label: 'Date',
    locked: true,
    defaultSelected: true,
    render: (row) => dayjs(row.date).format('DD MMM YYYY')
  },
  {
    key: 'invoiceNumber',
    label: 'Invoice No',
    locked: true,
    defaultSelected: true,
    render: (row) => row.invoiceNumber
  },
  {
    key: 'customer',
    label: 'Client',
    locked: true,
    defaultSelected: true,
    render: (row) => row.customer
  },
  {
    key: 'vendor',
    label: 'Vendor',
    locked: true,
    defaultSelected: true,
    render: (row) => row.vendor
  },
  {
    key: 'place',
    label: 'Place',
    locked: true,
    defaultSelected: true,
    render: (row) => row.place
  },
  {
    key: 'profit',
    label: 'Net Profit (₹)',
    defaultSelected: true,
    render: (row) => `₹${row.profit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  },
  {
    key: 'margin',
    label: 'Margin (₹/Kg)',
    defaultSelected: true,
    render: (row) => `₹${row.margin.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }
];

const DEFAULT_SELECTED_COLUMNS = REPORT_COLUMNS.filter((col) => col.defaultSelected).map((col) => col.key);
const LOCKED_COLUMN_KEYS = new Set(REPORT_COLUMNS.filter((col) => col.locked).map((col) => col.key));

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
  const [searchParams] = useSearchParams();
  const [records, setRecords] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState(searchParams.get('startDate') || '');
  const [endDate, setEndDate] = useState(searchParams.get('endDate') || '');
  const [vehicleFilter, setVehicleFilter] = useState('');
  const [driverFilter, setDriverFilter] = useState('');
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);
  const [totals, setTotals] = useState({
    totalPurchaseBirds: 0,
    totalPurchaseWeight: 0,
    totalPurchaseAmount: 0,
    totalSalesBirds: 0,
    totalSalesWeight: 0,
    totalSalesAmount: 0,
    mortalityBirds: 0,
    mortalityWeight: 0,
    mortalityAmount: 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    itemsPerPage: 10,
    totalPages: 1,
    totalItems: 0
  });
  const [selectedColumns, setSelectedColumns] = useState(DEFAULT_SELECTED_COLUMNS);
  const [isReportFilterOpen, setIsReportFilterOpen] = useState(false);
  const reportFilterRef = useRef(null);

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
          search: query || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          vehicleNumber: vehicleFilter || undefined,
          driver: driverFilter || undefined
        }
      });

      setRecords(data.data?.records || []);
      setTotals(data.data?.totals || {
        totalPurchaseBirds: 0,
        totalPurchaseWeight: 0,
        totalPurchaseAmount: 0,
        totalSalesBirds: 0,
        totalSalesWeight: 0,
        totalSalesAmount: 0,
        mortalityBirds: 0,
        mortalityWeight: 0,
        mortalityAmount: 0
      });
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
  }, [startDate, endDate, vehicleFilter, driverFilter]);

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
    if (isSubmittingRef.current) return;
    try {
      isSubmittingRef.current = true;
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
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const toggleColumnSelection = (key) => {
    if (LOCKED_COLUMN_KEYS.has(key)) {
      return;
    }
    setSelectedColumns((prev) =>
      prev.includes(key) ? prev.filter((colKey) => colKey !== key) : [...prev, key]
    );
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (reportFilterRef.current && !reportFilterRef.current.contains(event.target)) {
        setIsReportFilterOpen(false);
      }
    };

    if (isReportFilterOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isReportFilterOpen]);

  const activeColumns = useMemo(() => {
    return REPORT_COLUMNS.filter((column) => selectedColumns.includes(column.key));
  }, [selectedColumns]);

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

  const customerOptions = useMemo(() => {
    return customers.map(c => ({
      value: c.id || c._id,
      label: `${c.shopName} — ${c.ownerName || 'N/A'}`
    }));
  }, [customers]);

  const vendorOptions = useMemo(() => {
    return vendors.map(v => ({
      value: v.id || v._id,
      label: `${v.vendorName}${v.companyName ? ` — ${v.companyName}` : ''}`
    }));
  }, [vendors]);

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
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            Search
          </button>
          <button
            type="button"
            onClick={() => setShowFiltersPanel(!showFiltersPanel)}
            className={`px-4 py-2 border rounded-lg transition-colors flex items-center gap-2 text-sm font-medium ${
              showFiltersPanel
                ? 'bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Filter size={16} />
            Filters
          </button>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
          />
          <div className="relative" ref={reportFilterRef}>
            <button
              type="button"
              onClick={() => setIsReportFilterOpen((prev) => !prev)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 border ${isReportFilterOpen
                ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400'
                }`}
            >
              <Filter size={16} />
              <span>Reports Filter</span>
              {isReportFilterOpen ? (
                <ChevronUp size={16} />
              ) : (
                <ChevronDown size={16} />
              )}
            </button>
            {isReportFilterOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-2xl z-50 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-4 text-white">
                  <h3 className="text-sm font-semibold">Choose Columns to Display</h3>
                  <p className="text-xs text-blue-100 mt-1">
                    Yellow highlighted items are default and cannot be deselected
                  </p>
                </div>
                <div className="max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                  {REPORT_COLUMNS.map((option) => {
                    const isChecked = selectedColumns.includes(option.key);
                    return (
                      <label
                        key={option.key}
                        className={`flex items-center justify-between gap-3 px-4 py-3 text-sm cursor-pointer transition-colors ${option.locked
                          ? 'bg-yellow-50 hover:bg-yellow-100 border-l-4 border-yellow-400'
                          : 'hover:bg-gray-50 border-l-4 border-transparent'
                          }`}
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            disabled={option.locked}
                            onChange={() => toggleColumnSelection(option.key)}
                            className={`h-4 w-4 rounded border-gray-300 focus:ring-2 focus:ring-blue-500 ${option.locked
                              ? 'text-yellow-600 cursor-not-allowed'
                              : 'text-blue-600 cursor-pointer'
                              }`}
                          />
                          <span className={`flex-1 ${option.locked ? 'font-medium text-gray-900' : 'text-gray-700'}`}>
                            {option.label}
                          </span>
                        </div>
                        {option.locked && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-yellow-200 text-yellow-800 rounded-full">
                            Default
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
                <div className="p-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                  <span className="text-xs text-gray-600">
                    {selectedColumns.length} of {REPORT_COLUMNS.length} columns selected
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsReportFilterOpen(false)}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </form>
      </div>

      {/* Filters Collapsible Panel */}
      {showFiltersPanel && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-1 duration-200">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Customers Vehicle No</label>
            <input
              type="text"
              value={vehicleFilter}
              onChange={(e) => setVehicleFilter(e.target.value)}
              placeholder="Search by customer vehicle number..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Driver Name</label>
            <input
              type="text"
              value={driverFilter}
              onChange={(e) => setDriverFilter(e.target.value)}
              placeholder="Search by driver name..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white"
            />
          </div>
        </div>
      )}

      {/* Aggregate Totals Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Purchase Stats Card */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-100">
          <h3 className="text-sm font-semibold text-blue-800 uppercase tracking-wider mb-3">Total Purchase Summary</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Total Birds Purchase:</span>
              <span className="font-bold text-gray-900">{totals.totalPurchaseBirds.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>Total Weight Purchase:</span>
              <span className="font-bold text-gray-900">{totals.totalPurchaseWeight.toLocaleString()} Kg</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>Total Amount Purchase:</span>
              <span className="font-bold text-blue-600">₹{totals.totalPurchaseAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        {/* Sales Stats Card */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-xl border border-green-100">
          <h3 className="text-sm font-semibold text-green-800 uppercase tracking-wider mb-3">Total Sales Summary</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Total Birds Sales:</span>
              <span className="font-bold text-gray-900">{totals.totalSalesBirds.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>Total Weight Sales:</span>
              <span className="font-bold text-gray-900">{totals.totalSalesWeight.toLocaleString()} Kg</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>Total Amount Sales:</span>
              <span className="font-bold text-green-600">₹{totals.totalSalesAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        {/* Mortality Stats Card */}
        <div className="bg-gradient-to-r from-red-50 to-rose-50 p-6 rounded-xl border border-red-100">
          <h3 className="text-sm font-semibold text-red-800 uppercase tracking-wider mb-3">Total Mortality Summary</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Mortality Birds:</span>
              <span className="font-bold text-gray-900">{totals.mortalityBirds.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>Mortality Weight:</span>
              <span className="font-bold text-gray-900">{totals.mortalityWeight.toLocaleString()} Kg</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>Mortality Amount:</span>
              <span className="font-bold text-red-600">₹{totals.mortalityAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {activeColumns.map((column) => (
                  <th
                    key={column.key}
                    className={`px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider ${
                      ['profit', 'margin'].includes(column.key)
                      ? 'text-right'
                      : 'text-left'
                    }`}
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading && (
                <tr>
                  <td colSpan={activeColumns.length} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                      Loading records...
                    </div>
                  </td>
                </tr>
              )}

              {!loading && !hasRecords && (
                <tr>
                  <td colSpan={activeColumns.length} className="px-6 py-12 text-center text-gray-500">
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
                  {activeColumns.map((column) => (
                    <td
                      key={column.key}
                      className={`px-6 py-4 whitespace-nowrap text-sm ${
                        column.key === 'date' ? 'font-medium text-blue-600 hover:underline text-left' : ''
                      } ${
                        ['profit', 'margin'].includes(column.key)
                        ? 'text-right text-gray-900'
                        : 'text-left text-gray-900'
                      } ${
                        column.key === 'profit' ? (row.profit >= 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold') : ''
                      }`}
                    >
                      {column.render(row)}
                    </td>
                  ))}
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
                  <SearchableSelect
                    value={formData.customer}
                    onChange={handleCustomerChange}
                    options={customerOptions}
                    placeholder="Select customer"
                    searchPlaceholder="Search customer name..."
                    emptyMessage="No customers found"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vendor *
                  </label>
                  <SearchableSelect
                    value={formData.vendor}
                    onChange={(val) => setFormData(prev => ({ ...prev, vendor: val }))}
                    options={vendorOptions}
                    placeholder="Select vendor"
                    searchPlaceholder="Search vendor name..."
                    emptyMessage="No vendors found"
                    required
                  />
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

