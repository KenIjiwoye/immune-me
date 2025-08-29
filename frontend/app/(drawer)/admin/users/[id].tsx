import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import api from '../../../../services/api';
import Toast from 'react-native-toast-message';
import { useAuth } from '../../../../context/auth';

type User = {
  id: number;
  username: string;
  email: string;
  fullName: string;
  role: string;
  facilityId: number;
  facility?: {
    id: number;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
};

export default function UserDetailsScreen() {
  const params = useLocalSearchParams();
  const userId = parseInt(params.id as string, 10);

  const { user: currentUser } = useAuth();

  const {
    data: user,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['user', userId],
    queryFn: async () => {
      const response = await api.get(`/users/${userId}`);
      return response.data;
    },
  });

  const handleDelete = async () => {
    try {
      await api.delete(`/users/${userId}`);
      Toast.show({
        type: 'success',
        text1: 'User deleted successfully',
      });
      router.back();
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Error deleting user',
        text2: error.response?.data?.message || 'Please try again',
      });
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'administrator': return '#dc3545';
      case 'supervisor': return '#ffc107';
      case 'healthcare_worker': return '#28a745';
      case 'doctor': return '#007bff';
      default: return '#6c757d';
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Loading user data...</Text>
      </View>
    );
  }

  if (isError || !user) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#dc3545" />
        <Text style={styles.errorText}>User not found</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const formattedCreatedDate = new Date(user.createdAt).toLocaleDateString();
  const formattedUpdatedDate = new Date(user.updatedAt).toLocaleDateString();

  return (
    <>
      <Stack.Screen
        options={{
          title: user.fullName,
          headerRight: () => (
            <View style={styles.headerButtons}>
              {currentUser?.role === 'administrator' && (
                <>
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() =>
                      router.push(`/admin/users/${user.id}/edit` as any)
                    }
                  >
                    <Ionicons name="create-outline" size={24} color="#007bff" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={handleDelete}
                  >
                    <Ionicons name="trash-outline" size={24} color="#dc3545" />
                  </TouchableOpacity>
                </>
              )}
            </View>
          ),
        }}
      />
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.name}>{user.fullName}</Text>
          <View style={styles.basicInfo}>
            <View style={styles.infoItem}>
              <Ionicons name="person-outline" size={16} color="#6c757d" />
              <Text style={styles.infoText}>@{user.username}</Text>
            </View>
            <View style={[styles.roleBadge, { backgroundColor: getRoleColor(user.role) }]}>
              <Text style={styles.roleText}>{user.role}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Information</Text>
          <View style={styles.infoCard}>
            <InfoRow label="Username" value={user.username} />
            <InfoRow label="Email" value={user.email} />
            <InfoRow label="Role" value={user.role} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Facility Information</Text>
          <View style={styles.infoCard}>
            <InfoRow label="Facility" value={user.facility?.name || 'Not assigned'} />
            <InfoRow label="Facility ID" value={user.facilityId.toString()} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Details</Text>
          <View style={styles.infoCard}>
            <InfoRow label="Created" value={formattedCreatedDate} />
            <InfoRow label="Last Updated" value={formattedUpdatedDate} />
          </View>
        </View>
      </ScrollView>
    </>
  );
}

interface InfoRowProps {
  label: string;
  value: string;
}

function InfoRow({ label, value }: InfoRowProps) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}:</Text>
      <Text style={styles.infoValue}>{value}</Text>
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
    marginTop: 16,
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
    marginTop: 16,
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: '#6c757d',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    padding: 8,
  },
  deleteButton: {
    padding: 8,
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  basicInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    fontSize: 16,
    color: '#6c757d',
    marginLeft: 4,
  },
  roleBadge: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  roleText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: 'bold',
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  infoLabel: {
    width: 120,
    fontSize: 16,
    color: '#6c757d',
  },
  infoValue: {
    flex: 1,
    fontSize: 16,
  },
});