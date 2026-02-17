import { View, Image, Text, ViewProps } from 'react-native';
import { cn } from '@/utils/cn';

interface AvatarProps extends ViewProps {
  source?: { uri: string } | number;
  name?: string;
  size?: 'sm' | 'base' | 'lg' | 'xl';
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  source,
  name,
  size = 'base',
  className,
  ...props
}) => {
  const sizeStyles = {
    sm: 'w-8 h-8',
    base: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  const textSizeStyles = {
    sm: 'text-xs',
    base: 'text-sm',
    lg: 'text-base',
    xl: 'text-xl',
  };

  const getInitials = (name: string): string => {
    const names = name.trim().split(' ');
    if (names.length >= 2) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <View
      className={cn(
        'rounded-full items-center justify-center bg-primary-100 overflow-hidden',
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {source ? (
        <Image
          source={source}
          className={cn('w-full h-full')}
          resizeMode="cover"
        />
      ) : name ? (
        <Text
          className={cn(
            'font-semibold text-primary-700',
            textSizeStyles[size]
          )}
        >
          {getInitials(name)}
        </Text>
      ) : (
        <View className="w-full h-full bg-gray-200" />
      )}
    </View>
  );
};
