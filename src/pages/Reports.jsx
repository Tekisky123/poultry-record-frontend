// src/pages/Reports.jsx
import { useState, useEffect } from 'react';
import { 
  Download, 
  Filter, 
  Calendar,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  Truck,
  Users,
  Car
} from 'lucide-react';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function Reports() {
  const [dateRange, setDateRange] = useState('30');
  const [reportType, setReportType] = useState('overview');
  const [chartError, setChartError] = useState(null);

  useEffect(() => {
    // Debug logging
    console.log('Reports component mounted');
    console.log('Chart.js version:', ChartJS.version);
  }, []);

  // Mock data for charts
  const profitLossData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        label: 'Revenue',
        data: [650000, 720000, 680000, 750000, 820000, 780000],
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Expenses',
        data: [450000, 480000, 520000, 490000, 550000, 510000],
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Net Profit',
        data: [200000, 240000, 160000, 260000, 270000, 270000],
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4,
      }
    ]
  };

  const tripPerformanceData = {
    labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
    datasets: [
      {
        label: 'Completed Trips',
        data: [12, 15, 18, 14],
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 1,
      },
      {
        label: 'Failed Trips',
        data: [2, 1, 3, 2],
        backgroundColor: 'rgba(239, 68, 68, 0.8)',
        borderColor: 'rgb(239, 68, 68)',
        borderWidth: 1,
      }
    ]
  };

  const vehicleUtilizationData = {
    labels: ['Truck A', 'Truck B', 'Mini Truck C', 'Container D'],
    datasets: [
      {
        label: 'Utilization %',
        data: [85, 92, 78, 95],
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(34, 197, 94, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(168, 85, 247, 0.8)'
        ],
        borderColor: [
          'rgb(59, 130, 246)',
          'rgb(34, 197, 94)',
          'rgb(245, 158, 11)',
          'rgb(168, 85, 247)'
        ],
        borderWidth: 2,
      }
    ]
  };

  const vendorPerformanceData = {
    labels: ['Vendor A', 'Vendor B', 'Vendor C', 'Vendor D', 'Vendor E'],
    datasets: [
      {
        label: 'Total Purchases (₹)',
        data: [250000, 180000, 320000, 150000, 280000],
        backgroundColor: 'rgba(168, 85, 247, 0.8)',
        borderColor: 'rgb(168, 85, 247)',
        borderWidth: 1,
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          usePointStyle: true,
          padding: 20,
          font: { size: 12, weight: '500' }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true,
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { size: 12, weight: '500' }, color: '#6B7280' }
      },
      y: {
        grid: { color: 'rgba(0, 0, 0, 0.05)', borderDash: [5, 5] },
        ticks: { font: { size: 12, weight: '500' }, color: '#6B7280' }
      }
    }
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: { usePointStyle: true, padding: 20 }
      }
    }
  };

  // Error boundary for charts
  const ChartWrapper = ({ children, title }) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      </div>
      <div className="h-80">
        {chartError ? (
          <div className="flex items-center justify-center h-full text-red-600">
            <p>Chart loading error: {chartError}</p>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-600 mt-1">Comprehensive insights into your poultry business performance</p>
        </div>
        <div className="flex gap-2 mt-4 sm:mt-0">
          <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2">
            <Filter size={16} />
            Filters
          </button>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2">
            <Download size={16} />
            Export Report
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">Date Range:</label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="7">Last 7 Days</option>
              <option value="30">Last 30 Days</option>
              <option value="90">Last 3 Months</option>
              <option value="365">Last Year</option>
            </select>
          </div>
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">Report Type:</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="overview">Overview</option>
              <option value="financial">Financial</option>
              <option value="operational">Operational</option>
              <option value="vehicle">Vehicle</option>
            </select>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">₹4.2M</p>
              <p className="text-sm text-green-600 flex items-center gap-1 mt-1">
                <TrendingUp size={14} />
                +12.5%
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Trips</p>
              <p className="text-2xl font-bold text-gray-900">156</p>
              <p className="text-sm text-blue-600 flex items-center gap-1 mt-1">
                <TrendingUp size={14} />
                +8.2%
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Truck className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Birds Sold</p>
              <p className="text-2xl font-bold text-gray-900">45.2K</p>
              <p className="text-sm text-green-600 flex items-center gap-1 mt-1">
                <TrendingUp size={14} />
                +15.3%
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Package className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Active Vendors</p>
              <p className="text-2xl font-bold text-gray-900">24</p>
              <p className="text-sm text-orange-600 flex items-center gap-1 mt-1">
                <TrendingDown size={14} />
                -2.1%
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Profit & Loss Chart */}
        <ChartWrapper title="Profit & Loss Trend">
          <Line data={profitLossData} options={chartOptions} />
        </ChartWrapper>

        {/* Trip Performance */}
        <ChartWrapper title="Trip Performance">
          <Bar data={tripPerformanceData} options={chartOptions} />
        </ChartWrapper>

        {/* Vehicle Utilization */}
        <ChartWrapper title="Vehicle Utilization">
          <Doughnut data={vehicleUtilizationData} options={doughnutOptions} />
        </ChartWrapper>

        {/* Vendor Performance */}
        <ChartWrapper title="Vendor Performance">
          <Bar data={vendorPerformanceData} options={chartOptions} />
        </ChartWrapper>
      </div>

      {/* Summary Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Monthly Summary</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Month</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expenses</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Profit</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trips</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Birds Sold</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {[
                { month: 'January', revenue: 650000, expenses: 450000, profit: 200000, trips: 25, birds: 8500 },
                { month: 'February', revenue: 720000, expenses: 480000, profit: 240000, trips: 28, birds: 9200 },
                { month: 'March', revenue: 680000, expenses: 520000, profit: 160000, trips: 26, birds: 8800 },
                { month: 'April', revenue: 750000, expenses: 490000, profit: 260000, trips: 30, birds: 9500 },
                { month: 'May', revenue: 820000, expenses: 550000, profit: 270000, trips: 32, birds: 10200 },
                { month: 'June', revenue: 780000, expenses: 510000, profit: 270000, trips: 29, birds: 9800 }
              ].map((row, index) => (
                <tr key={index} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{row.month}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">₹{row.revenue.toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">₹{row.expenses.toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm font-medium text-green-600">₹{row.profit.toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{row.trips}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{row.birds.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}