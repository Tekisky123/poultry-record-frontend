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
  const [customersWithLedgers, setCustomersWithLedgers] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [ledgers, setLedgers] = useState([]);
  const [cashBankLedgers, setCashBankLedgers] = useState([]);
  const [allParties, setAllParties] = useState([]); // Combined list of customers, ledgers, and vendors
  const [partyBalanceLabel, setPartyBalanceLabel] = useState('');

  const [formData, setFormData] = useState({
    voucherType: ALLOWED_VOUCHER_TYPES[0],
    voucherNumber: '',
    date: new Date().toISOString().split('T')[0],
    party: '',
    partyName: '',
    parties: [], // For Payment/Receipt vouchers - array of { partyId, partyName, partyType, amount, currentBalance, currentBalanceType }
    account: '', // For Payment/Receipt vouchers - selected Cash/Bank ledger
    entries: [
      { account: '', debitAmount: 0, creditAmount: 0, narration: '', type: 'Dr' },
      { account: '', debitAmount: 0, creditAmount: 0, narration: '', type: 'Cr' }
    ],
    narration: ''
  });

  useEffect(() => {
    fetchMasterData();
    if (isEdit) {
      fetchVoucher();
    } else {
      fetchNextVoucherNumber();
    }
  }, [id]);

  // Reset parties/entries when voucher type changes
  useEffect(() => {
    const isPaymentOrReceiptType = formData.voucherType === 'Payment' || formData.voucherType === 'Receipt';
    const isContra = formData.voucherType === 'Contra';
    const isJournal = formData.voucherType === 'Journal';
    const isRestrictedVoucher = isContra || isJournal;

    if (isPaymentOrReceiptType && formData.parties.length === 0) {
      // Initialize with one empty party
      setFormData(prev => ({
        ...prev,
        parties: [{ partyId: '', partyType: '', partyName: '', amount: 0, currentBalance: 0, currentBalanceType: 'debit' }]
      }));
    } else if (isRestrictedVoucher) {
      // Enforce structure for Contra/Journal: exactly 2 entries (Dr, Cr)
      setFormData(prev => ({
        ...prev,
        parties: [], // Clear parties
        account: '', // Clear account
        entries: [
          { account: prev.entries[0]?.account || '', debitAmount: prev.entries[0]?.debitAmount || 0, creditAmount: 0, narration: prev.entries[0]?.narration || '', type: 'Dr' },
          { account: prev.entries[1]?.account || '', debitAmount: 0, creditAmount: prev.entries[1]?.creditAmount || 0, narration: prev.entries[1]?.narration || '', type: 'Cr' }
        ]
      }));
    } else if (!isPaymentOrReceiptType && !isRestrictedVoucher && formData.parties.length > 0) {
      // Clear parties when switching away from Payment/Receipt to others
      setFormData(prev => ({
        ...prev,
        parties: [],
        account: ''
      }));
    }
  }, [formData.voucherType, formData.parties.length]);
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

      const allCustomers = customersRes.data.success ? customersRes.data.data : [];
      const allVendors = vendorsRes.data.success ? vendorsRes.data.data : [];
      const allLedgers = ledgersRes.data.success ? (ledgersRes.data.data || []) : [];

      // Set individual state
      setCustomers(allCustomers);
      setVendors(allVendors);
      setLedgers(allLedgers);

      // Filter Cash and Bank Accounts ledgers
      const cashBankLedgersData = allLedgers.filter(ledger => {
        const groupSlug = ledger.group?.slug || '';
        const groupName = ledger.group?.name || '';

        // Check by slug (primary) or name (fallback)
        // Slugs: 'cash-in-hand', 'bank-accounts'
        const isCash = groupSlug === 'cash-in-hand' || groupName === 'Cash-in-Hand';
        const isBank = groupSlug === 'bank-accounts' || groupName === 'Bank Accounts';

        return isCash || isBank;
      });
      setCashBankLedgers(cashBankLedgersData);

      // Match customers with ledgers
      const customersWithLedgersData = allCustomers.filter(customer => {
        // Check if customer has a ledger
        return allLedgers.some(ledger => {
          const ledgerCustomerId = ledger.customer?.id || ledger.customer?._id || ledger.customer;
          return ledgerCustomerId === customer.id || ledgerCustomerId === customer._id;
        });
      });
      setCustomersWithLedgers(customersWithLedgersData);

      // Create combined parties list: customers, ledgers, and vendors
      const partiesList = [];

      // Add customers
      allCustomers.forEach(customer => {
        partiesList.push({
          id: customer.id || customer._id,
          name: customer.shopName || customer.ownerName || 'N/A',
          type: 'customer',
          data: customer
        });
      });

      // Add ledgers
      allLedgers.forEach(ledger => {
        partiesList.push({
          id: ledger.id || ledger._id,
          name: ledger.name,
          type: 'ledger',
          data: ledger
        });
      });

      // Add vendors
      allVendors.forEach(vendor => {
        partiesList.push({
          id: vendor.id || vendor._id,
          name: vendor.vendorName || 'N/A',
          type: 'vendor',
          data: vendor
        });
      });

      setAllParties(partiesList);
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
        const resolvedVoucherType = ALLOWED_VOUCHER_TYPES.includes(voucher.voucherType)
          ? voucher.voucherType
          : ALLOWED_VOUCHER_TYPES[0];

        const isPaymentOrReceiptVoucher = resolvedVoucherType === 'Payment' || resolvedVoucherType === 'Receipt';

        if (isPaymentOrReceiptVoucher && voucher.parties && voucher.parties.length > 0) {
          // Handle Payment/Receipt voucher structure
          const partiesData = await Promise.all(
            voucher.parties.map(async (partyItem) => {
              const partyType = partyItem.partyType || 'customer'; // Default to customer for backward compatibility
              let partyName = '';
              let balance = 0;
              let balanceType = 'debit';

              try {
                if (partyType === 'customer') {
                  const customerRes = await api.get(`/customer/${partyItem.partyId}`);
                  if (customerRes.data.success) {
                    const customer = customerRes.data.data;
                    partyName = customer.shopName || customer.ownerName || 'N/A';
                    balance = customer.outstandingBalance || customer.openingBalance || 0;
                    balanceType = customer.outstandingBalanceType || customer.openingBalanceType || 'debit';
                  }
                } else if (partyType === 'ledger') {
                  const ledgerRes = await api.get(`/ledger/${partyItem.partyId}`);
                  if (ledgerRes.data.success) {
                    const ledger = ledgerRes.data.data;
                    partyName = ledger.name || 'N/A';
                    balance = ledger.outstandingBalance || ledger.openingBalance || 0;
                    balanceType = ledger.outstandingBalanceType || ledger.openingBalanceType || 'debit';
                  }
                } else if (partyType === 'vendor') {
                  const vendorRes = await api.get(`/vendor/${partyItem.partyId}`);
                  if (vendorRes.data.success) {
                    const vendor = vendorRes.data.data;
                    partyName = vendor.vendorName || 'N/A';
                    balance = vendor.outstandingBalance || vendor.openingBalance || 0;
                    balanceType = vendor.outstandingBalanceType || vendor.openingBalanceType || 'debit';
                  }
                }
              } catch (err) {
                console.error(`Error fetching ${partyType} ${partyItem.partyId}:`, err);
              }

              return {
                partyId: partyItem.partyId,
                partyType: partyType,
                partyName: partyName,
                amount: partyItem.amount || 0,
                currentBalance: balance,
                currentBalanceType: balanceType
              };
            })
          );

          setFormData({
            voucherType: resolvedVoucherType,
            voucherNumber: voucher.voucherNumber || '',
            date: new Date(voucher.date).toISOString().split('T')[0],
            party: '',
            partyName: '',
            parties: partiesData,
            account: voucher.account?._id || voucher.account || '',
            entries: [],
            narration: voucher.narration || ''
          });
        } else {
          // Handle other voucher types
          const normalizedEntries = (voucher.entries.length > 0 ? voucher.entries : [
            { account: '', debitAmount: 0, creditAmount: 0, narration: '' },
            { account: '', debitAmount: 0, creditAmount: 0, narration: '' }
          ]).map(entry => ({
            ...entry,
            type: entry.debitAmount > 0 ? 'Dr' : 'Cr'
          }));

          setFormData({
            voucherType: resolvedVoucherType,
            voucherNumber: voucher.voucherNumber || '',
            date: new Date(voucher.date).toISOString().split('T')[0],
            party: voucher.party?._id || '',
            partyName: voucher.partyName || '',
            parties: [],
            account: '',
            entries: normalizedEntries,
            narration: voucher.narration || ''
          });
        }
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

  // Functions for Payment/Receipt voucher parties
  const addParty = () => {
    setFormData(prev => ({
      ...prev,
      parties: [...prev.parties, { partyId: '', partyType: '', partyName: '', amount: 0, currentBalance: 0, currentBalanceType: 'debit' }]
    }));
  };

  const removeParty = (index) => {
    setFormData(prev => ({
      ...prev,
      parties: prev.parties.filter((_, i) => i !== index)
    }));
  };

  const handlePartySelect = async (index, partyValue) => {
    // partyValue format: "type:id" (e.g., "customer:123", "ledger:456", "vendor:789")
    const [partyType, partyId] = partyValue.split(':');

    if (!partyType || !partyId) return;

    let partyName = '';
    let balance = 0;
    let balanceType = 'debit';

    try {
      if (partyType === 'customer') {
        const customerRes = await api.get(`/customer/${partyId}`);
        if (customerRes.data.success) {
          const customerData = customerRes.data.data;
          partyName = customerData.shopName || customerData.ownerName || 'N/A';
          balance = customerData.outstandingBalance || customerData.openingBalance || 0;
          balanceType = customerData.outstandingBalanceType || customerData.openingBalanceType || 'debit';
        }
      } else if (partyType === 'ledger') {
        const ledgerRes = await api.get(`/ledger/${partyId}`);
        if (ledgerRes.data.success) {
          const ledgerData = ledgerRes.data.data;
          partyName = ledgerData.name || 'N/A';
          balance = ledgerData.outstandingBalance || ledgerData.openingBalance || 0;
          balanceType = ledgerData.outstandingBalanceType || ledgerData.openingBalanceType || 'debit';
        }
      } else if (partyType === 'vendor') {
        const vendorRes = await api.get(`/vendor/${partyId}`);
        if (vendorRes.data.success) {
          const vendorData = vendorRes.data.data;
          partyName = vendorData.vendorName || 'N/A';
          // Vendors might not have outstanding balance, use 0 or check if they have a ledger
          balance = vendorData.outstandingBalance || vendorData.openingBalance || 0;
          balanceType = vendorData.outstandingBalanceType || vendorData.openingBalanceType || 'debit';
        }
      }

      setFormData(prev => ({
        ...prev,
        parties: prev.parties.map((party, i) =>
          i === index
            ? {
              partyId: partyId,
              partyType: partyType,
              partyName: partyName,
              amount: party.amount,
              currentBalance: balance,
              currentBalanceType: balanceType
            }
            : party
        )
      }));
    } catch (error) {
      console.error(`Error fetching ${partyType} balance:`, error);
      // Fallback to data from list
      const partyFromList = allParties.find(p => p.id === partyId && p.type === partyType);
      if (partyFromList) {
        partyName = partyFromList.name;
        if (partyType === 'customer') {
          balance = partyFromList.data.outstandingBalance || partyFromList.data.openingBalance || 0;
          balanceType = partyFromList.data.outstandingBalanceType || partyFromList.data.openingBalanceType || 'debit';
        } else if (partyType === 'ledger') {
          balance = partyFromList.data.outstandingBalance || partyFromList.data.openingBalance || 0;
          balanceType = partyFromList.data.outstandingBalanceType || partyFromList.data.openingBalanceType || 'debit';
        } else if (partyType === 'vendor') {
          balance = partyFromList.data.outstandingBalance || partyFromList.data.openingBalance || 0;
          balanceType = partyFromList.data.outstandingBalanceType || partyFromList.data.openingBalanceType || 'debit';
        }

        setFormData(prev => ({
          ...prev,
          parties: prev.parties.map((party, i) =>
            i === index
              ? {
                partyId: partyId,
                partyType: partyType,
                partyName: partyName,
                amount: party.amount,
                currentBalance: balance,
                currentBalanceType: balanceType
              }
              : party
          )
        }));
      }
    }
  };

  const handlePartyAmountChange = (index, amount) => {
    setFormData(prev => ({
      ...prev,
      parties: prev.parties.map((party, i) =>
        i === index ? { ...party, amount: parseFloat(amount) || 0 } : party
      )
    }));
  };

  const calculateTotalAmount = () => {
    return formData.parties.reduce((sum, party) => sum + (parseFloat(party.amount) || 0), 0);
  };

  const isPaymentOrReceipt = formData.voucherType === 'Payment' || formData.voucherType === 'Receipt';

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
    // Validation for Payment/Receipt vouchers
    if (isPaymentOrReceipt) {
      if (formData.parties.length === 0) {
        setError('At least one party is required');
        return false;
      }

      for (let party of formData.parties) {
        if (!party.partyId) {
          setError('All parties must have a selected customer');
          return false;
        }
        if (!party.amount || party.amount <= 0) {
          setError('All parties must have an amount greater than 0');
          return false;
        }
      }

      if (!formData.account) {
        setError('Account (Cash or Bank) is required');
        return false;
      }

      return true;
    }

    // Validation for other voucher types
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

      let submitData;

      if (isPaymentOrReceipt) {
        // For Payment/Receipt vouchers, build entries from parties
        const totalAmount = calculateTotalAmount();
        const entries = [];

        // Add party entries (debit for Payment, credit for Receipt)
        formData.parties.forEach(party => {
          if (formData.voucherType === 'Payment') {
            entries.push({
              account: party.partyName,
              debitAmount: party.amount,
              creditAmount: 0,
              narration: ''
            });
          } else { // Receipt
            entries.push({
              account: party.partyName,
              debitAmount: 0,
              creditAmount: party.amount,
              narration: ''
            });
          }
        });

        // Update parties data to include partyType for backend
        const partiesData = formData.parties.map(p => ({
          partyId: p.partyId,
          partyType: p.partyType,
          amount: p.amount
        }));

        // Add account entry (credit for Payment, debit for Receipt)
        const accountLedger = cashBankLedgers.find(l => l.id === formData.account);
        if (accountLedger) {
          if (formData.voucherType === 'Payment') {
            entries.push({
              account: accountLedger.name,
              debitAmount: 0,
              creditAmount: totalAmount,
              narration: ''
            });
          } else { // Receipt
            entries.push({
              account: accountLedger.name,
              debitAmount: totalAmount,
              creditAmount: 0,
              narration: ''
            });
          }
        }

        submitData = {
          voucherType: formData.voucherType,
          date: formData.date,
          parties: partiesData,
          account: formData.account,
          entries: entries,
          narration: formData.narration
        };
      } else {
        submitData = {
          ...formData,
          entries: formData.entries
            .filter(entry => entry.account.trim() !== '')
            .map(({ type, ...rest }) => rest)
        };
      }

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

  const getLedgerInfo = (accountName) =>
    ledgers.find((ledger) => ledger.name === accountName) ||
    customers.find((customer) => (customer.shopName || customer.ownerName) === accountName) ||
    vendors.find((vendor) => vendor.vendorName === accountName);

  const getLedgerBalanceLabel = (ledger) => {
    if (!ledger) return '';
    const outstanding = ledger.outstandingBalance ?? ledger.openingBalance ?? 0;

    // Check for explicit balance type (for Customers/Vendors) or cached type
    if (ledger.outstandingBalanceType) {
      return `${formatAmount(outstanding)} ${ledger.outstandingBalanceType === 'credit' ? 'Cr' : 'Dr'}`;
    }
    if (ledger.openingBalanceType && !ledger.group) { // Fallback if no outstanding type but opening type exists (and not a ledger with group)
      return `${formatAmount(outstanding)} ${ledger.openingBalanceType === 'credit' ? 'Cr' : 'Dr'}`;
    }

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

          {/* Show different UI for Payment/Receipt vouchers */}
          {isPaymentOrReceipt ? (
            <div className="px-6 py-4 space-y-4">
              {/* Parties Section */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-700 uppercase">Particulars</h3>
                  <button
                    type="button"
                    onClick={addParty}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-sm font-medium flex items-center gap-1"
                  >
                    <Plus size={14} />
                    ADD party
                  </button>
                </div>

                <div className="space-y-3">
                  {formData.parties.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">No parties added. Click "+ ADD party" to add one.</p>
                  ) : (
                    formData.parties.map((party, index) => (
                      <div key={index} className="grid grid-cols-2 gap-4 items-start p-3 bg-gray-50 rounded-lg">
                        <div className="space-y-2">
                          <label className="block text-xs font-medium text-gray-600">Party {index + 1}</label>
                          <select
                            value={party.partyId && party.partyType ? `${party.partyType}:${party.partyId}` : ''}
                            onChange={(e) => handlePartySelect(index, e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                            required
                          >
                            <option value="">Select Party</option>
                            {allParties
                              .filter(partyItem => {
                                // Hide Vendors if Voucher Type is Receipt
                                if (formData.voucherType === 'Receipt' && partyItem.type === 'vendor') {
                                  return false;
                                }
                                return true;
                              })
                              .map(partyItem => (
                                <option key={`${partyItem.type}:${partyItem.id}`} value={`${partyItem.type}:${partyItem.id}`}>
                                  {partyItem.name}
                                </option>
                              ))}
                          </select>
                          {party.partyId && (
                            <p className="text-xs text-gray-500">
                              curr Bal: {formatAmount(party.currentBalance)} {party.currentBalanceType === 'credit' ? 'Cr' : 'Dr'}
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <label className="block text-xs font-medium text-gray-600">Amount</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={party.amount}
                            onChange={(e) => handlePartyAmountChange(index, e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                            placeholder="0.00"
                            required
                          />
                          {formData.parties.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeParty(index)}
                              className="text-red-500 hover:text-red-700 text-xs"
                            >
                              <Trash2 size={14} className="inline" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Total Amount */}
                <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between items-center">
                  <span className="text-sm font-semibold text-gray-700">Total Auto</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {formatAmount(calculateTotalAmount())} {formData.voucherType === 'Payment' ? 'Cr' : 'Dr'}
                  </span>
                </div>
              </div>

              {/* Account Selection */}
              <div className="border border-gray-200 rounded-lg p-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Account:</label>
                <select
                  value={formData.account}
                  onChange={(e) => handleInputChange('account', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Select Account (Cash or Bank)</option>
                  {cashBankLedgers.map(ledger => (
                    <option key={ledger.id} value={ledger.id}>
                      {ledger.name}
                    </option>
                  ))}
                </select>
                {formData.account && (() => {
                  const selectedLedger = cashBankLedgers.find(l => l.id === formData.account);
                  if (selectedLedger) {
                    const balance = selectedLedger.outstandingBalance || selectedLedger.openingBalance || 0;
                    const balanceType = selectedLedger.outstandingBalanceType || selectedLedger.openingBalanceType || 'debit';
                    return (
                      <p className="text-xs text-gray-500 mt-1">
                        current balance: {formatAmount(balance)} {balanceType === 'credit' ? 'Cr' : 'Dr'}
                      </p>
                    );
                  }
                  return null;
                })()}
              </div>
            </div>
          ) : (
            // Hide Party fields for Contra and Journal vouchers
            formData.voucherType !== 'Contra' && formData.voucherType !== 'Journal' && (
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
            )
          )}
        </div>

        {/* Voucher Entries - Only show for non-Payment/Receipt vouchers */}
        {!isPaymentOrReceipt && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <DollarSign size={20} />
                  Particulars
                </h2>
                <p className="text-sm text-gray-500">Enter debit and credit lines similar to Tally</p>
              </div>
              {formData.voucherType !== 'Contra' && formData.voucherType !== 'Journal' && (
                <button
                  type="button"
                  onClick={addEntry}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  <Plus size={16} />
                  Add Line
                </button>
              )}
            </div>

            <div className="px-6">
              <div className="grid grid-cols-[minmax(0,1fr),140px,140px] text-sm font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-200 py-3">
                <div>Particulars</div>
                <div className="text-right">Debit</div>
                <div className="text-right">Credit</div>
              </div>

              {formData.entries.map((entry, index) => (
                <div key={index} className="grid grid-cols-[minmax(0,1fr),140px,140px] items-center gap-4 py-3 border-b border-gray-100">
                  {console.log("entry", entry)}
                  <div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => toggleEntryType(index)}
                        disabled={formData.voucherType === 'Contra' || formData.voucherType === 'Journal'} // Disable toggle for Contra/Journal
                        className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${(formData.voucherType === 'Contra' || formData.voucherType === 'Journal')
                          ? (index === 0 ? 'bg-red-100 text-red-700 cursor-not-allowed' : 'bg-green-100 text-green-700 cursor-not-allowed')
                          : (entry.type === 'Cr' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')
                          }`}
                      >
                        {(formData.voucherType === 'Contra' || formData.voucherType === 'Journal') ? (index === 0 ? 'Dr' : 'Cr') : entry.type}
                      </button>
                      <select
                        value={entry.account}
                        onChange={(e) => handleEntryChange(index, 'account', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      >
                        <option value="">Select account</option>
                        {formData.voucherType === 'Journal' ? (
                          <>
                            {/* Combined list for Journal */}
                            <optgroup label="Ledgers">
                              {ledgers
                                .filter(ledger => {
                                  const groupSlug = ledger.group?.slug || '';
                                  const groupName = ledger.group?.name || '';
                                  // Filter out "Bank Account" group ledgers
                                  return groupSlug !== 'bank-accounts' || groupName !== 'Bank Accounts';
                                })
                                .map((ledger) => (
                                  <option key={`ledger-${ledger.id}`} value={ledger.name}>{ledger.name}</option>
                                ))}
                            </optgroup>
                            <optgroup label="Customers">
                              {customers.map((customer) => (
                                <option key={`customer-${customer.id}`} value={customer.shopName || customer.ownerName}>
                                  {customer.shopName || customer.ownerName}
                                </option>
                              ))}
                            </optgroup>
                            <optgroup label="Vendors">
                              {vendors.map((vendor) => (
                                <option key={`vendor-${vendor._id}`} value={vendor.vendorName}>{vendor.vendorName}</option>
                              ))}
                            </optgroup>
                          </>
                        ) : (
                          // Only ledgers for others
                          ledgers.map((ledger) => (
                            <option key={ledger.id} value={ledger.name}>
                              {ledger.name}
                            </option>
                          ))
                        )}
                      </select>
                      {/* Hide delete button for Contra or if only 2 entries */}
                      {formData.voucherType !== 'Contra' && formData.voucherType !== 'Journal' && formData.entries.length > 2 && (
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
        )}
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
            disabled={loading || (!isPaymentOrReceipt && !isBalanced)}
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
