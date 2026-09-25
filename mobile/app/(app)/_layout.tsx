import { Stack } from 'expo-router';

export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShadowVisible: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="chat/[chatId]" options={{ title: '' }} />
      <Stack.Screen name="new-chat" options={{ presentation: 'modal', title: 'Nuevo chat' }} />
    </Stack>
  );
}
