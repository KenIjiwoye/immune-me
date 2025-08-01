import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function AdminDashboardScreen() {
  const adminActions = [
    {
      title: 'Vaccine Management',
      description: 'Add, edit, and manage vaccines',
      icon: 'medical-outline',
      route: '/admin/vaccines' as const,
      color: '#007bff',
    },
    {
      title: 'User Management',
      description: 'Manage healthcare staff accounts',
      icon: 'people-outline',
      route: '/admin/users' as const,
      color: '#28a745',
    },
    {
      title: 'Facility Management',
      description: 'Manage healthcare facilities',
      icon: 'business-outline',
      route: '/admin/facilities' as const,
      color: '#ffc107',
    },
    {
      title: 'System Reports',
      description: 'Generate system-wide reports',
      icon: 'analytics-outline',
      route: '/admin/reports' as const,
      color: '#dc3545',
    },
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Admin Dashboard</Text>
        <Text style={styles.subtitle}>System Administration</Text>
      </View>

      <View style={styles.actionsGrid}>
        {adminActions.map((action, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.actionCard, { borderLeftColor: action.color }]}
            onPress={() => router.push(action.route as any)}
          >
            <View style={styles.actionIcon}>
              <Ionicons name={action.icon as any} size={32} color={action.color} />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>{action.title}</Text>
              <Text style={styles.actionDescription}>{action.description}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#6c757d" />
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212529',
  },
  subtitle: {
    fontSize: 16,
    color: '#6c757d',
    marginTop: 4,
  },
  actionsGrid: {
    padding: 16,
  },
  actionCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  actionIcon: {
    marginRight: 16,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: 14,
    color: '#6c757d',
  },
});
