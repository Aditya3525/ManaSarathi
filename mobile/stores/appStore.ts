/**
 * Application State Store (Mobile)
 * 
 * Manages global application state like theme, modals, network status, etc.
 * Adapted for React Native - no DOM-related state (sidebar, etc.)
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

type Theme = 'light' | 'dark' | 'system';

interface Modal {
  id: string;
  type: string;
  data?: any;
}

interface AppState {
  // UI State
  theme: Theme;
  isOnline: boolean;
  
  // Modals
  modals: Modal[];

  // Loading states
  globalLoading: boolean;
  loadingMessage: string | null;

  // Actions
  setTheme: (theme: Theme) => void;
  
  // Modal management
  openModal: (type: string, data?: any) => void;
  closeModal: (id: string) => void;
  closeAllModals: () => void;
  
  // Connection status
  setOnlineStatus: (online: boolean) => void;
  
  // Global loading
  setGlobalLoading: (loading: boolean, message?: string) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Initial state
      theme: 'system',
      modals: [],
      isOnline: true,
      globalLoading: false,
      loadingMessage: null,

      // Actions
      setTheme: (theme) => set({ theme }),

      // Modal management
      openModal: (type, data) => {
        const id = `modal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        set((state) => ({
          modals: [...state.modals, { id, type, data }],
        }));
      },

      closeModal: (id) =>
        set((state) => ({
          modals: state.modals.filter((m) => m.id !== id),
        })),

      closeAllModals: () => set({ modals: [] }),

      // Connection status
      setOnlineStatus: (online) => set({ isOnline: online }),

      // Global loading
      setGlobalLoading: (loading, message) =>
        set({ globalLoading: loading, loadingMessage: message ?? null }),
    }),
    {
      name: 'app-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        theme: state.theme,
      }),
    }
  )
);

/**
 * Selectors
 */
export const selectTheme = (state: AppState) => state.theme;
export const selectIsOnline = (state: AppState) => state.isOnline;
export const selectGlobalLoading = (state: AppState) => state.globalLoading;
export const selectModals = (state: AppState) => state.modals;

/**
 * Subscribe to network status changes
 * Call this once in your app's root component
 */
export const initializeNetworkListener = () => {
  return NetInfo.addEventListener((state) => {
    useAppStore.getState().setOnlineStatus(state.isConnected ?? false);
  });
};
