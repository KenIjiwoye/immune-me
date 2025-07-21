import React, { useState } from 'react';
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

import { immunizationSchema, ImmunizationFormData } from '../../types/immunization';
import { Vaccine } from '../../types/immunization';
import { Patient } from '../../types/patient';
import api from '../../services/api';
import VaccineSelector from '../components/VaccineSelector';
import PatientCard from '../components/PatientCard';

export default function AddImmunizationScreen() {
  const { patientId: routePatientId } = useLocalSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  
  const [showAdministeredDatePicker, setShowAdministeredDatePicker] = useState(false);
  const [showReturnDatePicker, setShowReturnDatePicker] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(
    routePatientId ? parseInt(routePatientId as string) : null
  );

  const {
    control,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<ImmunizationFormData>({
    resolver: zodResolver(immunizationSchema),
    defaultValues: {
      patientId: selectedPatientId || undefined,
      administeredDate: new Date().toISOString().split('T')[0],
      returnDate: null,
      batchNumber: '',
      administeredBy: '',
      notes: '',
    },
  });

  // Fetch vaccines
  const { data: vaccines = [], isLoading: vaccinesLoading } = useQuery({
    queryKey: ['vaccines'],
    queryFn: async () => {
      const response = await api.get('/vaccines');
      return response.data.data;
    },
  });

  // Fetch patients for selection (if no patientId provided)
  const { data: patients = [], isLoading: patientsLoading } = useQuery({
    queryKey: ['patients', { limit: 50 }],
    queryFn: async () => {
      const response = await api.get('/patients', { params: { limit: 50 } });
      return response.data.data;
    },
    enabled: !routePatientId,
  });

  // Fetch selected patient details
  const { data: selectedPatient } = useQuery({
    queryKey: ['patients', selectedPatientId],
    queryFn: async () => {
      const response = await api.get(`/patients/${selectedPatientId}`);
      return response.data;
    },
    enabled: !!selectedPatientId,
  });

  // Create immunization mutation
  const createImmunizationMutation = useMutation({
    mutationFn: async (data: ImmunizationFormData) => {
      const response = await api.post('/immunization-records', data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['immunization-records'] });
      if (selectedPatientId) {
        queryClient.invalidateQueries({ queryKey: ['patients', selectedPatientId, 'immunizations'] });
      }
      Alert.alert(
        'Success',
        'Immunization record created successfully',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    },
    onError: (error: any) => {
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Failed to create immunization record'
      );
    },
  });

  const onSubmit = (data: ImmunizationFormData) => {
    if (!selectedPatientId) {
      Alert.alert('Error', 'Please select a patient');
      return;
    }
    
    const submissionData = {
      ...data,
      patientId: selectedPatientId,
    };
    
    createImmunizationMutation.mutate(submissionData);
  };

  const handlePatientSelect = (patient: Patient) => {
    if (patient.id) {
      setSelectedPatientId(patient.id);
      setValue('patientId', patient.id);
    }
  };

  const handleVaccineSelect = (vaccineId: number) => {
    setValue('vaccineId', vaccineId);
  };

  const administeredDate = watch('administeredDate');
  const returnDate = watch('returnDate');

  if (vaccinesLoading || patientsLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#007bff" />
        </TouchableOpacity>
        <Text style={styles.title}>Add Immunization Record</Text>
      </View>

      {/* Patient Selection */}
      {!routePatientId && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Patient</Text>
          {selectedPatient ? (
            <PatientCard patient={selectedPatient} />
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {patients.map((patient: Patient) => (
                <TouchableOpacity
                  key={patient.id}
                  style={[
                    styles.patientCard,
                    selectedPatientId === patient.id && styles.selectedPatientCard,
                  ]}
                  onPress={() => handlePatientSelect(patient)}
                >
                  <Text style={styles.patientName}>{patient.fullName}</Text>
                  <Text style={styles.patientInfo}>
                    {patient.sex} - {new Date(patient.dateOfBirth).toLocaleDateString()}
                  </Text>
                  <Text style={styles.patientInfo}>{patient.district}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      )}

      {/* Selected Patient Display */}
      {routePatientId && selectedPatient && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Patient</Text>
          <PatientCard patient={selectedPatient} />
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

        {/* Administered By */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Administered By *</Text>
          <Controller
            control={control}
            name="administeredBy"
            render={({ field: { onChange, onBlur, value } }) => (
              <View>
                <View style={styles.inputContainer}>
                  <Ionicons name="person" size={20} color="#6c757d" style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, errors.administeredBy && styles.errorInput]}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    placeholder="Enter health worker name"
                  />
                </View>
                {errors.administeredBy && (
                  <Text style={styles.errorText}>{errors.administeredBy.message}</Text>
                )}
              </View>
            )}
          />
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
            createImmunizationMutation.isPending && styles.disabledButton,
          ]}
          onPress={handleSubmit(onSubmit)}
          disabled={createImmunizationMutation.isPending}
        >
          {createImmunizationMutation.isPending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Save Immunization Record</Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#212529',
  },
  section: {
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#212529',
  },
  patientCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
    marginRight: 12,
    minWidth: 200,
  },
  selectedPatientCard: {
    borderColor: '#007bff',
    backgroundColor: '#e8f4fc',
  },
  patientName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    color: '#212529',
  },
  patientInfo: {
    fontSize: 14,
    color: '#6c757d',
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