import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../../../services/api';
import UserForm from '../../../../components/UserForm';
import Toast from 'react-native-toast-message';

interface UserFormData {
  fullName: string;
  username: string;
  email: string;
  password?: string;
  role: string;
  facilityId: string;
}

export default function EditUserScreen() {
  const { id } = useLocalSearchParams();
  const userId = parseInt(id as string, 10);
  const queryClient = useQueryClient();

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<UserFormData>();

  const { data: user, isLoading: isLoadingUser } = useQuery({
    queryKey: ['user', userId],
    queryFn: async () => {
      const response = await api.get(`/users/${userId}`);
      return response.data;
    },
    enabled: !!userId,
  });


  const { data: facilitiesData, isLoading: isLoadingFacilities } = useQuery({
    queryKey: ['facilities'],
    queryFn: async () => {
      const response = await api.get('/facilities');
      return response.data;
    },
  });

  const facilities = facilitiesData?.data || [];

  useEffect(() => {
    if (user) {
      setValue('fullName', user.fullName);
      setValue('username', user.username);
      setValue('email', user.email);
      setValue('role', user.role);
      setValue('facilityId', user.facilityId.toString());
    }
  }, [user, setValue]);

  const mutation = useMutation({
    mutationFn: (updatedUser: UserFormData) =>
      api.put(`/users/${userId}`, updatedUser),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['user', userId] });
      Toast.show({
        type: 'success',
        text1: 'User updated successfully',
      });
      router.back();
    },
    onError: (error: any) => {
      Toast.show({
        type: 'error',
        text1: 'Error updating user',
        text2: error.response?.data?.message || 'Please try again',
      });
    },
  });

  const onSubmit = (data: UserFormData) => {
    mutation.mutate(data);
  };
  
  if (isLoadingUser || isLoadingFacilities) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text>Loading data...</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Edit User' }} />
      <ScrollView style={styles.container}>
        <Text style={styles.title}>Edit User Details</Text>
        <UserForm control={control} errors={errors} facilities={facilities || []} />
        <TouchableOpacity
          style={[styles.button, mutation.isPending && styles.buttonDisabled]}
          onPress={handleSubmit(onSubmit)}
          disabled={mutation.isPending}
        >
          {mutation.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Save Changes</Text>
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