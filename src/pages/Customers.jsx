// src/pages/Customers.jsx
import { useState } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Store, 
  MapPin, 
  Phone, 
  CreditCard,
  Clock,
  Eye,
  Edit,
  Trash2,
  TrendingUp
} from 'lucide-react';

const mockCustomers = [
  {
    id: 1,
    shopName: 'Local Shop A',
    ownerName: 'Ahmed Khan',
    contact: '+91 98765 43210',
    address: '123 Market Street, Mumbai',
    shopType: 'Retail',
    creditLimit: 50000,
    creditDays: 30,
    isActive: true,
    totalPurchases: 250000,
    lastPurchase: '2024-01-10'
  },
  {
    id: 2,
    shopName: 'Super Market B',
    ownerName: 'Fatima Ali',
    contact: '+91 87654 32109',
    address: '456 Commercial Area, Pune',
    shopType: 'Supermarket',
    creditLimit: 100000,
    creditDays: 45,
    isActive: true,
    totalPurchases: 450000,
    lastPurchase: '2024-01-12'
  },
  {
    id: 3,
    shopName: 'Corner Store C',
    ownerName: 'Rahul Sharma',
    contact: '+91 76543 21098',
    address: '789 Residential Colony, Nagpur',
    shopType: 'Corner Store',
    creditLimit: 25000,
    creditDays: 15,
    isActive: false,
    totalPurchases: 120000,
    lastPurchase: '2024-01-05'
  }
];

const getShopTypeColor = (type) => {
  const colors = {
    'Retail': 'bg-blue-100 text-blue-800',
    'Supermarket': 'bg-green-100 text-green-800',
    'Corner Store': 'bg-purple-100 text-purple-800',
    'Wholesale': 'bg-orange-100 text-orange-800'
  };
  return colors[type] || 'bg-gray-100 text-gray-800';
};

const getStatusColor = (isActive) => {
  return isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
};

const getCreditStatus = (creditLimit, creditDays) => {
  if (creditLimit === 0) return { text: 'Cash Only', color: 'bg-gray-100 text-gray-800' };
  if (creditDays <= 15) return { text: 'Low Risk', color: 'bg-green-100 text-green-800' };
  if (creditDays <= 30) return { text: 'Medium Risk', color: 'bg-yellow-100 text-yellow-800' };
  return { text: 'High Risk', color: 'bg-red-100 text-red-800' };
};

export default function Customers() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [shopTypeFilter, setShopTypeFilter] = useState('all');

  const filteredCustomers = mockCustomers.filter(customer => {
    const matchesSearch = customer.shopName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         customer.ownerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         customer.contact.includes(searchTerm) ||
                         customer.address.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'active' && customer.isActive) ||
                         (statusFilter === 'inactive' && !customer.isActive);
    const matchesType = shopTypeFilter === 'all' || customer.shopType === shopTypeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Customers Management</h1>
          <p className="text-gray-600 mt-1">Manage your poultry customers and retail partners</p>
        </div>
        <button className="mt-4 sm:mt-0 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2">
          <Plus size={20} />
          Add Customer
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search customers by shop name, owner, contact, or address..."
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
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <select
              value={shopTypeFilter}
              onChange={(e) => setShopTypeFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Shop Types</option>
              <option value="Retail">Retail</option>
              <option value="Supermarket">Supermarket</option>
              <option value="Corner Store">Corner Store</option>
              <option value="Wholesale">Wholesale</option>
            </select>
            <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2">
              <Filter size={16} />
              More Filters
            </button>
          </div>
        </div>
      </div>

      {/* Customers Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredCustomers.map((customer) => {
          const creditStatus = getCreditStatus(customer.creditLimit, customer.creditDays);
          
          return (
            <div key={customer.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-all duration-200">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <Store className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{customer.shopName}</h3>
                    {customer.ownerName && (
                      <p className="text-sm text-gray-500">Owner: {customer.ownerName}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
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
              </div>

              {/* Contact Info */}
              <div className="space-y-3 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone className="w-4 h-4" />
                  <span>{customer.contact}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="w-4 h-4" />
                  <span>{customer.address}</span>
                </div>
              </div>

              {/* Shop Type and Credit Info */}
              <div className="space-y-3 mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Shop Type:</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getShopTypeColor(customer.shopType)}`}>
                    {customer.shopType}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Credit Limit:</span>
                  <span className="text-sm font-medium text-gray-900">
                    ₹{customer.creditLimit.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Credit Days:</span>
                  <span className="text-sm font-medium text-gray-900">
                    {customer.creditDays} days
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Risk Level:</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${creditStatus.color}`}>
                    {creditStatus.text}
                  </span>
                </div>
              </div>

              {/* Business Stats */}
              <div className="space-y-3 mb-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Total Purchases:</span>
                  <span className="font-medium text-gray-900">
                    ₹{customer.totalPurchases.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Last Purchase:</span>
                  <span className="font-medium text-gray-900">
                    {new Date(customer.lastPurchase).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Status and Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(customer.isActive)}`}>
                  {customer.isActive ? 'Active' : 'Inactive'}
                </span>
                <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                  View Details
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-500">Total Customers</div>
          <div className="text-2xl font-bold text-gray-900">{filteredCustomers.length}</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-500">Active Customers</div>
          <div className="text-2xl font-bold text-green-600">
            {filteredCustomers.filter(c => c.isActive).length}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-500">Total Revenue</div>
          <div className="text-2xl font-bold text-blue-600">
            ₹{filteredCustomers.reduce((sum, c) => sum + c.totalPurchases, 0).toLocaleString()}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-500">Avg Credit Limit</div>
          <div className="text-2xl font-bold text-purple-600">
            ₹{(filteredCustomers.reduce((sum, c) => sum + c.creditLimit, 0) / filteredCustomers.length).toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
}