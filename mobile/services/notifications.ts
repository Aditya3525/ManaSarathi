/**
 * Notification Service
 *
 * expo-notifications is loaded LAZILY via require() to avoid the
 * DevicePushTokenAutoRegistration side-effect that crashes in Expo Go
 * (SDK 53+). expo-router eagerly discovers all route files, so a
 * top-level `import * as Notifications from 'expo-notifications'`
 * would trigger the crash before the app even mounts.
 */
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { AppSettings } from '@/utils/storage';

/**
 * Check if we're running inside Expo Go (where push notifications are unsupported)
 */
const isExpoGo = Constants.appOwnership === 'expo';

/**
 * Lazy accessor — loads expo-notifications only on first call.
 */
let _Notifications: typeof import('expo-notifications') | null = null;
function getNotifications(): typeof import('expo-notifications') {
  if (!_Notifications) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    _Notifications = require('expo-notifications') as typeof import('expo-notifications');
  }
  return _Notifications;
}

/**
 * Configure notification handler (called once, lazily)
 */
let handlerConfigured = false;
function ensureNotificationHandler() {
  if (handlerConfigured) return;
  try {
    const Notifications = getNotifications();
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
    handlerConfigured = true;
  } catch (error) {
    console.warn('Failed to set notification handler (expected in Expo Go):', error);
  }
}

export type NotificationType = 
  | 'mood_reminder'
  | 'practice_reminder'
  | 'assessment_reminder'
  | 'check_in'
  | 'achievement'
  | 'content_recommendation';

export interface ScheduledNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  trigger: any; // Notifications.NotificationTriggerInput — typed as any to avoid top-level import
  data?: Record<string, any>;
}

class NotificationService {
  private expoPushToken: string | null = null;
  private notificationListener: any | null = null;
  private responseListener: any | null = null;

  /**
   * Initialize notification service
   */
  async initialize(): Promise<string | null> {
    const enabled = await AppSettings.areNotificationsEnabled();
    if (!enabled) {
      console.log('Notifications disabled by user');
      return null;
    }

    // Configure the handler lazily on first real use
    ensureNotificationHandler();
    const Notifications = getNotifications();

    try {
      const token = await this.registerForPushNotifications();
      this.expoPushToken = token;

      // Set up notification listeners
      this.notificationListener = Notifications.addNotificationReceivedListener(notification => {
        console.log('Notification received:', notification);
        // Handle notification received while app is in foreground
      });

      this.responseListener = Notifications.addNotificationResponseReceivedListener(response => {
        console.log('Notification response:', response);
        // Handle notification tap/interaction
        this.handleNotificationResponse(response);
      });

      return token;
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
      return null;
    }
  }

  /**
   * Clean up notification listeners
   */
  cleanup() {
    if (this.notificationListener) {
      this.notificationListener.remove();
    }
    if (this.responseListener) {
      this.responseListener.remove();
    }
  }

  /**
   * Register device for push notifications
   */
  private async registerForPushNotifications(): Promise<string | null> {
    // Push notifications are not supported in Expo Go (SDK 53+)
    if (isExpoGo) {
      console.log('Push notifications are not supported in Expo Go. Use a development build.');
      return null;
    }

    if (!Device.isDevice) {
      console.log('Must use physical device for Push Notifications');
      return null;
    }

    const Notifications = getNotifications();

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return null;
      }

      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      const token = await Notifications.getExpoPushTokenAsync({
        projectId,
      });

      console.log('Push token:', token.data);

      // Configure notification channel for Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#6366f1',
        });
      }

      return token.data;
    } catch (error) {
      console.error('Error registering for push notifications:', error);
      return null;
    }
  }

  /**
   * Handle notification tap/interaction
   */
  private handleNotificationResponse(response: any) {
    const data = response.notification.request.content.data;
    const type = data?.type as NotificationType;

    // Route to appropriate screen based on notification type
    switch (type) {
      case 'mood_reminder':
        router.push('/(tabs)/mood' as any);
        break;
      case 'practice_reminder':
        router.push('/(tabs)/content' as any);
        break;
      case 'assessment_reminder':
        router.push('/assessments' as any);
        break;
      case 'check_in':
        router.push('/(tabs)/chat' as any);
        break;
      case 'achievement':
        router.push('/(tabs)/profile' as any);
        break;
      case 'content_recommendation':
        if (data?.contentId && data?.contentType) {
          router.push(`/content/${data.contentType}/${data.contentId}` as any);
        } else {
          router.push('/(tabs)/content' as any);
        }
        break;
    }
  }

  /**
   * Schedule a local notification
   */
  async scheduleNotification(notification: ScheduledNotification): Promise<string> {
    ensureNotificationHandler();
    const Notifications = getNotifications();

    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: notification.title,
          body: notification.body,
          data: {
            ...notification.data,
            type: notification.type,
          },
        },
        trigger: notification.trigger,
      });

      console.log('Scheduled notification:', id);
      return id;
    } catch (error) {
      console.error('Failed to schedule notification:', error);
      throw error;
    }
  }

  /**
   * Cancel a scheduled notification
   */
  async cancelNotification(notificationId: string): Promise<void> {
    const Notifications = getNotifications();
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      console.log('Cancelled notification:', notificationId);
    } catch (error) {
      console.error('Failed to cancel notification:', error);
    }
  }

  /**
   * Cancel all scheduled notifications
   */
  async cancelAllNotifications(): Promise<void> {
    const Notifications = getNotifications();
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('Cancelled all notifications');
    } catch (error) {
      console.error('Failed to cancel all notifications:', error);
    }
  }

  /**
   * Get all scheduled notifications
   */
  async getScheduledNotifications(): Promise<any[]> {
    const Notifications = getNotifications();
    try {
      return await Notifications.getAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Failed to get scheduled notifications:', error);
      return [];
    }
  }

  /**
   * Schedule daily mood reminder
   */
  async scheduleDailyMoodReminder(hour: number = 20, minute: number = 0): Promise<string> {
    return this.scheduleNotification({
      id: 'daily-mood-reminder',
      type: 'mood_reminder',
      title: 'How are you feeling today?',
      body: 'Take a moment to log your mood and reflect on your day.',
      trigger: {
        type: getNotifications().SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    });
  }

  /**
   * Schedule practice reminder
   */
  async schedulePracticeReminder(
    practiceTitle: string,
    hour: number,
    minute: number
  ): Promise<string> {
    return this.scheduleNotification({
      id: `practice-reminder-${Date.now()}`,
      type: 'practice_reminder',
      title: 'Time for your practice',
      body: `Ready for ${practiceTitle}? Take a few minutes for yourself.`,
      trigger: {
        type: getNotifications().SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    });
  }

  /**
   * Send immediate notification (for testing or important alerts)
   */
  async sendImmediateNotification(
    title: string,
    body: string,
    data?: Record<string, any>
  ): Promise<void> {
    ensureNotificationHandler();
    const Notifications = getNotifications();
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
        },
        trigger: null, // Immediate
      });
    } catch (error) {
      console.error('Failed to send immediate notification:', error);
    }
  }

  /**
   * Get push token
   */
  getPushToken(): string | null {
    return this.expoPushToken;
  }

  /**
   * Check if notifications are enabled
   */
  async areNotificationsEnabled(): Promise<boolean> {
    try {
      const { status } = await getNotifications().getPermissionsAsync();
      return status === 'granted';
    } catch {
      return false;
    }
  }

  /**
   * Request notification permissions
   */
  async requestPermissions(): Promise<boolean> {
    try {
      const { status } = await getNotifications().requestPermissionsAsync();
      return status === 'granted';
    } catch {
      return false;
    }
  }
}

export const notificationService = new NotificationService();
