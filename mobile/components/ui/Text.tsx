import { Text as RNText, TextProps as RNTextProps } from 'react-native';
import { cn } from '@/utils/cn';

interface TextProps extends RNTextProps {
  variant?: 'h1' | 'h2' | 'h3' | 'h4' | 'body' | 'caption' | 'label';
  weight?: 'light' | 'normal' | 'medium' | 'semibold' | 'bold';
  color?: 'primary' | 'secondary' | 'muted' | 'danger' | 'success' | 'default';
  align?: 'left' | 'center' | 'right';
  className?: string;
}

export const Text: React.FC<TextProps> = ({
  variant = 'body',
  weight = 'normal',
  color = 'default',
  align = 'left',
  className,
  children,
  ...props
}) => {
  const variantStyles = {
    h1: 'text-4xl leading-tight',
    h2: 'text-3xl leading-tight',
    h3: 'text-2xl leading-normal',
    h4: 'text-xl leading-normal',
    body: 'text-base leading-normal',
    caption: 'text-sm leading-normal',
    label: 'text-xs leading-normal',
  };

  const weightStyles = {
    light: 'font-light',
    normal: 'font-normal',
    medium: 'font-medium',
    semibold: 'font-semibold',
    bold: 'font-bold',
  };

  const colorStyles = {
    default: 'text-gray-900',
    primary: 'text-primary-600',
    secondary: 'text-gray-600',
    muted: 'text-gray-500',
    danger: 'text-danger-600',
    success: 'text-success-600',
  };

  const alignStyles = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  };

  return (
    <RNText
      className={cn(
        variantStyles[variant],
        weightStyles[weight],
        colorStyles[color],
        alignStyles[align],
        className
      )}
      {...props}
    >
      {children}
    </RNText>
  );
};
