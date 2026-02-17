import { View, Text, ViewProps } from 'react-native';
import { cn } from '@/utils/cn';

interface CardProps extends ViewProps {
  children: React.ReactNode;
  variant?: 'default' | 'outlined' | 'elevated';
  className?: string;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  className,
  ...props
}) => {
  const baseStyles = 'rounded-lg p-4';
  
  const variantStyles = {
    default: 'bg-white',
    outlined: 'bg-white border border-gray-200',
    elevated: 'bg-white shadow-md',
  };

  return (
    <View
      className={cn(baseStyles, variantStyles[variant], className)}
      {...props}
    >
      {children}
    </View>
  );
};

interface CardHeaderProps extends ViewProps {
  children: React.ReactNode;
  className?: string;
}

export const CardHeader: React.FC<CardHeaderProps> = ({
  children,
  className,
  ...props
}) => {
  return (
    <View className={cn('mb-3', className)} {...props}>
      {children}
    </View>
  );
};

interface CardTitleProps {
  children: React.ReactNode;
  className?: string;
}

export const CardTitle: React.FC<CardTitleProps> = ({
  children,
  className,
}) => {
  return (
    <Text className={cn('text-lg font-semibold text-gray-900', className)}>
      {children}
    </Text>
  );
};

interface CardDescriptionProps {
  children: React.ReactNode;
  className?: string;
}

export const CardDescription: React.FC<CardDescriptionProps> = ({
  children,
  className,
}) => {
  return (
    <Text className={cn('text-sm text-gray-600 mt-1', className)}>
      {children}
    </Text>
  );
};

interface CardContentProps extends ViewProps {
  children: React.ReactNode;
  className?: string;
}

export const CardContent: React.FC<CardContentProps> = ({
  children,
  className,
  ...props
}) => {
  return (
    <View className={cn('', className)} {...props}>
      {children}
    </View>
  );
};

interface CardFooterProps extends ViewProps {
  children: React.ReactNode;
  className?: string;
}

export const CardFooter: React.FC<CardFooterProps> = ({
  children,
  className,
  ...props
}) => {
  return (
    <View className={cn('mt-4 pt-4 border-t border-gray-100', className)} {...props}>
      {children}
    </View>
  );
};
