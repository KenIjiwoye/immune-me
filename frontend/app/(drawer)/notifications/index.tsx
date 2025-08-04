import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useAuth } from '../../../context/auth';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../../services/api';
import NotificationCard from '../../components/NotificationCard';

type Notification = {
  id: number;
  patientName: string;
  vaccineName: string;
  dueDate: string;
  status: 'pending' | 'viewed' | 'completed' | 'overdue';
  patientId: number;
  vaccineId: number;
};

export default function NotificationsScreen() {
  const { user } = useAuth();
  const { filter } = useLocalSearchParams();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>([]);
  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'overdue'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadNotifications = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/notifications/due');
      setNotifications(response.data.data || []);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  useEffect(() => {
    // Set initial filter based on URL parameter
    if (filter === 'pending') {
      setActiveFilter('pending');
    } else if (filter === 'overdue') {
      setActiveFilter('overdue');
    } else {
      setActiveFilter('all');
    }
  }, [filter]);

  useEffect(() => {
    // Filter and sort notifications
    let filtered = [...notifications];

    if (activeFilter === 'pending') {
      filtered = filtered.filter(n => n.status === 'pending');
    } else if (activeFilter === 'overdue') {
      filtered = filtered.filter(n => n.status === 'overdue');
    }

    // Sort by due date (closest first)
    filtered.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    setFilteredNotifications(filtered);
  }, [notifications, activeFilter]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadNotifications().finally(() => setRefreshing(false));
  };

  const handleFilterChange = (filter: 'all' | 'pending' | 'overdue') => {
    setActiveFilter(filter);
  };

  const renderNotification = ({ item }: { item: Notification }) => (
    <NotificationCard
      notification={item}
      onPress={() => router.push(`/notifications/${item.id}`)}
    />
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Loading notifications...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#007bff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <TouchableOpacity onPress={handleRefresh}>
          <Ionicons name="refresh" size={24} color="#007bff" />
        </TouchableOpacity>
      </View>

      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, activeFilter === 'all' && styles.activeFilter]}
          onPress={() => handleFilterChange('all')}
        >
          <Text style={[styles.filterText, activeFilter === 'all' && styles.activeFilterText]}>All</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, activeFilter === 'pending' && styles.activeFilter]}
          onPress={() => handleFilterChange('pending')}
        >
          <Text style={[styles.filterText, activeFilter === 'pending' && styles.activeFilterText]}>Upcoming</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, activeFilter === 'overdue' && styles.activeFilter]}
          onPress={() => handleFilterChange('overdue')}
        >
          <Text style={[styles.filterText, activeFilter === 'overdue' && styles.activeFilterText]}>Overdue</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredNotifications}
        renderItem={renderNotification}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-off-outline" size={64} color="#6c757d" />
            <Text style={styles.emptyText}>No notifications found</Text>
            <Text style={styles.emptySubtext}>
              {activeFilter === 'pending' ? 'No upcoming vaccinations' :
               activeFilter === 'overdue' ? 'No overdue vaccinations' :
               'No due immunizations at this time'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
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
  listContainer: {
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6c757d',
    fontWeight: 'bold',
  },
  emptySubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#6c757d',
  },
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  activeFilter: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
  },
  filterText: {
    fontSize: 14,
    color: '#6c757d',
  },
  activeFilterText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
