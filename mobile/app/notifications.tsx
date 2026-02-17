import { View, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { Bell, BellOff, Clock } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Text } from '@/components/ui/Text';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Separator } from '@/components/ui/Separator';
import { useNotifications } from '@/hooks/useNotifications';

const MOOD_REMINDER_TIME_KEY = '@settings:mood_reminder_time';

export default function NotificationSettingsScreen() {
  const { t } = useTranslation();
  const {
    isEnabled,
    isLoading,
    enableNotifications,
    disableNotifications,
    scheduleDailyMoodReminder,
  } = useNotifications();

  const [moodReminderTime, setMoodReminderTime] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Load persisted reminder time on mount
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(MOOD_REMINDER_TIME_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          const restored = new Date();
          restored.setHours(parsed.hour, parsed.minute, 0, 0);
          setMoodReminderTime(restored);
        }
      } catch {
        // Use default (now)
      }
    })();
  }, []);

  const handleToggleNotifications = async () => {
    if (isEnabled) {
      await disableNotifications();
      Alert.alert(
        t('common.success', 'Success'),
        t('notifications.disabled', 'Notifications have been disabled')
      );
    } else {
      const success = await enableNotifications();
      if (success) {
        Alert.alert(
          t('common.success', 'Success'),
          t('notifications.enabled', 'Notifications have been enabled')
        );
      } else {
        Alert.alert(
          t('common.error', 'Error'),
          t('notifications.permissionDenied', 'Notification permission was denied')
        );
      }
    }
  };

  const handleScheduleMoodReminder = async () => {
    const hour = moodReminderTime.getHours();
    const minute = moodReminderTime.getMinutes();
    
    // Persist the chosen time
    await AsyncStorage.setItem(MOOD_REMINDER_TIME_KEY, JSON.stringify({ hour, minute }));
    
    const success = await scheduleDailyMoodReminder(hour, minute);
    if (success) {
      Alert.alert(
        t('common.success', 'Success'),
        t('notifications.reminderScheduled', 'Daily mood reminder has been scheduled')
      );
    } else {
      Alert.alert(
        t('common.error', 'Error'),
        t('notifications.reminderError', 'Failed to schedule reminder')
      );
    }
  };

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="px-6 py-8">
        {/* Main Toggle */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-1">
                <Text variant="h3" className="mb-1">
                  {t('notifications.pushNotifications', 'Push Notifications')}
                </Text>
                <Text variant="caption" className="text-gray-600">
                  {isEnabled
                    ? t('notifications.enabledDescription', 'You will receive notifications')
                    : t('notifications.disabledDescription', 'Notifications are turned off')}
                </Text>
              </View>
              {isEnabled ? (
                <Bell size={24} color="#6366f1" />
              ) : (
                <BellOff size={24} color="#9ca3af" />
              )}
            </View>
            
            <Button
              variant={isEnabled ? 'danger' : 'primary'}
              size="lg"
              onPress={handleToggleNotifications}
              disabled={isLoading}
              fullWidth
            >
              {isEnabled
                ? t('notifications.disable', 'Disable Notifications')
                : t('notifications.enable', 'Enable Notifications')}
            </Button>
          </CardContent>
        </Card>

        {/* Reminder Settings */}
        {isEnabled && (
          <>
            <Text variant="h3" className="mb-3">
              {t('notifications.reminders', 'Reminders')}
            </Text>

            <Card className="mb-4">
              <CardContent className="p-4">
                <View className="flex-row items-center justify-between mb-3">
                  <View className="flex-1">
                    <Text variant="body" className="font-medium mb-1">
                      {t('notifications.dailyMoodReminder', 'Daily Mood Check-in')}
                    </Text>
                    <Text variant="caption" className="text-gray-600">
                      {t('notifications.moodReminderDescription', 'Get reminded to log your mood')}
                    </Text>
                  </View>
                  <Clock size={20} color="#6b7280" />
                </View>

                <Separator className="mb-3" />

                <TouchableOpacity
                  onPress={() => setShowTimePicker(true)}
                  className="bg-gray-100 rounded-lg p-3 mb-3"
                  activeOpacity={0.7}
                >
                  <Text variant="body" className="text-center">
                    {moodReminderTime.toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </TouchableOpacity>

                {showTimePicker && (
                  <DateTimePicker
                    value={moodReminderTime}
                    mode="time"
                    is24Hour={false}
                    onChange={(event, selectedDate) => {
                      setShowTimePicker(false);
                      if (selectedDate) {
                        setMoodReminderTime(selectedDate);
                      }
                    }}
                  />
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onPress={handleScheduleMoodReminder}
                  fullWidth
                >
                  {t('notifications.scheduleReminder', 'Schedule Reminder')}
                </Button>
              </CardContent>
            </Card>

            {/* Info Card */}
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <Text variant="caption" className="text-blue-800">
                  {t('notifications.info', 'Reminders help you stay consistent with your mental wellness practices. You can customize or disable them anytime.')}
                </Text>
              </CardContent>
            </Card>
          </>
        )}
      </View>
    </ScrollView>
  );
}
