import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useAuth } from '../../context/auth';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import { format } from 'date-fns';

type NotificationDetail = {
  id: number;
  patient: {
    id: number;
    fullName: string;
    dateOfBirth: string;
    cardNumber: string;
  };
  vaccine: {
    id: number;
    name: string;
    description: string;
  };
  dueDate: string;
  status: 'pending' | 'viewed' | 'completed' | 'overdue';
  createdAt: string;
};

export default function NotificationDetailScreen() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const [notification, setNotification] = useState<NotificationDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadNotification = async () => {
    try {
      setIsLoading(true);
      const response = await api.get(`/notifications/${id}`);
      setNotification(response.data);
    } catch (error) {
      console.error('Failed to load notification:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      loadNotification();
    }
  }, [id]);

  const handleUpdateStatus = async (status: 'viewed' | 'completed') => {
    try {
      await api.put(`/notifications/${notification?.id}`, { status });
      setNotification(prev => prev ? { ...prev, status } : null);
    } catch (error) {
      console.error('Failed to update notification:', error);
    }
  };

  const handleViewPatient = () => {
    if (notification) {
      router.push(`/patients/${notification.patient.id}`);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Loading notification details...</Text>
      </View>
    );
  }

  if (!notification) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#dc3545" />
        <Text style={styles.errorText}>Notification not found</Text>
      </View>
    );
  }

  const formattedDueDate = format(new Date(notification.dueDate), 'MMMM d, yyyy');
  const formattedCreatedAt = format(new Date(notification.createdAt), 'MMMM d, yyyy');

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#007bff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notification Details</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.statusContainer}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(notification.status) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(notification.status) }]}>
              {notification.status.charAt(0).toUpperCase() + notification.status.slice(1)}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Patient Information</Text>
          <Text style={styles.patientName}>{notification.patient.fullName}</Text>
          <Text style={styles.patientDetail}>Card: {notification.patient.cardNumber}</Text>
          <Text style={styles.patientDetail}>
            DOB: {format(new Date(notification.patient.dateOfBirth), 'MMMM d, yyyy')}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vaccine Information</Text>
          <Text style={styles.vaccineName}>{notification.vaccine.name}</Text>
          <Text style={styles.vaccineDescription}>{notification.vaccine.description}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Schedule Details</Text>
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={20} color="#6c757d" />
            <View style={styles.detailText}>
              <Text style={styles.detailLabel}>Due Date</Text>
              <Text style={styles.detailValue}>{formattedDueDate}</Text>
            </View>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="time-outline" size={20} color="#6c757d" />
            <View style={styles.detailText}>
              <Text style={styles.detailLabel}>Created</Text>
              <Text style={styles.detailValue}>{formattedCreatedAt}</Text>
            </View>
          </View>
        </View>

        <View style={styles.actions}>
          {notification.status === 'pending' && (
            <>
              <TouchableOpacity
                style={[styles.button, styles.viewButton]}
                onPress={() => handleUpdateStatus('viewed')}
              >
                <Ionicons name="eye-outline" size={20} color="#007bff" />
                <Text style={styles.buttonText}>Mark as Viewed</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.completeButton]}
                onPress={() => handleUpdateStatus('completed')}
              >
                <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                <Text style={[styles.buttonText, styles.completeButtonText]}>Mark as Completed</Text>
              </TouchableOpacity>
            </>
          )}
          {notification.status === 'viewed' && (
            <TouchableOpacity
              style={[styles.button, styles.completeButton]}
              onPress={() => handleUpdateStatus('completed')}
            >
              <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
              <Text style={[styles.buttonText, styles.completeButtonText]}>Mark as Completed</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={styles.patientButton}
          onPress={handleViewPatient}
        >
          <Ionicons name="person-outline" size={20} color="#007bff" />
          <Text style={styles.patientButtonText}>View Patient Details</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'pending': return '#FF9800';
    case 'viewed': return '#2196F3';
    case 'completed': return '#4CAF50';
    case 'overdue': return '#F44336';
    default: return '#6c757d';
  }
};

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
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#dc3545',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 16,
  },
  card: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 8,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6c757d',
    marginBottom: 8,
  },
  patientName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  patientDetail: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 2,
  },
  vaccineName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  vaccineDescription: {
    fontSize: 14,
    color: '#6c757d',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailText: {
    marginLeft: 12,
  },
  detailLabel: {
    fontSize: 12,
    color: '#6c757d',
  },
  detailValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    flex: 1,
  },
  viewButton: {
    backgroundColor: '#e3f2fd',
    borderWidth: 1,
    borderColor: '#007bff',
  },
  completeButton: {
    backgroundColor: '#007bff',
  },
  buttonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: 'bold',
  },
  completeButtonText: {
    color: '#fff',
  },
  patientButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#007bff',
    borderRadius: 8,
  },
  patientButtonText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#007bff',
    fontWeight: 'bold',
  },
});
