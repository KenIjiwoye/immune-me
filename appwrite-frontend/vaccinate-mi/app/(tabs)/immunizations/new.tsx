import React, { useState, useEffect } from 'react';
import ImmunizationForm from '../../../components/patients/ImmunizationForm';
import {
  ScrollView,
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Layout, Text, Select, SelectItem, IndexPath } from '@ui-kitten/components';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { patientsService } from '../../../services/patientsService';
import { immunizationRecordsService } from '../../../services/immunizationRecordsService';
import { Patient, ImmunizationRecord } from '../../../types/appwrite';

export default function NewImmunization() {
  const params = useLocalSearchParams<{ patientId?: string }>();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientIndex, setSelectedPatientIndex] = useState<IndexPath | undefined>(
    undefined
  );
  const [loading, setLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  useEffect(() => {
    loadPatients();
  }, []);

  const loadPatients = async () => {
    try {
      setLoading(true);
      const result = await patientsService.list();
      const patientsList = result.documents;
      setPatients(patientsList);

      // If patientId is provided in params, pre-select that patient
      if (params.patientId) {
        const patientIndex = patientsList.findIndex((p) => p.$id === params.patientId);
        if (patientIndex !== -1) {
          setSelectedPatientIndex(new IndexPath(patientIndex));
          setSelectedPatient(patientsList[patientIndex]);
        }
      }
    } catch (error) {
      console.error('Failed to load patients:', error);
    } finally {
      setLoading(false);
    }
  };

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
      alert('Please select a patient');
      return;
    }

    try {
      const recordData: Partial<ImmunizationRecord> = {
        patient_id: selectedPatient.$id,
        vaccine_id: 'temp-vaccine-id', // TODO: Map vaccine name to vaccine ID
        facility_id: selectedPatient.facility_id,
        administered_by: 'Dr. Robert Johnson', // TODO: Get from auth context
        administration_date: data.dateAdministered.toISOString(),
        batch_number: data.batchNumber,
        notes: data.notes,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await immunizationRecordsService.create(recordData as Omit<ImmunizationRecord, keyof typeof AppwriteDocument>);

      // Navigate back to immunizations list
      router.replace('/(tabs)/immunizations');
    } catch (error) {
      console.error('Failed to save immunization record:', error);
      alert('Failed to save record. Please try again.');
    }
  };

  if (loading) {
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
            Loading patients...
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
            {patients.map((patient, index) => (
              <SelectItem
                key={patient.$id}
                title={`${patient.full_name} (${patient.$id.slice(-8)})`}
              />
            ))}
          </Select>
        </View>
      )}

      {/* Form */}
      {selectedPatient ? (
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
