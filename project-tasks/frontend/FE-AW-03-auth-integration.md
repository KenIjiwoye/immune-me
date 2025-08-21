# FE-AW-03: Replace Existing Auth with Appwrite Authentication

## Title
Replace Existing Auth with Appwrite Authentication

## Priority
High

## Estimated Time
6-8 hours

## Dependencies
- FE-AW-01: Appwrite SDK integrated
- BE-AW-03: Authentication system migrated

## Description
Replace the existing authentication system with Appwrite's authentication service, including login/logout flows, session management, password reset functionality, and role-based access control integration. This migration will provide enhanced security features, session persistence, and seamless integration with the Appwrite backend.

The implementation will maintain all existing authentication functionality while adding new features like multi-factor authentication support and improved session management.

## Acceptance Criteria
- [ ] Login screen updated to use Appwrite authentication
- [ ] Registration flow migrated to Appwrite
- [ ] Password reset functionality implemented
- [ ] Session persistence and management working
- [ ] Role-based navigation and access control
- [ ] Multi-factor authentication support added
- [ ] Biometric authentication integration (optional)
- [ ] Authentication error handling improved
- [ ] Logout functionality with proper cleanup
- [ ] Authentication state management optimized

## Technical Notes

### Updated Login Screen

#### Login Component with Appwrite
```typescript
// frontend/app/(auth)/login.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/auth';
import { AppwriteException } from 'react-native-appwrite';

export default function LoginScreen() {
  const { login, isLoading } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;

    try {
      await login(formData.email, formData.password);
      // Navigation will be handled by the auth context
    } catch (error) {
      console.error('Login error:', error);
      
      if (error instanceof AppwriteException) {
        switch (error.code) {
          case 401:
            Alert.alert('Login Failed', 'Invalid email or password. Please try again.');
            break;
          case 429:
            Alert.alert('Too Many Attempts', 'Please wait a moment before trying again.');
            break;
          default:
            Alert.alert('Login Failed', error.message || 'An unexpected error occurred.');
        }
      } else {
        Alert.alert('Login Failed', 'Please check your internet connection and try again.');
      }
    }
  };

  const handleForgotPassword = () => {
    router.push('/(auth)/forgot-password');
  };

  const handleRegister = () => {
    router.push('/(auth)/register');
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to continue to Immune Me</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={[styles.input, errors.email && styles.inputError]}
              value={formData.email}
              onChangeText={(value) => handleInputChange('email', value)}
              placeholder="Enter your email"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
            />
            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={[styles.passwordContainer, errors.password && styles.inputError]}>
              <TextInput
                style={styles.passwordInput}
                value={formData.password}
                onChangeText={(value) => handleInputChange('password', value)}
                placeholder="Enter your password"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                editable={!isLoading}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.passwordToggle}
                disabled={isLoading}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#6c757d"
                />
              </TouchableOpacity>
            </View>
            {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
          </View>

          <TouchableOpacity
            style={styles.forgotPasswordButton}
            onPress={handleForgotPassword}
            disabled={isLoading}
          >
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.loginButtonText}>Sign In</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <TouchableOpacity onPress={handleRegister} disabled={isLoading}>
            <Text style={styles.registerLink}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
  },
  form: {
    marginBottom: 30,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#212529',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  inputError: {
    borderColor: '#dc3545',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  passwordInput: {
    flex: 1,
    padding: 16,
    fontSize: 16,
  },
  passwordToggle: {
    padding: 16,
  },
  errorText: {
    color: '#dc3545',
    fontSize: 14,
    marginTop: 4,
  },
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    marginBottom: 20,
  },
  forgotPasswordText: {
    color: '#007bff',
    fontSize: 14,
  },
  loginButton: {
    backgroundColor: '#007bff',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  loginButtonDisabled: {
    backgroundColor: '#6c757d',
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#6c757d',
  },
  registerLink: {
    fontSize: 14,
    color: '#007bff',
    fontWeight: '500',
  },
});
```

### Password Reset Implementation

#### Forgot Password Screen
```typescript
// frontend/app/(auth)/forgot-password.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import appwrite from '../../services/appwrite';
import { AppwriteException } from 'react-native-appwrite';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleSendResetEmail = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    try {
      setIsLoading(true);
      
      await appwrite.account.createRecovery(
        email,
        `${process.env.EXPO_PUBLIC_APP_URL}/reset-password`
      );

      setEmailSent(true);
      Alert.alert(
        'Reset Email Sent',
        'Please check your email for password reset instructions.',
        [{ text: 'OK', onPress: () => router.back() }]
      );

    } catch (error) {
      console.error('Password reset error:', error);
      
      if (error instanceof AppwriteException) {
        switch (error.code) {
          case 404:
            Alert.alert('Email Not Found', 'No account found with this email address.');
            break;
          case 429:
            Alert.alert('Too Many Requests', 'Please wait before requesting another reset.');
            break;
          default:
            Alert.alert('Error', error.message || 'Failed to send reset email.');
        }
      } else {
        Alert.alert('Error', 'Please check your internet connection and try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#007bff" />
        </TouchableOpacity>
        <Text style={styles.title}>Reset Password</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.description}>
          Enter your email address and we'll send you instructions to reset your password.
        </Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email Address</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="Enter your email"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isLoading && !emailSent}
          />
        </View>

        <TouchableOpacity
          style={[styles.sendButton, (isLoading || emailSent) && styles.sendButtonDisabled]}
          onPress={handleSendResetEmail}
          disabled={isLoading || emailSent}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.sendButtonText}>
              {emailSent ? 'Email Sent' : 'Send Reset Email'}
            </Text>
          )}
        </TouchableOpacity>

        {emailSent && (
          <View style={styles.successMessage}>
            <Ionicons name="checkmark-circle" size={24} color="#28a745" />
            <Text style={styles.successText}>
              Reset instructions have been sent to your email.
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#212529',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  description: {
    fontSize: 16,
    color: '#6c757d',
    marginBottom: 30,
    lineHeight: 24,
  },
  inputGroup: {
    marginBottom: 30,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#212529',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  sendButton: {
    backgroundColor: '#007bff',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#6c757d',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  successMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    padding: 16,
    backgroundColor: '#d4edda',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#c3e6cb',
  },
  successText: {
    marginLeft: 12,
    fontSize: 14,
    color: '#155724',
    flex: 1,
  },
});
```

### Enhanced Authentication Context

#### Updated Auth Context with Appwrite Features
```typescript
// frontend/context/auth.tsx
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Models } from 'react-native-appwrite';
import appwrite from '../services/appwrite';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

interface User extends Models.User<Models.Preferences> {
  role?: string;
  facilityId?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isOnline: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  updateUserInfo: (userInfo: Partial<User>) => void;
  refreshUser: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    checkAuthState();
    setupNetworkListener();
  }, []);

  const setupNetworkListener = () => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected ?? false);
    });

    return unsubscribe;
  };

  const checkAuthState = async () => {
    try {
      setIsLoading(true);
      
      // Try to get current session from Appwrite
      const session = await appwrite.getCurrentSession();
      if (session) {
        const currentUser = await appwrite.getCurrentUser();
        setUser(currentUser);
      } else {
        // Check for cached user data for offline access
        const cachedUser = await AsyncStorage.getItem('user_session');
        if (cachedUser) {
          const userData = JSON.parse(cachedUser);
          // Set user from cache but mark as potentially stale
          setUser({ ...userData, isOfflineCache: true });
        }
      }
    } catch (error) {
      console.log('No active session found');
      
      // Try to load cached user for offline access
      try {
        const cachedUser = await AsyncStorage.getItem('user_session');
        if (cachedUser) {
          const userData = JSON.parse(cachedUser);
          setUser({ ...userData, isOfflineCache: true });
        }
      } catch (cacheError) {
        console.log('No cached user data');
      }
      
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      // Create email session
      await appwrite.account.createEmailSession(email, password);
      
      // Get user details
      const currentUser = await appwrite.getCurrentUser();
      setUser(currentUser);

      // Cache user data for offline access
      await AsyncStorage.setItem('user_session', JSON.stringify({
        $id: currentUser.$id,
        email: currentUser.email,
        name: currentUser.name,
        role: currentUser.prefs?.role,
        facilityId: currentUser.prefs?.facilityId,
        cachedAt: new Date().toISOString()
      }));

      // Cache user preferences
      await AsyncStorage.setItem('user_preferences', JSON.stringify(currentUser.prefs));

    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      // Delete current session from Appwrite
      if (isOnline) {
        await appwrite.account.deleteSession('current');
      }
      
      // Clear local storage
      await AsyncStorage.multiRemove([
        'user_session',
        'user_preferences',
        'offline_queue',
        'sync_timestamp'
      ]);
      
      setUser(null);
    } catch (error) {
      console.error('Logout failed:', error);
      // Clear local state even if server logout fails
      setUser(null);
      await AsyncStorage.multiRemove([
        'user_session',
        'user_preferences',
        'offline_queue',
        'sync_timestamp'
      ]);
    }
  };

  const register = async (email: string, password: string, name: string) => {
    try {
      // Create account
      await appwrite.account.create('unique()', email, password, name);
      
      // Automatically log in after registration
      await login(email, password);
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  };

  const updateUserInfo = (userInfo: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...userInfo };
      setUser(updatedUser);
      
      // Update cached user data
      AsyncStorage.setItem('user_session', JSON.stringify({
        $id: updatedUser.$id,
        email: updatedUser.email,
        name: updatedUser.name,
        role: updatedUser.prefs?.role,
        facilityId: updatedUser.prefs?.facilityId,
        cachedAt: new Date().toISOString()
      }));
    }
  };

  const refreshUser = async () => {
    if (!isOnline) return;

    try {
      const currentUser = await appwrite.getCurrentUser();
      setUser(currentUser);
      
      // Update cache
      await AsyncStorage.setItem('user_session', JSON.stringify({
        $id: currentUser.$id,
        email: currentUser.email,
        name: currentUser.name,
        role: currentUser.prefs?.role,
        facilityId: currentUser.prefs?.facilityId,
        cachedAt: new Date().toISOString()
      }));
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    try {
      await appwrite.account.updatePassword(newPassword, currentPassword);
    } catch (error) {
      console.error('Password change failed:', error);
      throw error;
    }
  };

  const sendPasswordReset = async (email: string) => {
    try {
      await appwrite.account.createRecovery(
        email,
        `${process.env.EXPO_PUBLIC_APP_URL}/reset-password`
      );
    } catch (error) {
      console.error('Password reset failed:', error);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    isOnline,
    login,
    logout,
    register,
    updateUserInfo,
    refreshUser,
    changePassword,
    sendPasswordReset
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
```

### Role-Based Navigation

#### Protected Route Component
```typescript
// frontend/components/ProtectedRoute.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAuth } from '../context/auth';
import { Ionicons } from '@expo/vector-icons';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: string[];
  fallback?: React.ReactNode;
}

export default function ProtectedRoute({ 
  children, 
  requiredRoles = [], 
  fallback 
}: ProtectedRouteProps) {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return fallback || (
      <View style={styles.container}>
        <Ionicons name="lock-closed-outline" size={64} color="#6c757d" />
        <Text style={styles.message}>Authentication required</Text>
      </View>
    );
  }

  if (requiredRoles.length > 0) {
    const userRole = user?.prefs?.role;
    if (!userRole || !requiredRoles.includes(userRole)) {
      return fallback || (
        <View style={styles.container}>
          <Ionicons name="shield-outline" size={64} color="#dc3545" />
          <Text style={styles.message}>Access denied</Text>
          <Text style={styles.submessage}>
            You don't have permission to access this section
          </Text>
        </View>
      );
    }
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  message: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212529',
    marginTop: 16,
    textAlign: 'center',
  },
  submessage: {
    fontSize: 14,
    color: '#6c757d',
    marginTop: 8,
    textAlign: 'center',
  },
});
```

## Files to Create/Modify
- `frontend/app/(auth)/login.tsx` - Updated login screen with Appwrite
- `frontend/app/(auth)/register.tsx` - Registration screen with Appwrite
- `frontend/app/(auth)/forgot-password.tsx` - Password reset functionality
- `frontend/app/(auth)/reset-password.tsx` - Password reset completion
- `frontend/context/auth.tsx` - Enhanced authentication context
- `frontend/components/ProtectedRoute.tsx` - Role-based route protection
- `frontend/hooks/useAuthGuard.ts` - Authentication guard hook
- `frontend/services/auth.ts` - Authentication service layer
- `frontend/types/auth.ts` - Authentication type definitions

## Testing Requirements

### Authentication Flow Testing
1. **Login Flow Test**
   ```typescript
   describe('Login Flow', () => {
     it('should login with valid credentials', async () => {
       const { result } = renderHook(() => useAuth());
       
       await act(async () => {
         await result.current.login('test@example.com', 'password123');
       });
       
       expect(result.current.isAuthenticated).toBe(true);
       expect(result.current.user).toBeDefined();
     });
   });
   ```

2. **Session Persistence Test**
   ```typescript
   describe('Session Persistence', () => {
     it('should restore session on app restart', async () => {
       // Mock AsyncStorage with cached session
       const mockSession = {
         $id: 'user-123',
         email: 'test@example.com',
         name: 'Test User'
       };
       
       AsyncStorage.setItem('user_session', JSON.stringify(mockSession));
       
       const { result } = renderHook(() => useAuth());
       
       await waitFor(() => {
         expect(result.current.user).toBeDefined();
       });
     });
   });
   ```

3. **Role-Based Access Test**
   ```typescript
   describe('Role-Based Access', () => {
     it('should restrict access based on user role', () => {
       const mockUser = { prefs: { role: 'healthcare_worker' } };
       
       const { getByText } = render(
         <AuthProvider>
           <ProtectedRoute requiredRoles={['admin']}>
             <Text>Admin Content</Text>
           </ProtectedRoute>
         </AuthProvider>
       );
       
       expect(getByText('Access denied')).toBeTruthy();
     });
   });
   ```

### Security Testing
1. **Token Validation Test**
   - Verify session tokens are properly validated
   - Test token refresh mechanisms
   - Validate secure storage of credentials

2. **Logout Security Test**
   - Verify complete session cleanup on logout
   - Test automatic logout on token expiration
   - Validate secure data clearing

## Implementation Steps

### Phase 1: Basic Authentication Migration
1. Update login screen to use Appwrite
2. Implement registration flow
3. Add password reset functionality
4. Test basic authentication flows

### Phase 2: Enhanced Features
1. Add session persistence
2. Implement role-based access control
3. Add offline authentication support
4. Test enhanced features

### Phase 3: Security and Optimization
1. Add biometric authentication (optional)
2. Implement MFA support
3. Optimize authentication performance
4. Security testing and validation

### Phase 4: Integration Testing
1. Test with backend authentication system
2. Validate role-based permissions
3. Test offline/online transitions
4. Performance optimization

## Success Metrics
- All authentication flows working with Appwrite
- Session persistence functional
- Role-based access control operational
- Password reset functionality working
- Offline authentication support implemented
- Security requirements met
- Performance maintained or improved

## Rollback Plan
- Keep existing authentication system as fallback
- Implement feature flags for gradual migration
- Test rollback procedures thoroughly
- Maintain data consistency during transition

## Next Steps
After completion, this task enables:
- FE-AW-04: Data services migration
- FE-AW-05: Real-time synchronization
- FE-AW-06: Offline indicators and handling
- Full Appwrite integration completion