import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { router, Stack } from 'expo-router';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../../services/api';
import UserForm from '../../../components/UserForm';
import Toast from 'react-native-toast-message';

interface UserFormData {
  fullName: string;
  username: string;
  email: string;
  password?: string;
  role: string;
  facilityId: string;
}

export default function AddUserScreen() {
  const queryClient = useQueryClient();
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<UserFormData>({
    defaultValues: {
      fullName: '',
      username: '',
      email: '',
      password: '',
      role: '',
      facilityId: '',
    },
  });

  const { data: facilitiesData, isLoading: isLoadingFacilities } = useQuery({
    queryKey: ['facilities'],
    queryFn: async () => {
      const response = await api.get('/facilities');
      return response.data;
    },
  });

  const facilities = facilitiesData?.data || [];

  const mutation = useMutation({
    mutationFn: (newUser: UserFormData) => api.post('/users', newUser),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      Toast.show({
        type: 'success',
        text1: 'User created successfully',
      });
      router.back();
    },
    onError: (error: any) => {
      Toast.show({
        type: 'error',
        text1: 'Error creating user',
        text2: error.response?.data?.message || 'Please try again',
      });
    },
  });

  const onSubmit = (data: UserFormData) => {
    mutation.mutate(data);
  };
  
  if (isLoadingFacilities) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text>Loading facilities...</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Add New User' }} />
      <ScrollView style={styles.container}>
        <Text style={styles.title}>Create a New User</Text>
        <UserForm control={control} errors={errors} facilities={facilities || []} />
        <TouchableOpacity
          style={[styles.button, mutation.isPending && styles.buttonDisabled]}
          onPress={handleSubmit(onSubmit)}
          disabled={mutation.isPending}
        >
          {mutation.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Add User</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#007bff',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonDisabled: {
    backgroundColor: '#007bff',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});