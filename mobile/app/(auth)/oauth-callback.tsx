import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Text } from '@/components/ui/Text';
import { useAuthStore } from '@/stores/authStore';
import { authApi } from '@/services/api';
import { TokenManager } from '@/utils/storage';

export default function OAuthCallbackScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ code?: string; token?: string; error?: string }>();
  const { setUser, setError } = useAuthStore();

  useEffect(() => {
    handleOAuthCallback();
  }, []);

  const handleOAuthCallback = async () => {
    try {
      if (params.error) {
        setError(params.error);
        router.replace('/(auth)/login');
        return;
      }

      // The backend redirects mobile clients with a `token` query param.
      // Handle it directly instead of requiring a code exchange.
      if (params.token) {
        await TokenManager.setToken(params.token);
        const userResponse = await authApi.getCurrentUser();

        if (userResponse.success && userResponse.data?.user) {
          setUser(userResponse.data.user);
          if (!userResponse.data.user.isOnboarded) {
            router.replace('/(onboarding)');
          } else {
            router.replace('/(tabs)');
          }
        } else {
          throw new Error('Could not fetch your profile');
        }
        return;
      }

      // Legacy: code exchange path (kept for backwards compatibility)
      if (!params.code) {
        setError('Invalid OAuth callback');
        router.replace('/(auth)/login');
        return;
      }

      // Exchange code for tokens
      const response = await authApi.googleAuth(params.code);
      
      if (response.success && response.data) {
        // Token is already stored by authApi.googleAuth
        setUser(response.data.user);
        
        if (!response.data.user.isOnboarded) {
          router.replace('/(onboarding)');
        } else {
          router.replace('/(tabs)');
        }
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error: any) {
      console.error('OAuth callback error:', error);
      setError(error.message || 'Authentication failed');
      router.replace('/(auth)/login');
    }
  };

  return (
    <View className="flex-1 bg-white justify-center items-center px-6">
      <ActivityIndicator size="large" color="#6366f1" />
      <Text variant="body" className="text-gray-600 mt-4">
        {t('auth.signingIn', 'Signing you in...')}
      </Text>
    </View>
  );
}
