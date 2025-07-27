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
          headerShown: false
        }}
      />
    </Stack>
  );
}
