import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Link, router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/context/auth';
import { loginSchema, type LoginFormData } from '@/schemas/auth';

export default function LoginScreen() {
  const { login, isLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      setError(null);
      await login(data.email, data.password);
      // Navigation is handled by the auth context
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      setError(errorMessage);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          padding: 20,
          backgroundColor: '#fff',
        }}
      >
        <View style={{ alignItems: 'center', marginBottom: 40 }}>
          <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#333', marginBottom: 8 }}>
            Welcome Back
          </Text>
          <Text style={{ fontSize: 16, color: '#666', textAlign: 'center' }}>
            Sign in to your account
          </Text>
        </View>

        <View style={{ marginBottom: 20 }}>
          {/* Email Field */}
          <Text style={{ fontSize: 16, fontWeight: '500', color: '#333', marginBottom: 8 }}>
            Email
          </Text>
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: errors.email ? '#ef4444' : '#d1d5db',
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 16,
                  backgroundColor: '#fff',
                }}
                placeholder="Enter your email"
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            )}
          />
          {errors.email && (
            <Text style={{ color: '#ef4444', fontSize: 14, marginTop: 4 }}>
              {errors.email.message}
            </Text>
          )}
        </View>

        <View style={{ marginBottom: 24 }}>
          {/* Password Field */}
          <Text style={{ fontSize: 16, fontWeight: '500', color: '#333', marginBottom: 8 }}>
            Password
          </Text>
          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: errors.password ? '#ef4444' : '#d1d5db',
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 16,
                  backgroundColor: '#fff',
                }}
                placeholder="Enter your password"
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
            )}
          />
          {errors.password && (
            <Text style={{ color: '#ef4444', fontSize: 14, marginTop: 4 }}>
              {errors.password.message}
            </Text>
          )}
        </View>

        {/* Error Display */}
        {error && (
          <View style={{
            backgroundColor: '#fef2f2',
            borderColor: '#fecaca',
            borderWidth: 1,
            borderRadius: 8,
            padding: 12,
            marginBottom: 16,
          }}>
            <Text style={{ color: '#dc2626', fontSize: 14 }}>
              {error}
            </Text>
          </View>
        )}

        {/* Login Button */}
        <TouchableOpacity
          style={{
            backgroundColor: isLoading ? '#9ca3af' : '#3b82f6',
            borderRadius: 8,
            padding: 16,
            alignItems: 'center',
            marginBottom: 16,
          }}
          onPress={handleSubmit(onSubmit)}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>
              Sign In
            </Text>
          )}
        </TouchableOpacity>

        {/* Links */}
        <View style={{ alignItems: 'center', gap: 12 }}>
          <Link href="/(auth)/forgot-password" asChild>
            <TouchableOpacity>
              <Text style={{ color: '#3b82f6', fontSize: 14 }}>
                Forgot Password?
              </Text>
            </TouchableOpacity>
          </Link>

          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ color: '#666', fontSize: 14 }}>
              Don't have an account?{' '}
            </Text>
            <Link href="/(auth)/register" asChild>
              <TouchableOpacity>
                <Text style={{ color: '#3b82f6', fontSize: 14, fontWeight: '600' }}>
                  Sign Up
                </Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}