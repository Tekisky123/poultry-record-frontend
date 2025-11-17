import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../lib/axios';
import dayjs from 'dayjs';
import {
  ArrowLeft,
  Edit,
  PlusCircle,
  Loader2,
  Trash2,
  Pencil,
  FileSpreadsheet
} from 'lucide-react';
import { downloadIndirectSaleInvoice } from '../utils/downloadIndirectSaleInvoice';
import { downloadIndirectSaleReport } from '../utils/downloadIndirectSaleReport';

const emptyRecord = {
  date: '',
  customer: null,
  vendor: null,
  place: '',
  vehicleNumber: '',
  driver: '',
  purchases: [],
  mortality: {},
  sales: {},
  summary: {}
};

const formatCurrency = (value) => {
  const num = Number(value) || 0;
  return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatNumber = (value, digits = 2) => {
  const num = Number(value) || 0;
  return num.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits });
};

const Modal = ({ title, children, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 px-4">
    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          ✕
        </button>
      </div>
      <div className="px-6 py-6">
        {children}
      </div>
    </div>
  </div>
);

export default function IndirectSaleDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [record, setRecord] = useState(emptyRecord);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [detailForm, setDetailForm] = useState({
    date: '',
    customer: '',
    vendor: '',
    place: '',
    vehicleNumber: '',
    driver: '',
    notes: ''
  });
  const [customers, setCustomers] = useState([]);
  const [vendors, setVendors] = useState([]);

  const [purchaseModal, setPurchaseModal] = useState({ open: false, mode: 'add', data: { dcNumber: '', birds: '', weight: '', rate: '' } });
  const [mortalityModalOpen, setMortalityModalOpen] = useState(false);
  const [mortalityBirds, setMortalityBirds] = useState('');
  const [salesModalOpen, setSalesModalOpen] = useState(false);
  const [salesRate, setSalesRate] = useState('');

  const loadDropdownData = async () => {
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

  const fetchRecord = async () => {
    try {
      setLoading(true);
      const { data } = await api.get(`/indirect-sales/${id}`);
      setRecord(data.data || emptyRecord);
      setError('');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to load record');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecord();
    loadDropdownData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleDetailEdit = () => {
    setDetailForm({
      date: dayjs(record.date).format('YYYY-MM-DD'),
      customer: record.customer?.id || record.customer?._id || '',
      vendor: record.vendor?.id || record.vendor?._id || '',
      place: record.place || '',
      vehicleNumber: record.vehicleNumber || '',
      driver: record.driver || '',
      notes: record.notes || ''
    });
    setIsDetailModalOpen(true);
  };

  const submitDetails = async (event) => {
    event.preventDefault();
    try {
      const payload = {
        date: detailForm.date,
        customer: detailForm.customer,
        vendor: detailForm.vendor,
        place: detailForm.place,
        vehicleNumber: detailForm.vehicleNumber,
        driver: detailForm.driver,
        notes: detailForm.notes
      };
      const { data } = await api.put(`/indirect-sales/${id}`, payload);
      setRecord(data.data);
      setIsDetailModalOpen(false);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to update details');
    }
  };

  const handleCustomerChange = (value) => {
    const selected = customers.find(item => item.id === value || item._id === value);
    setDetailForm(prev => ({
      ...prev,
      customer: value,
      place: selected?.place || prev.place
    }));
  };

  const handleAddPurchase = () => {
    setPurchaseModal({ open: true, mode: 'add', data: { dcNumber: '', birds: '', weight: '', rate: '' } });
  };

  const handleEditPurchase = (purchase) => {
    setPurchaseModal({
      open: true,
      mode: 'edit',
      data: {
        id: purchase._id,
        dcNumber: purchase.dcNumber || '',
        birds: purchase.birds?.toString() || '',
        weight: purchase.weight?.toString() || '',
        rate: purchase.rate?.toString() || ''
      }
    });
  };

  const submitPurchase = async (event) => {
    event.preventDefault();
    try {
      const payload = {
        dcNumber: purchaseModal.data.dcNumber,
        birds: Number(purchaseModal.data.birds),
        weight: Number(purchaseModal.data.weight),
        rate: Number(purchaseModal.data.rate)
      };

      let response;
      if (purchaseModal.mode === 'add') {
        response = await api.post(`/indirect-sales/${id}/purchases`, payload);
      } else {
        response = await api.put(`/indirect-sales/${id}/purchases/${purchaseModal.data.id}`, payload);
      }
      setRecord(response.data.data);
      setPurchaseModal({ open: false, mode: 'add', data: { dcNumber: '', birds: '', weight: '', rate: '' } });
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to save purchase item');
    }
  };

  const handleDeletePurchase = async (purchaseId) => {
    if (!window.confirm('Remove this purchase item?')) return;
    try {
      const { data } = await api.delete(`/indirect-sales/${id}/purchases/${purchaseId}`);
      setRecord(data.data);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to delete purchase item');
    }
  };

  const submitMortality = async (event) => {
    event.preventDefault();
    try {
      const { data } = await api.put(`/indirect-sales/${id}/mortality`, {
        birds: Number(mortalityBirds)
      });
      setRecord(data.data);
      setMortalityModalOpen(false);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to update mortality');
    }
  };

  const submitSales = async (event) => {
    event.preventDefault();
    try {
      const { data } = await api.put(`/indirect-sales/${id}/sales`, {
        rate: Number(salesRate)
      });
      setRecord(data.data);
      setSalesModalOpen(false);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to update sales');
    }
  };

  const purchaseTotals = useMemo(() => ({
    birds: record.summary?.totalPurchaseBirds || 0,
    weight: record.summary?.totalPurchaseWeight || 0,
    avg: record.summary?.totalPurchaseAverage || 0,
    rate: record.summary?.totalPurchaseRate || 0,
    amount: record.summary?.totalPurchaseAmount || 0
  }), [record.summary]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition-colors"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft size={18} />
          Back
        </button>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => downloadIndirectSaleReport(record)}
            className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <FileSpreadsheet size={18} />
            Download Report
          </button>
          <button
            onClick={() => downloadIndirectSaleInvoice(record)}
            className="inline-flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
          >
            <FileSpreadsheet size={18} />
            Generate Invoice
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="flex items-start justify-between px-6 py-5 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Particulars</h2>
            <p className="text-sm text-gray-500">Overview of indirect purchase &amp; sales engagement</p>
          </div>
          <button
            onClick={handleDetailEdit}
            className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
          >
            <Edit size={16} />
            Edit
          </button>
        </div>
        <div className="px-6 py-5 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Date</p>
            <p className="text-sm font-medium text-gray-900 mt-1">
              {dayjs(record.date).format('DD MMM YYYY')}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Invoice No</p>
            <p className="text-sm font-medium text-gray-900 mt-1">
              {record.invoiceNumber || '—'}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Customer</p>
            <p className="text-sm font-medium text-gray-900 mt-1">
              {record.customer?.shopName || 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Vendor</p>
            <p className="text-sm font-medium text-gray-900 mt-1">
              {record.vendor?.vendorName || 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Place</p>
            <p className="text-sm font-medium text-gray-900 mt-1">
              {record.place || 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Vehicle Number</p>
            <p className="text-sm font-medium text-gray-900 mt-1">
              {record.vehicleNumber || 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Driver</p>
            <p className="text-sm font-medium text-gray-900 mt-1">
              {record.driver || 'N/A'}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Purchase Details</h3>
            <p className="text-sm text-gray-500">Manage individual purchase consignments</p>
          </div>
          <button
            onClick={handleAddPurchase}
            className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow"
          >
            <PlusCircle size={16} />
            Add Purchase
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">SL No</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">DC No</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Birds</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Weight (Kg)</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Avg Wt</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Rate (₹/Kg)</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount (₹)</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {record.purchases.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    No purchase records yet.
                  </td>
                </tr>
              )}

              {record.purchases.map((purchase, index) => (
                <tr key={purchase._id}>
                  <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900">{index + 1}</td>
                  <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900">{purchase.dcNumber || '—'}</td>
                  <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900 text-right">{formatNumber(purchase.birds, 0)}</td>
                  <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900 text-right">{formatNumber(purchase.weight)}</td>
                  <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900 text-right">{formatNumber(purchase.avg)}</td>
                  <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900 text-right">{formatCurrency(purchase.rate)}</td>
                  <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900 text-right">{formatCurrency(purchase.amount)}</td>
                  <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleEditPurchase(purchase)}
                        className="p-1 text-blue-600 hover:text-blue-800 transition-colors"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => handleDeletePurchase(purchase._id)}
                        className="p-1 text-red-600 hover:text-red-800 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {record.purchases.length > 0 && (
                <tr className="bg-blue-50 font-semibold text-gray-900">
                  <td className="px-6 py-3 whitespace-nowrap text-sm">Total</td>
                  <td className="px-6 py-3 whitespace-nowrap text-sm">—</td>
                  <td className="px-6 py-3 whitespace-nowrap text-sm text-right">{formatNumber(purchaseTotals.birds, 0)}</td>
                  <td className="px-6 py-3 whitespace-nowrap text-sm text-right">{formatNumber(purchaseTotals.weight)}</td>
                  <td className="px-6 py-3 whitespace-nowrap text-sm text-right">{formatNumber(purchaseTotals.avg)}</td>
                  <td className="px-6 py-3 whitespace-nowrap text-sm text-right">{formatCurrency(purchaseTotals.rate)}</td>
                  <td className="px-6 py-3 whitespace-nowrap text-sm text-right">{formatCurrency(purchaseTotals.amount)}</td>
                  <td className="px-6 py-3 whitespace-nowrap text-sm text-right">—</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Mortality Details</h3>
              <p className="text-sm text-gray-500">Capture mortality to adjust saleable quantity</p>
            </div>
            <button
              onClick={() => {
                setMortalityBirds(record.mortality?.birds?.toString() || '');
                setMortalityModalOpen(true);
              }}
              className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
            >
              <Edit size={16} />
              Edit
            </button>
          </div>
          <div className="px-6 py-6 grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Mortality Birds</p>
              <p className="text-gray-900 font-medium mt-1">{formatNumber(record.mortality?.birds || 0, 0)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Mortality Weight (Kg)</p>
              <p className="text-gray-900 font-medium mt-1">{formatNumber(record.mortality?.weight || 0)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Avg Weight (Kg)</p>
              <p className="text-gray-900 font-medium mt-1">{formatNumber(record.mortality?.avgWeight || 0)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Rate (₹/Kg)</p>
              <p className="text-gray-900 font-medium mt-1">{formatCurrency(record.mortality?.rate || 0)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Amount (₹)</p>
              <p className="text-gray-900 font-medium mt-1">{formatCurrency(record.mortality?.amount || 0)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Sales Details</h3>
              <p className="text-sm text-gray-500">Final sale values derived from purchases and mortality</p>
            </div>
            <button
              onClick={() => {
                setSalesRate(record.sales?.rate?.toString() || '');
                setSalesModalOpen(true);
              }}
              className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
            >
              <Edit size={16} />
              Edit
            </button>
          </div>
          <div className="px-6 py-6 grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Sale Birds</p>
              <p className="text-gray-900 font-medium mt-1">{formatNumber(record.sales?.birds || 0, 0)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Sale Weight (Kg)</p>
              <p className="text-gray-900 font-medium mt-1">{formatNumber(record.sales?.weight || 0)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Avg Weight (Kg)</p>
              <p className="text-gray-900 font-medium mt-1">{formatNumber(record.sales?.avgWeight || 0)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Rate (₹/Kg)</p>
              <p className="text-gray-900 font-medium mt-1">{formatCurrency(record.sales?.rate || 0)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Amount (₹)</p>
              <p className="text-gray-900 font-medium mt-1">{formatCurrency(record.sales?.amount || 0)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Financial Summary</h3>
          <p className="text-sm text-gray-500">Automatically calculated profitability snapshot</p>
        </div>
        <div className="px-6 py-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Sales Amount</p>
              <p className="text-2xl font-semibold text-gray-900 mt-2">
                ₹{formatCurrency(record.summary?.salesAmount || 0)}
              </p>
            </div>
            <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Purchase Amount</p>
              <p className="text-2xl font-semibold text-gray-900 mt-2">
                ₹{formatCurrency(record.summary?.purchaseAmount || 0)}
              </p>
            </div>
            <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Gross Profit</p>
              <p className="text-2xl font-semibold text-gray-900 mt-2">
                ₹{formatCurrency(record.summary?.grossProfit || 0)}
              </p>
            </div>
            <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Mortality / Wastage Loss</p>
              <p className="text-2xl font-semibold text-gray-900 mt-2">
                ₹{formatCurrency(record.summary?.mortalityAmount || 0)}
              </p>
            </div>
            <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Net Profit</p>
              <p className="text-2xl font-semibold text-gray-900 mt-2">
                ₹{formatCurrency(record.summary?.netProfit || 0)}
              </p>
            </div>
            <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Margin (₹/Kg)</p>
              <p className="text-2xl font-semibold text-gray-900 mt-2">
                ₹{formatCurrency(record.summary?.margin || 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Detail Edit Modal */}
      {isDetailModalOpen && (
        <Modal title="Edit Particulars" onClose={() => setIsDetailModalOpen(false)}>
          <form onSubmit={submitDetails} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
              <input
                type="date"
                value={detailForm.date}
                onChange={(event) => setDetailForm(prev => ({ ...prev, date: event.target.value }))}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Customer *</label>
              <select
                value={detailForm.customer}
                onChange={(event) => handleCustomerChange(event.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select customer</option>
                {customers.map(customer => (
                  <option key={customer.id || customer._id} value={customer.id || customer._id}>
                    {customer.shopName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vendor *</label>
              <select
                value={detailForm.vendor}
                onChange={(event) => setDetailForm(prev => ({ ...prev, vendor: event.target.value }))}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select vendor</option>
                {vendors.map(vendor => (
                  <option key={vendor.id || vendor._id} value={vendor.id || vendor._id}>
                    {vendor.vendorName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Place *</label>
              <input
                type="text"
                value={detailForm.place}
                onChange={(event) => setDetailForm(prev => ({ ...prev, place: event.target.value }))}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Number</label>
                <input
                  type="text"
                  value={detailForm.vehicleNumber}
                  onChange={(event) => setDetailForm(prev => ({ ...prev, vehicleNumber: event.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Driver</label>
                <input
                  type="text"
                  value={detailForm.driver}
                  onChange={(event) => setDetailForm(prev => ({ ...prev, driver: event.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={detailForm.notes}
                onChange={(event) => setDetailForm(prev => ({ ...prev, notes: event.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Save Changes
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Purchase Modal */}
      {purchaseModal.open && (
        <Modal
          title={purchaseModal.mode === 'add' ? 'Add Purchase Item' : 'Edit Purchase Item'}
          onClose={() => setPurchaseModal({ open: false, mode: 'add', data: { dcNumber: '', birds: '', weight: '', rate: '' } })}
        >
          <form onSubmit={submitPurchase} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Challan No</label>
              <input
                type="text"
                value={purchaseModal.data.dcNumber}
                onChange={(event) => setPurchaseModal(prev => ({
                  ...prev,
                  data: { ...prev.data, dcNumber: event.target.value }
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Birds *</label>
                <input
                  type="number"
                  min="0"
                  value={purchaseModal.data.birds}
                  onChange={(event) => setPurchaseModal(prev => ({
                    ...prev,
                    data: { ...prev.data, birds: event.target.value }
                  }))}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Weight (Kg) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={purchaseModal.data.weight}
                  onChange={(event) => setPurchaseModal(prev => ({
                    ...prev,
                    data: { ...prev.data, weight: event.target.value }
                  }))}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rate (₹/Kg) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={purchaseModal.data.rate}
                  onChange={(event) => setPurchaseModal(prev => ({
                    ...prev,
                    data: { ...prev.data, rate: event.target.value }
                  }))}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPurchaseModal({ open: false, mode: 'add', data: { dcNumber: '', birds: '', weight: '', rate: '' } })}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {purchaseModal.mode === 'add' ? 'Add' : 'Save'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Mortality Modal */}
      {mortalityModalOpen && (
        <Modal title="Update Mortality" onClose={() => setMortalityModalOpen(false)}>
          <form onSubmit={submitMortality} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mortality Birds *</label>
              <input
                type="number"
                min="0"
                value={mortalityBirds}
                onChange={(event) => setMortalityBirds(event.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setMortalityModalOpen(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Save
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Sales Modal */}
      {salesModalOpen && (
        <Modal title="Update Sales Rate" onClose={() => setSalesModalOpen(false)}>
          <form onSubmit={submitSales} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sales Rate (₹/Kg) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={salesRate}
                onChange={(event) => setSalesRate(event.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSalesModalOpen(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Save
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

