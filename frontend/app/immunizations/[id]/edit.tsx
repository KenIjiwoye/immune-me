import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';

import { immunizationSchema, ImmunizationFormData, ImmunizationRecord } from '../../../types/immunization';
import { Vaccine } from '../../../types/immunization';
import { Patient } from '../../../types/patient';
import api from '../../../services/api';
import VaccineSelector from '../../components/VaccineSelector';
import PatientCard from '../../components/PatientCard';

export default function EditImmunizationScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [showAdministeredDatePicker, setShowAdministeredDatePicker] = useState(false);
  const [showReturnDatePicker, setShowReturnDatePicker] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<ImmunizationFormData>({
    resolver: zodResolver(immunizationSchema),
    defaultValues: {
      patientId: 0,
      administeredDate: '',
      returnDate: null,
      batchNumber: '',
      administeredBy: '',
      notes: '',
    },
  });

  // Fetch the existing immunization record
  const { data: immunizationRecord, isLoading: recordLoading } = useQuery({
    queryKey: ['immunization-records', id],
    queryFn: async () => {
      const response = await api.get(`/immunization-records/${id}`);
      return response.data as ImmunizationRecord;
    },
    enabled: !!id,
  });

  // Fetch vaccines
  const { data: vaccines = [], isLoading: vaccinesLoading } = useQuery({
    queryKey: ['vaccines'],
    queryFn: async () => {
      const response = await api.get('/vaccines');
      return response.data.data;
    },
  });

  // Patient details are included in the immunization record
  const selectedPatient = immunizationRecord?.patient;

  // Pre-populate form when record is loaded
  useEffect(() => {
    if (immunizationRecord) {
      reset({
        patientId: immunizationRecord.patientId,
        vaccineId: immunizationRecord.vaccine.id,
        administeredDate: immunizationRecord.administeredDate,
        returnDate: immunizationRecord.returnDate,
        batchNumber: immunizationRecord.batchNumber,
        administeredBy: immunizationRecord.administeredBy.fullName,
        notes: immunizationRecord.notes || '',
      });
    }
  }, [immunizationRecord, reset]);

  // Update immunization mutation
  const updateImmunizationMutation = useMutation({
    mutationFn: async (data: Partial<ImmunizationFormData>) => {
      const updateData = {
        patientId: data.patientId,
        vaccineId: data.vaccineId,
        administeredDate: data.administeredDate,
        batchNumber: data.batchNumber,
        returnDate: data.returnDate,
        notes: data.notes,
        // Note: administeredBy is not updated as per backend requirements
      };
      const response = await api.put(`/immunization-records/${id}`, updateData);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['immunization-records'] });
      if (immunizationRecord?.patientId) {
        queryClient.invalidateQueries({ queryKey: ['patients', immunizationRecord.patientId, 'immunizations'] });
      }
      Alert.alert(
        'Success',
        'Immunization record updated successfully',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    },
    onError: (error: any) => {
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Failed to update immunization record'
      );
    },
  });

  const onSubmit = (data: ImmunizationFormData) => {
    updateImmunizationMutation.mutate(data);
  };

  const handleVaccineSelect = (vaccineId: number) => {
    setValue('vaccineId', vaccineId);
  };

  const administeredDate = watch('administeredDate');
  const returnDate = watch('returnDate');

  if (recordLoading || vaccinesLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!immunizationRecord) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Record not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Selected Patient Display */}
      {selectedPatient && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Patient</Text>
          <PatientCard patient={selectedPatient as Patient} />
        </View>
      )}

      <View style={styles.form}>
        {/* Vaccine Selection */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Vaccine *</Text>
          <Controller
            control={control}
            name="vaccineId"
            render={({ field: { value } }) => (
              <VaccineSelector
                vaccines={vaccines}
                selectedVaccineId={value || 0}
                onSelect={handleVaccineSelect}
                error={errors.vaccineId?.message}
              />
            )}
          />
        </View>

        {/* Administered Date */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Administered Date *</Text>
          <TouchableOpacity
            style={[styles.dateInput, errors.administeredDate && styles.errorInput]}
            onPress={() => setShowAdministeredDatePicker(true)}
          >
            <Text style={administeredDate ? styles.dateText : styles.placeholderText}>
              {administeredDate || 'Select date'}
            </Text>
            <Ionicons name="calendar" size={20} color="#6c757d" />
          </TouchableOpacity>
          {errors.administeredDate && (
            <Text style={styles.errorText}>{errors.administeredDate.message}</Text>
          )}
          {showAdministeredDatePicker && (
            <DateTimePicker
              value={new Date(administeredDate || Date.now())}
              mode="date"
              display="default"
              onChange={(event, date) => {
                setShowAdministeredDatePicker(false);
                if (date) {
                  setValue('administeredDate', date.toISOString().split('T')[0]);
                }
              }}
            />
          )}
        </View>

        {/* Return Date */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Return Date (Optional)</Text>
          <TouchableOpacity
            style={[styles.dateInput, errors.returnDate && styles.errorInput]}
            onPress={() => setShowReturnDatePicker(true)}
          >
            <Text style={returnDate ? styles.dateText : styles.placeholderText}>
              {returnDate || 'Select return date'}
            </Text>
            <Ionicons name="calendar" size={20} color="#6c757d" />
          </TouchableOpacity>
          {errors.returnDate && (
            <Text style={styles.errorText}>{errors.returnDate.message}</Text>
          )}
          {showReturnDatePicker && (
            <DateTimePicker
              value={returnDate ? new Date(returnDate) : new Date()}
              mode="date"
              display="default"
              onChange={(event, date) => {
                setShowReturnDatePicker(false);
                if (date) {
                  setValue('returnDate', date.toISOString().split('T')[0]);
                } else {
                  setValue('returnDate', null);
                }
              }}
            />
          )}
        </View>

        {/* Batch Number */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Batch Number *</Text>
          <Controller
            control={control}
            name="batchNumber"
            render={({ field: { onChange, onBlur, value } }) => (
              <View>
                <View style={styles.inputContainer}>
                  <Ionicons name="pricetag" size={20} color="#6c757d" style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, errors.batchNumber && styles.errorInput]}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    placeholder="Enter batch number"
                  />
                </View>
                {errors.batchNumber && (
                  <Text style={styles.errorText}>{errors.batchNumber.message}</Text>
                )}
              </View>
            )}
          />
        </View>

        {/* Administered By (Read-only) */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Administered By</Text>
          <Controller
            control={control}
            name="administeredBy"
            render={({ field: { value } }) => (
              <View style={styles.inputContainer}>
                <Ionicons name="person" size={20} color="#6c757d" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, styles.readOnlyInput]}
                  value={value}
                  placeholder="Administered by"
                  editable={false}
                />
              </View>
            )}
          />
          <Text style={styles.readOnlyNote}>This field cannot be edited</Text>
        </View>

        {/* Notes */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Notes (Optional)</Text>
          <Controller
            control={control}
            name="notes"
            render={({ field: { onChange, onBlur, value } }) => (
              <View>
                <View style={[styles.inputContainer, styles.textAreaContainer]}>
                  <Ionicons name="document-text" size={20} color="#6c757d" style={styles.inputIcon} />
                  <TextInput
                    style={[styles.textArea, styles.input]}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    placeholder="Additional notes..."
                    multiline
                    numberOfLines={4}
                  />
                </View>
              </View>
            )}
          />
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            updateImmunizationMutation.isPending && styles.disabledButton,
          ]}
          onPress={handleSubmit(onSubmit)}
          disabled={updateImmunizationMutation.isPending}
        >
          {updateImmunizationMutation.isPending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Update Immunization Record</Text>
          )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#6c757d',
  },
  section: {
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    marginTop: 12,
    color: '#212529',
  },
  form: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#212529',
  },
  dateInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 4,
    padding: 12,
    backgroundColor: '#fff',
  },
  dateText: {
    fontSize: 16,
    color: '#212529',
  },
  placeholderText: {
    fontSize: 16,
    color: '#6c757d',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  inputIcon: {
    padding: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 12,
    paddingRight: 12,
    color: '#212529',
  },
  textAreaContainer: {
    alignItems: 'flex-start',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  errorInput: {
    borderColor: '#dc3545',
  },
  errorText: {
    color: '#dc3545',
    fontSize: 14,
    marginTop: 4,
  },
  readOnlyInput: {
    backgroundColor: '#e9ecef',
    color: '#6c757d',
  },
  readOnlyNote: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 4,
  },
  submitButton: {
    backgroundColor: '#007bff',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  disabledButton: {
    backgroundColor: '#6c757d',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});