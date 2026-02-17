import React, { useState } from 'react';
import {
  TextInput as RNTextInput,
  View,
  Text,
  TextInputProps as RNTextInputProps,
  Pressable,
} from 'react-native';
import { cn } from '@/utils/cn';

interface InputProps extends RNTextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  size?: 'sm' | 'base' | 'lg';
  containerClassName?: string;
  inputClassName?: string;
}

export const Input = React.forwardRef<RNTextInput, InputProps>(
  (
    {
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      fullWidth = true,
      size = 'base',
      containerClassName,
      inputClassName,
      editable = true,
      ...props
    },
    ref
  ) => {
    const [isFocused, setIsFocused] = useState(false);

    const sizeStyles = {
      sm: 'h-9 px-3 text-sm',
      base: 'h-11 px-4 text-base',
      lg: 'h-14 px-4 text-lg',
    };

    const containerStyles = cn(
      'flex-row items-center rounded-lg border',
      isFocused && !error && 'border-primary-500',
      !isFocused && !error && 'border-gray-300',
      error && 'border-danger-500',
      !editable && 'bg-gray-100',
      fullWidth && 'w-full',
      containerClassName
    );

    const inputStyles = cn(
      'flex-1',
      sizeStyles[size],
      'text-gray-900',
      inputClassName
    );

    return (
      <View className={fullWidth ? 'w-full' : ''}>
        {label && (
          <Text className="text-sm font-medium text-gray-700 mb-1.5">
            {label}
          </Text>
        )}
        
        <View className={containerStyles}>
          {leftIcon && (
            <View className="ml-3">
              {leftIcon}
            </View>
          )}
          
          <RNTextInput
            ref={ref}
            className={inputStyles}
            placeholderTextColor="#9ca3af"
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            editable={editable}
            {...props}
          />
          
          {rightIcon && (
            <View className="mr-3">
              {rightIcon}
            </View>
          )}
        </View>

        {error && (
          <Text className="text-xs text-danger-600 mt-1">
            {error}
          </Text>
        )}
        
        {helperText && !error && (
          <Text className="text-xs text-gray-500 mt-1">
            {helperText}
          </Text>
        )}
      </View>
    );
  }
);

Input.displayName = 'Input';

interface TextAreaProps extends InputProps {
  rows?: number;
}

export const TextArea = React.forwardRef<RNTextInput, TextAreaProps>(
  (
    {
      rows = 4,
      containerClassName,
      inputClassName,
      ...props
    },
    ref
  ) => {
    return (
      <Input
        ref={ref}
        multiline
        numberOfLines={rows}
        textAlignVertical="top"
        containerClassName={cn('items-start', containerClassName)}
        inputClassName={cn('py-3', inputClassName)}
        {...props}
      />
    );
  }
);

TextArea.displayName = 'TextArea';
