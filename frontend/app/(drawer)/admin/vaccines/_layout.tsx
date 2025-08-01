import React from 'react';
import { Stack } from 'expo-router';

export default function VaccineManagementLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          headerTitle: 'Vaccine Management',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="add"
        options={{
          headerTitle: 'Add Vaccine',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          headerTitle: 'Edit Vaccine',
          headerShown: false,
        }}
      />
    </Stack>
  );
}
