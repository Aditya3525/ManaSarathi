import * as LocalAuthentication from 'expo-local-authentication';
import { Alert } from 'react-native';
import { authApi } from './api';
import { TokenManager, UserStorage, AppSettings } from '../utils/storage';
import { useAuthStore } from '../stores/authStore';
import type { User, AuthResponse } from '../types';

/**
 * Check if biometric auth is available on the device
 */
export const checkBiometricAvailability = async (): Promise<{
  available: boolean;
  types: LocalAuthentication.AuthenticationType[];
}> => {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();

    return {
      available: hasHardware && isEnrolled,
      types: supportedTypes,
    };
  } catch (error) {
    console.error('Error checking biometric availability:', error);
    return { available: false, types: [] };
  }
};

/**
 * Authenticate using biometrics
 */
export const authenticateWithBiometrics = async (
  promptMessage = 'Authenticate to access MaanSarathi'
): Promise<boolean> => {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      fallbackLabel: 'Use password',
      cancelLabel: 'Cancel',
      disableDeviceFallback: false,
    });

    return result.success;
  } catch (error) {
    console.error('Biometric authentication error:', error);
    return false;
  }
};

/**
 * Check if user is authenticated
 */
export const checkAuth = async (): Promise<boolean> => {
  try {
    const hasToken = await TokenManager.hasToken();
    if (!hasToken) {
      return false;
    }

    // Verify token is valid by attempting to get current user
    const response = await authApi.getCurrentUser();
    return response.success;
  } catch (error) {
    console.error('Auth check error:', error);
    return false;
  }
};

/**
 * Login with email and password
 */
export const login = async (
  email: string,
  password: string
): Promise<AuthResponse> => {
  try {
    const response = await authApi.login({ email, password });
    
    if (response.success && response.data) {
      // Store user data
      await UserStorage.setUser(response.data.user);
    }
    
    return response;
  } catch (error) {
    console.error('Login error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Login failed',
    };
  }
};

/**
 * Register new user
 */
export const register = async (
  name: string,
  email: string,
  password: string
): Promise<AuthResponse> => {
  try {
    const response = await authApi.register({ name, email, password });
    
    if (response.success && response.data) {
      // Store user data
      await UserStorage.setUser(response.data.user);
    }
    
    return response;
  } catch (error) {
    console.error('Registration error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Registration failed',
    };
  }
};

/**
 * Logout user
 */
export const logout = async (): Promise<void> => {
  try {
    // Call server logout endpoint
    await authApi.serverLogout();
    
    // Clear local auth data
    await authApi.logout();
    await UserStorage.clearUser();
    
    // Clear Zustand store
    useAuthStore.getState().logout();
  } catch (error) {
    console.error('Logout error:', error);
    // Still clear local data even if server call fails
    await authApi.logout();
    await UserStorage.clearUser();
    useAuthStore.getState().logout();
  }
};

/**
 * Get current user from storage or API
 */
export const getCurrentUser = async (): Promise<User | null> => {
  try {
    // Try to get from local storage first
    let user = await UserStorage.getUser();
    
    // If not in storage but token exists, fetch from API
    if (!user && await TokenManager.hasToken()) {
      const response = await authApi.getCurrentUser();
      if (response.success && response.data) {
        user = response.data.user;
        await UserStorage.setUser(user);
      }
    }
    
    return user;
  } catch (error) {
    console.error('Get current user error:', error);
    return null;
  }
};

/**
 * Update user profile
 */
export const updateProfile = async (updates: Partial<User>): Promise<User | null> => {
  try {
    const response = await authApi.updateProfile(updates);
    
    if (response.success && response.data) {
      await UserStorage.setUser(response.data.user);
      return response.data.user;
    }
    
    return null;
  } catch (error) {
    console.error('Update profile error:', error);
    return null;
  }
};

/**
 * Setup password (e.g., after OAuth registration)
 */
export const setupPassword = async (password: string): Promise<boolean> => {
  try {
    const response = await authApi.setupPassword(password);
    return response.success === true;
  } catch (error) {
    console.error('Setup password error:', error);
    return false;
  }
};

/**
 * Enable/Disable biometric authentication
 */
export const setBiometricAuth = async (enabled: boolean): Promise<boolean> => {
  try {
    if (enabled) {
      // Check if biometrics are available
      const { available } = await checkBiometricAvailability();
      
      if (!available) {
        Alert.alert(
          'Biometric Authentication',
          'Biometric authentication is not available on this device or not set up.'
        );
        return false;
      }
      
      // Test authentication before enabling
      const authenticated = await authenticateWithBiometrics(
        'Authenticate to enable biometric login'
      );
      
      if (!authenticated) {
        return false;
      }
    }
    
    // Store preference
    await AppSettings.setBiometricEnabled(enabled);
    return true;
  } catch (error) {
    console.error('Set biometric auth error:', error);
    return false;
  }
};

/**
 * Check if biometric auth is enabled
 */
export const isBiometricEnabled = async (): Promise<boolean> => {
  return await AppSettings.isBiometricEnabled();
};

/**
 * Verify biometric auth and return stored credentials
 * Used for auto-login with biometrics
 */
export const authenticateAndGetToken = async (): Promise<string | null> => {
  try {
    const isEnabled = await isBiometricEnabled();
    if (!isEnabled) {
      return null;
    }
    
    const authenticated = await authenticateWithBiometrics();
    if (!authenticated) {
      return null;
    }
    
    return await TokenManager.getToken();
  } catch (error) {
    console.error('Authenticate and get token error:', error);
    return null;
  }
};

/**
 * Auth service object - convenient wrapper for all auth functions
 */
export const authService = {
  checkBiometricAvailability,
  authenticateWithBiometrics,
  checkAuth,
  login,
  register,
  logout,
  getCurrentUser,
  setupPassword,
  updateProfile,
  setBiometricAuth,
  isBiometricEnabled,
  authenticateAndGetToken,
};
