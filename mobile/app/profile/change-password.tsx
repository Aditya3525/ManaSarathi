import { View, ScrollView, Alert } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { Lock, CheckCircle } from 'lucide-react-native';

import { Text } from '@/components/ui/Text';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { usersApi } from '@/services/api';

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Must contain at least one number'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type PasswordForm = z.infer<typeof passwordSchema>;

export default function ChangePasswordScreen() {
  const { t } = useTranslation();

  const { control, handleSubmit, watch, formState: { errors } } = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const newPassword = watch('newPassword');

  const passwordRequirements = [
    {
      label: t('auth.passwordLength', 'At least 8 characters'),
      met: newPassword.length >= 8,
    },
    {
      label: t('auth.passwordUppercase', 'One uppercase letter'),
      met: /[A-Z]/.test(newPassword),
    },
    {
      label: t('auth.passwordLowercase', 'One lowercase letter'),
      met: /[a-z]/.test(newPassword),
    },
    {
      label: t('auth.passwordNumber', 'One number'),
      met: /[0-9]/.test(newPassword),
    },
  ];

  const changePasswordMutation = useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      usersApi.changePassword(data.currentPassword, data.newPassword),
    onSuccess: () => {
      Alert.alert(
        t('common.success', 'Success'),
        t('profile.passwordChanged', 'Password changed successfully'),
        [{ text: t('common.ok', 'OK'), onPress: () => router.back() }]
      );
    },
    onError: (error: any) => {
      Alert.alert(
        t('common.error', 'Error'),
        error.message || t('profile.passwordError', 'Failed to change password')
      );
    },
  });

  const onSubmit = (data: PasswordForm) => {
    changePasswordMutation.mutate({
      currentPassword: data.currentPassword,
      newPassword: data.newPassword,
    });
  };

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="px-6 py-8">
        {/* Header */}
        <View className="mb-6">
          <View className="bg-primary-100 rounded-full w-16 h-16 items-center justify-center mb-4">
            <Lock size={32} color="#6366f1" />
          </View>
          <Text variant="h2" className="mb-2">
            {t('profile.changePassword', 'Change Password')}
          </Text>
          <Text variant="body" className="text-gray-600">
            {t('profile.passwordDescription', 'Choose a strong password to keep your account secure')}
          </Text>
        </View>

        {/* Form */}
        <View className="gap-4 mb-6">
          <View>
            <Text variant="body" className="mb-2 font-medium">
              {t('profile.currentPassword', 'Current Password')} *
            </Text>
            <Controller
              control={control}
              name="currentPassword"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder={t('profile.currentPasswordPlaceholder', 'Enter current password')}
                  secureTextEntry
                  error={errors.currentPassword?.message}
                />
              )}
            />
          </View>

          <View>
            <Text variant="body" className="mb-2 font-medium">
              {t('profile.newPassword', 'New Password')} *
            </Text>
            <Controller
              control={control}
              name="newPassword"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder={t('profile.newPasswordPlaceholder', 'Enter new password')}
                  secureTextEntry
                  error={errors.newPassword?.message}
                />
              )}
            />
          </View>

          <View>
            <Text variant="body" className="mb-2 font-medium">
              {t('profile.confirmPassword', 'Confirm New Password')} *
            </Text>
            <Controller
              control={control}
              name="confirmPassword"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder={t('profile.confirmPasswordPlaceholder', 'Confirm new password')}
                  secureTextEntry
                  error={errors.confirmPassword?.message}
                />
              )}
            />
          </View>
        </View>

        {/* Password Requirements */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <Text variant="body" className="font-medium mb-3">
              {t('auth.passwordRequirements', 'Password Requirements')}
            </Text>
            <View className="gap-2">
              {passwordRequirements.map((req, index) => (
                <View key={index} className="flex-row items-center gap-2">
                  <CheckCircle
                    size={16}
                    color={req.met ? '#10b981' : '#d1d5db'}
                  />
                  <Text
                    variant="caption"
                    className={req.met ? 'text-success-600' : 'text-gray-400'}
                  >
                    {req.label}
                  </Text>
                </View>
              ))}
            </View>
          </CardContent>
        </Card>

        {/* Actions */}
        <View className="gap-3">
          <Button
            variant="primary"
            size="lg"
            onPress={handleSubmit(onSubmit)}
            disabled={changePasswordMutation.isPending}
            fullWidth
          >
            {changePasswordMutation.isPending
              ? t('profile.changing', 'Changing...')
              : t('profile.changePassword', 'Change Password')}
          </Button>
          <Button
            variant="ghost"
            size="lg"
            onPress={() => router.back()}
            fullWidth
          >
            {t('common.cancel', 'Cancel')}
          </Button>
        </View>
      </View>
    </ScrollView>
  );
}
