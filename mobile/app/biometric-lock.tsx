import { View, AppState, AppStateStatus } from 'react-native';
import { useEffect, useState, useRef, useCallback } from 'react';
import { router, useSegments } from 'expo-router';
import * as LocalAuthentication from 'expo-local-authentication';
import { useTranslation } from 'react-i18next';
import { Lock } from 'lucide-react-native';

import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { AppSettings } from '@/utils/storage';

const BIOMETRIC_LOCK_TIMEOUT = 30000; // 30 seconds

export default function BiometricLockScreen() {
  const { t } = useTranslation();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isBiometricAvailable, setIsBiometricAvailable] = useState(false);
  const appState = useRef(AppState.currentState);
  const lastBackgroundTime = useRef<number>(0);
  const segments = useSegments();

  const checkBiometricAvailability = useCallback(async () => {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      setIsBiometricAvailable(compatible && enrolled);
    } catch (error) {
      console.error('Error checking biometric availability:', error);
      setIsBiometricAvailable(false);
    }
  }, []);

  const attemptBiometricAuth = useCallback(async () => {
    try {
      const biometricEnabled = await AppSettings.isBiometricEnabled();
      
      if (!biometricEnabled) {
        setIsAuthenticated(true);
        return;
      }

      const compatible = await LocalAuthentication.hasHardwareAsync();
      if (!compatible) {
        setError(t('biometric.notAvailable', 'Biometric authentication not available on this device'));
        return;
      }

      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!enrolled) {
        setError(t('biometric.notEnrolled', 'No biometric credentials enrolled'));
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: t('biometric.prompt', 'Authenticate to access ManaSarathi'),
        fallbackLabel: t('biometric.fallback', 'Use passcode'),
        disableDeviceFallback: false,
      });

      if (result.success) {
        setIsAuthenticated(true);
        setError(null);
      } else {
        setError(t('biometric.failed', 'Authentication failed. Please try again.'));
      }
    } catch (error) {
      console.error('Biometric auth error:', error);
      setError(t('biometric.error', 'An error occurred. Please try again.'));
    }
  }, [t]);

  const handleAppStateChange = useCallback(async (nextAppState: AppStateStatus) => {
    if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
      const timeSinceBackground = Date.now() - lastBackgroundTime.current;
      
      if (timeSinceBackground > BIOMETRIC_LOCK_TIMEOUT) {
        setIsAuthenticated(false);
        attemptBiometricAuth();
      }
    } else if (nextAppState.match(/inactive|background/)) {
      lastBackgroundTime.current = Date.now();
    }

    appState.current = nextAppState;
  }, [attemptBiometricAuth]);

  useEffect(() => {
    checkBiometricAvailability();
    attemptBiometricAuth();

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [checkBiometricAvailability, attemptBiometricAuth, handleAppStateChange]);

  const handleRetry = () => {
    setError(null);
    attemptBiometricAuth();
  };

  if (isAuthenticated) {
    return null; // Don't render anything if authenticated
  }

  return (
    <View className="flex-1 bg-gray-50 items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardContent className="p-8 items-center">
          {/* Lock Icon */}
          <View className="bg-primary-100 rounded-full w-20 h-20 items-center justify-center mb-6">
            <Lock size={40} color="#6366f1" />
          </View>

          {/* Title */}
          <Text variant="h2" className="text-center mb-2">
            {t('biometric.appLocked', 'App Locked')}
          </Text>

          {/* Description */}
          <Text variant="body" className="text-gray-600 text-center mb-6">
            {isBiometricAvailable
              ? t('biometric.useToUnlock', 'Use biometric authentication to unlock the app')
              : t('biometric.notAvailableDescription', 'Biometric authentication is enabled but not available on this device')}
          </Text>

          {/* Error Message */}
          {error && (
            <View className="bg-danger-50 border border-danger-200 rounded-lg p-3 mb-6 w-full">
              <Text variant="caption" className="text-danger-800 text-center">
                {error}
              </Text>
            </View>
          )}

          {/* Actions */}
          {isBiometricAvailable ? (
            <Button
              variant="primary"
              size="lg"
              onPress={handleRetry}
              fullWidth
            >
              {t('biometric.authenticate', 'Authenticate')}
            </Button>
          ) : (
            <Button
              variant="outline"
              size="lg"
              onPress={() => {
                // Disable biometric and allow access
                AppSettings.setBiometricEnabled(false);
                setIsAuthenticated(true);
              }}
              fullWidth
            >
              {t('biometric.disableLock', 'Disable Biometric Lock')}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Info */}
      <Text variant="caption" className="text-gray-500 text-center mt-6">
        {t('biometric.dataProtected', 'Your data is protected with device security')}
      </Text>
    </View>
  );
}
