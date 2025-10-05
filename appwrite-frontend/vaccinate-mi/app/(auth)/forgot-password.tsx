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
import { authService } from '../services/appwriteAuth';
import { forgotPasswordSchema, type ForgotPasswordFormData } from '../schemas/auth';

export default function ForgotPasswordScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    try {
      setIsLoading(true);
      setError(null);

      // Send password recovery email
      await authService.sendPasswordRecovery(data.email, 'exp://reset-password');

      setEmailSent(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send reset email';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (emailSent) {
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
          <View style={{ alignItems: 'center' }}>
            <View style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: '#10b981',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 24,
            }}>
              <Text style={{ fontSize: 32, color: '#fff' }}>✓</Text>
            </View>

            <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 8 }}>
              Check Your Email
            </Text>
            <Text style={{ fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 32 }}>
              We've sent a password reset link to{'\n'}
              <Text style={{ fontWeight: '600', color: '#333' }}>{getValues('email')}</Text>
            </Text>

            <Text style={{ fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 32 }}>
              If you don't see the email in your inbox, check your spam folder.
            </Text>

            <TouchableOpacity
              style={{
                backgroundColor: '#3b82f6',
                borderRadius: 8,
                padding: 16,
                alignItems: 'center',
                width: '100%',
                marginBottom: 16,
              }}
              onPress={() => setEmailSent(false)}
            >
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>
                Try Different Email
              </Text>
            </TouchableOpacity>

            <Link href="/(auth)/login" asChild>
              <TouchableOpacity>
                <Text style={{ color: '#3b82f6', fontSize: 16, fontWeight: '600' }}>
                  Back to Sign In
                </Text>
              </TouchableOpacity>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

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
            Reset Password
          </Text>
          <Text style={{ fontSize: 16, color: '#666', textAlign: 'center' }}>
            Enter your email address and we'll send you a link to reset your password
          </Text>
        </View>

        <View style={{ marginBottom: 24 }}>
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

        {/* Submit Button */}
        <TouchableOpacity
          style={{
            backgroundColor: isLoading ? '#9ca3af' : '#3b82f6',
            borderRadius: 8,
            padding: 16,
            alignItems: 'center',
            marginBottom: 24,
          }}
          onPress={handleSubmit(onSubmit)}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>
              Send Reset Link
            </Text>
          )}
        </TouchableOpacity>

        {/* Links */}
        <View style={{ alignItems: 'center', gap: 12 }}>
          <Text style={{ color: '#666', fontSize: 14 }}>
            Remember your password?
          </Text>
          <Link href="/(auth)/login" asChild>
            <TouchableOpacity>
              <Text style={{ color: '#3b82f6', fontSize: 14, fontWeight: '600' }}>
                Back to Sign In
              </Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}