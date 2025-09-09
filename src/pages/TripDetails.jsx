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
  CheckCircle,
  FileSpreadsheet
} from 'lucide-react';
import api from '../lib/axios';
import { useAuth } from '../contexts/AuthContext';
import * as XLSX from 'xlsx';

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

  const downloadExcel = () => {
    if (!trip) return;

    // Create workbook
    const wb = XLSX.utils.book_new();

    // Comprehensive Trip Report Sheet
    const reportData = [
      // PARTICULARS Section
      ['PARTICULARS'],
      [''],
      ['DATE', 'VEHICLE NO', 'PLACE', 'SUPERVISOR', 'DRIVER', 'LABOUR'],
      [
        new Date(trip.date || trip.createdAt).toLocaleDateString(),
        trip.vehicle?.vehicleNumber || 'N/A',
        trip.place || 'N/A',
        trip.supervisor?.name || 'N/A',
        trip.driver || 'N/A',
        trip.labour || trip.labours?.join(', ') || 'N/A'
      ],
      [''],
      
      // PURCHASE DETAILS Section
      ['PURCHASE DETAILS'],
      ['S N', 'SUPPLIERS', 'DC NO', 'BIRDS', 'WEIGHT', 'AVG', 'RATE', 'AMOUNT', 'PART', 'AMOUNT'],
      ...(trip.purchases || []).map((purchase, index) => [
        index + 1,
        purchase.supplier?.vendorName || purchase.supplier?.vendorName || 'N/A',
        purchase.dcNumber || 'N/A',
        purchase.birds || purchase.birds || 0,
        purchase.weight || 0,
        purchase.weight && (purchase.birds || purchase.birds) ? 
          (purchase.weight / (purchase.birds || purchase.birds)).toFixed(2) : '0.00',
        purchase.rate || 0,
        purchase.amount || purchase.amount || 0,
        'PURCHASE',
        purchase.amount || purchase.amount || 0
      ]),
      [
        'TOTAL',
        '',
        '',
        trip.summary?.totalBirdsPurchased || 0,
        trip.summary?.totalWeightPurchased || 0,
        trip.summary?.totalBirdsPurchased && trip.summary?.totalWeightPurchased ? 
          (trip.summary.totalWeightPurchased / trip.summary.totalBirdsPurchased).toFixed(2) : '0.00',
        '',
        trip.summary?.totalPurchaseAmount || 0,
        'TOTAL',
        trip.summary?.totalPurchaseAmount || 0
      ],
      [''],
      
      // VEHICLE EXPENSES Section
      ['VEHICLE EXPENSES'],
      ['DIESEL CONSUMPTION'],
      ['DIESEL', 'VOL', 'RATE', 'AMT'],
      ['MANE', trip.dieselVolume || 0, trip.dieselRate || 0, trip.dieselAmount || 0],
      ['TOTAL', trip.dieselVolume || 0, trip.dieselRate || 0, trip.dieselAmount || 0],
      [''],
      ['TRIP METRICS'],
      ['OP READING', trip.openingReading || 0],
      ['CL READING', trip.closingReading || 0],
      ['TOTAL RUNNING KM', trip.totalKm || 0],
      ['TOTAL DIESEL VOL', trip.dieselVolume || 0],
      ['VEHICLE AVERAGE', trip.totalKm && trip.dieselVolume ? 
        (trip.totalKm / trip.dieselVolume).toFixed(2) : '0.00'],
      [''],
      
      // SALES DETAILS Section
      ['SALES DETAILS'],
      ['S N', 'DELIVERY DETAILS', 'BILL NO', 'BIRDS', 'WEIGHT', 'AVG', 'RATE', 'TOTAL', 'CASH', 'ONLINE', 'DISC'],
      ...(trip.sales || []).map((sale, index) => [
        index + 1,
        sale.customer?.name || sale.client?.shopName || 'N/A',
        sale.billNumber || 'N/A',
        sale.birdsCount || sale.birds || 0,
        sale.weight || 0,
        sale.weight && (sale.birdsCount || sale.birds) ? 
          (sale.weight / (sale.birdsCount || sale.birds)).toFixed(2) : '0.00',
        sale.ratePerKg || sale.rate || 0,
        sale.totalAmount || sale.amount || 0,
        sale.cashPayment || (sale.paymentMode === 'cash' ? sale.amount : 0),
        sale.onlinePayment || (sale.paymentMode === 'online' ? sale.amount : 0),
        sale.discount || 0
      ]),
      [
        'TOTAL SALE',
        '',
        '',
        trip.summary?.totalBirdsSold || 0,
        trip.summary?.totalWeightSold || 0,
        trip.summary?.totalBirdsSold && trip.summary?.totalWeightSold ? 
          (trip.summary.totalWeightSold / trip.summary.totalBirdsSold).toFixed(2) : '0.00',
        trip.summary?.averageRate || 0,
        trip.summary?.totalSalesAmount || 0,
        trip.summary?.totalCashPayment || 0,
        trip.summary?.totalOnlinePayment || 0,
        trip.summary?.totalDiscount || 0
      ],
      [''],
      
      // PROFIT & LOSS SUMMARY Section
      ['PROFIT & LOSS SUMMARY'],
      ['FINANCIAL BREAKDOWN'],
      ['RENT AMT PER KM', trip.rentPerKm || 22],
      ['GROSS RENT', trip.totalKm ? (trip.totalKm * (trip.rentPerKm || 22)) : 0],
      ['LESS DIESEL AMT', trip.dieselAmount || 0],
      ['NETT RENT', trip.totalKm ? ((trip.totalKm * (trip.rentPerKm || 22)) - (trip.dieselAmount || 0)) : 0],
      ['BIRDS PROFIT', trip.summary?.birdsProfit || 0],
      ['TOTAL PROFIT', trip.summary?.netProfit || 0],
      ['PROFIT PER KG', trip.summary?.totalWeightSold ? 
        (trip.summary.netProfit / trip.summary.totalWeightSold).toFixed(2) : '0.00'],
      [''],
      ['WEIGHT LOSS TRACKING'],
      ['', 'BIRDS', 'WEIGHT', 'AVG', 'RATE', 'AMOUNT'],
      ['DEATH BIRDS', trip.deathBirds || 0, trip.deathWeight || 0, trip.deathAvg || 0, trip.deathRate || 0, trip.deathAmount || 0],
      ['WEIGHT LOSS', '', trip.weightLoss || 0, trip.weightLossAvg || 0, trip.weightLossRate || 0, trip.weightLossAmount || 0],
      ['TOTAL W LOSS', trip.deathBirds || 0, ((trip.deathWeight || 0) + (trip.weightLoss || 0)).toFixed(2), '', trip.deathRate || 0, ((trip.deathAmount || 0) + (trip.weightLossAmount || 0))]
    ];

    const ws = XLSX.utils.aoa_to_sheet(reportData);
    XLSX.utils.book_append_sheet(wb, ws, 'Comprehensive Trip Report');

    // Download file
    const fileName = `Trip_${trip.tripId}_Comprehensive_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Trip: {trip.tripId}</h1>
          <p className="text-gray-600 mt-1">Manage trip details and operations</p>
        </div>
        <div className="flex gap-2 mt-4 sm:mt-0">
          {/* Excel Download Button - Available for all users */}
          <button
            onClick={downloadExcel}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <FileSpreadsheet size={20} />
            Download Excel
          </button>
          
          {/* Supervisor-only buttons */}
          {isSupervisor && trip.status !== 'completed' && (
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
        </div> */}

        {/* Comprehensive Trip Details for Admins */}
        {isAdmin && (
          <div className="bg-white rounded-lg shadow-sm border mb-6">
            {/* PARTICULARS Section */}
            <div className="bg-green-600 text-white px-6 py-3">
              <h3 className="text-lg font-bold">PARTICULARS</h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">PLACE</label>
                  <div className="text-lg font-semibold text-gray-900">
                    {trip.place || 'N/A'}
                  </div>
                </div>
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
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-r">PART</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">AMOUNT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trip.purchases?.map((purchase, index) => (
                      <tr key={purchase.id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900 border-r">{index + 1}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 border-r">{purchase.supplier?.vendorName || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 border-r">{purchase.dcNumber || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 border-r">{purchase.birds || 0}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 border-r">{purchase.weight || 0}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 border-r">
                          {purchase.weight && purchase.birds ? (purchase.weight / purchase.birds).toFixed(2) : '0.00'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 border-r">₹{purchase.rate || 0}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900 border-r">₹{purchase.amount || 0}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 border-r">PURCHASE</td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900">₹{purchase.amount || 0}</td>
                      </tr>
                    ))}
                    {/* Total Row */}
                    <tr className="bg-black text-white font-bold">
                      <td className="px-4 py-3 border-r">TOTAL</td>
                      <td className="px-4 py-3 border-r"></td>
                      <td className="px-4 py-3 border-r"></td>
                      <td className="px-4 py-3 border-r">{trip.summary?.totalBirdsPurchased || 0}</td>
                      <td className="px-4 py-3 border-r">{trip.summary?.totalWeightPurchased || 0}</td>
                      <td className="px-4 py-3 border-r">
                        {trip.summary?.totalBirdsPurchased && trip.summary?.totalWeightPurchased 
                          ? (trip.summary.totalWeightPurchased / trip.summary.totalBirdsPurchased).toFixed(2) 
                          : '0.00'}
                      </td>
                      <td className="px-4 py-3 border-r"></td>
                      <td className="px-4 py-3 border-r">₹{trip.summary?.totalPurchaseAmount || 0}</td>
                      <td className="px-4 py-3 border-r">TOTAL</td>
                      <td className="px-4 py-3">₹{trip.summary?.totalPurchaseAmount || 0}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Vehicle Expenses Section */}
            <div className="border-t">
              <div className="bg-gray-100 px-6 py-3 border-b">
                <h3 className="text-lg font-semibold text-gray-900">VEHICLE EXPENSES</h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">DIESEL CONSUMPTION</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-200">
                          <tr>
                            <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-r">DIESEL</th>
                            <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-r">VOL</th>
                            <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-r">RATE</th>
                            <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700">AMT</th>
                          </tr>
                        </thead>
                        <tbody>
                          {
                            trip.diesel?.stations && trip.diesel.stations.map((station, index) => (
                              <tr key={index} className="border-b">
                                <td className="px-3 py-2 text-sm text-gray-900 border-r">{station.name}</td>
                                <td className="px-3 py-2 text-sm text-gray-900 border-r">{station.volume}</td>
                                <td className="px-3 py-2 text-sm text-gray-900 border-r">₹{station.amount}</td>
                                <td className="px-3 py-2 text-sm font-semibold text-gray-900">₹{station.amount}</td>
                              </tr>
                            ))
                          }

                          <tr className="bg-gray-100 font-bold">
                            <td className="px-3 py-2 border-r">TOTAL</td>
                            <td className="px-3 py-2 border-r">{trip.diesel?.totalVolume || 0}</td>
                            <td className="px-3 py-2 border-r">₹{trip.diesel?.totalAmount || 0}</td>
                            <td className="px-3 py-2">₹{trip.diesel?.totalAmount || 0}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">TRIP METRICS</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">OP READING:</span>
                        <span className="font-semibold">{trip.vehicleReadings?.opening || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">CL READING:</span>
                        <span className="font-semibold">{trip.vehicleReadings?.closing || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">TOTAL RUNNING KM:</span>
                        <span className="font-semibold">{trip.vehicleReadings?.totalDistance || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">TOTAL DIESEL VOL:</span>
                        <span className="font-semibold">{trip.diesel?.totalVolume || 0}</span>
                      </div>
                      <div className="flex justify-between bg-gray-800 text-white px-3 py-2 rounded">
                        <span className="text-sm font-bold">VEHICLE AVERAGE:</span>
                        <span className="font-bold">
                          {trip.vehicleReadings?.totalDistance && trip.diesel?.totalVolume ? (trip.vehicleReadings?.totalDistance / trip.diesel?.totalVolume).toFixed(2) : '0.00'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
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
                      {/* <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-r">CASH</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-r">ONLINE</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">DISC</th> */}
                    </tr>
                  </thead>
                  <tbody>
                    {trip.sales?.map((sale, index) => (
                      <tr key={sale.id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900 border-r">{index + 1}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 border-r">{sale.customer?.name || sale.client?.shopName || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 border-r">{sale.billNumber || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 border-r">{sale.birdsCount || sale.birds || 0}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 border-r">{sale.weight || 0}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 border-r">
                          {sale.weight && (sale.birdsCount || sale.birds) ? (sale.weight / (sale.birdsCount || sale.birds)).toFixed(2) : '0.00'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 border-r">₹{sale.ratePerKg || sale.rate || 0}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900 border-r">₹{(sale.totalAmount || sale.amount || 0).toFixed(2)}</td>
                        {/* <td className="px-4 py-3 text-sm font-semibold text-gray-900 border-r">₹{sale.cashPayment || 0}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900 border-r">₹{sale.onlinePayment || 0}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900">₹{sale.discount || 0}</td> */}
                      </tr>
                    ))}
                    {/* Total Sales Row */}
                    <tr className="bg-black text-white font-bold">
                      <td className="px-4 py-3 border-r">TOTAL SALE</td>
                      <td className="px-4 py-3 border-r"></td>
                      <td className="px-4 py-3 border-r"></td>
                      <td className="px-4 py-3 border-r">{trip.summary?.totalBirdsSold || 0}</td>
                      <td className="px-4 py-3 border-r">{(trip.summary?.totalWeightSold || 0).toFixed(2)}</td>
                      <td className="px-4 py-3 border-r">
                        {trip.summary?.totalBirdsSold && trip.summary?.totalWeightSold 
                          ? (trip.summary.totalWeightSold / trip.summary.totalBirdsSold).toFixed(2) 
                          : '0.00'}
                      </td>
                      <td className="px-4 py-3 border-r">₹{trip.summary?.averageRate || 0}</td>
                      <td className="px-4 py-3 border-r">₹{(trip.summary?.totalSalesAmount || 0).toFixed(2)}</td>
                      {/* <td className="px-4 py-3 border-r">₹{trip.summary?.totalCashPayment || 0}</td>
                      <td className="px-4 py-3 border-r">₹{trip.summary?.totalOnlinePayment || 0}</td>
                      <td className="px-4 py-3">₹{trip.summary?.totalDiscount || 0}</td> */}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Profit & Loss Summary */}
            <div className="border-t">
              <div className="bg-gray-100 px-6 py-3 border-b">
                <h3 className="text-lg font-semibold text-gray-900">PROFIT & LOSS SUMMARY</h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">FINANCIAL BREAKDOWN</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">RENT AMT PER KM:</span>
                        <span className="font-semibold">₹{trip.rentPerKm || 22}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">GROSS RENT:</span>
                        <span className="font-semibold">₹{trip.totalKm ? (trip.totalKm * (trip.rentPerKm || 22)) : 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">LESS DIESEL AMT:</span>
                        <span className="font-semibold">₹{trip.dieselAmount || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">NETT RENT:</span>
                        <span className="font-semibold">₹{trip.totalKm ? ((trip.totalKm * (trip.rentPerKm || 22)) - (trip.dieselAmount || 0)) : 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">BIRDS PROFIT:</span>
                        <span className="font-semibold">₹{trip.summary?.birdsProfit || 0}</span>
                      </div>
                      <div className="flex justify-between bg-gray-800 text-white px-3 py-2 rounded">
                        <span className="text-sm font-bold">TOTAL PROFIT:</span>
                        <span className="font-bold">₹{(trip.summary?.netProfit || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between bg-gray-200 px-3 py-2 rounded">
                        <span className="text-sm font-bold">PROFIT PER KG:</span>
                        <span className="font-bold">₹{(trip.summary?.totalWeightSold) ? (trip.summary.netProfit / trip.summary.totalWeightSold).toFixed(2) : '0.00'}</span>
                      </div>
                    </div>
                  </div>
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
                            <td className="px-3 py-2 text-sm text-gray-900 border-r">{trip.deathBirds || 0}</td>
                            <td className="px-3 py-2 text-sm text-gray-900 border-r">{trip.deathWeight || 0}</td>
                            <td className="px-3 py-2 text-sm text-gray-900 border-r">{trip.deathAvg || 0}</td>
                            <td className="px-3 py-2 text-sm text-gray-900 border-r">₹{trip.deathRate || 0}</td>
                            <td className="px-3 py-2 text-sm font-semibold text-gray-900">₹{trip.deathAmount || 0}</td>
                          </tr>
                          <tr className="border-b">
                            <td className="px-3 py-2 text-sm text-gray-900 border-r">WEIGHT LOSS</td>
                            <td className="px-3 py-2 text-sm text-gray-900 border-r"></td>
                            <td className="px-3 py-2 text-sm text-gray-900 border-r">{trip.weightLoss || 0}</td>
                            <td className="px-3 py-2 text-sm text-gray-900 border-r">{trip.weightLossAvg || 0}</td>
                            <td className="px-3 py-2 text-sm text-gray-900 border-r">₹{trip.weightLossRate || 0}</td>
                            <td className="px-3 py-2 text-sm font-semibold text-gray-900">₹{trip.weightLossAmount || 0}</td>
                          </tr>
                          <tr className="bg-black text-white font-bold">
                            <td className="px-3 py-2 border-r">TOTAL W LOSS</td>
                            <td className="px-3 py-2 border-r">{trip.deathBirds || 0}</td>
                            <td className="px-3 py-2 border-r">{((trip.deathWeight || 0) + (trip.weightLoss || 0)).toFixed(2)}</td>
                            <td className="px-3 py-2 border-r"></td>
                            <td className="px-3 py-2 border-r">₹{trip.deathRate || 0}</td>
                            <td className="px-3 py-2">₹{((trip.deathAmount || 0) + (trip.weightLossAmount || 0))}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
            <div className="text-sm text-gray-500">Total Weight</div>
            <div className="text-lg font-bold text-indigo-600">
              {(trip.summary?.totalWeightSold || 0).toFixed(2)} kg
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
            {['overview', 'purchases', 'sales', 'expenses', 'diesel', 'losses'].map((tab) => (
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

              {/* Weight Loss Tracking */}
              <div className="mt-6 p-4 bg-red-50 rounded-lg border border-red-200">
                <h4 className="font-medium text-red-900 mb-3">Weight Loss Analysis</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Purchased Weight:</span>
                      <span className="font-medium">{(trip.summary?.totalWeightPurchased || 0).toFixed(2)} kg</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Sold Weight:</span>
                      <span className="font-medium">{(trip.summary?.totalWeightSold || 0).toFixed(2)} kg</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Lost Weight (Death Birds):</span>
                      <span className="font-medium text-red-600">{(trip.summary?.totalWeightLost || 0).toFixed(2)} kg</span>
                    </div>
                  </div>
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
                      <span className="text-gray-600">Total Birds Lost:</span>
                      <span className="font-medium text-red-600">{trip.summary?.totalBirdsLost || 0}</span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-red-200">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700 font-medium">Total Weight Loss:</span>
                    <span className={`text-lg font-bold ${(trip.summary?.birdWeightLoss || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {(trip.summary?.birdWeightLoss || 0).toFixed(2)} kg
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Formula: Purchased Weight - Sold Weight - Lost Weight
                  </div>
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
                <h3 className="text-lg font-semibold text-gray-900">
                  {isAdmin ? 'Delivery Details' : 'Sales'}
                </h3>
                {isSupervisor && trip.status !== 'completed' && (
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
                        </tr>
                      </thead>
                      <tbody>
                        {trip.sales.map((sale, index) => (
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
                              {sale.paymentMode === 'cash' ? `₹${sale.amount?.toLocaleString() || '0'}` : '₹0'}
                            </td>
                            <td className="border border-gray-300 px-4 py-2 text-sm text-center text-gray-900">
                              {sale.paymentMode === 'online' ? `₹${sale.amount?.toLocaleString() || '0'}` : '₹0'}
                            </td>
                            <td className="border border-gray-300 px-4 py-2 text-sm text-center text-gray-900">₹0</td>
                          </tr>
                        ))}
                        <tr className="bg-gray-100 font-semibold">
                          <td className="border border-gray-300 px-4 py-2 text-sm text-gray-900" colSpan="3">TOTAL</td>
                          <td className="border border-gray-300 px-4 py-2 text-sm text-center text-gray-900">{trip.summary?.totalBirdsSold || 0}</td>
                          <td className="border border-gray-300 px-4 py-2 text-sm text-center text-gray-900">{trip.summary?.totalWeightSold || 0}</td>
                          <td className="border border-gray-300 px-4 py-2 text-sm text-center text-gray-900">
                            {trip.summary?.totalWeightSold && trip.summary?.totalBirdsSold ? 
                              (trip.summary.totalWeightSold / trip.summary.totalBirdsSold).toFixed(2) : '0.00'}
                          </td>
                          <td className="border border-gray-300 px-4 py-2 text-sm text-center text-gray-900">₹{trip.summary?.averageRate || 0}</td>
                          <td className="border border-gray-300 px-4 py-2 text-sm text-center text-gray-900">₹{trip.summary?.totalSalesAmount?.toLocaleString() || '0'}</td>
                          <td className="border border-gray-300 px-4 py-2 text-sm text-center text-gray-900">₹{trip.summary?.totalCashSales?.toLocaleString() || '0'}</td>
                          <td className="border border-gray-300 px-4 py-2 text-sm text-center text-gray-900">₹{trip.summary?.totalOnlineSales?.toLocaleString() || '0'}</td>
                          <td className="border border-gray-300 px-4 py-2 text-sm text-center text-gray-900">₹0</td>
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
        </div>
      </div>

      {/* Modals would go here - simplified for brevity */}
    </div>
  );
}
