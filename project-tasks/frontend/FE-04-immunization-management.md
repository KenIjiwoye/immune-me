# FE-04: Implement Immunization Management Screens

## Context
The Immunization Records Management System requires screens for managing immunization records, including recording new immunizations, viewing immunization details, and managing vaccine schedules.

## Dependencies
- FE-01: Authentication flow implemented
- FE-02: Dashboard screen implemented
- FE-03: Patient management screens implemented

## Requirements
1. Create a screen for recording new immunizations
2. Implement an immunization details screen
3. Create a vaccine selection interface
4. Implement return date scheduling
5. Add validation for immunization data entry
6. Implement Liberia immunization schedule support:
   - Schedule visualization
   - Vaccine series tracking
   - Compliance monitoring
   - Enhanced recording interface for Liberia EPI

## Code Example

### Add Immunization Screen

```typescript
// frontend/app/immunizations/new.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { useAuth } from '../context/auth';
import api from '../services/api';
import PatientInfoCard from '../components/PatientInfoCard';
import VaccineSelector from '../components/VaccineSelector';

type Patient = {
  id: number;
  fullName: string;
  sex: 'M' | 'F';
  dateOfBirth: string;
};

type Vaccine = {
  id: number;
  name: string;
  description: string;
  vaccineCode: string;
  sequenceNumber: number | null;
  vaccineSeries: string | null;
  standardScheduleAge: string | null;
  isSupplementary: boolean;
};

type VaccineSchedule = {
  id: number;
  name: string;
  country: string;
  description: string;
  isActive: boolean;
};

type VaccineScheduleItem = {
  id: number;
  scheduleId: number;
  vaccineId: number;
  recommendedAge: string;
  isRequired: boolean;
  sequenceInSchedule: number;
};

export default function AddImmunizationScreen() {
  const { isAuthenticated, user } = useAuth();
  const params = useLocalSearchParams();
  const patientId = params.patientId as string;
  
  const [patient, setPatient] = useState<Patient | null>(null);
  const [vaccines, setVaccines] = useState<Vaccine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [showAdministeredDatePicker, setShowAdministeredDatePicker] = useState(false);
  const [showReturnDatePicker, setShowReturnDatePicker] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    patientId: patientId ? parseInt(patientId) : 0,
    vaccineId: 0,
    administeredDate: new Date(),
    batchNumber: '',
    returnDate: null as Date | null,
    healthOfficer: '',
    isStandardSchedule: true,
    scheduleStatus: 'on_schedule',
    notes: '',
  });
  
  const [schedules, setSchedules] = useState<VaccineSchedule[]>([]);
  const [selectedSchedule, setSelectedSchedule] = useState<number | null>(null);
  const [scheduleItems, setScheduleItems] = useState<VaccineScheduleItem[]>([]);

  // Form validation
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }

    loadData();
  }, [isAuthenticated, patientId]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      
      // Load patient data if patientId is provided
      if (patientId) {
        const patientResponse = await api.get(`/patients/${patientId}`);
        setPatient(patientResponse.data);
        setFormData(prev => ({
          ...prev,
          patientId: parseInt(patientId)
        }));
      }
      
      // Load vaccines
      const vaccinesResponse = await api.get('/vaccines');
      setVaccines(vaccinesResponse.data);
    } catch (error) {
      console.error('Failed to load data:', error);
      Alert.alert('Error', 'Failed to load required data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.patientId) {
      newErrors.patientId = 'Patient is required';
    }
    
    if (!formData.vaccineId) {
      newErrors.vaccineId = 'Vaccine is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user makes a selection
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleAdministeredDateChange = (event: any, selectedDate?: Date) => {
    setShowAdministeredDatePicker(false);
    if (selectedDate) {
      setFormData(prev => ({
        ...prev,
        administeredDate: selectedDate
      }));
    }
  };

  const handleReturnDateChange = (event: any, selectedDate?: Date) => {
    setShowReturnDatePicker(false);
    if (selectedDate) {
      setFormData(prev => ({
        ...prev,
        returnDate: selectedDate
      }));
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      const payload = {
        ...formData,
        administeredDate: format(formData.administeredDate, 'yyyy-MM-dd'),
        returnDate: formData.returnDate ? format(formData.returnDate, 'yyyy-MM-dd') : null,
      };
      
      await api.post('/immunization-records', payload);
      
      Alert.alert(
        'Success',
        'Immunization record added successfully',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      console.error('Failed to add immunization record:', error);
      Alert.alert('Error', 'Failed to add immunization record. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Record Immunization' }} />
      <ScrollView style={styles.container}>
        {patient && (
          <PatientInfoCard patient={patient} />
        )}
        
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Immunization Details</Text>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Vaccine *</Text>
            <VaccineSelector
              vaccines={vaccines}
              selectedVaccineId={formData.vaccineId}
              onSelect={(vaccineId) => handleInputChange('vaccineId', vaccineId)}
              error={errors.vaccineId}
            />
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Administered Date *</Text>
            <TouchableOpacity
              style={styles.dateInput}
              onPress={() => setShowAdministeredDatePicker(true)}
            >
              <Text>{format(formData.administeredDate, 'MMMM d, yyyy')}</Text>
              <Ionicons name="calendar-outline" size={20} color="#6c757d" />
            </TouchableOpacity>
            {showAdministeredDatePicker && (
              <DateTimePicker
                value={formData.administeredDate}
                mode="date"
                display="default"
                onChange={handleAdministeredDateChange}
                maximumDate={new Date()}
              />
            )}
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Batch Number</Text>
            <TextInput
              style={styles.input}
              value={formData.batchNumber}
              onChangeText={(value) => handleInputChange('batchNumber', value)}
              placeholder="Enter batch number"
            />
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Return Date</Text>
            {formData.returnDate ? (
              <TouchableOpacity
                style={styles.dateInput}
                onPress={() => setShowReturnDatePicker(true)}
              >
                <Text>{format(formData.returnDate, 'MMMM d, yyyy')}</Text>
                <Ionicons name="calendar-outline" size={20} color="#6c757d" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.dateInput}
                onPress={() => setShowReturnDatePicker(true)}
              >
                <Text style={styles.placeholderText}>Select return date (if needed)</Text>
                <Ionicons name="calendar-outline" size={20} color="#6c757d" />
              </TouchableOpacity>
            )}
            {showReturnDatePicker && (
              <DateTimePicker
                value={formData.returnDate || new Date()}
                mode="date"
                display="default"
                onChange={handleReturnDateChange}
                minimumDate={new Date()}
              />
            )}
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Notes</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.notes}
              onChangeText={(value) => handleInputChange('notes', value)}
              placeholder="Enter any additional notes"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        </View>
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => router.back()}
            disabled={isSubmitting}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.submitButtonText}>Save Record</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </>
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
  formSection: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 4,
    padding: 12,
    fontSize: 16,
  },
  inputError: {
    borderColor: '#dc3545',
  },
  errorText: {
    color: '#dc3545',
    fontSize: 14,
    marginTop: 4,
  },
  textArea: {
    height: 100,
  },
  dateInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 4,
    padding: 12,
  },
  placeholderText: {
    color: '#6c757d',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    margin: 16,
    marginTop: 0,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 4,
    padding: 12,
    marginRight: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#6c757d',
    fontSize: 16,
    fontWeight: 'bold',
  },
  submitButton: {
    flex: 1,
    backgroundColor: '#28a745',
    borderRadius: 4,
    padding: 12,
    marginLeft: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
```

### Vaccine Selector Component

```typescript
// frontend/app/components/VaccineSelector.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Vaccine = {
  id: number;
  name: string;
  description: string;
  recommendedAge: string;
};

type VaccineSelectorProps = {
  vaccines: Vaccine[];
  selectedVaccineId: number;
  onSelect: (vaccineId: number) => void;
  error?: string;
};

export default function VaccineSelector({ vaccines, selectedVaccineId, onSelect, error }: VaccineSelectorProps) {
  const [modalVisible, setModalVisible] = useState(false);
  
  const selectedVaccine = vaccines.find(v => v.id === selectedVaccineId);
  
  return (
    <>
      <TouchableOpacity
        style={[styles.selector, error && styles.selectorError]}
        onPress={() => setModalVisible(true)}
      >
        <Text style={selectedVaccine ? styles.selectedText : styles.placeholderText}>
          {selectedVaccine ? selectedVaccine.name : 'Select a vaccine'}
        </Text>
        <Ionicons name="chevron-down" size={20} color="#6c757d" />
      </TouchableOpacity>
      {error && <Text style={styles.errorText}>{error}</Text>}
      
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Vaccine</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={vaccines}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.vaccineItem,
                    selectedVaccineId === item.id && styles.selectedVaccineItem
                  ]}
                  onPress={() => {
                    onSelect(item.id);
                    setModalVisible(false);
                  }}
                >
                  <View style={styles.vaccineInfo}>
                    <Text style={styles.vaccineName}>{item.name}</Text>
                    {item.recommendedAge && (
                      <Text style={styles.vaccineAge}>Recommended age: {item.recommendedAge}</Text>
                    )}
                    {item.description && (
                      <Text style={styles.vaccineDescription}>{item.description}</Text>
                    )}
                  </View>
                  {selectedVaccineId === item.id && (
                    <Ionicons name="checkmark-circle" size={24} color="#28a745" />
                  )}
                </TouchableOpacity>
              )}
              contentContainerStyle={styles.vaccineList}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  selector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 4,
    padding: 12,
  },
  selectorError: {
    borderColor: '#dc3545',
  },
  selectedText: {
    fontSize: 16,
  },
  placeholderText: {
    fontSize: 16,
    color: '#6c757d',
  },
  errorText: {
    color: '#dc3545',
    fontSize: 14,
    marginTop: 4,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  vaccineList: {
    paddingBottom: 16,
  },
  vaccineItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  selectedVaccineItem: {
    backgroundColor: '#e8f4fc',
  },
  vaccineInfo: {
    flex: 1,
  },
  vaccineName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  vaccineAge: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 2,
  },
  vaccineDescription: {
    fontSize: 14,
    color: '#6c757d',
  },
});
```

### Patient Info Card Component

```typescript
// frontend/app/components/PatientInfoCard.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format, differenceInYears } from 'date-fns';

type PatientInfoCardProps = {
  patient: {
    id: number;
    fullName: string;
    sex: 'M' | 'F';
    dateOfBirth: string;
  };
};

export default function PatientInfoCard({ patient }: PatientInfoCardProps) {
  const birthDate = new Date(patient.dateOfBirth);
  const age = differenceInYears(new Date(), birthDate);
  const formattedBirthDate = format(birthDate, 'MMM d, yyyy');

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Patient Information</Text>
      <View style={styles.patientInfo}>
        <Text style={styles.name}>{patient.fullName}</Text>
        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Ionicons name={patient.sex === 'M' ? 'male' : 'female'} size={16} color="#6c757d" />
            <Text style={styles.infoText}>{patient.sex === 'M' ? 'Male' : 'Female'}</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="calendar-outline" size={16} color="#6c757d" />
            <Text style={styles.infoText}>{age} years ({formattedBirthDate})</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6c757d',
    marginBottom: 8,
  },
  patientInfo: {
    borderLeftWidth: 4,
    borderLeftColor: '#007bff',
    paddingLeft: 12,
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  infoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    color: '#6c757d',
    marginLeft: 4,
  },
});
```

### Immunization Details Screen

```typescript
// frontend/app/immunizations/[id].tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useAuth } from '../context/auth';
import api from '../services/api';

type ImmunizationRecord = {
  id: number;
  administeredDate: string;
  returnDate: string | null;
  batchNumber: string | null;
  notes: string | null;
  patient: {
    id: number;
    fullName: string;
    sex: 'M' | 'F';
    dateOfBirth: string;
  };
  vaccine: {
    id: number;
    name: string;
    description: string;
  };
  administeredBy: {
    id: number;
    fullName: string;
    role: string;
  };
  facility: {
    id: number;
    name: string;
    district: string;
  };
};

export default function ImmunizationDetailsScreen() {
  const { isAuthenticated, user } = useAuth();
  const params = useLocalSearchParams();
  const recordId = params.id as string;
  
  const [record, setRecord] = useState<ImmunizationRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }

    loadRecord();
  }, [isAuthenticated, recordId]);

  const loadRecord = async () => {
    try {
      setIsLoading(true);
      const response = await api.get(`/immunization-records/${recordId}`);
      setRecord(response.data);
    } catch (error) {
      console.error('Failed to load immunization record:', error);
      Alert.alert('Error', 'Failed to load immunization record. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Confirm Deletion',
      'Are you sure you want to delete this immunization record? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: deleteRecord }
      ]
    );
  };

  const deleteRecord = async () => {
    try {
      setIsDeleting(true);
      await api.delete(`/immunization-records/${recordId}`);
      Alert.alert(
        'Success',
        'Immunization record deleted successfully',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      console.error('Failed to delete immunization record:', error);
      Alert.alert('Error', 'Failed to delete immunization record. Please try again.');
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Loading immunization record...</Text>
      </View>
    );
  }

  if (!record) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#dc3545" />
        <Text style={styles.errorText}>Immunization record not found</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Immunization Details',
          headerRight: () => (
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={handleDelete}
              disabled={isDeleting}
            >
              <Ionicons name="trash-outline" size={24} color="#dc3545" />
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.vaccineInfo}>
            <Text style={styles.vaccineName}>{record.vaccine.name}</Text>
            {record.vaccine.description && (
              <Text style={styles.vaccineDescription}>{record.vaccine.description}</Text>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Patient Information</Text>
          <TouchableOpacity
            style={styles.patientCard}
            onPress={() => router.push(`/patients/${record.patient.id}`)}
          >
            <View style={styles.patientInfo}>
              <Text style={styles.patientName}>{record.patient.fullName}</Text>
              <View style={styles.patientDetails}>
                <Ionicons name={record.patient.sex === 'M' ? 'male' : 'female'} size={16} color="#6c757d" />
                <Text style={styles.detailText}>
                  {record.patient.sex === 'M' ? 'Male' : 'Female'} | 
                  {format(new Date(record.patient.dateOfBirth), ' MMM d, yyyy')}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#6c757d" />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Immunization Details</Text>
          <View style={styles.detailsCard}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Administered Date:</Text>
              <Text style={styles.detailValue}>
                {format(new Date(record.administeredDate), 'MMMM d, yyyy')}
              </Text>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Administered By:</Text>
              <Text style={styles.detailValue}>
                {record.administeredBy.fullName} ({record.administeredBy.role})
              </Text>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Facility:</Text>
              <Text style={styles.detailValue}>
                {record.facility.name}, {record.facility.district}
              </Text>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Batch Number:</Text>
              <Text style={styles.detailValue}>
                {record.batchNumber || 'Not provided'}
              </Text>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Return Date:</Text>
              <Text style={[
                styles.detailValue,
                record.returnDate && styles.returnDate
              ]}>
                {record.returnDate
                  ? format(new Date(record.returnDate), 'MMMM d, yyyy')
                  : 'Not scheduled'}
              </Text>
            </View>
            
            {record.notes && (
              <View style={styles.notesContainer}>
                <Text style={styles.notesLabel}>Notes:</Text>
                <Text style={styles.notes}>{record.notes}</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </>
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
  deleteButton: {
    padding: 8,
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  vaccineInfo: {
    borderLeftWidth: 4,
    borderLeftColor: '#28a745',
    paddingLeft: 12,
  },
  vaccineName: {
    fontSize: 24,
    fontWeight:
