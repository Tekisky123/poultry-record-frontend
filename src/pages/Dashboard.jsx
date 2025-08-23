// src/pages/Dashboard.jsx
import StatCard from '../components/StatCard';
import RecentTrips from '../components/RecentTrips';
import ProfitLossChart from '../components/ProfitLossChart';
import { Truck, DollarSign, Users, Package, TrendingUp, Calendar, Car } from 'lucide-react';

export default function Dashboard() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome back! Here's what's happening with your poultry business.</p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
            + New Trip
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard 
          title="Total Trips" 
          value="24" 
          change="+12%" 
          icon={Truck}
          color="blue"
        />
        <StatCard 
          title="Total Profit" 
          value="₹6.99L" 
          change="+8.5%" 
          icon={DollarSign}
          color="green"
        />
        <StatCard 
          title="Pending Payments" 
          value="₹1.2L" 
          change="-3%" 
          icon={TrendingUp}
          color="orange"
        />
        <StatCard 
          title="Chicken Loss" 
          value="1,342" 
          change="+2.1%" 
          icon={Package}
          color="red"
        />
        <StatCard 
          title="Active Vendors" 
          value="18" 
          change="+5%" 
          icon={Users}
          color="purple"
        />
        <StatCard 
          title="This Month" 
          value="8" 
          change="+15%" 
          icon={Calendar}
          color="blue"
        />
      </div>

      {/* Charts and Recent Data */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* P&L Chart */}
        <div className="xl:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Profit & Loss Overview</h3>
            <select className="text-sm border border-gray-300 rounded-lg px-3 py-1 focus:ring-2 focus:ring-blue-500">
              <option>Last 7 Days</option>
              <option>Last 30 Days</option>
              <option>Last 3 Months</option>
            </select>
          </div>
          <ProfitLossChart />
        </div>

        {/* Recent Trips */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Recent Trips</h3>
            <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              View All
            </button>
          </div>
          <RecentTrips />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <button className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors text-center">
            <Truck className="w-8 h-8 text-blue-600 mx-auto mb-2" />
            <span className="text-sm font-medium text-gray-700">New Trip</span>
          </button>
          <button className="p-4 border border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-colors text-center">
            <Users className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <span className="text-sm font-medium text-gray-700">Add Vendor</span>
          </button>
          <button className="p-4 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-colors text-center">
            <Package className="w-8 h-8 text-purple-600 mx-auto mb-2" />
            <span className="text-sm font-medium text-gray-700">Add Customer</span>
          </button>
          <button className="p-4 border border-gray-200 rounded-lg hover:border-orange-300 hover:bg-orange-50 transition-colors text-center">
            <Car className="w-8 h-8 text-orange-600 mx-auto mb-2" />
            <span className="text-sm font-medium text-gray-700">Add Vehicle</span>
          </button>
        </div>
      </div>
    </div>
  );
}