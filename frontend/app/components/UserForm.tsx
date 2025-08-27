import React from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Keyboard } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';

interface UserFormData {
  username: string;
  email: string;
  password: string;
  fullName: string;
  role: string;
  facilityId: number;
}

interface UserFormProps {
  initialData?: Partial<UserFormData>;
  onSubmit: (data: UserFormData) => void;
  onCancel?: () => void;
  isLoading?: boolean;
  submitButtonText?: string;
}

export default function UserForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
  submitButtonText = 'Save User',
}: UserFormProps) {
  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<UserFormData>({
    defaultValues: {
      username: '',
      email: '',
      password: '',
      fullName: '',
      role: 'healthcare_worker',
      facilityId: 0,
      ...initialData,
    },
  });

  const { data: facilities } = useQuery({
    queryKey: ['facilities'],
    queryFn: async () => {
      const response = await api.get('/facilities');
      return response.data.data;
    },
  });

  const selectedRole = watch('role');

  const FormInput = ({
    name,
    label,
    placeholder,
    keyboardType = 'default',
    secureTextEntry = false,
    required = false,
  }: {
    name: keyof UserFormData;
    label: string;
    placeholder: string;
    keyboardType?: 'default' | 'email-address';
    secureTextEntry?: boolean;
    required?: boolean;
  }) => (
    <View style={styles.formGroup}>
      <Text style={styles.label}>
        {label}
        {required && <Text style={styles.required}> *</Text>}
      </Text>
      <Controller
        control={control}
        name={name}
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            style={[styles.input, errors[name] && styles.inputError]}
            onBlur={onBlur}
            onChangeText={onChange}
            value={String(value || '')}
            placeholder={placeholder}
            keyboardType={keyboardType}
            secureTextEntry={secureTextEntry}
            editable={!isLoading}
          />
        )}
      />
      {errors[name] && (
        <Text style={styles.errorText}>{errors[name]?.message}</Text>
      )}
    </View>
  );

  const roles = [
    { value: 'administrator', label: 'Administrator' },
    { value: 'supervisor', label: 'Supervisor' },
    { value: 'doctor', label: 'Doctor' },
    { value: 'healthcare_worker', label: 'Healthcare Worker' },
  ];

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      onScrollBeginDrag={Keyboard.dismiss}
    >
      <View style={styles.formSection}>
        <Text style={styles.sectionTitle}>Account Information</Text>

        <FormInput
          name="username"
          label="Username"
          placeholder="Enter username"
          required
        />

        <FormInput
          name="email"
          label="Email"
          placeholder="Enter email address"
          keyboardType="email-address"
          required
        />

        <FormInput
          name="password"
          label="Password"
          placeholder="Enter password"
          secureTextEntry
          required
        />

        <FormInput
          name="fullName"
          label="Full Name"
          placeholder="Enter full name"
          required
        />
      </View>

      <View style={styles.formSection}>
        <Text style={styles.sectionTitle}>Role & Facility</Text>

        <View style={styles.formGroup}>
          <Text style={styles.label}>
            Role<Text style={styles.required}> *</Text>
          </Text>
          <Controller
            control={control}
            name="role"
            render={({ field: { onChange, value } }) => (
              <View style={styles.roleGrid}>
                {roles.map((role) => (
                  <TouchableOpacity
                    key={role.value}
                    style={[
                      styles.roleButton,
                      value === role.value && styles.roleButtonSelected
                    ]}
                    onPress={() => onChange(role.value)}
                    disabled={isLoading}
                  >
                    <Text style={[
                      styles.roleText,
                      value === role.value && styles.roleTextSelected
                    ]}>
                      {role.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          />
          {errors.role && <Text style={styles.errorText}>{errors.role.message}</Text>}
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>
            Facility<Text style={styles.required}> *</Text>
          </Text>
          <Controller
            control={control}
            name="facilityId"
            render={({ field: { onChange, value } }) => (
              <View style={styles.facilityList}>
                {facilities?.map((facility: any) => (
                  <TouchableOpacity
                    key={facility.id}
                    style={[
                      styles.facilityButton,
                      value === facility.id && styles.facilityButtonSelected
                    ]}
                    onPress={() => onChange(facility.id)}
                    disabled={isLoading}
                  >
                    <Text style={[
                      styles.facilityText,
                      value === facility.id && styles.facilityTextSelected
                    ]}>
                      {facility.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          />
          {errors.facilityId && <Text style={styles.errorText}>{errors.facilityId.message}</Text>}
        </View>
      </View>

      <View style={styles.buttonContainer}>
        {onCancel && (
          <TouchableOpacity
            style={[styles.cancelButton, isLoading && styles.buttonDisabled]}
            onPress={onCancel}
            disabled={isLoading}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
          onPress={handleSubmit(onSubmit)}
          disabled={isLoading}
        >
          <Text style={styles.submitButtonText}>
            {isLoading ? 'Saving...' : submitButtonText}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  formSection: {
    backgroundColor: '#fff',
    marginBottom: 16,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  required: {
    color: '#dc3545',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1a1a1a',
    backgroundColor: '#fff',
  },
  inputError: {
    borderColor: '#dc3545',
  },
  roleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  roleButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  roleButtonSelected: {
    borderColor: '#007bff',
    backgroundColor: '#f8f9ff',
  },
  roleText: {
    fontSize: 14,
    color: '#6c757d',
  },
  roleTextSelected: {
    color: '#007bff',
    fontWeight: '500',
  },
  facilityList: {
    gap: 8,
  },
  facilityButton: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  facilityButtonSelected: {
    borderColor: '#007bff',
    backgroundColor: '#f8f9ff',
  },
  facilityText: {
    fontSize: 16,
    color: '#6c757d',
  },
  facilityTextSelected: {
    color: '#007bff',
    fontWeight: '500',
  },
  errorText: {
    fontSize: 14,
    color: '#dc3545',
    marginTop: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    margin: 16,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#6c757d',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  submitButton: {
    flex: 2,
    backgroundColor: '#007bff',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#6c757d',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});