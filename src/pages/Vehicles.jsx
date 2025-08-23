// src/pages/Vehicles.jsx
import { useState } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Car, 
  MapPin, 
  Fuel, 
  Calendar,
  Shield,
  Wrench,
  Eye,
  Edit,
  Trash2,
  TrendingUp
} from 'lucide-react';

const mockVehicles = [
  {
    id: 1,
    vehicleNumber: 'MH-12-AB-1234',
    type: 'Truck',
    capacityKg: 5000,
    fuelType: 'Diesel',
    fuelEfficiency: 6.5,
    dcSections: 8,
    purchaseType: 'OWNED',
    purchaseDate: '2022-03-15',
    purchaseAmount: 2500000,
    isInsured: true,
    insuranceExpiryDate: '2025-03-15',
    permitValidTill: '2025-12-31',
    fitnessCertificateExpiry: '2025-06-30',
    pollutionCertificateExpiry: '2025-09-30',
    currentStatus: 'Idle',
    location: { coordinates: [72.8777, 19.0760] }
  },
  {
    id: 2,
    vehicleNumber: 'MH-12-CD-5678',
    type: 'Mini Truck',
    capacityKg: 2000,
    fuelType: 'Diesel',
    fuelEfficiency: 8.2,
    dcSections: 4,
    purchaseType: 'RENTED',
    rentedFrom: 'ABC Transport Co.',
    rentedPerKmCharge: 15,
    isInsured: false,
    currentStatus: 'In Transit',
    location: { coordinates: [73.8567, 18.5204] }
  },
  {
    id: 3,
    vehicleNumber: 'MH-12-EF-9012',
    type: 'Container',
    capacityKg: 8000,
    fuelType: 'Diesel',
    fuelEfficiency: 5.8,
    dcSections: 12,
    purchaseType: 'OWNED',
    purchaseDate: '2021-08-20',
    purchaseAmount: 3500000,
    isInsured: true,
    insuranceExpiryDate: '2024-08-20',
    permitValidTill: '2025-12-31',
    fitnessCertificateExpiry: '2025-03-30',
    pollutionCertificateExpiry: '2025-06-30',
    currentStatus: 'Maintenance',
    location: { coordinates: [79.0882, 21.1458] }
  }
];

const getVehicleTypeColor = (type) => {
  const colors = {
    'Truck': 'bg-blue-100 text-blue-800',
    'Mini Truck': 'bg-green-100 text-green-800',
    'Container': 'bg-purple-100 text-purple-800',
    'Pickup': 'bg-orange-100 text-orange-800',
    'Tempo': 'bg-red-100 text-red-800',
    'Trailer': 'bg-indigo-100 text-indigo-800'
  };
  return colors[type] || 'bg-gray-100 text-gray-800';
};

const getStatusColor = (status) => {
  const colors = {
    'Idle': 'bg-gray-100 text-gray-800',
    'In Transit': 'bg-blue-100 text-blue-800',
    'Maintenance': 'bg-red-100 text-red-800'
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
};

const getPurchaseTypeColor = (type) => {
  return type === 'OWNED' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800';
};

const getFuelTypeColor = (type) => {
  const colors = {
    'Diesel': 'bg-blue-100 text-blue-800',
    'Petrol': 'bg-green-100 text-green-800',
    'CNG': 'bg-purple-100 text-purple-800',
    'Electric': 'bg-emerald-100 text-emerald-800'
  };
  return colors[type] || 'bg-gray-100 text-gray-800';
};

const isExpiringSoon = (date, days = 30) => {
  if (!date) return false;
  const expiryDate = new Date(date);
  const today = new Date();
  const diffTime = expiryDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays <= days && diffDays > 0;
};

const isExpired = (date) => {
  if (!date) return false;
  return new Date(date) < new Date();
};

export default function Vehicles() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [purchaseTypeFilter, setPurchaseTypeFilter] = useState('all');

  const filteredVehicles = mockVehicles.filter(vehicle => {
    const matchesSearch = vehicle.vehicleNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         vehicle.type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || vehicle.currentStatus === statusFilter;
    const matchesType = typeFilter === 'all' || vehicle.type === typeFilter;
    const matchesPurchase = purchaseTypeFilter === 'all' || vehicle.purchaseType === purchaseTypeFilter;
    return matchesSearch && matchesStatus && matchesType && matchesPurchase;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Vehicles Management</h1>
          <p className="text-gray-600 mt-1">Manage your poultry transportation fleet</p>
        </div>
        <button className="mt-4 sm:mt-0 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2">
          <Plus size={20} />
          Add Vehicle
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
                placeholder="Search vehicles by number or type..."
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
              <option value="Idle">Idle</option>
              <option value="In Transit">In Transit</option>
              <option value="Maintenance">Maintenance</option>
            </select>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Types</option>
              <option value="Truck">Truck</option>
              <option value="Mini Truck">Mini Truck</option>
              <option value="Container">Container</option>
              <option value="Pickup">Pickup</option>
              <option value="Tempo">Tempo</option>
              <option value="Trailer">Trailer</option>
            </select>
            <select
              value={purchaseTypeFilter}
              onChange={(e) => setPurchaseTypeFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Purchase Types</option>
              <option value="OWNED">Owned</option>
              <option value="RENTED">Rented</option>
            </select>
          </div>
        </div>
      </div>

      {/* Vehicles Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredVehicles.map((vehicle) => (
          <div key={vehicle.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-all duration-200">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Car className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 font-mono">{vehicle.vehicleNumber}</h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getVehicleTypeColor(vehicle.type)}`}>
                    {vehicle.type}
                  </span>
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

            {/* Basic Info */}
            <div className="space-y-3 mb-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Capacity:</span>
                <span className="font-medium text-gray-900">{vehicle.capacityKg.toLocaleString()} kg</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">DC Sections:</span>
                <span className="font-medium text-gray-900">{vehicle.dcSections}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Fuel Efficiency:</span>
                <span className="font-medium text-gray-900">{vehicle.fuelEfficiency} km/l</span>
              </div>
            </div>

            {/* Fuel and Purchase Info */}
            <div className="space-y-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Fuel Type:</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getFuelTypeColor(vehicle.fuelType)}`}>
                  {vehicle.fuelType}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Purchase Type:</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPurchaseTypeColor(vehicle.purchaseType)}`}>
                  {vehicle.purchaseType === 'OWNED' ? 'Owned' : 'Rented'}
                </span>
              </div>
              {vehicle.purchaseType === 'OWNED' && vehicle.purchaseAmount && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Purchase Amount:</span>
                  <span className="font-medium text-gray-900">₹{vehicle.purchaseAmount.toLocaleString()}</span>
                </div>
              )}
              {vehicle.purchaseType === 'RENTED' && vehicle.rentedPerKmCharge && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Per KM Charge:</span>
                  <span className="font-medium text-gray-900">₹{vehicle.rentedPerKmCharge}</span>
                </div>
              )}
            </div>

            {/* Status and Location */}
            <div className="space-y-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Status:</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(vehicle.currentStatus)}`}>
                  {vehicle.currentStatus}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MapPin className="w-4 h-4" />
                <span>Lat: {vehicle.location.coordinates[1].toFixed(4)}, Long: {vehicle.location.coordinates[0].toFixed(4)}</span>
              </div>
            </div>

            {/* Certificates and Insurance */}
            <div className="space-y-3 mb-4 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Insurance:</span>
                <div className="flex items-center gap-2">
                  <Shield className={`w-4 h-4 ${vehicle.isInsured ? 'text-green-600' : 'text-red-600'}`} />
                  <span className={vehicle.isInsured ? 'text-green-600' : 'text-red-600'}>
                    {vehicle.isInsured ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
              {vehicle.insuranceExpiryDate && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Insurance Expiry:</span>
                  <span className={`font-medium ${
                    isExpired(vehicle.insuranceExpiryDate) ? 'text-red-600' : 
                    isExpiringSoon(vehicle.insuranceExpiryDate) ? 'text-yellow-600' : 'text-gray-900'
                  }`}>
                    {new Date(vehicle.insuranceExpiryDate).toLocaleDateString()}
                  </span>
                </div>
              )}
              {vehicle.fitnessCertificateExpiry && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Fitness Expiry:</span>
                  <span className={`font-medium ${
                    isExpired(vehicle.fitnessCertificateExpiry) ? 'text-red-600' : 
                    isExpiringSoon(vehicle.fitnessCertificateExpiry) ? 'text-yellow-600' : 'text-gray-900'
                  }`}>
                    {new Date(vehicle.fitnessCertificateExpiry).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                View Details
              </button>
              <button className="text-sm text-green-600 hover:text-green-700 font-medium">
                Track Location
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-500">Total Vehicles</div>
          <div className="text-2xl font-bold text-gray-900">{filteredVehicles.length}</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-500">Active Vehicles</div>
          <div className="text-2xl font-bold text-green-600">
            {filteredVehicles.filter(v => v.currentStatus === 'Idle' || v.currentStatus === 'In Transit').length}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-500">Total Capacity</div>
          <div className="text-2xl font-bold text-blue-600">
            {filteredVehicles.reduce((sum, v) => sum + v.capacityKg, 0).toLocaleString()} kg
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-500">Owned Vehicles</div>
          <div className="text-2xl font-bold text-purple-600">
            {filteredVehicles.filter(v => v.purchaseType === 'OWNED').length}
          </div>
        </div>
      </div>
    </div>
  );
}