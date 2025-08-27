import React from 'react';
import { Stack } from 'expo-router';
import { useAuth } from '../../../context/auth';
import { Redirect } from 'expo-router';

export default function AdminLayout() {
  const { user } = useAuth();

  // Redirect non-admin users
  if (!user || user.role !== 'administrator') {
    return <Redirect href="/(drawer)" />;
  }

  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          headerTitle: 'Admin Dashboard',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="vaccines"
        options={{
          headerTitle: 'Vaccine Management',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="users"
        options={{
          headerTitle: 'User Management',
          headerShown: false,
        }}
      />
    </Stack>
  );
}
