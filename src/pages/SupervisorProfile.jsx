import { useAuth } from '../contexts/AuthContext';
import { User, Mail, Smartphone, MapPin, Calendar } from 'lucide-react';

const SupervisorProfile = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
        <p className="text-gray-600">Your account information</p>
      </div>

      {/* Profile Card */}
      <div className="card">
        <div className="text-center mb-6">
          <div className="w-24 h-24 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl font-bold text-primary-700">
              {user?.name?.charAt(0).toUpperCase()}
            </span>
          </div>
          <h2 className="text-xl font-semibold text-gray-900">{user?.name}</h2>
          <p className="text-primary-600 font-medium">{user?.role}</p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <Mail size={18} className="text-gray-400" />
            <div>
              <p className="text-sm text-gray-500">Email</p>
              <p className="text-gray-900">{user?.email || 'Not provided'}</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Smartphone size={18} className="text-gray-400" />
            <div>
              <p className="text-sm text-gray-500">Mobile Number</p>
              <p className="text-gray-900">{user?.mobileNumber}</p>
            </div>
          </div>

          {user?.age && (
            <div className="flex items-center space-x-3">
              <User size={18} className="text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Age</p>
                <p className="text-gray-900">{user.age} years</p>
              </div>
            </div>
          )}

          {user?.address && (
            <div className="flex items-center space-x-3">
              <MapPin size={18} className="text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Address</p>
                <p className="text-gray-900">{user.address}</p>
              </div>
            </div>
          )}

          <div className="flex items-center space-x-3">
            <Calendar size={18} className="text-gray-400" />
            <div>
              <p className="text-sm text-gray-500">Member Since</p>
              <p className="text-gray-900">
                {new Date(user?.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          {user?.lastLogin && (
            <div className="flex items-center space-x-3">
              <Calendar size={18} className="text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Last Login</p>
                <p className="text-gray-900">
                  {new Date(user.lastLogin).toLocaleDateString()}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Account Status */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Status</h3>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Account Status</span>
          <span className={`px-3 py-1 text-xs font-medium rounded-full ${
            user?.isActive 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            {user?.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default SupervisorProfile;
