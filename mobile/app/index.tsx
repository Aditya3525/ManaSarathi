import { View } from 'react-native';
import { LoadingSpinner } from '@/components/ui/Loading';

/**
 * App Entry Point
 *
 * This screen renders briefly while the auth guard in _layout.tsx
 * hydrates the auth state and redirects to the appropriate screen:
 *   - Not authenticated → /(auth)/landing
 *   - Authenticated but not onboarded → /(onboarding)
 *   - Authenticated and onboarded → /(tabs)
 *
 * All routing logic lives in _layout.tsx to avoid race conditions.
 */
export default function Index() {
  return (
    <View className="flex-1 bg-white justify-center items-center">
      <LoadingSpinner size="large" />
    </View>
  );
}
