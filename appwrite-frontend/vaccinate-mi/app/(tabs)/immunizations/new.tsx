import React, { useState, useEffect, useMemo } from 'react';
import ImmunizationForm from '../../../components/patients/ImmunizationForm';
import {
  ScrollView,
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Layout, Text, Select, SelectItem, IndexPath } from '@ui-kitten/components';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { usePatients } from '../../../hooks/usePatients';
import { useCreateImmunization } from '../../../hooks/useImmunizations';
import { useActiveVaccines } from '../../../hooks/useVaccines';
import { useSimpleAuth } from '../../../hooks/useAuth';
import { useCurrentUserProfile } from '../../../hooks/useProfiles';
import { Patient, ImmunizationRecord } from '../../../types/appwrite';

export default function NewImmunization() {
  const params = useLocalSearchParams<{ patientId?: string }>();
  const [selectedPatientIndex, setSelectedPatientIndex] = useState<IndexPath | undefined>(
    undefined
  );
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  // Use React Query hooks
  const { data: patientsData, isLoading: patientsLoading } = usePatients({ limit: 100 });
  const { data: vaccines, isLoading: vaccinesLoading } = useActiveVaccines();
  const createImmunizationMutation = useCreateImmunization();

  const { user, isLoading: authLoading } = useSimpleAuth();
  const { profile, isLoading: profileLoading } = useCurrentUserProfile(user?.id);

  const patients = useMemo(() => patientsData?.documents || [], [patientsData]);

  // Pre-select patient if patientId is provided
  useEffect(() => {
    if (params.patientId && patients.length > 0) {
      const patientIndex = patients.findIndex((p) => p.$id === params.patientId);
      if (patientIndex !== -1) {
        setSelectedPatientIndex(new IndexPath(patientIndex));
        setSelectedPatient(patients[patientIndex]);
      }
    }
  }, [params.patientId, patients]);

  const handleBack = () => {
    router.back();
  };

  const handlePatientSelect = (index: IndexPath | IndexPath[]) => {
    const selectedIndex = Array.isArray(index) ? index[0] : index;
    setSelectedPatientIndex(selectedIndex);
    setSelectedPatient(patients[selectedIndex.row]);
  };

  const handleSave = async (data: any) => {
    if (!selectedPatient) {
      Alert.alert('Error', 'Please select a patient');
      return;
    }

    if (!data.vaccine) {
      Alert.alert('Error', 'Please select a vaccine');
      return;
    }

    if (!profile) {
      Alert.alert('Error', 'User profile not found. Please try again.');
      return;
    }

    try {
      const recordData = {
        patient_id: selectedPatient.$id,
        vaccine_id: data.vaccine.$id,
        facility_id: selectedPatient.facility_id,
        administered_by_user_id: profile.$id,
        administered_by_profile_id: profile.$id,
        administered_date: data.dateAdministered.toISOString(),
        batch_number: data.batchNumber,
        notes: data.notes,
        is_standard_schedule: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await createImmunizationMutation.mutateAsync(recordData);

      Alert.alert(
        'Success',
        'Immunization record created successfully!',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/(tabs)/immunizations'),
          },
        ]
      );
    } catch (error: any) {
      console.error('Failed to save immunization record:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to save record. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  if (patientsLoading || vaccinesLoading || authLoading || profileLoading) {
    return (
      <Layout style={styles.container}>
        <Layout style={styles.header} level="2">
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Ionicons name="arrow-back" size={24} color="#8F9BB3" />
          </TouchableOpacity>
          <Text category="h6" style={styles.headerTitle}>
            New Immunization
          </Text>
          <View style={styles.headerSpacer} />
        </Layout>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3366FF" />
          <Text category="s1" appearance="hint" style={styles.loadingText}>
            Loading data...
          </Text>
        </View>
      </Layout>
    );
  }

  return (
    <Layout style={styles.container}>
      {/* Header */}
      <Layout style={styles.header} level="2">
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color="#8F9BB3" />
        </TouchableOpacity>
        <Text category="h6" style={styles.headerTitle}>
          New Immunization
        </Text>
        <View style={styles.headerSpacer} />
      </Layout>

      {/* Patient Selection */}
      {!params.patientId && (
        <View style={styles.patientSelector}>
          <Text category="label" style={styles.selectorLabel}>
            Select Patient*
          </Text>
          <Select
            placeholder="Choose a patient"
            value={
              selectedPatientIndex !== undefined
                ? patients[selectedPatientIndex.row].full_name
                : ''
            }
            selectedIndex={selectedPatientIndex}
            onSelect={handlePatientSelect}
          >
            {patients.map((patient) => (
              <SelectItem
                key={patient.$id}
                title={`${patient.full_name} (${patient.$id.slice(-8)})`}
              />
            ))}
          </Select>
        </View>
      )}

      {/* Form */}
      {createImmunizationMutation.isPending ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3366FF" />
          <Text category="s1" appearance="hint" style={styles.loadingText}>
            Creating record...
          </Text>
        </View>
      ) : selectedPatient ? (
        <ImmunizationForm
          initialData={{
            vaccineType: undefined,
            dateAdministered: new Date(),
            facility: '',
            batchNumber: '',
            nextDoseDate: undefined,
            notes: '',
          }}
          patientData={{
            name: selectedPatient.full_name,
            dob: new Date(selectedPatient.date_of_birth).toLocaleDateString(),
            patientId: selectedPatient.$id.slice(-11),
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(
              selectedPatient.full_name
            )}&background=3366FF&color=fff&size=128`,
          }}
          onSave={handleSave}
          mode="new"
          vaccines={vaccines || []}
        />
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="person-outline" size={64} color="#8F9BB3" />
          <Text category="s1" appearance="hint" style={styles.emptyText}>
            Please select a patient to continue
          </Text>
        </View>
      )}
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
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontWeight: '600',
  },
  headerSpacer: {
    width: 40,
  },
  patientSelector: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EDF1F7',
    gap: 8,
  },
  selectorLabel: {
    fontWeight: '500',
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
  emptyText: {
    textAlign: 'center',
  },
});
