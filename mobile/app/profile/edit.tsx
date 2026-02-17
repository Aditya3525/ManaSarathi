import { View, ScrollView, Alert } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { Text } from '@/components/ui/Text';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Separator } from '@/components/ui/Separator';
import { useAuthStore } from '@/stores/authStore';
import { usersApi } from '@/services/api';
import { QUERY_KEYS, queryClient } from '@/config/queryClient';
import { mediaPickerService } from '@/services/media';

const editProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

type EditProfileForm = z.infer<typeof editProfileSchema>;

export default function EditProfileScreen() {
  const { t } = useTranslation();
  const { user, setUser } = useAuthStore();
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<EditProfileForm>({
    resolver: zodResolver(editProfileSchema),
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: (data: EditProfileForm) => usersApi.updateProfile(data),
    onSuccess: (updatedUser) => {
      setUser(updatedUser);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.users.profile() });
      Alert.alert(
        t('common.success', 'Success'),
        t('profile.updateSuccess', 'Profile updated successfully')
      );
      router.back();
    },
    onError: (error: any) => {
      Alert.alert(
        t('common.error', 'Error'),
        error.message || t('profile.updateError', 'Failed to update profile')
      );
    },
  });

  const handleAvatarChange = async () => {
    try {
      setIsUploadingAvatar(true);
      const result = await mediaPickerService.selectImage({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        maxFileSize: 5 * 1024 * 1024, // 5MB
      });

      if (result) {
        setAvatarUri(result.uri);
        // Upload avatar to backend
        const uploadResult = await mediaPickerService.uploadAvatar(result.uri);
        if (uploadResult?.url) {
          if (user) {
            setUser({ ...user, profilePhoto: uploadResult.url });
          }
          Alert.alert(
            t('common.success', 'Success'),
            t('profile.avatarUpdated', 'Profile photo updated')
          );
        } else {
          Alert.alert(
            t('common.error', 'Error'),
            t('profile.avatarUploadFailed', 'Photo selected but upload failed. It will appear locally only.')
          );
        }
      }
    } catch (error) {
      Alert.alert(
        t('common.error', 'Error'),
        t('profile.avatarError', 'Failed to update profile photo')
      );
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const onSubmit = (data: EditProfileForm) => {
    updateProfileMutation.mutate(data);
  };

  return (
    <ScrollView className="flex-1 bg-white">
      <View className="px-6 py-8">
        {/* Avatar Section */}
        <View className="items-center mb-8">
          <Avatar
            source={avatarUri ? { uri: avatarUri } : (user?.profilePhoto ? { uri: user.profilePhoto } : undefined)}
            name={user?.name || 'User'}
            size="xl"
            className="mb-4"
          />
          <Button 
            variant="outline" 
            size="sm" 
            onPress={handleAvatarChange}
            disabled={isUploadingAvatar}
          >
            {isUploadingAvatar
              ? t('profile.uploading', 'Uploading...')
              : t('profile.changePhoto', 'Change Photo')}
          </Button>
        </View>

        <Separator className="mb-6" />

        {/* Form Fields */}
        <View className="gap-4">
          <View>
            <Text variant="body" className="mb-2 font-medium">
              {t('profile.name', 'Name')} *
            </Text>
            <Controller
              control={control}
              name="name"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder={t('profile.namePlaceholder', 'Enter your name')}
                  error={errors.name?.message}
                />
              )}
            />
          </View>

          <View>
            <Text variant="body" className="mb-2 font-medium">
              {t('profile.email', 'Email')} *
            </Text>
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder={t('profile.emailPlaceholder', 'Enter your email')}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  error={errors.email?.message}
                />
              )}
            />
          </View>
        </View>

        {/* Actions */}
        <View className="gap-3 mt-8">
          <Button
            variant="primary"
            size="lg"
            onPress={handleSubmit(onSubmit)}
            disabled={isSubmitting || updateProfileMutation.isPending}
            fullWidth
          >
            {updateProfileMutation.isPending
              ? t('common.saving', 'Saving...')
              : t('common.save', 'Save Changes')}
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
