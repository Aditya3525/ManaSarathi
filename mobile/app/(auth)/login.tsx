import { useState } from 'react';
import { View, ScrollView, KeyboardAvoidingView, Platform, Alert, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Text } from '@/components/ui/Text';
import { useAuthStore } from '@/stores/authStore';
import { authService } from '@/services/auth';
import { AppSettings } from '@/utils/storage';
import { useGoogleAuth } from '@/hooks/useGoogleAuth';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const { t } = useTranslation();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { setUser, setLoading, setError } = useAuthStore();
  const { handleGoogleAuth } = useGoogleAuth();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const handleLogin = async (data: LoginFormData) => {
    try {
      setIsLoading(true);
      setLoading(true);
      setError(null);

      const response = await authService.login(data.email, data.password);
      
      if (response.success && response.data?.user) {
        // Set user in auth store — the root layout auth guard will handle navigation
        setUser(response.data.user);
      } else {
        // Handle failed login response (wrong credentials, etc.)
        const errorMessage = response.error || t('auth.loginFailed', 'Invalid email or password. Please try again.');
        setError(errorMessage);
        Alert.alert(
          t('auth.loginError', 'Login Failed'),
          errorMessage
        );
      }
    } catch (error: any) {
      console.error('Login error:', error);
      const errorMessage = error.error || error.message || t('auth.loginFailed', 'Login failed. Please check your connection.');
      setError(errorMessage);
      Alert.alert(
        t('auth.loginError', 'Login Failed'),
        errorMessage
      );
    } finally {
      setIsLoading(false);
      setLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    try {
      const settings = await AppSettings.get();
      
      if (!settings.biometricEnabled) {
        Alert.alert(
          t('auth.biometric.notEnabled', 'Biometric Login Not Enabled'),
          t('auth.biometric.enableFirst', 'Please login with your password first to enable biometric authentication')
        );
        return;
      }

      const token = await authService.authenticateAndGetToken();
      
      if (token) {
        // Token is already set, just need to fetch user
        const user = await authService.getCurrentUser();
        
        if (user) {
          // Set user in auth store — the root layout auth guard will handle navigation
          setUser(user);
        }
      }
    } catch (error: any) {
      console.error('Biometric login error:', error);
      Alert.alert(
        t('auth.biometric.error', 'Biometric Authentication Failed'),
        error.message || 'Please try again or use password login'
      );
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-white"
    >
      <ScrollView 
        className="flex-1"
        contentContainerClassName="px-6 py-8"
        keyboardShouldPersistTaps="handled"
      >
        <View className="mb-8">
          <Text variant="h2" className="mb-2">
            {t('auth.welcomeBack', 'Welcome Back')}
          </Text>
          <Text variant="body" className="text-gray-600">
            {t('auth.loginSubtitle', 'Sign in to continue your wellness journey')}
          </Text>
        </View>

        <View className="gap-4 mb-6">
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label={t('auth.email', 'Email')}
                placeholder={t('auth.emailPlaceholder', 'Enter your email')}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.email?.message}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                leftIcon={<Mail size={20} color="#9ca3af" />}
              />
            )}
          />

          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label={t('auth.password', 'Password')}
                placeholder={t('auth.passwordPlaceholder', 'Enter your password')}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.password?.message}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoComplete="password"
                leftIcon={<Lock size={20} color="#9ca3af" />}
                rightIcon={
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    {showPassword ? (
                      <EyeOff size={20} color="#9ca3af" />
                    ) : (
                      <Eye size={20} color="#9ca3af" />
                    )}
                  </TouchableOpacity>
                }
              />
            )}
          />

          <TouchableOpacity 
            onPress={() => router.push('/(auth)/forgot-password')}
            className="self-end"
          >
            <Text variant="caption" className="text-primary-600">
              {t('auth.forgotPassword', 'Forgot Password?')}
            </Text>
          </TouchableOpacity>
        </View>

        <View className="gap-3 mb-6">
          <Button
            variant="primary"
            size="lg"
            onPress={handleSubmit(handleLogin)}
            loading={isLoading}
            disabled={isLoading}
            fullWidth
          >
            {t('auth.login', 'Login')}
          </Button>

          <Button
            variant="outline"
            size="lg"
            onPress={handleBiometricLogin}
            disabled={isLoading}
            fullWidth
          >
            {t('auth.biometric.login', 'Login with Biometrics')}
          </Button>

          {/* Divider */}
          <View className="flex-row items-center my-2">
            <View className="flex-1 h-px bg-gray-200" />
            <Text variant="caption" className="mx-4 text-gray-400">
              {t('auth.or', 'OR')}
            </Text>
            <View className="flex-1 h-px bg-gray-200" />
          </View>

          {/* Google OAuth */}
          <Button
            variant="outline"
            size="lg"
            onPress={handleGoogleAuth}
            disabled={isLoading}
            fullWidth
          >
            {t('auth.continueWithGoogle', 'Continue with Google')}
          </Button>
        </View>

        <View className="flex-row justify-center items-center">
          <Text variant="body" className="text-gray-600 mr-2">
            {t('auth.noAccount', "Don't have an account?")}
          </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
            <Text variant="body" className="text-primary-600 font-semibold">
              {t('auth.signUp', 'Sign Up')}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
