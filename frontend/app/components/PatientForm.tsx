import React from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { PatientFormData, patientSchema } from '../../types/patient';

interface PatientFormProps {
  initialData?: Partial<PatientFormData>;
  onSubmit: (data: PatientFormData) => void;
  isLoading?: boolean;
  submitButtonText?: string;
}

export default function PatientForm({
  initialData,
  onSubmit,
  isLoading = false,
  submitButtonText = 'Save Patient',
}: PatientFormProps) {
  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<PatientFormData>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      fullName: '',
      sex: 'M',
      dateOfBirth: format(new Date(), 'yyyy-MM-dd'),
      motherName: '',
      fatherName: '',
      district: '',
      townVillage: '',
      address: '',
      contactPhone: '',
      healthWorkerName: '',
      healthWorkerPhone: '',
      ...initialData,
    },
  });

  const [showDatePicker, setShowDatePicker] = React.useState(false);
  const selectedDate = watch('dateOfBirth');

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setValue('dateOfBirth', format(selectedDate, 'yyyy-MM-dd'), {
        shouldValidate: true,
      });
    }
  };

  const FormInput = ({
    name,
    label,
    placeholder,
    keyboardType = 'default',
    multiline = false,
    required = false,
  }: {
    name: keyof PatientFormData;
    label: string;
    placeholder: string;
    keyboardType?: 'default' | 'phone-pad' | 'email-address';
    multiline?: boolean;
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
            style={[styles.input, multiline && styles.textArea, errors[name] && styles.inputError]}
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
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.formSection}>
        <Text style={styles.sectionTitle}>Personal Information</Text>
        
        <FormInput
          name="fullName"
          label="Full Name"
          placeholder="Enter patient's full name"
          required
        />

        <View style={styles.formGroup}>
          <Text style={styles.label}>
            Sex<Text style={styles.required}> *</Text>
          </Text>
          <Controller
            control={control}
            name="sex"
            render={({ field: { onChange, value } }) => (
              <View style={styles.radioGroup}>
                <TouchableOpacity
                  style={[styles.radioButton, value === 'M' && styles.radioButtonSelected]}
                  onPress={() => onChange('M')}
                  disabled={isLoading}
                >
                  <Ionicons
                    name={value === 'M' ? 'radio-button-on' : 'radio-button-off'}
                    size={20}
                    color={value === 'M' ? '#007bff' : '#6c757d'}
                  />
                  <Text style={[styles.radioText, value === 'M' && styles.radioTextSelected]}>
                    Male
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.radioButton, value === 'F' && styles.radioButtonSelected]}
                  onPress={() => onChange('F')}
                  disabled={isLoading}
                >
                  <Ionicons
                    name={value === 'F' ? 'radio-button-on' : 'radio-button-off'}
                    size={20}
                    color={value === 'F' ? '#007bff' : '#6c757d'}
                  />
                  <Text style={[styles.radioText, value === 'F' && styles.radioTextSelected]}>
                    Female
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          />
          {errors.sex && <Text style={styles.errorText}>{errors.sex.message}</Text>}
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>
            Date of Birth<Text style={styles.required}> *</Text>
          </Text>
          <Controller
            control={control}
            name="dateOfBirth"
            render={({ field: { onChange, value } }) => (
              <>
                <TouchableOpacity
                  style={[styles.input, errors.dateOfBirth && styles.inputError]}
                  onPress={() => setShowDatePicker(true)}
                  disabled={isLoading}
                >
                  <Text style={[styles.inputText, !value && styles.placeholderText]}>
                    {value ? format(new Date(value), 'MMMM d, yyyy') : 'Select date of birth'}
                  </Text>
                  <Ionicons name="calendar-outline" size={20} color="#6c757d" />
                </TouchableOpacity>
                
                {showDatePicker && (
                  <DateTimePicker
                    value={value ? new Date(value) : new Date()}
                    mode="date"
                    display="default"
                    onChange={handleDateChange}
                    maximumDate={new Date()}
                  />
                )}
              </>
            )}
          />
          {errors.dateOfBirth && (
            <Text style={styles.errorText}>{errors.dateOfBirth.message}</Text>
          )}
        </View>

        <FormInput
          name="motherName"
          label="Mother's Name"
          placeholder="Enter mother's name"
        />

        <FormInput
          name="fatherName"
          label="Father's Name"
          placeholder="Enter father's name"
        />
      </View>

      <View style={styles.formSection}>
        <Text style={styles.sectionTitle}>Contact Information</Text>
        
        <FormInput
          name="district"
          label="District"
          placeholder="Enter district"
          required
        />

        <FormInput
          name="townVillage"
          label="Town/Village"
          placeholder="Enter town or village"
        />

        <FormInput
          name="address"
          label="Address"
          placeholder="Enter full address"
          multiline
        />

        <FormInput
          name="contactPhone"
          label="Contact Phone"
          placeholder="Enter phone number"
          keyboardType="phone-pad"
        />
      </View>

      <View style={styles.formSection}>
        <Text style={styles.sectionTitle}>Health Worker Information</Text>
        
        <FormInput
          name="healthWorkerName"
          label="Health Worker Name"
          placeholder="Enter health worker name"
        />

        <FormInput
          name="healthWorkerPhone"
          label="Health Worker Phone"
          placeholder="Enter health worker phone"
          keyboardType="phone-pad"
        />
      </View>

      <TouchableOpacity
        style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
        onPress={handleSubmit(onSubmit)}
        disabled={isLoading}
      >
        <Text style={styles.submitButtonText}>
          {isLoading ? 'Saving...' : submitButtonText}
        </Text>
      </TouchableOpacity>
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
  inputText: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  placeholderText: {
    color: '#6c757d',
  },
  textArea: {
    textAlignVertical: 'top',
  },
  radioGroup: {
    flexDirection: 'row',
    gap: 16,
  },
  radioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
  },
  radioButtonSelected: {
    borderColor: '#007bff',
    backgroundColor: '#f8f9ff',
  },
  radioText: {
    fontSize: 16,
    color: '#6c757d',
    marginLeft: 8,
  },
  radioTextSelected: {
    color: '#007bff',
    fontWeight: '500',
  },
  errorText: {
    fontSize: 14,
    color: '#dc3545',
    marginTop: 4,
  },
  submitButton: {
    backgroundColor: '#007bff',
    margin: 16,
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