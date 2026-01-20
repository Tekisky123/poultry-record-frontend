import { createContext, useContext, useState, useEffect } from 'react';
import api from '../lib/axios';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState();
  const [loading, setLoading] = useState(true);
  const [showFailureModal, setShowFailureModal] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Rely on cookies for auth; individual pages will 401 if not authenticated
    setLoading(false);
  }, []);

  // Check session on initial load
  // Check session on initial load and poll
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data } = await api.get("/auth/verify", { withCredentials: true });
        setUser(data?.data);
      } catch (err) {
        if (loading) {
          setUser(null);
        }
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    // Poll for session updates every 10 seconds to sync permissions
    const intervalId = setInterval(checkSession, 10000);

    return () => clearInterval(intervalId);
  }, []);

  const login = async (credentials) => {
    try {
      const payload = {
        username: credentials?.username ?? credentials?.userName,
        password: credentials?.password,
      };
      const { data } = await api.post('/auth/login', payload);
      console.log('Login response:', data);

      // Store the token in localStorage for frontend use
      if (data?.data?.token) {
        localStorage.setItem('token', data.data.token);
        console.log('Token stored in localStorage');
      } else if (data?.token) {
        localStorage.setItem('token', data.token);
        console.log('Token stored in localStorage');
      } else {
        console.log('No token found in response');
      }

      setUser(data?.data);
      return { success: true, data: data?.data };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: error.message };
    }
  };

  const signup = async (userData) => {
    try {
      const { data } = await api.post('/auth/signup', userData);
      // Do not set user here; approval may be pending and we should not auto-login
      return { success: true, data: data?.data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      // ignore
    } finally {
      setUser(null);
      // Clear the token from localStorage
      localStorage.removeItem('token');
      localStorage.removeItem('accessToken');
    }
  };

  // Helper function to check if token exists
  const hasToken = () => {
    const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
    return !!token;
  };

  const value = {
    user,
    setUser,
    loading,
    login,
    signup,
    logout,
    hasToken,
    showFailureModal,
    setShowFailureModal,
    error
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
