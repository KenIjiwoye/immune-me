import React, { useState, useEffect } from 'react';
import ImmunizationForm from '../../../../components/patients/ImmunizationForm';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Layout, Text, IndexPath } from '@ui-kitten/components';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { immunizationRecordsService } from '../../../../services/immunizationRecordsService';
import { patientsService } from '../../../../services/patientsService';
import { ImmunizationRecord, Patient } from '../../../../types/appwrite';

const vaccines = ['COVID-19 (Pfizer)', 'Influenza', 'MMR'];

export default function EditImmunization() {
  const params = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [immunization, setImmunization] = useState<ImmunizationRecord | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);

  useEffect(() => {
    if (params.id) {
      loadImmunization();
    }
  }, [params.id]);

  const loadImmunization = async () => {
    try {
      setLoading(true);
      const record = await immunizationRecordsService.get(params.id);
      setImmunization(record);

      // Load patient details
      const patientData = await patientsService.get(record.patient_id);
      setPatient(patientData);
    } catch (error) {
      console.error('Failed to load immunization:', error);
      Alert.alert('Error', 'Failed to load immunization record');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  const handleSave = async (data: any) => {
    if (!immunization) return;

    try {
      const updatedData: Partial<ImmunizationRecord> = {
        vaccine_id: 'temp-vaccine-id', // TODO: Map vaccine name to vaccine ID
        administered_date: data.dateAdministered.toISOString(),
        batch_number: data.batchNumber,
        notes: data.notes,
        updated_at: new Date().toISOString(),
      };

      await immunizationRecordsService.update(params.id, updatedData);

      Alert.alert('Success', 'Immunization record updated successfully', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      console.error('Failed to update immunization record:', error);
      Alert.alert('Error', 'Failed to update record. Please try again.');
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
            Edit Immunization
          </Text>
          <View style={styles.headerSpacer} />
        </Layout>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3366FF" />
          <Text category="s1" appearance="hint" style={styles.loadingText}>
            Loading record...
          </Text>
        </View>
      </Layout>
    );
  }

  if (!immunization || !patient) {
    return (
      <Layout style={styles.container}>
        <Layout style={styles.header} level="2">
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Ionicons name="arrow-back" size={24} color="#8F9BB3" />
          </TouchableOpacity>
          <Text category="h6" style={styles.headerTitle}>
            Edit Immunization
          </Text>
          <View style={styles.headerSpacer} />
        </Layout>
        <View style={styles.emptyState}>
          <Ionicons name="alert-circle-outline" size={64} color="#8F9BB3" />
          <Text category="h6" style={styles.emptyTitle}>
            Record Not Found
          </Text>
          <Text category="s1" appearance="hint">
            This immunization record could not be loaded
          </Text>
        </View>
      </Layout>
    );
  }

  // Map vaccine ID to vaccine index (this is a placeholder)
  // TODO: Implement proper vaccine mapping
  const getVaccineIndex = (vaccineId: string): IndexPath | undefined => {
    // For now, return undefined as we don't have vaccine mapping
    return undefined;
  };

  return (
    <Layout style={styles.container}>
      {/* Header */}
      <Layout style={styles.header} level="2">
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color="#8F9BB3" />
        </TouchableOpacity>
        <Text category="h6" style={styles.headerTitle}>
          Edit Immunization
        </Text>
        <View style={styles.headerSpacer} />
      </Layout>

      <ImmunizationForm
        initialData={{
          vaccineType: getVaccineIndex(immunization.vaccine_id),
          dateAdministered: new Date(immunization.administered_date),
          facility: '', // TODO: Load facility name from facility_id
          batchNumber: immunization.batch_number || '',
          nextDoseDate: immunization.return_date ? new Date(immunization.return_date) : undefined,
          notes: immunization.notes || '',
        }}
        patientData={{
          name: patient.full_name,
          dob: new Date(patient.date_of_birth).toLocaleDateString(),
          patientId: patient.$id.slice(-11),
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(
            patient.full_name
          )}&background=3366FF&color=fff&size=128`,
        }}
        onSave={handleSave}
        mode="edit"
      />
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
