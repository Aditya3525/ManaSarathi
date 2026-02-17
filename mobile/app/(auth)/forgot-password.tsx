import { useState } from 'react';
import { View, ScrollView, KeyboardAvoidingView, Platform, Alert, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, CheckCircle, KeyRound, Lock, Eye, EyeOff, ChevronLeft } from 'lucide-react-native';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Text } from '@/components/ui/Text';
import { Card, CardContent } from '@/components/ui/Card';
import { authApi } from '@/services/api';

// Step types
type Step = 'request' | 'verify' | 'success';

// Step 1: Email
const emailSchema = z.object({
  email: z.string().email('Invalid email address'),
});

// Step 2: Security answer + new password
const verifySchema = z.object({
  answer: z.string().min(1, 'Please provide your answer'),
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type EmailFormData = z.infer<typeof emailSchema>;
type VerifyFormData = z.infer<typeof verifySchema>;

export default function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>('request');
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmailState] = useState('');
  const [securityQuestion, setSecurityQuestion] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Step 1 form
  const emailForm = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: '' },
  });

  // Step 2 form
  const verifyForm = useForm<VerifyFormData>({
    resolver: zodResolver(verifySchema),
    defaultValues: { answer: '', newPassword: '', confirmPassword: '' },
  });

  // Step 1: Request security question
  const handleRequestQuestion = async (data: EmailFormData) => {
    try {
      setIsLoading(true);
      setEmailState(data.email);

      const response = await authApi.requestSecurityQuestion(data.email);

      if (response?.data?.questionAvailable && response?.data?.question) {
        setSecurityQuestion(response.data.question);
        setStep('verify');
      } else {
        // No security question set — show helpful message
        Alert.alert(
          t('auth.noSecurityQuestion', 'No Security Question'),
          t('auth.noSecurityQuestionDesc', 'No security question is set for this account. Please contact support at support@maansarathi.app for assistance.')
        );
      }
    } catch (error: any) {
      console.error('Security question request error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to look up security question';
      Alert.alert(
        t('auth.forgotPasswordError', 'Request Failed'),
        errorMessage
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Verify answer and reset password
  const handleResetPassword = async (data: VerifyFormData) => {
    try {
      setIsLoading(true);

      await authApi.resetPasswordWithSecurityAnswer({
        email,
        answer: data.answer,
        newPassword: data.newPassword,
      });

      setStep('success');
    } catch (error: any) {
      console.error('Password reset error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Security verification failed';
      Alert.alert(
        t('auth.resetError', 'Reset Failed'),
        errorMessage
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Password strength helper
  const getPasswordStrength = (password: string) => {
    if (password.length === 0) return { strength: 0, label: '', color: '#9ca3af' };
    if (password.length < 6) return { strength: 25, label: t('auth.tooShort', 'Too short'), color: '#ef4444' };
    if (password.length < 8) return { strength: 50, label: t('auth.fair', 'Fair'), color: '#eab308' };
    if (password.length >= 8 && /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      return { strength: 100, label: t('auth.strong', 'Strong'), color: '#22c55e' };
    }
    return { strength: 75, label: t('auth.good', 'Good'), color: '#3b82f6' };
  };

  // Step 3: Success
  if (step === 'success') {
    return (
      <View className="flex-1 bg-white px-6 justify-center items-center">
        <View className="bg-success-50 rounded-full p-6 mb-6">
          <CheckCircle size={64} color="#10b981" />
        </View>

        <Text variant="h2" className="text-center mb-4">
          {t('auth.passwordUpdated', 'Password Updated!')}
        </Text>

        <Text variant="body" className="text-center text-gray-600 mb-8">
          {t('auth.passwordUpdatedDesc', 'Your password has been successfully reset. You can now sign in with your new password.')}
        </Text>

        <View className="w-full gap-3">
          <Button
            variant="primary"
            size="lg"
            onPress={() => router.replace('/(auth)/login')}
            fullWidth
          >
            {t('auth.backToLogin', 'Back to Login')}
          </Button>
        </View>
      </View>
    );
  }

  // Step 2: Verify security answer + new password
  if (step === 'verify') {
    const watchedPassword = verifyForm.watch('newPassword');
    const strength = getPasswordStrength(watchedPassword || '');

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
          <View className="flex-row items-center mb-6">
            <View className="bg-primary-100 rounded-full p-3 mr-4">
              <KeyRound size={28} color="#6366f1" />
            </View>
            <View className="flex-1">
              <Text variant="h3" className="mb-1">
                {t('auth.verifyIdentity', 'Verify Your Identity')}
              </Text>
              <Text variant="caption" className="text-gray-600">
                {t('auth.answerAndReset', 'Answer your security question and set a new password')}
              </Text>
            </View>
          </View>

          {/* Security Question Display */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <Text variant="caption" className="text-gray-500 mb-1">
                {t('auth.securityQuestion', 'Security Question')}
              </Text>
              <Text variant="body" className="text-gray-800 font-medium">
                {securityQuestion}
              </Text>
            </CardContent>
          </Card>

          <View className="gap-4 mb-6">
            {/* Security Answer */}
            <Controller
              control={verifyForm.control}
              name="answer"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label={t('auth.yourAnswer', 'Your Answer')}
                  placeholder={t('auth.answerPlaceholder', 'Type the answer you provided')}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={verifyForm.formState.errors.answer?.message}
                  autoCapitalize="none"
                />
              )}
            />

            {/* Separator */}
            <View className="h-px bg-gray-200 my-2" />

            {/* New Password */}
            <Controller
              control={verifyForm.control}
              name="newPassword"
              render={({ field: { onChange, onBlur, value } }) => (
                <View>
                  <Input
                    label={t('auth.newPassword', 'New Password')}
                    placeholder={t('auth.newPasswordPlaceholder', 'Enter a new password')}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={verifyForm.formState.errors.newPassword?.message}
                    secureTextEntry={!showNewPassword}
                    autoCapitalize="none"
                    autoComplete="password-new"
                    leftIcon={<Lock size={20} color="#9ca3af" />}
                    rightIcon={
                      <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)}>
                        {showNewPassword ? <EyeOff size={20} color="#9ca3af" /> : <Eye size={20} color="#9ca3af" />}
                      </TouchableOpacity>
                    }
                  />
                  {/* Password Strength Indicator */}
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
              )}
            />

            {/* Confirm Password */}
            <Controller
              control={verifyForm.control}
              name="confirmPassword"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label={t('auth.confirmNewPassword', 'Confirm New Password')}
                  placeholder={t('auth.confirmNewPasswordPlaceholder', 'Re-enter the new password')}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={verifyForm.formState.errors.confirmPassword?.message}
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
              )}
            />
          </View>

          <View className="gap-3">
            <Button
              variant="primary"
              size="lg"
              onPress={verifyForm.handleSubmit(handleResetPassword)}
              loading={isLoading}
              disabled={isLoading}
              fullWidth
            >
              {t('auth.resetPassword', 'Reset Password')}
            </Button>

            <Button
              variant="outline"
              size="lg"
              onPress={() => setStep('request')}
              disabled={isLoading}
              fullWidth
              leftIcon={<ChevronLeft size={20} color="#6366f1" />}
            >
              {t('nav.back', 'Back')}
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // Step 1: Request (enter email)
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
          <View className="bg-primary-100 rounded-full p-4 self-center mb-4">
            <Mail size={40} color="#6366f1" />
          </View>
          <Text variant="h2" className="mb-2 text-center">
            {t('auth.forgotPassword', 'Forgot Password?')}
          </Text>
          <Text variant="body" className="text-gray-600 text-center">
            {t('auth.forgotPasswordSubtitle', "We'll use your security question to verify your identity and reset your password.")}
          </Text>
        </View>

        <View className="gap-4 mb-6">
          <Controller
            control={emailForm.control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label={t('auth.email', 'Email')}
                placeholder={t('auth.emailPlaceholder', 'Enter your registered email')}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={emailForm.formState.errors.email?.message}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                leftIcon={<Mail size={20} color="#9ca3af" />}
              />
            )}
          />
        </View>

        <View className="gap-3">
          <Button
            variant="primary"
            size="lg"
            onPress={emailForm.handleSubmit(handleRequestQuestion)}
            loading={isLoading}
            disabled={isLoading}
            fullWidth
          >
            {t('auth.continue', 'Continue')}
          </Button>

          <Button
            variant="outline"
            size="lg"
            onPress={() => router.back()}
            disabled={isLoading}
            fullWidth
          >
            {t('nav.back', 'Back')}
          </Button>
        </View>

        {/* Info card */}
        <Card className="mt-6">
          <CardContent className="p-4">
            <Text variant="caption" className="text-gray-500 text-center">
              {t('auth.securityQuestionInfo', "We use your security question to verify it's really you before resetting your password. If you haven't set one, please contact support.")}
            </Text>
          </CardContent>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
