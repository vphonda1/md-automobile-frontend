import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, ls } from '../utils/apiConfig';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => ls.get('md_user'));
  const [adminVerifiedAt, setAdminVerifiedAt] = useState(0);

  useEffect(() => {
    if (user) ls.set('md_user', user);
  }, [user]);

  const login = async (identifier, password) => {
    const res = await api.post('/api/auth/login', { identifier, password });
    setUser(res.user);
    ls.set('md_user', res.user);
    return res.user;
  };

  const logout = () => {
    setUser(null);
    ls.remove('md_user');
    setAdminVerifiedAt(0);
  };

  const isAdmin = () => ['owner', 'admin'].includes(user?.role);
  const isManager = () => ['owner', 'admin', 'manager'].includes(user?.role);
  
  // Check if admin was verified within last 5 minutes
  const isAdminFresh = () => {
    return Date.now() - adminVerifiedAt < 5 * 60 * 1000;
  };

  // Verify admin password — caches success for 5 minutes
  const verifyAdmin = async (password) => {
    const res = await api.post('/api/auth/verify-admin', { password });
    if (res.valid) {
      setAdminVerifiedAt(Date.now());
      return true;
    }
    return false;
  };

  const changePassword = async (oldPassword, newPassword) => {
    return api.post('/api/auth/change-password', {
      userId: user._id,
      oldPassword,
      newPassword
    });
  };

  return (
    <AuthContext.Provider value={{
      user, setUser, login, logout,
      isAdmin, isManager, isAdminFresh,
      verifyAdmin, changePassword
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
