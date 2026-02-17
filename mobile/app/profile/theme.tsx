import { View, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Sun, Moon, Smartphone, CheckCircle, Circle } from 'lucide-react-native';

import { Text } from '@/components/ui/Text';
import { Card, CardContent } from '@/components/ui/Card';
import { Separator } from '@/components/ui/Separator';
import { useAppStore } from '@/stores/appStore';

type ThemeOption = {
  value: 'light' | 'dark' | 'system';
  label: string;
  description: string;
  icon: typeof Sun;
};

export default function ThemeScreen() {
  const { t } = useTranslation();
  const { theme, setTheme } = useAppStore();

  const themeOptions: ThemeOption[] = [
    {
      value: 'light',
      label: t('profile.lightTheme', 'Light'),
      description: t('profile.lightThemeDescription', 'Use light theme'),
      icon: Sun,
    },
    {
      value: 'dark',
      label: t('profile.darkTheme', 'Dark'),
      description: t('profile.darkThemeDescription', 'Use dark theme'),
      icon: Moon,
    },
    {
      value: 'system',
      label: t('profile.systemTheme', 'System'),
      description: t('profile.systemThemeDescription', 'Follow system settings'),
      icon: Smartphone,
    },
  ];

  const handleThemeChange = (themeValue: 'light' | 'dark' | 'system') => {
    setTheme(themeValue);
    setTimeout(() => {
      router.back();
    }, 300);
  };

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="px-6 py-8">
        {/* Header */}
        <View className="mb-6">
          <Text variant="h2" className="mb-2">
            {t('profile.selectTheme', 'Select Theme')}
          </Text>
          <Text variant="body" className="text-gray-600">
            {t('profile.themeDescription', 'Choose how you want the app to look')}
          </Text>
        </View>

        {/* Theme Options */}
        <Card>
          <CardContent className="p-0">
            {themeOptions.map((option, index) => {
              const isSelected = theme === option.value;
              const IconComponent = option.icon;
              return (
                <View key={option.value}>
                  {index > 0 && <Separator />}
                  <TouchableOpacity
                    onPress={() => handleThemeChange(option.value)}
                    className="flex-row items-center p-4"
                    activeOpacity={0.7}
                  >
                    <View className="bg-gray-100 rounded-full p-2 mr-3">
                      <IconComponent size={20} color="#6b7280" />
                    </View>
                    <View className="flex-1">
                      <Text variant="body" className="font-medium mb-1">
                        {option.label}
                      </Text>
                      <Text variant="caption" className="text-gray-500">
                        {option.description}
                      </Text>
                    </View>
                    {isSelected ? (
                      <CheckCircle size={24} color="#6366f1" />
                    ) : (
                      <Circle size={24} color="#d1d5db" />
                    )}
                  </TouchableOpacity>
                </View>
              );
            })}
          </CardContent>
        </Card>

        {/* Preview Info */}
        <Card className="mt-6 bg-primary-50 border-primary-200">
          <CardContent className="p-4">
            <Text variant="caption" className="text-primary-800">
              {t('profile.themeInfo', 'Dark mode can help reduce eye strain in low-light environments. System mode automatically switches based on your device settings.')}
            </Text>
          </CardContent>
        </Card>
      </View>
    </ScrollView>
  );
}
