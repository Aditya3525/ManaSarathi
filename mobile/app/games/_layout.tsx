import { Stack } from 'expo-router';

export default function GamesLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="breathing" />
      <Stack.Screen name="memory-match" />
      <Stack.Screen name="mood-colors" />
      <Stack.Screen name="gratitude-puzzle" />
      <Stack.Screen name="anxiety-pop" />
      <Stack.Screen name="mindful-patterns" />
    </Stack>
  );
}
