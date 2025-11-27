import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  View,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Layout, Text } from '@ui-kitten/components';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import PatientForm from '../../../components/patients/PatientForm';
import { patientsService } from '../../../services/patientsService';
import type { Patient } from '../../../types/appwrite';

export default function PatientEdit() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [patient, setPatient] = useState<Patient | null>(null);

  useEffect(() => {
    if (id) {
      loadPatient();
    }
  }, [id]);

  const loadPatient = async () => {
    try {
      setLoading(true);
      const patientData = await patientsService.get(id);
      setPatient(patientData);
    } catch (error) {
      console.error('Failed to load patient:', error);
      Alert.alert(
        'Error',
        'Failed to load patient data. Please try again.',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  const handleSave = async (data: any) => {
    try {
      setSaving(true);

      // Prepare patient data for Appwrite
      const patientData = {
        full_name: data.full_name,
        sex: data.sex,
        date_of_birth: data.date_of_birth.toISOString(),
        mother_name: data.mother_name || undefined,
        father_name: data.father_name || undefined,
        district: data.district,
        town_village: data.town_village || undefined,
        address: data.address,
        contact_phone: data.contact_phone || undefined,
        health_worker_name: data.health_worker_name || undefined,
        health_worker_phone: data.health_worker_phone || undefined,
        health_worker_address: data.health_worker_address || undefined,
        facility_id: data.facility_id,
        updated_at: new Date().toISOString(),
      };

      // Update patient in Appwrite
      const updatedPatient = await patientsService.update(id, patientData);

      console.log('Patient updated successfully:', updatedPatient);

      Alert.alert(
        'Success',
        'Patient updated successfully!',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error: any) {
      console.error('Failed to update patient:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to update patient. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  if (loading) {
    return (
      <Layout style={styles.container}>
        <Layout style={styles.header} level="2">
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Ionicons name="arrow-back" size={24} color="#8F9BB3" />
          </TouchableOpacity>
          <Text category="h6" style={styles.headerTitle}>
            Edit Patient
          </Text>
          <View style={styles.headerSpacer} />
        </Layout>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3366FF" />
          <Text category="s1" appearance="hint" style={styles.loadingText}>
            Loading patient data...
          </Text>
        </View>
      </Layout>
    );
  }

  if (!patient) {
    return (
      <Layout style={styles.container}>
        <Layout style={styles.header} level="2">
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Ionicons name="arrow-back" size={24} color="#8F9BB3" />
          </TouchableOpacity>
          <Text category="h6" style={styles.headerTitle}>
            Edit Patient
          </Text>
          <View style={styles.headerSpacer} />
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

  return (
    <Layout style={styles.container}>
      {/* Header */}
      <Layout style={styles.header} level="2">
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color="#8F9BB3" />
        </TouchableOpacity>
        <Text category="h6" style={styles.headerTitle}>
          Edit Patient
        </Text>
        <View style={styles.headerSpacer} />
      </Layout>

      {saving ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3366FF" />
          <Text category="s1" appearance="hint" style={styles.loadingText}>
            Updating patient...
          </Text>
        </View>
      ) : (
        <PatientForm
          initialData={patient}
          facilityId={patient.facility_id}
          onSave={handleSave}
          onCancel={handleCancel}
          mode="edit"
        />
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