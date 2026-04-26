import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function AuthLayout() {
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
        name="landing" 
        options={{ 
          title: t('app.name', 'ManaSarathi'),
        }} 
      />
      <Stack.Screen 
        name="login" 
        options={{ 
          title: t('auth.login', 'Login'),
          headerShown: true,
          headerBackTitle: t('nav.back', 'Back'),
        }} 
      />
      <Stack.Screen 
        name="register" 
        options={{ 
          title: t('auth.register', 'Sign Up'),
          headerShown: true,
          headerBackTitle: t('nav.back', 'Back'),
        }} 
      />
      <Stack.Screen 
        name="forgot-password" 
        options={{ 
          title: t('auth.forgotPassword', 'Reset Password'),
          headerShown: true,
          headerBackTitle: t('nav.back', 'Back'),
        }} 
      />
      <Stack.Screen 
        name="password-setup" 
        options={{ 
          title: t('auth.setupPassword', 'Set Up Password'),
          headerShown: true,
          headerBackTitle: t('nav.back', 'Back'),
        }} 
      />
      <Stack.Screen 
        name="security-question" 
        options={{ 
          title: t('auth.securityQuestion', 'Security Question'),
          headerShown: true,
          headerBackTitle: t('nav.back', 'Back'),
        }} 
      />
      <Stack.Screen 
        name="oauth-callback" 
        options={{ 
          title: t('auth.signingIn', 'Signing In...'),
          headerShown: false,
        }} 
      />
    </Stack>
  );
}
