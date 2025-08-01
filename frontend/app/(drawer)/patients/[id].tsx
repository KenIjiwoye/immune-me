import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format, differenceInYears } from 'date-fns';
import { useAuth } from '../../../context/auth';
import { usePatient, usePatientImmunizations } from '../../../hooks/usePatients';

export default function PatientDetailsScreen() {
  const { isAuthenticated } = useAuth();
  const params = useLocalSearchParams();
  const patientId = parseInt(params.id as string, 10);

  const {
    data: patient,
    isLoading: isPatientLoading,
    isError: isPatientError,
  } = usePatient(patientId);

  const {
    data: immunizations,
    isLoading: isImmunizationsLoading,
  } = usePatientImmunizations(patientId);

  if (isPatientLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Loading patient data...</Text>
      </View>
    );
  }

  if (isPatientError || !patient) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#dc3545" />
        <Text style={styles.errorText}>Patient not found</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const birthDate = new Date(patient.dateOfBirth);
  const age = differenceInYears(new Date(), birthDate);
  const formattedBirthDate = format(birthDate, 'MMMM d, yyyy');

  return (
    <>
      <Stack.Screen
        options={{
          title: patient.fullName,
          headerRight: () => (
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => router.push(`/patients/${patient.id}/edit` as any)}
            >
              <Ionicons name="create-outline" size={24} color="#007bff" />
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.name}>{patient.fullName}</Text>
          <View style={styles.basicInfo}>
            <View style={styles.infoItem}>
              <Ionicons
                name={patient.sex === 'M' ? 'male' : 'female'}
                size={16}
                color="#6c757d"
              />
              <Text style={styles.infoText}>
                {patient.sex === 'M' ? 'Male' : 'Female'}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="calendar-outline" size={16} color="#6c757d" />
              <Text style={styles.infoText}>{age} years old</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          <View style={styles.infoCard}>
            <InfoRow label="Date of Birth" value={formattedBirthDate} />
            <InfoRow label="Mother's Name" value={patient.motherName || 'Not provided'} />
            <InfoRow label="Father's Name" value={patient.fatherName || 'Not provided'} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          <View style={styles.infoCard}>
            <InfoRow label="District" value={patient.district} />
            <InfoRow label="Town/Village" value={patient.townVillage || 'Not provided'} />
            <InfoRow label="Address" value={patient.address || 'Not provided'} />
            <InfoRow label="Phone" value={patient.contactPhone || 'Not provided'} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Health Worker Information</Text>
          <View style={styles.infoCard}>
            <InfoRow label="Name" value={patient.healthWorkerName || 'Not assigned'} />
            <InfoRow label="Phone" value={patient.healthWorkerPhone || 'Not provided'} />
            <InfoRow label="Facility" value={patient.facility?.name || 'Not assigned'} />
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Immunization History</Text>
            <TouchableOpacity
              style={styles.addImmunizationButton}
              onPress={() => router.push(`/immunizations/add?patientId=${patient.id}` as any)}
            >
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.addImmunizationText}>Add</Text>
            </TouchableOpacity>
          </View>

          {isImmunizationsLoading ? (
            <ActivityIndicator size="small" color="#007bff" />
          ) : immunizations?.length === 0 ? (
            <View style={styles.emptyImmunizations}>
              <Ionicons name="medical-outline" size={48} color="#e9ecef" />
              <Text style={styles.emptyText}>No immunization records</Text>
            </View>
          ) : (
            <View style={styles.immunizationsList}>
              {immunizations?.map((record: any) => (
                <TouchableOpacity
                  key={record.id}
                  style={styles.immunizationCard}
                  // onPress={() => router.push(`/immunizations/${record.id}` as any)}
                >
                  <View style={styles.immunizationHeader}>
                    <Text style={styles.vaccineName}>{record.vaccine.name}</Text>
                    <Ionicons name="chevron-forward" size={20} color="#6c757d" />
                  </View>
                  <View style={styles.immunizationDetails}>
                    <View style={styles.immunizationDetail}>
                      <Ionicons name="calendar" size={16} color="#6c757d" />
                      <Text style={styles.detailText}>
                        {format(new Date(record.administeredDate), 'MMM d, yyyy')}
                      </Text>
                    </View>
                    <View style={styles.immunizationDetail}>
                      <Ionicons name="person" size={16} color="#6c757d" />
                      <Text style={styles.detailText}>{record.administeredBy.fullName}</Text>
                    </View>
                    {record.returnDate && (
                      <View style={styles.immunizationDetail}>
                        <Ionicons name="calendar-outline" size={16} color="#fd7e14" />
                        <Text style={[styles.detailText, { color: '#fd7e14' }]}>
                          Return: {format(new Date(record.returnDate), 'MMM d, yyyy')}
                        </Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </>
  );
}

interface InfoRowProps {
  label: string;
  value: string;
}

function InfoRow({ label, value }: InfoRowProps) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}:</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6c757d',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#dc3545',
    marginTop: 16,
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: '#6c757d',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  editButton: {
    padding: 8,
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  basicInfo: {
    flexDirection: 'row',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  infoText: {
    fontSize: 16,
    color: '#6c757d',
    marginLeft: 4,
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  infoLabel: {
    width: 120,
    fontSize: 16,
    color: '#6c757d',
  },
  infoValue: {
    flex: 1,
    fontSize: 16,
  },
  addImmunizationButton: {
    flexDirection: 'row',
    backgroundColor: '#28a745',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignItems: 'center',
  },
  addImmunizationText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  emptyImmunizations: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6c757d',
  },
  immunizationsList: {
    marginBottom: 20,
  },
  immunizationCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  immunizationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  vaccineName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  immunizationDetails: {
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    paddingTop: 8,
  },
  immunizationDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailText: {
    fontSize: 14,
    color: '#6c757d',
    marginLeft: 8,
  },
});