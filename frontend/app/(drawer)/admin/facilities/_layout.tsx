import React from 'react';
import { Stack } from 'expo-router';

export default function FacilitiesLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          headerTitle: 'Facilities',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="add"
        options={{
          headerTitle: 'Add Facility',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          headerTitle: 'Facility Details',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="[id]/edit"
        options={{
          headerTitle: 'Edit Facility',
          headerShown: false,
        }}
      />
    </Stack>
  );
}