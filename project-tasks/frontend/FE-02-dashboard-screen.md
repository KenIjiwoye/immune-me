# FE-02: Implement Dashboard Screen

## Context
The Immunization Records Management System requires a dashboard screen that provides an overview of key information and quick access to main features. This will be the primary screen users see after logging in.

## Dependencies
- FE-01: Authentication flow implemented

## Requirements
1. Create a dashboard screen with role-specific information
2. Display summary statistics relevant to the user's role
3. Implement navigation to other parts of the application
4. Show notifications for due immunizations
5. Create a responsive layout that works on different device sizes

## Code Example

### Dashboard Screen

```typescript
// frontend/app/index.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useAuth } from './context/auth';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from './services/api';
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
        const statsResponse = await api.get('/dashboard/stats');
        setStats(statsResponse.data);
        
        // Fetch notifications
        const notificationsResponse = await api.get('/notifications/due');
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
          <Text style={styles.welcome}>Welcome, {user?.fullName}</Text>
          <Text style={styles.role}>{user?.role.charAt(0).toUpperCase() + user?.role.slice(1)}</Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <Ionicons name="log-out-outline" size={24} color="#dc3545" />
        </TouchableOpacity>
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
          onPress={() => router.push('/immunizations/new')}
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
  logoutButton: {
    padding: 8,
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
```

### Stat Card Component

```typescript
// frontend/app/components/StatCard.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type StatCardProps = {
  title: string;
  value: number;
  icon: string;
  color: string;
};

export default function StatCard({ title, value, icon, color }: StatCardProps) {
  return (
    <View style={[styles.card, { borderLeftColor: color }]}>
      <View style={styles.iconContainer}>
        <Ionicons name={icon as any} size={24} color={color} />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.value}>{value}</Text>
        <Text style={styles.title}>{title}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  iconContainer: {
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  value: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 12,
    color: '#6c757d',
  },
});
```

### Notification Card Component

```typescript
// frontend/app/components/NotificationCard.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';

type NotificationCardProps = {
  notification: {
    id: number;
    patientName: string;
    vaccineName: string;
    dueDate: string;
    status: 'pending' | 'viewed' | 'completed' | 'overdue';
  };
  onPress: () => void;
};

export default function NotificationCard({ notification, onPress }: NotificationCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return '#FF9800';
      case 'viewed':
        return '#2196F3';
      case 'completed':
        return '#4CAF50';
      case 'overdue':
        return '#F44336';
      default:
        return '#6c757d';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return 'time-outline';
      case 'viewed':
        return 'eye-outline';
      case 'completed':
        return 'checkmark-circle-outline';
      case 'overdue':
        return 'alert-circle-outline';
      default:
        return 'help-circle-outline';
    }
  };

  const formattedDate = format(new Date(notification.dueDate), 'MMM d, yyyy');
  const statusColor = getStatusColor(notification.status);
  const statusIcon = getStatusIcon(notification.status);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.content}>
        <Text style={styles.patientName}>{notification.patientName}</Text>
        <Text style={styles.vaccineName}>{notification.vaccineName}</Text>
        <View style={styles.footer}>
          <View style={styles.dateContainer}>
            <Ionicons name="calendar-outline" size={14} color="#6c757d" />
            <Text style={styles.date}>{formattedDate}</Text>
          </View>
          <View style={[styles.statusContainer, { backgroundColor: `${statusColor}20` }]}>
            <Ionicons name={statusIcon as any} size={14} color={statusColor} />
            <Text style={[styles.status, { color: statusColor }]}>
              {notification.status.charAt(0).toUpperCase() + notification.status.slice(1)}
            </Text>
          </View>
        </View>
      </View>
      <View style={styles.arrow}>
        <Ionicons name="chevron-forward" size={20} color="#6c757d" />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  content: {
    flex: 1,
  },
  patientName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  vaccineName: {
    fontSize: 14,
    color: '#212529',
    marginBottom: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  date: {
    fontSize: 12,
    color: '#6c757d',
    marginLeft: 4,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  status: {
    fontSize: 12,
    marginLeft: 4,
  },
  arrow: {
    marginLeft: 8,
  },
});
```

### Dashboard API Service

```typescript
// Add to frontend/app/services/api.ts
// Dashboard endpoints
getDashboardStats: () => api.get('/dashboard/stats'),
getDueNotifications: () => api.get('/notifications/due'),
```

## Expected Outcome
- Dashboard screen that displays summary statistics
- Quick access to key features of the application
- Display of due immunizations that need attention
- Role-specific information and access controls
- Responsive layout that works on different device sizes

## Testing
1. Run the frontend application:
```bash
cd frontend
npx expo start
```

2. Log in with valid credentials
3. Verify that the dashboard displays correctly with all components
4. Test navigation to other parts of the application
5. Verify that the dashboard displays role-specific information
6. Test the responsiveness on different device sizes
