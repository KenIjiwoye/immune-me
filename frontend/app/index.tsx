import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useAuth } from '../context/auth';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import StatCard from './components/StatCard';
import NotificationCard from './components/NotificationCard';

type DashboardStats = {
  totalPatients: number;
  totalImmunizations: number;
  pendingImmunizations: number;
  overdueImmunizations: number;
};

type Notification = {
  id: number;
  patientName: string;
  vaccineName: string;
  dueDate: string;
  status: 'pending' | 'viewed' | 'completed' | 'overdue';
};

export default function DashboardScreen() {
  const { user, isAuthenticated, logout } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }

    // Load dashboard data
    const loadDashboardData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch dashboard stats
        const statsResponse = await api.getDashboardStats();
        setStats(statsResponse.data);
        
        // Fetch notifications
        const notificationsResponse = await api.getDueNotifications();
        setNotifications(notificationsResponse.data.slice(0, 5)); // Show only 5 most recent
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return null;
  }

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.welcome}>Welcome, {user?.fullName || 'User'}</Text>
          <Text style={styles.role}>{user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'User'}</Text>
        </View>
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.iconButton} onPress={() => router.push('/profile')}>
            <Ionicons name="person-circle-outline" size={28} color="#007bff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={logout}>
            <Ionicons name="log-out-outline" size={28} color="#dc3545" />
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Overview</Text>
      <View style={styles.statsContainer}>
        <StatCard
          title="Total Patients"
          value={stats?.totalPatients || 0}
          icon="people-outline"
          color="#4CAF50"
        />
        <StatCard
          title="Total Immunizations"
          value={stats?.totalImmunizations || 0}
          icon="medical-outline"
          color="#2196F3"
        />
        <StatCard
          title="Pending"
          value={stats?.pendingImmunizations || 0}
          icon="time-outline"
          color="#FF9800"
        />
        <StatCard
          title="Overdue"
          value={stats?.overdueImmunizations || 0}
          icon="alert-circle-outline"
          color="#F44336"
        />
      </View>

      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push('/patients')}
        >
          <Ionicons name="people" size={24} color="#007bff" />
          <Text style={styles.actionText}>Patients</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push('/immunizations/add')}
        >
          <Ionicons name="add-circle" size={24} color="#28a745" />
          <Text style={styles.actionText}>New Immunization</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push('/reports')}
        >
          <Ionicons name="bar-chart" size={24} color="#6c757d" />
          <Text style={styles.actionText}>Reports</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push('/notifications')}
        >
          <Ionicons name="notifications" size={24} color="#fd7e14" />
          <Text style={styles.actionText}>Notifications</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.notificationsHeader}>
        <Text style={styles.sectionTitle}>Due Immunizations</Text>
        <TouchableOpacity onPress={() => router.push('/notifications')}>
          <Text style={styles.viewAllText}>View All</Text>
        </TouchableOpacity>
      </View>

      {notifications.length > 0 ? (
        <View style={styles.notificationsContainer}>
          {notifications.map((notification) => (
            <NotificationCard
              key={notification.id}
              notification={notification}
              onPress={() => router.push(`/patients/${notification.id}/immunizations`)}
            />
          ))}
        </View>
      ) : (
        <View style={styles.emptyNotifications}>
          <Ionicons name="checkmark-circle-outline" size={48} color="#28a745" />
          <Text style={styles.emptyText}>No due immunizations</Text>
        </View>
      )}
    </ScrollView>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  welcome: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  role: {
    fontSize: 16,
    color: '#6c757d',
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    padding: 8,
    marginLeft: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  actionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  actionButton: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  actionText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: 'bold',
  },
  notificationsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: 20,
  },
  viewAllText: {
    color: '#007bff',
    fontSize: 14,
  },
  notificationsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  emptyNotifications: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 8,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6c757d',
  },
});
