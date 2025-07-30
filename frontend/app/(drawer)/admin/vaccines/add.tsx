import React from 'react';
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../../services/api';
import Toast from 'react-native-toast-message';
import VaccineForm from '../../../components/VaccineForm';

export default function AddVaccineScreen() {
  const queryClient = useQueryClient();

  const createVaccineMutation = useMutation({
    mutationFn: async (data: any) => {
      // Clean up the data to remove null/undefined values for optional fields
      const cleanData = {
        name: data.name,
        description: data.description,
        vaccineCode: data.vaccineCode,
        isSupplementary: data.isSupplementary,
        isActive: data.isActive,
        ...(data.sequenceNumber !== null && data.sequenceNumber !== undefined && { sequenceNumber: data.sequenceNumber }),
        ...(data.vaccineSeries && { vaccineSeries: data.vaccineSeries }),
        ...(data.standardScheduleAge && { standardScheduleAge: data.standardScheduleAge }),
      };
      
      const response = await api.post('/vaccines', cleanData);
      return response.data;
    },
    onSuccess: () => {
      Toast.show({
        type: 'success',
        text1: 'Vaccine created successfully',
        text2: 'The vaccine has been added to the system',
      });
      queryClient.invalidateQueries({ queryKey: ['vaccines'] });
      router.back();
    },
    onError: (error: any) => {
      Toast.show({
        type: 'error',
        text1: 'Failed to create vaccine',
        text2: error.response?.data?.message || 'Please try again',
      });
    },
  });

  return (
    <View style={styles.container}>
      <VaccineForm
        onSubmit={createVaccineMutation.mutate}
        onCancel={() => router.back()}
        isLoading={createVaccineMutation.isPending}
        submitButtonText="Create Vaccine"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
});
