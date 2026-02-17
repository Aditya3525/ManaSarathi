import { useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, Switch, Alert } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  Type, Palette, Eye, Vibrate, Volume2,
  CheckCircle, Circle, ChevronDown,
} from 'lucide-react-native';

import { Text } from '@/components/ui/Text';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Separator } from '@/components/ui/Separator';
import { AppSettings } from '@/utils/storage';
import { COLOR_PALETTES, FONT_FAMILIES, FONT_SIZES } from '@/constants/theme';
import type { AccessibilitySettings } from '@/types';

const DEFAULT_SETTINGS: AccessibilitySettings = {
  fontSize: 'medium',
  fontFamily: 'default',
  colorPalette: 'default',
  highContrast: false,
  reducedMotion: false,
  screenReader: false,
};

// --- Font Size Options ---
const FONT_SIZE_OPTIONS: { value: AccessibilitySettings['fontSize']; label: string; preview: number }[] = [
  { value: 'small', label: 'Small', preview: 12 },
  { value: 'medium', label: 'Medium', preview: 14 },
  { value: 'large', label: 'Large', preview: 17 },
  { value: 'extra-large', label: 'Extra Large', preview: 20 },
];

// --- Font Family Options ---
const FONT_FAMILY_OPTIONS: { value: AccessibilitySettings['fontFamily']; label: string }[] = [
  { value: 'default', label: 'System Default' },
  { value: 'opensans', label: 'Open Sans' },
  { value: 'roboto', label: 'Roboto' },
  { value: 'lato', label: 'Lato' },
  { value: 'inter', label: 'Inter' },
];

// --- Color Palette Options ---
const PALETTE_OPTIONS: { value: AccessibilitySettings['colorPalette']; label: string; colors: string[] }[] = [
  { value: 'default', label: 'Default', colors: ['#6366f1', '#8b5cf6', '#ec4899'] },
  { value: 'ocean', label: 'Ocean', colors: ['#0ea5e9', '#06b6d4', '#3b82f6'] },
  { value: 'forest', label: 'Forest', colors: ['#16a34a', '#15803d', '#22c55e'] },
  { value: 'sunset', label: 'Sunset', colors: ['#f97316', '#ef4444', '#eab308'] },
  { value: 'lavender', label: 'Lavender', colors: ['#a855f7', '#c084fc', '#d8b4fe'] },
  { value: 'neutral', label: 'Neutral', colors: ['#6b7280', '#9ca3af', '#374151'] },
];

export default function AccessibilityScreen() {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<AccessibilitySettings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  // Load settings on mount
  useEffect(() => {
    (async () => {
      const saved = await AppSettings.getAccessibilitySettings();
      if (saved) {
        setSettings({ ...DEFAULT_SETTINGS, ...saved });
      }
      setLoaded(true);
    })();
  }, []);

  // Save settings whenever they change
  const updateSetting = async <K extends keyof AccessibilitySettings>(
    key: K,
    value: AccessibilitySettings[K]
  ) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    try {
      await AppSettings.setAccessibilitySettings(updated);
    } catch {
      Alert.alert(t('common.error', 'Error'), t('accessibility.saveError', 'Failed to save setting'));
    }
  };

  if (!loaded) return null;

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="px-6 py-8">
        {/* Header */}
        <View className="mb-6">
          <Text variant="h2" className="mb-2">
            {t('accessibility.title', 'Accessibility')}
          </Text>
          <Text variant="body" className="text-gray-600">
            {t('accessibility.subtitle', 'Customize the app for your comfort and needs')}
          </Text>
        </View>

        {/* Font Size */}
        <Card className="mb-4">
          <CardHeader>
            <TouchableOpacity
              onPress={() => setExpandedSection(expandedSection === 'fontSize' ? null : 'fontSize')}
              className="flex-row items-center justify-between"
            >
              <View className="flex-row items-center">
                <View className="bg-blue-100 rounded-full p-2 mr-3">
                  <Type size={20} color="#3b82f6" />
                </View>
                <View>
                  <CardTitle>{t('accessibility.fontSize', 'Font Size')}</CardTitle>
                  <Text variant="caption" className="text-gray-500">
                    {FONT_SIZE_OPTIONS.find(o => o.value === settings.fontSize)?.label}
                  </Text>
                </View>
              </View>
              <ChevronDown
                size={20}
                color="#6b7280"
                style={{ transform: [{ rotate: expandedSection === 'fontSize' ? '180deg' : '0deg' }] }}
              />
            </TouchableOpacity>
          </CardHeader>
          {expandedSection === 'fontSize' && (
            <CardContent className="p-0">
              {FONT_SIZE_OPTIONS.map((option, index) => {
                const isSelected = settings.fontSize === option.value;
                return (
                  <View key={option.value}>
                    {index > 0 && <Separator />}
                    <TouchableOpacity
                      onPress={() => updateSetting('fontSize', option.value)}
                      className="flex-row items-center p-4"
                      activeOpacity={0.7}
                    >
                      <View className="flex-1">
                        <Text style={{ fontSize: option.preview }} className="font-medium text-gray-800">
                          {option.label}
                        </Text>
                        <Text style={{ fontSize: option.preview }} className="text-gray-500 mt-1">
                          {t('accessibility.previewText', 'Preview text')}
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
          )}
        </Card>

        {/* Font Family */}
        <Card className="mb-4">
          <CardHeader>
            <TouchableOpacity
              onPress={() => setExpandedSection(expandedSection === 'fontFamily' ? null : 'fontFamily')}
              className="flex-row items-center justify-between"
            >
              <View className="flex-row items-center">
                <View className="bg-purple-100 rounded-full p-2 mr-3">
                  <Type size={20} color="#8b5cf6" />
                </View>
                <View>
                  <CardTitle>{t('accessibility.fontFamily', 'Font Family')}</CardTitle>
                  <Text variant="caption" className="text-gray-500">
                    {FONT_FAMILY_OPTIONS.find(o => o.value === settings.fontFamily)?.label}
                  </Text>
                </View>
              </View>
              <ChevronDown
                size={20}
                color="#6b7280"
                style={{ transform: [{ rotate: expandedSection === 'fontFamily' ? '180deg' : '0deg' }] }}
              />
            </TouchableOpacity>
          </CardHeader>
          {expandedSection === 'fontFamily' && (
            <CardContent className="p-0">
              {FONT_FAMILY_OPTIONS.map((option, index) => {
                const isSelected = settings.fontFamily === option.value;
                return (
                  <View key={option.value}>
                    {index > 0 && <Separator />}
                    <TouchableOpacity
                      onPress={() => updateSetting('fontFamily', option.value)}
                      className="flex-row items-center p-4"
                      activeOpacity={0.7}
                    >
                      <View className="flex-1">
                        <Text variant="body" className="font-medium">
                          {option.label}
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
          )}
        </Card>

        {/* Color Palette */}
        <Card className="mb-4">
          <CardHeader>
            <TouchableOpacity
              onPress={() => setExpandedSection(expandedSection === 'colorPalette' ? null : 'colorPalette')}
              className="flex-row items-center justify-between"
            >
              <View className="flex-row items-center">
                <View className="bg-pink-100 rounded-full p-2 mr-3">
                  <Palette size={20} color="#ec4899" />
                </View>
                <View>
                  <CardTitle>{t('accessibility.colorPalette', 'Color Palette')}</CardTitle>
                  <Text variant="caption" className="text-gray-500">
                    {PALETTE_OPTIONS.find(o => o.value === settings.colorPalette)?.label}
                  </Text>
                </View>
              </View>
              <ChevronDown
                size={20}
                color="#6b7280"
                style={{ transform: [{ rotate: expandedSection === 'colorPalette' ? '180deg' : '0deg' }] }}
              />
            </TouchableOpacity>
          </CardHeader>
          {expandedSection === 'colorPalette' && (
            <CardContent className="p-0">
              {PALETTE_OPTIONS.map((option, index) => {
                const isSelected = settings.colorPalette === option.value;
                return (
                  <View key={option.value}>
                    {index > 0 && <Separator />}
                    <TouchableOpacity
                      onPress={() => updateSetting('colorPalette', option.value)}
                      className="flex-row items-center p-4"
                      activeOpacity={0.7}
                    >
                      <View className="flex-1">
                        <Text variant="body" className="font-medium mb-2">
                          {option.label}
                        </Text>
                        <View className="flex-row gap-2">
                          {option.colors.map((c, ci) => (
                            <View
                              key={ci}
                              className="w-8 h-8 rounded-full"
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </View>
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
          )}
        </Card>

        {/* Toggle Settings */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>{t('accessibility.displayOptions', 'Display Options')}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {/* High Contrast */}
            <View className="flex-row items-center justify-between p-4">
              <View className="flex-row items-center flex-1">
                <View className="bg-yellow-100 rounded-full p-2 mr-3">
                  <Eye size={20} color="#ca8a04" />
                </View>
                <View className="flex-1">
                  <Text variant="body" className="font-medium">
                    {t('accessibility.highContrast', 'High Contrast')}
                  </Text>
                  <Text variant="caption" className="text-gray-500">
                    {t('accessibility.highContrastDesc', 'Increase color contrast for better visibility')}
                  </Text>
                </View>
              </View>
              <Switch
                value={settings.highContrast}
                onValueChange={(val) => updateSetting('highContrast', val)}
                trackColor={{ false: '#d1d5db', true: '#818cf8' }}
                thumbColor={settings.highContrast ? '#6366f1' : '#f3f4f6'}
              />
            </View>

            <Separator />

            {/* Reduced Motion */}
            <View className="flex-row items-center justify-between p-4">
              <View className="flex-row items-center flex-1">
                <View className="bg-orange-100 rounded-full p-2 mr-3">
                  <Vibrate size={20} color="#f97316" />
                </View>
                <View className="flex-1">
                  <Text variant="body" className="font-medium">
                    {t('accessibility.reducedMotion', 'Reduced Motion')}
                  </Text>
                  <Text variant="caption" className="text-gray-500">
                    {t('accessibility.reducedMotionDesc', 'Minimize animations and transitions')}
                  </Text>
                </View>
              </View>
              <Switch
                value={settings.reducedMotion}
                onValueChange={(val) => updateSetting('reducedMotion', val)}
                trackColor={{ false: '#d1d5db', true: '#818cf8' }}
                thumbColor={settings.reducedMotion ? '#6366f1' : '#f3f4f6'}
              />
            </View>

            <Separator />

            {/* Screen Reader */}
            <View className="flex-row items-center justify-between p-4">
              <View className="flex-row items-center flex-1">
                <View className="bg-green-100 rounded-full p-2 mr-3">
                  <Volume2 size={20} color="#16a34a" />
                </View>
                <View className="flex-1">
                  <Text variant="body" className="font-medium">
                    {t('accessibility.screenReader', 'Screen Reader Optimization')}
                  </Text>
                  <Text variant="caption" className="text-gray-500">
                    {t('accessibility.screenReaderDesc', 'Enhance compatibility with screen readers')}
                  </Text>
                </View>
              </View>
              <Switch
                value={settings.screenReader}
                onValueChange={(val) => updateSetting('screenReader', val)}
                trackColor={{ false: '#d1d5db', true: '#818cf8' }}
                thumbColor={settings.screenReader ? '#6366f1' : '#f3f4f6'}
              />
            </View>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="bg-primary-50 border-primary-200">
          <CardContent className="p-4">
            <Text variant="caption" className="text-primary-800">
              {t('accessibility.info', 'Accessibility settings are saved locally and applied across the app. Some changes may require restarting the app to take full effect.')}
            </Text>
          </CardContent>
        </Card>
      </View>
    </ScrollView>
  );
}
