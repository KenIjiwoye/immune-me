import React from 'react';
import { View, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { router, Stack } from 'expo-router';
import { useAuth } from '../../../context/auth';
import { useCreatePatient } from '../../../hooks/usePatients';
import PatientForm from '../../components/PatientForm';
import { PatientFormData } from '../../../types/patient';

export default function AddPatientScreen() {
  const { isAuthenticated } = useAuth();
  const createPatient = useCreatePatient();

  const handleSubmit = async (data: PatientFormData) => {
    try {
      console.log('Submitting patient data:', data);
      await createPatient.mutateAsync(data);
      Alert.alert(
        'Success',
        'Patient added successfully',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error: any) {
      console.error('Patient creation error:', error);
      
      let errorMessage = 'Failed to add patient. Please try again.';
      
      if (error.response?.data) {
        // Handle validation errors
        if (error.response.data.errors) {
          const validationErrors = Object.values(error.response.data.errors).flat();
          errorMessage = validationErrors.join('\n') || errorMessage;
        } else if (error.response.data.message) {
          errorMessage = error.response.data.message;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert(
        'Error Adding Patient',
        errorMessage,
        [{ text: 'OK' }]
      );
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Add New Patient' }} />
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <View style={styles.content}>
          <PatientForm
            onSubmit={handleSubmit}
            isLoading={createPatient.isPending}
            submitButtonText="Add Patient"
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
});
