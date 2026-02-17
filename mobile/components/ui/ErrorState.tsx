import { View } from 'react-native';
import { AlertTriangle, RefreshCw } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { Text } from './Text';
import { Button } from './Button';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
  compact?: boolean;
}

/**
 * Reusable error state component for API failures
 */
export function ErrorState({ message, onRetry, compact = false }: ErrorStateProps) {
  const { t } = useTranslation();

  if (compact) {
    return (
      <View className="bg-danger-50 border border-danger-200 rounded-lg p-3 mx-4 my-2 flex-row items-center">
        <AlertTriangle size={16} color="#dc2626" />
        <Text variant="caption" className="text-danger-800 ml-2 flex-1">
          {message || t('common.errorOccurred', 'Something went wrong')}
        </Text>
        {onRetry && (
          <Button variant="ghost" size="sm" onPress={onRetry}>
            {t('common.retry', 'Retry')}
          </Button>
        )}
      </View>
    );
  }

  return (
    <View className="flex-1 justify-center items-center px-6 py-12">
      <View className="bg-danger-50 rounded-full p-4 mb-4">
        <AlertTriangle size={32} color="#dc2626" />
      </View>
      <Text variant="h3" className="text-center mb-2">
        {t('common.oops', 'Oops!')}
      </Text>
      <Text variant="body" className="text-gray-600 text-center mb-6">
        {message || t('common.errorOccurred', 'Something went wrong. Please try again.')}
      </Text>
      {onRetry && (
        <Button
          variant="outline"
          size="lg"
          onPress={onRetry}
          leftIcon={<RefreshCw size={18} color="#6366f1" />}
        >
          {t('common.tryAgain', 'Try Again')}
        </Button>
      )}
    </View>
  );
}
