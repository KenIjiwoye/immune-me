import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import api from '../../../../services/api';
import Toast from 'react-native-toast-message';

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

export default function UserManagementScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<string | null>(null);

  const { data: usersData, isLoading, error, refetch } = useQuery({
    queryKey: ['users', searchQuery, filterRole],
    queryFn: async () => {
      const params: any = {};
      if (searchQuery) params.search = searchQuery;
      if (filterRole) params.role = filterRole;

      const response = await api.get('/users', { params });
      return response.data;
    },
  });

  const users = usersData?.data || [];
  const uniqueRoles = [...new Set(users.map((user: User) => user.role).filter(Boolean))] as string[];

  const renderUserCard = ({ item }: { item: User }) => (
    <TouchableOpacity
      style={styles.userCard}
      onPress={() => router.push(`/admin/users/${item.id}` as any)}
    >
      <View style={styles.userHeader}>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{item.fullName}</Text>
          <Text style={styles.userEmail}>{item.email}</Text>
          <Text style={styles.userUsername}>@{item.username}</Text>
        </View>
        <View style={styles.userStatus}>
          <View style={[styles.roleBadge, { backgroundColor: getRoleColor(item.role) }]}>
            <Text style={styles.roleText}>{item.role}</Text>
          </View>
        </View>
      </View>

      {item.facility && (
        <Text style={styles.facilityText}>Facility: {item.facility.name}</Text>
      )}

      <View style={styles.userFooter}>
        <Text style={styles.createdText}>
          Created: {new Date(item.createdAt).toLocaleDateString()}
        </Text>
        <Ionicons name="chevron-forward" size={20} color="#6c757d" />
      </View>
    </TouchableOpacity>
  );

  const renderRoleFilter = ({ item }: { item: string }) => (
    <TouchableOpacity
      style={[
        styles.filterChip,
        filterRole === item && styles.activeFilterChip
      ]}
      onPress={() => setFilterRole(filterRole === item ? null : item)}
    >
      <Text style={[
        styles.filterChipText,
        filterRole === item && styles.activeFilterChipText
      ]}>
        {item}
      </Text>
    </TouchableOpacity>
  );

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'administrator': return '#dc3545';
      case 'supervisor': return '#ffc107';
      case 'healthcare_worker': return '#28a745';
      case 'doctor': return '#007bff';
      default: return '#6c757d';
    }
  };

  if (error) {
    Toast.show({
      type: 'error',
      text1: 'Error loading users',
      text2: 'Please try again',
    });
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#007bff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>User Management</Text>
        <TouchableOpacity onPress={() => router.push('/admin/users/add' as any)}>
          <Ionicons name="add" size={24} color="#007bff" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color="#6c757d" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search users..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {uniqueRoles.length > 0 && (
        <View style={styles.filtersContainer}>
          <Text style={styles.filtersLabel}>Filter by role:</Text>
          <FlatList
            horizontal
            data={uniqueRoles}
            renderItem={renderRoleFilter}
            keyExtractor={(item) => item}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersList}
          />
        </View>
      )}

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007bff" />
          <Text style={styles.loadingText}>Loading users...</Text>
        </View>
      ) : (
        <FlatList
          data={users}
          renderItem={renderUserCard}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.usersList}
          refreshing={isLoading}
          onRefresh={refetch}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={64} color="#6c757d" />
              <Text style={styles.emptyText}>No users found</Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => router.push('/admin/users/add' as any)}
              >
                <Ionicons name="add" size={20} color="#fff" />
                <Text style={styles.addButtonText}>Add First User</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
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
  searchContainer: {
    padding: 16,
    backgroundColor: '#fff',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
  },
  filtersContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  filtersLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#6c757d',
    marginBottom: 8,
  },
  filtersList: {
    paddingRight: 16,
  },
  filterChip: {
    backgroundColor: '#e9ecef',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
  },
  activeFilterChip: {
    backgroundColor: '#007bff',
  },
  filterChipText: {
    fontSize: 12,
    color: '#6c757d',
  },
  activeFilterChipText: {
    color: '#fff',
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
  usersList: {
    padding: 16,
  },
  userCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 2,
  },
  userUsername: {
    fontSize: 12,
    color: '#007bff',
  },
  userStatus: {
    alignItems: 'flex-end',
  },
  roleBadge: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  roleText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: 'bold',
  },
  facilityText: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 8,
  },
  userFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  createdText: {
    fontSize: 12,
    color: '#6c757d',
    fontStyle: 'italic',
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
    marginBottom: 24,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007bff',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});