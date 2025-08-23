import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { AuthProvider, useAuth } from '../context/auth';
import { ActivityIndicator, View, Platform } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import 'react-native-url-polyfill/auto'

// Auth guard component
function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#007bff" />
      </View>
    );
  }

  return <>{children}</>;
}

// Create a client
const queryClient = new QueryClient();

// System UI configuration component
function SystemUIConfig() {
  useEffect(() => {
    // Configure Android system navigation bar
    if (Platform.OS === 'android') {
      SystemUI.setBackgroundColorAsync('#323232ff'); // Light gray background
    }
  }, []);

  return null;
}

// Safe area wrapper component
function SafeAreaWrapper({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, paddingBottom: insets.bottom }}>
      {children}
    </View>
  );
}

// Root layout component
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SystemUIConfig />
      <StatusBar style="dark" />
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AuthGuard>
            <SafeAreaWrapper>
              <Stack
                screenOptions={{
                  headerShown: false
                }}>
                <Stack.Screen
                  name="login"
                  options={{
                    headerShown: false,
                  }}
                />
                <Stack.Screen
                  name="(drawer)"
                  options={{
                    headerShown: false,
                  }}
                />
              </Stack>
            </SafeAreaWrapper>
          </AuthGuard>
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
