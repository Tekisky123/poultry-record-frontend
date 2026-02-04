// src/pages/TripDetails.jsx
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Truck,
  MapPin,
  Users,
  ShoppingCart,
  Receipt,
  Fuel,
  Calendar,
  DollarSign,
  Loader2,
  X,
  Plus,
  CheckCircle,
  FileSpreadsheet,
  FileText,
  Save,
  Edit
} from 'lucide-react';
import api from '../lib/axios';
import { useAuth } from '../contexts/AuthContext';
import * as XLSX from 'xlsx';
import { downloadTripPDF } from '../utils/TripDetailsUtils/downloadTripPDF';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import EditTripModal from '../components/EditTripModal';
import downloadTripExcel2 from '../utils/TripDetailsUtils/downloadTripExcel2';

export default function TripDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [trip, setTrip] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showDieselModal, setShowDieselModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showEditTripModal, setShowEditTripModal] = useState(false);

  // Edit states
  const [editingPurchaseIndex, setEditingPurchaseIndex] = useState(null);
  const [editingSaleIndex, setEditingSaleIndex] = useState(null);
  const [editingExpenseIndex, setEditingExpenseIndex] = useState(null);
  const [editingDieselIndex, setEditingDieselIndex] = useState(null);
  const [editingStockIndex, setEditingStockIndex] = useState(null);

  // New states for Supervisor-like form
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [highlightedCustomerIndex, setHighlightedCustomerIndex] = useState(-1);
  const highlightedCustomerRef = useRef(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerBalance, setCustomerBalance] = useState(null);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Ledgers states
  const [bankAccountLedgers, setBankAccountLedgers] = useState([]);
  const [cashInHandLedgers, setCashInHandLedgers] = useState([]);
  const [ledgersLoading, setLedgersLoading] = useState(false);

  // Form data for editing
  const [purchaseData, setPurchaseData] = useState({
    supplier: '',
    dcNumber: '',
    birds: 0,
    weight: 0,
    avgWeight: 0,
    rate: 0,
    amount: 0
  });

  const [saleData, setSaleData] = useState({
    client: '',
    billNumber: '',
    birds: '',
    weight: '',
    avgWeight: 0,
    rate: '',
    amount: 0,
    receivedAmount: '',
    discount: '',
    balance: 0,
    cashPaid: '',
    onlinePaid: '',
    cashLedger: '',
    onlineLedger: '',
    cashLedger: '',
    onlineLedger: '',
    narration: '',
    sendSms: false
  });

  const [expenseData, setExpenseData] = useState({
    category: 'meals',
    description: '',
    amount: 0,
    date: new Date().toISOString().split('T')[0]
  });

  const [dieselData, setDieselData] = useState({
    stationName: '',
    volume: 0,
    rate: 0,
    amount: 0,
    date: new Date().toISOString().split('T')[0]
  });

  const [stockData, setStockData] = useState({
    birds: 0,
    weight: 0,
    avgWeight: 0,
    rate: 0,
    value: 0,
    notes: ''
  });

  const [completeData, setCompleteData] = useState({
    closingOdometer: 0,
    finalRemarks: '',
    mortality: 0
  });

  useEffect(() => {
    if (id) {
      fetchTrip();
      fetchVendors();
      fetchCustomers();
      fetchLedgers();
    }
  }, [id]);

  // Auto-calculate avgWeight, amount, and balance when saleData changes
  useEffect(() => {
    const birds = Number(saleData.birds) || 0;
    const weight = Number(saleData.weight) || 0;
    const rate = Number(saleData.rate) || 0;
    const cashPaid = Number(saleData.cashPaid) || 0;
    const onlinePaid = Number(saleData.onlinePaid) || 0;
    const discount = Number(saleData.discount) || 0;

    if (birds > 0 && weight > 0) {
      const avgWeight = calculateAvgWeight(birds, weight);
      if (avgWeight !== saleData.avgWeight) {
        setSaleData(prev => ({ ...prev, avgWeight }));
      }
    }

    if (weight > 0 && rate > 0) {
      const amount = calculateAmount(weight, rate);
      if (amount !== saleData.amount) {
        setSaleData(prev => ({ ...prev, amount }));
      }
    }

    if (saleData.amount > 0 && customerBalance !== null) {
      const receivedAmount = cashPaid + onlinePaid;
      // Calculate balance using the correct formula: outstandingBalance + Total Amount - Online Paid - Cash Paid - Discount
      let balance = Number(customerBalance) + Number(saleData.amount) - Number(onlinePaid) - Number(cashPaid) - Number(discount);

      // If payment exceeds the sale amount + current outstanding balance, 
      // the extra payment reduces the balance to 0 (minimum)
      balance = Math.max(0, balance);

      if (receivedAmount !== saleData.receivedAmount || balance !== saleData.balance) {
        setSaleData(prev => ({
          ...prev,
          receivedAmount,
          balance
        }));
      }
    }
  }, [saleData.birds, saleData.weight, saleData.rate, saleData.amount, saleData.cashPaid, saleData.onlinePaid, saleData.discount, customerBalance]);

  // Filter customers based on search term
  useEffect(() => {
    if (customerSearchTerm.trim() === '') {
      setFilteredCustomers(customers);
    } else {
      const filtered = customers.filter(customer =>
        customer.shopName.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
        customer.ownerName?.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
        customer.contact?.includes(customerSearchTerm) ||
        customer.place?.toLowerCase().includes(customerSearchTerm.toLowerCase())
      );
      setFilteredCustomers(filtered);
    }
  }, [customers, customerSearchTerm]);


  const fetchTrip = async () => {
    try {
      setIsLoading(true);
      const { data } = await api.get(`/trip/${id}`);
      setTrip(data.data);
    } catch (err) {
      console.error('Error fetching trip:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchVendors = async () => {
    try {
      const { data } = await api.get('/vendor');
      if (data.success) {
        setVendors(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching vendors:', error);
    }
  };

  const fetchCustomers = async () => {
    try {
      const { data } = await api.get('/customer');
      if (data.success) {
        const customersData = data.data || [];
        setCustomers(customersData);
        setFilteredCustomers(customersData);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchLedgers = async () => {
    try {
      setLedgersLoading(true);
      // Fetch all groups to find Bank Accounts and Cash-in-Hand
      const groupsRes = await api.get('/group');
      if (!groupsRes.data.success) {
        console.error('Failed to fetch groups');
        return;
      }

      const groups = groupsRes.data.data || [];

      // Find groups by name (they might be nested, so search through all groups)
      const bankAccountsGroup = groups.find(g => g.name === 'Bank Accounts');
      const cashInHandGroup = groups.find(g => g.name === 'Cash-in-Hand');

      const promises = [];
      if (bankAccountsGroup && bankAccountsGroup.id) {
        promises.push(api.get(`/ledger/group/${bankAccountsGroup.id}`));
      } else {
        promises.push(Promise.resolve({ data: { success: true, data: [] } }));
      }

      if (cashInHandGroup && cashInHandGroup.id) {
        promises.push(api.get(`/ledger/group/${cashInHandGroup.id}`));
      } else {
        promises.push(Promise.resolve({ data: { success: true, data: [] } }));
      }

      const [bankLedgersRes, cashLedgersRes] = await Promise.all(promises);

      if (bankLedgersRes.data.success) {
        setBankAccountLedgers(bankLedgersRes.data.data || []);
      }

      if (cashLedgersRes.data.success) {
        setCashInHandLedgers(cashLedgersRes.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching ledgers:', error);
    } finally {
      setLedgersLoading(false);
    }
  };

  const getCashAcLedgerId = () => {
    const cashAcLedger = cashInHandLedgers.find(ledger =>
      ledger.name === 'CASH A/C' || ledger.name?.toUpperCase() === 'CASH A/C'
    );
    return cashAcLedger?.id || cashAcLedger?._id || null;
  };

  const getPurchaseAndSaleStats = () => {
    const totalPurchasedBirds = trip.purchases?.reduce((sum, purchase) => sum + (purchase.birds || 0), 0) || 0;
    const totalSoldBirds = trip.sales?.reduce((sum, sale) => sum + (sale.birdsCount || sale.birds || 0), 0) || 0;
    const remainingBirds = totalPurchasedBirds - totalSoldBirds;

    const totalPurchasedWeight = trip.purchases?.reduce((sum, purchase) => sum + (purchase.weight || 0), 0) || 0;
    const totalSoldWeight = trip.sales?.reduce((sum, sale) => sum + (sale.weight || 0), 0) || 0;
    const remainingWeight = totalPurchasedWeight - totalSoldWeight;

    return {
      totalPurchasedBirds,
      totalSoldBirds,
      remainingBirds,
      totalPurchasedWeight,
      totalSoldWeight,
      remainingWeight
    };
  };

  const validateMandatoryFields = (data, fields) => {
    const errors = [];
    fields.forEach(field => {
      if (data[field] === 0 || data[field] === '' || data[field] === null || data[field] === undefined) {
        errors.push(`${field} cannot be zero or empty`);
      }
    });
    return errors;
  };


  const addPurchase = async (purchaseData) => {
    try {
      const { data } = await api.post(`/trip/${id}/purchase`, purchaseData);
      setTrip(data.data);
      setShowPurchaseModal(false);
      alert('Purchase added successfully!');
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };



  const addExpense = async (expenseData) => {
    try {
      const currentExpenses = trip.expenses || [];
      const newExpenses = [...currentExpenses, expenseData];
      const { data } = await api.put(`/trip/${id}/expenses`, { expenses: newExpenses });
      setTrip(data.data);
      setShowExpenseModal(false);
      alert('Expense added successfully!');
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  const completeTrip = async (completionData) => {
    try {
      const { data } = await api.put(`/trip/${id}/complete`, completionData);
      setTrip(data.data);
      setShowCompleteModal(false);
      alert('Trip completed successfully!');
      navigate('/supervisor/trips');
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  // Generate unique bill number
  const generateBillNumber = () => {
    // Generate a 6-digit bill number
    const randomNumber = Math.floor(Math.random() * 900000) + 100000; // 100000 to 999999
    return randomNumber.toString();
  };

  // Helper functions for calculations
  const calculateAvgWeight = (birds, weight) => {
    if (birds > 0 && weight > 0) {
      return (weight / birds).toFixed(2);
    }
    return 0;
  };

  const calculateAmount = (weight, ratePerKg) => {
    return (weight * ratePerKg).toFixed(2);
  };

  const getDieselStationName = (station = {}) => {
    return station.name || station.stationName || station.station_name || 'N/A';
  };

  const handleSaleDataChange = (field, value) => {
    const newData = { ...saleData, [field]: value };

    // Auto-calculate avgWeight when birds or weight changes
    if (field === 'birds' || field === 'weight') {
      newData.avgWeight = calculateAvgWeight(newData.birds, newData.weight);
    }

    // Auto-calculate amount when weight or rate changes
    if (field === 'weight' || field === 'rate') {
      newData.amount = calculateAmount(newData.weight, newData.rate);
    }

    // Auto-calculate balance when amount, cashPaid, onlinePaid, or discount changes
    if (field === 'amount' || field === 'cashPaid' || field === 'onlinePaid' || field === 'discount') {
      const cashPaid = Number(newData.cashPaid) || 0;
      const onlinePaid = Number(newData.onlinePaid) || 0;
      const discount = Number(newData.discount) || 0;
      newData.receivedAmount = cashPaid + onlinePaid;

      // Calculate balance using the correct formula: outstandingBalance + Total Amount - Online Paid - Cash Paid - Discount
      if (customerBalance !== null) {
        let balance = Number(customerBalance) + Number(newData.amount) - Number(onlinePaid) - Number(cashPaid) - Number(discount);
        // If payment exceeds the sale amount + current outstanding balance, 
        // the extra payment reduces the balance to 0 (minimum)
        newData.balance = Math.max(0, balance);
      }
    }

    // Auto-calculate receivedAmount when cashPaid or onlinePaid changes
    if (field === 'cashPaid' || field === 'onlinePaid') {
      newData.receivedAmount = newData.cashPaid + newData.onlinePaid;
      // Clear ledger selection if amount is cleared
      if (field === 'cashPaid' && (Number(newData.cashPaid) === 0 || !newData.cashPaid)) {
        newData.cashLedger = '';
      }
      // Auto-select "CASH A/C" ledger when cashPaid > 0 and cashLedger is empty
      if (field === 'cashPaid' && Number(newData.cashPaid) > 0 && !newData.cashLedger) {
        const cashAcId = getCashAcLedgerId();
        if (cashAcId) {
          newData.cashLedger = cashAcId;
        }
      }
      if (field === 'onlinePaid' && (Number(newData.onlinePaid) === 0 || !newData.onlinePaid)) {
        newData.onlineLedger = '';
      }
      // Recalculate balance
      if (customerBalance !== null) {
        let balance = Number(customerBalance) + Number(newData.amount) - Number(newData.onlinePaid) - Number(newData.cashPaid) - Number(newData.discount);
        // If payment exceeds the sale amount + current outstanding balance, 
        // the extra payment reduces the balance to 0 (minimum)
        newData.balance = Math.max(0, balance);
      }
    }

    setSaleData(newData);
  };

  const fetchCustomerBalance = async (customer) => {

    if (!customer) {
      setCustomerBalance(null);
      return;
    }

    try {
      setLoadingBalance(true);
      let response;
      // If customer has user field (from dropdown selection), use panel endpoint
      if (customer.user) {
        response = await api.get(`/customer/panel/${customer.user._id || customer.user}/profile`);
      }
      // If customer only has _id (from editing sale), use admin endpoint
      else if (customer._id) {
        response = await api.get(`/customer/admin/${customer._id || customer.user}`);
      } else {
        setCustomerBalance(null);
        return;
      }
      if (response.data.success) {
        const customerData = response.data.data;
        // Handle balance: outstandingBalance (number) and outstandingBalanceType ('debit' or 'credit')
        const balanceAmount = Number(customerData.outstandingBalance) || 0;
        const balanceType = customerData.outstandingBalanceType || 'debit';
        // Convert to signed value: debit = positive, credit = negative
        const signedValue = balanceType === 'credit' ? -balanceAmount : balanceAmount;
        setCustomerBalance(signedValue);
      }
    } catch (error) {
      console.error('Error fetching customer balance:', error);
      setCustomerBalance(null);
    } finally {
      setLoadingBalance(false);
    }
  };

  const handleCustomerSearch = (searchTerm) => {
    setCustomerSearchTerm(searchTerm);
    setShowCustomerDropdown(true);
  };

  const handleCustomerSelect = (customer) => {
    setSelectedCustomer(customer);
    setSaleData(prev => ({ ...prev, client: customer._id || customer.id }));
    setCustomerSearchTerm(`${customer.shopName} - ${customer.ownerName || 'N/A'}`);
    setShowCustomerDropdown(false);
    setHighlightedCustomerIndex(-1);
    fetchCustomerBalance(customer);
  };

  const handleCustomerInputFocus = () => {
    setShowCustomerDropdown(true);
  };


  const handleCustomerInputBlur = () => {
    // Delay hiding dropdown to allow for click events
    setTimeout(() => {
      setShowCustomerDropdown(false);
      setHighlightedCustomerIndex(-1);
    }, 150);
  };

  const handleCustomerKeyDown = (e) => {
    if (!showCustomerDropdown || filteredCustomers.length === 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setShowCustomerDropdown(true);
        setHighlightedCustomerIndex(0);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedCustomerIndex(prev => {
          const nextIndex = prev + 1;
          return nextIndex >= filteredCustomers.length ? 0 : nextIndex;
        });
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedCustomerIndex(prev => {
          const prevIndex = prev - 1;
          return prevIndex < 0 ? filteredCustomers.length - 1 : prevIndex;
        });
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedCustomerIndex >= 0 && highlightedCustomerIndex < filteredCustomers.length) {
          handleCustomerSelect(filteredCustomers[highlightedCustomerIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setShowCustomerDropdown(false);
        setHighlightedCustomerIndex(-1);
        break;
    }
  };


  // Edit handlers
  const handleEditPurchase = async (e) => {
    e.preventDefault();
    try {
      const cleanedPurchaseData = {
        ...purchaseData,
        supplier: purchaseData.supplier === '' ? null : purchaseData.supplier
      };

      const { data } = await api.put(`/trip/${id}/purchase/${editingPurchaseIndex}`, cleanedPurchaseData);
      if (data.success) {
        setTrip(data.data);
        setShowPurchaseModal(false);
        setPurchaseData({ supplier: '', dcNumber: '', birds: 0, weight: 0, avgWeight: 0, rate: 0, amount: 0 });
        setEditingPurchaseIndex(null);
        alert('Purchase updated successfully!');
      }
    } catch (error) {
      console.error('Error updating purchase:', error);
      alert(error.response?.data?.message || 'Failed to update purchase');
    }
  };

  const handleSaleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Validate mandatory fields
      const mandatoryFields = ['client', 'birds', 'weight', 'rate'];
      const validationErrors = validateMandatoryFields(saleData, mandatoryFields);

      // Validate ledger selection if payment amounts are entered
      const cashPaid = Number(saleData.cashPaid) || 0;
      const onlinePaid = Number(saleData.onlinePaid) || 0;

      if (cashPaid > 0 && !saleData.cashLedger) {
        validationErrors.push('Please select a Cash-in-Hand Ledger when entering cash payment');
      }

      if (onlinePaid > 0 && !saleData.onlineLedger) {
        validationErrors.push('Please select a Bank Account Ledger when entering online payment');
      }

      if (validationErrors.length > 0) {
        alert(`Please fill all mandatory fields:\n${validationErrors.join('\n')}`);
        setIsSubmitting(false);
        return;
      }

      // Validation: Check if sale birds exceed remaining purchased birds
      const { remainingBirds, remainingWeight } = getPurchaseAndSaleStats();
      const currentSaleBirds = Number(saleData.birds) || 0;
      const currentSaleWeight = Number(saleData.weight) || 0;

      // If editing, subtract the current sale birds from total sold birds to get accurate remaining
      const adjustedRemainingBirds = editingSaleIndex !== null
        ? remainingBirds + (trip.sales[editingSaleIndex]?.birdsCount || trip.sales[editingSaleIndex]?.birds || 0)
        : remainingBirds;

      const adjustedRemainingWeight = editingSaleIndex !== null
        ? remainingWeight + (trip.sales[editingSaleIndex]?.weight || 0)
        : remainingWeight;

      if (currentSaleBirds > adjustedRemainingBirds) {
        alert(`Cannot sell ${currentSaleBirds} birds. Only ${adjustedRemainingBirds} birds are available for sale.`);
        setIsSubmitting(false);
        return;
      }

      if (currentSaleWeight > adjustedRemainingWeight) {
        alert(`Cannot sell ${currentSaleWeight} kg. Only ${adjustedRemainingWeight} kg are available for sale.`);
        setIsSubmitting(false);
        return;
      }

      // Validation: Check for overpayment scenario
      if (saleData.client && customerBalance !== null) {
        const totalPaid = (Number(saleData.cashPaid) || 0) + (Number(saleData.onlinePaid) || 0);
        const discount = Number(saleData.discount) || 0;
        const totalAmount = Number(saleData.amount) || 0;

        // Calculate what the balance would be after this sale
        const calculatedBalance = Number(customerBalance) + Number(totalAmount) - Number(totalPaid) - Number(discount);

        // If overpayment occurs (negative balance), show warning but allow it
        if (calculatedBalance < 0) {
          const overpaymentAmount = Math.abs(calculatedBalance);
          const confirmOverpayment = confirm(
            `Warning: This sale will result in an overpayment of ₹${overpaymentAmount.toFixed(2)}.\n\n` +
            `Customer's outstanding balance: ₹${Number(customerBalance).toFixed(2)}\n` +
            `Sale amount: ₹${totalAmount.toFixed(2)}\n` +
            `Total payment: ₹${totalPaid.toFixed(2)}\n` +
            `Discount: ₹${discount.toFixed(2)}\n\n` +
            `The customer's balance will be set to ₹0.00 after this sale.\n\n` +
            `Do you want to proceed?`
          );

          if (!confirmOverpayment) {
            setIsSubmitting(false);
            return;
          }
        }
      }

      const cleanedSaleData = {
        ...saleData,
        client: saleData.client === '' ? null : saleData.client
      };

      let data;
      if (editingSaleIndex !== null) {
        // Edit existing sale
        const res = await api.put(`/trip/${id}/sale/${editingSaleIndex}`, cleanedSaleData);
        data = res.data;
      } else {
        // Add new sale
        const res = await api.post(`/trip/${id}/sale`, cleanedSaleData);
        data = res.data;
      }

      if (data.success) {
        // Update customer's opening balance if sale has a client
        if (cleanedSaleData.client && cleanedSaleData.balance !== undefined) {
          try {
            await api.put(`/customer/${cleanedSaleData.client}/outstanding-balance`, {
              newOutstandingBalance: cleanedSaleData.balance
            });
            console.log(`Updated customer opening balance to ${cleanedSaleData.balance}`);
          } catch (error) {
            console.error('Error updating customer balance:', error);
            // Don't fail the sale if balance update fails
          }
        }

        fetchTrip(); // Re-fetch trip to update UI
        setShowSaleModal(false);
        setShowSaleModal(false);
        setSaleData({ client: '', billNumber: '', birds: '', weight: '', avgWeight: 0, rate: '', amount: 0, receivedAmount: '', discount: '', balance: 0, cashPaid: '', onlinePaid: '', cashLedger: '', onlineLedger: '', narration: '', sendSms: false });
        setSelectedCustomer(null);
        setSelectedCustomer(null);
        setCustomerSearchTerm('');
        setShowCustomerDropdown(false);
        setCustomerBalance(null);
        setEditingSaleIndex(null);
        alert(editingSaleIndex !== null ? 'Sale updated successfully!' : 'Sale added successfully!');
      }
    } catch (error) {
      console.error('Error saving sale:', error);
      alert(error.response?.data?.message || 'Failed to save sale');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReceiptSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Validate mandatory fields for receipt
      const mandatoryFields = ['client', 'billNumber'];
      const validationErrors = validateMandatoryFields(saleData, mandatoryFields);

      // Validate that at least some payment is made
      const totalPaid = (saleData.cashPaid || 0) + (saleData.onlinePaid || 0);
      if (totalPaid <= 0) {
        validationErrors.push('Please enter at least some payment amount (cash or online)');
      }

      // Validate ledger selection if payment amounts are entered
      const cashPaid = Number(saleData.cashPaid) || 0;
      const onlinePaid = Number(saleData.onlinePaid) || 0;

      if (cashPaid > 0 && !saleData.cashLedger) {
        validationErrors.push('Please select a Cash-in-Hand Ledger when entering cash payment');
      }

      if (onlinePaid > 0 && !saleData.onlineLedger) {
        validationErrors.push('Please select a Bank Account Ledger when entering online payment');
      }

      if (validationErrors.length > 0) {
        alert(`Please fill all mandatory fields:\n${validationErrors.join('\n')}`);
        setIsSubmitting(false);
        return;
      }

      // Prepare receipt data - set birds, weight, rate to 0 for receipts
      const receiptData = {
        ...saleData,
        client: saleData.client === '' ? null : saleData.client,
        birds: 0,
        weight: 0,
        rate: 0,
        amount: saleData.amount || 0,
        avgWeight: 0,
        isReceipt: true,
        saleType: 'receipt' // Add label for reports
      };

      let data;
      if (editingSaleIndex !== null) {
        // Edit existing receipt
        const res = await api.put(`/trip/${id}/sale/${editingSaleIndex}`, receiptData);
        data = res.data;
      } else {
        // Add new receipt as a sale (if needed, though this flow is mainly for edits currently)
        const res = await api.post(`/trip/${id}/sale`, receiptData);
        data = res.data;
      }

      if (data.success) {
        // Update customer's opening balance if receipt has a client and balance
        if (receiptData.client && receiptData.balance !== undefined && receiptData.balance !== 0) {
          try {
            await api.put(`/customer/${receiptData.client}/outstanding-balance`, {
              newOutstandingBalance: receiptData.balance
            });
            console.log(`Updated customer opening balance to ${receiptData.balance}`);
          } catch (error) {
            console.error('Error updating customer balance:', error);
            // Don't fail the receipt if balance update fails
          }
        }

        fetchTrip(); // Re-fetch trip
        setShowReceiptModal(false);
        setShowReceiptModal(false);
        setSaleData({ client: '', billNumber: generateBillNumber(), birds: '', weight: '', avgWeight: 0, rate: '', amount: 0, receivedAmount: '', discount: '', balance: 0, cashPaid: '', onlinePaid: '', cashLedger: '', onlineLedger: '', sendSms: false });
        setSelectedCustomer(null);
        setSelectedCustomer(null);
        setCustomerSearchTerm('');
        setShowCustomerDropdown(false);
        setEditingSaleIndex(null);
        alert(editingSaleIndex !== null ? 'Receipt updated successfully!' : 'Receipt added successfully!');
      }
    } catch (error) {
      console.error('Error with receipt:', error);
      alert(error.response?.data?.message || 'Failed to save receipt');
    } finally {
      setIsSubmitting(false);
    }
  };


  const handleEditExpense = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.put(`/trip/${id}/expenses/${editingExpenseIndex}`, expenseData);
      if (data.success) {
        setTrip(data.data);
        setShowExpenseModal(false);
        setExpenseData({ category: 'meals', description: '', amount: 0, date: new Date().toISOString().split('T')[0] });
        setEditingExpenseIndex(null);
        alert('Expense updated successfully!');
      }
    } catch (error) {
      console.error('Error updating expense:', error);
      alert(error.response?.data?.message || 'Failed to update expense');
    }
  };

  const handleEditDiesel = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.put(`/trip/${id}/diesel/${editingDieselIndex}`, dieselData);
      if (data.success) {
        setTrip(data.data);
        setShowDieselModal(false);
        setEditingDieselIndex(null);
        setDieselData({ stationName: '', volume: 0, rate: 0, amount: 0, date: new Date().toISOString().split('T')[0] });
        alert('Diesel record updated successfully!');
      }
    } catch (error) {
      console.error('Error updating diesel record:', error);
      alert(error.response?.data?.message || 'Failed to update diesel record');
    }
  };

  const handleEditStock = async (e) => {
    e.preventDefault();
    try {
      const cleanedStockData = {
        birds: Number(stockData.birds),
        weight: Number(stockData.weight),
        rate: Number(stockData.rate),
        notes: stockData.notes
      };

      const { data } = await api.put(`/trip/${id}/stock/${editingStockIndex}`, cleanedStockData);
      if (data.success) {
        setTrip(data.data);
        setShowStockModal(false);
        setEditingStockIndex(null);
        setStockData({ birds: 0, weight: 0, avgWeight: 0, rate: 0, value: 0, notes: '' });
        alert('Stock updated successfully!');
      }
    } catch (error) {
      console.error('Error updating stock:', error);
      alert(error.response?.data?.message || 'Failed to update stock');
    }
  };

  const downloadExcel = () => {
    downloadTripExcel2(trip);
  };

  const downloadPDF = () => {
    downloadTripPDF(trip);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">Trip not found</p>
      </div>
    );
  }

  // Check access permissions
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';
  const isSupervisor = user?.role === 'supervisor';
  const isOwner = trip.supervisor?.id === user?.id;

  if (!isAdmin && (!isSupervisor || !isOwner)) {
    return (
      <div className="text-center py-8">
        <h2 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h2>
        <p className="text-gray-600">
          {isSupervisor ? 'You can only view your own trips.' : 'You do not have permission to view this trip.'}
        </p>
      </div>
    );
  }

  const isTripCompleted = trip.status === 'completed';
  const naturalWeightLossAmount = isTripCompleted
    ? (trip.summary?.birdWeightLoss || 0) * (trip.summary?.avgPurchaseRate || 0)
    : 0;
  const totalWeightLossKg =
    (trip.summary?.totalWeightLost || 0) + (isTripCompleted ? (trip.summary?.birdWeightLoss || 0) : 0);
  const mortalityAndWeightLossAmount = (trip.summary?.totalLosses || 0) + naturalWeightLossAmount;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{trip.vehicle?.vehicleNumber || 'N/A'}</h1>
          <p className="text-gray-600 mt-1">{trip.tripId || 'N/A'}</p>
          {trip.type === 'transferred' && (
            <p className="text-orange-600 text-sm font-medium mt-1 flex items-center gap-1">
              <span className="w-2 h-2 bg-orange-600 rounded-full"></span>
              Transferred Trip - Contains transferred stock from Trip{' '}
              {trip.transferredFrom?.tripId ? (
                <Link
                  to={`/trips/${trip.transferredFrom.id}`}
                  className="text-blue-600 hover:text-blue-800 underline cursor-pointer"
                  rel="noopener noreferrer"
                >
                  {trip.transferredFrom.tripId}
                </Link>
              ) : (
                'another trip'
              )}
            </p>
          )}
          <p className="text-gray-500 text-sm mt-1">Manage trip details and operations</p>
        </div>
        <div className="flex gap-2 mt-4 sm:mt-0">
          {/* Excel Download Button - Available for all users */}
          <button
            onClick={() => downloadExcel()}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <FileSpreadsheet size={20} />
            Download Excel
          </button>

          {/* PDF Download Button */}
          <button
            onClick={downloadPDF}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <FileText size={20} />
            Download PDF
          </button>

          {/* Supervisor-only buttons */}
          {isSupervisor && trip.status !== 'completed' && (
            <>
              {/* Only show Add Purchase button for non-transferred trips */}
              {trip.type !== 'transferred' && (
                <button
                  onClick={() => setShowPurchaseModal(true)}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  <Plus size={20} />
                  Add Purchase
                </button>
              )}
              <button
                onClick={() => setShowSaleModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <Plus size={20} />
                Add Sale
              </button>
              <button
                onClick={() => setShowExpenseModal(true)}
                className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <Plus size={20} />
                Add Expense
              </button>
              <button
                onClick={() => setShowCompleteModal(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <CheckCircle size={20} />
                Complete Trip
              </button>
            </>
          )}
        </div>
      </div>

      {/* Trip Overview Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        {/* <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Truck className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{trip.vehicle?.vehicleNumber}</h3>
              <p className="text-sm text-gray-500">{trip.vehicle?.type}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <MapPin className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{trip.route?.from || 'N/A'} - {trip.route?.to || 'N/A'}</h3>
              <p className="text-sm text-gray-500">Location</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{trip.driver}</h3>
              <p className="text-sm text-gray-500">Driver</p>
            </div>
          </div>
        </div>

        {/* Comprehensive Trip Details for Admins */}
        {isAdmin && (
          <div className="bg-white rounded-lg shadow-sm border mb-6">
            {/* PARTICULARS Section */}
            <div className="bg-green-600 text-white px-6 py-3">
              <h3 className="text-lg font-bold">PARTICULARS</h3>
            </div>
            <div className="p-6">
              {/* First Row: DATE | VEHICLE NO | START LOCATION ( ROUTE ) | END LOCATION ( ROUTE ) */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">DATE</label>
                  <div className="text-lg font-semibold text-gray-900">
                    {new Date(trip.date || trip.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">VEHICLE NO</label>
                  <div className="text-lg font-semibold text-gray-900">
                    {trip.vehicle?.vehicleNumber || 'N/A'}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">START LOCATION ( ROUTE )</label>
                  <div className="text-lg font-semibold text-gray-900">
                    {trip.route?.from || 'N/A'}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">END LOCATION ( ROUTE )</label>
                  <div className="text-lg font-semibold text-gray-900">
                    {trip.route?.to || 'N/A'}
                  </div>
                </div>
              </div>

              {/* Second Row: SUPERVISOR | DRIVER | LABOUR | (empty) - aligned with first row columns */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SUPERVISOR</label>
                  <div className="text-lg font-semibold text-gray-900">
                    {trip.supervisor?.name || 'N/A'}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">DRIVER</label>
                  <div className="text-lg font-semibold text-gray-900">
                    {trip.driver || 'N/A'}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">LABOUR</label>
                  <div className="text-lg font-semibold text-gray-900">
                    {trip.labour || 'N/A'}
                  </div>
                </div>
                <div>
                  {/* Empty column to maintain alignment with END LOCATION */}
                </div>
              </div>
            </div>

            {/* Vendor/Purchase Details Section */}
            <div className="border-t">
              <div className="bg-gray-100 px-6 py-3 border-b">
                <h3 className="text-lg font-semibold text-gray-900">PURCHASE DETAILS</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-r">S N</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-r">SUPPLIERS</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-r">DC NO</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-r">BIRDS</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-r">WEIGHT</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-r">AVG</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-r">RATE</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-r">AMOUNT</th>

                    </tr>
                  </thead>
                  <tbody>
                    {trip.purchases?.map((purchase, index) => (
                      <tr key={purchase.id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900 border-r">{index + 1}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 border-r">
                          {trip.type === 'transferred' && purchase.dcNumber?.startsWith('TRANSFER-')
                            ? 'Transferred Purchase'
                            : (purchase.supplier?.vendorName || 'N/A')
                          }
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 border-r">{purchase.dcNumber || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 border-r">{purchase.birds || 0}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 border-r">{purchase.weight || 0}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 border-r">
                          {purchase.weight && purchase.birds ? (purchase.weight / purchase.birds).toFixed(2) : '0.00'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 border-r">₹{(purchase.rate || 0).toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900 border-r">₹{(purchase.amount || 0).toFixed(2)}</td>

                      </tr>
                    ))}
                    {/* Total Row */}
                    <tr className="bg-black text-white font-bold">
                      <td className="px-4 py-3 border-r">TOTAL</td>
                      <td className="px-4 py-3 border-r"></td>
                      <td className="px-4 py-3 border-r"></td>
                      <td className="px-4 py-3 border-r">{trip.summary?.totalBirdsPurchased || 0}</td>
                      <td className="px-4 py-3 border-r">{(trip.summary?.totalWeightPurchased || 0).toFixed(2)}</td>
                      <td className="px-4 py-3 border-r">
                        {trip.summary?.totalBirdsPurchased && trip.summary?.totalWeightPurchased
                          ? (trip.summary.totalWeightPurchased / trip.summary.totalBirdsPurchased).toFixed(2)
                          : '0.00'}
                      </td>
                      <td className="px-4 py-3 border-r"></td>
                      <td className="px-4 py-3 border-r">₹{(trip.summary?.totalPurchaseAmount || 0).toFixed(2)}</td>

                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Customer/Sales Details Section */}
            <div className="border-t">
              <div className="bg-gray-100 px-6 py-3 border-b">
                <h3 className="text-lg font-semibold text-gray-900">SALES DETAILS</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-r">S N</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-r">DELIVERY DETAILS</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-r">BILL NO</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-r">BIRDS</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-r">WEIGHT</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-r">AVG</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-r">RATE</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-r">TOTAL</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-r">CASH RECEIPT</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-r">ONLINE RECEIPT</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">DISC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Sales Entries */}
                    {trip.sales?.map((sale, index) => (
                      <tr key={`sale-${sale.id}`} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900 border-r">{index + 1}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 border-r">
                          <div>{sale.client?.shopName || 'N/A'}</div>
                          {sale.narration && (
                            <div className="text-xs text-gray-500 italic mt-0.5">{sale.narration}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 border-r">{sale.billNumber || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 border-r">{sale.birdsCount || sale.birds || 0}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 border-r">{sale.weight || 0}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 border-r">
                          {sale.weight && (sale.birdsCount || sale.birds) ? (sale.weight / (sale.birdsCount || sale.birds)).toFixed(2) : '0.00'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 border-r">₹{(sale.ratePerKg || sale.rate || 0).toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900 border-r">₹{(sale.totalAmount || sale.amount || 0).toFixed(2)}</td>

                        <td className="px-4 py-3 text-sm font-semibold text-gray-900 border-r">₹{(sale.cashPaid || 0).toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900 border-r">₹{(sale.onlinePaid || 0).toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900">₹{(sale.discount || 0).toFixed(2)}</td>
                      </tr>
                    ))}

                    {/* Stocks Entries */}
                    {trip.stocks?.map((stock, index) => (
                      <tr key={`stock-${index}`} className="border-b hover:bg-blue-100 bg-blue-100">
                        <td className="px-4 py-3 text-sm text-gray-900 border-r font-medium">{(trip.sales?.length || 0) + index + 1}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 border-r font-medium">
                          <span className="text-blue-700 font-semibold">Stock Point #{index + 1}</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 border-r">{stock.billNumber || ''}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 border-r font-medium">{stock.birds || 0}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 border-r font-medium">{(stock.weight || 0).toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 border-r font-medium">
                          {stock.weight && stock.birds ? (stock.weight / stock.birds).toFixed(2) : '0.00'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 border-r font-medium">₹{(stock.rate || 0).toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm font-bold text-blue-800 border-r">₹{(stock.value || 0).toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 border-r">-</td>
                        <td className="px-4 py-3 text-sm text-gray-500 border-r">-</td>
                        <td className="px-4 py-3 text-sm text-gray-500">-</td>
                      </tr>
                    ))}

                    {/* Transfer Entries */}
                    {trip.transfers?.map((transfer, index) => (
                      <tr key={`transfer-${index}`} className="border-b hover:bg-gray-50 bg-orange-50">
                        <td className="px-4 py-3 text-sm text-gray-900 border-r">{(trip.sales?.length || 0) + (trip.stocks?.length || 0) + index + 1}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 border-r">Transferred to Trip #{transfer.transferredTo}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 border-r">{new Date(transfer.transferredAt).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 border-r">{transfer.transferredStock?.birds || 0}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 border-r">{(transfer.transferredStock?.weight || 0).toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 border-r">
                          {transfer.transferredStock?.avgWeight || '0.00'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 border-r">₹{(transfer.transferredStock?.rate || 0).toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900 border-r">
                          ₹{((transfer.transferredStock?.weight || 0) * (transfer.transferredStock?.rate || 0)).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 border-r">-</td>
                        <td className="px-4 py-3 text-sm text-gray-500 border-r">-</td>
                        <td className="px-4 py-3 text-sm text-gray-500">-</td>
                      </tr>
                    ))}

                    {/* Transferred Sales Entries - Show transferred stock data */}
                    {trip.transferHistory?.map((transfer, transferIndex) => {
                      const transferredStock = transfer.transferredStock;

                      return (
                        <tr key={`transfer-sales-${transferIndex}`} className="border-b hover:bg-purple-100 bg-purple-100">
                          <td className="px-4 py-3 text-sm text-gray-900 border-r font-medium">{(trip.sales?.length || 0) + (trip.stocks?.length || 0) + (trip.transfers?.length || 0) + transferIndex + 1}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 border-r font-medium">
                            <div className="text-purple-800 font-bold">
                              Vehicle No: {transfer.transferredTo?.vehicle?.vehicleNumber || 'N/A'}
                            </div>
                            <div className="text-purple-800 font-bold">
                              Supervisor: {transfer.transferredToSupervisor?.name || 'N/A'}
                            </div>
                            <div className="text-xs text-purple-700 mt-1">
                              (To Trip #{transfer.transferredTo?.tripId ? (
                                <Link
                                  to={`/trips/${transfer.transferredTo.id}`}
                                  className="text-blue-600 hover:text-blue-800 underline cursor-pointer"
                                >
                                  {transfer.transferredTo.tripId}
                                </Link>
                              ) : (
                                transfer.transferredTo || 'N/A'
                              )})
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 border-r">{new Date(transfer.transferredAt).toLocaleDateString()}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 border-r font-medium">{transferredStock?.birds || 0}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 border-r font-medium">{(transferredStock?.weight || 0).toFixed(2)}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 border-r font-medium">
                            {(transferredStock?.avgWeight).toFixed(2) || (transferredStock?.weight && transferredStock?.birds ? (transferredStock.weight / transferredStock.birds).toFixed(2) : '0.00')}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 border-r font-medium">₹{(transferredStock?.rate || 0).toFixed(2)}</td>
                          <td className="px-4 py-3 text-sm font-bold text-purple-800 border-r">₹{(transferredStock?.rate * transferredStock?.weight || 0).toFixed(2)}</td>
                          <td className="px-4 py-3 text-sm text-gray-500 border-r">-</td>
                          <td className="px-4 py-3 text-sm text-gray-500 border-r">-</td>
                          <td className="px-4 py-3 text-sm text-gray-500">-</td>
                        </tr>
                      );
                    })}
                    {/* Total Sales Row - Only Customer Sales for Display */}
                    {/* Total Sales Row - Includes Sales + Stock Points */}
                    <tr className="bg-black text-white font-bold">
                      <td className="px-4 py-3 border-r">TOTAL</td>
                      <td className="px-4 py-3 border-r"></td>
                      <td className="px-4 py-3 border-r"></td>
                      <td className="px-4 py-3 border-r">
                        {(() => {
                          const salesBirds = trip.summary?.customerBirdsSold || 0;
                          const stockBirds = trip.stocks?.reduce((sum, s) => sum + (Number(s.birds) || 0), 0) || 0;
                          return salesBirds + stockBirds;
                        })()}
                      </td>
                      <td className="px-4 py-3 border-r">
                        {(() => {
                          const salesWeight = trip.summary?.customerWeightSold || 0;
                          const stockWeight = trip.stocks?.reduce((sum, s) => sum + (Number(s.weight) || 0), 0) || 0;
                          return (salesWeight + stockWeight).toFixed(2);
                        })()}
                      </td>
                      <td className="px-4 py-3 border-r">
                        {(() => {
                          const salesBirds = trip.summary?.customerBirdsSold || 0;
                          const stockBirds = trip.stocks?.reduce((sum, s) => sum + (Number(s.birds) || 0), 0) || 0;
                          const salesWeight = trip.summary?.customerWeightSold || 0;
                          const stockWeight = trip.stocks?.reduce((sum, s) => sum + (Number(s.weight) || 0), 0) || 0;
                          const totalBirds = salesBirds + stockBirds;
                          const totalWeight = salesWeight + stockWeight;
                          return totalBirds > 0 ? (totalWeight / totalBirds).toFixed(2) : '0.00';
                        })()}
                      </td>
                      <td className="px-4 py-3 border-r">
                        {(() => {
                          const salesAmount = trip.summary?.customerSalesAmount || 0;
                          const stockAmount = trip.stocks?.reduce((sum, s) => sum + (Number(s.value) || 0), 0) || 0;
                          const salesWeight = trip.summary?.customerWeightSold || 0;
                          const stockWeight = trip.stocks?.reduce((sum, s) => sum + (Number(s.weight) || 0), 0) || 0;
                          const totalAmount = salesAmount + stockAmount;
                          const totalWeight = salesWeight + stockWeight;
                          return totalWeight > 0 ? (totalAmount / totalWeight).toFixed(2) : '0.00';
                        })()}
                      </td>
                      <td className="px-4 py-3 border-r">
                        ₹{(() => {
                          const salesAmount = trip.summary?.customerSalesAmount || 0;
                          const stockAmount = trip.stocks?.reduce((sum, s) => sum + (Number(s.value) || 0), 0) || 0;
                          return (salesAmount + stockAmount).toFixed(2);
                        })()}
                      </td>
                      <td className="px-4 py-3 border-r">₹{(trip.summary?.totalCashPaid || 0).toFixed(2)}</td>
                      <td className="px-4 py-3 border-r">₹{(trip.summary?.totalOnlinePaid || 0).toFixed(2)}</td>
                      <td className="px-4 py-3">₹{(trip.summary?.totalDiscount || 0).toFixed(2)}</td>
                    </tr>


                    {/* Total Transfer Row */}
                    {trip.transfers && trip.transfers.length > 0 && (
                      <tr className="bg-orange-600 text-white font-bold">
                        <td className="px-4 py-3 border-r">TOTAL TRANSFER</td>
                        <td className="px-4 py-3 border-r"></td>
                        <td className="px-4 py-3 border-r"></td>
                        <td className="px-4 py-3 border-r">{trip.transfers.reduce((sum, transfer) => sum + (transfer.transferredStock?.birds || 0), 0)}</td>
                        <td className="px-4 py-3 border-r">{(trip.transfers.reduce((sum, transfer) => sum + (transfer.transferredStock?.weight || 0), 0)).toFixed(2)}</td>
                        <td className="px-4 py-3 border-r">
                          {(() => {
                            const totalTransferBirds = trip.transfers.reduce((sum, transfer) => sum + (transfer.transferredStock?.birds || 0), 0);
                            const totalTransferWeight = trip.transfers.reduce((sum, transfer) => sum + (transfer.transferredStock?.weight || 0), 0);
                            return totalTransferBirds > 0 ? (totalTransferWeight / totalTransferBirds).toFixed(2) : '0.00';
                          })()}
                        </td>
                        <td className="px-4 py-3 border-r">-</td>
                        <td className="px-4 py-3 border-r">
                          ₹{(trip.transfers.reduce((sum, transfer) => sum + ((transfer.transferredStock?.weight || 0) * (transfer.transferredStock?.rate || 0)), 0)).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 border-r">-</td>
                        <td className="px-4 py-3 border-r">-</td>
                        <td className="px-4 py-3">-</td>
                      </tr>
                    )}

                  </tbody>
                </table>
              </div>
            </div>

            <div className="border-t">
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">WEIGHT LOSS TRACKING</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-200">
                          <tr>
                            <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-r"></th>
                            <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-r">BIRDS</th>
                            <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-r">WEIGHT</th>
                            <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-r">AVG</th>
                            <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-r">RATE</th>
                            <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700">AMOUNT</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b">
                            <td className="px-3 py-2 text-sm text-gray-900 border-r">DEATH BIRDS</td>
                            <td className="px-3 py-2 text-sm text-gray-900 border-r">{trip.summary?.totalBirdsLost || 0}</td>
                            <td className="px-3 py-2 text-sm text-gray-900 border-r">{(trip.summary?.totalWeightLost || 0).toFixed(2)}</td>
                            <td className="px-3 py-2 text-sm text-gray-900 border-r">
                              {trip.summary?.totalBirdsPurchased > 0 ? ((trip.summary?.totalWeightPurchased / trip.summary?.totalBirdsPurchased) || 0).toFixed(2) : '0.00'}
                            </td>
                            <td className="px-3 py-2 text-sm text-gray-900 border-r">₹{trip.summary?.avgPurchaseRate?.toFixed(2) || 0}</td>
                            <td className="px-3 py-2 text-sm font-semibold text-gray-900">₹{(trip.summary?.totalLosses || 0).toFixed(2)}</td>
                          </tr>
                          <tr className="border-b">
                            <td className="px-3 py-2 text-sm text-gray-900 border-r">NATURAL WEIGHT LOSS</td>
                            <td className="px-3 py-2 text-sm text-gray-900 border-r">-</td>
                            <td className="px-3 py-2 text-sm text-gray-900 border-r">
                              {isTripCompleted ? (trip.summary?.birdWeightLoss || 0).toFixed(2) : '0.00'}
                            </td>
                            <td className="px-3 py-2 text-sm text-gray-900 border-r">
                              {trip.summary?.totalBirdsPurchased > 0 ? ((trip.summary?.totalWeightPurchased / trip.summary?.totalBirdsPurchased) || 0).toFixed(2) : '0.00'}
                            </td>
                            <td className="px-3 py-2 text-sm text-gray-900 border-r">
                              ₹{trip.summary?.avgPurchaseRate?.toFixed(2) || '0.00'}
                            </td>
                            <td className="px-3 py-2 text-sm font-semibold text-gray-900">
                              ₹{isTripCompleted ?
                                ((trip.summary?.birdWeightLoss || 0) * (trip.summary?.avgPurchaseRate || 0)).toFixed(2) : '0.00'}
                            </td>
                          </tr>
                          <tr className="bg-black text-white font-bold">
                            <td className="px-3 py-2 border-r">TOTAL W LOSS</td>
                            <td className="px-3 py-2 border-r">{trip.summary?.totalBirdsLost || 0}</td>
                            <td className="px-3 py-2 border-r">
                              {totalWeightLossKg.toFixed(2)}
                            </td>
                            <td className="px-3 py-2 border-r">
                              -
                            </td>
                            <td className="px-3 py-2 border-r">₹{trip.summary?.avgPurchaseRate?.toFixed(2) || '0.00'}</td>
                            <td className="px-3 py-2">
                              ₹{mortalityAndWeightLossAmount.toFixed(2)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">DIESEL CONSUMPTION</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-200">
                          <tr>
                            <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-r">DIESEL</th>
                            <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-r">INDENT NO</th>
                            <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-r">VOL</th>
                            <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-r">RATE</th>
                            <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700">AMT</th>
                          </tr>
                        </thead>
                        <tbody>
                          {
                            trip.diesel?.stations && trip.diesel.stations.map((station, index) => (
                              <tr key={index} className="border-b">
                                <td className="px-3 py-2 text-sm text-gray-900 border-r">
                                  <div>{getDieselStationName(station)}</div>
                                  {station.narration && (
                                    <div className="text-xs text-gray-500 italic mt-0.5">{station.narration}</div>
                                  )}
                                </td>
                                <td className="px-3 py-2 text-sm text-gray-900 border-r">{station.indentNumber || '-'}</td>
                                <td className="px-3 py-2 text-sm text-gray-900 border-r">{(station.volume || 0).toFixed(2)}</td>
                                <td className="px-3 py-2 text-sm text-gray-900 border-r">₹{(station.rate || 0).toFixed(2)}</td>
                                <td className="px-3 py-2 text-sm font-semibold text-gray-900">₹{(station.amount || 0).toFixed(2)}</td>
                              </tr>
                            ))
                          }

                          {(() => {
                            const totals = trip.diesel.stations.reduce(
                              (acc, s) => {
                                acc.volume += s.volume;
                                acc.rate += s.rate;
                                acc.amount += s.amount;
                                return acc;
                              },
                              { volume: 0, rate: 0, amount: 0 }
                            );

                            return (
                              <tr className="bg-gray-100 font-bold">
                                <td className="px-3 py-2 border-r">TOTAL</td>
                                <td className="px-3 py-2 border-r"></td>
                                <td className="px-3 py-2 border-r">{(totals.volume || 0).toFixed(2)}</td>
                                <td className="px-3 py-2 border-r">₹{(totals.rate / (trip?.diesel?.stations?.length || 1)).toFixed(2)}</td>
                                <td className="px-3 py-2">₹{(totals.amount || 0).toFixed(2)}</td>
                              </tr>
                            );
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Trip Metrics and Financial Summary */}
            <div className="border-t">
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Column - Financial Summary */}
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">FINANCIAL SUMMARY</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">TOTAL SALES:</span>
                        <span className="font-semibold">₹{(trip.summary?.totalSalesAmount || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">TOTAL PURCHASE:</span>
                        <span className="font-semibold">₹{(trip.summary?.totalPurchaseAmount || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">GROSS PROFIT:</span>
                        <span className="font-semibold">₹{(trip.summary?.totalProfitMargin || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">TOTAL EXP:</span>
                        <span className="font-semibold">₹{(trip.summary?.totalExpenses || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">GROSS RENT:</span>
                        <span className="font-semibold">₹{(trip.vehicleReadings?.totalDistance ? (trip.vehicleReadings.totalDistance * (trip.rentPerKm || 0)) : 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">MORTALITY & WEIGHT LOSS:</span>
                        <span className="font-semibold">₹{mortalityAndWeightLossAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between bg-gray-700 text-white px-3 py-2 rounded">
                        <span className="text-sm font-semibold">BIRDS PROFIT:</span>
                        <span className="font-semibold">₹{(trip.summary?.birdsProfit || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between bg-black text-white px-3 py-2 rounded">
                        <span className="text-sm font-bold">MARGIN:</span>
                        <span className="font-bold">
                          ₹{(trip.summary?.totalWeightSold && trip.summary?.totalWeightSold > 0)
                            ? (trip.summary.netProfit / trip.summary.totalWeightSold).toFixed(2)
                            : '0.00'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column - Trip Metrics */}
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">TRIP METRICS</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">TOTAL RUNNING KM:</span>
                        <span className="font-semibold">{(trip.vehicleReadings?.totalDistance || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">TOTAL DIESEL VOL:</span>
                        <span className="font-semibold">{(trip.diesel?.totalVolume || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">VEHICLE AVERAGE:</span>
                        <span className="font-semibold">
                          {trip.vehicleReadings?.totalDistance && trip.diesel?.totalVolume
                            ? (trip.vehicleReadings.totalDistance / trip.diesel.totalVolume).toFixed(2)
                            : '0.00'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">RENT PER KM:</span>
                        <span className="font-semibold">₹{(trip.rentPerKm || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">GROSS RENT:</span>
                        <span className="font-semibold">₹{(trip.vehicleReadings?.totalDistance ? (trip.vehicleReadings.totalDistance * (trip.rentPerKm || 0)) : 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">LESS DIESEL COST:</span>
                        <span className="font-semibold">₹{(trip.summary?.totalDieselAmount || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between bg-gray-700 text-white px-3 py-2 rounded">
                        <span className="text-sm font-semibold">NETT RENT:</span>
                        <span className="font-semibold">
                          ₹{(trip.vehicleReadings?.totalDistance
                            ? ((trip.vehicleReadings.totalDistance * (trip.rentPerKm || 0)) - (trip.summary?.totalDieselAmount || 0))
                            : 0).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between bg-black text-white px-3 py-2 rounded">
                        <span className="text-sm font-bold">TRIP PROFIT:</span>
                        <span className="font-bold">₹{(trip.summary?.tripProfit || 0).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {/* removed - 'stock' tab */}
            {['overview', 'purchases', 'sales', 'receipts', 'expenses', 'diesel', 'losses', 'transfers', 'financials'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              {/* <h3 className="text-lg font-semibold text-gray-900">Trip Summary</h3> */}
              <div className={`grid grid-cols-1 ${user.role !== 'admin' && user.role !== 'superadmin' ? 'lg:grid-cols-2' : ''} gap-4 sm:gap-6`}>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Trip Details</h3>
                    {/* Edit button - only show for completed trips */}
                    {trip.status === 'completed' && (
                      <button
                        onClick={() => setShowEditTripModal(true)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                      >
                        <Edit size={16} />
                        Edit
                      </button>
                    )}
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="text-sm text-gray-600 truncate">Location: {trip.route?.from || 'N/A'} - {trip.route?.to || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Truck className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="text-sm text-gray-600 truncate">Vehicle: {trip.vehicle?.vehicleNumber}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Users className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="text-sm text-gray-600 truncate">Driver: {trip.driver}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Users className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="text-sm text-gray-600 truncate">Labours: {trip.labour || 'N/A'}</span>
                    </div>


                    {trip.vehicleReadings?.opening && (
                      <div className="flex items-center gap-3">
                        <Truck className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span className="text-sm text-gray-600 truncate">
                          Opening Odometer: {trip.vehicleReadings.opening} km
                        </span>
                      </div>
                    )}

                    {trip.status === 'completed' && trip.vehicleReadings?.closing && (
                      <div className="flex items-center gap-3">
                        <Truck className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span className="text-sm text-gray-600 truncate">
                          Closing Odometer: {trip.vehicleReadings.closing} km
                        </span>
                      </div>
                    )}

                    {trip.status === 'completed' && trip.vehicleReadings?.totalDistance && (
                      <div className="flex items-center gap-3">
                        <Truck className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span className="text-sm text-gray-600 truncate">
                          Total Running KM: {trip.vehicleReadings.totalDistance.toFixed(2)} km
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Hide Financial Summary for admin users in overview tab */}
                {user.role !== 'admin' && user.role !== 'superadmin' && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900">Financial Summary</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Total Sales:</span>
                        <span className="font-medium text-right">₹{trip.summary?.totalSalesAmount?.toFixed(2) || '0.00'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Total Purchase:</span>
                        <span className="font-medium text-right">₹{trip.summary?.totalPurchaseAmount?.toFixed(2) || '0.00'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Gross Profit:</span>
                        <span className="font-medium text-green-600 text-right">₹{trip.summary?.totalProfitMargin?.toFixed(2) || '0.00'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Total Expenses:</span>
                        <span className="font-medium text-right">₹{trip.summary?.totalExpenses?.toFixed(2) || '0.00'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Diesel Cost:</span>
                        <span className="font-medium text-right">₹{trip.summary?.totalDieselAmount?.toFixed(2) || '0.00'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Mortality & Weight Loss :</span>
                        <span className="font-medium text-red-600 text-right">₹{mortalityAndWeightLossAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center border-t pt-3 mt-3">
                        <span className="text-sm font-medium text-gray-900">Net Profit:</span>
                        <span className="text-lg font-semibold text-green-600 text-right">
                          ₹{trip.status === 'completed' ? (trip.summary?.netProfit?.toFixed(2) || '0.00') : Math.max(0, trip.summary?.netProfit || 0).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>


            </div>
          )}

          {/* Purchases Tab */}
          {activeTab === 'purchases' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Purchases</h3>
                {/* Only show Add Purchase button for non-transferred trips */}
                {trip.status !== 'completed' && trip.type !== 'transferred' && (
                  <button
                    onClick={() => setShowPurchaseModal(true)}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                  >
                    <Plus size={16} />
                    Add Purchase
                  </button>
                )}
              </div>
              {/* Informational message for transferred trips */}
              {trip.type === 'transferred' && (
                <div className="bg-orange-50 border-l-4 border-orange-400 p-4 rounded">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-orange-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-orange-700">
                        <strong>Transferred Trip:</strong> This trip contains transferred stock and cannot be modified.
                        Purchase records show the transferred stock from the original trip.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              {trip.purchases && trip.purchases.length > 0 ? (
                <div className="space-y-3">
                  {trip.purchases.map((purchase, index) => (
                    <div key={index} className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium text-gray-900">DC: {purchase.dcNumber}</h4>
                          <p className="text-sm text-gray-600">
                            {trip.type === 'transferred' && purchase.dcNumber?.startsWith('TRANSFER-')
                              ? 'Transferred from another trip'
                              : `Vendor: ${purchase.supplier?.vendorName || 'N/A'}`
                            }
                          </p>
                          <p className="text-sm text-gray-600">
                            Birds: {purchase.birds} | Weight: {purchase.weight}kg | Rate: ₹{purchase.rate}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-green-600">₹{purchase.amount?.toLocaleString()}</p>
                          {/* <p className="text-sm text-gray-500">{purchase.paymentMode}</p> */}
                          {/* Edit button for completed trips - Admin/Superadmin only - Not for transferred trips */}
                          {trip.status === 'completed' && (user.role === 'admin' || user.role === 'superadmin') && trip.type !== 'transferred' && (
                            <button
                              onClick={() => {
                                // Extract supplier ID properly - handle both populated and non-populated supplier fields
                                let supplierId = '';
                                if (typeof purchase.supplier === 'string') {
                                  supplierId = purchase.supplier;
                                } else if (purchase.supplier && (purchase.supplier._id || purchase.supplier.id)) {
                                  supplierId = purchase.supplier._id || purchase.supplier.id;
                                }

                                setPurchaseData({
                                  supplier: supplierId,
                                  dcNumber: purchase.dcNumber || '',
                                  birds: purchase.birds || 0,
                                  weight: purchase.weight || 0,
                                  avgWeight: purchase.avgWeight || 0,
                                  rate: purchase.rate || 0,
                                  amount: purchase.amount || 0
                                });
                                setEditingPurchaseIndex(index);
                                setShowPurchaseModal(true);
                              }}
                              className="mt-2 px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 flex items-center gap-1"
                            >
                              <Edit size={12} />
                              Edit
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No purchases recorded yet.</p>
              )}
            </div>
          )}

          {/* Sales Tab */}
          {activeTab === 'sales' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  {isAdmin ? 'Delivery Details' : 'Sales'}
                </h3>
                {isSupervisor && trip.status !== 'completed' && (
                  <button
                    onClick={() => {
                      setSaleData({
                        client: '',
                        billNumber: generateBillNumber(),
                        birds: '',
                        weight: '',
                        avgWeight: 0,
                        rate: '',
                        amount: 0,
                        receivedAmount: '',
                        discount: '',
                        balance: 0,
                        cashPaid: '',
                        onlinePaid: '',
                        cashLedger: '',
                        onlineLedger: ''
                      });
                      setEditingSaleIndex(null);
                      setShowSaleModal(true);
                      setSelectedCustomer(null);
                      setCustomerSearchTerm('');
                      setCustomerBalance(null);
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                  >
                    <Plus size={16} />
                    Add Sale
                  </button>
                )}
              </div>
              {trip.sales && trip.sales.length > 0 ? (
                isAdmin ? (
                  // Admin view - Detailed table
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-300">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="border border-gray-300 px-4 py-2 text-left text-sm font-medium text-gray-700">S.N.</th>
                          <th className="border border-gray-300 px-4 py-2 text-left text-sm font-medium text-gray-700">Delivery Detail</th>
                          <th className="border border-gray-300 px-4 py-2 text-left text-sm font-medium text-gray-700">Bill No</th>
                          <th className="border border-gray-300 px-4 py-2 text-center text-sm font-medium text-gray-700">Birds</th>
                          <th className="border border-gray-300 px-4 py-2 text-center text-sm font-medium text-gray-700">Weight</th>
                          <th className="border border-gray-300 px-4 py-2 text-center text-sm font-medium text-gray-700">Avg</th>
                          <th className="border border-gray-300 px-4 py-2 text-center text-sm font-medium text-gray-700">Rate</th>
                          <th className="border border-gray-300 px-4 py-2 text-center text-sm font-medium text-gray-700">Total</th>
                          <th className="border border-gray-300 px-4 py-2 text-center text-sm font-medium text-gray-700">Cash</th>
                          <th className="border border-gray-300 px-4 py-2 text-center text-sm font-medium text-gray-700">Online</th>
                          <th className="border border-gray-300 px-4 py-2 text-center text-sm font-medium text-gray-700">Disc</th>
                          {/* Edit column for completed trips - Admin/Superadmin only */}
                          {trip.status === 'completed' && (user.role === 'admin' || user.role === 'superadmin') && (
                            <th className="border border-gray-300 px-4 py-2 text-center text-sm font-medium text-gray-700">Actions</th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {trip.sales.filter(sale => (sale.birds > 0 || sale.weight > 0)).map((sale, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="border border-gray-300 px-4 py-2 text-sm text-gray-900">{index + 1}</td>
                            <td className="border border-gray-300 px-4 py-2 text-sm text-gray-900">{sale.client?.shopName || 'N/A'}</td>
                            <td className="border border-gray-300 px-4 py-2 text-sm text-gray-900">{sale.billNumber || 'N/A'}</td>
                            <td className="border border-gray-300 px-4 py-2 text-sm text-center text-gray-900">{sale.birds || 0}</td>
                            <td className="border border-gray-300 px-4 py-2 text-sm text-center text-gray-900">{sale.weight || 0}</td>
                            <td className="border border-gray-300 px-4 py-2 text-sm text-center text-gray-900">
                              {sale.weight && sale.birds ? (sale.weight / sale.birds).toFixed(2) : '0.00'}
                            </td>
                            <td className="border border-gray-300 px-4 py-2 text-sm text-center text-gray-900">₹{sale.rate || 0}</td>
                            <td className="border border-gray-300 px-4 py-2 text-sm text-center text-gray-900">₹{sale.amount?.toLocaleString() || '0'}</td>
                            <td className="border border-gray-300 px-4 py-2 text-sm text-center text-gray-900">
                              ₹{(sale.cashPaid || 0).toLocaleString()}
                            </td>
                            <td className="border border-gray-300 px-4 py-2 text-sm text-center text-gray-900">
                              ₹{(sale.onlinePaid || 0).toLocaleString()}
                            </td>
                            <td className="border border-gray-300 px-4 py-2 text-sm text-center text-gray-900">₹{(sale.discount || 0).toLocaleString()}</td>
                            {/* Edit button for completed trips - Admin/Superadmin only */}
                            {trip.status === 'completed' && (user.role === 'admin' || user.role === 'superadmin') && (
                              <td className="border border-gray-300 px-4 py-2 text-center">
                                <button
                                  onClick={() => {
                                    // Extract client ID properly
                                    let clientId = '';
                                    if (typeof sale.client === 'string') {
                                      clientId = sale.client;
                                    } else if (sale.client && (sale.client._id || sale.client.id)) {
                                      clientId = sale.client._id || sale.client.id;
                                    }

                                    // Try to find full customer object from loaded customers list first
                                    let clientObj = customers.find(c => c._id === clientId || c.id === clientId);

                                    // Fallback to sale.client if not found in list but exists as object
                                    if (!clientObj && typeof sale.client === 'object' && sale.client) {
                                      clientObj = sale.client;
                                    }

                                    if (clientObj) {
                                      setSelectedCustomer(clientObj);
                                      setCustomerSearchTerm(`${clientObj.shopName} - ${clientObj.ownerName || 'N/A'}`);
                                      fetchCustomerBalance(clientObj);
                                    } else {
                                      setSelectedCustomer(null);
                                      setCustomerSearchTerm('');
                                      setCustomerBalance(null);
                                    }

                                    setSaleData({
                                      client: clientId,
                                      billNumber: sale.billNumber || '',
                                      birds: sale.birds || 0,
                                      weight: sale.weight || 0,
                                      avgWeight: sale.avgWeight || 0,
                                      rate: sale.rate || 0,
                                      amount: sale.amount || 0,
                                      receivedAmount: sale.receivedAmount || 0,
                                      discount: sale.discount || 0,
                                      balance: sale.balance || 0,
                                      cashPaid: sale.cashPaid || 0,
                                      onlinePaid: sale.onlinePaid || 0,
                                      cashLedger: sale.cashLedger?._id || sale.cashLedger || '',
                                      onlineLedger: sale.onlineLedger?._id || sale.onlineLedger || ''
                                    });
                                    setEditingSaleIndex(index);
                                    setShowSaleModal(true);
                                  }}
                                  className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 flex items-center gap-1"
                                >
                                  <Edit size={10} />
                                  Edit
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                        <tr className="bg-gray-100 font-semibold">
                          <td className="border border-gray-300 px-4 py-2 text-sm text-gray-900" colSpan="3">TOTAL</td>
                          <td className="border border-gray-300 px-4 py-2 text-sm text-center text-gray-900">{trip.summary?.customerBirdsSold || 0}</td>
                          <td className="border border-gray-300 px-4 py-2 text-sm text-center text-gray-900">{trip.summary?.customerWeightSold || 0}</td>
                          <td className="border border-gray-300 px-4 py-2 text-sm text-center text-gray-900">
                            {trip.summary?.customerWeightSold && trip.summary?.customerBirdsSold ?
                              (trip.summary.customerWeightSold / trip.summary.customerBirdsSold).toFixed(2) : '0.00'}
                          </td>
                          <td className="border border-gray-300 px-4 py-2 text-sm text-center text-gray-900">₹{trip.summary?.averageRate || 0}</td>
                          <td className="border border-gray-300 px-4 py-2 text-sm text-center text-gray-900">₹{trip.summary?.customerSalesAmount?.toLocaleString() || '0'}</td>
                          <td className="border border-gray-300 px-4 py-2 text-sm text-center text-gray-900">₹{(trip.summary?.totalCashPaid || 0).toLocaleString()}</td>
                          <td className="border border-gray-300 px-4 py-2 text-sm text-center text-gray-900">₹{(trip.summary?.totalOnlinePaid || 0).toLocaleString()}</td>
                          <td className="border border-gray-300 px-4 py-2 text-sm text-center text-gray-900">₹{(trip.summary?.totalDiscount || 0).toLocaleString()}</td>
                          {trip.status === 'completed' && (user.role === 'admin' || user.role === 'superadmin') && (
                            <td className="border border-gray-300 px-4 py-2"></td>
                          )}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                ) : (
                  // Supervisor view - Simple cards
                  <div className="space-y-3">
                    {trip.sales.map((sale, index) => (
                      <div key={index} className="p-4 border border-gray-200 rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium text-gray-900">Bill: {sale.billNumber}</h4>
                            <p className="text-sm text-gray-600">Customer: {sale.client?.shopName}</p>
                            <p className="text-sm text-gray-600">
                              Birds: {sale.birds} | Weight: {sale.weight}kg | Rate: ₹{sale.rate}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-blue-600">₹{sale.amount?.toLocaleString()}</p>
                            <p className="text-sm text-gray-500">Balance: ₹{sale.balance?.toLocaleString()}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                <p className="text-gray-500 text-center py-8">No sales recorded yet.</p>
              )}
            </div>
          )}

          {/* Receipts Tab */}
          {activeTab === 'receipts' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  {isAdmin ? 'Receipt Details' : 'Receipts'}
                </h3>
              </div>
              {(() => {
                // Filter receipts from sales (where isReceipt is true or birds/weight/amount are 0)
                const receipts = trip.sales?.filter(sale =>
                  sale.isReceipt === true ||
                  ((sale.birds === 0 || !sale.birds) && (sale.weight === 0 || !sale.weight) && (sale.amount === 0 || !sale.amount))
                ) || [];

                if (receipts.length > 0) {
                  return isAdmin ? (
                    // Admin view - Detailed table
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse border border-gray-300">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="border border-gray-300 px-4 py-2 text-left text-sm font-medium text-gray-700">S.N.</th>
                            <th className="border border-gray-300 px-4 py-2 text-left text-sm font-medium text-gray-700">Customer</th>
                            <th className="border border-gray-300 px-4 py-2 text-left text-sm font-medium text-gray-700">Bill No</th>
                            <th className="border border-gray-300 px-4 py-2 text-center text-sm font-medium text-gray-700">Cash Receipt</th>
                            <th className="border border-gray-300 px-4 py-2 text-center text-sm font-medium text-gray-700">Online Receipt</th>
                            <th className="border border-gray-300 px-4 py-2 text-center text-sm font-medium text-gray-700">Discount</th>
                            <th className="border border-gray-300 px-4 py-2 text-center text-sm font-medium text-gray-700">Balance</th>
                            {/* Edit column for completed trips - Admin/Superadmin only */}
                            {trip.status === 'completed' && (user.role === 'admin' || user.role === 'superadmin') && (
                              <th className="border border-gray-300 px-4 py-2 text-center text-sm font-medium text-gray-700">Actions</th>
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {receipts.map((receipt, index) => {
                            // Find the original index in trip.sales array for editing
                            const originalIndex = trip.sales?.findIndex(s =>
                              s._id === receipt._id ||
                              s.id === receipt.id ||
                              (s.billNumber === receipt.billNumber && s.isReceipt === true)
                            ) ?? -1;

                            return (
                              <tr key={index} className="hover:bg-gray-50">
                                <td className="border border-gray-300 px-4 py-2 text-sm text-gray-900">{index + 1}</td>
                                <td className="border border-gray-300 px-4 py-2 text-sm text-gray-900">{receipt.client?.shopName || 'N/A'}</td>
                                <td className="border border-gray-300 px-4 py-2 text-sm text-gray-900">{receipt.billNumber || 'N/A'}</td>
                                <td className="border border-gray-300 px-4 py-2 text-sm text-center text-gray-900">
                                  ₹{(receipt.cashPaid || 0).toLocaleString()}
                                </td>
                                <td className="border border-gray-300 px-4 py-2 text-sm text-center text-gray-900">
                                  ₹{(receipt.onlinePaid || 0).toLocaleString()}
                                </td>
                                <td className="border border-gray-300 px-4 py-2 text-sm text-center text-gray-900">
                                  ₹{(receipt.discount || 0).toLocaleString()}
                                </td>
                                <td className="border border-gray-300 px-4 py-2 text-sm text-center text-gray-900">
                                  ₹{(receipt.balance || 0).toLocaleString()}
                                </td>
                                {/* Edit button for completed trips - Admin/Superadmin only */}
                                {trip.status === 'completed' && (user.role === 'admin' || user.role === 'superadmin') && originalIndex >= 0 && (
                                  <td className="border border-gray-300 px-4 py-2 text-center">
                                    <button
                                      onClick={() => {
                                        // Extract client ID properly
                                        let clientId = '';
                                        if (typeof receipt.client === 'string') {
                                          clientId = receipt.client;
                                        } else if (receipt.client && (receipt.client._id || receipt.client.id)) {
                                          clientId = receipt.client._id || receipt.client.id;
                                        }

                                        // Try to find full customer object
                                        let clientObj = customers.find(c => c._id === clientId || c.id === clientId);
                                        if (!clientObj && typeof receipt.client === 'object' && receipt.client) {
                                          clientObj = receipt.client;
                                        }

                                        const cashAcId = getCashAcLedgerId();
                                        const defaultCashLedger = (receipt.cashLedger || (receipt.cashPaid > 0 ? cashAcId : '')) || '';

                                        setSaleData({
                                          client: clientId,
                                          billNumber: receipt.billNumber || '',
                                          birds: 0,
                                          weight: 0,
                                          avgWeight: 0,
                                          rate: 0,
                                          amount: 0,
                                          receivedAmount: receipt.receivedAmount || 0,
                                          discount: receipt.discount || 0,
                                          balance: receipt.balance || 0,
                                          cashPaid: receipt.cashPaid || 0,
                                          onlinePaid: receipt.onlinePaid || 0,
                                          cashLedger: defaultCashLedger,
                                          onlineLedger: receipt.onlineLedger || '',
                                          narration: receipt.narration || '',
                                          narration: receipt.narration || '',
                                          isReceipt: true,
                                          sendSms: false
                                        });

                                        if (clientObj) {
                                          setSelectedCustomer(clientObj);
                                          setCustomerSearchTerm(`${clientObj.shopName} - ${clientObj.ownerName || 'N/A'}`);
                                          fetchCustomerBalance(clientObj);
                                        }

                                        setEditingSaleIndex(originalIndex);
                                        setShowReceiptModal(true);
                                      }}
                                      className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 flex items-center gap-1"
                                    >
                                      <Edit size={10} />
                                      Edit
                                    </button>
                                  </td>
                                )}
                              </tr>
                            );
                          })}
                          <tr className="bg-gray-100 font-semibold">
                            <td className="border border-gray-300 px-4 py-2 text-sm text-gray-900" colSpan={trip.status === 'completed' && (user.role === 'admin' || user.role === 'superadmin') ? "3" : "2"}>TOTAL</td>
                            <td className="border border-gray-300 px-4 py-2 text-sm text-center text-gray-900">
                              ₹{receipts.reduce((sum, receipt) => sum + (receipt.cashPaid || 0), 0).toLocaleString()}
                            </td>
                            <td className="border border-gray-300 px-4 py-2 text-sm text-center text-gray-900">
                              ₹{receipts.reduce((sum, receipt) => sum + (receipt.onlinePaid || 0), 0).toLocaleString()}
                            </td>
                            <td className="border border-gray-300 px-4 py-2 text-sm text-center text-gray-900">
                              ₹{receipts.reduce((sum, receipt) => sum + (receipt.discount || 0), 0).toLocaleString()}
                            </td>
                            <td className="border border-gray-300 px-4 py-2 text-sm text-center text-gray-900">
                              ₹{receipts.reduce((sum, receipt) => sum + (receipt.balance || 0), 0).toLocaleString()}
                            </td>
                            {trip.status === 'completed' && (user.role === 'admin' || user.role === 'superadmin') && (
                              <td className="border border-gray-300 px-4 py-2"></td>
                            )}
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    // Supervisor view - Simple cards
                    <div className="space-y-3">
                      {receipts.map((receipt, index) => (
                        <div key={index} className="p-4 border border-gray-200 rounded-lg">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-medium text-gray-900">Bill: {receipt.billNumber}</h4>
                              <p className="text-sm text-gray-600">Customer: {receipt.client?.shopName || 'N/A'}</p>
                              <div className="text-sm text-gray-600 mt-2 space-y-1">
                                {(receipt.cashPaid || 0) > 0 && (
                                  <p>Cash Receipt: ₹{receipt.cashPaid.toLocaleString()}</p>
                                )}
                                {(receipt.onlinePaid || 0) > 0 && (
                                  <p>Online Receipt: ₹{receipt.onlinePaid.toLocaleString()}</p>
                                )}
                                {(receipt.discount || 0) > 0 && (
                                  <p>Discount: ₹{receipt.discount.toLocaleString()}</p>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-green-600">
                                ₹{((receipt.cashPaid || 0) + (receipt.onlinePaid || 0)).toLocaleString()}
                              </p>
                              <p className="text-sm text-gray-500">Total Receipt</p>
                              <p className="text-sm text-gray-500 mt-1">Balance: ₹{receipt.balance?.toLocaleString() || '0'}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                } else {
                  return <p className="text-gray-500 text-center py-8">No receipts recorded yet.</p>;
                }
              })()}
            </div>
          )}

          {/* Expenses Tab */}
          {activeTab === 'expenses' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Expenses</h3>
                {trip.status !== 'completed' && (
                  <button
                    onClick={() => setShowExpenseModal(true)}
                    className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                  >
                    <Plus size={16} />
                    Add Expense
                  </button>
                )}
              </div>
              {trip.expenses && trip.expenses.length > 0 ? (
                <div className="space-y-3">
                  {trip.expenses.map((expense, index) => (
                    <div key={index} className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium text-gray-900">{expense.category}</h4>
                          <p className="text-sm text-gray-600">{expense.description}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-red-600">₹{expense.amount?.toLocaleString()}</p>
                          <p className="text-sm text-gray-500">{expense.receipt}</p>
                          {/* Edit button for completed trips - Admin/Superadmin only */}
                          {trip.status === 'completed' && (user.role === 'admin' || user.role === 'superadmin') && (
                            <button
                              onClick={() => {
                                setExpenseData({
                                  category: expense.category || 'meals',
                                  description: expense.description || '',
                                  amount: expense.amount || 0,
                                  date: expense.date || new Date().toISOString().split('T')[0]
                                });
                                setEditingExpenseIndex(index);
                                setShowExpenseModal(true);
                              }}
                              className="mt-2 px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 flex items-center gap-1"
                            >
                              <Edit size={12} />
                              Edit
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No expenses recorded yet.</p>
              )}
            </div>
          )}

          {/* Diesel Tab */}
          {activeTab === 'diesel' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Diesel Consumption</h3>
              {trip.diesel && trip.diesel.stations && trip.diesel.stations.length > 0 ? (
                <div className="space-y-3">
                  {trip.diesel.stations.map((station, index) => (
                    <div key={index} className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium text-gray-900">{getDieselStationName(station)}</h4>
                          <p className="text-sm text-gray-600">Receipt: {station.receipt}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-orange-600">₹{station.amount?.toLocaleString()}</p>
                          <p className="text-sm text-gray-500">{station.volume}L @ ₹{station.rate}</p>
                          {/* Edit button for completed trips - Admin/Superadmin only */}
                          {trip.status === 'completed' && (user.role === 'admin' || user.role === 'superadmin') && (
                            <button
                              onClick={() => {
                                setDieselData({
                                  stationName: getDieselStationName(station),
                                  volume: station.volume || 0,
                                  rate: station.rate || 0,
                                  amount: station.amount || 0,
                                  date: station.timestamp ? new Date(station.timestamp).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
                                });
                                setEditingDieselIndex(index);
                                setShowDieselModal(true);
                              }}
                              className="mt-2 px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 flex items-center gap-1"
                            >
                              <Edit size={12} />
                              Edit
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-900">Total</span>
                      <span className="text-lg font-bold text-gray-900">
                        ₹{trip.diesel.totalAmount?.toLocaleString()} ({trip.diesel.totalVolume}L)
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No diesel records yet.</p>
              )}
            </div>
          )}

          {/* Stock Tab */}
          {activeTab === 'stock' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Stock Management</h3>

              {/* Stock Summary */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-900 mb-3">Total Stock Summary</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <div className="text-sm text-blue-600">Total Birds in Stock</div>
                    <div className="font-medium text-blue-800">{trip.stocks?.reduce((sum, stock) => sum + (stock.birds || 0), 0) || 0}</div>
                  </div>
                  <div>
                    <div className="text-sm text-blue-600">Total Stock Weight</div>
                    <div className="font-medium text-blue-800">{trip.stocks?.reduce((sum, stock) => sum + (stock.weight || 0), 0).toFixed(2) || '0.00'} kg</div>
                  </div>
                  <div>
                    <div className="text-sm text-blue-600">Total Stock Value</div>
                    <div className="font-medium text-blue-800">₹{trip.stocks?.reduce((sum, stock) => sum + (stock.value || 0), 0).toFixed(2) || '0.00'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-blue-600">Stock Entries</div>
                    <div className="font-medium text-blue-800">{trip.stocks?.length || 0}</div>
                  </div>
                </div>
              </div>

              {/* Stock Entries List */}
              {trip.stocks && trip.stocks.length > 0 ? (
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900">Stock Entries</h4>
                  {trip.stocks.map((stock, index) => (
                    <div key={index} className="bg-white p-4 rounded-lg border border-gray-200">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h5 className="font-medium text-gray-900">Stock Entry #{index + 1}</h5>
                          <p className="text-sm text-gray-500">
                            Added: {new Date(stock.addedAt).toLocaleDateString()}
                          </p>
                        </div>
                        {/* Edit button for completed trips - Admin/Superadmin only */}
                        {trip.status === 'completed' && (user.role === 'admin' || user.role === 'superadmin') && (
                          <button
                            onClick={() => {
                              setStockData({
                                birds: stock.birds || 0,
                                weight: stock.weight || 0,
                                avgWeight: stock.avgWeight || 0,
                                rate: stock.rate || 0,
                                value: stock.value || 0,
                                notes: stock.notes || ''
                              });
                              setEditingStockIndex(index);
                              setShowStockModal(true);
                            }}
                            className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 flex items-center gap-1"
                          >
                            <Edit size={12} />
                            Edit
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Birds:</span>
                          <span className="font-medium ml-2">{stock.birds}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Weight:</span>
                          <span className="font-medium ml-2">{stock.weight.toFixed(2)} kg</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Rate:</span>
                          <span className="font-medium ml-2">₹{stock.rate.toFixed(2)}/kg</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Value:</span>
                          <span className="font-medium ml-2">₹{stock.value.toFixed(2)}</span>
                        </div>
                      </div>

                      {stock.notes && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <span className="text-gray-600 text-sm">Notes:</span>
                          <p className="text-sm text-gray-800 mt-1">{stock.notes}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 text-center">
                  <p className="text-gray-500">No stock entries found</p>
                  <p className="text-sm text-gray-400 mt-1">Stock entries will appear here when added to the trip</p>
                </div>
              )}

              {/* Remaining Birds Calculation */}
              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <h4 className="font-medium text-yellow-900 mb-3">Birds Remaining Calculation</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Birds Purchased:</span>
                    <span className="font-medium">{trip.summary?.totalBirdsPurchased || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Birds Sold:</span>
                    <span className="font-medium">{trip.summary?.totalBirdsSold || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Birds in Stock:</span>
                    <span className="font-medium">{trip.stocks?.reduce((sum, stock) => sum + (stock.birds || 0), 0) || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Death Birds:</span>
                    <span className="font-medium">{trip.summary?.mortality || 0}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-gray-600 font-medium">Remaining Birds:</span>
                    <span className="font-medium text-green-600">{trip.summary?.birdsRemaining || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Losses Tab */}
          {activeTab === 'losses' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Death Birds & Losses</h3>
              {trip.losses && trip.losses.length > 0 ? (
                <div className="space-y-3">
                  {trip.losses.map((loss, index) => (
                    <div key={index} className="p-4 border border-red-200 rounded-lg bg-red-50">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium text-red-900">Death Record #{index + 1}</h4>
                          <p className="text-sm text-red-700">Reason: {loss.reason || 'Not specified'}</p>
                          <p className="text-sm text-red-700">
                            Birds: {loss.quantity} | Weight: {loss.weight}kg | Avg: {loss.avgWeight}kg | Rate: ₹{loss.rate}
                          </p>
                          <p className="text-sm text-red-600">
                            Date: {new Date(loss.date).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-red-600">₹{loss.total?.toFixed(2)}</p>
                          <p className="text-sm text-red-500">Loss Amount</p>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Losses Summary */}
                  <div className="p-4 bg-red-100 rounded-lg border border-red-300">
                    <h4 className="font-medium text-red-900 mb-3">Losses Summary</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">{trip.summary?.totalBirdsLost || 0}</div>
                        <div className="text-red-700">Total Birds Lost</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">{(trip.summary?.totalWeightLost || 0).toFixed(2)} kg</div>
                        <div className="text-red-700">Total Weight Lost</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">₹{(trip.summary?.totalLosses || 0).toFixed(2)}</div>
                        <div className="text-red-700">Total Loss Amount</div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-2">No death birds recorded yet.</p>
                  <p className="text-sm text-gray-400">Losses will appear here when death birds are added to the trip.</p>
                </div>
              )}
            </div>
          )}

          {/* Transfers Tab */}
          {activeTab === 'transfers' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Transfer Trip Information</h3>

              {/* Transferred From Section */}
              {trip.transferredFrom && (
                <div className="bg-orange-50 p-6 rounded-lg border border-orange-200">
                  <h4 className="font-semibold text-orange-900 mb-4 flex items-center gap-2">
                    <span className="text-lg">📥</span>
                    Transferred From
                  </h4>
                  <div className="bg-white p-4 rounded-lg border border-orange-300">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-600">Source Trip ID</label>
                        <div className="mt-1">
                          {trip.transferredFrom?.tripId ? (
                            <Link
                              to={`/trips/${trip.transferredFrom.id || trip.transferredFrom._id}`}
                              className="text-blue-600 hover:text-blue-800 underline font-semibold"
                            >
                              {trip.transferredFrom.tripId}
                            </Link>
                          ) : (
                            <span className="text-gray-900">N/A</span>
                          )}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Vehicle Number</label>
                        <div className="mt-1 text-gray-900">
                          {trip.transferredFrom?.vehicle?.vehicleNumber || 'N/A'}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Supervisor</label>
                        <div className="mt-1 text-gray-900">
                          {trip.transferredFrom?.supervisor?.name || 'N/A'}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Transfer Date</label>
                        <div className="mt-1 text-gray-900">
                          {trip.transferredFrom?.date
                            ? new Date(trip.transferredFrom.date).toLocaleDateString()
                            : trip.createdAt
                              ? new Date(trip.createdAt).toLocaleDateString()
                              : 'N/A'}
                        </div>
                      </div>
                    </div>
                    {trip.transferredFrom?.purchases && trip.transferredFrom.purchases.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-orange-200">
                        <label className="text-sm font-medium text-gray-600 mb-2 block">Transferred Stock Details</label>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-orange-100">
                              <tr>
                                <th className="px-3 py-2 text-left border-r">DC Number</th>
                                <th className="px-3 py-2 text-center border-r">Birds</th>
                                <th className="px-3 py-2 text-center border-r">Weight (kg)</th>
                                <th className="px-3 py-2 text-center border-r">Avg Weight</th>
                                <th className="px-3 py-2 text-center border-r">Rate</th>
                                <th className="px-3 py-2 text-center">Amount</th>
                              </tr>
                            </thead>
                            <tbody>
                              {trip.transferredFrom.purchases
                                .filter(p => p.dcNumber?.startsWith('TRANSFER-'))
                                .map((purchase, idx) => (
                                  <tr key={idx} className="border-b">
                                    <td className="px-3 py-2 border-r">{purchase.dcNumber || 'N/A'}</td>
                                    <td className="px-3 py-2 text-center border-r">{purchase.birds || 0}</td>
                                    <td className="px-3 py-2 text-center border-r">{(purchase.weight || 0).toFixed(2)}</td>
                                    <td className="px-3 py-2 text-center border-r">
                                      {purchase.birds && purchase.weight
                                        ? (purchase.weight / purchase.birds).toFixed(2)
                                        : '0.00'}
                                    </td>
                                    <td className="px-3 py-2 text-center border-r">₹{(purchase.rate || 0).toFixed(2)}</td>
                                    <td className="px-3 py-2 text-center">₹{(purchase.amount || 0).toFixed(2)}</td>
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Transferred To Section */}
              {trip.transfers && trip.transfers.length > 0 && (
                <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-blue-900 mb-4 flex items-center gap-2">
                    <span className="text-lg">📤</span>
                    Transferred To ({trip.transfers.length} {trip.transfers.length === 1 ? 'Trip' : 'Trips'})
                  </h4>
                  <div className="space-y-4">
                    {trip.transfers.map((transfer, index) => (
                      <div key={index} className="bg-white p-4 rounded-lg border border-blue-300">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div>
                            <label className="text-sm font-medium text-gray-600">Destination Trip ID</label>
                            <div className="mt-1">
                              {transfer.transferredTo?.tripId ? (
                                <Link
                                  to={`/trips/${transfer.transferredTo.id || transfer.transferredTo._id}`}
                                  className="text-blue-600 hover:text-blue-800 underline font-semibold"
                                >
                                  {transfer.transferredTo.tripId}
                                </Link>
                              ) : (
                                <span className="text-gray-900">{transfer.transferredTo || 'N/A'}</span>
                              )}
                            </div>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-600">Transfer Date</label>
                            <div className="mt-1 text-gray-900">
                              {transfer.transferredAt
                                ? new Date(transfer.transferredAt).toLocaleDateString()
                                : 'N/A'}
                            </div>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-600">Vehicle Number</label>
                            <div className="mt-1 text-gray-900">
                              {transfer.transferredTo?.vehicle?.vehicleNumber || 'N/A'}
                            </div>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-600">Supervisor</label>
                            <div className="mt-1 text-gray-900">
                              {transfer.transferredToSupervisor?.name || transfer.transferredTo?.supervisor?.name || 'N/A'}
                            </div>
                          </div>
                        </div>
                        {transfer.transferredStock && (
                          <div className="mt-4 pt-4 border-t border-blue-200">
                            <label className="text-sm font-medium text-gray-600 mb-2 block">Transferred Stock Details</label>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <span className="text-gray-600">Birds:</span>
                                <span className="ml-2 font-semibold text-gray-900">{transfer.transferredStock.birds || 0}</span>
                              </div>
                              <div>
                                <span className="text-gray-600">Weight:</span>
                                <span className="ml-2 font-semibold text-gray-900">{(transfer.transferredStock.weight || 0).toFixed(2)} kg</span>
                              </div>
                              <div>
                                <span className="text-gray-600">Avg Weight:</span>
                                <span className="ml-2 font-semibold text-gray-900">
                                  {transfer.transferredStock.avgWeight
                                    ? transfer.transferredStock.avgWeight.toFixed(2)
                                    : transfer.transferredStock.birds && transfer.transferredStock.weight
                                      ? (transfer.transferredStock.weight / transfer.transferredStock.birds).toFixed(2)
                                      : '0.00'} kg
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-600">Value:</span>
                                <span className="ml-2 font-semibold text-blue-600">
                                  ₹{((transfer.transferredStock.weight || 0) * (transfer.transferredStock.rate || 0)).toFixed(2)}
                                </span>
                              </div>
                            </div>
                            <div className="mt-2 text-sm">
                              <span className="text-gray-600">Rate:</span>
                              <span className="ml-2 font-semibold text-gray-900">₹{(transfer.transferredStock.rate || 0).toFixed(2)}/kg</span>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Transfer Summary */}
                    <div className="bg-blue-100 p-4 rounded-lg border border-blue-300 mt-4">
                      <h5 className="font-semibold text-blue-900 mb-3">Transfer Summary</h5>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-blue-700">Total Birds Transferred:</span>
                          <span className="ml-2 font-bold text-blue-900">
                            {trip.transfers.reduce((sum, transfer) => sum + (transfer.transferredStock?.birds || 0), 0)}
                          </span>
                        </div>
                        <div>
                          <span className="text-blue-700">Total Weight Transferred:</span>
                          <span className="ml-2 font-bold text-blue-900">
                            {(trip.transfers.reduce((sum, transfer) => sum + (transfer.transferredStock?.weight || 0), 0)).toFixed(2)} kg
                          </span>
                        </div>
                        <div>
                          <span className="text-blue-700">Total Value:</span>
                          <span className="ml-2 font-bold text-blue-900">
                            ₹{(trip.transfers.reduce((sum, transfer) => sum + ((transfer.transferredStock?.weight || 0) * (transfer.transferredStock?.rate || 0)), 0)).toFixed(2)}
                          </span>
                        </div>
                        <div>
                          <span className="text-blue-700">Number of Transfers:</span>
                          <span className="ml-2 font-bold text-blue-900">{trip.transfers.length}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Transfer History Section (if available) */}
              {trip.transferHistory && trip.transferHistory.length > 0 && (
                <div className="bg-purple-50 p-6 rounded-lg border border-purple-200">
                  <h4 className="font-semibold text-purple-900 mb-4 flex items-center gap-2">
                    <span className="text-lg">📋</span>
                    Transfer History
                  </h4>
                  <div className="space-y-3">
                    {trip.transferHistory.map((transfer, index) => (
                      <div key={index} className="bg-white p-4 rounded-lg border border-purple-300">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">To Trip:</span>
                            <span className="ml-2 font-semibold text-gray-900">
                              {transfer.transferredTo?.tripId || transfer.transferredTo || 'N/A'}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600">Date:</span>
                            <span className="ml-2 font-semibold text-gray-900">
                              {transfer.transferredAt
                                ? new Date(transfer.transferredAt).toLocaleDateString()
                                : 'N/A'}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600">Stock Value:</span>
                            <span className="ml-2 font-semibold text-purple-600">
                              ₹{((transfer.transferredStock?.weight || 0) * (transfer.transferredStock?.rate || 0)).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* No Transfer Info Message */}
              {!trip.transferredFrom && (!trip.transfers || trip.transfers.length === 0) && (!trip.transferHistory || trip.transferHistory.length === 0) && (
                <div className="bg-gray-50 p-8 rounded-lg border border-gray-200 text-center">
                  <p className="text-gray-500 text-lg mb-2">No Transfer Information Available</p>
                  <p className="text-gray-400 text-sm">
                    This trip has no associated transfers. Transfer information will appear here if this trip receives stock from another trip or transfers stock to other trips.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Financials Tab */}
          {activeTab === 'financials' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Financial Analysis</h3>

              {/* Financial Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <h4 className="font-medium text-green-900 mb-3">Revenue Analysis</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Sales:</span>
                      <span className="font-medium">₹{(trip.summary?.totalSalesAmount || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Purchase:</span>
                      <span className="font-medium">₹{(trip.summary?.totalPurchaseAmount || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Gross Profit:</span>
                      <span className="font-medium text-green-600">₹{(trip.summary?.totalProfitMargin || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Profit Margin:</span>
                      <span className="font-medium">
                        {trip.summary?.totalSalesAmount > 0
                          ? ((trip.summary?.totalProfitMargin / trip.summary?.totalSalesAmount) * 100).toFixed(2)
                          : '0.00'}%
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                  <h4 className="font-medium text-red-900 mb-3">Cost Analysis</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Purchases:</span>
                      <span className="font-medium">₹{(trip.summary?.totalPurchaseAmount || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Expenses:</span>
                      <span className="font-medium">₹{(trip.summary?.totalExpenses || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Diesel Cost:</span>
                      <span className="font-medium">₹{(trip.summary?.totalDieselAmount || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Mortality & Weight Loss :</span>
                      <span className="font-medium">₹{mortalityAndWeightLossAmount.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Net Profit Analysis */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-900 mb-3">Net Profit Analysis</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-blue-600">
                      ₹{trip.status === 'completed' ? (trip.summary?.netProfit || 0).toFixed(2) : '0.00'}
                    </div>
                    <div className="text-blue-700">Net Profit</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-blue-600">
                      {trip.summary?.totalWeightSold > 0
                        ? (trip.summary?.profitPerKg || 0).toFixed(2)
                        : '0.00'}
                    </div>
                    <div className="text-blue-700">Profit per Kg</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-blue-600">
                      {trip.summary?.totalSalesAmount > 0
                        ? ((trip.summary?.netProfit / trip.summary?.totalSalesAmount) * 100).toFixed(2)
                        : '0.00'}%
                    </div>
                    <div className="text-blue-700">Net Profit Margin</div>
                  </div>
                </div>
              </div>

              {/* Trip Status Impact */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h4 className="font-medium text-gray-900 mb-3">Trip Status Impact</h4>
                <div className="text-sm text-gray-600">
                  {trip.status === 'completed' ? (
                    <p>✅ <strong>Completed Trip:</strong> All financial calculations are final and include complete data.</p>
                  ) : (
                    <p>⚠️ <strong>Ongoing Trip:</strong> Net profit shows 0.00 as the trip is still in progress. Final calculations will be available upon completion.</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Purchase Modal */}
      {showPurchaseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              {editingPurchaseIndex !== null ? 'Edit Purchase' : 'Add Purchase'}
            </h3>
            <form onSubmit={editingPurchaseIndex !== null ? handleEditPurchase : addPurchase} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
                <select
                  value={purchaseData.supplier}
                  onChange={(e) => setPurchaseData(prev => ({ ...prev, supplier: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select a supplier</option>
                  {vendors.map((vendor) => (
                    <option key={vendor._id || vendor.id} value={vendor._id || vendor.id}>
                      {vendor.vendorName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">DC Number</label>
                <input
                  type="text"
                  value={purchaseData.dcNumber}
                  onChange={(e) => setPurchaseData(prev => ({ ...prev, dcNumber: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="DC number"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Birds</label>
                  <input
                    type="number"
                    min="0"
                    value={purchaseData.birds}
                    onChange={(e) => {
                      const birds = Number(e.target.value);
                      const avgWeight = birds > 0 && purchaseData.weight > 0 ? purchaseData.weight / birds : 0;
                      const amount = purchaseData.weight * purchaseData.rate;
                      setPurchaseData(prev => ({
                        ...prev,
                        birds,
                        avgWeight: Number(avgWeight.toFixed(2)),
                        amount: Number(amount.toFixed(2))
                      }));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Number of birds"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Weight (kg)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={purchaseData.weight}
                    onChange={(e) => {
                      const weight = Number(e.target.value);
                      const avgWeight = purchaseData.birds > 0 && weight > 0 ? weight / purchaseData.birds : 0;
                      const amount = weight * purchaseData.rate;
                      setPurchaseData(prev => ({
                        ...prev,
                        weight,
                        avgWeight: Number(avgWeight.toFixed(2)),
                        amount: Number(amount.toFixed(2))
                      }));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Weight in kg"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rate per kg</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={purchaseData.rate}
                    onChange={(e) => {
                      const rate = Number(e.target.value);
                      const amount = purchaseData.weight * rate;
                      setPurchaseData(prev => ({
                        ...prev,
                        rate,
                        amount: Number(amount.toFixed(2))
                      }));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Rate per kg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={purchaseData.amount}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
                    placeholder="Auto-calculated"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Average Weight per Bird</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={purchaseData.avgWeight}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
                  placeholder="Auto-calculated"
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowPurchaseModal(false);
                    setEditingPurchaseIndex(null);
                    setPurchaseData({ supplier: '', dcNumber: '', birds: 0, weight: 0, avgWeight: 0, rate: 0, amount: 0 });
                  }}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  {editingPurchaseIndex !== null ? 'Update Purchase' : 'Add Purchase'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sale Modal - Rich Supervisor Style */}
      {showSaleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md max-h-[calc(90vh-56px)] flex flex-col">
            <div className="p-4 pb-3 border-b border-gray-200 flex-shrink-0">
              <h3 className="text-lg font-semibold">
                {editingSaleIndex !== null ? 'Edit Sale' : 'Add Sale'}
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 pt-3 min-h-0">

              {/* Purchase Birds Info */}
              {/* Purchase Birds Info - Only for Supervisor */}
              {(isSupervisor) && (() => {
                const { totalPurchasedBirds, totalSoldBirds, remainingBirds, totalPurchasedWeight, totalSoldWeight, remainingWeight } = getPurchaseAndSaleStats();
                return (
                  <div className="bg-gray-50 p-3 rounded-lg mb-3">
                    <div className="text-sm font-medium text-gray-700 mb-2">Purchase & Sale Summary</div>

                    {/* Birds Summary */}
                    <div className="mb-3">
                      <div className="text-xs font-medium text-gray-600 mb-2">BIRDS</div>
                      <div className="grid grid-cols-3 gap-3 text-xs">
                        <div className="text-center">
                          <div className="text-gray-500">Total Purchased</div>
                          <div className="font-semibold text-blue-600">{totalPurchasedBirds}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-gray-500">Already Sold</div>
                          <div className="font-semibold text-green-600">{totalSoldBirds}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-gray-500">Available</div>
                          <div className={`font-semibold ${remainingBirds > 0 ? 'text-orange-600' : 'text-red-600'}`}>
                            {remainingBirds}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Weight Summary */}
                    <div>
                      <div className="text-xs font-medium text-gray-600 mb-2">WEIGHT (kg)</div>
                      <div className="grid grid-cols-3 gap-3 text-xs">
                        <div className="text-center">
                          <div className="text-gray-500">Total Purchased</div>
                          <div className="font-semibold text-blue-600">{totalPurchasedWeight.toFixed(2)}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-gray-500">Already Sold</div>
                          <div className="font-semibold text-green-600">{totalSoldWeight.toFixed(2)}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-gray-500">Available</div>
                          <div className={`font-semibold ${remainingWeight > 0 ? 'text-orange-600' : 'text-red-600'}`}>
                            {remainingWeight.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>

                    {(remainingBirds <= 0 || remainingWeight <= 0) && (
                      <div className="mt-2 text-xs text-red-600 font-medium text-center">
                        ⚠️ No birds/weight available for sale
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Summary Section */}
              {saleData.birds > 0 && saleData.weight > 0 && (
                <div className="bg-blue-50 p-2 rounded-lg mb-3">
                  <div className="text-xs text-blue-800">
                    <div className="grid grid-cols-2 gap-2">
                      <div><span className="font-medium">Bill:</span> {saleData.billNumber}</div>
                      <div><span className="font-medium">Birds:</span> {saleData.birds}</div>
                      <div><span className="font-medium">Weight:</span> {saleData.weight} kg</div>
                      <div><span className="font-medium">Avg:</span> {saleData.avgWeight} kg/bird</div>
                      <div><span className="font-medium">Rate:</span> ₹{saleData.rate}/kg</div>
                      <div><span className="font-medium">Total:</span> ₹{(Number(saleData.amount) || 0).toFixed(2)}</div>
                      <div><span className="font-medium">Cash:</span> ₹{(Number(saleData.cashPaid) || 0).toLocaleString()}</div>
                      <div><span className="font-medium">Online:</span> ₹{(Number(saleData.onlinePaid) || 0).toLocaleString()}</div>
                      <div><span className="font-medium">Discount:</span> ₹{(Number(saleData.discount) || 0).toLocaleString()}</div>
                      <div><span className="font-medium">Balance:</span> ₹{(Number(saleData.balance) || 0).toFixed(2)}</div>
                    </div>
                  </div>
                </div>
              )}

              <form onSubmit={handleSaleSubmit} className="space-y-3">
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Customer *</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={selectedCustomer ? `${selectedCustomer.shopName} - ${selectedCustomer.ownerName || 'N/A'}` : customerSearchTerm}
                      onChange={(e) => {
                        if (editingSaleIndex !== null) return;
                        setCustomerSearchTerm(e.target.value);
                        setSelectedCustomer(null);
                        setSaleData(prev => ({ ...prev, client: '' }));
                        setHighlightedCustomerIndex(-1);
                        setCustomerBalance(null);
                      }}
                      onFocus={editingSaleIndex !== null ? undefined : handleCustomerInputFocus}
                      onBlur={handleCustomerInputBlur}
                      onKeyDown={handleCustomerKeyDown}
                      placeholder="Search customer by name, owner, contact, or place..."
                      className={`w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${editingSaleIndex !== null ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                      readOnly={editingSaleIndex !== null}
                      required
                    />

                    {selectedCustomer && editingSaleIndex === null && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCustomer(null);
                          setCustomerSearchTerm('');
                          setSaleData(prev => ({ ...prev, client: '' }));
                          setHighlightedCustomerIndex(-1);
                        }}
                        className="absolute right-2 top-1/3 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  {showCustomerDropdown && filteredCustomers.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {filteredCustomers.map((customer, index) => (
                        <div
                          key={customer._id || customer.id}
                          ref={index === highlightedCustomerIndex ? (el) => {
                            if (el) {
                              el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                            }
                          } : null}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleCustomerSelect(customer);
                          }}
                          onMouseEnter={() => setHighlightedCustomerIndex(index)}
                          className={`px-4 py-3 cursor-pointer border-b border-gray-100 last:border-b-0 ${index === highlightedCustomerIndex
                            ? 'bg-blue-100 border-blue-200'
                            : 'hover:bg-gray-100'
                            }`}
                        >
                          <div className="font-medium text-gray-900">{customer.shopName}</div>
                          {customer.ownerName && (
                            <div className="text-sm text-gray-600">Owner: {customer.ownerName}</div>
                          )}
                          <div className="text-sm text-gray-500">{customer.contact}</div>
                          {customer.place && (
                            <div className="text-xs text-gray-400">Place: {customer.place}</div>
                          )}
                          {customer.gstOrPanNumber && (
                            <div className="text-xs text-gray-400">GST/PAN: {customer.gstOrPanNumber}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {showCustomerDropdown && filteredCustomers.length === 0 && customerSearchTerm.trim() !== '' && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg">
                      <div className="px-4 py-3 text-gray-500 text-center">
                        No customers found
                      </div>
                    </div>
                  )}
                </div>

                {/* Customer Balance Display */}
                {selectedCustomer && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <DollarSign size={16} className="text-gray-600" />
                        <span className="text-sm font-medium text-gray-700">Customer Balance:</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {loadingBalance ? (
                          <div className="flex items-center gap-1">
                            <Loader2 size={14} className="animate-spin text-gray-500" />
                            <span className="text-sm text-gray-500">Loading...</span>
                          </div>
                        ) : customerBalance !== null ? (
                          <span className={`text-sm font-semibold ${customerBalance > 0 ? 'text-red-600' : 'text-green-600'
                            }`}>
                            ₹{Number(customerBalance).toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-500">0</span>
                        )}
                      </div>
                    </div>
                    {customerBalance !== null && customerBalance > 0 && (
                      <div className="mt-2 text-xs text-red-600">
                        ⚠️ This customer has outstanding balance
                      </div>
                    )}
                    {customerBalance !== null && customerBalance === 0 && (
                      <div className="mt-2 text-xs text-green-600">
                        ✅ Customer account is up to date
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bill Number</label>
                  <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700">
                    {saleData.billNumber}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Auto-generated bill number</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Birds *</label>
                    {(() => {
                      const { remainingBirds } = getPurchaseAndSaleStats();
                      const adjustedRemainingBirds = editingSaleIndex !== null
                        ? remainingBirds + (trip.sales[editingSaleIndex]?.birdsCount || trip.sales[editingSaleIndex]?.birds || 0)
                        : remainingBirds;
                      const isExceeding = saleData.birds > adjustedRemainingBirds;

                      return (
                        <>
                          <input
                            type="number"
                            value={saleData.birds}
                            onChange={(e) => handleSaleDataChange('birds', Number(e.target.value))}
                            className={`w-full px-3 py-2 border rounded-lg ${isExceeding
                              ? 'border-red-300 bg-red-50 focus:ring-red-500 focus:border-red-500'
                              : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                              } ${editingSaleIndex !== null ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                            readOnly={editingSaleIndex !== null}
                            required
                            max={adjustedRemainingBirds}
                          />
                          <div className="mt-1 text-xs">
                            <span className="text-gray-500">Available: </span>
                            <span className={`font-medium ${adjustedRemainingBirds > 0 ? 'text-orange-600' : 'text-red-600'}`}>
                              {adjustedRemainingBirds}
                            </span>
                            {isExceeding && (
                              <span className="ml-2 text-red-600 font-medium">
                                ⚠️ Exceeds available birds
                              </span>
                            )}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Weight (kg) *</label>
                    {(() => {
                      const { remainingWeight } = getPurchaseAndSaleStats();
                      const adjustedRemainingWeight = editingSaleIndex !== null
                        ? remainingWeight + (trip.sales[editingSaleIndex]?.weight || 0)
                        : remainingWeight;
                      const isExceeding = saleData.weight > adjustedRemainingWeight;
                      const isZero = saleData.weight === 0;

                      return (
                        <>
                          <input
                            type="number"
                            value={saleData.weight}
                            onChange={(e) => handleSaleDataChange('weight', Number(e.target.value))}
                            className={`w-full px-3 py-2 border rounded-lg ${isZero || isExceeding
                              ? 'border-red-300 bg-red-50 focus:ring-red-500 focus:border-red-500'
                              : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                              }`}
                            required
                            min="0.01"
                            step="0.01"
                            max={adjustedRemainingWeight}
                          />
                          <div className="mt-1 text-xs">
                            <span className="text-gray-500">Available: </span>
                            <span className={`font-medium ${adjustedRemainingWeight > 0 ? 'text-orange-600' : 'text-red-600'}`}>
                              {adjustedRemainingWeight.toFixed(2)} kg
                            </span>
                            {isZero && (
                              <span className="ml-2 text-red-600 font-medium">
                                ⚠️ Weight cannot be zero
                              </span>
                            )}
                            {isExceeding && !isZero && (
                              <span className="ml-2 text-red-600 font-medium">
                                ⚠️ Exceeds available weight
                              </span>
                            )}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">AVG (kg/bird)</label>
                    <input
                      type="number"
                      value={saleData.avgWeight}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                      placeholder="Auto-calculated"
                      readOnly
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Rate per kg *</label>
                    <input
                      type="number"
                      value={saleData.rate}
                      onChange={(e) => handleSaleDataChange('rate', Number(e.target.value))}
                      className={`w-full px-3 py-2 border rounded-lg ${saleData.rate === 0
                        ? 'border-red-300 bg-red-50 focus:ring-red-500 focus:border-red-500'
                        : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                        }`}
                      required
                      min="0.01"
                      step="0.01"
                    />
                    {saleData.rate === 0 && (
                      <p className="text-xs text-red-600 mt-1">Rate cannot be zero</p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Trip Total Amount (₹)</label>
                    <input
                      type="number"
                      value={saleData.amount}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                      placeholder="Auto-calculated"
                      readOnly
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Total Balance (₹)</label>
                    <input
                      type="number"
                      value={Number(saleData.amount) + Number(customerBalance) || 0}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                      placeholder="Auto-Calculated"
                      readOnly
                      step="0.01"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cash Paid (₹)</label>
                    <input
                      type="number"
                      value={saleData.cashPaid}
                      onChange={(e) => handleSaleDataChange('cashPaid', Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="0"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Online Paid (₹)</label>
                    <input
                      type="number"
                      value={saleData.onlinePaid}
                      onChange={(e) => handleSaleDataChange('onlinePaid', Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="0"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>

                {/* Online Ledger Dropdown - Show if onlinePaid > 0 */}
                {Number(saleData.onlinePaid) > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Bank Account Ledger *
                    </label>
                    <select
                      value={saleData.onlineLedger}
                      onChange={(e) => handleSaleDataChange('onlineLedger', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required={Number(saleData.onlinePaid) > 0}
                    >
                      <option value="">Select Bank Account Ledger</option>
                      {bankAccountLedgers.map(ledger => (
                        <option key={ledger.id} value={ledger.id}>
                          {ledger.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Discount (₹)</label>
                    <input
                      type="number"
                      value={saleData.discount}
                      onChange={(e) => handleSaleDataChange('discount', Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="0"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Balance (₹)</label>
                    <input
                      type="number"
                      value={(() => {
                        // For Receipt modal: calculate opening balance based on customer's current opening balance
                        const totalPaid = Number(saleData.cashPaid) + Number(saleData.onlinePaid);
                        if (customerBalance !== null) {
                          // Calculate new outstanding balance: current outstanding balance + amount - payments - discount
                          const newOutstandingBalance = Number(customerBalance) + Number(saleData.amount) - Number(totalPaid) - Number(saleData.discount || 0);
                          return Math.max(0, newOutstandingBalance).toFixed(2);
                        }
                        return 0.00;
                      })()}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                      placeholder="Auto-calculated"
                      readOnly
                      step="0.01"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Narration</label>
                  <textarea
                    value={saleData.narration}
                    onChange={(e) => handleSaleDataChange('narration', e.target.value)}
                    rows="2"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Add any notes or remarks for this sale"
                  ></textarea>
                </div>

                <div className="flex items-center gap-2 bg-blue-50 p-3 rounded-lg border border-blue-100">
                  <input
                    type="checkbox"
                    id="sendSms-sale"
                    checked={saleData.sendSms || false}
                    onChange={(e) => handleSaleDataChange('sendSms', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="sendSms-sale" className="text-sm font-medium text-blue-800 cursor-pointer">
                    Send message to customer
                  </label>
                </div>
              </form>

              {/* Help Text */}
              <div className="mt-3 text-xs text-gray-500 space-y-1">
                <p>• <strong>CLIENT:</strong> Select customer from dropdown</p>
                <p>• <strong>BILL:</strong> Auto-generated with timestamp</p>
                <p>• <strong>BIRDS/WEIGHT:</strong> Enter total birds and weight in kg</p>
                <p>• <strong>AVG:</strong> Auto-calculated as Weight ÷ Birds</p>
                <p>• <strong>RATE:</strong> Price per kg</p>
                <p>• <strong>TOTAL:</strong> Auto-calculated as Weight × Rate</p>
                <p>• <strong>PAYMENT:</strong> Enter cash/online amounts and discount</p>
                <p>• <strong>BALANCE:</strong> Auto-calculated using formula: Global Outstanding Balance + Total Amount - Online Paid - Cash Paid - Discount</p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 pt-3 border-t border-gray-200 bg-gray-50 rounded-b-lg flex-shrink-0">
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowSaleModal(false);
                    setEditingSaleIndex(null);
                    setSaleData({ client: '', billNumber: '', birds: 0, weight: 0, avgWeight: 0, rate: 0, amount: 0, receivedAmount: '', discount: '', balance: 0, cashPaid: '', onlinePaid: '', cashLedger: '', onlineLedger: '', narration: '', sendSms: false });
                    setSelectedCustomer(null);
                    setCustomerSearchTerm('');
                    setShowCustomerDropdown(false);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaleSubmit}
                  disabled={isSubmitting || (() => {
                    const { remainingBirds, remainingWeight } = getPurchaseAndSaleStats();
                    const adjustedRemainingBirds = editingSaleIndex !== null
                      ? remainingBirds + (trip.sales[editingSaleIndex]?.birdsCount || trip.sales[editingSaleIndex]?.birds || 0)
                      : remainingBirds;
                    const adjustedRemainingWeight = editingSaleIndex !== null
                      ? remainingWeight + (trip.sales[editingSaleIndex]?.weight || 0)
                      : remainingWeight;
                    return saleData.birds > adjustedRemainingBirds || saleData.weight > adjustedRemainingWeight;
                  })()}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : (editingSaleIndex !== null ? 'Update Sale' : 'Add Sale')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {showReceiptModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md max-h-[calc(90vh-56px)] flex flex-col">
            <div className="p-4 pb-3 border-b border-gray-200 flex-shrink-0">
              <h3 className="text-lg font-semibold">
                {editingSaleIndex !== null ? 'Edit Receipt' : 'Add Receipt'}
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 pt-3 min-h-0">

              {/* Receipt Info */}
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 text-green-700">
                  <Receipt size={16} />
                  <span className="text-sm font-medium">Payment Receipt</span>
                </div>
                <p className="text-xs text-green-600 mt-1">
                  Customer paying remaining balance without purchasing birds
                </p>
              </div>

              <form onSubmit={handleReceiptSubmit} className="space-y-3">
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Customer *</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={selectedCustomer ? `${selectedCustomer.shopName} - ${selectedCustomer.ownerName || 'N/A'}` : customerSearchTerm}
                      onChange={(e) => {
                        if (editingSaleIndex !== null) return;
                        setCustomerSearchTerm(e.target.value);
                        setSelectedCustomer(null);
                        setSaleData(prev => ({ ...prev, client: '' }));
                        setHighlightedCustomerIndex(-1);
                        setCustomerBalance(null);
                      }}
                      onFocus={editingSaleIndex !== null ? undefined : handleCustomerInputFocus}
                      onBlur={handleCustomerInputBlur}
                      onKeyDown={handleCustomerKeyDown}
                      placeholder="Search customer by name, owner, contact, or place..."
                      className={`w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${editingSaleIndex !== null ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                      readOnly={editingSaleIndex !== null}
                      required
                    />

                    {selectedCustomer && editingSaleIndex === null && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCustomer(null);
                          setCustomerSearchTerm('');
                          setSaleData(prev => ({ ...prev, client: '' }));
                          setHighlightedCustomerIndex(-1);
                        }}
                        className="absolute right-2 top-1/3 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  {showCustomerDropdown && filteredCustomers.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {filteredCustomers.map((customer, index) => (
                        <div
                          key={customer._id || customer.id}
                          ref={index === highlightedCustomerIndex ? (el) => {
                            if (el) {
                              el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                            }
                          } : null}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleCustomerSelect(customer);
                          }}
                          onMouseEnter={() => setHighlightedCustomerIndex(index)}
                          className={`px-4 py-3 cursor-pointer border-b border-gray-100 last:border-b-0 ${index === highlightedCustomerIndex
                            ? 'bg-blue-100 border-blue-200'
                            : 'hover:bg-gray-100'
                            }`}
                        >
                          <div className="font-medium text-gray-900">{customer.shopName}</div>
                          {customer.ownerName && (
                            <div className="text-sm text-gray-600">Owner: {customer.ownerName}</div>
                          )}
                          <div className="text-sm text-gray-500">{customer.contact}</div>
                          {customer.place && (
                            <div className="text-xs text-gray-400">Place: {customer.place}</div>
                          )}
                          {customer.gstOrPanNumber && (
                            <div className="text-xs text-gray-400">GST/PAN: {customer.gstOrPanNumber}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {showCustomerDropdown && filteredCustomers.length === 0 && customerSearchTerm.trim() !== '' && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg">
                      <div className="px-4 py-3 text-gray-500 text-center">
                        No customers found
                      </div>
                    </div>
                  )}
                </div>

                {/* Customer Balance Display */}
                {selectedCustomer && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <DollarSign size={16} className="text-gray-600" />
                        <span className="text-sm font-medium text-gray-700">Customer Balance:</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {loadingBalance ? (
                          <div className="flex items-center gap-1">
                            <Loader2 size={14} className="animate-spin text-gray-500" />
                            <span className="text-sm text-gray-500">Loading...</span>
                          </div>
                        ) : customerBalance !== null ? (
                          <span className={`text-sm font-semibold ${customerBalance > 0 ? 'text-red-600' : 'text-green-600'
                            }`}>
                            ₹{Number(customerBalance).toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-500">0</span>
                        )}
                      </div>
                    </div>
                    {customerBalance !== null && (
                      <div className="mt-2 text-xs text-gray-600">
                        {Number(customerBalance) > 0 ? `Outstanding Balance: ₹${Number(customerBalance).toLocaleString()}` : 'No outstanding balance'}
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bill Number *</label>
                  <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700">
                    {saleData.billNumber}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Auto-generated bill number</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cash Receipt (₹)</label>
                    <input
                      type="number"
                      value={saleData.cashPaid}
                      onChange={(e) => handleSaleDataChange('cashPaid', Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="0"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Online Receipt (₹)</label>
                    <input
                      type="number"
                      value={saleData.onlinePaid}
                      onChange={(e) => handleSaleDataChange('onlinePaid', Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="0"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>

                {/* Online Ledger Dropdown - Show if onlinePaid > 0 */}
                {Number(saleData.onlinePaid) > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Bank Account Ledger *
                    </label>
                    <select
                      value={saleData.onlineLedger}
                      onChange={(e) => handleSaleDataChange('onlineLedger', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required={Number(saleData.onlinePaid) > 0}
                    >
                      <option value="">Select Bank Account Ledger</option>
                      {bankAccountLedgers.map(ledger => (
                        <option key={ledger.id} value={ledger.id}>
                          {ledger.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Discount (₹)</label>
                    <input
                      type="number"
                      value={saleData.discount}
                      onChange={(e) => handleSaleDataChange('discount', Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="0"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Balance (₹)</label>
                    <input
                      type="number"
                      value={(() => {
                        // For Receipt modal: calculate opening balance based on customer's current opening balance
                        const totalPaid = Number(saleData.cashPaid) + Number(saleData.onlinePaid);
                        if (customerBalance !== null) {
                          // Calculate new outstanding balance: current outstanding balance + amount - payments - discount
                          const newOutstandingBalance = Number(customerBalance) + Number(saleData.amount) - Number(totalPaid) - Number(saleData.discount || 0);
                          return Math.max(0, newOutstandingBalance).toFixed(2);
                        }
                        return 0.00;
                      })()}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                      placeholder="Auto-calculated"
                      readOnly
                      step="0.01"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Narration</label>
                  <textarea
                    value={saleData.narration}
                    onChange={(e) => setSaleData(prev => ({ ...prev, narration: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="Enter narration..."
                    rows="2"
                  />
                </div>
              </form>

              <div className="flex items-center gap-2 bg-blue-50 p-3 rounded-lg border border-blue-100 mt-3">
                <input
                  type="checkbox"
                  id="sendSms-receipt"
                  checked={saleData.sendSms || false}
                  onChange={(e) => setSaleData(prev => ({ ...prev, sendSms: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="sendSms-receipt" className="text-sm font-medium text-blue-800 cursor-pointer">
                  Send message to customer
                </label>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 pt-3 border-t border-gray-200 bg-gray-50 rounded-b-lg flex-shrink-0">
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowReceiptModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleReceiptSubmit}
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : (editingSaleIndex !== null ? 'Update Receipt' : 'Add Receipt')}
                </button>
              </div>
            </div>
          </div>
        </div >
      )
      }

      {/* Edit Expense Modal */}
      {
        showExpenseModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">
                {editingExpenseIndex !== null ? 'Edit Expense' : 'Add Expense'}
              </h3>
              <form onSubmit={editingExpenseIndex !== null ? handleEditExpense : addExpense} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={expenseData.category}
                    onChange={(e) => setExpenseData(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="meals">Meals</option>
                    <option value="parking">Parking</option>
                    <option value="toll">Toll</option>
                    <option value="loading/unloading">Loading/Unloading Charges</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="tea">Tea</option>
                    <option value="lunch">Lunch</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <input
                    type="text"
                    value={expenseData.description}
                    onChange={(e) => setExpenseData(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Expense description"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={expenseData.amount}
                    onChange={(e) => setExpenseData(prev => ({ ...prev, amount: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Amount"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={expenseData.date}
                    onChange={(e) => setExpenseData(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowExpenseModal(false);
                      setEditingExpenseIndex(null);
                      setExpenseData({ category: 'meals', description: '', amount: 0, date: new Date().toISOString().split('T')[0] });
                    }}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                  >
                    {editingExpenseIndex !== null ? 'Update Expense' : 'Add Expense'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )
      }

      {/* Edit Diesel Modal */}
      {
        showDieselModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">
                {editingDieselIndex !== null ? 'Edit Diesel Record' : 'Add Diesel Record'}
              </h3>
              <form onSubmit={editingDieselIndex !== null ? handleEditDiesel : (e) => {
                e.preventDefault();
                addExpense(dieselData);
              }} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Station Name</label>
                  <input
                    type="text"
                    value={dieselData.stationName}
                    onChange={(e) => setDieselData(prev => ({ ...prev, stationName: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Fuel station name"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Volume (L)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={dieselData.volume}
                      onChange={(e) => {
                        const volume = Number(e.target.value);
                        const amount = volume * dieselData.rate;
                        setDieselData(prev => ({
                          ...prev,
                          volume,
                          amount: Number(amount.toFixed(2))
                        }));
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Volume in liters"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Rate per L</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={dieselData.rate}
                      onChange={(e) => {
                        const rate = Number(e.target.value);
                        const amount = dieselData.volume * rate;
                        setDieselData(prev => ({
                          ...prev,
                          rate,
                          amount: Number(amount.toFixed(2))
                        }));
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Rate per liter"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={dieselData.amount}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
                    placeholder="Auto-calculated"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={dieselData.date}
                    onChange={(e) => setDieselData(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowDieselModal(false);
                      setEditingDieselIndex(null);
                      setDieselData({ stationName: '', volume: 0, rate: 0, amount: 0, date: new Date().toISOString().split('T')[0] });
                    }}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    {editingDieselIndex !== null ? 'Update Diesel Record' : 'Add Diesel Record'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )
      }

      {/* Edit Stock Modal */}
      {
        showStockModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">
                {editingStockIndex !== null ? 'Edit Stock' : 'Add Stock'}
              </h3>
              <form onSubmit={editingStockIndex !== null ? handleEditStock : (e) => {
                e.preventDefault();
                // Add stock functionality would go here
              }} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Birds</label>
                    <input
                      type="number"
                      min="0"
                      value={stockData.birds}
                      onChange={(e) => setStockData(prev => ({ ...prev, birds: Number(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Number of birds"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Weight (kg)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={stockData.weight}
                      onChange={(e) => setStockData(prev => ({ ...prev, weight: Number(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Weight in kg"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rate per kg</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={stockData.rate}
                    onChange={(e) => setStockData(prev => ({ ...prev, rate: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Rate per kg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    value={stockData.notes}
                    onChange={(e) => setStockData(prev => ({ ...prev, notes: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    placeholder="Stock notes"
                  />
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowStockModal(false);
                      setEditingStockIndex(null);
                      setStockData({ birds: 0, weight: 0, avgWeight: 0, rate: 0, value: 0, notes: '' });
                    }}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors"
                  >
                    {editingStockIndex !== null ? 'Update Stock' : 'Add Stock'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )
      }

      {/* Complete Trip Modal */}
      {
        showCompleteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">Complete Trip</h3>
              <form onSubmit={(e) => {
                e.preventDefault();
                completeTrip(completeData);
              }} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Closing Odometer
                    <span className="text-red-500 ml-1">*</span>
                  </label>
                  <input
                    type="number"
                    min={trip?.vehicleReadings?.opening || 0}
                    value={completeData.closingOdometer}
                    onChange={(e) => setCompleteData(prev => ({ ...prev, closingOdometer: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={`Min: ${trip?.vehicleReadings?.opening || 0}`}
                    required
                  />
                  {trip?.vehicleReadings?.opening && (
                    <p className="text-xs text-gray-500 mt-1">
                      Opening reading: {trip.vehicleReadings.opening}
                    </p>
                  )}
                  {completeData.closingOdometer > 0 && trip?.vehicleReadings?.opening &&
                    completeData.closingOdometer < trip.vehicleReadings.opening && (
                      <p className="text-xs text-red-500 mt-1">
                        Closing reading must be greater than opening reading ({trip.vehicleReadings.opening})
                      </p>
                    )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Final Remarks</label>
                  <textarea
                    value={completeData.finalRemarks}
                    onChange={(e) => setCompleteData(prev => ({ ...prev, finalRemarks: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    placeholder="Any final notes about the trip..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mortality (Death Birds)</label>
                  <input
                    type="number"
                    min="0"
                    value={completeData.mortality}
                    onChange={(e) => setCompleteData(prev => ({ ...prev, mortality: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Number of birds that died"
                  />
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCompleteModal(false)}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={completeData.closingOdometer > 0 && trip?.vehicleReadings?.opening &&
                      completeData.closingOdometer < trip.vehicleReadings.opening}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    Complete Trip
                  </button>
                </div>
              </form>
            </div>
          </div>
        )
      }

      {/* Edit Trip Modal */}
      <EditTripModal
        isOpen={showEditTripModal}
        onClose={() => setShowEditTripModal(false)}
        trip={trip}
        onSuccess={() => {
          fetchTrip(); // Refresh trip data
        }}
      />
    </div >
  );
}
