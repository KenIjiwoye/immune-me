import React, { useState } from 'react';
import { ScrollView, View, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Layout, Text, Input, Button } from '@ui-kitten/components';
import { Ionicons } from '@expo/vector-icons';

interface Patient {
  id: string;
  name: string;
  patientId: string;
  age: number;
  gender: 'M' | 'F';
  status: 'up-to-date' | 'pending' | 'overdue';
  avatar: string;
}

export default function Patients() {
  const [searchQuery, setSearchQuery] = useState('');

  const patients: Patient[] = [
    {
      id: '1',
      name: 'James Rodriguez',
      patientId: '12345',
      age: 34,
      gender: 'M',
      status: 'up-to-date',
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC_BvPC_imz4gY8j2FNSSTbZ3mq6qiVNO2ZWBa_a6Y81eZ6Ac0Bh308-aUaRGUdDREyTfDTyDHffjsZAX6dBO5GXNJ8uiFMqzRuJJ_zkkDYavaiysSUnaFeNx_06ZredqdMC7NKP7qbCrIpQmAGU64Feof1y5njt9bgiP1ON45B9BBEBPHcbNYwklEpYmzM2rvOutHWqC5Vbc8c4BEwDcCaW4pVnyjFvr2zqVOoWMZucnDF3wQw9OysCFDYCu2MSRmhrufFM4xShqQ',
    },
    {
      id: '2',
      name: 'Maria Garcia',
      patientId: '67890',
      age: 28,
      gender: 'F',
      status: 'pending',
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCYeih17iiQhkX84RGryjoU1ZsRSjgKoRW5aLHQCJ1M4djXOHn_o5Q3Hog6EguzeW7KxNjMPGDIbiL07WFTq5qc7JjIMJPh6JCkufhQgMkVcY_ne1Td_7F6BQP1GPd0XggAvdAOwX0WlxWbVi8vctRvXdSJqNetPetLW-Qc0rFr2-r6OHuBSjDruoXYsm71IYej_-ebrKefV_t_-kvh4NR3IG4N0xhs-WmVYaN3K8u1ryn0dyPRGs9ExvT8NY1EY587KuRZQgTZibE',
    },
    {
      id: '3',
      name: 'Robert Smith',
      patientId: '54321',
      age: 45,
      gender: 'M',
      status: 'overdue',
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB_4-t5tAouT2HfcMzZK-Apdalfe_ZkkpeVo8jXAsNwDamEIxBoK-Ke4yRKgDfcq8wpx3YuIH1eeN7joGv-Hvq0n6xnZ7qtCPed9MWMU0CDpS2hrq20O0H6B3eH_DMlKgKu3h_3AYDVr0KYXAedQO4b2KESsxxE4C2wzhwiaGFP4yOoVWbMu2G2Ajg6LDS-_siQx-X07ZJA2bdPoMcA_UOpkaooAcf1wQnPTcVMJAaYJCOavCZ3CsGG861IElisWUBxrgNRoy0l3Jg',
    },
  ];

  const handleNotificationPress = () => {
    console.log('Notifications pressed');
  };

  const handlePatientPress = (patient: Patient) => {
    console.log('Patient pressed:', patient.name);
  };

  const handleAddPatient = () => {
    console.log('Add patient pressed');
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

  const getStatusColor = (status: Patient['status']) => {
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

  const getStatusLabel = (status: Patient['status']) => {
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

  const renderPatientCard = (patient: Patient) => (
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
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.listContainer}>
        {patients.map((patient) => renderPatientCard(patient))}
      </ScrollView>

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
});
