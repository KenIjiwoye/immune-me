import React from 'react';
import { Stack } from 'expo-router';

export default function ProfileLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          headerTitle: 'Profile',
        }}
      />
      <Stack.Screen
        name="edit"
        options={{
          headerTitle: 'Edit Profile',
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="change-password"
        options={{
          headerTitle: 'Change Password',
          presentation: 'modal',
        }}
      />
    </Stack>
  );
}
