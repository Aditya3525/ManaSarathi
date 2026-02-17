import { Stack } from 'expo-router';

export default function ProfileLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="edit" options={{ presentation: 'modal', headerShown: true, title: 'Edit Profile' }} />
      <Stack.Screen name="change-password" options={{ presentation: 'modal', headerShown: true, title: 'Change Password' }} />
      <Stack.Screen name="language" options={{ presentation: 'modal', headerShown: true, title: 'Language' }} />
      <Stack.Screen name="theme" options={{ presentation: 'modal', headerShown: true, title: 'Theme' }} />
      <Stack.Screen name="accessibility" options={{ presentation: 'modal', headerShown: true, title: 'Accessibility' }} />
    </Stack>
  );
}
