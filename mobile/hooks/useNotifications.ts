import { useState, useEffect } from 'react';
import { notificationService } from '@/services/notifications';
import { AppSettings } from '@/utils/storage';
import Constants from 'expo-constants';

const isExpoGo = Constants.appOwnership === 'expo';

export function useNotifications() {
  const [isEnabled, setIsEnabled] = useState(false);
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initializeNotifications();

    return () => {
      notificationService.cleanup();
    };
  }, []);

  const initializeNotifications = async () => {
    try {
      // In Expo Go, skip push-token-related initialization
      if (isExpoGo) {
        const enabled = await AppSettings.areNotificationsEnabled();
        setIsEnabled(enabled);
        setIsLoading(false);
        return;
      }

      const enabled = await notificationService.areNotificationsEnabled();
      setIsEnabled(enabled);

      if (enabled) {
        const token = await notificationService.initialize();
        setPushToken(token);
      }
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const enableNotifications = async () => {
    try {
      const granted = await notificationService.requestPermissions();
      if (granted) {
        await AppSettings.setNotificationsEnabled(true);
        const token = await notificationService.initialize();
        setPushToken(token);
        setIsEnabled(true);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to enable notifications:', error);
      return false;
    }
  };

  const disableNotifications = async () => {
    try {
      await notificationService.cancelAllNotifications();
      await AppSettings.setNotificationsEnabled(false);
      setIsEnabled(false);
      setPushToken(null);
    } catch (error) {
      console.error('Failed to disable notifications:', error);
    }
  };

  const scheduleDailyMoodReminder = async (hour: number, minute: number) => {
    try {
      await notificationService.scheduleDailyMoodReminder(hour, minute);
      return true;
    } catch (error) {
      console.error('Failed to schedule mood reminder:', error);
      return false;
    }
  };

  const schedulePracticeReminder = async (
    practiceTitle: string,
    hour: number,
    minute: number
  ) => {
    try {
      await notificationService.schedulePracticeReminder(practiceTitle, hour, minute);
      return true;
    } catch (error) {
      console.error('Failed to schedule practice reminder:', error);
      return false;
    }
  };

  return {
    isEnabled,
    pushToken,
    isLoading,
    enableNotifications,
    disableNotifications,
    scheduleDailyMoodReminder,
    schedulePracticeReminder,
  };
}
