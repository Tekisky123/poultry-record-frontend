// src/pages/Vendors.jsx
import { useState } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Users, 
  MapPin, 
  Phone, 
  Mail,
  Building,
  Eye,
  Edit,
  Trash2,
  MoreHorizontal
} from 'lucide-react';

const mockVendors = [
  {
    id: 1,
    vendorName: 'Rafeeq Chicken Center',
    companyName: 'Rafeeq Poultry Ltd.',
    gstNumber: '27AABFR1234Z1Z5',
    contactNumber: '+91 98765 43210',
    email: 'rafeeq@poultry.com',
    address: '123 Main Street, Mumbai',
    city: 'Mumbai',
    state: 'Maharashtra',
    country: 'India',
    defaultPaymentMode: 'cash',
    isActive: true
  },
  {
    id: 2,
    vendorName: 'Fresh Farm Suppliers',
    companyName: 'Fresh Farm Group',
    gstNumber: '29AAFFS5678Z1Z9',
    contactNumber: '+91 87654 32109',
    email: 'freshfarm@suppliers.com',
    address: '456 Industrial Area, Pune',
    city: 'Pune',
    state: 'Maharashtra',
    country: 'India',
    defaultPaymentMode: 'credit',
    isActive: true
  },
  {
    id: 3,
    vendorName: 'Quality Birds Co.',
    companyName: 'Quality Birds Corporation',
    gstNumber: '32AAQBC9012Z1Z2',
    contactNumber: '+91 76543 21098',
    email: 'quality@birds.com',
    address: '789 Farm Road, Nagpur',
    city: 'Nagpur',
    state: 'Maharashtra',
    country: 'India',
    defaultPaymentMode: 'advance',
    isActive: false
  }
];

const getPaymentModeColor = (mode) => {
  const colors = {
    cash: 'bg-green-100 text-green-800',
    credit: 'bg-blue-100 text-blue-800',
    advance: 'bg-purple-100 text-purple-800'
  };
  return colors[mode] || 'bg-gray-100 text-gray-800';
};

const getStatusColor = (isActive) => {
  return isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
};

export default function Vendors() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');

  const filteredVendors = mockVendors.filter(vendor => {
    const matchesSearch = vendor.vendorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         vendor.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         vendor.contactNumber.includes(searchTerm) ||
                         vendor.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'active' && vendor.isActive) ||
                         (statusFilter === 'inactive' && !vendor.isActive);
    const matchesPayment = paymentFilter === 'all' || vendor.defaultPaymentMode === paymentFilter;
    return matchesSearch && matchesStatus && matchesPayment;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Vendors Management</h1>
          <p className="text-gray-600 mt-1">Manage your poultry suppliers and vendors</p>
        </div>
        <button className="mt-4 sm:mt-0 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2">
          <Plus size={20} />
          Add Vendor
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
                placeholder="Search vendors by name, company, contact, or email..."
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
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Payment Modes</option>
              <option value="cash">Cash</option>
              <option value="credit">Credit</option>
              <option value="advance">Advance</option>
            </select>
            <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2">
              <Filter size={16} />
              More Filters
            </button>
          </div>
        </div>
      </div>

      {/* Vendors Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredVendors.map((vendor) => (
          <div key={vendor.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-all duration-200">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{vendor.vendorName}</h3>
                  {vendor.companyName && (
                    <p className="text-sm text-gray-500">{vendor.companyName}</p>
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
                <span>{vendor.contactNumber}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Mail className="w-4 h-4" />
                <span>{vendor.email}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MapPin className="w-4 h-4" />
                <span>{vendor.address}, {vendor.city}, {vendor.state}</span>
              </div>
            </div>

            {/* GST and Payment Info */}
            <div className="space-y-3 mb-4">
              {vendor.gstNumber && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Building className="w-4 h-4" />
                  <span className="font-mono">{vendor.gstNumber}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Payment Mode:</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPaymentModeColor(vendor.defaultPaymentMode)}`}>
                  {vendor.defaultPaymentMode.charAt(0).toUpperCase() + vendor.defaultPaymentMode.slice(1)}
                </span>
              </div>
            </div>

            {/* Status and Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(vendor.isActive)}`}>
                {vendor.isActive ? 'Active' : 'Inactive'}
              </span>
              <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                View Details
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-500">Total Vendors</div>
          <div className="text-2xl font-bold text-gray-900">{filteredVendors.length}</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-500">Active Vendors</div>
          <div className="text-2xl font-bold text-green-600">
            {filteredVendors.filter(v => v.isActive).length}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-500">Cash Payment</div>
          <div className="text-2xl font-bold text-blue-600">
            {filteredVendors.filter(v => v.defaultPaymentMode === 'cash').length}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-500">Credit Payment</div>
          <div className="text-2xl font-bold text-purple-600">
            {filteredVendors.filter(v => v.defaultPaymentMode === 'credit').length}
          </div>
        </div>
      </div>
    </div>
  );
}