import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
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
import { authService } from '@/services/appwriteAuth';
import { verifyEmailSchema, type VerifyEmailFormData } from '@/schemas/auth';

export default function VerifyEmailScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<VerifyEmailFormData>({
    resolver: zodResolver(verifyEmailSchema),
  });

  // Check if user is already verified on mount
  useEffect(() => {
    const checkVerificationStatus = async () => {
      try {
        const user = await authService.getCurrentUser();
        if (user.emailVerification) {
          // User is already verified, redirect to main app
          router.replace('/(tabs)');
        }
      } catch (error) {
        // User not logged in or other error, stay on this screen
      }
    };

    checkVerificationStatus();
  }, []);

  const onResendVerification = async (data: VerifyEmailFormData) => {
    try {
      setResendLoading(true);
      setError(null);

      // Send verification email
      await authService.sendEmailVerification('exp://verify-email');

      setEmailSent(true);

      // Hide success message after 3 seconds
      setTimeout(() => setEmailSent(false), 3000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send verification email';
      setError(errorMessage);
    } finally {
      setResendLoading(false);
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
          <View style={{
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: '#3b82f6',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 24,
          }}>
            <Text style={{ fontSize: 32, color: '#fff' }}>✉️</Text>
          </View>

          <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#333', marginBottom: 8 }}>
            Verify Your Email
          </Text>
          <Text style={{ fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 8 }}>
            We've sent a verification link to your email address
          </Text>
          <Text style={{ fontSize: 14, color: '#666', textAlign: 'center' }}>
            Please check your email and click the link to verify your account
          </Text>
        </View>

        {/* Success message for resend */}
        {emailSent && (
          <View style={{
            backgroundColor: '#d1fae5',
            borderColor: '#a7f3d0',
            borderWidth: 1,
            borderRadius: 8,
            padding: 12,
            marginBottom: 16,
          }}>
            <Text style={{ color: '#065f46', fontSize: 14, textAlign: 'center' }}>
              Verification email sent successfully!
            </Text>
          </View>
        )}

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

        <View style={{ marginBottom: 24 }}>
          {/* Email Field for resend */}
          <Text style={{ fontSize: 16, fontWeight: '500', color: '#333', marginBottom: 8 }}>
            Email Address
          </Text>
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <React.Fragment>
                <Text style={{
                  borderWidth: 1,
                  borderColor: errors.email ? '#ef4444' : '#d1d5db',
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 16,
                  backgroundColor: '#f9fafb',
                  color: '#666',
                }}>
                  {value || 'Enter your email to resend verification'}
                </Text>
                {errors.email && (
                  <Text style={{ color: '#ef4444', fontSize: 14, marginTop: 4 }}>
                    {errors.email.message}
                  </Text>
                )}
              </React.Fragment>
            )}
          />
        </View>

        {/* Resend Verification Button */}
        <TouchableOpacity
          style={{
            backgroundColor: resendLoading ? '#9ca3af' : '#3b82f6',
            borderRadius: 8,
            padding: 16,
            alignItems: 'center',
            marginBottom: 16,
          }}
          onPress={handleSubmit(onResendVerification)}
          disabled={resendLoading}
        >
          {resendLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>
              Resend Verification Email
            </Text>
          )}
        </TouchableOpacity>

        {/* Check Verification Status Button */}
        <TouchableOpacity
          style={{
            backgroundColor: '#fff',
            borderWidth: 1,
            borderColor: '#d1d5db',
            borderRadius: 8,
            padding: 16,
            alignItems: 'center',
            marginBottom: 24,
          }}
          onPress={async () => {
            try {
              setIsLoading(true);
              const user = await authService.getCurrentUser();
              if (user.emailVerification) {
                router.replace('/(tabs)');
              } else {
                Alert.alert('Not Verified', 'Your email is not yet verified. Please check your email and click the verification link.');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to check verification status');
            } finally {
              setIsLoading(false);
            }
          }}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#3b82f6" />
          ) : (
            <Text style={{ color: '#3b82f6', fontSize: 16, fontWeight: '600' }}>
              I've Verified My Email
            </Text>
          )}
        </TouchableOpacity>

        {/* Links */}
        <View style={{ alignItems: 'center', gap: 12 }}>
          <Text style={{ color: '#666', fontSize: 14 }}>
            Wrong email address?
          </Text>
          <Link href="/(auth)/register" asChild>
            <TouchableOpacity>
              <Text style={{ color: '#3b82f6', fontSize: 14, fontWeight: '600' }}>
                Sign Up Again
              </Text>
            </TouchableOpacity>
          </Link>

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