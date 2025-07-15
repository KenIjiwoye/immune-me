import React from 'react';
import { Stack } from 'expo-router';
import { AuthProvider, useAuth } from '../context/auth';
import { ActivityIndicator, View } from 'react-native';

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

// Root layout component
export default function RootLayout() {
  return (
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
          {/* Add other screens here */}
        </Stack>
      </AuthGuard>
    </AuthProvider>
  );
}
