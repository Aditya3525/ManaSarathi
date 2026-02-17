import { Link, Stack } from 'expo-router';
import { View } from 'react-native';

import { Text } from '@/components/ui/Text';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <View className="flex-1 items-center justify-center p-5 bg-white">
        <Text variant="h2" className="mb-4">This screen doesn't exist.</Text>
        <Link href="/">
          <Text variant="body" className="text-primary-600 mt-4">Go to home screen!</Text>
        </Link>
      </View>
    </>
  );
}
