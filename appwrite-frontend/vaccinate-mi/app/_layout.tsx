import React from 'react';
import { Stack } from "expo-router";
import { AuthProvider } from '@/context/auth';
import * as eva from '@eva-design/eva';
import { ApplicationProvider } from '@ui-kitten/components';

export default function RootLayout() {
  return (
    <ApplicationProvider {...eva} theme={eva.light} >
    <AuthProvider>
      <Stack />
    </AuthProvider>
    </ApplicationProvider>
  );
}
