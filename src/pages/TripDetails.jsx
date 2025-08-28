// src/pages/TripDetails.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  CheckCircle
} from 'lucide-react';
import api from '../lib/axios';
import { useAuth } from '../contexts/AuthContext';

export default function TripDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [trip, setTrip] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);

  useEffect(() => {
    if (id) {
      fetchTrip();
    }
  }, [id]);

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

  const addSale = async (saleData) => {
    try {
      const { data } = await api.post(`/trip/${id}/sale`, saleData);
      setTrip(data.data);
      setShowSaleModal(false);
      alert('Sale added successfully!');
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

  if (user?.role !== 'supervisor' || trip.supervisor?.id !== user?.id) {
    return (
      <div className="text-center py-8">
        <h2 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h2>
        <p className="text-gray-600">You can only manage your own trips.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Trip: {trip.tripId}</h1>
          <p className="text-gray-600 mt-1">Manage trip details and operations</p>
        </div>
        <div className="flex gap-2 mt-4 sm:mt-0">
          {trip.status !== 'completed' && (
            <>
              <button
                onClick={() => setShowPurchaseModal(true)}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <Plus size={20} />
                Add Purchase
              </button>
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
              <h3 className="font-semibold text-gray-900">{trip.place}</h3>
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

        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-500">Birds Purchased</div>
            <div className="text-lg font-bold text-blue-600">
              {trip.summary?.totalBirdsPurchased || 0}
            </div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-500">Birds Sold</div>
            <div className="text-lg font-bold text-green-600">
              {trip.summary?.totalBirdsSold || 0}
            </div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-500">Net Profit</div>
            <div className="text-lg font-bold text-purple-600">
              ₹{trip.summary?.netProfit?.toLocaleString() || '0'}
            </div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-500">Status</div>
            <div className={`text-lg font-bold ${
              trip.status === 'completed' ? 'text-green-600' :
              trip.status === 'ongoing' ? 'text-blue-600' :
              'text-yellow-600'
            }`}>
              {trip.status}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {['overview', 'purchases', 'sales', 'expenses', 'diesel'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab
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
              <h3 className="text-lg font-semibold text-gray-900">Trip Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Route Information</h4>
                  <p className="text-sm text-gray-600">From: {trip.route?.from || 'N/A'}</p>
                  <p className="text-sm text-gray-600">To: {trip.route?.to || 'N/A'}</p>
                  <p className="text-sm text-gray-600">Distance: {trip.route?.distance || 0} km</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Team Information</h4>
                  <p className="text-sm text-gray-600">Supervisor: {trip.supervisor?.name}</p>
                  <p className="text-sm text-gray-600">Driver: {trip.driver}</p>
                  <p className="text-sm text-gray-600">Labours: {trip.labours?.join(', ')}</p>
                </div>
              </div>
            </div>
          )}

          {/* Purchases Tab */}
          {activeTab === 'purchases' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Purchases</h3>
                {trip.status !== 'completed' && (
                  <button
                    onClick={() => setShowPurchaseModal(true)}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                  >
                    <Plus size={16} />
                    Add Purchase
                  </button>
                )}
              </div>
              {trip.purchases && trip.purchases.length > 0 ? (
                <div className="space-y-3">
                  {trip.purchases.map((purchase, index) => (
                    <div key={index} className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium text-gray-900">DC: {purchase.dcNumber}</h4>
                          <p className="text-sm text-gray-600">Vendor: {purchase.supplier?.vendorName}</p>
                          <p className="text-sm text-gray-600">
                            Birds: {purchase.birds} | Weight: {purchase.weight}kg | Rate: ₹{purchase.rate}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-green-600">₹{purchase.amount?.toLocaleString()}</p>
                          <p className="text-sm text-gray-500">{purchase.paymentMode}</p>
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
                <h3 className="text-lg font-semibold text-gray-900">Sales</h3>
                {trip.status !== 'completed' && (
                  <button
                    onClick={() => setShowSaleModal(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                  >
                    <Plus size={16} />
                    Add Sale
                  </button>
                )}
              </div>
              {trip.sales && trip.sales.length > 0 ? (
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
              ) : (
                <p className="text-gray-500 text-center py-8">No sales recorded yet.</p>
              )}
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
                          <h4 className="font-medium text-gray-900">{station.name}</h4>
                          <p className="text-sm text-gray-600">Receipt: {station.receipt}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-orange-600">₹{station.amount?.toLocaleString()}</p>
                          <p className="text-sm text-gray-500">{station.volume}L @ ₹{station.rate}</p>
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
        </div>
      </div>

      {/* Modals would go here - simplified for brevity */}
    </div>
  );
}
