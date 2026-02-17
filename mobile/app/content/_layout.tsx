import { Stack } from 'expo-router';

export default function ContentLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen 
        name="article/[id]" 
        options={{ 
          headerShown: true, 
          title: 'Article',
          presentation: 'card'
        }} 
      />
      <Stack.Screen 
        name="video/[id]" 
        options={{ 
          headerShown: true, 
          title: 'Video',
          presentation: 'card'
        }} 
      />
      <Stack.Screen 
        name="practice/[id]" 
        options={{ 
          headerShown: true, 
          title: 'Practice',
          presentation: 'card'
        }} 
      />
    </Stack>
  );
}
