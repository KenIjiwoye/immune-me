import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import api from '../../../../../services/api';
import Toast from 'react-native-toast-message';
import UserForm from '../../../../components/UserForm';

export default function EditUserScreen() {
  const params = useLocalSearchParams();
  const userId = parseInt(params.id as string, 10);
  const queryClient = useQueryClient();

  const { data: user, isLoading: isUserLoading } = useQuery({
    queryKey: ['user', userId],
    queryFn: async () => {
      const response = await api.get(`/users/${userId}`);
      return response.data;
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async (data: any) => {
      // Remove password if it's empty (don't update password)
      const updateData = { ...data };
      if (!updateData.password || updateData.password.trim() === '') {
        delete updateData.password;
      }

      const response = await api.put(`/users/${userId}`, updateData);
      return response.data;
    },
    onSuccess: () => {
      Toast.show({
        type: 'success',
        text1: 'User updated successfully',
        text2: 'The user information has been updated',
      });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['user', userId] });
      router.back();
    },
    onError: (error: any) => {
      Toast.show({
        type: 'error',
        text1: 'Failed to update user',
        text2: error.response?.data?.message || 'Please try again',
      });
    },
  });

  if (isUserLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading user data...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>User not found</Text>
      </View>
    );
  }

  // Prepare initial data for the form
  const initialData = {
    username: user.username,
    email: user.email,
    password: '', // Don't pre-fill password
    fullName: user.fullName,
    role: user.role,
    facilityId: user.facilityId,
  };

  return (
    <View style={styles.container}>
      <UserForm
        initialData={initialData}
        onSubmit={updateUserMutation.mutate}
        onCancel={() => router.back()}
        isLoading={updateUserMutation.isPending}
        submitButtonText="Update User"
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