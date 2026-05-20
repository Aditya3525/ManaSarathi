/**
 * Authentication Store
 * 
 * Manages user authentication state, login/logout, and session management.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import { StoredUser } from '../services/auth';

interface AuthState {
  // State
  user: StoredUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  setUser: (user: StoredUser | null, token?: string | null) => void;
  login: (user: StoredUser, token?: string) => void;
  logout: () => void;
  updateUser: (updates: Partial<StoredUser>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // Actions
      setUser: (user, token) => {
        const existingToken = get().token || localStorage.getItem('token');
        const resolvedToken = token !== undefined
          ? token
          : (user ? existingToken : null);

        if (resolvedToken) {
          localStorage.setItem('token', resolvedToken);
        } else {
          localStorage.removeItem('token');
        }

        set({
          user,
          token: resolvedToken,
          isAuthenticated: !!user,
          error: null,
        });
      },

      login: (user, token) => {
        if (token) {
          localStorage.setItem('token', token);
        }
        set({
          user,
          token: token || null,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
      },

      logout: () => {
        localStorage.removeItem('token');
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        });
      },

      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),

      setLoading: (loading) =>
        set({ isLoading: loading }),

      setError: (error) =>
        set({ error, isLoading: false }),

      clearError: () =>
        set({ error: null }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

/**
 * Selectors for optimized component updates
 */
export const selectUser = (state: AuthState) => state.user;
export const selectIsAuthenticated = (state: AuthState) => state.isAuthenticated;
export const selectIsLoading = (state: AuthState) => state.isLoading;
export const selectError = (state: AuthState) => state.error;
