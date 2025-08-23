// src/pages/Trips.jsx
import { useState } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Truck, 
  MapPin, 
  Calendar, 
  DollarSign,
  Eye,
  Edit,
  Trash2
} from 'lucide-react';

const mockTrips = [
  {
    id: 1,
    tripId: 'TRP-001',
    date: '2024-01-15',
    vehicle: 'MH-12-AB-1234',
    supervisor: 'John Doe',
    driver: 'Mike Smith',
    route: { from: 'Mumbai', to: 'Pune', distance: 150 },
    status: 'completed',
    summary: {
      totalPurchaseAmount: 150000,
      totalSalesAmount: 200000,
      totalExpenses: 15000,
      totalDieselAmount: 8000,
      netProfit: 27000,
      totalBirdsPurchased: 500,
      totalBirdsSold: 480
    }
  },
  {
    id: 2,
    tripId: 'TRP-002',
    date: '2024-01-14',
    vehicle: 'MH-12-CD-5678',
    supervisor: 'Jane Wilson',
    driver: 'Tom Brown',
    route: { from: 'Pune', to: 'Nagpur', distance: 300 },
    status: 'ongoing',
    summary: {
      totalPurchaseAmount: 120000,
      totalSalesAmount: 160000,
      totalExpenses: 12000,
      totalDieselAmount: 15000,
      netProfit: 13000,
      totalBirdsPurchased: 400,
      totalBirdsSold: 380
    }
  },
  {
    id: 3,
    tripId: 'TRP-003',
    date: '2024-01-13',
    vehicle: 'MH-12-EF-9012',
    supervisor: 'Bob Johnson',
    driver: 'Alice Davis',
    route: { from: 'Nagpur', to: 'Mumbai', distance: 450 },
    status: 'completed',
    summary: {
      totalPurchaseAmount: 180000,
      totalSalesAmount: 250000,
      totalExpenses: 20000,
      totalDieselAmount: 25000,
      netProfit: 25000,
      totalBirdsPurchased: 600,
      totalBirdsSold: 580
    }
  }
];

const getStatusColor = (status) => {
  const colors = {
    completed: 'bg-green-100 text-green-800',
    ongoing: 'bg-blue-100 text-blue-800',
    started: 'bg-yellow-100 text-yellow-800'
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
};

const getStatusText = (status) => {
  const texts = {
    completed: 'Completed',
    ongoing: 'In Progress',
    started: 'Started'
  };
  return texts[status] || status;
};

export default function Trips() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredTrips = mockTrips.filter(trip => {
    const matchesSearch = trip.tripId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         trip.vehicle.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         trip.supervisor.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || trip.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Trips Management</h1>
          <p className="text-gray-600 mt-1">Manage and track all poultry transportation trips</p>
        </div>
        <button className="mt-4 sm:mt-0 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2">
          <Plus size={20} />
          New Trip
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search trips by ID, vehicle, or supervisor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="started">Started</option>
              <option value="ongoing">Ongoing</option>
              <option value="completed">Completed</option>
            </select>
            <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2">
              <Filter size={16} />
              More Filters
            </button>
          </div>
        </div>
      </div>

      {/* Trips Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trip Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Route
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Team
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Financial Summary
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTrips.map((trip) => (
                <tr key={trip.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Truck className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{trip.tripId}</div>
                        <div className="text-sm text-gray-500">{trip.vehicle}</div>
                        <div className="text-sm text-gray-400">
                          {new Date(trip.date).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <div className="text-sm">
                        <div className="text-gray-900">{trip.route.from} → {trip.route.to}</div>
                        <div className="text-gray-500">{trip.route.distance} km</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm">
                      <div className="text-gray-900">Sup: {trip.supervisor}</div>
                      <div className="text-gray-500">Driver: {trip.driver}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm">
                      <div className="text-gray-900 font-medium">
                        ₹{trip.summary.netProfit.toLocaleString()}
                      </div>
                      <div className="text-gray-500">
                        {trip.summary.totalBirdsSold} birds sold
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(trip.status)}`}>
                      {getStatusText(trip.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button className="p-1 text-gray-400 hover:text-blue-600 transition-colors">
                        <Eye size={16} />
                      </button>
                      <button className="p-1 text-gray-400 hover:text-green-600 transition-colors">
                        <Edit size={16} />
                      </button>
                      <button className="p-1 text-gray-400 hover:text-red-600 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-500">Total Trips</div>
          <div className="text-2xl font-bold text-gray-900">{filteredTrips.length}</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-500">Total Revenue</div>
          <div className="text-2xl font-bold text-green-600">
            ₹{filteredTrips.reduce((sum, trip) => sum + trip.summary.totalSalesAmount, 0).toLocaleString()}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-500">Total Profit</div>
          <div className="text-2xl font-bold text-blue-600">
            ₹{filteredTrips.reduce((sum, trip) => sum + trip.summary.netProfit, 0).toLocaleString()}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-500">Birds Sold</div>
          <div className="text-2xl font-bold text-purple-600">
            {filteredTrips.reduce((sum, trip) => sum + trip.summary.totalBirdsSold, 0).toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
}