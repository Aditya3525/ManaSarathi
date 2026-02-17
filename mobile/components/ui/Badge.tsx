import { View, Text } from 'react-native';
import { cn } from '@/utils/cn';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'sm' | 'base' | 'lg';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'base',
  className,
}) => {
  const baseStyles = 'rounded-full px-2.5 py-1 self-start';
  
  const variantStyles = {
    default: 'bg-gray-100',
    primary: 'bg-primary-100',
    secondary: 'bg-purple-100',
    success: 'bg-success-100',
    warning: 'bg-warning-100',
    danger: 'bg-danger-100',
    info: 'bg-blue-100',
  };

  const textVariantStyles = {
    default: 'text-gray-700',
    primary: 'text-primary-700',
    secondary: 'text-purple-700',
    success: 'text-success-700',
    warning: 'text-warning-700',
    danger: 'text-danger-700',
    info: 'text-blue-700',
  };

  const sizeStyles = {
    sm: 'px-2 py-0.5',
    base: 'px-2.5 py-1',
    lg: 'px-3 py-1.5',
  };

  const textSizeStyles = {
    sm: 'text-xs',
    base: 'text-sm',
    lg: 'text-base',
  };

  return (
    <View
      className={cn(
        baseStyles,
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
    >
      <Text
        className={cn(
          'font-medium',
          textVariantStyles[variant],
          textSizeStyles[size]
        )}
      >
        {children}
      </Text>
    </View>
  );
};
