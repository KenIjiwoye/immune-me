import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../context/auth';
import { useQuery } from '@tanstack/react-query';
import api from '../../../services/api';

export default function ProfileScreen() {
  const { isAuthenticated, user, logout } = useAuth();

  const { data: userProfile, isLoading, error } = useQuery({
    queryKey: ['userProfile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const response = await api.get(`/users/${user.id}/profile`);
      return response.data;
    },
    enabled: !!user?.id && isAuthenticated,
  });

  const getInitials = (name: string) => {
    if (!name) return '?';
    
    const parts = name.split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  if (!isAuthenticated) {
    router.replace('/login');
    return null;
  }

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Failed to load profile</Text>
        <TouchableOpacity onPress={() => router.replace('/login')}>
          <Text style={styles.loginText}>Go to Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'My Profile' }} />
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            {userProfile?.avatarUrl ? (
              <Image
                source={{ uri: userProfile.avatarUrl }}
                style={styles.avatar}
              />
            ) : (
              <View style={styles.initialsAvatar}>
                <Text style={styles.initialsText}>
                  {getInitials(userProfile?.fullName || user?.fullName || '')}
                </Text>
              </View>
            )}
          </View>
          
          <Text style={styles.name}>{userProfile?.fullName || user?.fullName}</Text>
          <Text style={styles.role}>
            {(userProfile?.role || user?.role || 'User').charAt(0).toUpperCase() +
             (userProfile?.role || user?.role || 'User').slice(1)}
          </Text>
          
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => router.push('../profile/edit')}
          >
            <Ionicons name="create-outline" size={16} color="#fff" />
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email:</Text>
              <Text style={styles.infoValue}>{userProfile?.email || user?.email}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Phone:</Text>
              <Text style={styles.infoValue}>{userProfile?.phone || 'Not provided'}</Text>
            </View>
            
            {userProfile?.facility && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Facility:</Text>
                <Text style={styles.infoValue}>{userProfile.facility.name}</Text>
              </View>
            )}
            
            {userProfile?.district && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>District:</Text>
                <Text style={styles.infoValue}>{userProfile.district}</Text>
              </View>
            )}
          </View>
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.menuCard}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => router.push('./change-password')}
            >
              <Ionicons name="lock-closed-outline" size={24} color="#007bff" />
              <Text style={styles.menuItemText}>Change Password</Text>
              <Ionicons name="chevron-forward" size={20} color="#6c757d" />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => router.push('../settings')}
            >
              <Ionicons name="settings-outline" size={24} color="#6c757d" />
              <Text style={styles.menuItemText}>Settings</Text>
              <Ionicons name="chevron-forward" size={20} color="#6c757d" />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.menuItem, styles.logoutItem]}
              onPress={logout}
            >
              <Ionicons name="log-out-outline" size={24} color="#dc3545" />
              <Text style={[styles.menuItemText, styles.logoutText]}>Logout</Text>
              <Ionicons name="chevron-forward" size={20} color="#6c757d" />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </>
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
  errorText: {
    fontSize: 16,
    color: '#dc3545',
    marginBottom: 16,
  },
  loginText: {
    fontSize: 16,
    color: '#007bff',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  initialsAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#007bff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  initialsText: {
    color: '#fff',
    fontSize: 36,
    fontWeight: 'bold',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  role: {
    fontSize: 16,
    color: '#6c757d',
    marginBottom: 16,
  },
  editButton: {
    flexDirection: 'row',
    backgroundColor: '#007bff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
  },
  editButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 20,
    marginBottom: 8,
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
    width: 80,
    fontSize: 16,
    color: '#6c757d',
  },
  infoValue: {
    flex: 1,
    fontSize: 16,
  },
  menuCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  menuItemText: {
    flex: 1,
    fontSize: 16,
    marginLeft: 12,
  },
  logoutItem: {
    borderBottomWidth: 0,
  },
  logoutText: {
    color: '#dc3545',
  },
});