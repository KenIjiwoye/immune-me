import React, { useState } from 'react';
import { ScrollView, View, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Layout, Text, OverflowMenu, MenuItem } from '@ui-kitten/components';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

interface Immunization {
  id: string;
  name: string;
  administeredDate: string;
  nextDose: string | null;
  status: 'completed' | 'scheduled' | 'overdue';
}

export default function PatientDetails() {
  const [selectedTab, setSelectedTab] = useState(0);

  const [menuVisible, setMenuVisible] = useState(false);

  const patient = {
    id: 'PA-738491',
    name: 'Olivia Chen',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDK5hmo-tOUKevtBLl7nQuwY3rPcJJXBWhJrxU1Vgi84U_sJU6Y1KwIWFdMGVTxGedSKSeW8xCzrc3nBFwUDvNOFnhcm-HjW-NBfiMqoFCbbAcaOHzjOthZbhgHxytJi1YZd0uBmATPzYLG32lKKPxdquNbQk8OgPMVTI2jLVagBcT4O_aptyCHMuEg3hXol3exIkQRdtPb_Od0yd0H74thIGJdASeQKTd0Qo_pgxGnY_VSjxZr87zWz7P1w8eQPESEfXhsKrEJxpY',
    dateOfBirth: 'Oct 22, 2023',
    sex: 'Female',
    guardian: 'Mei Lin',
    contact: '+1 (555) 123-4567',
    assignedWorker: 'Dr. Emily Carter',
  };

  const immunizations: Immunization[] = [
    {
      id: '1',
      name: 'BCG',
      administeredDate: 'Nov 15, 2023',
      nextDose: null,
      status: 'completed',
    },
    {
      id: '2',
      name: 'Hepatitis B - Dose 1',
      administeredDate: 'Dec 01, 2023',
      nextDose: 'Jan 01, 2024',
      status: 'completed',
    },
    {
      id: '3',
      name: 'Polio - Dose 1',
      administeredDate: 'Dec 01, 2023',
      nextDose: 'Jan 01, 2024',
      status: 'completed',
    },
    {
      id: '4',
      name: 'DTaP - Dose 1',
      administeredDate: 'Feb 20, 2024',
      nextDose: 'Apr 20, 2024',
      status: 'completed',
    },
  ];

  const handleBack = () => {
    router.back();
  };


  const handleAddRecord = () => {
    console.log('Add record pressed');
  };

  const renderInfoItem = (label: string, value: string) => (
    <View style={styles.infoItem}>
      <Text category="c1" appearance="hint">
        {label}
      </Text>
      <Text category="s1">{value}</Text>
    </View>
  );

  const renderImmunizationCard = (immunization: Immunization) => (
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

  return (
    <Layout style={styles.container}>
      {/* Header */}
      <Layout style={styles.header} level="2">
        <TouchableOpacity style={styles.headerButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color="#8F9BB3" />
        </TouchableOpacity>
        <Text category="h6" style={styles.headerTitle}>
          {patient.name}
        </Text>
        <OverflowMenu
          anchor={(props) => (
            <TouchableOpacity {...props} style={styles.headerButton} onPress={() => setMenuVisible(!menuVisible)}>
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
              router.push({ pathname: '/(tabs)/(patients)/edit', params: { id: patient.id } });
            }}
          />
        </OverflowMenu>
      </Layout>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Patient Info Card */}
        <View style={styles.card}>
          <View style={styles.patientHeader}>
            <Image source={{ uri: patient.avatar }} style={styles.avatarLarge} />
            <View style={styles.patientHeaderInfo}>
              <Text category="h6">{patient.name}</Text>
              <Text category="c1" appearance="hint" style={styles.patientId}>
                {patient.id}
              </Text>
            </View>
          </View>

          <View style={styles.patientInfoGrid}>
            {renderInfoItem('Date of Birth', patient.dateOfBirth)}
            {renderInfoItem('Sex', patient.sex)}
            {renderInfoItem('Guardian', patient.guardian)}
            {renderInfoItem('Contact', patient.contact)}
          </View>
        </View>

        {/* Assigned Worker Card */}
        <View style={styles.workerCard}>
          <View style={styles.workerIconContainer}>
            <Ionicons name="shield-checkmark" size={24} color="#3366FF" />
          </View>
          <View style={styles.workerInfo}>
            <Text category="c1" appearance="hint">
              Assigned Worker
            </Text>
            <Text category="s1" style={styles.workerName}>
              {patient.assignedWorker}
            </Text>
          </View>
        </View>

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
});
