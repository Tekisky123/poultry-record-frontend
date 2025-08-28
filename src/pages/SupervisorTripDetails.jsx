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
  CheckCircle
} from 'lucide-react';
import api from '../lib/axios';
import { useAuth } from '../contexts/AuthContext';

const SupervisorTripDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [trip, setTrip] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form states
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showDieselModal, setShowDieselModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  
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
    billNumber: '',
    birds: 0,
    weight: 0,
    avgWeight: 0,
    rate: 0,
    amount: 0,
    cashPaid: 0,
    onlinePaid: 0,
    balance: 0
  });
  
  const [expenseData, setExpenseData] = useState({
    category: 'fuel',
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
  
  const [completeData, setCompleteData] = useState({
    closingOdometer: 0,
    finalRemarks: '',
    birdsRemaining: 0,
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
      const balance = saleData.amount - saleData.cashPaid - saleData.onlinePaid;
      if (balance !== saleData.balance) {
        setSaleData(prev => ({ ...prev, balance }));
      }
    }
  }, [saleData.birds, saleData.weight, saleData.rate, saleData.amount, saleData.cashPaid, saleData.onlinePaid]);

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
        setCustomers(customersRes.data.data || []);
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
    
    // Auto-calculate balance when amount, cashPaid, or onlinePaid changes
    if (field === 'amount' || field === 'cashPaid' || field === 'onlinePaid') {
      newData.balance = newData.amount - newData.cashPaid - newData.onlinePaid;
    }
    
    setSaleData(newData);
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
      const { data } = await api.post(`/trip/${id}/purchase`, purchaseData);
      if (data.success) {
        setTrip(data.data);
        setShowPurchaseModal(false);
        setPurchaseData({ supplier: '', dcNumber: '', birds: 0, weight: 0, avgWeight: 0, rate: 0, amount: 0 });
        alert('Purchase added successfully!');
      }
    } catch (error) {
      console.error('Error adding purchase:', error);
      alert(error.response?.data?.message || 'Failed to add purchase');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const { data } = await api.post(`/trip/${id}/sale`, saleData);
      if (data.success) {
        setTrip(data.data);
        setShowSaleModal(false);
        setSaleData({ client: '', billNumber: '', birds: 0, weight: 0, avgWeight: 0, rate: 0, amount: 0, cashPaid: 0, onlinePaid: 0, balance: 0 });
        alert('Sale added successfully!');
      }
    } catch (error) {
      console.error('Error adding sale:', error);
      alert(error.response?.data?.message || 'Failed to add sale');
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
        setExpenseData({ category: 'fuel', description: '', amount: 0, date: new Date().toISOString().split('T')[0] });
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
      const { data } = await api.put(`/trip/${id}/diesel`, { 
        stations: [...(trip.diesel?.stations || []), dieselData] 
      });
      if (data.success) {
        setTrip(data.data);
        setShowDieselModal(false);
        setDieselData({ stationName: '', volume: 0, rate: 0, amount: 0, date: new Date().toISOString().split('T')[0] });
        alert('Diesel record added successfully!');
      }
    } catch (error) {
      console.error('Error adding diesel record:', error);
      alert(error.response?.data?.message || 'Failed to add diesel record');
    } finally {
      setIsSubmitting(false);
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
            <h1 className="text-2xl font-bold text-gray-900">Trip: {trip.tripId}</h1>
            <p className="text-gray-600">Manage trip details and operations</p>
          </div>
        </div>
        
        <div className="flex space-x-2">
                     <button
                         onClick={() => {
              setPurchaseData({ supplier: '', dcNumber: '', birds: 0, weight: 0, avgWeight: 0, rate: 0, amount: 0 });
              setShowPurchaseModal(true);
            }}
             className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
           >
            <Plus size={16} />
            Add Purchase
          </button>
          <button
            onClick={() => {
              setSaleData({ client: '', billNumber: '', birds: 0, weight: 0, avgWeight: 0, rate: 0, amount: 0, cashPaid: 0, onlinePaid: 0, balance: 0 });
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
            onClick={() => setShowDieselModal(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
          >
            <Fuel size={16} />
            Add Diesel
          </button>
          {trip.status !== 'completed' && (
            <button
              onClick={() => setShowCompleteModal(true)}
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
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              trip.status === 'completed' ? 'bg-green-100 text-green-800' :
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
              ₹{trip.summary?.netProfit?.toLocaleString() || '0'}
            </div>
            <div className="text-sm text-gray-500">Net Profit</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {['overview', 'purchases', 'sales', 'expenses', 'diesel', 'financials'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-1 border-b-2 font-medium text-sm capitalize ${
                  activeTab === tab
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
                    <span className="font-medium">₹{trip.summary?.totalSalesAmount?.toLocaleString() || '0'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Total Purchases:</span>
                    <span className="font-medium">₹{trip.summary?.totalPurchaseAmount?.toLocaleString() || '0'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Total Expenses:</span>
                    <span className="font-medium">₹{trip.summary?.totalExpenses?.toLocaleString() || '0'}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-sm font-medium text-gray-900">Net Profit:</span>
                    <span className="font-bold text-green-600">₹{trip.summary?.netProfit?.toLocaleString() || '0'}</span>
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
                      <span className="text-gray-600">Remaining:</span>
                      <span className="font-medium">{trip.summary?.birdsRemaining || 0} birds</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Mortality:</span>
                      <span className="font-medium">{trip.summary?.mortality || 0} birds</span>
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
                  {trip.purchases.map((purchase, index) => (
                    <div key={index} className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium">
                            {purchase.supplier?.vendorName || purchase.supplier || 'Unknown Vendor'}
                          </div>
                                                     <div className="text-sm text-gray-600">
                             DC: {purchase.dcNumber}, {purchase.birds} birds, {purchase.weight} kg
                             {purchase.avgWeight && ` (Avg: ${purchase.avgWeight} kg/bird)`}
                           </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">₹{purchase.amount?.toLocaleString()}</div>
                                                     <div className="text-sm text-gray-500">₹{purchase.rate}/kg</div>
                        </div>
                      </div>
                    </div>
                  ))}
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
                <div className="space-y-3">
                  {trip.sales.map((sale, index) => (
                    <div key={index} className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium">
                            {sale.client?.shopName || sale.client || 'Unknown Customer'}
                          </div>
                                                     <div className="text-sm text-gray-600">
                             Bill: {sale.billNumber}, {sale.birds} birds, {sale.weight} kg
                             {sale.avgWeight && ` (Avg: ${sale.avgWeight} kg/bird)`}
                           </div>
                           <div className="text-xs text-gray-500 mt-1">
                             Cash: ₹{sale.cashPaid?.toLocaleString() || '0'} | 
                             Online: ₹{sale.onlinePaid?.toLocaleString() || '0'} | 
                             Balance: ₹{sale.balance?.toLocaleString() || '0'}
                           </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">₹{sale.amount?.toLocaleString()}</div>
                                                     <div className="text-sm text-gray-500">₹{sale.rate}/kg</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No sales recorded yet</p>
              )}
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
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              expense.category === 'fuel' ? 'bg-blue-100 text-blue-800' :
                              expense.category === 'lunch' ? 'bg-green-100 text-green-800' :
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
                    {['fuel', 'lunch', 'tea', 'toll', 'parking', 'maintenance', 'other'].map(category => {
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
                        <div className="text-right">
                          <div className="font-medium">₹{station.amount?.toLocaleString()}</div>
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
                    onClick={() => setShowDieselModal(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Add Diesel Record
                  </button>
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
                    ₹{trip.summary?.totalSalesAmount?.toLocaleString() || '0'}
                  </div>
                </div>
                
                <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                  <div className="text-sm text-red-600">Total Costs</div>
                  <div className="text-2xl font-bold text-red-700">
                    ₹{((trip.summary?.totalPurchaseAmount || 0) + (trip.summary?.totalExpenses || 0)).toLocaleString()}
                  </div>
                </div>
                
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="text-sm text-blue-600">Net Profit</div>
                  <div className="text-2xl font-bold text-blue-700">
                    ₹{trip.summary?.netProfit?.toLocaleString() || '0'}
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
            </div>
          )}
        </div>
      </div>

      {/* Purchase Modal */}
      {showPurchaseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Add Purchase</h3>
            
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
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Add Purchase'}
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
         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
           <div className="bg-white rounded-lg p-6 w-full max-w-md">
             <h3 className="text-lg font-semibold mb-4">Add Sale</h3>
             
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
                       <span className="font-medium">Total Amount:</span> ₹{saleData.amount?.toLocaleString() || '0'}
                     </div>
                     <div>
                       <span className="font-medium">Cash Paid:</span> ₹{saleData.cashPaid?.toLocaleString() || '0'}
                     </div>
                     <div>
                       <span className="font-medium">Online Paid:</span> ₹{saleData.onlinePaid?.toLocaleString() || '0'}
                     </div>
                     <div>
                       <span className="font-medium">Balance:</span> ₹{saleData.balance?.toLocaleString() || '0'}
                     </div>
                   </div>
                 </div>
               </div>
             )}
             
             <form onSubmit={handleSaleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Client *</label>
                <select
                  value={saleData.client}
                  onChange={(e) => setSaleData(prev => ({ ...prev, client: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                >
                  <option value="">Select Customer</option>
                  {customers.map(customer => (
                    <option key={customer._id || customer.id} value={customer._id || customer.id}>
                      {customer.shopName} - {customer.ownerName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bill Number *</label>
                <input
                  type="text"
                  value={saleData.billNumber}
                  onChange={(e) => setSaleData(prev => ({ ...prev, billNumber: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Bill/Invoice Number"
                  required
                />
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
                   value={saleData.amount}
                   className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                   placeholder="Auto-calculated"
                   readOnly
                   step="0.01"
                 />
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
                 <label className="block text-sm font-medium text-gray-700 mb-1">Balance (₹)</label>
                 <input
                   type="number"
                   value={saleData.balance}
                   className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                   placeholder="Auto-calculated"
                   readOnly
                   step="0.01"
                 />
               </div>
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowSaleModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Add Sale'}
                </button>
                             </div>
             </form>
             
             {/* Help Text */}
             <div className="mt-4 text-xs text-gray-500">
               <p>• <strong>CLIENT:</strong> Select the customer from the dropdown</p>
               <p>• <strong>BILL NUMBER:</strong> Enter the bill/invoice number</p>
               <p>• <strong>BIRDS:</strong> Enter the total number of birds sold</p>
               <p>• <strong>WEIGHT:</strong> Enter the total weight of all birds in kg</p>
               <p>• <strong>AVG:</strong> Automatically calculated as Weight ÷ Birds</p>
               <p>• <strong>RATE:</strong> Enter the price per kg</p>
               <p>• <strong>TOTAL AMOUNT:</strong> Automatically calculated as Weight × Rate</p>
               <p>• <strong>CASH PAID:</strong> Enter amount paid in cash</p>
               <p>• <strong>ONLINE PAID:</strong> Enter amount paid online</p>
               <p>• <strong>BALANCE:</strong> Automatically calculated as Total Amount - Cash Paid - Online Paid</p>
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
                  <option value="fuel">Fuel</option>
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
                  placeholder="e.g., Diesel at HP pump, Lunch at dhaba"
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Closing Odometer</label>
                <input
                  type="number"
                  value={completeData.closingOdometer}
                  onChange={(e) => setCompleteData(prev => ({ ...prev, closingOdometer: Number(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                />
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Birds Remaining</label>
                  <input
                    type="number"
                    value={completeData.birdsRemaining}
                    onChange={(e) => setCompleteData(prev => ({ ...prev, birdsRemaining: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mortality</label>
                  <input
                    type="number"
                    value={completeData.mortality}
                    onChange={(e) => setCompleteData(prev => ({ ...prev, mortality: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                </div>
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
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
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
            <h3 className="text-lg font-semibold mb-4">Add Diesel Record</h3>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Amount *</label>
                  <input
                    type="number"
                    value={dieselData.amount}
                    onChange={(e) => setDieselData(prev => ({ ...prev, amount: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    required
                    min="0"
                    step="0.01"
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
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Add Diesel Record'}
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
