import React from 'react';
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../../services/api';
import Toast from 'react-native-toast-message';
import UserForm from '../../../components/UserForm';

export default function AddUserScreen() {
  const queryClient = useQueryClient();

  const createUserMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post('/users', data);
      return response.data;
    },
    onSuccess: () => {
      Toast.show({
        type: 'success',
        text1: 'User created successfully',
        text2: 'The user has been added to the system',
      });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      router.back();
    },
    onError: (error: any) => {
      Toast.show({
        type: 'error',
        text1: 'Failed to create user',
        text2: error.response?.data?.message || 'Please try again',
      });
    },
  });

  return (
    <View style={styles.container}>
      <UserForm
        onSubmit={createUserMutation.mutate}
        onCancel={() => router.back()}
        isLoading={createUserMutation.isPending}
        submitButtonText="Create User"
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