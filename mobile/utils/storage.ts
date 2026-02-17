import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/config';

/**
 * Secure storage for sensitive data (tokens, credentials)
 * Uses Expo SecureStore which encrypts data
 */
export const SecureStorage = {
  async getItem(key: string): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      console.error(`Error getting secure item ${key}:`, error);
      return null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      console.error(`Error setting secure item ${key}:`, error);
      throw error;
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.error(`Error removing secure item ${key}:`, error);
      throw error;
    }
  },

  async clear(): Promise<void> {
    try {
      // Clear all known secure keys
      const keys = Object.values(STORAGE_KEYS).filter(key => 
        key === STORAGE_KEYS.AUTH_TOKEN || 
        key === STORAGE_KEYS.USER_DATA
      );
      await Promise.all(keys.map(key => this.removeItem(key)));
    } catch (error) {
      console.error('Error clearing secure storage:', error);
      throw error;
    }
  },
};

/**
 * Regular storage for non-sensitive app data
 * Uses AsyncStorage (unencrypted but private to the app)
 */
export const Storage = {
  async getItem(key: string): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.error(`Error getting item ${key}:`, error);
      return null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      console.error(`Error setting item ${key}:`, error);
      throw error;
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing item ${key}:`, error);
      throw error;
    }
  },

  async clear(): Promise<void> {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      console.error('Error clearing storage:', error);
      throw error;
    }
  },

  async getObject<T>(key: string): Promise<T | null> {
    try {
      const value = await this.getItem(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error(`Error getting object ${key}:`, error);
      return null;
    }
  },

  async setObject<T>(key: string, value: T): Promise<void> {
    try {
      const jsonValue = JSON.stringify(value);
      await this.setItem(key, jsonValue);
    } catch (error) {
      console.error(`Error setting object ${key}:`, error);
      throw error;
    }
  },
};

/**
 * Token Manager for JWT authentication
 * Uses SecureStore (ASYNC) instead of localStorage (SYNC)
 */
export class TokenManager {
  private static TOKEN_KEY = STORAGE_KEYS.AUTH_TOKEN;

  static async getToken(): Promise<string | null> {
    return await SecureStorage.getItem(this.TOKEN_KEY);
  }

  static async setToken(token: string): Promise<void> {
    await SecureStorage.setItem(this.TOKEN_KEY, token);
  }

  static async removeToken(): Promise<void> {
    await SecureStorage.removeItem(this.TOKEN_KEY);
  }

  static async getAuthHeaders(): Promise<Record<string, string>> {
    const token = await this.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  static async hasToken(): Promise<boolean> {
    const token = await this.getToken();
    return !!token;
  }
}

/**
 * User data storage helper
 */
export const UserStorage = {
  async getUser(): Promise<any | null> {
    const userData = await SecureStorage.getItem(STORAGE_KEYS.USER_DATA);
    return userData ? JSON.parse(userData) : null;
  },

  async setUser(user: any): Promise<void> {
    await SecureStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(user));
  },

  async clearUser(): Promise<void> {
    await SecureStorage.removeItem(STORAGE_KEYS.USER_DATA);
  },
};

/**
 * App settings storage helpers
 */
export const AppSettings = {
  /**
   * Get all app settings as an object
   */
  async get(): Promise<{
    language: string | null;
    theme: 'light' | 'dark' | 'system' | null;
    biometricEnabled: boolean;
    notificationsEnabled: boolean;
    hasCompletedOnboarding: boolean;
    preferredApproach?: string | null;
    accessibilitySettings: any | null;
  }> {
    return {
      language: await Storage.getItem(STORAGE_KEYS.LANGUAGE),
      theme: await Storage.getItem(STORAGE_KEYS.THEME) as 'light' | 'dark' | 'system' | null,
      biometricEnabled: (await Storage.getItem(STORAGE_KEYS.BIOMETRIC_ENABLED)) === 'true',
      notificationsEnabled: (await Storage.getItem(STORAGE_KEYS.NOTIFICATIONS_ENABLED)) === 'true',
      hasCompletedOnboarding: (await Storage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETE)) === 'true',
      preferredApproach: await Storage.getItem('preferredApproach'),
      accessibilitySettings: await Storage.getObject(STORAGE_KEYS.ACCESSIBILITY),
    };
  },

  /**
   * Set multiple app settings at once
   */
  async set(settings: {
    language?: string;
    theme?: 'light' | 'dark' | 'system';
    biometricEnabled?: boolean;
    notificationsEnabled?: boolean;
    hasCompletedOnboarding?: boolean;
    preferredApproach?: string;
    accessibilitySettings?: any;
  }): Promise<void> {
    if (settings.language !== undefined) {
      await Storage.setItem(STORAGE_KEYS.LANGUAGE, settings.language);
    }
    if (settings.theme !== undefined) {
      await Storage.setItem(STORAGE_KEYS.THEME, settings.theme);
    }
    if (settings.biometricEnabled !== undefined) {
      await Storage.setItem(STORAGE_KEYS.BIOMETRIC_ENABLED, settings.biometricEnabled.toString());
    }
    if (settings.notificationsEnabled !== undefined) {
      await Storage.setItem(STORAGE_KEYS.NOTIFICATIONS_ENABLED, settings.notificationsEnabled.toString());
    }
    if (settings.hasCompletedOnboarding !== undefined) {
      await Storage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETE, settings.hasCompletedOnboarding.toString());
    }
    if (settings.preferredApproach !== undefined) {
      await Storage.setItem('preferredApproach', settings.preferredApproach);
    }
    if (settings.accessibilitySettings !== undefined) {
      await Storage.setObject(STORAGE_KEYS.ACCESSIBILITY, settings.accessibilitySettings);
    }
  },

  async getLanguage(): Promise<string | null> {
    return await Storage.getItem(STORAGE_KEYS.LANGUAGE);
  },

  async setLanguage(language: string): Promise<void> {
    await Storage.setItem(STORAGE_KEYS.LANGUAGE, language);
  },

  async getTheme(): Promise<'light' | 'dark' | 'system' | null> {
    return await Storage.getItem(STORAGE_KEYS.THEME) as 'light' | 'dark' | 'system' | null;
  },

  async setTheme(theme: 'light' | 'dark' | 'system'): Promise<void> {
    await Storage.setItem(STORAGE_KEYS.THEME, theme);
  },

  async getAccessibilitySettings(): Promise<any | null> {
    return await Storage.getObject(STORAGE_KEYS.ACCESSIBILITY);
  },

  async setAccessibilitySettings(settings: any): Promise<void> {
    await Storage.setObject(STORAGE_KEYS.ACCESSIBILITY, settings);
  },

  async isBiometricEnabled(): Promise<boolean> {
    const value = await Storage.getItem(STORAGE_KEYS.BIOMETRIC_ENABLED);
    return value === 'true';
  },

  async setBiometricEnabled(enabled: boolean): Promise<void> {
    await Storage.setItem(STORAGE_KEYS.BIOMETRIC_ENABLED, enabled.toString());
  },

  async areNotificationsEnabled(): Promise<boolean> {
    const value = await Storage.getItem(STORAGE_KEYS.NOTIFICATIONS_ENABLED);
    return value === 'true';
  },

  async setNotificationsEnabled(enabled: boolean): Promise<void> {
    await Storage.setItem(STORAGE_KEYS.NOTIFICATIONS_ENABLED, enabled.toString());
  },

  async isOnboardingComplete(): Promise<boolean> {
    const value = await Storage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETE);
    return value === 'true';
  },

  async setOnboardingComplete(complete: boolean): Promise<void> {
    await Storage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETE, complete.toString());
  },
};
