import React from 'react';
import { Stack } from 'expo-router';

export default function ReportsLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          headerTitle: 'Reports',
        }}
      />
      <Stack.Screen
        name="immunization-coverage"
        options={{
          headerTitle: 'Immunization Coverage',
        }}
      />
      <Stack.Screen
        name="due-immunizations"
        options={{
          headerTitle: 'Due Immunizations',
        }}
      />
      <Stack.Screen
        name="facility-performance"
        options={{
          headerTitle: 'Facility Performance',
        }}
      />
      <Stack.Screen
        name="age-distribution"
        options={{
          headerTitle: 'Age Distribution',
        }}
      />
    </Stack>
  );
}
