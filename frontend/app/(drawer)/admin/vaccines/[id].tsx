import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../../services/api';
import Toast from 'react-native-toast-message';
import VaccineForm from '../../../components/VaccineForm';

export default function EditVaccineScreen() {
  const { id } = useLocalSearchParams();
  const queryClient = useQueryClient();

  const { data: vaccine, isLoading, error } = useQuery({
    queryKey: ['vaccine', id],
    queryFn: async () => {
      const response = await api.get(`/vaccines/${id}`);
      return response.data;
    },
  });

  const updateVaccineMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.put(`/vaccines/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      Toast.show({
        type: 'success',
        text1: 'Vaccine updated successfully',
        text2: 'The vaccine information has been saved',
      });
      queryClient.invalidateQueries({ queryKey: ['vaccines'] });
      queryClient.invalidateQueries({ queryKey: ['vaccine', id] });
      router.back();
    },
    onError: (error: any) => {
      Toast.show({
        type: 'error',
        text1: 'Failed to update vaccine',
        text2: error.response?.data?.message || 'Please try again',
      });
    },
  });

  const deleteVaccineMutation = useMutation({
    mutationFn: async () => {
      const response = await api.delete(`/vaccines/${id}`);
      return response.data;
    },
    onSuccess: () => {
      Toast.show({
        type: 'success',
        text1: 'Vaccine deleted successfully',
        text2: 'The vaccine has been removed from the system',
      });
      queryClient.invalidateQueries({ queryKey: ['vaccines'] });
      router.back();
    },
    onError: (error: any) => {
      Toast.show({
        type: 'error',
        text1: 'Failed to delete vaccine',
        text2: error.response?.data?.message || 'Please try again',
      });
    },
  });

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
      </View>
    );
  }

  if (error || !vaccine) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Failed to load vaccine details</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <VaccineForm
        initialData={vaccine}
        onSubmit={updateVaccineMutation.mutate}
        onCancel={() => router.back()}
        isLoading={updateVaccineMutation.isPending}
        submitButtonText="Update Vaccine"
      />
    </View>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  errorText: {
    fontSize: 16,
    color: '#dc3545',
  },
});
