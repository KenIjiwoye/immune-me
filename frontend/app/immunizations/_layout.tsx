import React from 'react';
import { Stack } from 'expo-router';

export default function ImmunizationsLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="add"
        options={{
          headerTitle: 'Add Immunization',
          presentation: 'modal',
          headerShown: true
        }}
      />
      <Stack.Screen
        name="[id]/edit"
        options={{
          headerTitle: 'Edit Immunization',
          presentation: 'modal',
          headerShown: true
        }}
      />
    </Stack>
  );
}
