import { View, ViewProps } from 'react-native';
import { cn } from '../../utils/cn';

interface SeparatorProps extends ViewProps {
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

export const Separator: React.FC<SeparatorProps> = ({
  orientation = 'horizontal',
  className,
  ...props
}) => {
  const orientationStyles = orientation === 'horizontal'
    ? 'h-px w-full'
    : 'w-px h-full';

  return (
    <View
      className={cn('bg-gray-200', orientationStyles, className)}
      {...props}
    />
  );
};
