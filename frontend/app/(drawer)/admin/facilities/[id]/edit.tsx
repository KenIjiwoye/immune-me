import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import api from '../../../../../services/api';
import Toast from 'react-native-toast-message';
import FacilityForm from '../../../../components/FacilityForm';

export default function EditFacilityScreen() {
  const params = useLocalSearchParams();
  const facilityId = parseInt(params.id as string, 10);
  const queryClient = useQueryClient();

  const { data: facility, isLoading: isFacilityLoading } = useQuery({
    queryKey: ['facility', facilityId],
    queryFn: async () => {
      const response = await api.get(`/facilities/${facilityId}`);
      return response.data;
    },
  });

  const updateFacilityMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.put(`/facilities/${facilityId}`, data);
      return response.data;
    },
    onSuccess: () => {
      Toast.show({
        type: 'success',
        text1: 'Facility updated successfully',
        text2: 'The facility information has been updated',
      });
      queryClient.invalidateQueries({ queryKey: ['facilities'] });
      queryClient.invalidateQueries({ queryKey: ['facility', facilityId] });
      router.back();
    },
    onError: (error: any) => {
      Toast.show({
        type: 'error',
        text1: 'Failed to update facility',
        text2: error.response?.data?.message || 'Please try again',
      });
    },
  });

  if (isFacilityLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading facility data...</Text>
      </View>
    );
  }

  if (!facility) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Facility not found</Text>
      </View>
    );
  }

  // Prepare initial data for the form
  const initialData = {
    name: facility.name,
    district: facility.district,
    address: facility.address,
    contactPhone: facility.contactPhone,
  };

  return (
    <View style={styles.container}>
      <FacilityForm
        initialData={initialData}
        onSubmit={updateFacilityMutation.mutate}
        onCancel={() => router.back()}
        isLoading={updateFacilityMutation.isPending}
        submitButtonText="Update Facility"
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
  },
  loadingText: {
    fontSize: 16,
    color: '#6c757d',
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