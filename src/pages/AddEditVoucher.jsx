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

const ALLOWED_VOUCHER_TYPES = ['Payment', 'Receipt', 'Contra', 'Journal'];

const AddEditVoucher = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [customers, setCustomers] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [ledgers, setLedgers] = useState([]);
  const [partyBalanceLabel, setPartyBalanceLabel] = useState('');
  
  const [formData, setFormData] = useState({
    voucherType: ALLOWED_VOUCHER_TYPES[0],
    voucherNumber: '',
    date: new Date().toISOString().split('T')[0],
    party: '',
    partyName: '',
    entries: [
      { account: '', debitAmount: 0, creditAmount: 0, narration: '', type: 'Dr' },
      { account: '', debitAmount: 0, creditAmount: 0, narration: '', type: 'Cr' }
    ],
    narration: '',
    status: 'draft'
  });

  useEffect(() => {
    fetchMasterData();
    if (isEdit) {
      fetchVoucher();
    } else {
      fetchNextVoucherNumber();
    }
  }, [id]);
  const fetchNextVoucherNumber = async () => {
    try {
      const { data } = await api.get('/voucher/next-number');
      if (data.success) {
        setFormData(prev => ({
          ...prev,
          voucherNumber: data.data.voucherNumber
        }));
      }
    } catch (error) {
      console.error('Error fetching next voucher number:', error);
    }
  };


  const fetchMasterData = async () => {
    try {
      const [customersRes, vendorsRes, ledgersRes] = await Promise.all([
        api.get('/customer'),
        api.get('/vendor'),
        api.get('/ledger')
      ]);
      
      if (customersRes.data.success) {
        setCustomers(customersRes.data.data);
      }
      if (vendorsRes.data.success) {
        setVendors(vendorsRes.data.data);
      }
      if (ledgersRes.data.success) {
        setLedgers(ledgersRes.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching master data:', error);
    }
  };

  const fetchVoucher = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/voucher/${id}`);
      if (response.data.success) {
        const voucher = response.data.data;
        const normalizedEntries = (voucher.entries.length > 0 ? voucher.entries : [
          { account: '', debitAmount: 0, creditAmount: 0, narration: '' },
          { account: '', debitAmount: 0, creditAmount: 0, narration: '' }
        ]).map(entry => ({
          ...entry,
          type: entry.debitAmount > 0 ? 'Dr' : 'Cr'
        }));
        const resolvedVoucherType = ALLOWED_VOUCHER_TYPES.includes(voucher.voucherType)
          ? voucher.voucherType
          : ALLOWED_VOUCHER_TYPES[0];
        setFormData({
          voucherType: resolvedVoucherType,
          voucherNumber: voucher.voucherNumber || '',
          date: new Date(voucher.date).toISOString().split('T')[0],
          party: voucher.party?._id || '',
          partyName: voucher.partyName || '',
          entries: normalizedEntries,
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

  const toggleEntryType = (index) => {
    setFormData(prev => ({
      ...prev,
      entries: prev.entries.map((entry, i) => {
        if (i !== index) return entry;
        const amount = entry.debitAmount || entry.creditAmount || 0;
        const newType = entry.type === 'Dr' ? 'Cr' : 'Dr';
        return {
          ...entry,
          type: newType,
          debitAmount: newType === 'Dr' ? amount : 0,
          creditAmount: newType === 'Cr' ? amount : 0
        };
      })
    }));
  };

  const addEntry = () => {
    setFormData(prev => ({
      ...prev,
      entries: [...prev.entries, { account: '', debitAmount: 0, creditAmount: 0, narration: '', type: 'Dr' }]
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

    updatePartyBalanceLabel(partyId);
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
        entries: formData.entries
          .filter(entry => entry.account.trim() !== '')
          .map(({ type, ...rest }) => rest)
      };

      delete submitData.voucherNumber;
      
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

  const formatAmount = (amount = 0) =>
    `₹${Number(amount || 0).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;

  const getLedgerInfo = (accountName) => ledgers.find((ledger) => ledger.name === accountName);

  const getLedgerBalanceLabel = (ledger) => {
    if (!ledger) return '';
    const outstanding = ledger.outstandingBalance ?? ledger.openingBalance ?? 0;
    const nature =
      ledger.group?.type === 'Liability' || ledger.group?.type === 'Expenses' ? 'Cr' : 'Dr';
    return `${formatAmount(outstanding)} ${nature}`;
  };

  const determineNature = (groupType) =>
    groupType === 'Liability' || groupType === 'Expenses' ? 'Cr' : 'Dr';

  const findLedgerForParty = (partyId) => {
    if (!partyId) return null;
    return ledgers.find((ledger) => {
      const customerId = ledger.customer?.id || ledger.customer?._id || ledger.customer;
      const vendorId = ledger.vendor?.id || ledger.vendor?._id || ledger.vendor;
      return customerId === partyId || vendorId === partyId;
    });
  };

  const findPartyRecord = (partyId) => {
    if (!partyId) return null;
    const customer = customers.find((customer) => customer.id === partyId);
    if (customer) return customer;
    return vendors.find(
      (vendor) =>
        vendor.id === partyId ||
        vendor._id === partyId ||
        vendor?.customer?._id === partyId
    );
  };

  const updatePartyBalanceLabel = (partyId) => {
    if (!partyId) {
      setPartyBalanceLabel('');
      return;
    }

    const ledger = findLedgerForParty(partyId);
    if (ledger) {
      setPartyBalanceLabel(getLedgerBalanceLabel(ledger));
      return;
    }

    const partyRecord = findPartyRecord(partyId);
    if (partyRecord) {
      const amount =
        partyRecord.outstandingBalance ?? partyRecord.openingBalance ?? 0;
      const nature = determineNature(partyRecord.group?.type);
      setPartyBalanceLabel(`${formatAmount(amount)} ${nature}`);
      return;
    }

    setPartyBalanceLabel('');
  };

  useEffect(() => {
    if (formData.party && ledgers.length > 0) {
      updatePartyBalanceLabel(formData.party);
    } else if (!formData.party) {
      setPartyBalanceLabel('');
    }
  }, [formData.party, ledgers]);

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
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="border-b border-gray-200 px-6 py-4 flex flex-wrap gap-6 items-center">
            <div>
              <label className="text-xs uppercase tracking-wide text-gray-500 block mb-1">Voucher Type</label>
              <select
                value={formData.voucherType}
                onChange={(e) => handleInputChange('voucherType', e.target.value)}
                className="text-lg font-semibold border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                {ALLOWED_VOUCHER_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <div>
              <span className="text-xs uppercase tracking-wide text-gray-500">Voucher No.</span>
              <div className="mt-1 text-lg font-semibold text-gray-900 px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 min-w-[140px]">
                {formData.voucherNumber ? `${formData.voucherNumber}` : 'Generating...'}
              </div>
            </div>
            <div className="ml-auto">
              <span className="text-xs uppercase tracking-wide text-gray-500">Date</span>
              <div className="relative mt-1">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleInputChange('date', e.target.value)}
                  className="w-full pl-10 pr-3 py-2 text-lg font-semibold border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            </div>
          </div>

          <div className="px-6 py-4 grid grid-cols-1 md:grid-cols-2 gap-6">
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
              {partyBalanceLabel && (
                <p className="text-xs text-gray-500 mt-1">
                  Current Balance: {partyBalanceLabel}
                </p>
              )}
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
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <DollarSign size={20} />
                Particulars
              </h2>
              <p className="text-sm text-gray-500">Enter debit and credit lines similar to Tally</p>
            </div>
            <button
              type="button"
              onClick={addEntry}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <Plus size={16} />
              Add Line
            </button>
          </div>

          <div className="px-6">
            <div className="grid grid-cols-[minmax(0,1fr),140px,140px] text-sm font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-200 py-3">
              <div>Particulars</div>
              <div className="text-right">Debit</div>
              <div className="text-right">Credit</div>
            </div>

            {formData.entries.map((entry, index) => (
                <div key={index} className="grid grid-cols-[minmax(0,1fr),140px,140px] items-center gap-4 py-3 border-b border-gray-100">
                  <div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => toggleEntryType(index)}
                        className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${entry.type === 'Cr' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                      >
                        {entry.type}
                      </button>
                      <select
                        value={entry.account}
                        onChange={(e) => handleEntryChange(index, 'account', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      >
                        <option value="">Select account</option>
                        {ledgers.map((ledger) => (
                          <option key={ledger.id} value={ledger.name}>
                            {ledger.name}
                          </option>
                        ))}
                      </select>
                      {formData.entries.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeEntry(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                    {entry.account && (
                      <p className="ml-11 text-xs text-gray-500 mt-1">
                        Current Balance: {getLedgerBalanceLabel(getLedgerInfo(entry.account))}
                      </p>
                    )}
                  </div>

                  <div className="flex justify-end">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={entry.debitAmount}
                      onChange={(e) => handleEntryChange(index, 'debitAmount', parseFloat(e.target.value) || 0)}
                      disabled={entry.type === 'Cr'}
                      className="w-full text-right px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                    />
                  </div>
                  <div className="flex justify-end">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={entry.creditAmount}
                      onChange={(e) => handleEntryChange(index, 'creditAmount', parseFloat(e.target.value) || 0)}
                      disabled={entry.type === 'Dr'}
                      className="w-full text-right px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                    />
                  </div>
                </div>
              ))}

            <div className="grid grid-cols-[minmax(0,1fr),140px,140px] items-center py-4">
              <div className="text-right font-semibold text-gray-900 pr-6">Total</div>
              <div className="text-right font-semibold text-red-600">₹{totalDebit.toFixed(2)}</div>
              <div className="text-right font-semibold text-green-600">₹{totalCredit.toFixed(2)}</div>
            </div>
          </div>

          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              {isBalanced ? (
                <span className="flex items-center gap-1 text-green-600">
                  <CheckCircle size={16} />
                  Voucher is balanced
                </span>
              ) : (
                <span className="flex items-center gap-1 text-red-600">
                  <AlertCircle size={16} />
                  Debit and Credit totals must match
                </span>
              )}
            </div>
            <div className="text-xs uppercase tracking-wide text-gray-500">
              Dr / Cr difference: ₹{Math.abs(totalDebit - totalCredit).toFixed(2)}
            </div>
          </div>
        </div>
        {/* Narration */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <FileText size={20} />
              Narration
            </h2>
          </div>
          <div className="px-6 py-4">
            <textarea
              value={formData.narration}
              onChange={(e) => handleInputChange('narration', e.target.value)}
              placeholder="Enter narration (e.g. Cash deposited into bank)"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
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
