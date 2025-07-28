import React from 'react';
import { Stack } from 'expo-router';

export default function PatientsLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          headerTitle: 'Patients',
        }}
      />
      <Stack.Screen
        name="new"
        options={{
          headerTitle: 'Add Patient',
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          headerTitle: 'Patient Details',
        }}
      />
      <Stack.Screen
        name="[id]/edit"
        options={{
          headerTitle: 'Edit Patient',
          presentation: 'modal',
        }}
      />
    </Stack>
  );
}
