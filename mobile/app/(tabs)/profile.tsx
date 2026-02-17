import { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, TouchableOpacity, Alert, Switch, Linking } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import {
  User as UserIcon, HelpCircle, LogOut, Shield, Bell,
  Globe, Moon, Lock, ChevronRight, FileText, Info, Eye,
} from 'lucide-react-native';

import { Text } from '@/components/ui/Text';
import { Card, CardContent } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Separator } from '@/components/ui/Separator';
import { useAuthStore } from '@/stores/authStore';
import { useAppStore } from '@/stores/appStore';
import { authService } from '@/services/auth';
import { dashboardApi } from '@/services/api';
import { queryKeys } from '@/utils/queryKeys';
import { AppSettings } from '@/utils/storage';
import { getCurrentLanguage } from '@/i18n/config';
import Constants from 'expo-constants';

const APP_VERSION = Constants.expoConfig?.version || '1.0.0';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { user, setUser } = useAuthStore();
  const { theme } = useAppStore();
  const [biometricEnabled, setBiometricEnabled] = useState(false);

  // Fetch dashboard stats for profile
  const { data: dashboard } = useQuery({
    queryKey: queryKeys.dashboard.summary(),
    queryFn: async () => {
      const response = await dashboardApi.getSummary();
      return response.data as any;
    },
  });

  // Load biometric state on mount
  useEffect(() => {
    (async () => {
      const enabled = await authService.isBiometricEnabled();
      setBiometricEnabled(enabled);
    })();
  }, []);

  const handleLogout = useCallback(() => {
    Alert.alert(
      t('profile.logoutTitle', 'Logout'),
      t('profile.logoutMessage', 'Are you sure you want to logout?'),
      [
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('profile.logout', 'Logout'),
          style: 'destructive',
          onPress: async () => {
            await authService.logout();
            setUser(null);
            router.replace('/(auth)/landing' as any);
          },
        },
      ]
    );
  }, [t, setUser]);

  const toggleBiometric = async (enabled: boolean) => {
    const success = await authService.setBiometricAuth(enabled);
    if (success) {
      setBiometricEnabled(enabled);
    } else {
      Alert.alert(
        t('common.error', 'Error'),
        t('profile.biometricError', 'Failed to update biometric settings')
      );
    }
  };

  const handlePrivacyPolicy = () => {
    Linking.openURL('https://maansarathi.app/privacy');
  };

  const handleTermsOfService = () => {
    Linking.openURL('https://maansarathi.app/terms');
  };

  const handleHelpCenter = () => {
    router.push('/help-safety' as any);
  };

  const handleAbout = () => {
    Alert.alert(
      t('app.name', 'MaanSarathi'),
      `${t('app.tagline', 'Your Mental Wellness Companion')}\n\nVersion: ${APP_VERSION}\n${t('profile.approach', 'Approach')}: ${user?.approach || 'hybrid'}\n\n${t('profile.aboutDescription', 'MaanSarathi combines western psychology and eastern wellness traditions to help you on your mental health journey.')}`,
      [{ text: t('common.ok', 'OK') }]
    );
  };

  const currentLanguage = getCurrentLanguage();
  const languageLabel =
    currentLanguage === 'en' ? 'English' :
    currentLanguage === 'hi' ? 'हिंदी' :
    currentLanguage === 'es' ? 'Español' :
    currentLanguage === 'fr' ? 'Français' :
    currentLanguage === 'de' ? 'Deutsch' :
    currentLanguage === 'zh' ? '中文' : currentLanguage;

  const profileSections: Array<{
    title: string;
    items: Array<{
      icon: any;
      label: string;
      value?: string;
      onPress: () => void;
      showChevron?: boolean;
      showToggle?: boolean;
      toggleValue?: boolean;
      onToggle?: (enabled: boolean) => Promise<void>;
    }>;
  }> = [
    {
      title: t('profile.account', 'Account'),
      items: [
        {
          icon: UserIcon,
          label: t('profile.editProfile', 'Edit Profile'),
          onPress: () => router.push('/profile/edit' as any),
          showChevron: true,
        },
        {
          icon: Lock,
          label: t('profile.changePassword', 'Change Password'),
          onPress: () => router.push('/profile/change-password' as any),
          showChevron: true,
        },
      ],
    },
    {
      title: t('profile.preferences', 'Preferences'),
      items: [
        {
          icon: Bell,
          label: t('profile.notifications', 'Notifications'),
          onPress: () => router.push('/notifications' as any),
          showChevron: true,
        },
        {
          icon: Globe,
          label: t('profile.language', 'Language'),
          value: languageLabel,
          onPress: () => router.push('/profile/language' as any),
          showChevron: true,
        },
        {
          icon: Moon,
          label: t('profile.theme', 'Theme'),
          value: theme === 'dark' ? t('profile.dark', 'Dark') : theme === 'system' ? t('profile.system', 'System') : t('profile.light', 'Light'),
          onPress: () => router.push('/profile/theme' as any),
          showChevron: true,
        },
        {
          icon: Eye,
          label: t('profile.accessibility', 'Accessibility'),
          onPress: () => router.push('/profile/accessibility' as any),
          showChevron: true,
        },
      ],
    },
    {
      title: t('profile.security', 'Security & Privacy'),
      items: [
        {
          icon: Shield,
          label: t('profile.biometric', 'Biometric Login'),
          onPress: () => {},
          showToggle: true,
          toggleValue: biometricEnabled,
          onToggle: toggleBiometric,
        },
        {
          icon: Lock,
          label: t('profile.securityQuestion', 'Security Question'),
          onPress: () => router.push('/(auth)/security-question' as any),
          showChevron: true,
        },
        {
          icon: FileText,
          label: t('profile.privacy', 'Privacy Policy'),
          onPress: handlePrivacyPolicy,
          showChevron: true,
        },
        {
          icon: FileText,
          label: t('profile.terms', 'Terms of Service'),
          onPress: handleTermsOfService,
          showChevron: true,
        },
      ],
    },
    {
      title: t('profile.support', 'Support'),
      items: [
        {
          icon: HelpCircle,
          label: t('profile.help', 'Help Center'),
          onPress: handleHelpCenter,
          showChevron: true,
        },
        {
          icon: Info,
          label: t('profile.about', 'About'),
          onPress: handleAbout,
          showChevron: true,
        },
      ],
    },
  ];

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="px-6 pt-12 pb-8">
        {/* Profile Header */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <View className="items-center">
              <Avatar
                name={user?.name || 'User'}
                size="xl"
                className="mb-4"
              />
              <Text variant="h2" className="mb-1" accessibilityRole="header">
                {user?.name || 'Guest'}
              </Text>
              <Text variant="body" className="text-gray-600 mb-4">
                {user?.email || ''}
              </Text>
              <Button
                variant="outline"
                size="sm"
                onPress={() => router.push('/profile/edit' as any)}
              >
                {t('profile.editProfile', 'Edit Profile')}
              </Button>
            </View>
          </CardContent>
        </Card>

        {/* Stats */}
        <View className="flex-row gap-3 mb-6">
          <Card className="flex-1">
            <CardContent className="p-4 items-center">
              <Text variant="h2" className="text-primary-600 mb-1">
                {dashboard?.streakDays ?? 0}
              </Text>
              <Text variant="caption" className="text-gray-600">
                {t('profile.streak', 'Day Streak')}
              </Text>
            </CardContent>
          </Card>
          <Card className="flex-1">
            <CardContent className="p-4 items-center">
              <Text variant="h2" className="text-success-600 mb-1">
                {dashboard?.completedPractices ?? 0}
              </Text>
              <Text variant="caption" className="text-gray-600">
                {t('profile.practices', 'Practices')}
              </Text>
            </CardContent>
          </Card>
        </View>

        {/* Settings Sections */}
        {profileSections.map((section, sectionIndex) => (
          <View key={sectionIndex} className="mb-6">
            <Text variant="h3" className="mb-3" accessibilityRole="header">
              {section.title}
            </Text>
            <Card>
              <CardContent className="p-0">
                {section.items.map((item, itemIndex) => {
                  const IconComponent = item.icon;
                  return (
                    <View key={itemIndex}>
                      {itemIndex > 0 && <Separator />}
                      <TouchableOpacity
                        onPress={item.onPress}
                        disabled={item.showToggle}
                        className="flex-row items-center p-4"
                        activeOpacity={0.7}
                        accessibilityRole="button"
                        accessibilityLabel={item.label}
                      >
                        <View className="bg-gray-100 rounded-full p-2 mr-3">
                          <IconComponent size={20} color="#6b7280" />
                        </View>
                        <Text variant="body" className="flex-1">
                          {item.label}
                        </Text>
                        {item.value && (
                          <Text variant="caption" className="text-gray-500 mr-2">
                            {item.value}
                          </Text>
                        )}
                        {item.showToggle && (
                          <Switch
                            value={item.toggleValue}
                            onValueChange={item.onToggle}
                            trackColor={{ false: '#d1d5db', true: '#6366f1' }}
                            thumbColor="#ffffff"
                          />
                        )}
                        {item.showChevron && (
                          <ChevronRight size={20} color="#9ca3af" />
                        )}
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </CardContent>
            </Card>
          </View>
        ))}

        {/* Logout Button */}
        <Button
          variant="danger"
          size="lg"
          onPress={handleLogout}
          fullWidth
          leftIcon={<LogOut size={20} color="#ffffff" />}
        >
          {t('profile.logout', 'Logout')}
        </Button>

        {/* App Info */}
        <View className="mt-8 items-center">
          <Text variant="caption" className="text-gray-500 mb-1">
            {t('app.name', 'MaanSarathi')} v{APP_VERSION}
          </Text>
          <Text variant="caption" className="text-gray-400">
            {t('app.tagline', 'Your Mental Wellness Companion')}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
