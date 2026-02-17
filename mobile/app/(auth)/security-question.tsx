import { useState, useMemo } from 'react';
import { View, ScrollView, KeyboardAvoidingView, Platform, Alert, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Lock, CheckCircle, HelpCircle } from 'lucide-react-native';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Text } from '@/components/ui/Text';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { useAuthStore } from '@/stores/authStore';
import { authApi } from '@/services/api';

const DEFAULT_SECURITY_QUESTIONS = [
  "What is your mother's maiden name?",
  'What was the name of your first pet?',
  'What city were you born in?',
  "What is your favorite teacher's name?",
  'What was the model of your first mobile phone?',
  "What is your favorite childhood friend's name?",
  'What is your favorite movie?',
  'What was the name of your first school?',
  "What's your favorite food?",
  "What's your dream job as a child?",
];

export default function SecurityQuestionSetupScreen() {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<string>(DEFAULT_SECURITY_QUESTIONS[0]);
  const [customQuestion, setCustomQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { user, updateUser } = useAuthStore();

  const questions = useMemo(() => DEFAULT_SECURITY_QUESTIONS, []);
  const isCustom = selectedQuestion === 'custom';

  const handleSubmit = async () => {
    setError(null);

    const questionToSave = isCustom ? customQuestion.trim() : selectedQuestion.trim();
    const answerToSave = answer.trim();

    if (!questionToSave) {
      setError(t('auth.selectQuestion', 'Please select or provide a security question.'));
      return;
    }

    if (!answerToSave) {
      setError(t('auth.provideAnswer', 'Please provide an answer to your security question.'));
      return;
    }

    try {
      setIsLoading(true);

      const response = await authApi.setSecurityQuestion({
        question: questionToSave,
        answer: answerToSave,
      });

      if (response?.data?.user) {
        updateUser(response.data.user);
      }

      Alert.alert(
        t('auth.questionSaved', 'Security Question Saved'),
        t('auth.questionSavedDesc', 'Your security question has been set up successfully.'),
        [
          {
            text: t('common.ok', 'OK'),
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error: any) {
      console.error('Security question setup error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to save security question';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
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
        {/* Header */}
        <View className="items-center mb-6">
          <View className="bg-primary-100 rounded-full p-4 mb-4">
            <Lock size={36} color="#6366f1" />
          </View>
          <Text variant="h2" className="text-center mb-2">
            {t('auth.addSecurityQuestion', 'Add a Security Question')}
          </Text>
          <Text variant="body" className="text-gray-600 text-center">
            {user?.name
              ? t('auth.securityQuestionGreeting', `Hi ${user.name}, choose a question only you can answer.`)
              : t('auth.securityQuestionDesc', 'Choose a question only you can answer.')}{' '}
            {t('auth.securityQuestionPurpose', "This helps us verify it's really you if you ever forget your password.")}
          </Text>
        </View>

        {/* Error */}
        {error && (
          <Card className="mb-4 bg-red-50 border-red-200">
            <CardContent className="p-3">
              <Text variant="caption" className="text-red-700">{error}</Text>
            </CardContent>
          </Card>
        )}

        {/* Question Selection */}
        <Text variant="label" className="mb-3 text-gray-500">
          {t('auth.selectSecurityQuestion', 'Select a question')}
        </Text>

        <View className="gap-2 mb-4">
          {questions.map((question) => {
            const isSelected = selectedQuestion === question;
            return (
              <TouchableOpacity
                key={question}
                onPress={() => setSelectedQuestion(question)}
                className={`p-3.5 rounded-lg border-2 ${
                  isSelected
                    ? 'border-primary-600 bg-primary-50'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <View className="flex-row items-center">
                  <View
                    className={`w-5 h-5 rounded-full border-2 mr-3 items-center justify-center ${
                      isSelected ? 'border-primary-600 bg-primary-600' : 'border-gray-300'
                    }`}
                  >
                    {isSelected && (
                      <View className="w-2.5 h-2.5 rounded-full bg-white" />
                    )}
                  </View>
                  <Text
                    variant="body"
                    className={`flex-1 ${isSelected ? 'text-primary-700' : 'text-gray-700'}`}
                  >
                    {question}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}

          {/* Custom question option */}
          <TouchableOpacity
            onPress={() => setSelectedQuestion('custom')}
            className={`p-3.5 rounded-lg border-2 border-dashed ${
              isCustom
                ? 'border-primary-600 bg-primary-50'
                : 'border-gray-200 bg-white'
            }`}
          >
            <View className="flex-row items-center mb-2">
              <View
                className={`w-5 h-5 rounded-full border-2 mr-3 items-center justify-center ${
                  isCustom ? 'border-primary-600 bg-primary-600' : 'border-gray-300'
                }`}
              >
                {isCustom && (
                  <View className="w-2.5 h-2.5 rounded-full bg-white" />
                )}
              </View>
              <Text
                variant="body"
                className={`${isCustom ? 'text-primary-700' : 'text-gray-700'} font-medium`}
              >
                {t('auth.customQuestion', 'Use a custom question')}
              </Text>
            </View>
            {isCustom && (
              <Input
                placeholder={t('auth.customQuestionPlaceholder', 'Enter your own question')}
                value={customQuestion}
                onChangeText={setCustomQuestion}
                autoCapitalize="sentences"
              />
            )}
          </TouchableOpacity>
        </View>

        {/* Answer */}
        <View className="mb-6">
          <Input
            label={t('auth.yourAnswer', 'Your Answer')}
            placeholder={t('auth.answerPlaceholder', 'Type your answer')}
            value={answer}
            onChangeText={setAnswer}
            autoCapitalize="none"
          />
          <Text variant="caption" className="text-gray-400 mt-1">
            {t('auth.answerNote', 'Keep your answer memorable but hard to guess. We store it securely using strong hashing.')}
          </Text>
        </View>

        {/* Submit */}
        <Button
          variant="primary"
          size="lg"
          onPress={handleSubmit}
          loading={isLoading}
          disabled={isLoading}
          fullWidth
        >
          {t('auth.saveAndContinue', 'Save and Continue')}
        </Button>

        {/* Tips */}
        <Card className="mt-6">
          <CardHeader className="pb-2">
            <View className="flex-row items-center">
              <HelpCircle size={16} color="#6366f1" />
              <Text variant="label" className="ml-2 text-primary-600">
                {t('auth.tips', 'Tips')}
              </Text>
            </View>
          </CardHeader>
          <CardContent className="pt-0 pb-4 px-4">
            <View className="gap-2">
              <View className="flex-row items-start">
                <CheckCircle size={14} color="#6366f1" className="mt-0.5" />
                <Text variant="caption" className="text-gray-600 ml-2 flex-1">
                  {t('auth.tip1', "Answers aren't case-sensitive — use a phrase that's natural for you.")}
                </Text>
              </View>
              <View className="flex-row items-start">
                <CheckCircle size={14} color="#6366f1" className="mt-0.5" />
                <Text variant="caption" className="text-gray-600 ml-2 flex-1">
                  {t('auth.tip2', 'Consider using a combination of words or numbers for extra uniqueness.')}
                </Text>
              </View>
              <View className="flex-row items-start">
                <CheckCircle size={14} color="#6366f1" className="mt-0.5" />
                <Text variant="caption" className="text-gray-600 ml-2 flex-1">
                  {t('auth.tip3', 'If you choose a custom question, avoid yes/no questions.')}
                </Text>
              </View>
            </View>
          </CardContent>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
