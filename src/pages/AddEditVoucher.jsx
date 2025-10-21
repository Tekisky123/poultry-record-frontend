import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  Calendar,
  FileText,
  Users,
  DollarSign,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import api from '../lib/axios';

const AddEditVoucher = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [customers, setCustomers] = useState([]);
  const [vendors, setVendors] = useState([]);
  
  const [formData, setFormData] = useState({
    voucherType: 'Sales',
    date: new Date().toISOString().split('T')[0],
    party: '',
    partyName: '',
    entries: [
      { account: '', debitAmount: 0, creditAmount: 0, narration: '' },
      { account: '', debitAmount: 0, creditAmount: 0, narration: '' }
    ],
    narration: '',
    status: 'draft'
  });

  const voucherTypes = ['Sales', 'Purchase', 'Payment', 'Receipt', 'Contra', 'Journal'];

  useEffect(() => {
    fetchParties();
    if (isEdit) {
      fetchVoucher();
    }
  }, [id]);

  const fetchParties = async () => {
    try {
      const [customersRes, vendorsRes] = await Promise.all([
        api.get('/customer'),
        api.get('/vendor')
      ]);
      
      if (customersRes.data.success) {
        console.log(customersRes.data.data)
        setCustomers(customersRes.data.data);
      }
      if (vendorsRes.data.success) {
        setVendors(vendorsRes.data.data);
      }
    } catch (error) {
      console.error('Error fetching parties:', error);
    }
  };

  const fetchVoucher = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/voucher/${id}`);
      if (response.data.success) {
        const voucher = response.data.data;
        setFormData({
          voucherType: voucher.voucherType,
          date: new Date(voucher.date).toISOString().split('T')[0],
          party: voucher.party?._id || '',
          partyName: voucher.partyName || '',
          entries: voucher.entries.length > 0 ? voucher.entries : [
            { account: '', debitAmount: 0, creditAmount: 0, narration: '' },
            { account: '', debitAmount: 0, creditAmount: 0, narration: '' }
          ],
          narration: voucher.narration || '',
          status: voucher.status
        });
      }
    } catch (error) {
      console.error('Error fetching voucher:', error);
      setError('Failed to fetch voucher details');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleEntryChange = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      entries: prev.entries.map((entry, i) => 
        i === index ? { ...entry, [field]: value } : entry
      )
    }));
  };

  const addEntry = () => {
    setFormData(prev => ({
      ...prev,
      entries: [...prev.entries, { account: '', debitAmount: 0, creditAmount: 0, narration: '' }]
    }));
  };

  const removeEntry = (index) => {
    if (formData.entries.length > 2) {
      setFormData(prev => ({
        ...prev,
        entries: prev.entries.filter((_, i) => i !== index)
      }));
    }
  };

  const handlePartyChange = (partyId) => {
    const customer = customers.find(c => c.id === partyId);
    const vendor = vendors.find(v => v._id === partyId);
    const party = customer || vendor;
    
    setFormData(prev => ({
      ...prev,
      party: partyId,
      partyName: party ? (party.shopName || party.vendorName) : ''
    }));
  };

  const calculateTotals = () => {
    const totalDebit = formData.entries.reduce((sum, entry) => sum + (parseFloat(entry.debitAmount) || 0), 0);
    const totalCredit = formData.entries.reduce((sum, entry) => sum + (parseFloat(entry.creditAmount) || 0), 0);
    return { totalDebit, totalCredit };
  };

  const validateForm = () => {
    const { totalDebit, totalCredit } = calculateTotals();
    
    // Check if debit equals credit
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      setError('Total debit amount must equal total credit amount');
      return false;
    }
    
    // Check if all entries have account names
    for (let entry of formData.entries) {
      if (!entry.account.trim()) {
        setError('All entries must have account names');
        return false;
      }
      if (entry.debitAmount === 0 && entry.creditAmount === 0) {
        setError('Each entry must have either debit or credit amount');
        return false;
      }
      if (entry.debitAmount > 0 && entry.creditAmount > 0) {
        setError('Each entry must have either debit or credit amount, not both');
        return false;
      }
    }
    
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      const submitData = {
        ...formData,
        entries: formData.entries.filter(entry => entry.account.trim() !== '')
      };
      
      let response;
      if (isEdit) {
        response = await api.put(`/voucher/${id}`, submitData);
      } else {
        response = await api.post('/voucher', submitData);
      }
      
      if (response.data.success) {
        navigate('/vouchers');
      }
    } catch (error) {
      console.error('Error saving voucher:', error);
      setError(error.response?.data?.message || 'Failed to save voucher');
    } finally {
      setLoading(false);
    }
  };

  const { totalDebit, totalCredit } = calculateTotals();
  const isBalanced = Math.abs(totalDebit - totalCredit) <= 0.01;

  if (loading && isEdit) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/vouchers"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} className="text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isEdit ? 'Edit Voucher' : 'Add New Voucher'}
            </h1>
            <p className="text-gray-600">
              {isEdit ? 'Update voucher details' : 'Create a new accounting voucher'}
            </p>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border-l-4 border-red-400">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FileText size={20} />
            Basic Information
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Voucher Type *</label>
              <select
                value={formData.voucherType}
                onChange={(e) => handleInputChange('voucherType', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                {voucherTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleInputChange('date', e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Party</label>
              <select
                value={formData.party}
                onChange={(e) => handlePartyChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select Party</option>
                <optgroup label="Customers">
                  {customers.map(customer => (
                    <option key={customer.id} value={customer.id}>
                      {customer.shopName} - {customer.ownerName}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Vendors">
                  {vendors.map(vendor => (
                    <option key={vendor._id} value={vendor._id}>
                      {vendor.vendorName}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Party Name</label>
              <input
                type="text"
                value={formData.partyName}
                onChange={(e) => handleInputChange('partyName', e.target.value)}
                placeholder="Enter party name"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Voucher Entries */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <DollarSign size={20} />
              Voucher Entries
            </h2>
            <button
              type="button"
              onClick={addEntry}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <Plus size={16} />
              Add Entry
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Debit Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Credit Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Narration</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {formData.entries.map((entry, index) => (
                  <tr key={index}>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={entry.account}
                        onChange={(e) => handleEntryChange(index, 'account', e.target.value)}
                        placeholder="Account name"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={entry.debitAmount}
                        onChange={(e) => handleEntryChange(index, 'debitAmount', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={entry.creditAmount}
                        onChange={(e) => handleEntryChange(index, 'creditAmount', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={entry.narration}
                        onChange={(e) => handleEntryChange(index, 'narration', e.target.value)}
                        placeholder="Narration"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </td>
                    <td className="px-4 py-3">
                      {formData.entries.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeEntry(index)}
                          className="text-red-600 hover:text-red-900 p-1"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="text-sm font-medium text-gray-700">
                  Total Debit: <span className="text-red-600 font-bold">₹{totalDebit.toFixed(2)}</span>
                </div>
                <div className="text-sm font-medium text-gray-700">
                  Total Credit: <span className="text-green-600 font-bold">₹{totalCredit.toFixed(2)}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isBalanced ? (
                  <div className="flex items-center gap-1 text-green-600">
                    <CheckCircle size={16} />
                    <span className="text-sm font-medium">Balanced</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-red-600">
                    <AlertCircle size={16} />
                    <span className="text-sm font-medium">Not Balanced</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Narration */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FileText size={20} />
            Additional Information
          </h2>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Narration</label>
            <textarea
              value={formData.narration}
              onChange={(e) => handleInputChange('narration', e.target.value)}
              placeholder="Enter voucher narration..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex items-center justify-end gap-4">
          <Link
            to="/vouchers"
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading || !isBalanced}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <Save size={16} />
            {loading ? 'Saving...' : (isEdit ? 'Update Voucher' : 'Create Voucher')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddEditVoucher;
