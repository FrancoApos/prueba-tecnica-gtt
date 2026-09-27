import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { onMessageCreated, onPresenceChanged } from '@/src/realtime/socket';
import { useChatsStore } from '@/src/store/chats';

export default function AppLayout() {
  const applyIncomingMessage = useChatsStore((s) => s.applyIncomingMessage);
  const applyPresence = useChatsStore((s) => s.applyPresence);

  // Una sola suscripción para toda la zona autenticada: el preview y el orden
  // del listado de chats se actualizan aunque el usuario esté en otra pantalla.
  useEffect(() => onMessageCreated(applyIncomingMessage), [applyIncomingMessage]);
  useEffect(() => onPresenceChanged(applyPresence), [applyPresence]);

  return (
    <Stack screenOptions={{ headerShadowVisible: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="chat/[chatId]" options={{ title: '' }} />
      <Stack.Screen name="new-chat" options={{ presentation: 'modal', title: 'Nuevo chat' }} />
    </Stack>
  );
}
