import React from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { router, Stack } from 'expo-router';
import { useAuth } from '../../context/auth';
import { useCreatePatient } from '../../hooks/usePatients';
import PatientForm from '../../app/components/PatientForm';
import { PatientFormData } from '../../types/patient';

export default function AddPatientScreen() {
  const { isAuthenticated } = useAuth();
  const createPatient = useCreatePatient();

  const handleSubmit = async (data: PatientFormData) => {
    try {
      await createPatient.mutateAsync(data);
      Alert.alert(
        'Success',
        'Patient added successfully',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Failed to add patient. Please try again.'
      );
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Add New Patient' }} />
      <View style={styles.container}>
        <PatientForm
          onSubmit={handleSubmit}
          isLoading={createPatient.isPending}
          submitButtonText="Add Patient"
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
});