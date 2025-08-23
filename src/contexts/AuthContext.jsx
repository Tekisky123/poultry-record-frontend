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
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data } = await api.get("/auth/verify", { withCredentials: true });
        setUser(data?.data);
      } catch(err) {
        setUser(null);
        setError(err.message+` Please login again!`);
        setShowFailureModal(true);
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, []);

  const login = async (credentials) => {
    try {
      const payload = {
        username: credentials?.username ?? credentials?.userName,
        password: credentials?.password,
      };
      const { data } = await api.post('/auth/login', payload);
      setUser(data?.data);
      return { success: true, data: data?.data };
    } catch (error) {
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
    }
  };

  const value = {
    user,
    loading,
    login,
    signup,
    logout,
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
