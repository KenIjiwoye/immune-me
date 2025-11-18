import React from 'react';
import { Stack } from "expo-router";
import { AuthProvider } from '@/context/auth';
import * as eva from '@eva-design/eva';
import { ApplicationProvider } from '@ui-kitten/components';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function RootLayout() {
  return (
    <ApplicationProvider {...eva} theme={eva.light} >
      <SafeAreaView style={{ flex: 1 }}>
        <AuthProvider>
          <Stack screenOptions={{ headerShown: false }} />
        </AuthProvider>
      </SafeAreaView>
    </ApplicationProvider>
  );
}
