// src/components/RecentTrips.jsx
import { Truck, MapPin, Calendar, DollarSign, Package } from 'lucide-react';

const mockTrips = [
  {
    id: 1,
    tripId: 'TRP-001',
    vehicle: 'MH-12-AB-1234',
    route: { from: 'Mumbai', to: 'Pune' },
    date: '2024-01-15',
    status: 'completed',
    profit: 25000,
    birds: 500
  },
  {
    id: 2,
    tripId: 'TRP-002',
    vehicle: 'MH-12-CD-5678',
    route: { from: 'Pune', to: 'Nagpur' },
    date: '2024-01-14',
    status: 'ongoing',
    profit: 18000,
    birds: 400
  },
  {
    id: 3,
    tripId: 'TRP-003',
    vehicle: 'MH-12-EF-9012',
    route: { from: 'Nagpur', to: 'Mumbai' },
    date: '2024-01-13',
    status: 'completed',
    profit: 32000,
    birds: 600
  },
  {
    id: 4,
    tripId: 'TRP-004',
    vehicle: 'MH-12-GH-3456',
    route: { from: 'Mumbai', to: 'Aurangabad' },
    date: '2024-01-12',
    status: 'started',
    profit: 15000,
    birds: 300
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

export default function RecentTrips() {
  return (
    <div className="space-y-4">
      {mockTrips.map((trip) => (
        <div key={trip.id} className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all duration-200">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <Truck className="w-5 h-5 text-blue-600" />
              <span className="font-medium text-gray-900">{trip.vehicle}</span>
            </div>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(trip.status)}`}>
              {getStatusText(trip.status)}
            </span>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <MapPin className="w-4 h-4" />
              <span>{trip.route.from} → {trip.route.to}</span>
            </div>
            
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Calendar className="w-4 h-4" />
              <span>{new Date(trip.date).toLocaleDateString()}</span>
            </div>
          </div>
          
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Package className="w-4 h-4" />
              <span>{trip.birds} birds</span>
            </div>
            <div className="flex items-center gap-1 text-sm font-medium text-green-600">
              <DollarSign className="w-4 h-4" />
              <span>₹{trip.profit.toLocaleString()}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}