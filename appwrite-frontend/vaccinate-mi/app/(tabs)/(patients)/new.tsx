import React, { useState } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  View,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Layout, Text } from '@ui-kitten/components';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import PatientForm from '../../../components/patients/PatientForm';
import { patientsService } from '../../../services/patientsService';

// TODO: Get this from user context/session
const DEFAULT_FACILITY_ID = 'default-facility-id';

export default function PatientNew() {
  const [loading, setLoading] = useState(false);

  const handleBack = () => {
    router.back();
  };

  const handleSave = async (data: any) => {
    try {
      setLoading(true);

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
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Create patient in Appwrite
      const newPatient = await patientsService.create(patientData);

      console.log('Patient created successfully:', newPatient);

      Alert.alert(
        'Success',
        'Patient created successfully!',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error: any) {
      console.error('Failed to create patient:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to create patient. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <Layout style={styles.container}>
      {/* Header */}
      <Layout style={styles.header} level="2">
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color="#8F9BB3" />
        </TouchableOpacity>
        <Text category="h6" style={styles.headerTitle}>
          New Patient
        </Text>
        <View style={styles.headerSpacer} />
      </Layout>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3366FF" />
          <Text category="s1" appearance="hint" style={styles.loadingText}>
            Creating patient...
          </Text>
        </View>
      ) : (
        <PatientForm
          facilityId={DEFAULT_FACILITY_ID}
          onSave={handleSave}
          onCancel={handleCancel}
          mode="new"
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
});
