# FE-AW-04: Replace API Calls with Appwrite Database Operations

## Title
Replace API Calls with Appwrite Database Operations

## Priority
High

## Estimated Time
10-12 hours

## Dependencies
- FE-AW-01: Appwrite SDK integrated
- FE-AW-02: Offline storage implemented
- FE-AW-03: Authentication integration completed

## Description
Replace all existing axios-based API calls with Appwrite database operations, implementing comprehensive data services for patients, immunization records, notifications, facilities, and vaccines. This includes creating service layers with offline-first capabilities, implementing data validation, and ensuring seamless integration with the existing UI components.

The migration will provide improved performance, offline capabilities, and real-time data synchronization while maintaining all existing functionality.

## Acceptance Criteria
- [ ] Patient data service migrated to Appwrite operations
- [ ] Immunization records service updated with Appwrite
- [ ] Notifications service integrated with Appwrite
- [ ] Facilities service migrated to Appwrite
- [ ] Vaccines service updated with Appwrite operations
- [ ] Data validation and error handling implemented
- [ ] Offline-first operations functional
- [ ] Real-time data updates working
- [ ] Existing UI components updated to use new services
- [ ] Performance optimization completed

## Technical Notes

### Patient Data Service Migration

#### Updated Patients Service
```typescript
// frontend/services/patients.ts
import { ID, Query } from 'react-native-appwrite';
import { DatabaseService } from './database';
import { Patient } from '../types/appwrite';
import { ErrorHandler } from './errorHandler';
import { offlineStorage } from './offlineStorage';
import NetInfo from '@react-native-community/netinfo';

class PatientsService extends DatabaseService<Patient> {
  constructor() {
    super({
      databaseId: 'immune-me-db',
      collectionId: 'patients'
    });
  }

  // Create patient with offline support
  async createPatient(patientData: Omit<Patient, keyof Models.Document>): Promise<Patient> {
    try {
      const netInfo = await NetInfo.fetch();
      
      if (netInfo.isConnected) {
        // Online: Create directly in Appwrite
        const patient = await this.create(patientData);
        
        // Cache locally for offline access
        await offlineStorage.cachePatient(patient);
        
        return patient;
      } else {
        // Offline: Store in local database and sync queue
        const tempId = `temp_${Date.now()}`;
        const offlinePatient = {
          ...patientData,
          $id: tempId,
          $createdAt: new Date().toISOString(),
          $updatedAt: new Date().toISOString(),
          $permissions: [],
          $collectionId: 'patients',
          $databaseId: 'immune-me-db'
        } as Patient;

        // Store locally
        await offlineStorage.createPatient(offlinePatient);
        
        // Add to sync queue
        await offlineStorage.addToSyncQueue({
          id: tempId,
          type: 'create',
          collection: 'patients',
          data: patientData,
          timestamp: new Date().toISOString()
        });

        return offlinePatient;
      }
    } catch (error) {
      console.error('Failed to create patient:', error);
      throw error;
    }
  }

  // Get patients with offline fallback
  async getPatients(facilityId?: string, limit = 50, offset = 0): Promise<Patient[]> {
    try {
      const netInfo = await NetInfo.fetch();
      
      if (netInfo.isConnected) {
        // Online: Fetch from Appwrite
        const queries = [
          Query.limit(limit),
          Query.offset(offset),
          Query.orderDesc('$createdAt')
        ];

        if (facilityId) {
          queries.push(Query.equal('facilityId', facilityId));
        }

        const response = await this.list(queries);
        
        // Cache results locally
        await offlineStorage.cachePatients(response.documents);
        
        return response.documents;
      } else {
        // Offline: Get from local storage
        return await offlineStorage.getPatients(facilityId, limit, offset);
      }
    } catch (error) {
      console.error('Failed to get patients:', error);
      
      // Fallback to offline storage
      try {
        return await offlineStorage.getPatients(facilityId, limit, offset);
      } catch (offlineError) {
        console.error('Offline fallback failed:', offlineError);
        throw error;
      }
    }
  }

  // Update patient with conflict resolution
  async updatePatient(patientId: string, updates: Partial<Patient>): Promise<Patient> {
    try {
      const netInfo = await NetInfo.fetch();
      
      if (netInfo.isConnected) {
        // Online: Update in Appwrite with conflict resolution
        const updatedPatient = await ErrorHandler.withRetry(async () => {
          return await this.update(patientId, updates);
        });

        // Update local cache
        await offlineStorage.updatePatient(patientId, updatedPatient);
        
        return updatedPatient;
      } else {
        // Offline: Update locally and queue for sync
        const localPatient = await offlineStorage.getPatient(patientId);
        if (!localPatient) {
          throw new Error('Patient not found in offline storage');
        }

        const updatedPatient = { ...localPatient, ...updates, $updatedAt: new Date().toISOString() };
        
        // Update locally
        await offlineStorage.updatePatient(patientId, updatedPatient);
        
        // Add to sync queue
        await offlineStorage.addToSyncQueue({
          id: `update_${patientId}_${Date.now()}`,
          type: 'update',
          collection: 'patients',
          documentId: patientId,
          data: updates,
          timestamp: new Date().toISOString()
        });

        return updatedPatient;
      }
    } catch (error) {
      console.error('Failed to update patient:', error);
      throw error;
    }
  }

  // Search patients with offline support
  async searchPatients(searchTerm: string, facilityId?: string): Promise<Patient[]> {
    try {
      const netInfo = await NetInfo.fetch();
      
      if (netInfo.isConnected) {
        // Online: Use Appwrite search
        const queries = [
          Query.search('fullName', searchTerm),
          Query.limit(20)
        ];

        if (facilityId) {
          queries.push(Query.equal('facilityId', facilityId));
        }

        const response = await this.list(queries);
        return response.documents;
      } else {
        // Offline: Search in local storage
        return await offlineStorage.searchPatients(searchTerm, facilityId);
      }
    } catch (error) {
      console.error('Failed to search patients:', error);
      
      // Fallback to offline search
      try {
        return await offlineStorage.searchPatients(searchTerm, facilityId);
      } catch (offlineError) {
        console.error('Offline search failed:', offlineError);
        return [];
      }
    }
  }

  // Get patient by ID with offline support
  async getPatient(patientId: string): Promise<Patient | null> {
    try {
      const netInfo = await NetInfo.fetch();
      
      if (netInfo.isConnected) {
        // Online: Fetch from Appwrite
        const patient = await this.getById(patientId);
        
        // Cache locally
        await offlineStorage.cachePatient(patient);
        
        return patient;
      } else {
        // Offline: Get from local storage
        return await offlineStorage.getPatient(patientId);
      }
    } catch (error) {
      console.error('Failed to get patient:', error);
      
      // Fallback to offline storage
      try {
        return await offlineStorage.getPatient(patientId);
      } catch (offlineError) {
        console.error('Offline fallback failed:', offlineError);
        return null;
      }
    }
  }

  // Delete patient (soft delete)
  async deletePatient(patientId: string): Promise<void> {
    try {
      const netInfo = await NetInfo.fetch();
      
      if (netInfo.isConnected) {
        // Online: Delete from Appwrite
        await this.delete(patientId);
        
        // Remove from local cache
        await offlineStorage.deletePatient(patientId);
      } else {
        // Offline: Mark as deleted locally and queue for sync
        await offlineStorage.markPatientDeleted(patientId);
        
        // Add to sync queue
        await offlineStorage.addToSyncQueue({
          id: `delete_${patientId}_${Date.now()}`,
          type: 'delete',
          collection: 'patients',
          documentId: patientId,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Failed to delete patient:', error);
      throw error;
    }
  }

  // Subscribe to real-time patient updates
  subscribeToPatientUpdates(
    callback: (patient: Patient, eventType: string) => void,
    facilityId?: string
  ) {
    return this.subscribe((payload) => {
      const patient = payload.payload as Patient;
      
      // Filter by facility if specified
      if (facilityId && patient.facilityId !== facilityId) {
        return;
      }

      // Determine event type
      const eventType = payload.events[0]?.split('.').pop() || 'update';
      
      callback(patient, eventType);
    });
  }
}

export const patientsService = new PatientsService();
```

### Immunization Records Service

#### Updated Immunization Service
```typescript
// frontend/services/immunizations.ts
import { ID, Query } from 'react-native-appwrite';
import { DatabaseService } from './database';
import { ImmunizationRecord } from '../types/appwrite';
import { ErrorHandler } from './errorHandler';
import { offlineStorage } from './offlineStorage';
import NetInfo from '@react-native-community/netinfo';

class ImmunizationService extends DatabaseService<ImmunizationRecord> {
  constructor() {
    super({
      databaseId: 'immune-me-db',
      collectionId: 'immunization_records'
    });
  }

  // Create immunization record
  async createImmunizationRecord(
    recordData: Omit<ImmunizationRecord, keyof Models.Document>
  ): Promise<ImmunizationRecord> {
    try {
      const netInfo = await NetInfo.fetch();
      
      if (netInfo.isConnected) {
        const record = await this.create(recordData);
        await offlineStorage.cacheImmunizationRecord(record);
        return record;
      } else {
        const tempId = `temp_imm_${Date.now()}`;
        const offlineRecord = {
          ...recordData,
          $id: tempId,
          $createdAt: new Date().toISOString(),
          $updatedAt: new Date().toISOString(),
          $permissions: [],
          $collectionId: 'immunization_records',
          $databaseId: 'immune-me-db'
        } as ImmunizationRecord;

        await offlineStorage.createImmunizationRecord(offlineRecord);
        await offlineStorage.addToSyncQueue({
          id: tempId,
          type: 'create',
          collection: 'immunization_records',
          data: recordData,
          timestamp: new Date().toISOString()
        });

        return offlineRecord;
      }
    } catch (error) {
      console.error('Failed to create immunization record:', error);
      throw error;
    }
  }

  // Get immunization records for a patient
  async getPatientImmunizations(patientId: string): Promise<ImmunizationRecord[]> {
    try {
      const netInfo = await NetInfo.fetch();
      
      if (netInfo.isConnected) {
        const response = await this.list([
          Query.equal('patientId', patientId),
          Query.orderDesc('dateAdministered')
        ]);
        
        await offlineStorage.cacheImmunizationRecords(response.documents);
        return response.documents;
      } else {
        return await offlineStorage.getPatientImmunizations(patientId);
      }
    } catch (error) {
      console.error('Failed to get patient immunizations:', error);
      
      try {
        return await offlineStorage.getPatientImmunizations(patientId);
      } catch (offlineError) {
        console.error('Offline fallback failed:', offlineError);
        return [];
      }
    }
  }

  // Get immunizations by facility
  async getFacilityImmunizations(
    facilityId: string,
    startDate?: string,
    endDate?: string,
    limit = 100
  ): Promise<ImmunizationRecord[]> {
    try {
      const netInfo = await NetInfo.fetch();
      
      if (netInfo.isConnected) {
        const queries = [
          Query.equal('facilityId', facilityId),
          Query.limit(limit),
          Query.orderDesc('dateAdministered')
        ];

        if (startDate) {
          queries.push(Query.greaterThanEqual('dateAdministered', startDate));
        }
        if (endDate) {
          queries.push(Query.lessThanEqual('dateAdministered', endDate));
        }

        const response = await this.list(queries);
        await offlineStorage.cacheImmunizationRecords(response.documents);
        return response.documents;
      } else {
        return await offlineStorage.getFacilityImmunizations(facilityId, startDate, endDate, limit);
      }
    } catch (error) {
      console.error('Failed to get facility immunizations:', error);
      
      try {
        return await offlineStorage.getFacilityImmunizations(facilityId, startDate, endDate, limit);
      } catch (offlineError) {
        console.error('Offline fallback failed:', offlineError);
        return [];
      }
    }
  }

  // Update immunization record
  async updateImmunizationRecord(
    recordId: string,
    updates: Partial<ImmunizationRecord>
  ): Promise<ImmunizationRecord> {
    try {
      const netInfo = await NetInfo.fetch();
      
      if (netInfo.isConnected) {
        const updatedRecord = await this.update(recordId, updates);
        await offlineStorage.updateImmunizationRecord(recordId, updatedRecord);
        return updatedRecord;
      } else {
        const localRecord = await offlineStorage.getImmunizationRecord(recordId);
        if (!localRecord) {
          throw new Error('Immunization record not found in offline storage');
        }

        const updatedRecord = { 
          ...localRecord, 
          ...updates, 
          $updatedAt: new Date().toISOString() 
        };
        
        await offlineStorage.updateImmunizationRecord(recordId, updatedRecord);
        await offlineStorage.addToSyncQueue({
          id: `update_imm_${recordId}_${Date.now()}`,
          type: 'update',
          collection: 'immunization_records',
          documentId: recordId,
          data: updates,
          timestamp: new Date().toISOString()
        });

        return updatedRecord;
      }
    } catch (error) {
      console.error('Failed to update immunization record:', error);
      throw error;
    }
  }
}

export const immunizationService = new ImmunizationService();
```

### Notifications Service

#### Updated Notifications Service
```typescript
// frontend/services/notifications.ts
import { Query } from 'react-native-appwrite';
import { DatabaseService } from './database';
import { Notification } from '../types/appwrite';
import { offlineStorage } from './offlineStorage';
import NetInfo from '@react-native-community/netinfo';

class NotificationsService extends DatabaseService<Notification> {
  constructor() {
    super({
      databaseId: 'immune-me-db',
      collectionId: 'notifications'
    });
  }

  // Get notifications for a facility
  async getFacilityNotifications(
    facilityId: string,
    status?: 'pending' | 'viewed' | 'completed',
    limit = 50
  ): Promise<Notification[]> {
    try {
      const netInfo = await NetInfo.fetch();
      
      if (netInfo.isConnected) {
        const queries = [
          Query.equal('facilityId', facilityId),
          Query.limit(limit),
          Query.orderDesc('$createdAt')
        ];

        if (status) {
          queries.push(Query.equal('status', status));
        }

        const response = await this.list(queries);
        await offlineStorage.cacheNotifications(response.documents);
        return response.documents;
      } else {
        return await offlineStorage.getFacilityNotifications(facilityId, status, limit);
      }
    } catch (error) {
      console.error('Failed to get facility notifications:', error);
      
      try {
        return await offlineStorage.getFacilityNotifications(facilityId, status, limit);
      } catch (offlineError) {
        console.error('Offline fallback failed:', offlineError);
        return [];
      }
    }
  }

  // Get due notifications
  async getDueNotifications(facilityId?: string): Promise<Notification[]> {
    try {
      const netInfo = await NetInfo.fetch();
      
      if (netInfo.isConnected) {
        const queries = [
          Query.equal('type', 'due'),
          Query.equal('status', 'pending'),
          Query.lessThanEqual('dueDate', new Date().toISOString()),
          Query.orderAsc('dueDate')
        ];

        if (facilityId) {
          queries.push(Query.equal('facilityId', facilityId));
        }

        const response = await this.list(queries);
        return response.documents;
      } else {
        return await offlineStorage.getDueNotifications(facilityId);
      }
    } catch (error) {
      console.error('Failed to get due notifications:', error);
      
      try {
        return await offlineStorage.getDueNotifications(facilityId);
      } catch (offlineError) {
        console.error('Offline fallback failed:', offlineError);
        return [];
      }
    }
  }

  // Update notification status
  async updateNotificationStatus(
    notificationId: string,
    status: 'viewed' | 'completed'
  ): Promise<Notification> {
    try {
      const netInfo = await NetInfo.fetch();
      
      if (netInfo.isConnected) {
        const updatedNotification = await this.update(notificationId, { status });
        await offlineStorage.updateNotification(notificationId, updatedNotification);
        return updatedNotification;
      } else {
        const localNotification = await offlineStorage.getNotification(notificationId);
        if (!localNotification) {
          throw new Error('Notification not found in offline storage');
        }

        const updatedNotification = { 
          ...localNotification, 
          status, 
          $updatedAt: new Date().toISOString() 
        };
        
        await offlineStorage.updateNotification(notificationId, updatedNotification);
        await offlineStorage.addToSyncQueue({
          id: `update_notif_${notificationId}_${Date.now()}`,
          type: 'update',
          collection: 'notifications',
          documentId: notificationId,
          data: { status },
          timestamp: new Date().toISOString()
        });

        return updatedNotification;
      }
    } catch (error) {
      console.error('Failed to update notification status:', error);
      throw error;
    }
  }

  // Subscribe to notification updates
  subscribeToNotificationUpdates(
    facilityId: string,
    callback: (notification: Notification, eventType: string) => void
  ) {
    return this.subscribe((payload) => {
      const notification = payload.payload as Notification;
      
      // Filter by facility
      if (notification.facilityId !== facilityId) {
        return;
      }

      const eventType = payload.events[0]?.split('.').pop() || 'update';
      callback(notification, eventType);
    });
  }
}

export const notificationsService = new NotificationsService();
```

### UI Component Updates

#### Updated Patient Form Component
```typescript
// frontend/app/components/PatientForm.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Patient } from '../../types/appwrite';
import { patientsService } from '../../services/patients';
import { facilitiesService } from '../../services/facilities';
import { useAuth } from '../../context/auth';
import FormInput from './FormInput';
import FormSelect from './FormSelect';
import FormButton from './FormButton';

const patientSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  sex: z.enum(['M', 'F'], { required_error: 'Sex is required' }),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  motherName: z.string().optional(),
  fatherName: z.string().optional(),
  district: z.string().min(1, 'District is required'),
  townVillage: z.string().optional(),
  address: z.string().optional(),
  contactPhone: z.string().optional(),
  healthWorkerName: z.string().optional(),
  healthWorkerPhone: z.string().optional(),
  healthWorkerAddress: z.string().optional(),
});

type PatientFormData = z.infer<typeof patientSchema>;

interface PatientFormProps {
  patient?: Patient;
  onSave: (patient: Patient) => void;
  onCancel: () => void;
}

export default function PatientForm({ patient, onSave, onCancel }: PatientFormProps) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [facilities, setFacilities] = useState<any[]>([]);

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<PatientFormData>({
    resolver: zodResolver(patientSchema),
    defaultValues: patient ? {
      fullName: patient.fullName,
      sex: patient.sex,
      dateOfBirth: patient.dateOfBirth.split('T')[0], // Format for date input
      motherName: patient.motherName || '',
      fatherName: patient.fatherName || '',
      district: patient.district,
      townVillage: patient.townVillage || '',
      address: patient.address || '',
      contactPhone: patient.contactPhone || '',
      healthWorkerName: patient.healthWorkerName || '',
      healthWorkerPhone: patient.healthWorkerPhone || '',
      healthWorkerAddress: patient.healthWorkerAddress || '',
    } : {}
  });

  useEffect(() => {
    loadFacilities();
  }, []);

  const loadFacilities = async () => {
    try {
      const facilityList = await facilitiesService.getFacilities();
      setFacilities(facilityList);
    } catch (error) {
      console.error('Failed to load facilities:', error);
    }
  };

  const onSubmit = async (data: PatientFormData) => {
    try {
      setIsLoading(true);

      const patientData = {
        ...data,
        dateOfBirth: new Date(data.dateOfBirth).toISOString(),
        facilityId: user?.prefs?.facilityId || '',
        healthWorkerId: user?.$id || '',
      };

      let savedPatient: Patient;

      if (patient) {
        // Update existing patient
        savedPatient = await patientsService.updatePatient(patient.$id, patientData);
      } else {
        // Create new patient
        savedPatient = await patientsService.createPatient(patientData);
      }

      Alert.alert(
        'Success',
        `Patient ${patient ? 'updated' : 'created'} successfully`,
        [{ text: 'OK', onPress: () => onSave(savedPatient) }]
      );

    } catch (error) {
      console.error('Failed to save patient:', error);
      Alert.alert(
        'Error',
        `Failed to ${patient ? 'update' : 'create'} patient. Please try again.`
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        <Text style={styles.title}>
          {patient ? 'Edit Patient' : 'New Patient'}
        </Text>

        <Controller
          control={control}
          name="fullName"
          render={({ field: { onChange, onBlur, value } }) => (
            <FormInput
              label="Full Name *"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.fullName?.message}
              placeholder="Enter patient's full name"
            />
          )}
        />

        <Controller
          control={control}
          name="sex"
          render={({ field: { onChange, value } }) => (
            <FormSelect
              label="Sex *"
              value={value}
              onValueChange={onChange}
              options={[
                { label: 'Male', value: 'M' },
                { label: 'Female', value: 'F' }
              ]}
              error={errors.sex?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="dateOfBirth"
          render={({ field: { onChange, onBlur, value } }) => (
            <FormInput
              label="Date of Birth *"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.dateOfBirth?.message}
              placeholder="YYYY-MM-DD"
              keyboardType="numeric"
            />
          )}
        />

        <Controller
          control={control}
          name="district"
          render={({ field: { onChange, onBlur, value } }) => (
            <FormInput
              label="District *"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.district?.message}
              placeholder="Enter district"
            />
          )}
        />

        <Controller
          control={control}
          name="motherName"
          render={({ field: { onChange, onBlur, value } }) => (
            <FormInput
              label="Mother's Name"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder="Enter mother's name"
            />
          )}
        />

        <Controller
          control={control}
          name="fatherName"
          render={({ field: { onChange, onBlur, value } }) => (
            <FormInput
              label="Father's Name"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder="Enter father's name"
            />
          )}
        />

        <Controller
          control={control}
          name="contactPhone"
          render={({ field: { onChange, onBlur, value } }) => (
            <FormInput
              label="Contact Phone"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder="Enter phone number"
              keyboardType="phone-pad"
            />
          )}
        />

        <View style={styles.buttonContainer}>
          <FormButton
            title="Cancel"
            onPress={onCancel}
            variant="secondary"
            disabled={isLoading}
          />
          <FormButton
            title={patient ? 'Update' : 'Create'}
            onPress={handleSubmit(onSubmit)}
            variant="primary"
            loading={isLoading}
          />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  form: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 12,
  },
});
```

## Files to Create/Modify
- `frontend/services/patients.ts` - Updated patient service with Appwrite
- `frontend/services/immunizations.ts` - Immunization records service
- `frontend/services/notifications.ts` - Notifications service
- `frontend/services/facilities.ts` - Facilities service
- `frontend/services/vaccines.ts` - Vaccines service
- `frontend/services/offlineStorage.ts` - Offline storage service
- `frontend/app/components/PatientForm.tsx` - Updated patient form
- `frontend/app/components/ImmunizationForm.tsx` - Updated immunization form
- `frontend/hooks/usePatients.ts` - Patient data hook
- `frontend/hooks/useImmunizations.ts` - Immunization data hook

## Testing Requirements

### Service Migration Testing
1. **CRUD Operations Test**
   ```typescript
   describe('Patients Service', () => {
     it('should create patient with Appwrite', async () => {
       const patientData = {
         fullName: 'Test Patient',
         sex: 'M' as const,
         dateOfBirth: '2020-01-01T00:00:00.000Z',
         district: 'Test District',
         facilityId: 'test-facility-id'
       };

       const patient = await patientsService.createPatient(patientData);
       expect(patient.$id).toBeDefined();
       expect(patient.fullName).toBe('Test Patient');
     });
   });
   ```

2. **Offline Functionality Test**
   ```typescript
   describe('Offline Operations', () => {
     it('should work offline', async () => {
       // Mock offline state
       NetInfo.fetch.mockResolvedValue({ isConnected: false });

       const patientData = {
         fullName: 'Offline Patient',
         sex: 'F' as const,
         dateOfBirth: '2020-01-01T00:00:00.000Z',
         district: 'Test District',
         facilityId: 'test-facility-id'
       };

       const patient = await patientsService.createPatient(patientData);
       expect(patient.$id).toContain('temp_');
     });
   });
   ```

### UI Integration Testing
1. **Form Submission Test**
   ```typescript
   describe('Patient Form', () => {
     it('should submit form with new service', async () => {
       const mockOnSave = jest.fn();
       
       const { getByText, getByPlaceholderText } = render(
         <PatientForm onSave={mockOnS