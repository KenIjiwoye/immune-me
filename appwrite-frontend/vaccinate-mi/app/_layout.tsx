import React from 'react';
import { Stack } from "expo-router";
import * as eva from '@eva-design/eva';
import { ApplicationProvider, IconRegistry } from '@ui-kitten/components';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EvaIconsPack } from '@ui-kitten/eva-icons';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
    <IconRegistry icons={EvaIconsPack} />
    <ApplicationProvider {...eva} theme={eva.light} >
      <SafeAreaView style={{ flex: 1 }}>
        <StatusBar style='dark' />
        <Stack screenOptions={{ headerShown: false }} />
      </SafeAreaView>
    </ApplicationProvider>
    </>
  );
}
