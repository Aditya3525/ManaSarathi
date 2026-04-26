import { useCallback } from 'react';
import { Alert } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { useTranslation } from 'react-i18next';

import { useAuthStore } from '@/stores/authStore';
import { API_BASE_URL } from '@/constants/config';

/**
 * Shared Google OAuth hook used by both Login and Register screens.
 * Opens Google's OAuth consent screen via WebBrowser, parses the callback,
 * stores the token, fetches the user profile, and sets auth state.
 */
export function useGoogleAuth() {
  const { t } = useTranslation();
  const { setUser } = useAuthStore();

  const handleGoogleAuth = useCallback(async () => {
    try {
      const baseUrl = API_BASE_URL.replace('/api', '');
      const authUrl = `${baseUrl}/api/auth/google?platform=mobile`;
      const redirectUrl = 'manasarthi://auth/callback';

      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);

      if (result.type === 'success' && result.url) {
        const parsed = Linking.parse(result.url);
        const token = parsed.queryParams?.token as string | undefined;
        const error = parsed.queryParams?.error as string | undefined;

        if (error) {
          Alert.alert(t('auth.oauthError', 'Google Sign-In Failed'), error);
          return;
        }

        if (token) {
          const { TokenManager } = await import('@/utils/storage');
          await TokenManager.setToken(token);

          const { authApi } = await import('@/services/api');
          const userResponse = await authApi.getCurrentUser();

          if (userResponse.success && userResponse.data?.user) {
            setUser(userResponse.data.user);
          } else {
            Alert.alert(
              t('auth.oauthError', 'Google Sign-In Failed'),
              t('auth.profileFetchFailed', 'Could not fetch your profile.')
            );
          }
        }
      }
      // result.type === 'cancel' → user cancelled, do nothing
    } catch (error: any) {
      console.error('Google auth error:', error);
      Alert.alert(
        t('auth.oauthError', 'Google Sign-In Failed'),
        error.message || 'Please try again'
      );
    }
  }, [setUser, t]);

  return { handleGoogleAuth };
}
