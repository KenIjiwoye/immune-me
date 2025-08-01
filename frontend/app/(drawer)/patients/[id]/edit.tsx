import React from 'react';
import { View, StyleSheet, Alert, ActivityIndicator, Text, KeyboardAvoidingView, Platform } from 'react-native';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { useAuth } from '../../../../context/auth';
import { usePatient, useUpdatePatient } from '../../../../hooks/usePatients';
import PatientForm from '../../../components/PatientForm';
import { PatientFormData } from '../../../../types/patient';

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
      <KeyboardAvoidingView 
        style={styles.loadingContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <ActivityIndicator size="large" color="#007bff" />
      </KeyboardAvoidingView>
    );
  }

  if (isPatientError || !patient) {
    return (
      <KeyboardAvoidingView 
        style={styles.errorContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <Text style={styles.errorText}>Patient not found</Text>
      </KeyboardAvoidingView>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Edit Patient' }} />
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <View style={styles.content}>
          <PatientForm
            initialData={patient}
            onSubmit={handleSubmit}
            isLoading={updatePatient.isPending}
            submitButtonText="Update Patient"
          />
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    flex: 1,
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
