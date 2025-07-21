import React from 'react';
import { Stack } from 'expo-router';
import { AuthProvider, useAuth } from '../context/auth';
import { ActivityIndicator, View } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

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

// Root layout component
export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AuthGuard>
          <Stack>
            <Stack.Screen
              name="login"
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="index"
              options={{
                headerTitle: 'Dashboard',
              }}
            />
            <Stack.Screen
              name="patients"
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="reports"
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="reports/immunization-coverage"
              options={{
                headerTitle: 'Immunization Coverage',
              }}
            />
            <Stack.Screen
              name="reports/due-immunizations"
              options={{
                headerTitle: 'Due Immunizations',
              }}
            />
            <Stack.Screen
              name="reports/facility-performance"
              options={{
                headerTitle: 'Facility Performance',
              }}
            />
            <Stack.Screen
              name="reports/age-distribution"
              options={{
                headerTitle: 'Age Distribution',
              }}
            />
          </Stack>
        </AuthGuard>
      </AuthProvider>
    </QueryClientProvider>
  );
}
