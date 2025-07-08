# FE-03: Implement Patient Management Screens

## Context
The Immunization Records Management System requires screens for managing patient data, including listing patients, viewing patient details, adding new patients, and editing existing patient information.

## Dependencies
- FE-01: Authentication flow implemented
- FE-02: Dashboard screen implemented

## Requirements
1. Create a patient list screen with search and filtering capabilities
2. Implement a patient details screen showing comprehensive patient information
3. Create forms for adding and editing patient information
4. Implement patient immunization history view
5. Add validation for patient data entry

## Code Example

### Patient List Screen

```typescript
// frontend/app/patients/index.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/auth';
import api from '../services/api';
import PatientCard from '../components/PatientCard';

type Patient = {
  id: number;
  fullName: string;
  sex: 'M' | 'F';
  dateOfBirth: string;
  district: string;
  contactPhone: string;
};

export default function PatientListScreen() {
  const { isAuthenticated } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const params = useLocalSearchParams();

  // Load patients on component mount
  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }

    loadPatients();
  }, [isAuthenticated]);

  // Apply search filter when query changes
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredPatients(patients);
    } else {
      const filtered = patients.filter(patient => 
        patient.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        patient.contactPhone.includes(searchQuery)
      );
      setFilteredPatients(filtered);
    }
  }, [searchQuery, patients]);

  const loadPatients = async (refresh = false) => {
    try {
      setIsLoading(true);
      const currentPage = refresh ? 1 : page;
      
      const response = await api.get('/patients', {
        params: {
          page: currentPage,
          limit: 20,
          ...params
        }
      });
      
      const newPatients = response.data.data;
      
      if (refresh) {
        setPatients(newPatients);
      } else {
        setPatients(prev => [...prev, ...newPatients]);
      }
      
      setHasMore(newPatients.length === 20);
      setPage(currentPage + 1);
    } catch (error) {
      console.error('Failed to load patients:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    setPage(1);
    loadPatients(true);
  };

  const handleLoadMore = () => {
    if (!isLoading && hasMore) {
      loadPatients();
    }
  };

  const renderFooter = () => {
    if (!isLoading) return null;
    
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#007bff" />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#6c757d" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search patients..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#6c757d" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/patients/new')}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {isLoading && patients.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007bff" />
          <Text style={styles.loadingText}>Loading patients...</Text>
        </View>
      ) : filteredPatients.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="people" size={64} color="#e9ecef" />
          <Text style={styles.emptyText}>No patients found</Text>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={handleRefresh}
          >
            <Text style={styles.refreshButtonText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredPatients}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <PatientCard
              patient={item}
              onPress={() => router.push(`/patients/${item.id}`)}
            />
          )}
          contentContainerStyle={styles.list}
          onRefresh={handleRefresh}
          refreshing={isLoading && page === 1}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderFooter}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    alignItems: 'center',
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#f1f3f5',
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  addButton: {
    marginLeft: 12,
    backgroundColor: '#007bff',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    color: '#6c757d',
    marginTop: 16,
    marginBottom: 24,
  },
  refreshButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  list: {
    padding: 16,
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});
```

### Patient Card Component

```typescript
// frontend/app/components/PatientCard.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format, differenceInYears } from 'date-fns';

type PatientCardProps = {
  patient: {
    id: number;
    fullName: string;
    sex: 'M' | 'F';
    dateOfBirth: string;
    district: string;
    contactPhone: string;
  };
  onPress: () => void;
};

export default function PatientCard({ patient, onPress }: PatientCardProps) {
  const birthDate = new Date(patient.dateOfBirth);
  const age = differenceInYears(new Date(), birthDate);
  const formattedBirthDate = format(birthDate, 'MMM d, yyyy');

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.content}>
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
        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Ionicons name="location-outline" size={16} color="#6c757d" />
            <Text style={styles.infoText}>{patient.district}</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="call-outline" size={16} color="#6c757d" />
            <Text style={styles.infoText}>{patient.contactPhone || 'No phone'}</Text>
          </View>
        </View>
      </View>
      <View style={styles.arrow}>
        <Ionicons name="chevron-forward" size={20} color="#6c757d" />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  content: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  infoText: {
    fontSize: 14,
    color: '#6c757d',
    marginLeft: 4,
  },
  arrow: {
    marginLeft: 8,
  },
});
```

### Patient Details Screen

```typescript
// frontend/app/patients/[id].tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format, differenceInYears } from 'date-fns';
import { useAuth } from '../context/auth';
import api from '../services/api';

type Patient = {
  id: number;
  fullName: string;
  sex: 'M' | 'F';
  dateOfBirth: string;
  motherName: string;
  fatherName: string;
  district: string;
  townVillage: string;
  address: string;
  contactPhone: string;
  healthWorkerName: string;
  healthWorkerPhone: string;
  facility: {
    id: number;
    name: string;
  };
};

type ImmunizationRecord = {
  id: number;
  administeredDate: string;
  vaccine: {
    id: number;
    name: string;
  };
  returnDate: string | null;
  batchNumber: string;
  administeredBy: {
    id: number;
    fullName: string;
  };
};

export default function PatientDetailsScreen() {
  const { isAuthenticated, user } = useAuth();
  const params = useLocalSearchParams();
  const patientId = params.id as string;
  
  const [patient, setPatient] = useState<Patient | null>(null);
  const [immunizations, setImmunizations] = useState<ImmunizationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }

    loadPatientData();
  }, [isAuthenticated, patientId]);

  const loadPatientData = async () => {
    try {
      setIsLoading(true);
      
      // Load patient details
      const patientResponse = await api.get(`/patients/${patientId}`);
      setPatient(patientResponse.data);
      
      // Load immunization records
      const immunizationsResponse = await api.get(`/patients/${patientId}/immunization-records`);
      setImmunizations(immunizationsResponse.data);
    } catch (error) {
      console.error('Failed to load patient data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Loading patient data...</Text>
      </View>
    );
  }

  if (!patient) {
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
          headerRight: () => (
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => router.push(`/patients/${patientId}/edit`)}
            >
              <Ionicons name="create-outline" size={24} color="#007bff" />
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.name}>{patient.fullName}</Text>
          <View style={styles.basicInfo}>
            <View style={styles.infoItem}>
              <Ionicons name={patient.sex === 'M' ? 'male' : 'female'} size={16} color="#6c757d" />
              <Text style={styles.infoText}>{patient.sex === 'M' ? 'Male' : 'Female'}</Text>
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
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Date of Birth:</Text>
              <Text style={styles.infoValue}>{formattedBirthDate}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Mother's Name:</Text>
              <Text style={styles.infoValue}>{patient.motherName || 'Not provided'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Father's Name:</Text>
              <Text style={styles.infoValue}>{patient.fatherName || 'Not provided'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>District:</Text>
              <Text style={styles.infoValue}>{patient.district}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Town/Village:</Text>
              <Text style={styles.infoValue}>{patient.townVillage || 'Not provided'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Address:</Text>
              <Text style={styles.infoValue}>{patient.address || 'Not provided'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Phone:</Text>
              <Text style={styles.infoValue}>{patient.contactPhone || 'Not provided'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Health Worker Information</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Name:</Text>
              <Text style={styles.infoValue}>{patient.healthWorkerName || 'Not assigned'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Phone:</Text>
              <Text style={styles.infoValue}>{patient.healthWorkerPhone || 'Not provided'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Facility:</Text>
              <Text style={styles.infoValue}>{patient.facility?.name || 'Not assigned'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Immunization History</Text>
            <TouchableOpacity
              style={styles.addImmunizationButton}
              onPress={() => router.push(`/immunizations/new?patientId=${patientId}`)}
            >
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.addImmunizationText}>Add</Text>
            </TouchableOpacity>
          </View>
          
          {immunizations.length === 0 ? (
            <View style={styles.emptyImmunizations}>
              <Ionicons name="medical-outline" size={48} color="#e9ecef" />
              <Text style={styles.emptyText}>No immunization records</Text>
            </View>
          ) : (
            <View style={styles.immunizationsList}>
              {immunizations.map((record) => (
                <TouchableOpacity
                  key={record.id}
                  style={styles.immunizationCard}
                  onPress={() => router.push(`/immunizations/${record.id}`)}
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
```

### Add Patient Screen

```typescript
// frontend/app/patients/new.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { useAuth } from '../context/auth';
import api from '../services/api';

export default function AddPatientScreen() {
  const { isAuthenticated } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    fullName: '',
    sex: 'M' as 'M' | 'F',
    dateOfBirth: new Date(),
    motherName: '',
    fatherName: '',
    district: '',
    townVillage: '',
    address: '',
    contactPhone: '',
    healthWorkerName: '',
    healthWorkerPhone: '',
  });

  // Form validation
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }
    
    if (!formData.district.trim()) {
      newErrors.district = 'District is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user types
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setFormData(prev => ({
        ...prev,
        dateOfBirth: selectedDate
      }));
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }
    
    try {
      setIsLoading(true);
      
      const payload = {
        ...formData,
        dateOfBirth: format(formData.dateOfBirth, 'yyyy-MM-dd'),
      };
      
      await api.post('/patients', payload);
      
      Alert.alert(
        'Success',
        'Patient added successfully',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      console.error('Failed to add patient:', error);
      Alert.alert('Error', 'Failed to add patient. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Add New Patient' }} />
      <ScrollView style={styles.container}>
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Full Name *</Text>
            <TextInput
              style={[styles.input, errors.fullName && styles.inputError]}
              value={formData.fullName}
              onChangeText={(value) => handleInputChange('fullName', value)}
              placeholder="Enter full name"
            />
            {errors.fullName && <Text style={styles.errorText}>{errors.fullName}</Text>}
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Sex *</Text>
            <View style={styles.radioGroup}>
              <TouchableOpacity
                style={[
                  styles.radioButton,
                  formData.sex === 'M' && styles.radioButtonSelected
