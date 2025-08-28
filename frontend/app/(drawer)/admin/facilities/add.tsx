import React from 'react';
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../../services/api';
import Toast from 'react-native-toast-message';
import FacilityForm from '../../../components/FacilityForm';

export default function AddFacilityScreen() {
  const queryClient = useQueryClient();

  const createFacilityMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post('/facilities', data);
      return response.data;
    },
    onSuccess: () => {
      Toast.show({
        type: 'success',
        text1: 'Facility created successfully',
        text2: 'The facility has been added to the system',
      });
      queryClient.invalidateQueries({ queryKey: ['facilities'] });
      router.back();
    },
    onError: (error: any) => {
      Toast.show({
        type: 'error',
        text1: 'Failed to create facility',
        text2: error.response?.data?.message || 'Please try again',
      });
    },
  });

  return (
    <View style={styles.container}>
      <FacilityForm
        onSubmit={createFacilityMutation.mutate}
        onCancel={() => router.back()}
        isLoading={createFacilityMutation.isPending}
        submitButtonText="Create Facility"
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