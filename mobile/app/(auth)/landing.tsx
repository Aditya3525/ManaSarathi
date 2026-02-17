import { View, Image, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Sparkles, Heart, Brain, Shield } from 'lucide-react-native';

import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';

export default function LandingScreen() {
  const { t } = useTranslation();

  const features = [
    {
      icon: Brain,
      title: t('landing.features.assessment.title', 'Smart Assessments'),
      description: t('landing.features.assessment.description', 'Track your mental wellness with validated tools'),
    },
    {
      icon: Heart,
      title: t('landing.features.personalized.title', 'Personalized Care'),
      description: t('landing.features.personalized.description', 'Get recommendations tailored to your needs'),
    },
    {
      icon: Sparkles,
      title: t('landing.features.practices.title', 'Guided Practices'),
      description: t('landing.features.practices.description', 'Learn mindfulness and coping techniques'),
    },
    {
      icon: Shield,
      title: t('landing.features.support.title', '24/7 Support'),
      description: t('landing.features.support.description', 'Access help resources anytime you need them'),
    },
  ];

  return (
    <ScrollView className="flex-1 bg-white">
      <View className="flex-1 px-6 pt-16 pb-8">
        {/* Hero Section */}
        <View className="items-center mb-12">
          <View className="bg-primary-50 rounded-full p-6 mb-6">
            <Brain size={64} color="#6366f1" />
          </View>
          
          <Text variant="h1" className="text-center mb-4 text-primary-600">
            {t('app.name', 'MaanSarathi')}
          </Text>
          
          <Text variant="body" className="text-center text-gray-600 mb-2">
            {t('landing.tagline', 'Your Mental Wellness Companion')}
          </Text>
          
          <Text variant="caption" className="text-center text-gray-500 max-w-sm">
            {t('landing.subtitle', 'Evidence-based tools and personalized support for your mental health journey')}
          </Text>
        </View>

        {/* Features Grid */}
        <View className="mb-12">
          <Text variant="h3" className="text-center mb-6">
            {t('landing.featuresTitle', 'How We Help')}
          </Text>
          
          <View className="gap-4">
            {features.map((feature, index) => {
              const IconComponent = feature.icon;
              return (
                <View 
                  key={index}
                  className="bg-gray-50 rounded-2xl p-5 flex-row items-start"
                >
                  <View className="bg-primary-100 rounded-xl p-3 mr-4">
                    <IconComponent size={24} color="#6366f1" />
                  </View>
                  <View className="flex-1">
                    <Text variant="label" className="mb-1 text-gray-900">
                      {feature.title}
                    </Text>
                    <Text variant="caption" className="text-gray-600">
                      {feature.description}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* CTA Buttons */}
        <View className="gap-3 mb-6">
          <Button
            variant="primary"
            size="lg"
            onPress={() => router.push('/(auth)/register')}
            fullWidth
          >
            {t('auth.getStarted', 'Get Started')}
          </Button>
          
          <Button
            variant="outline"
            size="lg"
            onPress={() => router.push('/(auth)/login')}
            fullWidth
          >
            {t('auth.login', 'Login')}
          </Button>
        </View>

        {/* Footer */}
        <Text variant="caption" className="text-center text-gray-500">
          {t('landing.footer', 'By continuing, you agree to our Terms of Service and Privacy Policy')}
        </Text>
      </View>
    </ScrollView>
  );
}
