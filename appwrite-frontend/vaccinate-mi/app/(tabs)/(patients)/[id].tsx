import React, { useState, useMemo } from 'react';
import { ScrollView, View, StyleSheet, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native';

import { Layout, Text, OverflowMenu, MenuItem } from '@ui-kitten/components';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { usePatient, useDeletePatient } from '../../../hooks/usePatients';
import { useImmunizationsByPatient } from '../../../hooks/useImmunizations';
import type { Patient } from '../../../types/appwrite';

interface ImmunizationDisplay {
  id: string;
  name: string;
  administeredDate: string;
  nextDose: string | null;
  status: 'completed' | 'scheduled' | 'overdue';
}

export default function PatientDetails() {
  const params = useLocalSearchParams<{ id: string }>();
  const [selectedTab, setSelectedTab] = useState(0);
  const [menuVisible, setMenuVisible] = useState(false);

  // Use React Query hooks
  const { data: patient, isLoading: patientLoading, isError: patientError } = usePatient(params.id);
  const deletePatientMutation = useDeletePatient();

  // Fetch immunization records using React Query
  const { data: immunizationRecords = [], isLoading: immunizationsLoading } = useImmunizationsByPatient(params.id);


  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Transform immunization records to display format
  const immunizations = useMemo<ImmunizationDisplay[]>(() => {
    return immunizationRecords.map((record) => ({
      id: record.$id,
      name: record.vaccine_id, // TODO: Map vaccine_id to vaccine name
      administeredDate: formatDate(record.administered_date),
      nextDose: record.return_date ? formatDate(record.return_date) : null,
      status: 'completed' as const,
    }));
  }, [immunizationRecords]);

  const handleBack = () => {
    router.back();
  };

  const handleAddRecord = () => {
    router.push({
      pathname: '/(tabs)/immunizations/new',
      params: { patientId: params.id },
    });
  };

  const handleDeletePatient = async () => {
    if (!patient) return;

    Alert.alert(
      'Delete Patient',
      `Are you sure you want to delete ${patient.full_name}? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePatientMutation.mutateAsync(patient.$id);
              Alert.alert(
                'Success',
                'Patient deleted successfully',
                [
                  {
                    text: 'OK',
                    onPress: () => router.back(),
                  },
                ]
              );
            } catch (error: any) {
              console.error('Failed to delete patient:', error);
              Alert.alert(
                'Error',
                error.message || 'Failed to delete patient. Please try again.',
                [{ text: 'OK' }]
              );
            }
          },
        },
      ]
    );
  };


  const renderInfoItem = (label: string, value: string | undefined) => (
    <View style={styles.infoItem}>
      <Text category="c1" appearance="hint">
        {label}
      </Text>
      <Text category="s1">{value || 'N/A'}</Text>
    </View>
  );

  const renderImmunizationCard = (immunization: ImmunizationDisplay) => (
    <View key={immunization.id} style={styles.immunizationCard}>
      <View style={styles.statusDot} />
      <View style={styles.immunizationContent}>
        <Text category="s1" style={styles.immunizationName}>
          {immunization.name}
        </Text>
        <Text category="c1" appearance="hint">
          Administered: {immunization.administeredDate}
        </Text>
      </View>
      <View style={styles.nextDoseContainer}>
        <Text category="c2" appearance="hint">
          Next Dose
        </Text>
        <Text category="s2" style={styles.nextDoseText}>
          {immunization.nextDose || '-'}
        </Text>
      </View>
    </View>
  );

  if (patientLoading || immunizationsLoading) {

    return (
      <Layout style={styles.container}>
        <Layout style={styles.header} level="2">
          <TouchableOpacity style={styles.headerButton} onPress={handleBack}>
            <Ionicons name="arrow-back" size={24} color="#8F9BB3" />
          </TouchableOpacity>
          <Text category="h6" style={styles.headerTitle}>
            Patient Details
          </Text>
          <View style={styles.headerButton} />
        </Layout>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3366FF" />
          <Text category="s1" appearance="hint" style={styles.loadingText}>
            Loading patient details...
          </Text>
        </View>
      </Layout>
    );
  }

  if (!patient) {
    return (
      <Layout style={styles.container}>
        <Layout style={styles.header} level="2">
          <TouchableOpacity style={styles.headerButton} onPress={handleBack}>
            <Ionicons name="arrow-back" size={24} color="#8F9BB3" />
          </TouchableOpacity>
          <Text category="h6" style={styles.headerTitle}>
            Patient Details
          </Text>
          <View style={styles.headerButton} />
        </Layout>
        <View style={styles.emptyState}>
          <Ionicons name="alert-circle-outline" size={64} color="#8F9BB3" />
          <Text category="h6" style={styles.emptyTitle}>
            Patient Not Found
          </Text>
          <Text category="s1" appearance="hint">
            This patient could not be loaded
          </Text>
        </View>
      </Layout>
    );
  }

  const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(
    patient.full_name
  )}&background=3366FF&color=fff&size=128`;

  return (
    <Layout style={styles.container}>
      {/* Header */}
      <Layout style={styles.header} level="2">
        <TouchableOpacity style={styles.headerButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color="#8F9BB3" />
        </TouchableOpacity>
        <Text category="h6" style={styles.headerTitle}>
          {patient.full_name}
        </Text>
        <OverflowMenu
          anchor={(props) => (
            <TouchableOpacity
              {...props}
              style={styles.headerButton}
              onPress={() => setMenuVisible(!menuVisible)}
            >
              <Ionicons name="ellipsis-vertical" size={24} color="#8F9BB3" />
            </TouchableOpacity>
          )}
          visible={menuVisible}
          onBackdropPress={() => setMenuVisible(false)}
          placement="bottom end"
          fullWidth={false}
        >
          <MenuItem
            title="Edit Patient"
            onPress={() => {
              setMenuVisible(false);
              router.push({ pathname: '/(tabs)/(patients)/edit', params: { id: patient.$id } });
            }}
          />
          <MenuItem
            title="Delete Patient"
            onPress={() => {
              setMenuVisible(false);
              handleDeletePatient();
            }}
          />

        </OverflowMenu>

      </Layout>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Patient Info Card */}
        <View style={styles.card}>
          <View style={styles.patientHeader}>
            <Image source={{ uri: avatarUrl }} style={styles.avatarLarge} />
            <View style={styles.patientHeaderInfo}>
              <Text category="h6">{patient.full_name}</Text>
              <Text category="c1" appearance="hint" style={styles.patientId}>
                {patient.$id.slice(-11)}
              </Text>
            </View>
          </View>

          <View style={styles.patientInfoGrid}>
            {renderInfoItem('Date of Birth', formatDate(patient.date_of_birth))}
            {renderInfoItem('Sex', patient.sex)}
            {renderInfoItem('Mother', patient.mother_name)}
            {renderInfoItem('Father', patient.father_name)}
            {renderInfoItem('District', patient.district)}
            {renderInfoItem('Town/Village', patient.town_village)}
            {renderInfoItem('Contact', patient.contact_phone)}
            {renderInfoItem('Address', patient.address)}
          </View>
        </View>

        {/* Assigned Worker Card */}
        {patient.health_worker_name && (
          <View style={styles.workerCard}>
            <View style={styles.workerIconContainer}>
              <Ionicons name="shield-checkmark" size={24} color="#3366FF" />
            </View>
            <View style={styles.workerInfo}>
              <Text category="c1" appearance="hint">
                Assigned Health Worker
              </Text>
              <Text category="s1" style={styles.workerName}>
                {patient.health_worker_name}
              </Text>
              {patient.health_worker_phone && (
                <Text category="c1" appearance="hint">
                  {patient.health_worker_phone}
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Immunization History */}
        <View style={styles.historySection}>
          <Text category="h5" style={styles.historyTitle}>
            Immunization History
          </Text>

          {/* Tab Buttons */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tabButton, selectedTab === 0 && styles.activeTab]}
              onPress={() => setSelectedTab(0)}
            >
              <Text
                category="s2"
                style={[
                  styles.tabText,
                  selectedTab === 0 && styles.activeTabText,
                ]}
              >
                Completed
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabButton, selectedTab === 1 && styles.inactiveTab]}
              onPress={() => setSelectedTab(1)}
            >
              <Text category="s2" style={styles.inactiveTabText}>
                Scheduled
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabButton, selectedTab === 2 && styles.inactiveTab]}
              onPress={() => setSelectedTab(2)}
            >
              <Text category="s2" style={styles.inactiveTabText}>
                Overdue
              </Text>
            </TouchableOpacity>
          </View>

          {/* Immunization List */}
          <View style={styles.immunizationList}>
            {immunizations.map((immunization) => renderImmunizationCard(immunization))}
          </View>
        </View>
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity style={styles.fab} onPress={handleAddRecord}>
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
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EDF1F7',
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 96,
    gap: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    overflow: 'hidden',
  },
  patientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EDF1F7',
  },
  avatarLarge: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  patientHeaderInfo: {
    flex: 1,
  },
  patientId: {
    fontFamily: 'monospace',
    marginTop: 4,
  },
  patientInfoGrid: {
    padding: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  infoItem: {
    width: '48%',
    paddingVertical: 8,
    gap: 4,
  },
  workerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  workerIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(51, 102, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  workerInfo: {
    flex: 1,
    gap: 4,
  },
  workerName: {
    fontWeight: '500',
  },
  historySection: {
    gap: 16,
  },
  historyTitle: {
    fontWeight: 'bold',
    paddingHorizontal: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#EDF1F7',
    borderRadius: 12,
    padding: 4,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTab: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  inactiveTab: {
    backgroundColor: 'transparent',
  },
  tabText: {
    fontWeight: '600',
  },
  activeTabText: {
    color: '#3366FF',
  },
  inactiveTabText: {
    color: '#8F9BB3',
  },
  immunizationList: {
    gap: 8,
  },
  immunizationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#00E096',
  },
  immunizationContent: {
    flex: 1,
    gap: 4,
  },
  immunizationName: {
    fontWeight: '500',
  },
  nextDoseContainer: {
    alignItems: 'flex-end',
    gap: 4,
  },
  nextDoseText: {
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
});
