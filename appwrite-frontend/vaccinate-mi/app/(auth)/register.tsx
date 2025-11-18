import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  View,
} from 'react-native';
import { Layout, Text, Input, Button, Spinner, Radio, RadioGroup, CheckBox } from '@ui-kitten/components';
import { Link, router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { authService } from '@/services/appwriteAuth';
import { registerSchema, type RegisterFormData } from '@/schemas/auth';
import { ProfileType } from '@/types/profile';

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
          padding: 20,
          backgroundColor: '#ffffff',
        }}
      >
        <Layout style={{ alignItems: 'center', marginBottom: 32 }} level="1">
          <Text category="h1" style={{ marginBottom: 8 }}>
            Create Account
          </Text>
          <Text category="s1" appearance="hint" style={{ textAlign: 'center' }}>
            Join our healthcare platform
          </Text>
        </Layout>

        {/* Profile Type Selection */}
        <Layout style={{ marginBottom: 24 }} level="1">
          <Text category="label" style={{ marginBottom: 12 }}>
            I am a...
          </Text>
          <Controller
            control={control}
            name="profileType"
            render={({ field: { onChange, value } }) => (
              <RadioGroup
                selectedIndex={profileTypeOptions.findIndex(opt => opt.value === value)}
                onChange={index => onChange(profileTypeOptions[index].value)}
              >
                {profileTypeOptions.map((option) => (
                  <Radio
                    key={option.value}
                    style={{ marginBottom: 8 }}
                  >
                    {() => (
                      <Layout style={{ marginLeft: 8, flex: 1 }} level="1">
                        <Text category="s1" style={{ marginBottom: 4 }}>
                          {option.label}
                        </Text>
                        <Text category="c1" appearance="hint">
                          {option.description}
                        </Text>
                      </Layout>
                    )}
                  </Radio>
                ))}
              </RadioGroup>
            )}
          />
          {errors.profileType && (
            <Text status="danger" category="c1" style={{ marginTop: 8 }}>
              {errors.profileType.message}
            </Text>
          )}
        </Layout>

        {/* Name Field */}
        <Layout style={{ marginBottom: 16 }} level="1">
          <Controller
            control={control}
            name="name"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Full Name"
                placeholder="Enter your full name"
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                autoCapitalize="words"
                autoCorrect={false}
                status={errors.name ? 'danger' : 'basic'}
                caption={errors.name?.message}
              />
            )}
          />
        </Layout>

        {/* Email Field */}
        <Layout style={{ marginBottom: 16 }} level="1">
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

        {/* Password Field */}
        <Layout style={{ marginBottom: 16 }} level="1">
          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Password"
                placeholder="Create a password"
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

        {/* Confirm Password Field */}
        <Layout style={{ marginBottom: 24 }} level="1">
          <Controller
            control={control}
            name="confirmPassword"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Confirm Password"
                placeholder="Confirm your password"
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                status={errors.confirmPassword ? 'danger' : 'basic'}
                caption={errors.confirmPassword?.message}
              />
            )}
          />
        </Layout>

        {/* Terms and Conditions */}
        <Layout style={{ marginBottom: 24 }} level="1">
          <Controller
            control={control}
            name="acceptTerms"
            render={({ field: { onChange, value } }) => (
              <CheckBox
                checked={value}
                onChange={checked => onChange(checked)}
                status={errors.acceptTerms ? 'danger' : 'basic'}
              >
                {() => (
                  <Text category="c1" appearance="hint" style={{ flex: 1, marginLeft: 8 }}>
                    I agree to the{' '}
                    <Text status="primary">Terms and Conditions</Text>
                    {' '}and{' '}
                    <Text status="primary">Privacy Policy</Text>
                  </Text>
                )}
              </CheckBox>
            )}
          />
          {errors.acceptTerms && (
            <Text status="danger" category="c1" style={{ marginTop: 8 }}>
              {errors.acceptTerms.message}
            </Text>
          )}
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

        {/* Register Button */}
        <Button
          style={{ marginBottom: 24 }}
          onPress={handleSubmit(onSubmit)}
          disabled={isLoading}
          accessoryLeft={isLoading ? renderLoadingIndicator : undefined}
        >
          {isLoading ? 'Creating Account...' : 'Create Account'}
        </Button>

        {/* Link to Login */}
        <Layout style={{ alignItems: 'center' }} level="1">
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text appearance="hint" category="c1">
              Already have an account?{' '}
            </Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity>
                <Text status="primary" category="c1" style={{ fontWeight: '600' }}>
                  Sign In
                </Text>
              </TouchableOpacity>
            </Link>
          </View>
        </Layout>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}