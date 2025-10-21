import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Truck,
  MapPin,
  Users,
  DollarSign,
  Plus,
  X,
  Save,
  Loader2,
  Eye,
  ShoppingCart,
  Receipt,
  CreditCard,
  Fuel,
  TrendingUp,
  CheckCircle,
  Lock,
  RefreshCw,
  Edit
} from 'lucide-react';
import api from '../lib/axios';
import { useAuth } from '../contexts/AuthContext';
import InvoiceGenerator from '../components/InvoiceGenerator';
import TransferTripModal from '../components/TransferTripModal';
import EditTripModal from '../components/EditTripModal';

const SupervisorTripDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Generate unique bill number
  const generateBillNumber = () => {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    
    return `BILL${year}${month}${day}${hours}${minutes}${seconds}`;
  };

  const [trip, setTrip] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [highlightedCustomerIndex, setHighlightedCustomerIndex] = useState(-1);
  const highlightedCustomerRef = useRef(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerBalance, setCustomerBalance] = useState(null);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showRefreshToast, setShowRefreshToast] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showDieselModal, setShowDieselModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showEditTripModal, setShowEditTripModal] = useState(false);
  const [showCompleteTripDetailsModal, setShowCompleteTripDetailsModal] = useState(false);

  // Edit states
  const [editingPurchaseIndex, setEditingPurchaseIndex] = useState(null);
  const [editingSaleIndex, setEditingSaleIndex] = useState(null);
  const [editingExpenseIndex, setEditingExpenseIndex] = useState(null);
  const [editingDieselIndex, setEditingDieselIndex] = useState(null);
  const [editingStockIndex, setEditingStockIndex] = useState(null);



  // Form data
  const [purchaseData, setPurchaseData] = useState({
    supplier: '',
    dcNumber: '',
    birds: '',
    weight: '',
    avgWeight: 0,
    rate: '',
    amount: 0
  });

  const [saleData, setSaleData] = useState({
    client: '',
    billNumber: generateBillNumber(),
    birds: '',
    weight: '',
    avgWeight: 0,
    rate: '',
    amount: 0,
    // paymentMode: 'cash',
    // paymentStatus: 'pending',
    receivedAmount: '',
    discount: '',
    balance: 0,
    cashPaid: '',
    onlinePaid: ''
  });

  const [expenseData, setExpenseData] = useState({
    category: 'meals',
    description: '',
    amount: ''
  });

  const [dieselData, setDieselData] = useState({
    stationName: '',
    volume: '',
    rate: '',
    amount: 0
  });

  const [stockData, setStockData] = useState({
    birds: '',
    weight: '',
    avgWeight: 0,
    rate: '',
    value: 0,
    notes: ''
  });


  const [completeData, setCompleteData] = useState({
    closingOdometer: 0,
    finalRemarks: '',
    mortality: 0
  });

  const [completeTripDetailsData, setCompleteTripDetailsData] = useState({
    driver: '',
    labour: '',
    route: {
      from: '',
      to: ''
    },
    place: '',
    vehicleReadings: {
      opening: ''
    }
  });

  useEffect(() => {
    fetchTrip();
    fetchVendorsAndCustomers();
  }, [id]);

  // Check if trip has incomplete details (TBD values) and show modal
  useEffect(() => {
    if (trip && trip.type === 'transferred') {
      const hasIncompleteDetails = 
        trip.driver?.includes('TBD') || 
        trip.labour?.includes('TBD') ||
        trip.route?.from === 'TBD' || 
        trip.route?.to === 'TBD' ||
        trip.vehicleReadings?.opening === 0;
      
      if (hasIncompleteDetails) {
        setShowCompleteTripDetailsModal(true);
      }
    }
  }, [trip]);

  // Auto-calculate avgWeight and amount when purchaseData changes
  useEffect(() => {
    const birds = Number(purchaseData.birds) || 0;
    const weight = Number(purchaseData.weight) || 0;
    const rate = Number(purchaseData.rate) || 0;

    if (birds > 0 && weight > 0) {
      const avgWeight = calculateAvgWeight(birds, weight);
      if (avgWeight !== purchaseData.avgWeight) {
        setPurchaseData(prev => ({ ...prev, avgWeight }));
      }
    }

    if (weight > 0 && rate > 0) {
      const amount = calculateAmount(weight, rate);
      if (amount !== purchaseData.amount) {
        setPurchaseData(prev => ({ ...prev, amount }));
      }
    }
  }, [purchaseData.birds, purchaseData.weight, purchaseData.rate]);

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
      // Calculate balance using the correct formula: openingBalance + Total Amount - Online Paid - Cash Paid - Discount
      let balance = Number(customerBalance) + Number(saleData.amount) - Number(onlinePaid) - Number(cashPaid) - Number(discount);
      
      // If payment exceeds the sale amount + current opening balance, 
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

  // Auto-calculate amount when diesel volume or rate changes
  useEffect(() => {
    const volume = Number(dieselData.volume) || 0;
    const rate = Number(dieselData.rate) || 0;

    if (volume > 0 && rate > 0) {
      const amount = Number((volume * rate).toFixed(2));
      if (amount !== dieselData.amount) {
        setDieselData(prev => ({ ...prev, amount }));
      }
    } else {
      setDieselData(prev => ({ ...prev, amount: 0 }));
    }
  }, [dieselData.volume, dieselData.rate]);

  // Auto-calculate stock values when birds, weight, or rate changes
  useEffect(() => {
    const birds = Number(stockData.birds) || 0;
    const weight = Number(stockData.weight) || 0;
    const rate = Number(stockData.rate) || 0;

    if (birds > 0 && weight > 0) {
      const avgWeight = Number((weight / birds).toFixed(2));
      const value = Number((weight * rate).toFixed(2));
      
      setStockData(prev => ({
        ...prev,
        avgWeight,
        value
      }));
    } else {
      setStockData(prev => ({
        ...prev,
        avgWeight: 0,
        value: 0
      }));
    }
  }, [stockData.birds, stockData.weight, stockData.rate]);

  // Filter customers based on search term
  useEffect(() => {
    if (customerSearchTerm.trim() === '') {
      setFilteredCustomers(customers);
    } else {
      const filtered = customers.filter(customer =>
        customer.shopName.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
        customer.ownerName?.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
        customer.contact?.includes(customerSearchTerm) ||
        customer.area?.toLowerCase().includes(customerSearchTerm.toLowerCase())
      );
      setFilteredCustomers(filtered);
    }
  }, [customers, customerSearchTerm]);


  const fetchVendorsAndCustomers = async () => {
    try {
      const [vendorsRes, customersRes] = await Promise.all([
        api.get('/vendor'),
        api.get('/customer')
      ]);

      if (vendorsRes.data.success) {
        setVendors(vendorsRes.data.data || []);
      }

      if (customersRes.data.success) {
        const customersData = customersRes.data.data || [];
        // console.log('Fetched customers:', customersData);
        setCustomers(customersData);
        setFilteredCustomers(customersData);
      }
    } catch (error) {
      console.error('Error fetching vendors/customers:', error);
    }
  };

  // Auto-calculation functions for purchase
  const calculateAvgWeight = (birds, weight) => {
    if (birds > 0 && weight > 0) {
      return (weight / birds).toFixed(2);
    }
    return 0;
  };

  const calculateAmount = (weight, ratePerKg) => {
    return (weight * ratePerKg).toFixed(2);
  };

  const handlePurchaseDataChange = (field, value) => {
    const newData = { ...purchaseData, [field]: value };

    // Auto-calculate avgWeight when birds or weight changes
    if (field === 'birds' || field === 'weight') {
      newData.avgWeight = calculateAvgWeight(newData.birds, newData.weight);
    }

    // Auto-calculate amount when weight or rate changes
    if (field === 'weight' || field === 'rate') {
      newData.amount = calculateAmount(newData.weight, newData.rate);
    }

    setPurchaseData(newData);
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
      
      // Calculate balance using the correct formula: openingBalance + Total Amount - Online Paid - Cash Paid - Discount
      if (customerBalance !== null) {
        let balance = Number(customerBalance) + Number(newData.amount) - Number(onlinePaid) - Number(cashPaid) - Number(discount);
        // If payment exceeds the sale amount + current opening balance, 
        // the extra payment reduces the balance to 0 (minimum)
        newData.balance = Math.max(0, balance);
      }
    }
    
    // Auto-calculate receivedAmount when cashPaid or onlinePaid changes
    if (field === 'cashPaid' || field === 'onlinePaid') {
      newData.receivedAmount = newData.cashPaid + newData.onlinePaid;
      // Recalculate balance
      if (customerBalance !== null) {
        let balance = Number(customerBalance) + Number(newData.amount) - Number(newData.onlinePaid) - Number(newData.cashPaid) - Number(newData.discount);
        // If payment exceeds the sale amount + current opening balance, 
        // the extra payment reduces the balance to 0 (minimum)
        newData.balance = Math.max(0, balance);
      }
    }

    setSaleData(newData);
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

  const fetchCustomerBalance = async (customer) => {
    
    if (!customer) {
      setCustomerBalance(null);
      return;
    }

    try {
      setLoadingBalance(true);
      // Fetch customer profile to get opening balance
      const response = await api.get(`/customer/panel/${customer.user._id}/profile`);
      if (response.data.success) {
        const customerData = response.data.data;
        setCustomerBalance(Number(customerData.openingBalance) || 0);
      }
    } catch (error) {
      console.error('Error fetching customer balance:', error);
      setCustomerBalance(null);
    } finally {
      setLoadingBalance(false);
    }
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

  const fetchTrip = async () => {
    try {
      setLoading(true);
      const { data } = await api.get(`/trip/${id}`);
      if (data.success) {
        setTrip(data.data);
      } else {
        setError(data.message || 'Failed to fetch trip');
      }
    } catch (error) {
      console.error('Error fetching trip:', error);
      setError(error.response?.data?.message || 'Failed to fetch trip');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      setError(''); // Clear any existing errors
      const { data } = await api.get(`/trip/${id}`);
      if (data.success) {
        setTrip(data.data);
        // Show success toast
        setShowRefreshToast(true);
        setTimeout(() => setShowRefreshToast(false), 2000);
      } else {
        setError(data.message || 'Failed to refresh trip');
      }
    } catch (error) {
      console.error('Error refreshing trip:', error);
      setError(error.response?.data?.message || 'Failed to refresh trip');
    } finally {
      setRefreshing(false);
    }
  };

  const handlePurchaseSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Validate mandatory fields
      const mandatoryFields = ['supplier', 'dcNumber', 'birds', 'weight', 'rate'];
      const validationErrors = validateMandatoryFields(purchaseData, mandatoryFields);
      
      if (validationErrors.length > 0) {
        alert(`Please fill all mandatory fields:\n${validationErrors.join('\n')}`);
        setIsSubmitting(false);
        return;
      }
      // Clean the data before sending - convert empty string supplier to null
      const cleanedPurchaseData = {
        ...purchaseData,
        supplier: purchaseData.supplier === '' ? null : purchaseData.supplier
      };

      let data;
      if (editingPurchaseIndex !== null) {
        // Edit existing purchase
        data = await api.put(`/trip/${id}/purchase/${editingPurchaseIndex}`, cleanedPurchaseData);
        if (data.data.success) {
          setTrip(data.data.data);
          setShowPurchaseModal(false);
          setPurchaseData({ supplier: '', dcNumber: '', birds: '', weight: '', avgWeight: 0, rate: '', amount: 0 });
          setEditingPurchaseIndex(null);
          alert('Purchase updated successfully!');
        }
      } else {
        // Add new purchase
        data = await api.post(`/trip/${id}/purchase`, cleanedPurchaseData);
        if (data.data.success) {
          setTrip(data.data.data);
          setShowPurchaseModal(false);
          setPurchaseData({ supplier: '', dcNumber: '', birds: '', weight: '', avgWeight: 0, rate: '', amount: 0 });
          alert('Purchase added successfully!');
          // Update status to 'ongoing' when first management activity starts
          await updateTripStatusToOngoing();
        }
      }
    } catch (error) {
      console.error('Error with purchase:', error);
      alert(error.response?.data?.message || 'Failed to save purchase');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Validate mandatory fields
      const mandatoryFields = ['client', 'birds', 'weight', 'rate'];
      const validationErrors = validateMandatoryFields(saleData, mandatoryFields);
      
      if (validationErrors.length > 0) {
        alert(`Please fill all mandatory fields:\n${validationErrors.join('\n')}`);
        setIsSubmitting(false);
        return;
      }

      // Validation: Check if sale birds exceed remaining purchased birds
      const { remainingBirds, remainingWeight } = getPurchaseAndSaleStats();
      const currentSaleBirds = saleData.birds || 0;
      const currentSaleWeight = saleData.weight || 0;
      
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
            `Customer's opening balance: ₹${Number(customerBalance).toFixed(2)}\n` +
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

      // Clean the data before sending - convert empty string client to null
      const cleanedSaleData = {
        ...saleData,
        client: saleData.client === '' ? null : saleData.client
      };

      let data;
      if (editingSaleIndex !== null) {
        // Edit existing sale
        data = await api.put(`/trip/${id}/sale/${editingSaleIndex}`, cleanedSaleData);
        if (data.data.success) {
          setTrip(data.data.data);
          
          // Update customer's opening balance if sale has a client
          if (cleanedSaleData.client && cleanedSaleData.balance !== undefined) {
            try {
              await api.put(`/customer/${cleanedSaleData.client}/opening-balance`, {
                newOpeningBalance: cleanedSaleData.balance
              });
              console.log(`Updated customer opening balance to ${cleanedSaleData.balance}`);
            } catch (error) {
              console.error('Error updating customer balance:', error);
              // Don't fail the sale if balance update fails
            }
          }
          
          setShowSaleModal(false);
          setSaleData({ client: '', billNumber: generateBillNumber(), birds: '', weight: '', avgWeight: 0, rate: '', amount: 0, /* paymentMode: 'cash', paymentStatus: 'pending', */ receivedAmount: '', discount: '', balance: 0, cashPaid: '', onlinePaid: '' });
          setSelectedCustomer(null);
          setCustomerSearchTerm('');
          setShowCustomerDropdown(false);
          setCustomerBalance(null);
          setEditingSaleIndex(null);
          alert('Sale updated successfully!');
        }
      } else {
        // Add new sale
        data = await api.post(`/trip/${id}/sale`, cleanedSaleData);
        if (data.data.success) {
          setTrip(data.data.data);
          
          // Update customer's opening balance if sale has a client
          if (cleanedSaleData.client && cleanedSaleData.balance !== undefined) {
            try {
              await api.put(`/customer/${cleanedSaleData.client}/opening-balance`, {
                newOpeningBalance: cleanedSaleData.balance
              });
              console.log(`Updated customer opening balance to ${cleanedSaleData.balance}`);
            } catch (error) {
              console.error('Error updating customer balance:', error);
              // Don't fail the sale if balance update fails
            }
          }
          
          setShowSaleModal(false);
          setSaleData({ client: '', billNumber: generateBillNumber(), birds: '', weight: '', avgWeight: 0, rate: '', amount: 0, /* paymentMode: 'cash', paymentStatus: 'pending', */ receivedAmount: '', discount: '', balance: 0, cashPaid: '', onlinePaid: '' });
          setSelectedCustomer(null);
          setCustomerSearchTerm('');
          setShowCustomerDropdown(false);
          setCustomerBalance(null);
          alert('Sale added successfully!');
          // Update status to 'ongoing' when first management activity starts
          await updateTripStatusToOngoing();
        }
      }
    } catch (error) {
      console.error('Error with sale:', error);
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
      
      if (validationErrors.length > 0) {
        alert(`Please fill all mandatory fields:\n${validationErrors.join('\n')}`);
        setIsSubmitting(false);
        return;
      }

      // Validate that at least some payment is made
      const totalPaid = (saleData.cashPaid || 0) + (saleData.onlinePaid || 0);
      if (totalPaid <= 0) {
        alert('Please enter at least some payment amount (cash or online)');
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
        data = await api.put(`/trip/${id}/sale/${editingSaleIndex}`, receiptData);
        if (data.data.success) {
          setTrip(data.data.data);
          
          // Update customer's opening balance if receipt has a client and balance
          if (receiptData.client && receiptData.balance !== undefined && receiptData.balance !== 0) {
            try {
              await api.put(`/customer/${receiptData.client}/opening-balance`, {
                newOpeningBalance: receiptData.balance
              });
              console.log(`Updated customer opening balance to ${receiptData.balance}`);
            } catch (error) {
              console.error('Error updating customer balance:', error);
              // Don't fail the receipt if balance update fails
            }
          }
          
          setShowReceiptModal(false);
          setSaleData({ client: '', billNumber: generateBillNumber(), birds: '', weight: '', avgWeight: 0, rate: '', amount: 0, receivedAmount: '', discount: '', balance: 0, cashPaid: '', onlinePaid: '' });
          setSelectedCustomer(null);
          setCustomerSearchTerm('');
          setShowCustomerDropdown(false);
          setEditingSaleIndex(null);
          alert('Receipt updated successfully!');
        }
      } else {
        // Add new receipt as a sale
        data = await api.post(`/trip/${id}/sale`, receiptData);
        if (data.data.success) {
          setTrip(data.data.data);
          
          // Update customer's opening balance if receipt has a client and balance
          if (receiptData.client && receiptData.balance !== undefined && receiptData.balance !== 0) {
            try {
              await api.put(`/customer/${receiptData.client}/opening-balance`, {
                newOpeningBalance: receiptData.balance
              });
              console.log(`Updated customer opening balance to ${receiptData.balance}`);
            } catch (error) {
              console.error('Error updating customer balance:', error);
              // Don't fail the receipt if balance update fails
            }
          }
          
          setShowReceiptModal(false);
          setSaleData({ client: '', billNumber: generateBillNumber(), birds: '', weight: '', avgWeight: 0, rate: '', amount: 0, receivedAmount: '', discount: '', balance: 0, cashPaid: '', onlinePaid: '' });
          setSelectedCustomer(null);
          setCustomerSearchTerm('');
          setShowCustomerDropdown(false);
          alert('Receipt added successfully!');
          // Update status to 'ongoing' when first management activity starts
          await updateTripStatusToOngoing();
        }
      }
    } catch (error) {
      console.error('Error with receipt:', error);
      alert(error.response?.data?.message || 'Failed to save receipt');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExpenseSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Validate mandatory fields
      const mandatoryFields = ['category', 'description', 'amount'];
      const validationErrors = validateMandatoryFields(expenseData, mandatoryFields);
      
      if (validationErrors.length > 0) {
        alert(`Please fill all mandatory fields:\n${validationErrors.join('\n')}`);
        setIsSubmitting(false);
        return;
      }

      const { data } = await api.put(`/trip/${id}/expenses`, { expenses: [...(trip.expenses || []), expenseData] });
      if (data.success) {
        setTrip(data.data);
        setShowExpenseModal(false);
        setExpenseData({ category: 'meals', description: '', amount: '' });
        alert('Expense added successfully!');
        // Update status to 'ongoing' when first management activity starts
        await updateTripStatusToOngoing();
      }
    } catch (error) {
      console.error('Error adding expense:', error);
      alert(error.response?.data?.message || 'Failed to add expense');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDieselSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Validate mandatory fields
      const mandatoryFields = ['stationName', 'volume', 'rate'];
      const validationErrors = validateMandatoryFields(dieselData, mandatoryFields);
      
      if (validationErrors.length > 0) {
        alert(`Please fill all mandatory fields:\n${validationErrors.join('\n')}`);
        setIsSubmitting(false);
        return;
      }

      let data;
      if (editingDieselIndex !== null) {
        // Edit existing diesel record
        data = await api.put(`/trip/${id}/diesel/${editingDieselIndex}`, dieselData);
        if (data.data.success) {
          setTrip(data.data.data);
          setShowDieselModal(false);
          setEditingDieselIndex(null);
          setDieselData({ stationName: '', volume: '', rate: '', amount: 0 });
          alert('Diesel record updated successfully!');
        }
      } else {
        // Add new diesel record
        data = await api.put(`/trip/${id}/diesel`, {
          stations: [...(trip.diesel?.stations || []), dieselData]
        });
        if (data.data.success) {
          setTrip(data.data.data);
          setShowDieselModal(false);
          setDieselData({ stationName: '', volume: '', rate: '', amount: 0 });
          alert('Diesel record added successfully!');
          // Update status to 'ongoing' when first management activity starts
          await updateTripStatusToOngoing();
        }
      }
    } catch (error) {
      console.error('Error with diesel record:', error);
      alert(error.response?.data?.message || 'Failed to save diesel record');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStockSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Validate mandatory fields
      const mandatoryFields = ['birds', 'weight', 'rate'];
      const validationErrors = validateMandatoryFields(stockData, mandatoryFields);
      
      if (validationErrors.length > 0) {
        alert(`Please fill all mandatory fields:\n${validationErrors.join('\n')}`);
        setIsSubmitting(false);
        return;
      }

      // Validate stock limits
      const { availableForStockBirds, availableForStockWeight } = getRemainingStockStats();
      const currentStockBirds = stockData.birds || 0;
      const currentStockWeight = stockData.weight || 0;
      
      // When editing, add back the current stock entry's birds/weight to available count
      let adjustedAvailableBirds = availableForStockBirds;
      let adjustedAvailableWeight = availableForStockWeight;
      
      if (editingStockIndex !== null) {
        // Add back the current stock entry being edited
        const currentStockEntry = trip.stocks[editingStockIndex];
        adjustedAvailableBirds += (currentStockEntry?.birds || 0);
        adjustedAvailableWeight += (currentStockEntry?.weight || 0);
      }
      
      if (currentStockBirds > adjustedAvailableBirds) {
        alert(`Cannot add ${currentStockBirds} birds to stock. Only ${adjustedAvailableBirds} birds are available for stock.`);
        setIsSubmitting(false);
        return;
      }
      
      if (currentStockWeight > adjustedAvailableWeight) {
        alert(`Cannot add ${currentStockWeight} kg to stock. Only ${adjustedAvailableWeight.toFixed(2)} kg are available for stock.`);
        setIsSubmitting(false);
        return;
      }
      // Clean the data before sending
      const cleanedStockData = {
        birds: Number(stockData.birds),
        weight: Number(stockData.weight),
        rate: Number(stockData.rate),
        notes: stockData.notes
      };

      let response;
      if (editingStockIndex !== null) {
        // Edit existing stock
        response = await api.put(`/trip/${id}/stock/${editingStockIndex}`, cleanedStockData);
      } else {
        // Add new stock
        response = await api.post(`/trip/${id}/stock`, cleanedStockData);
      }

      if (response.data.success) {
        setTrip(response.data.data);
        setShowStockModal(false);
        setEditingStockIndex(null);
        setStockData({ birds: '', weight: '', avgWeight: 0, rate: '', value: 0, notes: '' });
        alert(editingStockIndex !== null ? 'Stock updated successfully!' : 'Stock added successfully!');
        // Update status to 'ongoing' when first management activity starts (only for new stock)
        if (editingStockIndex === null) {
          await updateTripStatusToOngoing();
        }
      }
    } catch (error) {
      console.error('Error updating stock:', error);
      alert(error.response?.data?.message || 'Failed to update stock');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteStock = async (stockIndex) => {
    if (!window.confirm('Are you sure you want to delete this stock entry?')) {
      return;
    }

    try {
      const { data } = await api.delete(`/trip/${id}/stock/${stockIndex}`);
      if (data.success) {
        setTrip(data.data);
        alert('Stock deleted successfully!');
      }
    } catch (error) {
      console.error('Error deleting stock:', error);
      alert(error.response?.data?.message || 'Failed to delete stock');
    }
  };

  // Function to update trip status to 'ongoing' when management activities start
  const updateTripStatusToOngoing = async () => {
    if (trip.status === 'started') {
      try {
        const { data } = await api.put(`/trip/${id}/status`, { status: 'ongoing' });
        if (data.success) {
          setTrip(prevTrip => ({ ...prevTrip, status: 'ongoing' }));
        }
      } catch (error) {
        console.error('Error updating trip status:', error);
        // Don't show error to user as this is a background operation
      }
    }
  };

  // Calculate total purchased birds and remaining birds for sale validation
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

  // Calculate remaining stock for stock validation
  const getRemainingStockStats = () => {
    const { remainingBirds, remainingWeight } = getPurchaseAndSaleStats();
    const totalStockBirds = trip.stocks?.reduce((sum, stock) => sum + (stock.birds || 0), 0) || 0;
    const totalStockWeight = trip.stocks?.reduce((sum, stock) => sum + (stock.weight || 0), 0) || 0;
    
    const availableForStockBirds = remainingBirds - totalStockBirds;
    const availableForStockWeight = remainingWeight - totalStockWeight;
    
    return {
      remainingBirds,
      remainingWeight,
      totalStockBirds,
      totalStockWeight,
      availableForStockBirds,
      availableForStockWeight
    };
  };

  // Validation function to check if mandatory fields have valid values (not zero)
  const validateMandatoryFields = (data, fields) => {
    const errors = [];
    fields.forEach(field => {
      if (data[field] === 0 || data[field] === '' || data[field] === null || data[field] === undefined) {
        errors.push(`${field} cannot be zero or empty`);
      }
    });
    return errors;
  };

  const handleCompleteTrip = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { data } = await api.put(`/trip/${id}/complete`, completeData);
      if (data.success) {
        setTrip(data.data);
        setShowCompleteModal(false);
        alert('Trip completed successfully!');
        navigate('/supervisor/trips');
      }
    } catch (error) {
      console.error('Error completing trip:', error);
      alert(error.response?.data?.message || 'Failed to complete trip');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompleteTripDetails = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Validate required fields
      if (!completeTripDetailsData.route.from || !completeTripDetailsData.route.to) {
        alert('Start and End locations are required');
        setIsSubmitting(false);
        return;
      }

      if (!completeTripDetailsData.driver.trim()) {
        alert('Driver name is required');
        setIsSubmitting(false);
        return;
      }

      if (!completeTripDetailsData.vehicleReadings.opening || Number(completeTripDetailsData.vehicleReadings.opening) <= 0) {
        alert('Valid opening odometer reading is required');
        setIsSubmitting(false);
        return;
      }

      const updateData = {
        driver: completeTripDetailsData.driver,
        labour: completeTripDetailsData.labour || '',
        route: {
          from: completeTripDetailsData.route.from,
          to: completeTripDetailsData.route.to
        },
        place: completeTripDetailsData.place || '',
        vehicleReadings: {
          opening: Number(completeTripDetailsData.vehicleReadings.opening)
        }
      };

      const { data } = await api.put(`/trip/${id}/complete-details`, updateData);
      if (data.success) {
        setTrip(data.data);
        setShowCompleteTripDetailsModal(false);
        alert('Trip details completed successfully! You can now manage this trip.');
        // Refresh to get updated data
        await fetchTrip();
      }
    } catch (error) {
      console.error('Error completing trip details:', error);
      alert(error.response?.data?.message || 'Failed to complete trip details');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadInvoice = (sale) => {
    // Find customer details for this sale
    console.log(sale);
    const customer = customers.find(c => c._id === sale?.client?.id || c.id === sale?.client?.id);
    
    if (!customer) {
      alert('Customer details not found for this sale');
      return;
    }

    // Generate and download invoice
    InvoiceGenerator.downloadInvoice(sale, trip, customer);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={fetchTrip}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Trip not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-0 relative">
      {/* Refresh toast */}
      {showRefreshToast && (
        <div className="fixed top-4 right-4 bg-green-600 text-white text-sm px-4 py-2 rounded-lg shadow-lg z-50 flex items-center gap-2 transform transition-all duration-300 ease-in-out">
          <div className="w-2 h-2 bg-white rounded-full"></div>
          Trip data refreshed
        </div>
      )}
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/supervisor/trips')}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{trip.vehicle?.vehicleNumber || 'N/A'}</h1>
          <p className="text-gray-600">{trip.tripId || 'N/A'}</p>
          {trip.type === 'transferred' && (
            <p className="text-orange-600 text-sm font-medium mt-1 flex items-center gap-1">
              <span className="w-2 h-2 bg-orange-600 rounded-full"></span>
              Transferred Trip - Contains transferred stock from {trip.transferredFrom?.tripId ? `Trip ${trip.transferredFrom.tripId}` : 'another trip'}
            </p>
          )}
            <p className="text-gray-500 text-sm">Manage trip details and operations</p>
          </div>
        </div>
        
        {/* Refresh Button */}
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className={`p-2 rounded-lg transition-colors ${
            refreshing 
              ? 'text-gray-400 cursor-not-allowed' 
              : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
          }`}
          title="Refresh trip data"
          data-refresh-button
        >
          <RefreshCw size={20} className={refreshing ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Action Buttons */}
      <div className="mt-4 py-3">
        <div className="flex overflow-x-auto scrollbar-thin gap-2 pb-2">
          {trip.status !== 'completed' ? (
            <>
              {/* Only show Add Purchase button for non-transferred trips */}
              {trip.type !== 'transferred' && (
                <button
                  onClick={() => {
                    setPurchaseData({ supplier: '', dcNumber: '', birds: '', weight: '', avgWeight: 0, rate: '', amount: 0 });
                    setEditingPurchaseIndex(null);
                    setShowPurchaseModal(true);
                  }}
                  className="flex-shrink-0 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 whitespace-nowrap"
                >
                  <Plus size={16} />
                  Add Purchase
                </button>
              )}
              <button
                onClick={() => {
                  setSaleData({ client: '', billNumber: generateBillNumber(), birds: '', weight: '', avgWeight: 0, rate: '', amount: 0, /* paymentMode: 'cash', paymentStatus: 'pending', */ receivedAmount: '', discount: '', balance: 0, cashPaid: '', onlinePaid: '' });
                  setSelectedCustomer(null);
                  setCustomerSearchTerm('');
                  setShowCustomerDropdown(false);
                  setEditingSaleIndex(null);
                  setShowSaleModal(true);
                }}
                className="flex-shrink-0 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 whitespace-nowrap"
              >
                <Plus size={16} />
                Add Sale
              </button>
              <button
                onClick={() => {
                  setSaleData({ client: '', billNumber: generateBillNumber(), birds: 0, weight: 0, avgWeight: 0, rate: 0, amount: 0, receivedAmount: '', discount: '', balance: 0, cashPaid: '', onlinePaid: '', isReceipt: true });
                  setSelectedCustomer(null);
                  setCustomerSearchTerm('');
                  setShowCustomerDropdown(false);
                  setEditingSaleIndex(null);
                  setShowReceiptModal(true);
                }}
                className="flex-shrink-0 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 whitespace-nowrap"
              >
                <CreditCard size={16} />
                Receipt
              </button>
              <button
                onClick={() => setShowExpenseModal(true)}
                className="flex-shrink-0 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center gap-2 whitespace-nowrap"
              >
                <Plus size={16} />
                Add Expense
              </button>
              <button
                onClick={() => {
                  setEditingDieselIndex(null);
                  setDieselData({ stationName: '', volume: '', rate: '', amount: 0 });
                  setShowDieselModal(true);
                }}
                className="flex-shrink-0 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2 whitespace-nowrap"
              >
                <Fuel size={16} />
                Add Diesel
              </button>
              <button
                onClick={() => {
                  setEditingStockIndex(null);
                  setStockData({ 
                    birds: '', 
                    weight: '', 
                    avgWeight: 0, 
                    rate: trip.summary?.avgPurchaseRate || '', 
                    value: 0,
                    notes: ''
                  });
                  setShowStockModal(true);
                }}
                className="flex-shrink-0 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 flex items-center gap-2 whitespace-nowrap"
              >
                <Plus size={16} />
                Add to Stock
              </button>
              {/* Transfer Trip Button - Only show if there are remaining birds */}
              {(() => {
                const remainingBirds = (trip.summary?.totalBirdsPurchased || 0) - 
                                     (trip.summary?.totalBirdsSold || 0) - 
                                     (trip.stocks?.reduce((sum, stock) => sum + (stock.birds || 0), 0) || 0) - 
                                     (trip.summary?.totalBirdsLost || 0) - 
                                     (trip.summary?.birdsTransferred || 0);
                return remainingBirds > 0 ? (
                  <button
                    onClick={() => setShowTransferModal(true)}
                    className="flex-shrink-0 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2 whitespace-nowrap"
                  >
                    <Users size={16} />
                    Transfer Trip
                  </button>
                ) : null;
              })()}
            </>
          ) : (
            <div className="flex items-center px-4 py-2 bg-gray-100 text-gray-500 rounded-lg">
              <Lock size={16} />
              <span className="ml-2 text-sm font-medium">Trip Completed - No modifications allowed</span>
            </div>
          )}
          {trip.status !== 'completed' && (
            <button
              onClick={() => {
                // Pre-fill mortality with remaining birds
                const remainingBirds = trip.summary?.birdsRemaining || 0;
                setCompleteData(prev => ({ ...prev, mortality: remainingBirds }));
                setShowCompleteModal(true);
              }}
              className="flex-shrink-0 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2 whitespace-nowrap"
            >
              <CheckCircle size={16} />
              Complete Trip
            </button>
          )}
        </div>
      </div>

      {/* Trip Status */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${trip.status === 'completed' ? 'bg-green-100 text-green-800' :
                trip.status === 'ongoing' ? 'bg-blue-100 text-blue-800' :
                  'bg-yellow-100 text-yellow-800'
              }`}>
              {trip.status}
            </span>
            <span className="text-sm text-gray-600">
              Created: {new Date(trip.createdAt).toLocaleDateString()}
            </span>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-green-600">
              ₹{trip.status === 'completed' ? (trip.summary?.netProfit?.toFixed(2) || '0.00') : Math.max(0, trip.summary?.netProfit || 0).toFixed(2)}
            </div>
            <div className="text-sm text-gray-500">Net Profit</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex overflow-x-auto scrollbar-hide px-6">
            {['overview', 'purchases', 'sales', 'stock', 'expenses', 'diesel', 'losses', 'financials', 'transfers'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-3 border-b-2 font-medium text-sm capitalize whitespace-nowrap flex-shrink-0 ${activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                {tab === 'transfers' ? 'Transfer Trip Info' : tab}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Trip Details</h3>
                  <button
                    onClick={() => setShowEditTripModal(true)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    <Edit size={16} />
                    Edit
                  </button>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600">Place: {trip.place}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600">Vehicle: {trip.vehicle?.vehicleNumber}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600">Driver: {trip.driver}</span>
                  </div>
                  {trip.labour && (
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600">Labour: {trip.labour}</span>
                  </div>
                  )}

                  {trip.vehicleReadings?.opening && (
                    <div className="flex items-center gap-2">
                      <Truck className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600">
                        Opening Odometer: {trip.vehicleReadings.opening} km
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                {/* Bird Summary */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">Bird Summary</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Purchased:</span>
                      <span className="font-medium">{trip.summary?.totalBirdsPurchased || 0} birds/{(trip.summary?.totalWeightPurchased || 0).toFixed(2)} kg</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Sold:</span>
                      <span className="font-medium">{trip.summary?.totalBirdsSold || 0} birds/{(trip.summary?.totalWeightSold || 0).toFixed(2)} kg</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Stock:</span>
                      <span className="font-medium text-blue-600">{trip.stocks?.reduce((sum, stock) => sum + (stock.birds || 0), 0) || 0} birds/{(trip.stocks?.reduce((sum, stock) => sum + (stock.weight || 0), 0) || 0).toFixed(2)} kg</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Death:</span>
                      <span className="font-medium text-red-600">{trip.summary?.mortality || 0} birds/{(trip.summary?.totalWeightLost || 0).toFixed(2)} kg</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Remaining:</span>
                      <span className="font-medium text-green-600">{trip.summary?.birdsRemaining || 0} birds</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Natural Weight Loss:</span>
                      <span className="font-medium text-orange-600">
                        {trip.status === 'completed' ? Math.abs(trip.summary?.birdWeightLoss || 0).toFixed(2) : '0.00'} kg
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Purchases Tab */}
          {activeTab === 'purchases' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Purchases</h3>
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
                  {trip.purchases.map((purchase, index) => {
                    return (
                      <div key={index} className="bg-gray-50 p-4 rounded-lg">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="font-medium">
                              {trip.type === 'transferred' && purchase.dcNumber?.startsWith('TRANSFER-') 
                                ? 'Transferred Purchase'
                                : (purchase.supplier?.vendorName || 
                                   purchase.supplier?.name || 
                                   purchase.supplier?.companyName || 
                                   (purchase.supplier ? `Vendor (${purchase.supplier._id})` : 'Unknown Vendor'))
                              }
                            </div>
                            <div className="text-sm text-gray-600">
                              DC: {purchase.dcNumber}, {purchase.birds} birds, {purchase.weight} kg
                              {purchase.avgWeight && ` (Avg: ${purchase.avgWeight} kg/bird)`}
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            <div className="text-right">
                              <div className="font-medium">₹{(purchase.amount || 0).toFixed(2)}</div>
                              <div className="text-sm text-gray-500">₹{(purchase.rate || 0).toFixed(2)}/kg</div>
                            </div>
                            {/* Only show edit button for non-transferred trips */}
                            {trip.status !== 'completed' && trip.type !== 'transferred' && (
                              <button
                                onClick={() => {
                                  // Handle supplier field - it could be populated (object) or just ID (string)
                                  let supplierId = '';
                                  if (typeof purchase.supplier === 'string') {
                                    supplierId = purchase.supplier;
                                  } else if (purchase.supplier && purchase.supplier._id) {
                                    supplierId = purchase.supplier._id;
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
                                className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 flex items-center gap-1"
                              >
                                <Save size={12} />
                                Edit
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  }
                  )}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No purchases recorded yet</p>
              )}
            </div>
          )}

          {/* Sales Tab */}
          {activeTab === 'sales' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Sales</h3>
              {trip.sales && trip.sales.length > 0 ? (
                <div className="space-y-4">
                  {/* Sales Summary */}
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <h4 className="font-medium text-green-900 mb-2">Sales Summary</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                      <div>
                        <div className="text-sm text-green-600">Total Sales</div>
                        <div className="font-medium text-green-800">₹{trip.summary?.totalSalesAmount?.toFixed(2) || '0.00'}</div>
                      </div>
                      <div>
                        <div className="text-sm text-green-600">Total Profit</div>
                        <div className="font-medium text-green-800">₹{trip.summary?.totalProfitMargin?.toFixed(2) || '0.00'}</div>
                      </div>
                      <div>
                        <div className="text-sm text-green-600">Avg Purchase Rate</div>
                        <div className="font-medium text-green-800">₹{trip.summary?.avgPurchaseRate?.toFixed(2) || '0.00'}/kg</div>
                      </div>
                      <div>
                        <div className="text-sm text-green-600">Total Birds Sold</div>
                        <div className="font-medium text-green-800">{trip.summary?.totalBirdsSold || 0}</div>
                      </div>
                    </div>
                  </div>

                  {/* Area-wise Sales */}
                  {(() => {
                    const salesByArea = trip.sales.reduce((acc, sale) => {
                      const area = sale.client?.area || 'Customers';
                      if (!acc[area]) acc[area] = [];
                      acc[area].push(sale);
                      return acc;
                    }, {});

                    return Object.entries(salesByArea).map(([area, salesInArea]) => (
                      <div key={area} className="border border-gray-200 rounded-lg">
                        <div className="bg-gray-100 px-4 py-2 border-b border-gray-200">
                          <div className="flex justify-between items-center">
                            <h4 className="font-medium text-gray-800">{area}</h4>
                            <div className="text-sm text-gray-600">
                              {salesInArea.length} sale{salesInArea.length !== 1 ? 's' : ''} | 
                              Total: ₹{salesInArea.reduce((sum, sale) => sum + (sale.amount || 0), 0).toFixed(2)} | 
                              Profit: ₹{salesInArea.reduce((sum, sale) => sum + (sale.profitAmount || 0), 0).toFixed(2)}
                            </div>
                          </div>
                        </div>
                        <div className="p-4 space-y-3">
                          {salesInArea.map((sale, index) => (
                            <div key={index} className="bg-white p-3 rounded border border-gray-100">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <div className="font-medium text-gray-900">
                                    {sale.client?.shopName || `Customer ${index + 1}`}
                                  </div>
                                  <div className="text-sm text-gray-600">
                                    {sale.isReceipt ? (
                                      <>
                                        <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full mr-2">
                                          <Receipt size={12} className="mr-1" />
                                          Receipt
                                        </span>
                                        Bill: {sale.billNumber}
                                      </>
                                    ) : (
                                      <>
                                    Bill: {sale.billNumber} | {sale.birds} birds | {sale.weight} kg
                                    {sale.avgWeight && ` (Avg: ${sale.avgWeight} kg/bird)`}
                                      </>
                                    )}
                                  </div>
                                  <div className="text-xs text-gray-500 mt-1">
                                    {/* {sale.paymentMode}: ₹{sale.receivedAmount?.toLocaleString() || '0'} | */}
                                    {/* Status: {sale.paymentStatus} | */}
                                    Balance: ₹{sale.balance?.toFixed(2) || '0.00'}
                                  </div>
                                </div>
                                <div className="flex flex-col items-end space-y-2">
                                  <div className="text-right">
                                    <div className="font-medium">₹{sale.amount?.toFixed(2)}</div>
                                    <div className="text-sm text-gray-500">₹{(sale.rate || 0).toFixed(2)}/kg</div>
                                    <div className="text-xs text-green-600 font-medium">
                                      Profit: ₹{sale.profitAmount?.toFixed(2)} ({sale.profitMargin > 0 ? '+' : ''}{sale.profitMargin?.toFixed(2)}/kg)
                                    </div>
                                  </div>
                                  <div className="flex space-x-2">
                                    {trip.status !== 'completed' && (
                                      <button
                                        onClick={() => {
                                          if (sale.isReceipt) {
                                            setSaleData({
                                              client: sale.client?._id || '',
                                              billNumber: sale.billNumber || generateBillNumber(),
                                              birds: 0,
                                              weight: 0,
                                              avgWeight: 0,
                                              rate: 0,
                                              amount: 0,
                                              receivedAmount: sale.receivedAmount || 0,
                                              discount: sale.discount || 0,
                                              balance: sale.balance || 0,
                                              cashPaid: sale.cashPaid || 0,
                                              onlinePaid: sale.onlinePaid || 0,
                                              isReceipt: true
                                            });
                                            setSelectedCustomer(sale.client);
                                            setEditingSaleIndex(trip.sales.findIndex(s => s._id === sale._id));
                                            setShowReceiptModal(true);
                                          } else {
                                          setSaleData({
                                            client: sale.client?._id || '',
                                            billNumber: sale.billNumber || generateBillNumber(),
                                            birds: sale.birds || 0,
                                            weight: sale.weight || 0,
                                            avgWeight: sale.avgWeight || 0,
                                            rate: sale.rate || 0,
                                            amount: sale.amount || 0,
                                            // paymentMode: sale.paymentMode || 'cash',
                                            // paymentStatus: sale.paymentStatus || 'pending',
                                            receivedAmount: sale.receivedAmount || 0,
                                            discount: sale.discount || 0,
                                            openingBalance: sale.openingBalance || 0,
                                            cashPaid: sale.cashPaid || 0,
                                            onlinePaid: sale.onlinePaid || 0
                                          });
                                          setSelectedCustomer(sale.client);
                                          setEditingSaleIndex(trip.sales.findIndex(s => s._id === sale._id));
                                          setShowSaleModal(true);
                                          }
                                        }}
                                        className="px-3 py-1 bg-orange-600 text-white text-xs rounded hover:bg-orange-700 flex items-center gap-1"
                                      >
                                        <Save size={12} />
                                        Edit
                                      </button>
                                    )}
                                    <button
                                      onClick={() => handleDownloadInvoice(sale)}
                                      className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 flex items-center gap-1"
                                    >
                                      <Receipt size={12} />
                                      Download
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No sales recorded yet</p>
              )}
            </div>
          )}

          {/* Stock Tab */}
          {activeTab === 'stock' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">Stock Management</h3>
                {trip.status !== 'completed' ? (
                  <button
                    onClick={() => {
                      setEditingStockIndex(null);
                      setStockData({ 
                    birds: '', 
                    weight: '', 
                        avgWeight: 0, 
                    rate: trip.summary?.avgPurchaseRate || '', 
                        value: 0,
                        notes: ''
                      });
                      setShowStockModal(true);
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                  >
                    <Plus size={16} />
                    Add to Stock
                  </button>
                ) : (
                  <div className="flex items-center px-3 py-2 bg-gray-100 text-gray-500 rounded-lg text-sm">
                    <Lock size={14} />
                    <span className="ml-1">No modifications allowed</span>
                  </div>
                )}
              </div>
              
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
                        {trip.status !== 'completed' && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setEditingStockIndex(index);
                                setStockData({
                                  birds: stock.birds,
                                  weight: stock.weight,
                                  avgWeight: stock.avgWeight,
                                  rate: stock.rate,
                                  value: stock.value,
                                  notes: stock.notes || ''
                                });
                                setShowStockModal(true);
                              }}
                              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteStock(index)}
                              className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                            >
                              Delete
                            </button>
                          </div>
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
                  <p className="text-sm text-gray-400 mt-1">Click "Add to Stock" to create your first stock entry</p>
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
                    <span className="font-medium text-gray-900">Remaining Birds:</span>
                    <span className="font-bold text-blue-600">{trip.summary?.birdsRemaining || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Expenses Tab */}
          {activeTab === 'expenses' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Expenses</h3>
              {trip.expenses && trip.expenses.length > 0 ? (
                <div className="space-y-3">
                  {trip.expenses.map((expense, index) => (
                    <div key={index} className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${expense.category === 'lunch' ? 'bg-green-100 text-green-800' :
                                  expense.category === 'tea' ? 'bg-yellow-100 text-yellow-800' :
                                    expense.category === 'toll' ? 'bg-purple-100 text-purple-800' :
                                      expense.category === 'parking' ? 'bg-indigo-100 text-indigo-800' :
                                        expense.category === 'loading/unloading' ? 'bg-orange-100 text-orange-800' :
                                        expense.category === 'maintenance' ? 'bg-red-100 text-red-800' :
                                          'bg-gray-100 text-gray-800'
                              }`}>
                              {expense.category}
                            </span>
                            {expense.date && (
                              <span className="text-xs text-gray-500">
                                {new Date(expense.date).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                          <div className="font-medium">{expense.description}</div>
                        </div>
                        <div className="font-medium text-red-600">₹{expense.amount?.toLocaleString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No expenses recorded yet</p>
              )}

              {/* Expense Summary by Category */}
              {trip.expenses && trip.expenses.length > 0 && (
                <div className="mt-6 bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-3">Expense Summary by Category</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {['lunch', 'tea', 'toll', 'parking', 'maintenance', 'other'].map(category => {
                      const categoryTotal = trip.expenses
                        .filter(exp => exp.category === category)
                        .reduce((sum, exp) => sum + (exp.amount || 0), 0);

                      if (categoryTotal === 0) return null;

                      return (
                        <div key={category} className="text-center p-2 bg-white rounded border">
                          <div className="text-xs text-gray-500 capitalize">{category}</div>
                          <div className="font-medium text-red-600">₹{categoryTotal.toLocaleString()}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Diesel Tab */}
          {activeTab === 'diesel' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Diesel Tracking</h3>
              {trip.diesel && trip.diesel.stations && trip.diesel.stations.length > 0 ? (
                <div className="space-y-3">
                  {trip.diesel.stations.map((station, index) => (
                    <div key={index} className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium">{station.stationName || `Station ${index + 1}`}</div>
                          <div className="text-sm text-gray-600">
                            {(station.volume || 0).toFixed(2)} liters - ₹{(station.rate || 0).toFixed(2)}/liter
                          </div>
                          {station.date && (
                            <div className="text-xs text-gray-500">
                              {new Date(station.date).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="text-right">
                            <div className="font-medium">₹{(station.amount || 0).toFixed(2)}</div>
                          </div>
                          {trip.status !== 'completed' && (
                            <button
                              onClick={() => {
                                setEditingDieselIndex(index);
                                setDieselData({
                                  stationName: station.stationName || '',
                                  volume: station.volume || 0,
                                  rate: station.rate || 0,
                                  amount: station.amount || 0,
                                  date: station.date || new Date().toISOString().split('T')[0]
                                });
                                setShowDieselModal(true);
                              }}
                              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                            >
                              Edit
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Diesel Summary */}
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">Diesel Summary</h4>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-sm text-gray-500">Total Volume</div>
                        <div className="font-medium text-blue-600">{(trip.diesel.totalVolume || 0).toFixed(2)} liters</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Total Amount</div>
                        <div className="font-medium text-red-600">₹{(trip.diesel.totalAmount || 0).toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Avg Rate</div>
                        <div className="font-medium text-green-600">
                          ₹{(trip.diesel.totalVolume > 0 ? (trip.diesel.totalAmount / trip.diesel.totalVolume) : 0).toFixed(2)}/liter
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">No diesel records yet</p>
                  <button
                    onClick={() => {
                      setEditingDieselIndex(null);
                      setDieselData({ stationName: '', volume: '', rate: '', amount: 0 });
                      setShowDieselModal(true);
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Add Diesel Record
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Losses Tab */}
          {activeTab === 'losses' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Losses - Death Birds</h3>
              {/* Automatic Death Calculation Info */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-900 mb-3">Automatic Death Calculation</h4>
                <p className="text-sm text-blue-800 mb-3">
                  Death birds are automatically calculated based on the remaining birds at the end of the trip. 
                  The system tracks birds that cannot be accounted for through sales or stock.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-sm text-blue-600">Total Birds Purchased</div>
                    <div className="font-medium text-blue-800">{trip.summary?.totalBirdsPurchased || 0}</div>
                  </div>
                  <div>
                    <div className="text-sm text-blue-600">Birds Accounted For</div>
                    <div className="font-medium text-blue-800">
                      {(trip.summary?.totalBirdsSold || 0) + (trip.stock?.birds || 0)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-blue-600">Death Birds (Auto)</div>
                    <div className="font-medium text-red-600">{trip.summary?.mortality || 0}</div>
                  </div>
                </div>
              </div>

              {/* Death Birds Summary */}
              {trip.summary?.mortality > 0 && (
                <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                  <h4 className="font-medium text-red-900 mb-3">Death Birds Summary</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div>
                      <div className="text-sm text-red-600">Death Birds</div>
                      <div className="font-medium text-red-800">{trip.summary?.mortality || 0}</div>
                    </div>
                    <div>
                      <div className="text-sm text-red-600">Death Weight</div>
                      <div className="font-medium text-red-800">
                        {(trip.summary?.totalWeightLost || 0).toFixed(2)} kg
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-red-600">Avg Purchase Rate</div>
                      <div className="font-medium text-red-800">
                        ₹{trip.summary?.avgPurchaseRate?.toFixed(2) || '0.00'}/kg
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-red-600">Total Loss</div>
                      <div className="font-medium text-red-800">
                        ₹{((trip.summary?.totalWeightLost || 0) * (trip.summary?.avgPurchaseRate || 0)).toFixed(2)}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 text-xs text-red-600">
                    Note: Death birds are automatically calculated as: Purchased - Sold - Stock - Remaining
                  </div>
                </div>
              )}

              {trip.summary?.mortality === 0 && (
                <div className="text-center py-8">
                  <div className="text-green-600 mb-2">
                    <CheckCircle size={48} className="mx-auto" />
                  </div>
                  <p className="text-gray-700 font-medium">No Death Birds</p>
                  <p className="text-sm text-gray-500">All purchased birds have been accounted for</p>
                </div>
              )}
            </div>
          )}

          {/* Financials Tab */}
          {activeTab === 'financials' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Financial Summary</h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <div className="text-sm text-green-600">Total Revenue</div>
                  <div className="text-2xl font-bold text-green-700">
                    ₹{trip.summary?.totalSalesAmount?.toFixed(2) || '0.00'}
                  </div>
                </div>

                <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                  <div className="text-sm text-red-600">Total Costs</div>
                  <div className="text-2xl font-bold text-red-700">
                    ₹{((trip.summary?.totalPurchaseAmount || 0) + (trip.summary?.totalExpenses || 0)).toFixed(2)}
                  </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="text-sm text-blue-600">Net Profit</div>
                  <div className="text-2xl font-bold text-blue-700">
                    ₹{trip.status === 'completed' ? (trip.summary?.netProfit?.toFixed(2) || '0.00') : Math.max(0, trip.summary?.netProfit || 0).toFixed(2)}
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-3">Breakdown</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Birds Purchased:</span>
                    <span>{trip.summary?.totalBirdsPurchased || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Birds Sold:</span>
                    <span>{trip.summary?.totalBirdsSold || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Birds Remaining:</span>
                    <span>{trip.summary?.birdsRemaining || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Mortality:</span>
                    <span>{trip.summary?.mortality || 0}</span>
                  </div>
                </div>
              </div>

              <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                <h4 className="font-medium text-red-900 mb-3">Weight Analysis</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Purchased Weight:</span>
                    <span>{(trip.summary?.totalWeightPurchased || 0).toFixed(2)} kg</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Sold Weight:</span>
                    <span>{(trip.summary?.totalWeightSold || 0).toFixed(2)} kg</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Lost Weight:</span>
                    <span className="text-red-600">{(trip.summary?.totalWeightLost || 0).toFixed(2)} kg</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="font-medium">Total Weight Loss:</span>
                    <span className={`font-bold ${trip.status === 'completed' && (trip.summary?.birdWeightLoss || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {trip.status === 'completed' ? (trip.summary?.birdWeightLoss || 0).toFixed(2) : '0.00'} kg
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Transfer Trip Info Tab */}
          {activeTab === 'transfers' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Transfer Trip Information</h3>
              
              {/* Trip Type Information */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-3">Trip Type & Status</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <span className="text-blue-700 text-sm">Trip Type:</span>
                    <div className="font-medium text-blue-900 capitalize">
                      {trip.type || 'original'}
                      {trip.type === 'transferred' && (
                        <span className="ml-2 px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                          Transferred Trip
                        </span>
                      )}
                      {trip.type === 'original' && (
                        <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                          Original Trip
                        </span>
                      )}
                    </div>
                  </div>
                  <div>
                    <span className="text-blue-700 text-sm">Current Status:</span>
                    <div className="font-medium text-blue-900">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${trip.status === 'completed' ? 'bg-green-100 text-green-800' :
                          trip.status === 'ongoing' ? 'bg-blue-100 text-blue-800' :
                            'bg-yellow-100 text-yellow-800'
                        }`}>
                        {trip.status}
                      </span>
                    </div>
                  </div>
                  <div>
                    <span className="text-blue-700 text-sm">Birds Transferred:</span>
                    <div className="font-medium text-blue-900">
                      {trip.summary?.birdsTransferred || 0} birds
                    </div>
                  </div>
                </div>
              </div>

              {/* If this is a transferred trip, show source information */}
              {trip.type === 'transferred' && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <h4 className="font-medium text-purple-900 mb-3">Source Trip Information</h4>
                  <div className="space-y-2">
                    <div>
                      <span className="text-purple-700 text-sm">Transferred From Trip:</span>
                      <div className="font-medium text-purple-900">
                        {trip.transferredFrom?.tripId || 'N/A'}
                      </div>
                    </div>
                    {trip.transferredFrom?.supervisor && (
                      <div>
                        <span className="text-purple-700 text-sm">Original Supervisor:</span>
                        <div className="font-medium text-purple-900">
                          {trip.transferredFrom.supervisor.name || 'N/A'}
                        </div>
                      </div>
                    )}
                    {/* Show transfer details from the purchase record */}
                    {trip.purchases?.[0]?.dcNumber?.startsWith('TRANSFER-') && (
                      <div>
                        <span className="text-purple-700 text-sm">Transfer Details:</span>
                        <div className="text-sm text-purple-600 mt-1">
                          • Birds Received: {trip.purchases[0].birds} birds<br/>
                          • Weight Received: {trip.purchases[0].weight} kg<br/>
                          • Avg Weight: {trip.purchases[0].avgWeight} kg/bird<br/>
                          • Transfer Rate: ₹{trip.purchases[0].rate}/kg
                        </div>
                      </div>
                    )}
                    <div className="text-sm text-purple-600">
                      This trip was created by transferring birds from the original trip.
                    </div>
                  </div>
                </div>
              )}

              {/* Transfer History - Outgoing Transfers */}
              {trip.transferHistory && trip.transferHistory.length > 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <h4 className="font-medium text-orange-900 mb-3">Outgoing Transfers</h4>
                  <div className="space-y-3">
                    {trip.transferHistory.map((transfer, index) => (
                      <div key={index} className="bg-white p-4 rounded-lg border border-orange-200">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <div className="mb-2">
                              <span className="text-orange-700 text-sm">Transferred To:</span>
                              <div className="font-medium text-orange-900">
                                {transfer.transferredToSupervisor?.name || 'N/A'}
                              </div>
                              <div className="text-sm text-orange-600">
                                Trip: {transfer.transferredTo?.tripId || 'N/A'}
                              </div>
                            </div>
                            <div className="mb-2">
                              <span className="text-orange-700 text-sm">Transfer Date:</span>
                              <div className="font-medium text-orange-900">
                                {new Date(transfer.transferredAt).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                          <div>
                            <div className="mb-2">
                              <span className="text-orange-700 text-sm">Birds Transferred:</span>
                              <div className="font-medium text-orange-900">
                                {transfer.transferredStock?.birds || 0} birds
                              </div>
                            </div>
                            <div className="mb-2">
                              <span className="text-orange-700 text-sm">Weight Transferred:</span>
                              <div className="font-medium text-orange-900">
                                {(transfer.transferredStock?.weight || 0).toFixed(2)} kg
                              </div>
                            </div>
                            <div className="mb-2">
                              <span className="text-orange-700 text-sm">Transfer Rate:</span>
                              <div className="font-medium text-orange-900">
                                ₹{(transfer.transferredStock?.rate || 0).toFixed(2)}/kg
                              </div>
                            </div>
                          </div>
                        </div>
                        {transfer.reason && (
                          <div className="mt-3 pt-3 border-t border-orange-200">
                            <span className="text-orange-700 text-sm">Reason:</span>
                            <div className="font-medium text-orange-900">
                              {transfer.reason}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Summary Statistics */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-3">Transfer Summary</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  {trip.type === 'transferred' ? (
                    // For transferred trips, show incoming transfer details
                    <>
                      <div>
                        <div className="text-sm text-gray-600">Transferred From</div>
                        <div className="font-medium text-gray-900">
                          {trip.transferredFrom ? 'Yes' : 'Unknown'}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Birds Received</div>
                        <div className="font-medium text-gray-900">
                          {trip.purchases?.[0]?.birds || 0}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Weight Received</div>
                        <div className="font-medium text-gray-900">
                          {(trip.purchases?.[0]?.weight || 0).toFixed(2)} kg
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Remaining Birds</div>
                        <div className="font-medium text-blue-600">
                          {trip.summary?.birdsRemaining || 0}
                        </div>
                      </div>
                    </>
                  ) : (
                    // For original trips, show outgoing transfer details
                    <>
                      <div>
                        <div className="text-sm text-gray-600">Total Transfers Out</div>
                        <div className="font-medium text-gray-900">
                          {trip.transferHistory?.length || 0}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Birds Transferred</div>
                        <div className="font-medium text-gray-900">
                          {trip.summary?.birdsTransferred || 0}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Weight Transferred</div>
                        <div className="font-medium text-gray-900">
                          {(trip.summary?.weightTransferred || 0).toFixed(2)} kg
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Remaining Birds</div>
                        <div className="font-medium text-blue-600">
                          {trip.summary?.birdsRemaining || 0}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* No Transfer Information */}
              {(!trip.transferHistory || trip.transferHistory.length === 0) && trip.type === 'original' && !trip.transferredFrom && (
                <div className="text-center py-8">
                  <div className="text-gray-400 mb-2">
                    <Users size={48} className="mx-auto" />
                  </div>
                  <p className="text-gray-500 font-medium">No Transfer History</p>
                  <p className="text-sm text-gray-400 mt-1">
                    This trip has not been involved in any transfers yet.
                  </p>
                  {(() => {
                    const remainingBirds = (trip.summary?.totalBirdsPurchased || 0) - 
                                         (trip.summary?.totalBirdsSold || 0) - 
                                         (trip.stocks?.reduce((sum, stock) => sum + (stock.birds || 0), 0) || 0) - 
                                         (trip.summary?.totalBirdsLost || 0) - 
                                         (trip.summary?.birdsTransferred || 0);
                    return remainingBirds > 0 && trip.status !== 'completed' ? (
                      <div className="mt-4">
                        <button
                          onClick={() => setShowTransferModal(true)}
                          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                        >
                          Transfer Trip
                        </button>
                      </div>
                    ) : null;
                  })()}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Purchase Modal */}
      {showPurchaseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-xs max-h-[calc(80vh-56px)] flex flex-col">
            <div className="p-4 pb-3 border-b border-gray-200 flex-shrink-0">
              <h3 className="text-base font-semibold text-gray-900">
                {editingPurchaseIndex !== null ? 'Edit Purchase' : 'Add Purchase'}
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 pt-3 min-h-0">

            {/* Summary Section */}
            {purchaseData.birds > 0 && purchaseData.weight > 0 && (
              <div className="bg-blue-50 p-1.5 rounded-lg mb-2">
                <div className="text-xs text-blue-800">
                  <div className="grid grid-cols-2 gap-1">
                    <div><span className="font-medium">DC:</span> {purchaseData.dcNumber}</div>
                    <div><span className="font-medium">Birds:</span> {purchaseData.birds}</div>
                    <div><span className="font-medium">Weight:</span> {purchaseData.weight} kg</div>
                    <div><span className="font-medium">Avg:</span> {purchaseData.avgWeight} kg/bird</div>
                    <div><span className="font-medium">Rate:</span> ₹{purchaseData.rate}/kg</div>
                    <div><span className="font-medium">Amount:</span> ₹{purchaseData.amount?.toLocaleString() || '0'}</div>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handlePurchaseSubmit} className="space-y-2">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Supplier *</label>
                <select
                  value={purchaseData.supplier}
                  onChange={(e) => handlePurchaseDataChange('supplier', e.target.value)}
                  className={`w-full px-2 py-1 border rounded text-xs ${
                    purchaseData.supplier === '' || purchaseData.supplier === null
                      ? 'border-red-300 bg-red-50 focus:ring-red-500 focus:border-red-500' 
                      : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                  }`}
                  required
                >
                  <option value="">Select Vendor</option>
                  {vendors.map(vendor => (
                    <option key={vendor._id || vendor.id} value={vendor._id || vendor.id}>
                      {vendor.vendorName} - {vendor.contactNumber}
                    </option>
                  ))}
                </select>
                {(purchaseData.supplier === '' || purchaseData.supplier === null) && (
                  <p className="text-xs text-red-600 mt-1">Please select a supplier</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">DC NO *</label>
                <input
                  type="text"
                  value={purchaseData.dcNumber}
                  onChange={(e) => handlePurchaseDataChange('dcNumber', e.target.value)}
                  className={`w-full px-2 py-1 border rounded text-xs ${
                    purchaseData.dcNumber === '' || purchaseData.dcNumber === null
                      ? 'border-red-300 bg-red-50 focus:ring-red-500 focus:border-red-500' 
                      : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                  }`}
                  placeholder="Delivery Challan Number"
                  required
                />
                {(purchaseData.dcNumber === '' || purchaseData.dcNumber === null) && (
                  <p className="text-xs text-red-600 mt-1">DC Number cannot be empty</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">BIRDS *</label>
                  <input
                    type="number"
                    value={purchaseData.birds}
                    onChange={(e) => handlePurchaseDataChange('birds', Number(e.target.value))}
                    className={`w-full px-2 py-1 border rounded text-xs ${
                      purchaseData.birds === 0 
                        ? 'border-red-300 bg-red-50 focus:ring-red-500 focus:border-red-500' 
                        : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                    }`}
                    placeholder="Number of birds"
                    required
                    min="1"
                  />
                  {purchaseData.birds === 0 && (
                    <p className="text-xs text-red-600 mt-1">Birds cannot be zero</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">WEIGHT (kg) *</label>
                  <input
                    type="number"
                    value={purchaseData.weight}
                    onChange={(e) => handlePurchaseDataChange('weight', Number(e.target.value))}
                    className={`w-full px-2 py-1 border rounded text-xs ${
                      purchaseData.weight === 0 
                        ? 'border-red-300 bg-red-50 focus:ring-red-500 focus:border-red-500' 
                        : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                    }`}
                    placeholder="Total weight"
                    required
                    min="0.01"
                    step="0.01"
                  />
                  {purchaseData.weight === 0 && (
                    <p className="text-xs text-red-600 mt-1">Weight cannot be zero</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">AVG (kg/bird)</label>
                  <input
                    type="number"
                    value={purchaseData.avgWeight}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded bg-gray-50 text-xs"
                    placeholder="Auto-calculated"
                    readOnly
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">RATE (₹/kg) *</label>
                  <input
                    type="number"
                    value={purchaseData.rate}
                    onChange={(e) => handlePurchaseDataChange('rate', Number(e.target.value))}
                    className={`w-full px-2 py-1 border rounded text-xs ${
                      purchaseData.rate === 0 
                        ? 'border-red-300 bg-red-50 focus:ring-red-500 focus:border-red-500' 
                        : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                    }`}
                    placeholder="Rate per kg"
                    required
                    min="0.01"
                    step="0.01"
                  />
                  {purchaseData.rate === 0 && (
                    <p className="text-xs text-red-600 mt-1">Rate cannot be zero</p>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">AMOUNT (₹)</label>
                <input
                  type="number"
                  value={purchaseData.amount}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded bg-gray-50 text-xs"
                  placeholder="Auto-calculated"
                  readOnly
                  step="0.01"
                />
              </div>
            </form>
            </div>

            {/* Modal Footer */}
            <div className="p-4 pt-3 border-t border-gray-200 bg-gray-50 rounded-b-lg flex-shrink-0">
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setShowPurchaseModal(false)}
                  className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handlePurchaseSubmit}
                  disabled={isSubmitting || !purchaseData.supplier || !purchaseData.dcNumber || purchaseData.birds <= 0 || purchaseData.weight <= 0 || purchaseData.rate <= 0}
                  className="flex-1 px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 text-xs font-medium"
                >
                  {isSubmitting ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : (editingPurchaseIndex !== null ? 'Update' : 'Add')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sale Modal */}
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
              {(() => {
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
                        setCustomerSearchTerm(e.target.value);
                        setSelectedCustomer(null);
                        setSaleData(prev => ({ ...prev, client: '' }));
                        setHighlightedCustomerIndex(-1);
                        setCustomerBalance(null);
                      }}
                      onFocus={handleCustomerInputFocus}
                      onBlur={handleCustomerInputBlur}
                      onKeyDown={handleCustomerKeyDown}
                      placeholder="Search customer by name, owner, contact, or area..."
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />



                    {selectedCustomer && (
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
                          className={`px-4 py-3 cursor-pointer border-b border-gray-100 last:border-b-0 ${
                            index === highlightedCustomerIndex 
                              ? 'bg-blue-100 border-blue-200' 
                              : 'hover:bg-gray-100'
                          }`}
                            >
                              <div className="font-medium text-gray-900">{customer.shopName}</div>
                              {customer.ownerName && (
                                <div className="text-sm text-gray-600">Owner: {customer.ownerName}</div>
                              )}
                              <div className="text-sm text-gray-500">{customer.contact}</div>
                          {customer.area && (
                            <div className="text-xs text-gray-400">Area: {customer.area}</div>
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
                          <span className={`text-sm font-semibold ${
                            customerBalance > 0 ? 'text-red-600' : 'text-green-600'
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
                            className={`w-full px-3 py-2 border rounded-lg ${
                              isExceeding 
                                ? 'border-red-300 bg-red-50 focus:ring-red-500 focus:border-red-500' 
                                : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                            }`}
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
                            className={`w-full px-3 py-2 border rounded-lg ${
                              isZero || isExceeding
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
                      className={`w-full px-3 py-2 border rounded-lg ${
                        saleData.rate === 0 
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Amount (₹)</label>
                  <input
                    type="number"
                    value={saleData.amount}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                    placeholder="Auto-calculated"
                    readOnly
                    step="0.01"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {/* <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Payment Mode</label>
                    <select
                      value={saleData.paymentMode}
                      onChange={(e) => handleSaleDataChange('paymentMode', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="cash">Cash</option>
                      <option value="online">Online</option>
                      <option value="credit">Credit</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Payment Status</label>
                    <select
                      value={saleData.paymentStatus}
                      onChange={(e) => handleSaleDataChange('paymentStatus', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="paid">Paid</option>
                      <option value="pending">Pending</option>
                      <option value="partial">Partial</option>
                    </select>
                  </div> */}
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
                        // Calculate new opening balance: current opening balance + amount - payments - discount
                        const newOpeningBalance = Number(customerBalance) + Number(saleData.amount) - Number(totalPaid) - Number(saleData.discount || 0);
                        return Math.max(0, newOpeningBalance).toFixed(2);
                      }
                      return 0.00;
                    })()}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                    placeholder="Auto-calculated"
                    readOnly
                    step="0.01"
                  />
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
                <p>• <strong>BALANCE:</strong> Auto-calculated using formula: Global Opening Balance + Total Amount - Online Paid - Cash Paid - Discount</p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 pt-3 border-t border-gray-200 bg-gray-50 rounded-b-lg flex-shrink-0">
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowSaleModal(false)}
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
                        setCustomerSearchTerm(e.target.value);
                        setSelectedCustomer(null);
                        setSaleData(prev => ({ ...prev, client: '' }));
                        setHighlightedCustomerIndex(-1);
                        setCustomerBalance(null);
                      }}
                      onFocus={handleCustomerInputFocus}
                      onBlur={handleCustomerInputBlur}
                      onKeyDown={handleCustomerKeyDown}
                      placeholder="Search customer by name, owner, contact, or area..."
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />



                    {selectedCustomer && (
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
                          className={`px-4 py-3 cursor-pointer border-b border-gray-100 last:border-b-0 ${
                            index === highlightedCustomerIndex 
                              ? 'bg-blue-100 border-blue-200' 
                              : 'hover:bg-gray-100'
                          }`}
                        >
                          <div className="font-medium text-gray-900">{customer.shopName}</div>
                          {customer.ownerName && (
                            <div className="text-sm text-gray-600">Owner: {customer.ownerName}</div>
                          )}
                          <div className="text-sm text-gray-500">{customer.contact}</div>
                          {customer.area && (
                            <div className="text-xs text-gray-400">Area: {customer.area}</div>
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
                          <span className={`text-sm font-semibold ${
                            customerBalance > 0 ? 'text-red-600' : 'text-green-600'
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
                        {Number(customerBalance) > 0 ? `Opening Balance: ₹${Number(customerBalance).toLocaleString()}` : 'No outstanding balance'}
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bill Number *</label>
                  <input
                    type="text"
                    value={saleData.billNumber}
                    onChange={(e) => handleSaleDataChange('billNumber', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="Auto-generated"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Opening Balance (₹)</label>
                  <input
                    type="number"
                    value={(() => {
                      // For Receipt modal: calculate opening balance based on customer's current opening balance
                      const totalPaid = Number(saleData.cashPaid) + Number(saleData.onlinePaid);
                      if (customerBalance !== null) {
                        // Calculate new opening balance: current opening balance + amount - payments - discount
                        const newOpeningBalance = Number(customerBalance) + Number(saleData.amount) - Number(totalPaid) - Number(saleData.discount || 0);
                        return Math.max(0, newOpeningBalance).toFixed(2);
                      }
                      return '0.00';
                    })()}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                    placeholder="Auto-calculated"
                    readOnly
                    step="0.01"
                  />
                  {/* Show extra payment info */}
                  {customerBalance !== null && (Number(saleData.cashPaid) + Number(saleData.onlinePaid)) > (Number(customerBalance) + Number(saleData.amount) - Number(saleData.discount || 0)) && (
                    <div className="mt-1 text-xs text-blue-600 bg-blue-50 p-2 rounded">
                      <div className="font-medium">Extra Payment Applied - Opening Balance Reduced</div>
                      <div>Current Opening Balance: ₹{Number(customerBalance).toFixed(2)}</div>
                      <div>Sale Amount: ₹{Number(saleData.amount).toFixed(2)}</div>
                      <div>Total Payment: ₹{(Number(saleData.cashPaid) + Number(saleData.onlinePaid)).toFixed(2)}</div>
                      <div>Extra Payment: ₹{Math.max(0, (Number(saleData.cashPaid) + Number(saleData.onlinePaid)) - (Number(customerBalance) + Number(saleData.amount) - Number(saleData.discount || 0))).toFixed(2)}</div>
                      <div>New Opening Balance: ₹0.00</div>
                    </div>
                  )}
                </div>
              </form>

              {/* Help Text */}
              <div className="mt-3 text-xs text-gray-500 space-y-1">
                <p>• <strong>CUSTOMER:</strong> Select customer from dropdown</p>
                <p>• <strong>BILL NUMBER:</strong> Auto-generated receipt number</p>
                <p>• <strong>PAYMENT:</strong> Enter cash and/or online payment amounts</p>
                <p>• <strong>BALANCE:</strong> Automatically calculated based on customer's outstanding balance</p>
              </div>
            </div>
            
            <div className="p-4 pt-3 border-t border-gray-200 flex-shrink-0">
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowReceiptModal(false);
                    setSaleData({ client: '', billNumber: generateBillNumber(), birds: '', weight: '', avgWeight: 0, rate: '', amount: 0, receivedAmount: '', discount: '', balance: 0, cashPaid: '', onlinePaid: '' });
                    setSelectedCustomer(null);
                    setCustomerSearchTerm('');
                    setShowCustomerDropdown(false);
                    setEditingSaleIndex(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleReceiptSubmit}
                  disabled={isSubmitting || !selectedCustomer}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : (editingSaleIndex !== null ? 'Update Receipt' : 'Add Receipt')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Expense Modal */}
      {showExpenseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Add Expense</h3>
            <form onSubmit={handleExpenseSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                <select
                  value={expenseData.category}
                  onChange={(e) => setExpenseData(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                >
                  <option value="lunch">Lunch</option>
                  <option value="tea">Tea/Snacks</option>
                  <option value="toll">Toll Tax</option>
                  <option value="parking">Parking</option>
                  <option value="loading/unloading">Loading/Unloading Charges</option>
                  <option value="maintenance">Vehicle Maintenance</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                <input
                  type="text"
                  value={expenseData.description}
                  onChange={(e) => setExpenseData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="e.g. Lunch at dhaba, Tea at hotel etc."
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
                  <input
                    type="number"
                    value={expenseData.amount}
                    onChange={(e) => setExpenseData(prev => ({ ...prev, amount: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                </div>
              </div>
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowExpenseModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Add Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Complete Trip Modal */}
      {showCompleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Complete Trip</h3>
            <form onSubmit={handleCompleteTrip} className="space-y-4">
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  rows="3"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mortality (Death Birds)</label>
                <input
                  type="number"
                  value={completeData.mortality}
                  onChange={(e) => setCompleteData(prev => ({ ...prev, mortality: Number(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                  placeholder="Enter number of birds that died"
                />
                <p className="text-sm text-gray-500 mt-1">
                  This represents the remaining birds that are automatically considered as death birds.
                </p>
              </div>
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCompleteModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || (completeData.closingOdometer > 0 && trip?.vehicleReadings?.opening && 
                           completeData.closingOdometer < trip.vehicleReadings.opening)}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Complete Trip'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Diesel Modal */}
      {showDieselModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              {editingDieselIndex !== null ? 'Edit Diesel Record' : 'Add Diesel Record'}
            </h3>

            {/* Summary Section */}
            {dieselData.volume > 0 && dieselData.rate > 0 && (
              <div className="bg-blue-50 p-3 rounded-lg mb-4">
                <div className="text-sm text-blue-800">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="font-medium">Volume:</span> {dieselData.volume} liters
                    </div>
                    <div>
                      <span className="font-medium">Rate:</span> ₹{dieselData.rate}/liter
                    </div>
                    <div className="col-span-2">
                      <span className="font-medium">Total Amount:</span> ₹{(dieselData.volume * dieselData.rate).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleDieselSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Station Name *</label>
                <input
                  type="text"
                  value={dieselData.stationName}
                  onChange={(e) => setDieselData(prev => ({ ...prev, stationName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="e.g., HP Pump, Shell Station"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Volume (liters) *</label>
                  <input
                    type="number"
                    value={dieselData.volume}
                    onChange={(e) => setDieselData(prev => ({ ...prev, volume: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    required
                    min="0"
                    step="0.1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rate per liter *</label>
                  <input
                    type="number"
                    value={dieselData.rate}
                    onChange={(e) => setDieselData(prev => ({ ...prev, rate: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    required
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Amount (Auto-calculated)</label>
                  <input
                    type="number"
                    value={dieselData.amount.toFixed(2)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                    readOnly
                    step="0.01"
                    placeholder="Volume × Rate"
                  />
                </div>
              </div>
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowDieselModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !dieselData.stationName || dieselData.volume <= 0 || dieselData.rate <= 0}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : (editingDieselIndex !== null ? 'Update Diesel Record' : 'Add Diesel Record')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Modal */}
      {showStockModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-xs max-h-[calc(80vh-56px)] flex flex-col">
            <div className="p-4 pb-3 border-b border-gray-200 flex-shrink-0">
              <h3 className="text-base font-semibold text-gray-900">
                {editingStockIndex !== null ? 'Edit Stock Entry' : 'Add to Stock'}
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 pt-3 min-h-0">

            {/* Stock Availability Info */}
            {(() => {
              const { remainingBirds, remainingWeight, totalStockBirds, totalStockWeight, availableForStockBirds, availableForStockWeight } = getRemainingStockStats();
              return (
                <div className="bg-gray-50 p-3 rounded-lg mb-3">
                  <div className="text-sm font-medium text-gray-700 mb-2">Stock Availability</div>
                  
                  {/* Birds Summary */}
                  <div className="mb-3">
                    <div className="text-xs font-medium text-gray-600 mb-2">BIRDS</div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="text-center">
                        <div className="text-gray-500">Remaining</div>
                        <div className="font-semibold text-blue-600">{remainingBirds}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-gray-500">In Stock</div>
                        <div className="font-semibold text-green-600">{totalStockBirds}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-gray-500">Available</div>
                        <div className={`font-semibold ${availableForStockBirds > 0 ? 'text-orange-600' : 'text-red-600'}`}>
                          {availableForStockBirds}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Weight Summary */}
                  <div>
                    <div className="text-xs font-medium text-gray-600 mb-2">WEIGHT (kg)</div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="text-center">
                        <div className="text-gray-500">Remaining</div>
                        <div className="font-semibold text-blue-600">{remainingWeight.toFixed(2)}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-gray-500">In Stock</div>
                        <div className="font-semibold text-green-600">{totalStockWeight.toFixed(2)}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-gray-500">Available</div>
                        <div className={`font-semibold ${availableForStockWeight > 0 ? 'text-orange-600' : 'text-red-600'}`}>
                          {availableForStockWeight.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {(availableForStockBirds <= 0 || availableForStockWeight <= 0) && (
                    <div className="mt-2 text-xs text-red-600 font-medium text-center">
                      ⚠️ No birds/weight available for stock
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Summary Section */}
            {stockData.birds > 0 && stockData.weight > 0 && stockData.rate > 0 && (
              <div className="bg-cyan-50 p-1.5 rounded-lg mb-2">
                <div className="text-xs text-cyan-800">
                  <div className="grid grid-cols-2 gap-1">
                    <div><span className="font-medium">Birds:</span> {stockData.birds}</div>
                    <div><span className="font-medium">Weight:</span> {stockData.weight} kg</div>
                    <div><span className="font-medium">Avg:</span> {stockData.avgWeight} kg/bird</div>
                    <div><span className="font-medium">Rate:</span> ₹{stockData.rate}/kg</div>
                    <div className="col-span-2"><span className="font-medium">Value:</span> ₹{stockData.value.toFixed(2)}</div>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleStockSubmit} className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Birds in Stock *</label>
                  {(() => {
                    const { availableForStockBirds } = getRemainingStockStats();
                    // When editing, add back the current stock entry's birds to available count
                    let adjustedAvailableBirds = availableForStockBirds;
                    if (editingStockIndex !== null) {
                      const currentStockEntry = trip.stocks[editingStockIndex];
                      adjustedAvailableBirds += (currentStockEntry?.birds || 0);
                    }
                    const isExceeding = stockData.birds > adjustedAvailableBirds;
                    const isZero = stockData.birds === 0;
                    
                    return (
                      <>
                        <input
                          type="number"
                          value={stockData.birds}
                          onChange={(e) => setStockData(prev => ({ ...prev, birds: Number(e.target.value) }))}
                          className={`w-full px-2 py-1 border rounded text-xs ${
                            isZero || isExceeding
                              ? 'border-red-300 bg-red-50 focus:ring-red-500 focus:border-red-500' 
                              : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                          }`}
                          required
                          min="1"
                          step="1"
                          max={adjustedAvailableBirds}
                        />
                        <div className="mt-1 text-xs">
                          <span className="text-gray-500">Available: </span>
                          <span className={`font-medium ${adjustedAvailableBirds > 0 ? 'text-orange-600' : 'text-red-600'}`}>
                            {adjustedAvailableBirds}
                          </span>
                          {isZero && (
                            <span className="ml-2 text-red-600 font-medium">
                              ⚠️ Birds cannot be zero
                            </span>
                          )}
                          {isExceeding && !isZero && (
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
                  <label className="block text-xs font-medium text-gray-700 mb-1">Total Weight (kg) *</label>
                  {(() => {
                    const { availableForStockWeight } = getRemainingStockStats();
                    // When editing, add back the current stock entry's weight to available count
                    let adjustedAvailableWeight = availableForStockWeight;
                    if (editingStockIndex !== null) {
                      const currentStockEntry = trip.stocks[editingStockIndex];
                      adjustedAvailableWeight += (currentStockEntry?.weight || 0);
                    }
                    const isExceeding = stockData.weight > adjustedAvailableWeight;
                    const isZero = stockData.weight === 0;
                    
                    return (
                      <>
                        <input
                          type="number"
                          value={stockData.weight}
                          onChange={(e) => setStockData(prev => ({ ...prev, weight: Number(e.target.value) }))}
                          className={`w-full px-2 py-1 border rounded text-xs ${
                            isZero || isExceeding
                              ? 'border-red-300 bg-red-50 focus:ring-red-500 focus:border-red-500' 
                              : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                          }`}
                          required
                          min="0.01"
                          step="0.01"
                          max={adjustedAvailableWeight}
                        />
                        <div className="mt-1 text-xs">
                          <span className="text-gray-500">Available: </span>
                          <span className={`font-medium ${adjustedAvailableWeight > 0 ? 'text-orange-600' : 'text-red-600'}`}>
                            {adjustedAvailableWeight.toFixed(2)} kg
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
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Rate per kg (₹) *</label>
                <input
                  type="number"
                  value={stockData.rate}
                  onChange={(e) => setStockData(prev => ({ ...prev, rate: Number(e.target.value) }))}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                  required
                  min="0"
                  step="0.01"
                  placeholder="Enter purchase rate per kg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Notes (Optional)</label>
                <textarea
                  value={stockData.notes}
                  onChange={(e) => setStockData(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                  rows="2"
                  placeholder="Add any notes about this stock entry..."
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Avg Weight (Auto-calc)</label>
                  <input
                    type="number"
                    value={stockData.avgWeight.toFixed(2)}
                    className="w-full px-2 py-1 border border-gray-300 rounded bg-gray-50 text-xs"
                    readOnly
                    step="0.01"
                    placeholder="Weight ÷ Birds"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Stock Value (Auto-calc)</label>
                  <input
                    type="number"
                    value={stockData.value.toFixed(2)}
                    className="w-full px-2 py-1 border border-gray-300 rounded bg-gray-50 text-xs"
                    readOnly
                    step="0.01"
                    placeholder="Weight × Rate"
                  />
                </div>
              </div>
              <div className="bg-yellow-50 p-1 rounded text-xs text-yellow-800">
                <div className="font-medium mb-0.5">Note:</div>
                <div className="space-y-0.5">
                  <div>• Stock represents birds kept for future sales</div>
                  <div>• Stock value calculated at purchase rate</div>
                  <div>• Not included in current profit calculations</div>
                  <div>• Death birds calculated automatically</div>
                </div>
              </div>
            </form>
            </div>

            {/* Modal Footer */}
            <div className="p-4 pt-3 border-t border-gray-200 bg-gray-50 rounded-b-lg flex-shrink-0">
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setShowStockModal(false)}
                  className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleStockSubmit}
                  disabled={isSubmitting || (() => {
                    const { availableForStockBirds, availableForStockWeight } = getRemainingStockStats();
                    // When editing, add back the current stock entry's birds/weight to available count
                    let adjustedAvailableBirds = availableForStockBirds;
                    let adjustedAvailableWeight = availableForStockWeight;
                    
                    if (editingStockIndex !== null) {
                      const currentStockEntry = trip.stocks[editingStockIndex];
                      adjustedAvailableBirds += (currentStockEntry?.birds || 0);
                      adjustedAvailableWeight += (currentStockEntry?.weight || 0);
                    }
                    
                    return stockData.birds <= 0 || stockData.weight <= 0 || stockData.rate <= 0 || 
                           stockData.birds > adjustedAvailableBirds || stockData.weight > adjustedAvailableWeight;
                  })()}
                  className="flex-1 px-2 py-1 bg-cyan-600 text-white rounded hover:bg-cyan-700 disabled:opacity-50 text-xs font-medium"
                >
                  {isSubmitting ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : (editingStockIndex !== null ? 'Update' : 'Add')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transfer Trip Modal */}
      {showTransferModal && (
        <TransferTripModal
          isOpen={showTransferModal}
          onClose={() => setShowTransferModal(false)}
          trip={trip}
          tripId={id}
          onTransferSuccess={(data) => {
            // Refresh the trip data
            fetchTrip();
            alert(`Trip transferred successfully to ${data.newTrip?.supervisor?.name || 'selected supervisor'}!`);
          }}
        />
      )}

      {/* Complete Trip Details Modal - For Transferred Trips */}
      {showCompleteTripDetailsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b bg-blue-50">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Complete Trip Details</h2>
                <p className="text-sm text-blue-600 mt-1">
                  This is a transferred trip. Please complete the missing details to start managing it.
                </p>
              </div>
              <button
                onClick={() => setShowCompleteTripDetailsModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                disabled={isSubmitting}
              >
                <X size={24} />
              </button>
            </div>

            {/* Content */}
            <form onSubmit={handleCompleteTripDetails} className="p-6">
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-yellow-700">
                      <strong>Transferred Trip:</strong> This trip was transferred to you. Please provide the following details for your new trip with the assigned vehicle.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {/* Route Information */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-3">Route Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Start Location ( Route ) *
                      </label>
                      <input
                        type="text"
                        value={completeTripDetailsData.route.from}
                        onChange={(e) => setCompleteTripDetailsData(prev => ({
                          ...prev,
                          route: { ...prev.route, from: e.target.value }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., SNK, Hyderabad"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        End Location ( Route ) *
                      </label>
                      <input
                        type="text"
                        value={completeTripDetailsData.route.to}
                        onChange={(e) => setCompleteTripDetailsData(prev => ({
                          ...prev,
                          route: { ...prev.route, to: e.target.value }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., SNK, Hyderabad"
                        required
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Area/Region Reference (Optional)
                      </label>
                      <input
                        type="text"
                        value={completeTripDetailsData.place}
                        onChange={(e) => setCompleteTripDetailsData(prev => ({
                          ...prev,
                          place: e.target.value
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., SNK Area, North Zone"
                      />
                    </div>
                  </div>
                </div>

                {/* Team Information */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-3">Team & Vehicle Information</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Driver Name *
                      </label>
                      <input
                        type="text"
                        value={completeTripDetailsData.driver}
                        onChange={(e) => setCompleteTripDetailsData(prev => ({
                          ...prev,
                          driver: e.target.value
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter driver name"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Opening Odometer Reading *
                      </label>
                      <input
                        type="number"
                        value={completeTripDetailsData.vehicleReadings.opening}
                        onChange={(e) => setCompleteTripDetailsData(prev => ({
                          ...prev,
                          vehicleReadings: { opening: e.target.value }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter opening odometer reading"
                        required
                        min="0"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Enter the odometer reading of the assigned vehicle: <strong>{trip?.vehicle?.vehicleNumber}</strong>
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Labour Worker (Optional)
                      </label>
                      <input
                        type="text"
                        value={completeTripDetailsData.labour}
                        onChange={(e) => setCompleteTripDetailsData(prev => ({
                          ...prev,
                          labour: e.target.value
                        }))}
                        placeholder="Enter labour worker name (optional)"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">You can add a labour worker if needed</p>
                    </div>
                  </div>
                </div>

                {/* Trip Summary Info */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-medium text-green-900 mb-2">Transferred Stock Details</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-green-700">Birds:</span>
                      <div className="font-semibold text-green-900">{trip?.summary?.totalBirdsPurchased || 0} birds</div>
                    </div>
                    <div>
                      <span className="text-green-700">Weight:</span>
                      <div className="font-semibold text-green-900">{trip?.summary?.totalWeightPurchased?.toFixed(2) || '0.00'} kg</div>
                    </div>
                    <div>
                      <span className="text-green-700">Assigned Vehicle:</span>
                      <div className="font-semibold text-green-900">{trip?.vehicle?.vehicleNumber}</div>
                    </div>
                    <div>
                      <span className="text-green-700">Transferred From:</span>
                      <div className="font-semibold text-green-900">{trip?.transferredFrom?.tripId || 'N/A'}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 mt-6 pt-6 border-t">
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('Are you sure? You need to complete these details to manage this trip.')) {
                      setShowCompleteTripDetailsModal(false);
                    }
                  }}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                  {isSubmitting ? 'Saving...' : 'Complete Trip Details'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Trip Modal */}
      <EditTripModal
        isOpen={showEditTripModal}
        onClose={() => setShowEditTripModal(false)}
        trip={trip}
        onSuccess={() => {
          fetchTrip(); // Refresh trip data
        }}
      />

    </div>
  );
};

export default SupervisorTripDetails;

