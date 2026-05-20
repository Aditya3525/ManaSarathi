import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

import { adminFetch, setAdminToken, getAdminToken, clearAdminToken } from '../admin/adminApi';
import { getApiBaseUrl } from '../config/apiConfig';

interface Admin {
  id: string;
  email: string;
  role: string;
  name?: string;
}

interface AdminAuthContextType {
  admin: Admin | null;
  adminLogin: (credentials: { email: string; password: string }) => Promise<void>;
  adminAutoLogin: () => Promise<boolean>;
  checkIsUserAdmin: (tokenOverride?: string) => Promise<boolean>;
  adminLogout: () => Promise<void>;
  isLoading: boolean;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
};

interface AdminAuthProviderProps {
  children: ReactNode;
}

export const AdminAuthProvider: React.FC<AdminAuthProviderProps> = ({ children }) => {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing session on mount (uses stored adminToken via Authorization header)
  useEffect(() => {
    const checkSession = async () => {
      try {
        if (!getAdminToken()) {
          return; // no token stored, skip
        }
        const response = await adminFetch(`${getApiBaseUrl()}/admin/session`);
        
        if (response.ok) {
          const adminData = await response.json();
          setAdmin(adminData);
        } else {
          clearAdminToken(); // stale token
        }
      } catch (error) {
        console.error('Session check failed:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
  }, []);

  const adminLogin = async (credentials: { email: string; password: string }) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${getApiBaseUrl()}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Login failed');
      }

      const adminData = await response.json();

      // Store the admin JWT for all future admin requests
      if (adminData.token) {
        setAdminToken(adminData.token);
      }

      setAdmin(adminData);
    } catch (error) {
      console.error('Admin login failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const checkIsUserAdmin = async (tokenOverride?: string): Promise<boolean> => {
    try {
      const token = tokenOverride || localStorage.getItem('token');
      if (!token) {
        return false;
      }

      const response = await fetch(`${getApiBaseUrl()}/admin/check-user-admin`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) return false;

      const data = await response.json();
      return data.isAdmin === true;
    } catch (error) {
      console.error('Admin check failed:', error);
      return false;
    }
  };

  const adminAutoLogin = async (): Promise<boolean> => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return false;

      setIsLoading(true);

      const response = await fetch(`${getApiBaseUrl()}/admin/auto-login`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });

      if (!response.ok) return false;

      const adminData = await response.json();

      // Store the admin JWT for all future admin requests
      if (adminData.token) {
        setAdminToken(adminData.token);
      }

      setAdmin(adminData);
      return true;
    } catch (error) {
      console.error('Admin auto-login failed:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const adminLogout = async () => {
    try {
      await adminFetch(`${getApiBaseUrl()}/admin/logout`, { method: 'POST' });
    } catch (error) {
      console.error('Logout request failed:', error);
    } finally {
      clearAdminToken();
      setAdmin(null);
    }
  };

  const value = {
    admin,
    adminLogin,
    adminAutoLogin,
    checkIsUserAdmin,
    adminLogout,
    isLoading
  };

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
};
