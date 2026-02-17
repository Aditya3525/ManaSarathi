/**
 * Notification Store (Mobile)
 * 
 * Manages in-app notifications and toasts
 * Uses react-native-toast-message for display
 */

import { create } from 'zustand';

type NotificationType = 'success' | 'error' | 'info' | 'warning';

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onPress: () => void;
  };
  timestamp: number;
}

interface NotificationState {
  notifications: Notification[];
  _timeouts: Map<string, ReturnType<typeof setTimeout>>;
  
  // Actions
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
  
  // Convenience methods for common notification types
  success: (title: string, message?: string, duration?: number) => void;
  error: (title: string, message?: string, duration?: number) => void;
  info: (title: string, message?: string, duration?: number) => void;
  warning: (title: string, message?: string, duration?: number) => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  _timeouts: new Map(),

  addNotification: (notification) => {
    const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newNotification: Notification = {
      ...notification,
      id,
      timestamp: Date.now(),
    };
    
    set((state) => ({
      notifications: [...state.notifications, newNotification],
    }));

    // Auto-remove after duration (default 3s)
    const duration = notification.duration || 3000;
    if (duration > 0) {
      const timeoutId = setTimeout(() => {
        get()._timeouts.delete(id);
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        }));
      }, duration);
      get()._timeouts.set(id, timeoutId);
    }
  },

  removeNotification: (id) => {
    // Clear any pending timeout for this notification
    const timeoutId = get()._timeouts.get(id);
    if (timeoutId) {
      clearTimeout(timeoutId);
      get()._timeouts.delete(id);
    }
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    }));
  },

  clearAll: () => {
    // Clear all pending timeouts
    const timeouts = get()._timeouts;
    timeouts.forEach((timeoutId) => clearTimeout(timeoutId));
    timeouts.clear();
    set({ notifications: [] });
  },

  // Convenience methods — delegate to addNotification
  success: (title, message, duration) => {
    useNotificationStore.getState().addNotification({
      type: 'success', title, message, duration: duration || 3000,
    });
  },

  error: (title, message, duration) => {
    useNotificationStore.getState().addNotification({
      type: 'error', title, message, duration: duration || 4000,
    });
  },

  info: (title, message, duration) => {
    useNotificationStore.getState().addNotification({
      type: 'info', title, message, duration: duration || 3000,
    });
  },

  warning: (title, message, duration) => {
    useNotificationStore.getState().addNotification({
      type: 'warning', title, message, duration: duration || 3500,
    });
  },
}));

/**
 * Selectors
 */
export const selectNotifications = (state: NotificationState) => state.notifications;
export const selectLatestNotification = (state: NotificationState) => 
  state.notifications[state.notifications.length - 1] || null;
