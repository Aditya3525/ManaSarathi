import { View, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { CheckCircle, Circle } from 'lucide-react-native';

import { Text } from '@/components/ui/Text';
import { Card, CardContent } from '@/components/ui/Card';
import { Separator } from '@/components/ui/Separator';
import { SUPPORTED_LANGUAGES } from '@/i18n/config';

export default function LanguageScreen() {
  const { t, i18n } = useTranslation();
  const currentLanguage = i18n.language;

  const handleLanguageChange = async (languageCode: string) => {
    await i18n.changeLanguage(languageCode);
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
            {t('profile.selectLanguage', 'Select Language')}
          </Text>
          <Text variant="body" className="text-gray-600">
            {t('profile.languageDescription', 'Choose your preferred language for the app')}
          </Text>
        </View>

        {/* Language List */}
        <Card>
          <CardContent className="p-0">
            {SUPPORTED_LANGUAGES.map((language, index) => {
              const isSelected = currentLanguage === language.code;
              return (
                <View key={language.code}>
                  {index > 0 && <Separator />}
                  <TouchableOpacity
                    onPress={() => handleLanguageChange(language.code)}
                    className="flex-row items-center p-4"
                    activeOpacity={0.7}
                  >
                    <View className="flex-1">
                      <Text variant="body" className="font-medium mb-1">
                        {language.name}
                      </Text>
                      <Text variant="caption" className="text-gray-500">
                        {language.nativeName}
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

        {/* Info */}
        <Card className="mt-6 bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <Text variant="caption" className="text-blue-800">
              {t('profile.languageInfo', 'The app will be displayed in your selected language. You can change this anytime from settings.')}
            </Text>
          </CardContent>
        </Card>
      </View>
    </ScrollView>
  );
}
