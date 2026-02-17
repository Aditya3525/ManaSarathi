import React from 'react';
import {
  Pressable,
  Text,
  ActivityIndicator,
  PressableProps,
  ViewStyle,
  TextStyle,
  View,
} from 'react-native';
import { cn } from '@/utils/cn';

interface ButtonProps extends Omit<PressableProps, 'style'> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'base' | 'lg';
  fullWidth?: boolean;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'base',
  fullWidth = false,
  loading = false,
  disabled = false,
  className,
  leftIcon,
  rightIcon,
  ...props
}) => {
  const isDisabled = disabled || loading;

  const baseStyles = 'flex-row items-center justify-center rounded-lg';
  
  const variantStyles = {
    primary: 'bg-primary-600 active:bg-primary-700',
    secondary: 'bg-secondary-600 active:bg-secondary-700',
    outline: 'border-2 border-primary-600 bg-transparent active:bg-primary-50',
    ghost: 'bg-transparent active:bg-gray-100',
    danger: 'bg-danger-600 active:bg-danger-700',
  };

  const sizeStyles = {
    sm: 'px-3 py-2 min-h-[32px]',
    base: 'px-4 py-3 min-h-[44px]',
    lg: 'px-6 py-4 min-h-[56px]',
  };

  const textVariantStyles = {
    primary: 'text-white font-semibold',
    secondary: 'text-white font-semibold',
    outline: 'text-primary-600 font-semibold',
    ghost: 'text-gray-700 font-medium',
    danger: 'text-white font-semibold',
  };

  const textSizeStyles = {
    sm: 'text-sm',
    base: 'text-base',
    lg: 'text-lg',
  };

  const disabledStyles = 'opacity-50';
  const widthStyles = fullWidth ? 'w-full' : '';

  return (
    <Pressable
      className={cn(
        baseStyles,
        variantStyles[variant],
        sizeStyles[size],
        widthStyles,
        isDisabled && disabledStyles,
        className
      )}
      disabled={isDisabled}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'outline' || variant === 'ghost' ? '#0ea5e9' : '#ffffff'}
        />
      ) : (
        <View className="flex-row items-center justify-center gap-2">
          {leftIcon && <View>{leftIcon}</View>}
          {typeof children === 'string' ? (
            <Text
              className={cn(
                textVariantStyles[variant],
                textSizeStyles[size]
              )}
            >
              {children}
            </Text>
          ) : (
            children
          )}
          {rightIcon && <View>{rightIcon}</View>}
        </View>
      )}
    </Pressable>
  );
};
