import { useState } from 'react';
import { View, ScrollView, KeyboardAvoidingView, Platform, Alert, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Lock, User, Eye, EyeOff } from 'lucide-react-native';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Text } from '@/components/ui/Text';
import { useAuthStore } from '@/stores/authStore';
import { authService } from '@/services/auth';
import { useGoogleAuth } from '@/hooks/useGoogleAuth';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string()
    .min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterScreen() {
  const { t } = useTranslation();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { setUser, setLoading, setError } = useAuthStore();
  const { handleGoogleAuth } = useGoogleAuth();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const handleRegister = async (data: RegisterFormData) => {
    try {
      setIsLoading(true);
      setLoading(true);
      setError(null);

      const response = await authService.register(
        data.name,
        data.email,
        data.password
      );
      
      if (response.success && response.data?.user) {
        // Set user in auth store — the root layout auth guard will handle navigation
        // (new users have isOnboarded=false, so auth guard routes to onboarding)
        setUser(response.data.user);
      } else {
        // Handle failed registration (duplicate email, validation errors, etc.)
        const errorMessage = response.error || t('auth.registrationFailed', 'Registration failed. Please try again.');
        setError(errorMessage);
        Alert.alert(
          t('auth.registrationError', 'Registration Failed'),
          errorMessage
        );
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      const errorMessage = error.error || error.message || t('auth.registrationFailed', 'Registration failed. Please check your connection.');
      setError(errorMessage);
      Alert.alert(
        t('auth.registrationError', 'Registration Failed'),
        errorMessage
      );
    } finally {
      setIsLoading(false);
      setLoading(false);
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
            {t('auth.createAccount', 'Create Account')}
          </Text>
          <Text variant="body" className="text-gray-600">
            {t('auth.registerSubtitle', 'Join us to start your mental wellness journey')}
          </Text>
        </View>

        <View className="gap-4 mb-6">
          <Controller
            control={control}
            name="name"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label={t('auth.name', 'Full Name')}
                placeholder={t('auth.namePlaceholder', 'Enter your name')}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.name?.message}
                autoCapitalize="words"
                autoComplete="name"
                leftIcon={<User size={20} color="#9ca3af" />}
              />
            )}
          />

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
            render={({ field: { onChange, onBlur, value } }) => {
              const getStrength = (pw: string) => {
                if (pw.length === 0) return { strength: 0, label: '', color: '#9ca3af' };
                if (pw.length < 6) return { strength: 25, label: 'Too short', color: '#ef4444' };
                if (pw.length < 8) return { strength: 50, label: 'Fair', color: '#eab308' };
                if (pw.length >= 8 && /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(pw)) {
                  return { strength: 100, label: 'Strong', color: '#22c55e' };
                }
                return { strength: 75, label: 'Good', color: '#3b82f6' };
              };
              const strength = getStrength(value);
              return (
                <View>
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
                    helperText={t('auth.passwordRequirements', 'At least 6 characters (8+ with mixed case & number recommended)')}
                  />
                  {value.length > 0 && (
                    <View className="mt-2">
                      <View className="flex-row justify-between items-center mb-1">
                        <Text variant="caption" className="text-gray-500">
                          {t('auth.passwordStrength', 'Password strength:')}
                        </Text>
                        <Text variant="caption" style={{ color: strength.color }}>
                          {strength.label}
                        </Text>
                      </View>
                      <View className="h-1 bg-gray-200 rounded-full overflow-hidden">
                        <View
                          className="h-1 rounded-full"
                          style={{
                            width: `${strength.strength}%`,
                            backgroundColor: strength.color,
                          }}
                        />
                      </View>
                    </View>
                  )}
                </View>
              );
            }}
          />

          <Controller
            control={control}
            name="confirmPassword"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label={t('auth.confirmPassword', 'Confirm Password')}
                placeholder={t('auth.confirmPasswordPlaceholder', 'Re-enter your password')}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.confirmPassword?.message}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                autoComplete="password"
                leftIcon={<Lock size={20} color="#9ca3af" />}
                rightIcon={
                  <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                    {showConfirmPassword ? (
                      <EyeOff size={20} color="#9ca3af" />
                    ) : (
                      <Eye size={20} color="#9ca3af" />
                    )}
                  </TouchableOpacity>
                }
              />
            )}
          />
        </View>

        <View className="mb-6">
          <Text variant="caption" className="text-gray-600 text-center mb-4">
            {t('auth.termsAgreement', 'By creating an account, you agree to our Terms of Service and Privacy Policy')}
          </Text>

          <Button
            variant="primary"
            size="lg"
            onPress={handleSubmit(handleRegister)}
            loading={isLoading}
            disabled={isLoading}
            fullWidth
          >
            {t('auth.signUp', 'Sign Up')}
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
            {t('auth.haveAccount', 'Already have an account?')}
          </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
            <Text variant="body" className="text-primary-600 font-semibold">
              {t('auth.login', 'Login')}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
