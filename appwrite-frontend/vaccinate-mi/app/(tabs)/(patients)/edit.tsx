import React from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Layout, Text } from '@ui-kitten/components';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { IndexPath } from '@ui-kitten/components';
import ImmunizationForm from '../../../components/patients/ImmunizationForm';

export default function PatientEdit() {
  const patient = {
    name: 'Eleanor Pena',
    dob: '05/12/1986',
    patientId: '987-654-321',
    avatar:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCTL-v5tOhl8JDjLNRmuEmg6ovOnda_XzvnJImUQCMGDCYRJITHh8Rtx18XYDnpk-CmmeBdY1C1D_Q0d_bquEl-mGijDY5QgcpDXyhuPd5xFJmrr3HiTtKGvgA79hSHwzf_hSCtxJgArV0PZGgO0pH-IFC0DI9Irau2-ouTLBDD5KjvdN0kETgEwAXcumvj8bE1OBW81MWAr3J_EhED06LIYdkmVadMhQwQUdoRMObiYgy4hhJFGmcLTW9ln3iMgQ_sSw4tiPpN9zQ',
  };

  const handleBack = () => {
    router.back();
  };

  const handleSave = (data: any) => {
    console.log('Update record', data);
  };

  const initialData = {
    vaccineType: new IndexPath(0), // 'COVID-19 (Pfizer)'
    dateAdministered: new Date('2023-10-15'),
    facility: 'General Hospital',
    batchNumber: 'ABC123',
    nextDoseDate: new Date('2024-01-15'),
    notes: 'First dose administered',
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
        initialData={initialData}
        patientData={patient}
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
});