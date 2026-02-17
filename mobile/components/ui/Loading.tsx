import { View, ActivityIndicator, Text } from 'react-native';
import { cn } from '../../utils/cn';

interface LoadingSpinnerProps {
  size?: 'small' | 'large';
  color?: string;
  message?: string;
  fullScreen?: boolean;
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'large',
  color = '#0ea5e9',
  message,
  fullScreen = false,
  className,
}) => {
  const content = (
    <>
      <ActivityIndicator size={size} color={color} />
      {message && (
        <Text className="text-gray-600 mt-3 text-center">
          {message}
        </Text>
      )}
    </>
  );

  if (fullScreen) {
    return (
      <View className={cn('flex-1 items-center justify-center bg-white', className)}>
        {content}
      </View>
    );
  }

  return (
    <View className={cn('items-center justify-center p-4', className)}>
      {content}
    </View>
  );
};

interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  circle?: boolean;
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 20,
  circle = false,
  className,
}) => {
  const widthValue = typeof width === 'number' ? width : undefined;
  const heightValue = typeof height === 'number' ? height : undefined;
  
  return (
    <View
      className={cn(
        'bg-gray-200 animate-pulse',
        circle ? 'rounded-full' : 'rounded',
        typeof width === 'string' ? 'w-full' : '',
        className
      )}
      style={{
        width: widthValue,
        height: heightValue,
      }}
    />
  );
};
