# FE-01: Implement Authentication Flow

## Context
The Immunization Records Management System requires a secure authentication flow for users to log in and access the application. This task involves creating the login screen, handling authentication state, and implementing protected routes.

## Dependencies
- BE-03: Authentication system implemented on the backend

## Requirements
1. Create a login screen with email/username and password fields
2. Implement authentication state management using React Context
3. Set up protected routes that require authentication
4. Handle token storage and refresh
5. Implement logout functionality

## Code Example

### Authentication Context

```typescript
// frontend/app/context/auth.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import api from '../services/api';

type User = {
  id: number;
  email: string;
  fullName: string;
  role: 'nurse' | 'doctor' | 'administrator' | 'supervisor';
  facilityId: number;
};

type AuthContextType = {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load token from secure storage on app start
  useEffect(() => {
    const loadToken = async () => {
      try {
        const storedToken = await SecureStore.getItemAsync('auth_token');
        if (storedToken) {
          setToken(storedToken);
          api.setAuthToken(storedToken);
          
          // Fetch user data
          const response = await api.get('/auth/me');
          setUser(response.data.user);
        }
      } catch (error) {
        console.error('Failed to load auth token:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadToken();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await api.post('/auth/login', { email, password });
      const { user, token } = response.data;
      
      // Save token to secure storage
      await SecureStore.setItemAsync('auth_token', token);
      
      // Set auth state
      setUser(user);
      setToken(token);
      api.setAuthToken(token);
      
      // Navigate to home screen
      router.replace('/');
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      // Call logout endpoint if available
      if (token) {
        await api.post('/auth/logout');
      }
    } catch (error) {
      console.error('Logout API call failed:', error);
    } finally {
      // Clear token from secure storage
      await SecureStore.deleteItemAsync('auth_token');
      
      // Reset auth state
      setUser(null);
      setToken(null);
      api.setAuthToken(null);
      
      // Navigate to login screen
      router.replace('/login');
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        logout,
        isAuthenticated: !!user && !!token,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
```

### API Service

```typescript
// frontend/app/services/api.ts
import axios from 'axios';

const API_URL = 'http://localhost:3333/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Set auth token for API requests
export const setAuthToken = (token: string | null) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};

export default {
  // Auth endpoints
  login: (credentials: { email: string; password: string }) => 
    api.post('/auth/login', credentials),
  logout: () => api.post('/auth/logout'),
  refreshToken: () => api.post('/auth/refresh-token'),
  
  // Helper method to set auth token
  setAuthToken,
  
  // Expose axios methods
  get: api.get,
  post: api.post,
  put: api.put,
  delete: api.delete,
};
```

### Login Screen

```typescript
// frontend/app/login.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useAuth } from './context/auth';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading } = useAuth();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    try {
      await login(email, password);
    } catch (error) {
      Alert.alert('Login Failed', 'Invalid email or password');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Immunization Records</Text>
      <Text style={styles.subtitle}>Login to your account</Text>

      <View style={styles.form}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="Enter your email"
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="Enter your password"
          secureTextEntry
        />

        <TouchableOpacity
          style={styles.button}
          onPress={handleLogin}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Login</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 32,
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#007bff',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
```

### Root Layout with Auth Protection

```typescript
// frontend/app/_layout.tsx
import React from 'react';
import { Stack } from 'expo-router';
import { AuthProvider, useAuth } from './context/auth';
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
```

### Protected Home Screen

```typescript
// frontend/app/index.tsx
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAuth } from './context/auth';
import { router } from 'expo-router';

export default function HomeScreen() {
  const { user, isAuthenticated, logout } = useAuth();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.welcome}>Welcome, {user?.fullName}</Text>
      <Text style={styles.role}>Role: {user?.role}</Text>
      
      <View style={styles.menu}>
        {/* Menu items will go here */}
        <Text style={styles.menuTitle}>Dashboard</Text>
      </View>
      
      <TouchableOpacity style={styles.logoutButton} onPress={logout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  welcome: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  role: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
  },
  menu: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  logoutButton: {
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  logoutText: {
    color: '#dc3545',
    fontWeight: 'bold',
  },
});
```

## Expected Outcome
- Functional login screen that authenticates users against the backend
- Authentication state management using React Context
- Protected routes that redirect unauthenticated users to the login screen
- Secure token storage using Expo SecureStore
- Logout functionality that clears authentication state

## Testing
1. Run the frontend application:
```bash
cd frontend
npx expo start
```

2. Test the login flow with valid credentials
3. Verify that authenticated users can access protected routes
4. Test the logout functionality
5. Verify that unauthenticated users are redirected to the login screen
