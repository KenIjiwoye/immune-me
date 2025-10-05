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
import { registerSchema, type RegisterFormData } from '../schemas/auth';
import { ProfileType } from '../types/profile';

export default function RegisterScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const selectedProfileType = watch('profileType');

  const onSubmit = async (data: RegisterFormData) => {
    try {
      setIsLoading(true);
      setError(null);

      // Register the user
      await authService.register({
        email: data.email,
        password: data.password,
        name: data.name,
        profileType: data.profileType,
      });

      // Navigate to verify email screen
      router.replace('/(auth)/verify-email');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Registration failed';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const profileTypeOptions: { value: ProfileType; label: string; description: string }[] = [
    {
      value: 'patient',
      label: 'Patient',
      description: 'Access your immunization records and schedule appointments',
    },
    {
      value: 'employee',
      label: 'Healthcare Worker',
      description: 'Manage patient records and administer vaccinations',
    },
    {
      value: 'admin',
      label: 'Administrator',
      description: 'Manage facilities, users, and system settings',
    },
  ];

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          padding: 20,
          backgroundColor: '#fff',
        }}
      >
        <View style={{ alignItems: 'center', marginBottom: 32 }}>
          <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#333', marginBottom: 8 }}>
            Create Account
          </Text>
          <Text style={{ fontSize: 16, color: '#666', textAlign: 'center' }}>
            Join our healthcare platform
          </Text>
        </View>

        {/* Profile Type Selection */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ fontSize: 16, fontWeight: '500', color: '#333', marginBottom: 12 }}>
            I am a...
          </Text>
          <Controller
            control={control}
            name="profileType"
            render={({ field: { onChange, value } }) => (
              <View style={{ gap: 8 }}>
                {profileTypeOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={{
                      borderWidth: 2,
                      borderColor: value === option.value ? '#3b82f6' : '#d1d5db',
                      borderRadius: 8,
                      padding: 16,
                      backgroundColor: value === option.value ? '#eff6ff' : '#fff',
                    }}
                    onPress={() => onChange(option.value)}
                  >
                    <Text style={{
                      fontSize: 16,
                      fontWeight: '600',
                      color: value === option.value ? '#3b82f6' : '#333',
                      marginBottom: 4,
                    }}>
                      {option.label}
                    </Text>
                    <Text style={{
                      fontSize: 14,
                      color: value === option.value ? '#1d4ed8' : '#666',
                    }}>
                      {option.description}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          />
          {errors.profileType && (
            <Text style={{ color: '#ef4444', fontSize: 14, marginTop: 8 }}>
              {errors.profileType.message}
            </Text>
          )}
        </View>

        {/* Name Field */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 16, fontWeight: '500', color: '#333', marginBottom: 8 }}>
            Full Name
          </Text>
          <Controller
            control={control}
            name="name"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: errors.name ? '#ef4444' : '#d1d5db',
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 16,
                  backgroundColor: '#fff',
                }}
                placeholder="Enter your full name"
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                autoCapitalize="words"
                autoCorrect={false}
              />
            )}
          />
          {errors.name && (
            <Text style={{ color: '#ef4444', fontSize: 14, marginTop: 4 }}>
              {errors.name.message}
            </Text>
          )}
        </View>

        {/* Email Field */}
        <View style={{ marginBottom: 16 }}>
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

        {/* Password Field */}
        <View style={{ marginBottom: 16 }}>
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
                placeholder="Create a password"
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

        {/* Confirm Password Field */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ fontSize: 16, fontWeight: '500', color: '#333', marginBottom: 8 }}>
            Confirm Password
          </Text>
          <Controller
            control={control}
            name="confirmPassword"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: errors.confirmPassword ? '#ef4444' : '#d1d5db',
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 16,
                  backgroundColor: '#fff',
                }}
                placeholder="Confirm your password"
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
            )}
          />
          {errors.confirmPassword && (
            <Text style={{ color: '#ef4444', fontSize: 14, marginTop: 4 }}>
              {errors.confirmPassword.message}
            </Text>
          )}
        </View>

        {/* Terms and Conditions */}
        <View style={{ marginBottom: 24 }}>
          <Controller
            control={control}
            name="acceptTerms"
            render={({ field: { onChange, value } }) => (
              <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                <TouchableOpacity
                  style={{
                    width: 20,
                    height: 20,
                    borderWidth: 2,
                    borderColor: errors.acceptTerms ? '#ef4444' : '#d1d5db',
                    borderRadius: 4,
                    marginRight: 12,
                    marginTop: 2,
                    backgroundColor: value ? '#3b82f6' : '#fff',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  onPress={() => onChange(!value)}
                >
                  {value && (
                    <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>✓</Text>
                  )}
                </TouchableOpacity>
                <Text style={{ flex: 1, fontSize: 14, color: '#666', lineHeight: 20 }}>
                  I agree to the{' '}
                  <Text style={{ color: '#3b82f6' }}>Terms and Conditions</Text>
                  {' '}and{' '}
                  <Text style={{ color: '#3b82f6' }}>Privacy Policy</Text>
                </Text>
              </View>
            )}
          />
          {errors.acceptTerms && (
            <Text style={{ color: '#ef4444', fontSize: 14, marginTop: 8 }}>
              {errors.acceptTerms.message}
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

        {/* Register Button */}
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
              Create Account
            </Text>
          )}
        </TouchableOpacity>

        {/* Link to Login */}
        <View style={{ alignItems: 'center' }}>
          <Text style={{ color: '#666', fontSize: 14 }}>
            Already have an account?{' '}
          </Text>
          <Link href="/(auth)/login" asChild>
            <TouchableOpacity>
              <Text style={{ color: '#3b82f6', fontSize: 14, fontWeight: '600' }}>
                Sign In
              </Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}