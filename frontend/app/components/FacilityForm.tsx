import React from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Keyboard } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { Ionicons } from '@expo/vector-icons';

interface FacilityFormData {
  name: string;
  district: string;
  address: string;
  contactPhone: string;
}

interface FacilityFormProps {
  initialData?: Partial<FacilityFormData>;
  onSubmit: (data: FacilityFormData) => void;
  onCancel?: () => void;
  isLoading?: boolean;
  submitButtonText?: string;
}

export default function FacilityForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
  submitButtonText = 'Save Facility',
}: FacilityFormProps) {
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FacilityFormData>({
    defaultValues: {
      name: '',
      district: '',
      address: '',
      contactPhone: '',
      ...initialData,
    },
  });

  const FormInput = ({
    name,
    label,
    placeholder,
    keyboardType = 'default',
    required = false,
    multiline = false,
  }: {
    name: keyof FacilityFormData;
    label: string;
    placeholder: string;
    keyboardType?: 'default' | 'phone-pad';
    required?: boolean;
    multiline?: boolean;
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
            style={[styles.input, errors[name] && styles.inputError, multiline && styles.multilineInput]}
            onBlur={onBlur}
            onChangeText={onChange}
            value={String(value || '')}
            placeholder={placeholder}
            keyboardType={keyboardType}
            multiline={multiline}
            numberOfLines={multiline ? 3 : 1}
            editable={!isLoading}
          />
        )}
      />
      {errors[name] && (
        <Text style={styles.errorText}>{errors[name]?.message}</Text>
      )}
    </View>
  );

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      onScrollBeginDrag={Keyboard.dismiss}
    >
      <View style={styles.formSection}>
        <Text style={styles.sectionTitle}>Facility Information</Text>

        <FormInput
          name="name"
          label="Facility Name"
          placeholder="Enter facility name"
          required
        />

        <FormInput
          name="district"
          label="District"
          placeholder="Enter district"
          required
        />

        <FormInput
          name="address"
          label="Address"
          placeholder="Enter full address"
          multiline
          required
        />

        <FormInput
          name="contactPhone"
          label="Contact Phone"
          placeholder="Enter contact phone number"
          keyboardType="phone-pad"
          required
        />
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
  multilineInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: '#dc3545',
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