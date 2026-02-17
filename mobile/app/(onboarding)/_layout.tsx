import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function OnboardingLayout() {
  const { t } = useTranslation();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: {
          backgroundColor: '#ffffff',
        },
      }}
    >
      <Stack.Screen 
        name="index" 
        options={{ 
          title: t('onboarding.title', 'Welcome'),
          gestureEnabled: false,
        }} 
      />
    </Stack>
  );
}
