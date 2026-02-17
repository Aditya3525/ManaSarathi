import { useState } from 'react';
import { View, ScrollView, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  ChevronLeft, 
  ChevronRight, 
  Heart, 
  Brain, 
  Users, 
  User, 
  Calendar,
  Phone,
  Shield,
  CheckCircle,
  Lock,
  HelpCircle
} from 'lucide-react-native';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { useAuthStore } from '@/stores/authStore';
import { AppSettings } from '@/utils/storage';
import { usersApi, authApi } from '@/services/api';

// Step 1: Approach Selection
const APPROACH_OPTIONS = [
  {
    id: 'western',
    icon: Brain,
    title: 'Western Approach',
    description: 'Evidence-based therapy techniques like CBT & mindfulness',
  },
  {
    id: 'eastern',
    icon: Heart,
    title: 'Eastern Approach',
    description: 'Yoga, meditation, Ayurvedic wellness practices',
  },
  {
    id: 'hybrid',
    icon: Shield,
    title: 'Hybrid Approach',
    description: 'Best of both worlds — combined Western & Eastern methods',
  },
];

// Step 2: Profile Schema
const profileSchema = z.object({
  dateOfBirth: z.string().optional(),
  gender: z.enum(['male', 'female', 'non-binary', 'prefer-not-to-say']),
  primaryConcern: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

// Step 3: Emergency Contact Schema
const emergencyContactSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  relationship: z.string().min(2, 'Relationship is required'),
  phoneNumber: z.string().min(10, 'Valid phone number is required'),
});

type EmergencyContactFormData = z.infer<typeof emergencyContactSchema>;

export default function OnboardingScreen() {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const { user, updateUser } = useAuthStore();

  // Step 1: Approach
  const [selectedApproach, setSelectedApproach] = useState<string | null>(null);

  // Step 2: Profile
  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      dateOfBirth: '',
      gender: 'prefer-not-to-say',
      primaryConcern: '',
    },
  });

  // Step 3: Consent
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);

  // Step 4: Emergency Contact
  const emergencyForm = useForm<EmergencyContactFormData>({
    resolver: zodResolver(emergencyContactSchema),
    defaultValues: {
      name: '',
      relationship: '',
      phoneNumber: '',
    },
  });

  // Step 5: Security Question
  const SECURITY_QUESTIONS = [
    "What is your mother's maiden name?",
    'What was the name of your first pet?',
    'What city were you born in?',
    "What is your favorite teacher's name?",
    'What was the name of your first school?',
    "What's your favorite food?",
    "What's your dream job as a child?",
  ];
  const [securityQuestion, setSecurityQuestion] = useState(SECURITY_QUESTIONS[0]);
  const [customSecurityQuestion, setCustomSecurityQuestion] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');

  const totalSteps = 5;

  const handleNext = async () => {
    if (currentStep === 1) {
      if (!selectedApproach) {
        Alert.alert(
          t('onboarding.error', 'Selection Required'),
          t('onboarding.selectApproach', 'Please select your preferred approach')
        );
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      const isValid = await profileForm.trigger();
      if (!isValid) return;
      setCurrentStep(3);
    } else if (currentStep === 3) {
      if (!acceptedTerms || !acceptedPrivacy) {
        Alert.alert(
          t('onboarding.error', 'Agreement Required'),
          t('onboarding.acceptTerms', 'Please accept the terms and privacy policy to continue')
        );
        return;
      }
      setCurrentStep(4);
    } else if (currentStep === 4) {
      // Emergency contact is optional, just advance
      setCurrentStep(5);
    } else if (currentStep === 5) {
      await handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    try {
      setIsLoading(true);

      const profileData = profileForm.getValues();
      const emergencyData = emergencyForm.getValues();

      // Convert birthday to ISO datetime if provided
      let birthdayISO: string | undefined;
      if (profileData.dateOfBirth) {
        const parsed = new Date(profileData.dateOfBirth);
        if (!isNaN(parsed.getTime())) {
          birthdayISO = parsed.toISOString();
        }
      }

      // Update user profile — field names must match backend expectations
      const updatedUser = await usersApi.updateProfile({
        birthday: birthdayISO,
        gender: profileData.gender,
        approach: selectedApproach! as 'western' | 'eastern' | 'hybrid',
        emergencyContact: emergencyData.name
          ? `${emergencyData.name} (${emergencyData.relationship})`
          : undefined,
        emergencyPhone: emergencyData.phoneNumber || undefined,
        isOnboarded: true,
        dataConsent: acceptedTerms && acceptedPrivacy,
      });

      if (!updatedUser) {
        throw new Error('Failed to update profile');
      }

      updateUser(updatedUser);

      // Set security question if provided
      const questionToSave = securityQuestion === 'custom' ? customSecurityQuestion.trim() : securityQuestion;
      if (questionToSave && securityAnswer.trim()) {
        try {
          await authApi.setSecurityQuestion({
            question: questionToSave,
            answer: securityAnswer.trim(),
          });
        } catch (sqError) {
          console.warn('Security question setup failed (non-blocking):', sqError);
        }
      }

      // Save onboarding completion to settings
      await AppSettings.set({
        hasCompletedOnboarding: true,
        preferredApproach: selectedApproach!,
      });

      router.replace('/(tabs)');
    } catch (error: any) {
      console.error('Onboarding completion error:', error);
      Alert.alert(
        t('onboarding.error', 'Error'),
        error.message || 'Failed to complete onboarding'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const renderStepIndicator = () => (
    <View className="flex-row justify-center items-center mb-8">
      {Array.from({ length: totalSteps }).map((_, index) => (
        <View key={index} className="flex-row items-center">
          <View
            className="w-10 h-10 rounded-full items-center justify-center"
            style={{ backgroundColor: index + 1 <= currentStep ? '#6366f1' : '#e5e7eb' }}
          >
            {index + 1 < currentStep ? (
              <CheckCircle size={20} color="#ffffff" />
            ) : (
              <Text
                variant="caption"
                style={{ color: index + 1 <= currentStep ? '#ffffff' : '#6b7280' }}
              >
                {index + 1}
              </Text>
            )}
          </View>
          {index < totalSteps - 1 && (
            <View
              className="w-12 h-1"
              style={{ backgroundColor: index + 1 < currentStep ? '#6366f1' : '#e5e7eb' }}
            />
          )}
        </View>
      ))}
    </View>
  );

  const renderStep1 = () => (
    <View>
      <Text variant="h2" className="mb-2 text-center">
        {t('onboarding.step1.title', 'Choose Your Approach')}
      </Text>
      <Text variant="body" className="text-gray-600 mb-8 text-center">
        {t('onboarding.step1.subtitle', 'Select how you prefer to work on your mental wellness')}
      </Text>

      <View className="gap-4">
        {APPROACH_OPTIONS.map((option) => {
          const IconComponent = option.icon;
          const isSelected = selectedApproach === option.id;
          
          return (
            <TouchableOpacity
              key={option.id}
              onPress={() => setSelectedApproach(option.id)}
              activeOpacity={0.7}
            >
              <Card
                variant="outlined"
                className="p-4"
                style={isSelected ? onboardingStyles.selectedCard : undefined}
              >
                <View className="flex-row items-start">
                  <View
                    className="rounded-xl p-3 mr-4"
                    style={{ backgroundColor: isSelected ? '#6366f1' : '#f3f4f6' }}
                  >
                    <IconComponent
                      size={28}
                      color={isSelected ? '#ffffff' : '#6b7280'}
                    />
                  </View>
                  <View className="flex-1">
                    <Text variant="label" className="mb-1">
                      {option.title}
                    </Text>
                    <Text variant="caption" className="text-gray-600">
                      {option.description}
                    </Text>
                  </View>
                  {isSelected && (
                    <CheckCircle size={24} color="#6366f1" />
                  )}
                </View>
              </Card>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View>
      <Text variant="h2" className="mb-2 text-center">
        {t('onboarding.step2.title', 'Tell Us About Yourself')}
      </Text>
      <Text variant="body" className="text-gray-600 mb-8 text-center">
        {t('onboarding.step2.subtitle', 'Help us personalize your experience')}
      </Text>

      <View className="gap-4">
        <Controller
          control={profileForm.control}
          name="dateOfBirth"
          render={({ field: { onChange, value } }) => (
            <Input
              label={t('profile.dateOfBirth', 'Date of Birth')}
              placeholder="YYYY-MM-DD"
              value={value}
              onChangeText={onChange}
              error={profileForm.formState.errors.dateOfBirth?.message}
              leftIcon={<Calendar size={20} color="#9ca3af" />}
            />
          )}
        />

        <View>
          <Text variant="label" className="mb-2">
            {t('profile.gender', 'Gender')}
          </Text>
          <Controller
            control={profileForm.control}
            name="gender"
            render={({ field: { onChange, value } }) => (
              <View className="gap-2">
                {[
                  { value: 'male', label: t('profile.male', 'Male') },
                  { value: 'female', label: t('profile.female', 'Female') },
                  { value: 'non-binary', label: t('profile.nonBinary', 'Non-Binary') },
                  { value: 'prefer-not-to-say', label: t('profile.preferNotToSay', 'Prefer Not to Say') },
                ].map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    onPress={() => onChange(option.value)}
                    className="p-4 rounded-lg border-2"
                    style={value === option.value ? onboardingStyles.selectedOption : onboardingStyles.unselectedOption}
                  >
                    <Text
                      variant="body"
                      style={{ color: value === option.value ? '#6366f1' : '#374151' }}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          />
        </View>

        <Controller
          control={profileForm.control}
          name="primaryConcern"
          render={({ field: { onChange, value } }) => (
            <Input
              label={t('profile.primaryConcern', 'Primary Concern (Optional)')}
              placeholder={t('profile.primaryConcernPlaceholder', 'e.g., Anxiety, Depression, Stress')}
              value={value}
              onChangeText={onChange}
              leftIcon={<Brain size={20} color="#9ca3af" />}
            />
          )}
        />
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View>
      <Text variant="h2" className="mb-2 text-center">
        {t('onboarding.step3.title', 'Terms & Privacy')}
      </Text>
      <Text variant="body" className="text-gray-600 mb-8 text-center">
        {t('onboarding.step3.subtitle', 'Review and accept our policies')}
      </Text>

      <Card className="p-6 mb-6">
        <View className="rounded-full p-4 self-center mb-4" style={{ backgroundColor: '#eef2ff' }}>
          <Shield size={48} color="#6366f1" />
        </View>
        
        <Text variant="body" className="text-gray-700 mb-4 text-center">
          {t('onboarding.step3.description', 'Your privacy and data security are our top priorities. We are committed to protecting your information.')}
        </Text>

        <View className="gap-4">
          <TouchableOpacity
            onPress={() => setAcceptedTerms(!acceptedTerms)}
            className="flex-row items-start"
          >
            <View
              className="w-6 h-6 rounded border-2 mr-3 items-center justify-center"
              style={acceptedTerms ? onboardingStyles.checkboxChecked : onboardingStyles.checkboxUnchecked}
            >
              {acceptedTerms && <CheckCircle size={16} color="#ffffff" />}
            </View>
            <Text variant="body" className="flex-1 text-gray-700">
              {t('onboarding.step3.termsAccept', 'I accept the Terms of Service')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setAcceptedPrivacy(!acceptedPrivacy)}
            className="flex-row items-start"
          >
            <View
              className="w-6 h-6 rounded border-2 mr-3 items-center justify-center"
              style={acceptedPrivacy ? onboardingStyles.checkboxChecked : onboardingStyles.checkboxUnchecked}
            >
              {acceptedPrivacy && <CheckCircle size={16} color="#ffffff" />}
            </View>
            <Text variant="body" className="flex-1 text-gray-700">
              {t('onboarding.step3.privacyAccept', 'I accept the Privacy Policy')}
            </Text>
          </TouchableOpacity>
        </View>
      </Card>

      <Text variant="caption" className="text-gray-500 text-center">
        {t('onboarding.step3.footer', 'You can review these documents anytime in Settings')}
      </Text>
    </View>
  );

  const renderStep4 = () => (
    <View>
      <Text variant="h2" className="mb-2 text-center">
        {t('onboarding.step4.title', 'Emergency Contact')}
      </Text>
      <Text variant="body" className="text-gray-600 mb-8 text-center">
        {t('onboarding.step4.subtitle', 'Add a trusted person we can reach in case of emergency')}
      </Text>

      <View className="gap-4">
        <Controller
          control={emergencyForm.control}
          name="name"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label={t('emergency.name', 'Contact Name')}
              placeholder={t('emergency.namePlaceholder', 'Enter name')}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={emergencyForm.formState.errors.name?.message}
              leftIcon={<User size={20} color="#9ca3af" />}
            />
          )}
        />

        <Controller
          control={emergencyForm.control}
          name="relationship"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label={t('emergency.relationship', 'Relationship')}
              placeholder={t('emergency.relationshipPlaceholder', 'e.g., Parent, Spouse, Friend')}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={emergencyForm.formState.errors.relationship?.message}
              leftIcon={<Users size={20} color="#9ca3af" />}
            />
          )}
        />

        <Controller
          control={emergencyForm.control}
          name="phoneNumber"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label={t('emergency.phone', 'Phone Number')}
              placeholder={t('emergency.phonePlaceholder', 'Enter phone number')}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={emergencyForm.formState.errors.phoneNumber?.message}
              keyboardType="phone-pad"
              leftIcon={<Phone size={20} color="#9ca3af" />}
            />
          )}
        />

        <Card className="p-4 bg-blue-50">
          <Text variant="caption" className="text-blue-900">
            {t('onboarding.step4.notice', 'This contact will only be used in crisis situations or emergencies.')}
          </Text>
        </Card>
      </View>
    </View>
  );

  const renderStep5 = () => (
    <View>
      <Text variant="h2" className="mb-2 text-center">
        {t('onboarding.step5.title', 'Security Question')}
      </Text>
      <Text variant="body" className="text-gray-600 mb-6 text-center">
        {t('onboarding.step5.subtitle', 'Set up a security question to help recover your account if you forget your password')}
      </Text>

      <View className="gap-2 mb-4">
        {SECURITY_QUESTIONS.map((q) => {
          const isSelected = securityQuestion === q;
          return (
            <TouchableOpacity
              key={q}
              onPress={() => setSecurityQuestion(q)}
              className="p-3 rounded-lg border-2"
              style={isSelected ? onboardingStyles.selectedOption : onboardingStyles.unselectedOption}
            >
              <View className="flex-row items-center">
                <View
                  className="w-5 h-5 rounded-full border-2 mr-3 items-center justify-center"
                  style={isSelected ? onboardingStyles.radioChecked : onboardingStyles.radioUnchecked}
                >
                  {isSelected && <View className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#ffffff' }} />}
                </View>
                <Text variant="body" className="flex-1" style={{ color: isSelected ? '#4338ca' : '#374151' }}>
                  {q}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}

        {/* Custom question */}
        <TouchableOpacity
          onPress={() => setSecurityQuestion('custom')}
          className="p-3 rounded-lg border-2 border-dashed"
          style={securityQuestion === 'custom' ? onboardingStyles.selectedOption : onboardingStyles.unselectedOption}
        >
          <View className="flex-row items-center mb-2">
            <View
              className="w-5 h-5 rounded-full border-2 mr-3 items-center justify-center"
              style={securityQuestion === 'custom' ? onboardingStyles.radioChecked : onboardingStyles.radioUnchecked}
            >
              {securityQuestion === 'custom' && <View className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#ffffff' }} />}
            </View>
            <Text variant="body" className="font-medium">
              {t('auth.customQuestion', 'Use a custom question')}
            </Text>
          </View>
          {securityQuestion === 'custom' && (
            <Input
              placeholder={t('auth.customQuestionPlaceholder', 'Enter your own question')}
              value={customSecurityQuestion}
              onChangeText={setCustomSecurityQuestion}
            />
          )}
        </TouchableOpacity>
      </View>

      <Input
        label={t('auth.yourAnswer', 'Your Answer')}
        placeholder={t('auth.answerPlaceholder', 'Type your answer')}
        value={securityAnswer}
        onChangeText={setSecurityAnswer}
        autoCapitalize="none"
      />

      <Card className="mt-4 p-4 bg-blue-50">
        <View className="flex-row items-start">
          <HelpCircle size={16} color="#3b82f6" />
          <Text variant="caption" className="text-blue-900 ml-2 flex-1">
            {t('onboarding.step5.tip', "Choose something memorable that only you would know. Answers aren't case-sensitive.")}
          </Text>
        </View>
      </Card>
    </View>
  );

  return (
    <View className="flex-1 bg-white">
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-6 py-12"
        keyboardShouldPersistTaps="handled"
      >
        {renderStepIndicator()}

        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
        {currentStep === 4 && renderStep4()}
        {currentStep === 5 && renderStep5()}
      </ScrollView>

      {/* Navigation Buttons */}
      <View className="px-6 py-4 border-t border-gray-200 bg-white">
        <View className="flex-row gap-3">
          {currentStep > 1 && (
            <Button
              variant="outline"
              size="lg"
              onPress={handleBack}
              disabled={isLoading}
              className="flex-1"
              leftIcon={<ChevronLeft size={20} color="#6366f1" />}
            >
              {t('nav.back', 'Back')}
            </Button>
          )}
          
          <Button
            variant="primary"
            size="lg"
            onPress={handleNext}
            loading={isLoading}
            disabled={isLoading}
            className="flex-1"
            rightIcon={
              currentStep < totalSteps ? (
                <ChevronRight size={20} color="#ffffff" />
              ) : undefined
            }
          >
            {currentStep === totalSteps
              ? t('onboarding.complete', 'Complete')
              : t('nav.next', 'Next')}
          </Button>
        </View>
      </View>
    </View>
  );
}

/**
 * Inline styles for dynamic selection states.
 * Using StyleSheet instead of dynamic NativeWind className prevents
 * react-native-css-interop from triggering "upgrade" warnings that
 * crash the render cycle when CSS variables change after initial render.
 */
const onboardingStyles = StyleSheet.create({
  selectedCard: {
    borderWidth: 2,
    borderColor: '#6366f1',
    backgroundColor: '#eef2ff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  selectedOption: {
    borderColor: '#6366f1',
    backgroundColor: '#eef2ff',
  },
  unselectedOption: {
    borderColor: '#e5e7eb',
    backgroundColor: 'transparent',
  },
  checkboxChecked: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  checkboxUnchecked: {
    backgroundColor: 'transparent',
    borderColor: '#d1d5db',
  },
  radioChecked: {
    borderColor: '#6366f1',
    backgroundColor: '#6366f1',
  },
  radioUnchecked: {
    borderColor: '#d1d5db',
    backgroundColor: 'transparent',
  },
});
