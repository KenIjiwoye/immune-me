import React from 'react';
import { Stack } from 'expo-router';

export default function NotificationsLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          headerTitle: 'Notifications',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          headerTitle: 'Notification Details',
        }}
      />
    </Stack>
  );
}
