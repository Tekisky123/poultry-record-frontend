import { useState, useEffect } from 'react';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Building, 
  Save, 
  Edit,
  Check,
  X,
  Camera
} from 'lucide-react';
import api from '../lib/axios';
import { useAuth } from '../contexts/AuthContext';

const CustomerProfile = () => {
  const { user, setUser } = useAuth();
  const [profile, setProfile] = useState({
    shopName: '',
    ownerName: '',
    email: '',
    mobileNumber: '',
    address: '',
    area: '',
    city: '',
    state: '',
    pincode: '',
    gstNumber: '',
    panNumber: ''
  });
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user?._id || user?.id) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const userId = user?._id || user?.id;
      if (!userId) {
        console.error('User ID not found');
        setLoading(false);
        return;
      }
      
      const response = await api.get(`/customer/panel/${userId}/profile`);
      if (response.data.success) {
        const customerData = response.data.data;
        setProfile({
          shopName: customerData.shopName || '',
          ownerName: customerData.ownerName || '',
          email: customerData.email || '',
          mobileNumber: customerData.mobileNumber || '',
          address: customerData.address || '',
          area: customerData.area || '',
          city: customerData.city || '',
          state: customerData.state || '',
          pincode: customerData.pincode || '',
          gstNumber: customerData.gstNumber || '',
          panNumber: customerData.panNumber || ''
        });
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const userId = user?._id || user?.id;
      if (!userId) {
        console.error('User ID not found');
        setSaving(false);
        return;
      }
      
      const response = await api.put(`/customer/panel/${userId}/profile`, profile);
      console.log(response)
      if (response.data.success) {
        // Update user context with new data
        setUser(prev => ({
          ...prev,
          name: profile.ownerName,
          email: profile.email,
          mobileNumber: profile.mobileNumber
        }));
        setIsEditing(false);
        alert('Profile updated successfully!');
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
      alert('Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    fetchProfile(); // Reset to original data
  };

  const handleChange = (field, value) => {
    setProfile(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
          <p className="text-gray-600">Manage your account information</p>
        </div>
        <div className="flex space-x-2">
          {isEditing ? (
            <>
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
              >
                <X size={16} />
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors flex items-center gap-2"
              >
                {saving ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Save size={16} />
                )}
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <Edit size={16} />
              Edit Profile
            </button>
          )}
        </div>
      </div>

      {/* Profile Picture Section */}
      <div className="card">
        <div className="flex items-center space-x-4">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
            <User className="w-10 h-10 text-green-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{profile.ownerName || 'Customer'}</h3>
            <p className="text-gray-600">{profile.shopName || 'Shop Name'}</p>
            <p className="text-sm text-gray-500">{profile.email || profile.mobileNumber}</p>
          </div>
        </div>
      </div>

      {/* Basic Information */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Shop Name <span className="text-red-500">*</span>
            </label>
            {isEditing ? (
              <input
                type="text"
                value={profile.shopName}
                onChange={(e) => handleChange('shopName', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Enter shop name"
              />
            ) : (
              <p className="text-sm text-gray-900 py-2">{profile.shopName || 'Not provided'}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Owner Name <span className="text-red-500">*</span>
            </label>
            {isEditing ? (
              <input
                type="text"
                value={profile.ownerName}
                onChange={(e) => handleChange('ownerName', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Enter owner name"
              />
            ) : (
              <p className="text-sm text-gray-900 py-2">{profile.ownerName || 'Not provided'}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            {isEditing ? (
              <input
                type="email"
                value={profile.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Enter email address"
              />
            ) : (
              <p className="text-sm text-gray-900 py-2">{profile.email || 'Not provided'}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mobile Number <span className="text-red-500">*</span>
            </label>
            {isEditing ? (
              <input
                type="tel"
                value={profile.mobileNumber}
                onChange={(e) => handleChange('mobileNumber', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Enter mobile number"
              />
            ) : (
              <p className="text-sm text-gray-900 py-2">{profile.mobileNumber || 'Not provided'}</p>
            )}
          </div>
        </div>
      </div>

      {/* Address Information */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Address Information</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            {isEditing ? (
              <textarea
                value={profile.address}
                onChange={(e) => handleChange('address', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                rows={3}
                placeholder="Enter complete address"
              />
            ) : (
              <p className="text-sm text-gray-900 py-2">{profile.address || 'Not provided'}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Area</label>
              {isEditing ? (
                <input
                  type="text"
                  value={profile.area}
                  onChange={(e) => handleChange('area', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Enter area"
                />
              ) : (
                <p className="text-sm text-gray-900 py-2">{profile.area || 'Not provided'}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              {isEditing ? (
                <input
                  type="text"
                  value={profile.city}
                  onChange={(e) => handleChange('city', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Enter city"
                />
              ) : (
                <p className="text-sm text-gray-900 py-2">{profile.city || 'Not provided'}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
              {isEditing ? (
                <input
                  type="text"
                  value={profile.state}
                  onChange={(e) => handleChange('state', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Enter state"
                />
              ) : (
                <p className="text-sm text-gray-900 py-2">{profile.state || 'Not provided'}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pincode</label>
              {isEditing ? (
                <input
                  type="text"
                  value={profile.pincode}
                  onChange={(e) => handleChange('pincode', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Enter pincode"
                />
              ) : (
                <p className="text-sm text-gray-900 py-2">{profile.pincode || 'Not provided'}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Business Information */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Business Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">GST Number</label>
            {isEditing ? (
              <input
                type="text"
                value={profile.gstNumber}
                onChange={(e) => handleChange('gstNumber', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Enter GST number"
              />
            ) : (
              <p className="text-sm text-gray-900 py-2">{profile.gstNumber || 'Not provided'}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">PAN Number</label>
            {isEditing ? (
              <input
                type="text"
                value={profile.panNumber}
                onChange={(e) => handleChange('panNumber', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Enter PAN number"
              />
            ) : (
              <p className="text-sm text-gray-900 py-2">{profile.panNumber || 'Not provided'}</p>
            )}
          </div>
        </div>
      </div>

      {/* Account Status */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Status</h3>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-sm text-gray-700">Account Active</span>
          </div>
          <div className="text-sm text-gray-500">
            Member since {new Date(user.createdAt).toLocaleDateString()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerProfile;
