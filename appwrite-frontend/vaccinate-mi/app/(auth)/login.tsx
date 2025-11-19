import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Layout, Text, Input, Button, Spinner } from '@ui-kitten/components';
import { Link, router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { authService } from '@/services/appwriteAuth';
import { loginSchema, type LoginFormData } from '@/schemas/auth';

export default function LoginScreen() {
  const [isLoading, setIsLoading] = useState(false);
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
      setIsLoading(true);
      
      // Use the auth service directly for login
      await authService.login({ email: data.email, password: data.password });
      
      // Navigate to main app after successful login
      router.replace('/(tabs)');
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const renderLoadingIndicator = () => (
    <Spinner size="small" status="control" />
  );

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
          backgroundColor: '#ffffff',
        }}
      >
        <Layout style={{ alignItems: 'center', marginBottom: 40 }} level="1">
          <Text category="h1" style={{ marginBottom: 8 }}>
            Welcome Back
          </Text>
          <Text category="s1" appearance="hint" style={{ textAlign: 'center' }}>
            Sign in to your account
          </Text>
        </Layout>

        <Layout style={{ marginBottom: 20 }} level="1">
          {/* Email Field */}
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Email"
                placeholder="Enter your email"
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                status={errors.email ? 'danger' : 'basic'}
                caption={errors.email?.message}
              />
            )}
          />
        </Layout>

        <Layout style={{ marginBottom: 24 }} level="1">
          {/* Password Field */}
          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Password"
                placeholder="Enter your password"
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                status={errors.password ? 'danger' : 'basic'}
                caption={errors.password?.message}
              />
            )}
          />
        </Layout>

        {/* Error Display */}
        {error && (
          <Layout
            style={{
              backgroundColor: '#fef2f2',
              borderColor: '#fecaca',
              borderWidth: 1,
              borderRadius: 8,
              padding: 12,
              marginBottom: 16,
            }}
            level="1"
          >
            <Text status="danger">
              {error}
            </Text>
          </Layout>
        )}

        {/* Login Button */}
        <Button
          style={{ marginBottom: 16 }}
          onPress={handleSubmit(onSubmit)}
          disabled={isLoading}
          accessoryLeft={isLoading ? renderLoadingIndicator : undefined}
        >
          {isLoading ? 'Signing In...' : 'Sign In'}
        </Button>

        {/* Links */}
        <Layout style={{ alignItems: 'center', gap: 12 }} level="1">
          <Link href="/(auth)/forgot-password" asChild>
            <TouchableOpacity>
              <Text status="primary" category="c1">
                Forgot Password?
              </Text>
            </TouchableOpacity>
          </Link>

          <Layout style={{ flexDirection: 'row', alignItems: 'center' }} level="1">
            <Text appearance="hint" category="c1">
              Don't have an account?{' '}
            </Text>
            <Link href="/(auth)/register" asChild>
              <TouchableOpacity>
                <Text status="primary" category="c1" style={{ fontWeight: '600' }}>
                  Sign Up
                </Text>
              </TouchableOpacity>
            </Link>
          </Layout>
        </Layout>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}