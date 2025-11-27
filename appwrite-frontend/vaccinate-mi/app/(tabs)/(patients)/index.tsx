import React, { useState, useMemo } from 'react';
import { ScrollView, View, StyleSheet, TouchableOpacity, Image, ActivityIndicator, RefreshControl } from 'react-native';
import { Layout, Text, Input, Button } from '@ui-kitten/components';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { usePatients } from '../../../hooks/usePatients';
import type { Patient as PatientType } from '../../../types/appwrite';

interface PatientDisplay {
  id: string;
  name: string;
  patientId: string;
  age: number;
  gender: string;
  status: 'up-to-date' | 'pending' | 'overdue';
  avatar: string;
}

export default function Patients() {
  const [searchQuery, setSearchQuery] = useState('');
  const [offset, setOffset] = useState(0);
  const router = useRouter();
  const LIMIT = 25;

  // Use React Query hook
  const { data, isLoading, isError, error, refetch, isFetching } = usePatients({
    limit: LIMIT,
    offset,
  });

  const calculateAge = (dateOfBirth: string): number => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  // Transform data to PatientDisplay format
  const patients = useMemo(() => {
    if (!data?.documents) return [];

    return data.documents.map((patient: PatientType): PatientDisplay => ({
      id: patient.$id,
      name: patient.full_name,
      patientId: patient.$id.slice(-8),
      age: calculateAge(patient.date_of_birth),
      gender: patient.sex,
      status: 'up-to-date', // TODO: Calculate actual status based on immunization records
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(
        patient.full_name
      )}&background=3366FF&color=fff&size=128`,
    }));
  }, [data]);

  // Filter patients by search query
  const filteredPatients = useMemo(() => {
    if (!searchQuery) return patients;

    return patients.filter(patient =>
      patient.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [patients, searchQuery]);

  const total = data?.total || 0;
  const hasMore = offset + LIMIT < total;
  const hasPrevious = offset > 0;

  const handleLoadMore = () => {
    if (hasMore) {
      setOffset(prev => prev + LIMIT);
    }
  };

  const handleLoadPrevious = () => {
    if (hasPrevious) {
      setOffset(prev => Math.max(0, prev - LIMIT));
    }
  };

  const handleRefresh = () => {
    setOffset(0);
    refetch();
  };

  const handleNotificationPress = () => {
    console.log('Notifications pressed');
  };

  const handlePatientPress = (patient: PatientDisplay) => {
    router.push(`/(tabs)/(patients)/${patient.id}`);
  };

  const handleAddPatient = () => {
    router.push('/(tabs)/(patients)/new');
  };

  const handleFilterPress = () => {
    console.log('Filter pressed');
  };

  const handleSortPress = () => {
    console.log('Sort pressed');
  };

  const handleStatusFilterPress = () => {
    console.log('Status filter pressed');
  };

  const getStatusColor = (status: PatientDisplay['status']) => {
    switch (status) {
      case 'up-to-date':
        return '#00E096';
      case 'pending':
        return '#FFAA00';
      case 'overdue':
        return '#FF3D71';
      default:
        return '#8F9BB3';
    }
  };

  const getStatusLabel = (status: PatientDisplay['status']) => {
    switch (status) {
      case 'up-to-date':
        return 'Up-to-date';
      case 'pending':
        return 'Pending';
      case 'overdue':
        return 'Overdue';
      default:
        return status;
    }
  };

  const renderSearchIcon = () => (
    <Ionicons name="search-outline" size={20} color="#8F9BB3" />
  );

  const renderPatientCard = (patient: PatientDisplay) => (
    <TouchableOpacity
      key={patient.id}
      style={styles.patientCard}
      onPress={() => handlePatientPress(patient)}
    >
      <View style={styles.patientCardContent}>
        <Image source={{ uri: patient.avatar }} style={styles.avatar} />
        <View style={styles.patientInfo}>
          <Text category="s1" style={styles.patientName}>
            {patient.name}
          </Text>
          <Text category="c1" appearance="hint">
            ID: {patient.patientId} | {patient.age} {patient.gender}
          </Text>
          <View style={styles.statusContainer}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: getStatusColor(patient.status) },
              ]}
            />
            <Text
              category="c2"
              style={[
                styles.statusText,
                { color: getStatusColor(patient.status) },
              ]}
            >
              {getStatusLabel(patient.status)}
            </Text>
          </View>
        </View>
      </View>
      <Ionicons name="chevron-forward-outline" size={20} color="#8F9BB3" />
    </TouchableOpacity>
  );

  // Error state
  if (isError) {
    return (
      <Layout style={styles.container}>
        <Layout style={styles.header} level="2">
          <Text category="h4" style={styles.headerTitle}>
            Patients
          </Text>
          <TouchableOpacity
            style={styles.notificationButton}
            onPress={handleNotificationPress}
          >
            <Ionicons name="notifications-outline" size={24} color="#8F9BB3" />
          </TouchableOpacity>
        </Layout>
        <View style={styles.errorState}>
          <Ionicons name="alert-circle-outline" size={64} color="#FF3D71" />
          <Text category="h6" style={styles.errorTitle}>
            Failed to Load Patients
          </Text>
          <Text category="s1" appearance="hint">
            {error?.message || 'An error occurred'}
          </Text>
          <Button style={{ marginTop: 16 }} onPress={handleRefresh}>
            Try Again
          </Button>
        </View>
      </Layout>
    );
  }

  return (
    <Layout style={styles.container}>
      {/* Header */}
      <Layout style={styles.header} level="2">
        <Text category="h4" style={styles.headerTitle}>
          Patients
        </Text>
        <TouchableOpacity
          style={styles.notificationButton}
          onPress={handleNotificationPress}
        >
          <Ionicons name="notifications-outline" size={24} color="#8F9BB3" />
        </TouchableOpacity>
      </Layout>

      {/* Search and Filters */}
      <Layout style={styles.searchSection} level="2">
        <Input
          placeholder="Search patients..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          accessoryLeft={renderSearchIcon}
          style={styles.searchInput}
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScrollView}
          contentContainerStyle={styles.filterContainer}
        >
          <Button
            size="small"
            appearance="outline"
            style={styles.filterButton}
            onPress={handleFilterPress}
            accessoryLeft={() => (
              <Ionicons name="filter-outline" size={16} color="#8F9BB3" />
            )}
          >
            Filter
          </Button>

          <Button
            size="small"
            appearance="outline"
            style={styles.filterButton}
            onPress={handleSortPress}
            accessoryRight={() => (
              <Ionicons name="chevron-down-outline" size={16} color="#8F9BB3" />
            )}
          >
            Sort: Name
          </Button>

          <Button
            size="small"
            appearance="filled"
            style={[styles.filterButton, styles.activeFilterButton]}
            onPress={handleStatusFilterPress}
            accessoryRight={() => (
              <Ionicons name="chevron-down-outline" size={16} color="#3366FF" />
            )}
          >
            Status: All
          </Button>
        </ScrollView>
      </Layout>

      {/* Patient List */}
      {isLoading && !data ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3366FF" />
          <Text category="s1" appearance="hint" style={styles.loadingText}>
            Loading patients...
          </Text>
        </View>
      ) : filteredPatients.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="people-outline" size={64} color="#8F9BB3" />
          <Text category="h6" style={styles.emptyTitle}>
            No patients found
          </Text>
          <Text category="s1" appearance="hint">
            {searchQuery ? 'Try a different search term' : 'Start by adding a new patient'}
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={isFetching && offset === 0}
              onRefresh={handleRefresh}
              tintColor="#3366FF"
            />
          }
        >
          {filteredPatients.map((patient) => renderPatientCard(patient))}

          {/* Pagination Controls */}
          {!searchQuery && (hasPrevious || hasMore) && (
            <View style={styles.paginationContainer}>
              <Button
                size="small"
                appearance="outline"
                onPress={handleLoadPrevious}
                disabled={!hasPrevious || isFetching}
                style={styles.paginationButton}
              >
                Previous
              </Button>

              <Text category="c1" appearance="hint">
                {offset + 1} - {Math.min(offset + LIMIT, total)} of {total}
              </Text>

              <Button
                size="small"
                appearance="outline"
                onPress={handleLoadMore}
                disabled={!hasMore || isFetching}
                style={styles.paginationButton}
              >
                Next
              </Button>
            </View>
          )}
        </ScrollView>
      )}

      {/* Floating Action Button */}
      <TouchableOpacity style={styles.fab} onPress={handleAddPatient}>
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EDF1F7',
  },
  headerTitle: {
    flex: 1,
    fontWeight: 'bold',
  },
  notificationButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  searchInput: {
    marginBottom: 12,
  },
  filterScrollView: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 16,
  },
  filterButton: {
    marginRight: 0,
  },
  activeFilterButton: {
    backgroundColor: 'rgba(51, 102, 255, 0.1)',
    borderColor: '#3366FF',
  },
  scrollView: {
    flex: 1,
  },
  listContainer: {
    padding: 16,
    gap: 12,
    paddingBottom: 96,
  },
  patientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  patientCardContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontWeight: '600',
    marginBottom: 4,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#3366FF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    marginTop: 8,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 32,
  },
  emptyTitle: {
    marginTop: 16,
  },
  errorState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 32,
  },
  errorTitle: {
    marginTop: 16,
  },
  paginationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    gap: 12,
  },
  paginationButton: {
    minWidth: 100,
  },
});
