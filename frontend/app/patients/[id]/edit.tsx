import React from 'react';
import { View, StyleSheet, Alert, ActivityIndicator, Text } from 'react-native';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { useAuth } from '../../../context/auth';
import { usePatient, useUpdatePatient } from '../../../hooks/usePatients';
import PatientForm from '../../../app/components/PatientForm';
import { PatientFormData } from '../../../types/patient';

export default function EditPatientScreen() {
  const { isAuthenticated } = useAuth();
  const params = useLocalSearchParams();
  const patientId = parseInt(params.id as string, 10);

  const {
    data: patient,
    isLoading: isPatientLoading,
    isError: isPatientError,
  } = usePatient(patientId);

  const updatePatient = useUpdatePatient();

  const handleSubmit = async (data: PatientFormData) => {
    try {
      await updatePatient.mutateAsync({
        id: patientId,
        data,
      });
      Alert.alert(
        'Success',
        'Patient updated successfully',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Failed to update patient. Please try again.'
      );
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  if (isPatientLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
      </View>
    );
  }

  if (isPatientError || !patient) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Patient not found</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Edit Patient' }} />
      <View style={styles.container}>
        <PatientForm
          initialData={patient}
          onSubmit={handleSubmit}
          isLoading={updatePatient.isPending}
          submitButtonText="Update Patient"
        />
      </View>
    </>
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
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#dc3545',
  },
});