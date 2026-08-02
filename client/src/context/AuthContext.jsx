import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { useToast } from './ToastContext';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    checkLoggedInUser();
  }, []);

  const checkLoggedInUser = async () => {
    const token = localStorage.getItem('ai_forum_token');
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const res = await api.get('/auth/me');
      if (res.success) {
        setUser(res.user);
      }
    } catch (error) {
      localStorage.removeItem('ai_forum_token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password, targetPortal) => {
    try {
      setLoading(true);
      const res = await api.post('/auth/login', { email, password, targetPortal });
      if (res.success) {
        localStorage.setItem('ai_forum_token', res.token);
        setUser(res.user);
        toast.success(`Welcome back, ${res.user.name || 'User'}!`);
        return { success: true, user: res.user };
      }
    } catch (error) {
      toast.error(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const registerVoter = async (data) => {
    try {
      setLoading(true);
      const res = await api.post('/auth/register-voter', data);
      if (res.success) {
        localStorage.setItem('ai_forum_token', res.token);
        setUser(res.user);
        toast.success('Voter Registration successful!');
        return { success: true, user: res.user };
      }
    } catch (error) {
      toast.error(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('ai_forum_token');
    setUser(null);
    toast.info('Logged out successfully.');
  };

  const updateProfile = async (data) => {
    try {
      const res = await api.put('/auth/update-profile', data);
      if (res.success) {
        setUser(res.user);
        toast.success('Profile updated!');
        return true;
      }
    } catch (error) {
      toast.error(error.message);
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        registerVoter,
        logout,
        updateProfile,
        checkLoggedInUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
