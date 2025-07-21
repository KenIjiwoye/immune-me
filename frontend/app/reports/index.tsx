import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/auth';
import ReportCard from '../components/ReportCard';

export default function ReportsDashboardScreen() {
  const { isAuthenticated, user } = useAuth();
  
  // Define available reports based on user role
  const getAvailableReports = () => {
    const reports = [
      {
        id: 'immunization-coverage',
        title: 'Immunization Coverage',
        description: 'View immunization coverage by vaccine type',
        icon: 'pie-chart',
        color: '#4CAF50',
        route: '/reports/immunization-coverage',
      },
      {
        id: 'due-immunizations',
        title: 'Due Immunizations',
        description: 'View patients due for immunizations',
        icon: 'calendar',
        color: '#FF9800',
        route: '/reports/due-immunizations',
      },
    ];
    
    // Add admin/supervisor specific reports
    if (user?.role === 'administrator' || user?.role === 'supervisor') {
      reports.push(
        {
          id: 'facility-performance',
          title: 'Facility Performance',
          description: 'Compare performance across facilities',
          icon: 'bar-chart',
          color: '#2196F3',
          route: '/reports/facility-performance',
        },
        {
          id: 'age-distribution',
          title: 'Age Distribution',
          description: 'View patient age distribution',
          icon: 'people',
          color: '#9C27B0',
          route: '/reports/age-distribution',
        }
      );
    }
    
    return reports;
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Reports & Analytics' }} />
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Reports & Analytics</Text>
          <Text style={styles.subtitle}>
            View and analyze immunization data to make informed decisions
          </Text>
        </View>
        
        <View style={styles.reportsContainer}>
          {getAvailableReports().map((report) => (
            <ReportCard
              key={report.id}
              title={report.title}
              description={report.description}
              icon={report.icon}
              color={report.color}
              onPress={() => router.push(report.route as any)}
            />
          ))}
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
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6c757d',
  },
  reportsContainer: {
    padding: 16,
  },
});