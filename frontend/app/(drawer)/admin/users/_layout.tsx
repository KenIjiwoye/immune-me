import React from 'react';
import { Stack } from 'expo-router';

export default function UserManagementLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          headerTitle: 'User Management',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="add"
        options={{
          headerTitle: 'Add User',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          headerTitle: 'User Details',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="[id]/edit"
        options={{
          headerTitle: 'Edit User',
          headerShown: false,
        }}
      />
    </Stack>
  );
}