import { useState, useEffect } from 'react';
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
  Fuel,
  TrendingUp,
  CheckCircle,
  Lock
} from 'lucide-react';
import api from '../lib/axios';
import { useAuth } from '../contexts/AuthContext';
import InvoiceGenerator from '../components/InvoiceGenerator';

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
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showDieselModal, setShowDieselModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);

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
    birds: 0,
    weight: 0,
    avgWeight: 0,
    rate: 0,
    amount: 0
  });

  const [saleData, setSaleData] = useState({
    client: '',
    billNumber: generateBillNumber(),
    birds: 0,
    weight: 0,
    avgWeight: 0,
    rate: 0,
    amount: 0,
    paymentMode: 'cash',
    paymentStatus: 'pending',
    receivedAmount: 0,
    discount: 0,
    balance: 0,
    cashPaid: 0,
    onlinePaid: 0
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
    fetchTrip();
    fetchVendorsAndCustomers();
  }, [id]);

  // Auto-calculate avgWeight and amount when purchaseData changes
  useEffect(() => {
    if (purchaseData.birds > 0 && purchaseData.weight > 0) {
      const avgWeight = calculateAvgWeight(purchaseData.birds, purchaseData.weight);
      if (avgWeight !== purchaseData.avgWeight) {
        setPurchaseData(prev => ({ ...prev, avgWeight }));
      }
    }

    if (purchaseData.weight > 0 && purchaseData.rate > 0) {
      const amount = calculateAmount(purchaseData.weight, purchaseData.rate);
      if (amount !== purchaseData.amount) {
        setPurchaseData(prev => ({ ...prev, amount }));
      }
    }
  }, [purchaseData.birds, purchaseData.weight, purchaseData.rate]);

  // Auto-calculate avgWeight, amount, and balance when saleData changes
  useEffect(() => {
    if (saleData.birds > 0 && saleData.weight > 0) {
      const avgWeight = calculateAvgWeight(saleData.birds, saleData.weight);
      if (avgWeight !== saleData.avgWeight) {
        setSaleData(prev => ({ ...prev, avgWeight }));
      }
    }

    if (saleData.weight > 0 && saleData.rate > 0) {
      const amount = calculateAmount(saleData.weight, saleData.rate);
      if (amount !== saleData.amount) {
        setSaleData(prev => ({ ...prev, amount }));
      }
    }

    if (saleData.amount > 0) {
      const receivedAmount = saleData.cashPaid + saleData.onlinePaid;
      const balance = saleData.amount - receivedAmount - saleData.discount;
      if (receivedAmount !== saleData.receivedAmount || balance !== saleData.balance) {
        setSaleData(prev => ({ 
          ...prev, 
          receivedAmount,
          balance 
        }));
      }
    }
  }, [saleData.birds, saleData.weight, saleData.rate, saleData.amount, saleData.cashPaid, saleData.onlinePaid, saleData.discount]);

  // Auto-calculate amount when diesel volume or rate changes
  useEffect(() => {
    if (dieselData.volume > 0 && dieselData.rate > 0) {
      const amount = Number((dieselData.volume * dieselData.rate).toFixed(2));
      if (amount !== dieselData.amount) {
        setDieselData(prev => ({ ...prev, amount }));
      }
    } else if (dieselData.volume === 0 || dieselData.rate === 0) {
      setDieselData(prev => ({ ...prev, amount: 0 }));
    }
  }, [dieselData.volume, dieselData.rate]);

  // Auto-calculate stock values when birds, weight, or rate changes
  useEffect(() => {
    if (stockData.birds > 0 && stockData.weight > 0) {
      const avgWeight = Number((stockData.weight / stockData.birds).toFixed(2));
      const value = Number((stockData.weight * stockData.rate).toFixed(2));
      
      setStockData(prev => ({
        ...prev,
        avgWeight,
        value
      }));
    } else if (stockData.birds === 0 || stockData.weight === 0) {
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

  // Group customers by area for better organization
  const getCustomersByArea = (customerList) => {
    const grouped = customerList.reduce((acc, customer) => {
      const area = customer.area || 'No Area';
      if (!acc[area]) {
        acc[area] = [];
      }
      acc[area].push(customer);
      return acc;
    }, {});

    // Sort areas by customer count (descending) and then alphabetically
    return Object.entries(grouped)
      .sort(([a, aCustomers], [b, bCustomers]) => {
        if (bCustomers.length !== aCustomers.length) {
          return bCustomers.length - aCustomers.length;
        }
        return a.localeCompare(b);
      })
      .map(([area, customersGrp]) => ({ area, customersGrp, count: customersGrp.length }));
  };

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
    return weight * ratePerKg;
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

    // Auto-calculate balance when amount, receivedAmount, or discount changes
    if (field === 'amount' || field === 'receivedAmount' || field === 'discount') {
      newData.balance = newData.amount - newData.receivedAmount - newData.discount;
    }
    
    // Auto-calculate receivedAmount when cashPaid or onlinePaid changes
    if (field === 'cashPaid' || field === 'onlinePaid') {
      newData.receivedAmount = newData.cashPaid + newData.onlinePaid;
      newData.balance = newData.amount - newData.receivedAmount - newData.discount;
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
  };

  const handleCustomerInputFocus = () => {
    setShowCustomerDropdown(true);
  };
  

  const handleCustomerInputBlur = () => {
    // Delay hiding dropdown to allow for click events
    setTimeout(() => {
      setShowCustomerDropdown(false);
    }, 150);
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

  const handlePurchaseSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
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
          setPurchaseData({ supplier: '', dcNumber: '', birds: 0, weight: 0, avgWeight: 0, rate: 0, amount: 0 });
          setEditingPurchaseIndex(null);
          alert('Purchase updated successfully!');
        }
      } else {
        // Add new purchase
        data = await api.post(`/trip/${id}/purchase`, cleanedPurchaseData);
        if (data.data.success) {
          setTrip(data.data.data);
          setShowPurchaseModal(false);
          setPurchaseData({ supplier: '', dcNumber: '', birds: 0, weight: 0, avgWeight: 0, rate: 0, amount: 0 });
          alert('Purchase added successfully!');
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
          setShowSaleModal(false);
          setSaleData({ client: '', billNumber: generateBillNumber(), birds: 0, weight: 0, avgWeight: 0, rate: 0, amount: 0, paymentMode: 'cash', paymentStatus: 'pending', receivedAmount: 0, discount: 0, balance: 0, cashPaid: 0, onlinePaid: 0 });
          setSelectedCustomer(null);
          setCustomerSearchTerm('');
          setShowCustomerDropdown(false);
          setEditingSaleIndex(null);
          alert('Sale updated successfully!');
        }
      } else {
        // Add new sale
        data = await api.post(`/trip/${id}/sale`, cleanedSaleData);
        if (data.data.success) {
          setTrip(data.data.data);
          setShowSaleModal(false);
          setSaleData({ client: '', billNumber: generateBillNumber(), birds: 0, weight: 0, avgWeight: 0, rate: 0, amount: 0, paymentMode: 'cash', paymentStatus: 'pending', receivedAmount: 0, discount: 0, balance: 0, cashPaid: 0, onlinePaid: 0 });
          setSelectedCustomer(null);
          setCustomerSearchTerm('');
          setShowCustomerDropdown(false);
          alert('Sale added successfully!');
        }
      }
    } catch (error) {
      console.error('Error with sale:', error);
      alert(error.response?.data?.message || 'Failed to save sale');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExpenseSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { data } = await api.put(`/trip/${id}/expenses`, { expenses: [...(trip.expenses || []), expenseData] });
      if (data.success) {
        setTrip(data.data);
        setShowExpenseModal(false);
        setExpenseData({ category: 'meals', description: '', amount: 0, date: new Date().toISOString().split('T')[0] });
        alert('Expense added successfully!');
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
      let data;
      if (editingDieselIndex !== null) {
        // Edit existing diesel record
        data = await api.put(`/trip/${id}/diesel/${editingDieselIndex}`, dieselData);
        if (data.data.success) {
          setTrip(data.data.data);
          setShowDieselModal(false);
          setEditingDieselIndex(null);
          setDieselData({ stationName: '', volume: 0, rate: 0, amount: 0, date: new Date().toISOString().split('T')[0] });
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
          setDieselData({ stationName: '', volume: 0, rate: 0, amount: 0, date: new Date().toISOString().split('T')[0] });
          alert('Diesel record added successfully!');
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
        setStockData({ birds: 0, weight: 0, avgWeight: 0, rate: 0, value: 0, notes: '' });
        alert(editingStockIndex !== null ? 'Stock updated successfully!' : 'Stock added successfully!');
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
    <div className="space-y-6">
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
            <p className="text-gray-500 text-sm">Manage trip details and operations</p>
          </div>
        </div>

        <div className="flex space-x-2">
          {trip.status !== 'completed' ? (
            <>
              <button
                onClick={() => {
                  setPurchaseData({ supplier: '', dcNumber: '', birds: 0, weight: 0, avgWeight: 0, rate: 0, amount: 0 });
                  setEditingPurchaseIndex(null);
                  setShowPurchaseModal(true);
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
              >
                <Plus size={16} />
                Add Purchase
              </button>
              <button
                onClick={() => {
                  setSaleData({ client: '', billNumber: generateBillNumber(), birds: 0, weight: 0, avgWeight: 0, rate: 0, amount: 0, paymentMode: 'cash', paymentStatus: 'pending', receivedAmount: 0, discount: 0, balance: 0, cashPaid: 0, onlinePaid: 0 });
                  setSelectedCustomer(null);
                  setCustomerSearchTerm('');
                  setShowCustomerDropdown(false);
                  setEditingSaleIndex(null);
                  setShowSaleModal(true);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <Plus size={16} />
                Add Sale
              </button>
              <button
                onClick={() => setShowExpenseModal(true)}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center gap-2"
              >
                <Plus size={16} />
                Add Expense
              </button>
              <button
                onClick={() => {
                  setEditingDieselIndex(null);
                  setDieselData({ stationName: '', volume: 0, rate: 0, amount: 0, date: new Date().toISOString().split('T')[0] });
                  setShowDieselModal(true);
                }}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
              >
                <Fuel size={16} />
                Add Diesel
              </button>
              <button
                onClick={() => {
                  setEditingStockIndex(null);
                  setStockData({ 
                    birds: 0, 
                    weight: 0, 
                    avgWeight: 0, 
                    rate: trip.summary?.avgPurchaseRate || 0, 
                    value: 0,
                    notes: ''
                  });
                  setShowStockModal(true);
                }}
                className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 flex items-center gap-2"
              >
                <Plus size={16} />
                Add to Stock
              </button>
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
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
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
          <nav className="flex space-x-8 px-6">
            {['overview', 'purchases', 'sales', 'stock', 'expenses', 'diesel', 'losses', 'financials'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-1 border-b-2 font-medium text-sm capitalize ${activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Trip Details</h3>
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
                  <div className="text-sm text-gray-600">
                    Labours: {trip.labours?.join(', ')}
                  </div>

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
                <h3 className="text-lg font-semibold text-gray-900">Financial Summary</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Total Sales:</span>
                    <span className="font-medium">₹{trip.summary?.totalSalesAmount?.toFixed(2) || '0.00'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Total Purchase Amount:</span>
                    <span className="font-medium">₹{trip.summary?.totalPurchaseAmount?.toFixed(2) || '0.00'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Sales Profit:</span>
                    <span className="font-medium text-green-600">₹{trip.summary?.totalProfitMargin?.toFixed(2) || '0.00'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Total Expenses:</span>
                    <span className="font-medium">₹{trip.summary?.totalExpenses?.toFixed(2) || '0.00'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Diesel Cost:</span>
                    <span className="font-medium">₹{trip.summary?.totalDieselAmount?.toFixed(2) || '0.00'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Death Losses:</span>
                    <span className="font-medium text-red-600">₹{trip.summary?.totalLosses?.toFixed(2) || '0.00'}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-sm font-medium text-gray-900">Net Profit:</span>
                    <span className="font-bold text-green-600">₹{trip.status === 'completed' ? (trip.summary?.netProfit?.toFixed(2) || '0.00') : Math.max(0, trip.summary?.netProfit || 0).toFixed(2)}</span>
                  </div>
                </div>

                {/* Bird Summary */}
                <div className="mt-4 pt-4 border-t">
                  <h4 className="font-medium text-gray-900 mb-2">Bird Summary</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Purchased:</span>
                      <span className="font-medium">{trip.summary?.totalBirdsPurchased || 0} birds</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Sold:</span>
                      <span className="font-medium">{trip.summary?.totalBirdsSold || 0} birds</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">In Stock:</span>
                      <span className="font-medium text-blue-600">{trip.stocks?.reduce((sum, stock) => sum + (stock.birds || 0), 0) || 0} birds</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Death:</span>
                      <span className="font-medium text-red-600">{trip.summary?.mortality || 0} birds</span>
                    </div>
                    <div className="flex justify-between border-t pt-1">
                      <span className="text-gray-600 font-medium">Remaining:</span>
                      <span className="font-bold text-blue-600">{trip.summary?.birdsRemaining || 0} birds</span>
                    </div>
                  </div>
                </div>

                {/* Weight Summary */}
                <div className="mt-4 pt-4 border-t">
                  <h4 className="font-medium text-gray-900 mb-2">Weight Summary</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Purchased Weight:</span>
                      <span className="font-medium">{(trip.summary?.totalWeightPurchased || 0).toFixed(2)} kg</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Sold Weight:</span>
                      <span className="font-medium">{(trip.summary?.totalWeightSold || 0).toFixed(2)} kg</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Stock Weight:</span>
                      <span className="font-medium text-blue-600">{trip.stocks?.reduce((sum, stock) => sum + (stock.weight || 0), 0).toFixed(2) || '0.00'} kg</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Death Weight:</span>
                      <span className="font-medium text-red-600">{(trip.summary?.totalWeightLost || 0).toFixed(2)} kg</span>
                    </div>
                    <div className="flex justify-between border-t pt-1">
                      <span className="text-gray-600 font-medium">Natural Weight Loss:</span>
                      <span className="font-bold text-orange-600">
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
              {trip.purchases && trip.purchases.length > 0 ? (
                <div className="space-y-3">
                  {trip.purchases.map((purchase, index) => {
                    return (
                      <div key={index} className="bg-gray-50 p-4 rounded-lg">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="font-medium">
                              {purchase.supplier?.vendorName || 
                               purchase.supplier?.name || 
                               purchase.supplier?.companyName || 
                               (purchase.supplier ? `Vendor (${purchase.supplier._id})` : 'Unknown Vendor')}
                            </div>
                            <div className="text-sm text-gray-600">
                              DC: {purchase.dcNumber}, {purchase.birds} birds, {purchase.weight} kg
                              {purchase.avgWeight && ` (Avg: ${purchase.avgWeight} kg/bird)`}
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            <div className="text-right">
                              <div className="font-medium">₹{purchase.amount?.toLocaleString()}</div>
                              <div className="text-sm text-gray-500">₹{purchase.rate}/kg</div>
                            </div>
                            {trip.status !== 'completed' && (
                              <button
                                onClick={() => {
                                  setPurchaseData({
                                    supplier: purchase.supplier?._id || '',
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
                      const area = sale.client?.area || 'Unknown Area';
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
                                    {sale.client?.shopName || 'Unknown Customer'}
                                  </div>
                                  <div className="text-sm text-gray-600">
                                    Bill: {sale.billNumber} | {sale.birds} birds | {sale.weight} kg
                                    {sale.avgWeight && ` (Avg: ${sale.avgWeight} kg/bird)`}
                                  </div>
                                  <div className="text-xs text-gray-500 mt-1">
                                    {sale.paymentMode}: ₹{sale.receivedAmount?.toLocaleString() || '0'} |
                                    Status: {sale.paymentStatus} |
                                    Balance: ₹{sale.balance?.toFixed(2) || '0.00'}
                                  </div>
                                </div>
                                <div className="flex flex-col items-end space-y-2">
                                  <div className="text-right">
                                    <div className="font-medium">₹{sale.amount?.toFixed(2)}</div>
                                    <div className="text-sm text-gray-500">₹{sale.rate}/kg</div>
                                    <div className="text-xs text-green-600 font-medium">
                                      Profit: ₹{sale.profitAmount?.toFixed(2)} ({sale.profitMargin > 0 ? '+' : ''}{sale.profitMargin?.toFixed(2)}/kg)
                                    </div>
                                  </div>
                                  <div className="flex space-x-2">
                                    {trip.status !== 'completed' && (
                                      <button
                                        onClick={() => {
                                          setSaleData({
                                            client: sale.client?._id || '',
                                            billNumber: sale.billNumber || generateBillNumber(),
                                            birds: sale.birds || 0,
                                            weight: sale.weight || 0,
                                            avgWeight: sale.avgWeight || 0,
                                            rate: sale.rate || 0,
                                            amount: sale.amount || 0,
                                            paymentMode: sale.paymentMode || 'cash',
                                            paymentStatus: sale.paymentStatus || 'pending',
                                            receivedAmount: sale.receivedAmount || 0,
                                            discount: sale.discount || 0,
                                            balance: sale.balance || 0,
                                            cashPaid: sale.cashPaid || 0,
                                            onlinePaid: sale.onlinePaid || 0
                                          });
                                          setSelectedCustomer(sale.client);
                                          setEditingSaleIndex(trip.sales.findIndex(s => s._id === sale._id));
                                          setShowSaleModal(true);
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
                        birds: 0, 
                        weight: 0, 
                        avgWeight: 0, 
                        rate: trip.summary?.avgPurchaseRate || 0, 
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
                            {station.volume} liters - ₹{station.rate}/liter
                          </div>
                          {station.date && (
                            <div className="text-xs text-gray-500">
                              {new Date(station.date).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="text-right">
                            <div className="font-medium">₹{station.amount?.toLocaleString()}</div>
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
                        <div className="font-medium text-blue-600">{trip.diesel.totalVolume} liters</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Total Amount</div>
                        <div className="font-medium text-red-600">₹{trip.diesel.totalAmount?.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Avg Rate</div>
                        <div className="font-medium text-green-600">
                          ₹{trip.diesel.totalVolume > 0 ? (trip.diesel.totalAmount / trip.diesel.totalVolume).toFixed(2) : '0'}/liter
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
                      setDieselData({ stationName: '', volume: 0, rate: 0, amount: 0, date: new Date().toISOString().split('T')[0] });
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
        </div>
      </div>

      {/* Purchase Modal */}
      {showPurchaseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              {editingPurchaseIndex !== null ? 'Edit Purchase' : 'Add Purchase'}
            </h3>

            {/* Summary Section */}
            {purchaseData.birds > 0 && purchaseData.weight > 0 && (
              <div className="bg-blue-50 p-3 rounded-lg mb-4">
                <div className="text-sm text-blue-800">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="font-medium">DC NO:</span> {purchaseData.dcNumber}
                    </div>
                    <div>
                      <span className="font-medium">Total Birds:</span> {purchaseData.birds}
                    </div>
                    <div>
                      <span className="font-medium">Total Weight:</span> {purchaseData.weight} kg
                    </div>
                    <div>
                      <span className="font-medium">Avg Weight:</span> {purchaseData.avgWeight} kg/bird
                    </div>
                    <div>
                      <span className="font-medium">Rate:</span> ₹{purchaseData.rate}/kg
                    </div>
                    <div>
                      <span className="font-medium">Total Amount:</span> ₹{purchaseData.amount?.toLocaleString() || '0'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handlePurchaseSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Supplier *</label>
                <select
                  value={purchaseData.supplier}
                  onChange={(e) => handlePurchaseDataChange('supplier', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                >
                  <option value="">Select Vendor</option>
                  {vendors.map(vendor => (
                    <option key={vendor._id || vendor.id} value={vendor._id || vendor.id}>
                      {vendor.vendorName} - {vendor.contactNumber}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">DC NO *</label>
                <input
                  type="text"
                  value={purchaseData.dcNumber}
                  onChange={(e) => handlePurchaseDataChange('dcNumber', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Delivery Challan Number"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">BIRDS *</label>
                  <input
                    type="number"
                    value={purchaseData.birds}
                    onChange={(e) => handlePurchaseDataChange('birds', Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="Number of birds"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">WEIGHT (kg) *</label>
                  <input
                    type="number"
                    value={purchaseData.weight}
                    onChange={(e) => handlePurchaseDataChange('weight', Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="Total weight of all birds"
                    required
                    step="0.01"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">AVG (kg/bird)</label>
                  <input
                    type="number"
                    value={purchaseData.avgWeight}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                    placeholder="Auto-calculated"
                    readOnly
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">RATE (₹/kg) *</label>
                  <input
                    type="number"
                    value={purchaseData.rate}
                    onChange={(e) => handlePurchaseDataChange('rate', Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="Rate per kg"
                    required
                    step="0.01"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">AMOUNT (₹)</label>
                <input
                  type="number"
                  value={purchaseData.amount}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                  placeholder="Auto-calculated"
                  readOnly
                  step="0.01"
                />
              </div>
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowPurchaseModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !purchaseData.supplier || !purchaseData.dcNumber || purchaseData.birds <= 0 || purchaseData.weight <= 0 || purchaseData.rate <= 0}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : (editingPurchaseIndex !== null ? 'Update Purchase' : 'Add Purchase')}
                </button>
              </div>
            </form>

            {/* Help Text */}
            <div className="mt-4 text-xs text-gray-500">
              <p>• <strong>SUPPLIER:</strong> Select the vendor from the dropdown</p>
              <p>• <strong>DC NO:</strong> Enter the delivery challan number</p>
              <p>• <strong>BIRDS:</strong> Enter the total number of birds purchased</p>
              <p>• <strong>WEIGHT:</strong> Enter the total weight of all birds in kg</p>
              <p>• <strong>AVG:</strong> Automatically calculated as Weight ÷ Birds</p>
              <p>• <strong>RATE:</strong> Enter the price per kg</p>
              <p>• <strong>AMOUNT:</strong> Automatically calculated as Weight × Rate</p>
            </div>
          </div>
        </div>
      )}

      {/* Sale Modal */}
      {showSaleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md max-h-[80vh] flex flex-col">
            <div className="p-6 pb-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold">
                {editingSaleIndex !== null ? 'Edit Sale' : 'Add Sale'}
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-6 pt-4">

              {/* Summary Section */}
              {saleData.birds > 0 && saleData.weight > 0 && (
                <div className="bg-blue-50 p-3 rounded-lg mb-4">
                  <div className="text-sm text-blue-800">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="font-medium">Bill Number:</span> {saleData.billNumber}
                      </div>
                      <div>
                        <span className="font-medium">Total Birds:</span> {saleData.birds}
                      </div>
                      <div>
                        <span className="font-medium">Total Weight:</span> {saleData.weight} kg
                      </div>
                      <div>
                        <span className="font-medium">Avg Weight:</span> {saleData.avgWeight} kg/bird
                      </div>
                      <div>
                        <span className="font-medium">Rate:</span> ₹{saleData.rate}/kg
                      </div>
                      <div>
                        <span className="font-medium">Total Amount:</span> ₹{saleData.amount?.toFixed(2) || '0.00'}
                      </div>
                      <div>
                        <span className="font-medium">Payment Mode:</span> {saleData.paymentMode}
                      </div>
                      <div>
                        <span className="font-medium">Payment Status:</span> {saleData.paymentStatus}
                      </div>
                      <div>
                        <span className="font-medium">Cash Paid:</span> ₹{saleData.cashPaid?.toLocaleString() || '0'}
                      </div>
                      <div>
                        <span className="font-medium">Online Paid:</span> ₹{saleData.onlinePaid?.toLocaleString() || '0'}
                      </div>
                      <div>
                        <span className="font-medium">Discount:</span> ₹{saleData.discount?.toLocaleString() || '0'}
                      </div>
                      <div>
                        <span className="font-medium">Balance:</span> ₹{saleData.balance?.toFixed(2) || '0.00'}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <form onSubmit={handleSaleSubmit} className="space-y-4">
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
                      }}
                      onFocus={handleCustomerInputFocus}
                      onBlur={handleCustomerInputBlur}
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
                        }}
                        className="absolute right-2 top-1/3 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  {showCustomerDropdown && filteredCustomers.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {/* Area Statistics Summary (only when no search) */}
                      {customerSearchTerm.trim() === '' && (
                        <div className="px-4 py-3 bg-blue-50 border-b border-blue-200">
                          <div className="text-sm font-medium text-blue-800 mb-2">Area-wise Customer Distribution</div>
                          <div className="flex flex-wrap gap-2">
                            {getCustomersByArea(filteredCustomers).slice(0, 5).map(({ area, count }) => (
                              <span key={area} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                                {area}: {count}
                              </span>
                            ))}
                            {getCustomersByArea(filteredCustomers).length > 5 && (
                              <span className="text-xs text-blue-600 px-2 py-1">
                                +{getCustomersByArea(filteredCustomers).length - 5} more areas
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {getCustomersByArea(filteredCustomers).map(({ area, customersGrp, count }) => (
                        <div key={area} className="border-b border-gray-200 last:border-b-0">
                          {/* Area Header */}
                          <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 sticky top-0">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-gray-800 text-sm">
                                {area}
                              </span>
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                {count} customer{count !== 1 ? 's' : ''}
                              </span>
                            </div>
                          </div>

                          {/* Customers in this area */}
                          {customersGrp.map(customer => (
                            <div
                              key={customer._id || customer.id}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                handleCustomerSelect(customer);
                              }}
                              className="px-4 py-3 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                            >
                              <div className="font-medium text-gray-900">{customer.shopName}</div>
                              {customer.ownerName && (
                                <div className="text-sm text-gray-600">Owner: {customer.ownerName}</div>
                              )}
                              <div className="text-sm text-gray-500">{customer.contact}</div>
                              {customer.gstOrPanNumber && (
                                <div className="text-xs text-gray-400">GST/PAN: {customer.gstOrPanNumber}</div>
                              )}
                            </div>
                          ))}
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
                    <input
                      type="number"
                      value={saleData.birds}
                      onChange={(e) => handleSaleDataChange('birds', Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Weight (kg) *</label>
                    <input
                      type="number"
                      value={saleData.weight}
                      onChange={(e) => handleSaleDataChange('weight', Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      required
                      step="0.01"
                    />
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      required
                      step="0.01"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Amount (₹)</label>
                  <input
                    type="number"
                    value={saleData.amount.toFixed(2)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                    placeholder="Auto-calculated"
                    readOnly
                    step="0.01"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
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
                    value={saleData.balance.toFixed(2)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                    placeholder="Auto-calculated"
                    readOnly
                    step="0.01"
                  />
                </div>
              </form>

              {/* Help Text */}
              <div className="mt-4 text-xs text-gray-500">
                <p>• <strong>CLIENT:</strong> Select the customer from the dropdown</p>
                <p>• <strong>BILL NUMBER:</strong> Automatically generated with timestamp</p>
                <p>• <strong>BIRDS:</strong> Enter the total number of birds sold</p>
                <p>• <strong>WEIGHT:</strong> Enter the total weight of all birds in kg</p>
                <p>• <strong>AVG:</strong> Automatically calculated as Weight ÷ Birds</p>
                <p>• <strong>RATE:</strong> Enter the price per kg</p>
                <p>• <strong>TOTAL AMOUNT:</strong> Automatically calculated as Weight × Rate</p>
                <p>• <strong>PAYMENT MODE:</strong> Select cash, online, or credit</p>
                <p>• <strong>PAYMENT STATUS:</strong> Select paid, pending, or partial</p>
                <p>• <strong>CASH PAID:</strong> Enter amount paid in cash</p>
                <p>• <strong>ONLINE PAID:</strong> Enter amount paid online</p>
                <p>• <strong>DISCOUNT:</strong> Enter any discount amount</p>
                <p>• <strong>BALANCE:</strong> Automatically calculated as Total Amount - Received Amount - Discount</p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 pt-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
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
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : (editingSaleIndex !== null ? 'Update Sale' : 'Add Sale')}
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={expenseData.date}
                    onChange={(e) => setExpenseData(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={dieselData.date}
                    onChange={(e) => setDieselData(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              {editingStockIndex !== null ? 'Edit Stock Entry' : 'Add to Stock'}
            </h3>

            {/* Summary Section */}
            {stockData.birds > 0 && stockData.weight > 0 && stockData.rate > 0 && (
              <div className="bg-cyan-50 p-3 rounded-lg mb-4">
                <div className="text-sm text-cyan-800">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="font-medium">Birds:</span> {stockData.birds}
                    </div>
                    <div>
                      <span className="font-medium">Weight:</span> {stockData.weight} kg
                    </div>
                    <div>
                      <span className="font-medium">Avg Weight:</span> {stockData.avgWeight} kg/bird
                    </div>
                    <div>
                      <span className="font-medium">Rate:</span> ₹{stockData.rate}/kg
                    </div>
                    <div className="col-span-2">
                      <span className="font-medium">Stock Value:</span> ₹{stockData.value.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleStockSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Birds in Stock *</label>
                  <input
                    type="number"
                    value={stockData.birds}
                    onChange={(e) => setStockData(prev => ({ ...prev, birds: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    required
                    min="0"
                    step="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Weight (kg) *</label>
                  <input
                    type="number"
                    value={stockData.weight}
                    onChange={(e) => setStockData(prev => ({ ...prev, weight: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    required
                    min="0"
                    step="0.1"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rate per kg (₹) *</label>
                <input
                  type="number"
                  value={stockData.rate}
                  onChange={(e) => setStockData(prev => ({ ...prev, rate: Number(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                  min="0"
                  step="0.01"
                  placeholder="Enter purchase rate per kg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
                <textarea
                  value={stockData.notes}
                  onChange={(e) => setStockData(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  rows="2"
                  placeholder="Add any notes about this stock entry..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Avg Weight (Auto-calculated)</label>
                  <input
                    type="number"
                    value={stockData.avgWeight.toFixed(2)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                    readOnly
                    step="0.01"
                    placeholder="Weight ÷ Birds"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stock Value (Auto-calculated)</label>
                  <input
                    type="number"
                    value={stockData.value.toFixed(2)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                    readOnly
                    step="0.01"
                    placeholder="Weight × Rate"
                  />
                </div>
              </div>
              <div className="bg-yellow-50 p-3 rounded-lg">
                <div className="text-sm text-yellow-800">
                  <div className="font-medium mb-1">Note:</div>
                  <ul className="text-xs space-y-1">
                    <li>• Stock represents birds kept for future sales</li>
                    <li>• Stock value is calculated at purchase rate</li>
                    <li>• Stock is not included in current profit calculations</li>
                    <li>• Death birds are calculated automatically from remaining birds</li>
                  </ul>
                </div>
              </div>
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowStockModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || stockData.birds <= 0 || stockData.weight <= 0 || stockData.rate <= 0}
                  className="flex-1 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : (editingStockIndex !== null ? 'Update Stock' : 'Add to Stock')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default SupervisorTripDetails;
