import { useState } from 'react';
import { View, ScrollView, KeyboardAvoidingView, Platform, Alert, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Shield, Lock, Eye, EyeOff, CheckCircle, AlertTriangle } from 'lucide-react-native';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Text } from '@/components/ui/Text';
import { Card, CardContent } from '@/components/ui/Card';
import { useAuthStore } from '@/stores/authStore';
import { authApi } from '@/services/api';

const passwordSetupSchema = z.object({
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type PasswordSetupFormData = z.infer<typeof passwordSetupSchema>;

export default function PasswordSetupScreen() {
  const { t } = useTranslation();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { user, updateUser } = useAuthStore();

  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<PasswordSetupFormData>({
    resolver: zodResolver(passwordSetupSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  const watchedPassword = watch('password');
  const watchedConfirm = watch('confirmPassword');

  const getPasswordStrength = (pw: string) => {
    if (pw.length === 0) return { strength: 0, label: '', color: '#9ca3af' };
    if (pw.length < 6) return { strength: 25, label: t('auth.tooShort', 'Too short'), color: '#ef4444' };
    if (pw.length < 8) return { strength: 50, label: t('auth.fair', 'Fair'), color: '#eab308' };
    if (pw.length >= 8 && /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(pw)) {
      return { strength: 100, label: t('auth.strong', 'Strong'), color: '#22c55e' };
    }
    return { strength: 75, label: t('auth.good', 'Good'), color: '#3b82f6' };
  };

  const strength = getPasswordStrength(watchedPassword || '');
  const passwordsMatch = watchedPassword === watchedConfirm && watchedConfirm.length > 0;

  const handleSetupPassword = async (data: PasswordSetupFormData) => {
    try {
      setIsLoading(true);
      
      await authApi.setupPassword(data.password);
      
      if (user) {
        updateUser({ ...user, hasPassword: true } as any);
      }

      // Navigate to onboarding or main app
      if (user && !user.isOnboarded) {
        router.replace('/(onboarding)');
      } else {
        router.replace('/(tabs)');
      }
    } catch (error: any) {
      console.error('Password setup error:', error);
      Alert.alert(
        t('auth.setupError', 'Setup Failed'),
        error.response?.data?.message || error.message || 'Failed to set up password'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    if (user && !user.isOnboarded) {
      router.replace('/(onboarding)');
    } else {
      router.replace('/(tabs)');
    }
  };

  const userName = user?.name || user?.firstName || t('auth.there', 'there');

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
        {/* Header */}
        <View className="items-center mb-8">
          <View className="bg-primary-100 rounded-full p-5 mb-4">
            <Shield size={40} color="#6366f1" />
          </View>
          <Text variant="h2" className="text-center mb-2">
            {t('auth.secureAccount', 'Secure Your Account')}
          </Text>
          <Text variant="body" className="text-gray-600 text-center">
            {t('auth.secureAccountDesc', `Hi ${userName}! To keep your wellbeing data safe, please set up a secure password.`)}
          </Text>
        </View>

        <View className="gap-4 mb-6">
          {/* Password */}
          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <View>
                <Input
                  label={t('auth.createPassword', 'Create Password')}
                  placeholder={t('auth.passwordPlaceholder', 'Enter your password')}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.password?.message}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoComplete="password-new"
                  leftIcon={<Lock size={20} color="#9ca3af" />}
                  rightIcon={
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff size={20} color="#9ca3af" /> : <Eye size={20} color="#9ca3af" />}
                    </TouchableOpacity>
                  }
                />
                {/* Strength indicator */}
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
                    <View className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <View
                        className="h-1.5 rounded-full"
                        style={{
                          width: `${strength.strength}%`,
                          backgroundColor: strength.color,
                        }}
                      />
                    </View>
                  </View>
                )}
              </View>
            )}
          />

          {/* Confirm Password */}
          <Controller
            control={control}
            name="confirmPassword"
            render={({ field: { onChange, onBlur, value } }) => (
              <View>
                <Input
                  label={t('auth.confirmPassword', 'Confirm Password')}
                  placeholder={t('auth.confirmPasswordPlaceholder', 'Re-enter your password')}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.confirmPassword?.message}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  autoComplete="password-new"
                  leftIcon={<Lock size={20} color="#9ca3af" />}
                  rightIcon={
                    <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                      {showConfirmPassword ? <EyeOff size={20} color="#9ca3af" /> : <Eye size={20} color="#9ca3af" />}
                    </TouchableOpacity>
                  }
                />
                {/* Match indicator */}
                {value.length > 0 && (
                  <View className="flex-row items-center mt-2">
                    {passwordsMatch ? (
                      <>
                        <CheckCircle size={16} color="#22c55e" />
                        <Text variant="caption" className="text-green-600 ml-2">
                          {t('auth.passwordsMatch', 'Passwords match')}
                        </Text>
                      </>
                    ) : (
                      <>
                        <AlertTriangle size={16} color="#ef4444" />
                        <Text variant="caption" className="text-red-600 ml-2">
                          {t('auth.passwordsDontMatch', "Passwords don't match")}
                        </Text>
                      </>
                    )}
                  </View>
                )}
              </View>
            )}
          />
        </View>

        {/* Requirements checklist */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <Text variant="label" className="mb-3">
              {t('auth.requirements', 'Password requirements:')}
            </Text>
            <View className="gap-2">
              <View className="flex-row items-center">
                {(watchedPassword || '').length >= 6 ? (
                  <CheckCircle size={14} color="#22c55e" />
                ) : (
                  <View className="w-3.5 h-3.5 rounded-full border border-gray-300" />
                )}
                <Text variant="caption" className="text-gray-600 ml-2">
                  {t('auth.req6Chars', 'At least 6 characters')}
                </Text>
              </View>
              <View className="flex-row items-center">
                {/(?=.*[a-z])(?=.*[A-Z])/.test(watchedPassword || '') ? (
                  <CheckCircle size={14} color="#22c55e" />
                ) : (
                  <View className="w-3.5 h-3.5 rounded-full border border-gray-300" />
                )}
                <Text variant="caption" className="text-gray-600 ml-2">
                  {t('auth.reqMixedCase', 'Mix of uppercase and lowercase (recommended)')}
                </Text>
              </View>
              <View className="flex-row items-center">
                {/(?=.*\d)/.test(watchedPassword || '') ? (
                  <CheckCircle size={14} color="#22c55e" />
                ) : (
                  <View className="w-3.5 h-3.5 rounded-full border border-gray-300" />
                )}
                <Text variant="caption" className="text-gray-600 ml-2">
                  {t('auth.reqNumber', 'At least one number (recommended)')}
                </Text>
              </View>
            </View>
          </CardContent>
        </Card>

        <View className="gap-3">
          <Button
            variant="primary"
            size="lg"
            onPress={handleSubmit(handleSetupPassword)}
            loading={isLoading}
            disabled={isLoading}
            fullWidth
          >
            {t('auth.secureMyAccount', 'Secure My Account')}
          </Button>

          <Button
            variant="ghost"
            size="lg"
            onPress={handleSkip}
            disabled={isLoading}
            fullWidth
          >
            {t('auth.skipForNow', 'Skip for now')}
          </Button>
        </View>

        <Text variant="caption" className="text-gray-400 text-center mt-4">
          {t('auth.encryptedNote', 'Your password is encrypted and securely stored.')}
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
