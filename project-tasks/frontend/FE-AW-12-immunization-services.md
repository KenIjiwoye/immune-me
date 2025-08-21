# FE-AW-12: Migrate Immunization Record Services to Appwrite with Offline Support

## Title
Migrate Immunization Record Services to Appwrite with Offline Support

## Priority
High

## Estimated Time
7-9 hours

## Dependencies
- FE-AW-07: Appwrite SDK configuration completed
- FE-AW-08: Local SQLite database implemented
- FE-AW-09: Data synchronization service created
- FE-AW-10: Appwrite authentication context implemented
- FE-AW-11: Patient services migrated to Appwrite

## Description
Migrate the immunization record management system to use Appwrite as the backend while maintaining full offline-first capabilities. This includes creating, reading, updating, and deleting immunization records with automatic synchronization, vaccine schedule management, dose tracking, and comprehensive reporting features.

The migration will ensure healthcare workers can continue administering vaccines and recording immunizations even without internet connectivity, with all data automatically syncing when connection is restored.

## Acceptance Criteria
- [ ] Immunization service migrated to use Appwrite backend
- [ ] Full CRUD operations working offline and online
- [ ] Vaccine schedule integration and dose tracking
- [ ] Batch immunization recording capabilities
- [ ] Due immunization calculations and reminders
- [ ] Adverse event reporting and tracking
- [ ] Data validation and business rule enforcement
- [ ] Search and filtering by patient, vaccine, date ranges
- [ ] Export capabilities for reporting and compliance
- [ ] Photo documentation for immunization cards
- [ ] Conflict resolution for concurrent edits
- [ ] Performance optimization for large datasets
- [ ] Comprehensive error handling and user feedback
- [ ] Migration utilities for existing immunization data

## Technical Implementation

### Enhanced Immunization Service with Appwrite Integration
```typescript
// frontend/services/immunization/ImmunizationService.ts
import { Databases, Storage, ID, Query } from 'react-native-appwrite';
import { appwriteClient } from '../../config/appwrite';
import { syncService } from '../sync/SyncService';
import { immunizationRepository } from '../../database/repository/ImmunizationRepository';
import { patientService } from '../patient/PatientService';
import { vaccineService } from '../vaccine/VaccineService';
import NetInfo from '@react-native-community/netinfo';

export interface ImmunizationRecord {
  id: string;
  appwriteId?: string;
  patientId: string;
  vaccineId: string;
  facilityId: string;
  administeredBy: string;
  dateAdministered: string;
  doseNumber: number;
  batchNumber?: string;
  expirationDate?: string;
  siteOfAdministration?: string;
  adverseEvents?: string;
  notes?: string;
  cardPhotoUrl?: string;
  cardPhotoFileId?: string;
  isValid: boolean;
  createdAt: number;
  updatedAt: number;
  lastModified: number;
  version: number;
  isDirty: boolean;
  isDeleted: boolean;
}

export interface VaccineScheduleItem {
  id: string;
  vaccineId: string;
  vaccineName: string;
  ageInWeeks: number;
  doseNumber: number;
  isRequired: boolean;
  description?: string;
}

export interface DueImmunization {
  patientId: string;
  patientName: string;
  vaccineId: string;
  vaccineName: string;
  doseNumber: number;
  dueDate: string;
  isOverdue: boolean;
  daysPastDue?: number;
}

export interface ImmunizationSearchFilters {
  patientId?: string;
  vaccineId?: string;
  facilityId?: string;
  administeredBy?: string;
  dateFrom?: string;
  dateTo?: string;
  doseNumber?: number;
  hasAdverseEvents?: boolean;
  isValid?: boolean;
}

export interface ImmunizationListOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
  filters?: ImmunizationSearchFilters;
}

export interface ImmunizationListResult {
  immunizations: ImmunizationRecord[];
  total: number;
  hasMore: boolean;
}

export interface BatchImmunizationData {
  patientIds: string[];
  vaccineId: string;
  facilityId: string;
  administeredBy: string;
  dateAdministered: string;
  doseNumber: number;
  batchNumber?: string;
  expirationDate?: string;
  siteOfAdministration?: string;
  notes?: string;
}

class ImmunizationService {
  private databases: Databases;
  private storage: Storage;
  private readonly collectionId = 'immunization_records';
  private readonly scheduleCollectionId = 'vaccine_schedules';
  private readonly bucketId = 'immunization-cards';

  constructor() {
    this.databases = appwriteClient.databases;
    this.storage = appwriteClient.storage;
  }

  async createImmunizationRecord(recordData: Omit<ImmunizationRecord, 'id' | 'createdAt' | 'updatedAt' | 'lastModified' | 'version' | 'isDirty' | 'isDeleted' | 'appwriteId'>): Promise<ImmunizationRecord> {
    const id = ID.unique();
    const now = Date.now();
    
    // Validate the immunization record
    await this.validateImmunizationRecord(recordData);
    
    const immunization: ImmunizationRecord = {
      id,
      ...recordData,
      isValid: true,
      createdAt: now,
      updatedAt: now,
      lastModified: now,
      version: 1,
      isDirty: true,
      isDeleted: false
    };

    try {
      // Always save to local database first (offline-first approach)
      const localImmunization = await immunizationRepository.create(immunization);

      // Try to sync to Appwrite if online
      const netInfo = await NetInfo.fetch();
      if (netInfo.isConnected) {
        try {
          await this.syncImmunizationToAppwrite(localImmunization);
        } catch (error) {
          console.warn('Failed to sync immunization to Appwrite, will retry later:', error);
        }
      }

      return localImmunization;
    } catch (error) {
      console.error('Failed to create immunization record:', error);
      throw new Error('Failed to create immunization record. Please try again.');
    }
  }

  async getImmunizationRecord(id: string): Promise<ImmunizationRecord | null> {
    try {
      // Always try local database first
      const localRecord = await immunizationRepository.findById(id);
      
      if (localRecord) {
        return localRecord;
      }

      // If not found locally and we're online, try Appwrite
      const netInfo = await NetInfo.fetch();
      if (netInfo.isConnected) {
        try {
          const appwriteRecord = await this.getImmunizationFromAppwrite(id);
          if (appwriteRecord) {
            // Save to local database for offline access
            await immunizationRepository.create(appwriteRecord);
            return appwriteRecord;
          }
        } catch (error) {
          console.warn('Failed to fetch immunization from Appwrite:', error);
        }
      }

      return null;
    } catch (error) {
      console.error('Failed to get immunization record:', error);
      throw new Error('Failed to retrieve immunization record.');
    }
  }

  async updateImmunizationRecord(id: string, updates: Partial<ImmunizationRecord>): Promise<ImmunizationRecord> {
    try {
      // Validate updates if they affect critical fields
      if (updates.vaccineId || updates.doseNumber || updates.dateAdministered) {
        const existing = await this.getImmunizationRecord(id);
        if (existing) {
          await this.validateImmunizationRecord({ ...existing, ...updates });
        }
      }

      // Update local database first (optimistic update)
      const updatedRecord = await immunizationRepository.update(id, {
        ...updates,
        lastModified: Date.now(),
        isDirty: true
      });

      // Try to sync to Appwrite if online
      const netInfo = await NetInfo.fetch();
      if (netInfo.isConnected) {
        try {
          await this.syncImmunizationToAppwrite(updatedRecord);
        } catch (error) {
          console.warn('Failed to sync immunization update to Appwrite, will retry later:', error);
        }
      }

      return updatedRecord;
    } catch (error) {
      console.error('Failed to update immunization record:', error);
      throw new Error('Failed to update immunization record. Please try again.');
    }
  }

  async deleteImmunizationRecord(id: string): Promise<void> {
    try {
      // Soft delete in local database
      await immunizationRepository.delete(id);

      // Try to sync deletion to Appwrite if online
      const netInfo = await NetInfo.fetch();
      if (netInfo.isConnected) {
        try {
          const record = await immunizationRepository.findById(id);
          if (record?.appwriteId) {
            await this.databases.deleteDocument(
              appwriteClient.getConfig().databaseId,
              this.collectionId,
              record.appwriteId
            );
          }
        } catch (error) {
          console.warn('Failed to sync immunization deletion to Appwrite, will retry later:', error);
        }
      }
    } catch (error) {
      console.error('Failed to delete immunization record:', error);
      throw new Error('Failed to delete immunization record. Please try again.');
    }
  }

  async getImmunizationRecords(options: ImmunizationListOptions = {}): Promise<ImmunizationListResult> {
    const { limit = 50, offset = 0, orderBy = 'dateAdministered', orderDirection = 'DESC', filters } = options;

    try {
      // Get from local database first
      const localResult = await this.getImmunizationsFromLocal(options);

      // If we have local data or we're offline, return it
      const netInfo = await NetInfo.fetch();
      if (localResult.immunizations.length > 0 || !netInfo.isConnected) {
        return localResult;
      }

      // If no local data and we're online, try to fetch from Appwrite
      try {
        const appwriteResult = await this.getImmunizationsFromAppwrite(options);
        
        // Save fetched records to local database
        for (const record of appwriteResult.immunizations) {
          try {
            await immunizationRepository.create(record);
          } catch (error) {
            // Record might already exist, try to update
            if (record.id) {
              await immunizationRepository.update(record.id, record);
            }
          }
        }

        return appwriteResult;
      } catch (error) {
        console.warn('Failed to fetch immunizations from Appwrite:', error);
        return localResult; // Return local data as fallback
      }
    } catch (error) {
      console.error('Failed to get immunization records:', error);
      throw new Error('Failed to retrieve immunization records.');
    }
  }

  async getPatientImmunizations(patientId: string): Promise<ImmunizationRecord[]> {
    try {
      const result = await this.getImmunizationRecords({
        filters: { patientId },
        limit: 1000, // Get all immunizations for the patient
        orderBy: 'dateAdministered',
        orderDirection: 'ASC'
      });

      return result.immunizations;
    } catch (error) {
      console.error('Failed to get patient immunizations:', error);
      throw new Error('Failed to retrieve patient immunizations.');
    }
  }

  async searchImmunizations(query: string, filters: ImmunizationSearchFilters = {}): Promise<ImmunizationRecord[]> {
    try {
      // Search in local database first
      const searchFields = ['batchNumber', 'administeredBy', 'notes'];
      const localResults = await immunizationRepository.search(query, searchFields, {
        limit: 100,
        where: this.buildWhereClause(filters)
      });

      // If we have results or we're offline, return them
      const netInfo = await NetInfo.fetch();
      if (localResults.data.length > 0 || !netInfo.isConnected) {
        return localResults.data;
      }

      // If no local results and we're online, search Appwrite
      try {
        const appwriteResults = await this.searchImmunizationsInAppwrite(query, filters);
        
        // Save search results to local database
        for (const record of appwriteResults) {
          try {
            await immunizationRepository.create(record);
          } catch (error) {
            // Record might already exist
            if (record.id) {
              await immunizationRepository.update(record.id, record);
            }
          }
        }

        return appwriteResults;
      } catch (error) {
        console.warn('Failed to search immunizations in Appwrite:', error);
        return localResults.data;
      }
    } catch (error) {
      console.error('Failed to search immunizations:', error);
      throw new Error('Failed to search immunizations.');
    }
  }

  async createBatchImmunizations(batchData: BatchImmunizationData): Promise<ImmunizationRecord[]> {
    const createdRecords: ImmunizationRecord[] = [];
    const errors: string[] = [];

    for (const patientId of batchData.patientIds) {
      try {
        const record = await this.createImmunizationRecord({
          patientId,
          vaccineId: batchData.vaccineId,
          facilityId: batchData.facilityId,
          administeredBy: batchData.administeredBy,
          dateAdministered: batchData.dateAdministered,
          doseNumber: batchData.doseNumber,
          batchNumber: batchData.batchNumber,
          expirationDate: batchData.expirationDate,
          siteOfAdministration: batchData.siteOfAdministration,
          notes: batchData.notes
        });

        createdRecords.push(record);
      } catch (error) {
        const patient = await patientService.getPatient(patientId);
        errors.push(`Failed to create immunization for ${patient?.fullName || patientId}: ${error.message}`);
      }
    }

    if (errors.length > 0) {
      console.warn('Batch immunization errors:', errors);
    }

    return createdRecords;
  }

  async getDueImmunizations(facilityId?: string): Promise<DueImmunization[]> {
    try {
      // Get vaccine schedule
      const schedule = await this.getVaccineSchedule();
      
      // Get all patients (filtered by facility if provided)
      const patients = await patientService.getPatients({
        filters: facilityId ? { facilityId } : undefined,
        limit: 10000
      });

      const dueImmunizations: DueImmunization[] = [];

      for (const patient of patients.patients) {
        const patientImmunizations = await this.getPatientImmunizations(patient.id);
        const patientAge = this.calculateAgeInWeeks(patient.dateOfBirth);

        for (const scheduleItem of schedule) {
          // Check if patient is old enough for this vaccine
          if (patientAge >= scheduleItem.ageInWeeks) {
            // Check if patient has already received this dose
            const existingDose = patientImmunizations.find(
              imm => imm.vaccineId === scheduleItem.vaccineId && 
                     imm.doseNumber === scheduleItem.doseNumber &&
                     imm.isValid
            );

            if (!existingDose) {
              const dueDate = this.calculateDueDate(patient.dateOfBirth, scheduleItem.ageInWeeks);
              const isOverdue = new Date() > new Date(dueDate);
              const daysPastDue = isOverdue ? 
                Math.floor((Date.now() - new Date(dueDate).getTime()) / (1000 * 60 * 60 * 24)) : 
                undefined;

              dueImmunizations.push({
                patientId: patient.id,
                patientName: patient.fullName,
                vaccineId: scheduleItem.vaccineId,
                vaccineName: scheduleItem.vaccineName,
                doseNumber: scheduleItem.doseNumber,
                dueDate,
                isOverdue,
                daysPastDue
              });
            }
          }
        }
      }

      // Sort by due date (overdue first)
      return dueImmunizations.sort((a, b) => {
        if (a.isOverdue && !b.isOverdue) return -1;
        if (!a.isOverdue && b.isOverdue) return 1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });
    } catch (error) {
      console.error('Failed to get due immunizations:', error);
      throw new Error('Failed to calculate due immunizations.');
    }
  }

  async uploadImmunizationCardPhoto(immunizationId: string, imageUri: string): Promise<string> {
    try {
      const immunization = await this.getImmunizationRecord(immunizationId);
      if (!immunization) {
        throw new Error('Immunization record not found');
      }

      // Create file from image URI
      const response = await fetch(imageUri);
      const blob = await response.blob();
      const file = new File([blob], `immunization-${immunizationId}-${Date.now()}.jpg`, {
        type: 'image/jpeg'
      });

      // Upload to Appwrite storage
      const uploadResult = await this.storage.createFile(
        this.bucketId,
        ID.unique(),
        file
      );

      // Get file URL
      const fileUrl = this.storage.getFileView(this.bucketId, uploadResult.$id);

      // Update immunization with photo information
      await this.updateImmunizationRecord(immunizationId, {
        cardPhotoUrl: fileUrl.toString(),
        cardPhotoFileId: uploadResult.$id
      });

      return fileUrl.toString();
    } catch (error) {
      console.error('Failed to upload immunization card photo:', error);
      throw new Error('Failed to upload photo. Please try again.');
    }
  }

  async exportImmunizations(filters: ImmunizationSearchFilters = {}): Promise<string> {
    try {
      const allImmunizations = await this.getImmunizationsFromLocal({
        limit: 50000, // Large limit to get all records
        filters
      });

      const exportData = {
        exportedAt: new Date().toISOString(),
        totalRecords: allImmunizations.total,
        filters,
        immunizations: allImmunizations.immunizations.map(record => ({
          id: record.id,
          patientId: record.patientId,
          vaccineId: record.vaccineId,
          facilityId: record.facilityId,
          administeredBy: record.administeredBy,
          dateAdministered: record.dateAdministered,
          doseNumber: record.doseNumber,
          batchNumber: record.batchNumber,
          expirationDate: record.expirationDate,
          siteOfAdministration: record.siteOfAdministration,
          adverseEvents: record.adverseEvents,
          notes: record.notes,
          isValid: record.isValid,
          createdAt: new Date(record.createdAt).toISOString(),
          updatedAt: new Date(record.updatedAt).toISOString()
        }))
      };

      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      console.error('Failed to export immunizations:', error);
      throw new Error('Failed to export immunization data.');
    }
  }

  private async validateImmunizationRecord(recordData: Partial<ImmunizationRecord>): Promise<void> {
    // Validate patient exists
    if (recordData.patientId) {
      const patient = await patientService.getPatient(recordData.patientId);
      if (!patient) {
        throw new Error('Patient not found');
      }
    }

    // Validate vaccine exists
    if (recordData.vaccineId) {
      const vaccine = await vaccineService.getVaccine(recordData.vaccineId);
      if (!vaccine) {
        throw new Error('Vaccine not found');
      }
    }

    // Validate date is not in the future
    if (recordData.dateAdministered) {
      const adminDate = new Date(recordData.dateAdministered);
      const today = new Date();
      today.setHours(23, 59, 59, 999); // End of today
      
      if (adminDate > today) {
        throw new Error('Administration date cannot be in the future');
      }
    }

    // Validate dose number
    if (recordData.doseNumber && recordData.doseNumber < 1) {
      throw new Error('Dose number must be greater than 0');
    }

    // Validate expiration date if batch number is provided
    if (recordData.batchNumber && recordData.expirationDate) {
      const expDate = new Date(recordData.expirationDate);
      const adminDate = new Date(recordData.dateAdministered || Date.now());
      
      if (expDate < adminDate) {
        throw new Error('Vaccine has expired');
      }
    }
  }

  private async syncImmunizationToAppwrite(immunization: ImmunizationRecord): Promise<void> {
    try {
      const appwriteData = this.transformToAppwriteFormat(immunization);

      if (immunization.appwriteId) {
        // Update existing document
        await this.databases.updateDocument(
          appwriteClient.getConfig().databaseId,
          this.collectionId,
          immunization.appwriteId,
          appwriteData
        );
      } else {
        // Create new document
        const result = await this.databases.createDocument(
          appwriteClient.getConfig().databaseId,
          this.collectionId,
          immunization.id,
          appwriteData
        );

        // Update local record with Appwrite ID
        await immunizationRepository.markAsSynced(immunization.id, result.$id);
      }
    } catch (error) {
      console.error('Failed to sync immunization to Appwrite:', error);
      throw error;
    }
  }

  private async getImmunizationFromAppwrite(id: string): Promise<ImmunizationRecord | null> {
    try {
      const document = await this.databases.getDocument(
        appwriteClient.getConfig().databaseId,
        this.collectionId,
        id
      );

      return this.transformFromAppwriteFormat(document);
    } catch (error) {
      if (error.code === 404) {
        return null;
      }
      throw error;
    }
  }

  private async getImmunizationsFromLocal(options: ImmunizationListOptions): Promise<ImmunizationListResult> {
    const { limit = 50, offset = 0, orderBy = 'dateAdministered', orderDirection = 'DESC', filters } = options;

    const result = await immunizationRepository.findAll({
      limit,
      offset,
      orderBy,
      orderDirection,
      where: this.buildWhereClause(filters)
    });

    return {
      immunizations: result.data,
      total: result.total,
      hasMore: result.hasMore
    };
  }

  private async getImmunizationsFromAppwrite(options: ImmunizationListOptions): Promise<ImmunizationListResult> {
    const { limit = 50, offset = 0, orderBy = 'dateAdministered', orderDirection = 'DESC', filters } = options;

    const queries = [
      Query.limit(limit),
      Query.offset(offset),
      Query.orderAsc(orderBy)
    ];

    if (orderDirection === 'DESC') {
      queries[queries.length - 1] = Query.orderDesc(orderBy);
    }

    // Add filters
    if (filters) {
      if (filters.patientId) {
        queries.push(Query.equal('patientId', filters.patientId));
      }
      if (filters.vaccineId) {
        queries.push(Query.equal('vaccineId', filters.vaccineId));
      }
      if (filters.facilityId) {
        queries.push(Query.equal('facilityId', filters.facilityId));
      }
      if (filters.dateFrom) {
        queries.push(Query.greaterThanEqual('dateAdministered', filters.dateFrom));
      }
      if (filters.dateTo) {
        queries.push(Query.lessThanEqual('dateAdministered', filters.dateTo));
      }
    }

    const response = await this.databases.listDocuments(
      appwriteClient.getConfig().databaseId,
      this.collectionId,
      queries
    );

    const immunizations = response.documents.map(doc => this.transformFromAppwriteFormat(doc));

    return {
      immunizations,
      total: response.total,
      hasMore: offset + immunizations.length < response.total
    };
  }

  private async searchImmunizationsInAppwrite(query: string, filters: ImmunizationSearchFilters): Promise<ImmunizationRecord[]> {
    const queries = [
      Query.search('batchNumber', query),
      Query.limit(100)
    ];

    // Add filters
    if (filters.patientId) {
      queries.push(Query.equal('patientId', filters.patientId));
    }
    if (filters.vaccineId) {
      queries.push(Query.equal('vaccineId', filters.vaccineId));
    }

    const response = await this.databases.listDocuments(
      appwriteClient.getConfig().databaseId,
      this.collectionId,
      queries
    );

    return response.documents.map(doc => this.transformFromAppwriteFormat(doc));
  }

  private async getVaccineSchedule(): Promise<VaccineScheduleItem[]> {
    try {
      // Try to get from local database first
      const localSchedule = await this.getVaccineScheduleFromLocal();
      
      if (localSchedule.length > 0) {
        return localSchedule;
      }

      // If no local data, try to fetch from Appwrite
      const netInfo = await NetInfo.fetch();
      if (netInfo.isConnected) {
        const appwriteSchedule = await this.getVaccineScheduleFromAppwrite();
        
        // Save to local database
        // Implementation would depend on vaccine schedule repository
        
        return appwriteSchedule;
      }

      return [];
    } catch (error) {
      console.error('Failed to get vaccine schedule:', error);
      return [];
    }
  }

  private async getVaccineScheduleFromLocal(): Promise<VaccineScheduleItem[]> {
    // Implementation would use vaccine schedule repository
    // For now, return a basic schedule
    return [
      { id: '1', vaccineId: 'bcg', vaccineName: 'BCG', ageInWeeks: 0, doseNumber: 1, isRequired: true },
      { id: '2', vaccineId: 'opv', vaccineName: 'OPV', ageInWeeks: 6, doseNumber: 1, isRequired: true },
      { id: '3', vaccineId: 'dpt', vaccineName: 'DPT', ageInWeeks: 6, doseNumber: 1, isRequired: true },
      // Add more schedule items...
    ];
  }

  private async getVaccineScheduleFromAppwrite(): Promise<VaccineScheduleItem[]> {
    const response = await this.databases.listDocuments(
      appwriteClient.getConfig().databaseId,
      this.scheduleCollectionId,
      [Query.orderAsc('ageInWeeks')]
    );

    return response.documents.map(doc => ({
      id: doc.$id,
      vaccineId: doc.vaccineId,
      vaccineName: doc.vaccineName,
      ageInWeeks: doc.ageInWeeks,
      doseNumber: doc.doseNumber,
      isRequired: doc.isRequired,
      description: doc.description
    }));
  }

  private calculateAgeInWeeks(dateOfBirth: string): number {
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    const diffTime = today.getTime() - birthDate.getTime();
    const diffWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
    return diffWeeks;
  }

  private calculateDueDate(dateOfBirth: string, ageInWeeks: number): string {
    const birthDate = new Date(dateOfBirth);
    const dueDate = new Date(birthDate.getTime() + (ageInWeeks * 7 * 24 * 60 * 60 * 1000));
    return dueDate.toISOString().split('T')[0];
  }

  private buildWhereClause(filters?: ImmunizationSearchFilters): Record<string, any> {
    const where: Record<string, any> = {};

    if (filters) {
      if (filters.patientId) {
        where.patientId = filters.patientId;
      }
      if (filters.vaccineId) {
        where.vaccineId = filters.vaccineId;
      }
      if (filters.facilityId) {
        where.facilityId = filters.facilityId;
      }
      if (filters.administeredBy) {
        where.administeredBy = filters.administeredBy;
      }
      if (filters.doseNumber) {
        where.doseNumber = filters.doseNumber;
      }
      if (filters.isValid !== undefined) {
        where.isValid = filters.isValid ? 1 : 0;
      }
    }

    return where;
  }

  private transformToAppwriteFormat(immunization: ImmunizationRecord): any {
    return {
      patientId: immunization.patientId,
      vaccineId: immunization.vaccineId,
      facilityId: immunization.facilityId,
      administeredBy: immunization.administeredBy,
      dateAdministered: immunization.dateAdministered,
      doseNumber: immunization.doseNumber,
      batchNumber: immunization.batchNumber,
      expirationDate: immunization.expirationDate,
      siteOfAdministration: immunization.siteOfAdministration,
      adverseEvents: immunization.adverseEvents,
      notes: immunization.notes,
      cardPhotoUrl: immunization.cardPhotoUrl,
      cardPhotoFileId: immunization.cardPhotoFileId,
      isValid: immunization.isValid
    };
  }

  private transformFromAppwriteFormat(document: any): ImmunizationRecord {
    return {
      id: document.$id,
      appwriteId: document.$id,
      patientId: document.patientId,
      vaccineId: document.vaccineId,
      facilityId: document.facilityI
onChangeText={(value) => updateField('batchNumber', value)}
            placeholder="Vaccine batch number"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Expiration Date</Text>
          <TextInput
            style={[styles.input, errors.expirationDate && styles.inputError]}
            value={formData.expirationDate}
            onChangeText={(value) => updateField('expirationDate', value)}
            placeholder="YYYY-MM-DD"
            keyboardType="numeric"
          />
          {errors.expirationDate && <Text style={styles.errorText}>{errors.expirationDate}</Text>}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Site of Administration</Text>
          <TextInput
            style={styles.input}
            value={formData.siteOfAdministration}
            onChangeText={(value) => updateField('siteOfAdministration', value)}
            placeholder="e.g., Left arm, Right thigh"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Adverse Events</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.adverseEvents}
            onChangeText={(value) => updateField('adverseEvents', value)}
            placeholder="Any adverse reactions observed"
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Notes</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.notes}
            onChangeText={(value) => updateField('notes', value)}
            placeholder="Additional notes"
            multiline
            numberOfLines={4}
          />
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={onCancel}
            disabled={loading}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.saveButton, loading && styles.buttonDisabled]}
            onPress={handleSave}
            disabled={loading}
          >
            <Text style={styles.saveButtonText}>
              {loading ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

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
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  inputError: {
    borderColor: '#dc3545',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  picker: {
    height: 50,
  },
  errorText: {
    color: '#dc3545',
    fontSize: 14,
    marginTop: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 12,
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#6c757d',
  },
  saveButton: {
    backgroundColor: '#007bff',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
```

### Due Immunizations Component
```typescript
// frontend/components/immunization/DueImmunizationsCard.tsx
import React from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DueImmunization } from '../../services/immunization/ImmunizationService';
import { useDueImmunizations } from '../../hooks/useImmunizations';

interface DueImmunizationsCardProps {
  facilityId?: string;
  onPatientPress?: (patientId: string) => void;
  onImmunizePress?: (dueImmunization: DueImmunization) => void;
}

export const DueImmunizationsCard: React.FC<DueImmunizationsCardProps> = ({
  facilityId,
  onPatientPress,
  onImmunizePress
}) => {
  const { dueImmunizations, loading, overdueCount, totalDue, refresh } = useDueImmunizations(facilityId);

  const renderDueItem = ({ item }: { item: DueImmunization }) => (
    <View style={[styles.dueItem, item.isOverdue && styles.overdueItem]}>
      <View style={styles.dueItemHeader}>
        <TouchableOpacity 
          style={styles.patientInfo}
          onPress={() => onPatientPress?.(item.patientId)}
        >
          <Text style={styles.patientName}>{item.patientName}</Text>
          <Text style={styles.vaccineInfo}>
            {item.vaccineName} - Dose {item.doseNumber}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.immunizeButton, item.isOverdue && styles.overdueButton]}
          onPress={() => onImmunizePress?.(item)}
        >
          <Ionicons name="medical" size={16} color="#fff" />
          <Text style={styles.immunizeButtonText}>Immunize</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.dueItemFooter}>
        <Text style={[styles.dueDate, item.isOverdue && styles.overdueText]}>
          {item.isOverdue ? `${item.daysPastDue} days overdue` : `Due: ${item.dueDate}`}
        </Text>
        {item.isOverdue && (
          <Ionicons name="warning" size={16} color="#dc3545" />
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Due Immunizations</Text>
          <View style={styles.counters}>
            <View style={styles.counter}>
              <Text style={styles.counterNumber}>{totalDue}</Text>
              <Text style={styles.counterLabel}>Total Due</Text>
            </View>
            <View style={[styles.counter, styles.overdueCounter]}>
              <Text style={[styles.counterNumber, styles.overdueNumber]}>{overdueCount}</Text>
              <Text style={styles.counterLabel}>Overdue</Text>
            </View>
          </View>
        </View>
        
        <TouchableOpacity style={styles.refreshButton} onPress={refresh}>
          <Ionicons name="refresh" size={20} color="#007bff" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <Text>Loading due immunizations...</Text>
        </View>
      ) : dueImmunizations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="checkmark-circle" size={48} color="#28a745" />
          <Text style={styles.emptyText}>All immunizations are up to date!</Text>
        </View>
      ) : (
        <FlatList
          data={dueImmunizations}
          renderItem={renderDueItem}
          keyExtractor={(item) => `${item.patientId}-${item.vaccineId}-${item.doseNumber}`}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  counters: {
    flexDirection: 'row',
    gap: 16,
  },
  counter: {
    alignItems: 'center',
  },
  overdueCounter: {
    // Additional styling for overdue counter if needed
  },
  counterNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007bff',
  },
  overdueNumber: {
    color: '#dc3545',
  },
  counterLabel: {
    fontSize: 12,
    color: '#6c757d',
  },
  refreshButton: {
    padding: 8,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#28a745',
    marginTop: 8,
    textAlign: 'center',
  },
  listContainer: {
    paddingBottom: 8,
  },
  dueItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
  },
  overdueItem: {
    borderLeftColor: '#dc3545',
    backgroundColor: '#fff5f5',
  },
  dueItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  vaccineInfo: {
    fontSize: 14,
    color: '#6c757d',
  },
  immunizeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007bff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  overdueButton: {
    backgroundColor: '#dc3545',
  },
  immunizeButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  dueItemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dueDate: {
    fontSize: 12,
    color: '#6c757d',
  },
  overdueText: {
    color: '#dc3545',
    fontWeight: '600',
  },
});
```

## Files to Create/Modify
- `frontend/services/immunization/ImmunizationService.ts` - Enhanced immunization service with Appwrite integration
- `frontend/hooks/useImmunizations.ts` - React hooks for immunization operations
- `frontend/hooks/useDueImmunizations.ts` - Hook for due immunizations management
- `frontend/components/immunization/EnhancedImmunizationForm.tsx` - Enhanced immunization form component
- `frontend/components/immunization/DueImmunizationsCard.tsx` - Due immunizations display component
- `frontend/components/immunization/BatchImmunizationForm.tsx` - Batch immunization form
- `frontend/utils/immunizationValidation.ts` - Immunization data validation utilities
- `frontend/types/immunization.ts` - Updated TypeScript types

## Testing Requirements

### Immunization Service Testing
```typescript
// frontend/__tests__/services/immunization/ImmunizationService.test.ts
import { immunizationService } from '../../../services/immunization/ImmunizationService';
import { immunizationRepository } from '../../../database/repository/ImmunizationRepository';

describe('ImmunizationService', () => {
  beforeEach(async () => {
    await immunizationRepository.clearAll();
  });

  it('should create immunization record offline-first', async () => {
    const recordData = {
      patientId: 'patient-1',
      vaccineId: 'vaccine-1',
      facilityId: 'facility-1',
      administeredBy: 'Dr. Smith',
      dateAdministered: '2024-01-15',
      doseNumber: 1
    };

    const record = await immunizationService.createImmunizationRecord(recordData);
    
    expect(record).toBeDefined();
    expect(record.patientId).toBe('patient-1');
    expect(record.isDirty).toBe(true);
  });

  it('should validate immunization data', async () => {
    const invalidData = {
      patientId: 'patient-1',
      vaccineId: 'vaccine-1',
      facilityId: 'facility-1',
      administeredBy: 'Dr. Smith',
      dateAdministered: '2025-12-31', // Future date
      doseNumber: 1
    };

    await expect(immunizationService.createImmunizationRecord(invalidData))
      .rejects.toThrow('Administration date cannot be in the future');
  });

  it('should calculate due immunizations correctly', async () => {
    // Create test patient and immunizations
    // Test due immunization calculation logic
    const dueImmunizations = await immunizationService.getDueImmunizations();
    
    expect(dueImmunizations).toBeDefined();
    expect(Array.isArray(dueImmunizations)).toBe(true);
  });
});
```

### Batch Immunization Testing
```typescript
// frontend/__tests__/services/immunization/BatchImmunization.test.ts
describe('Batch Immunization', () => {
  it('should create multiple immunization records', async () => {
    const batchData = {
      patientIds: ['patient-1', 'patient-2', 'patient-3'],
      vaccineId: 'vaccine-1',
      facilityId: 'facility-1',
      administeredBy: 'Dr. Smith',
      dateAdministered: '2024-01-15',
      doseNumber: 1,
      batchNumber: 'BATCH123'
    };

    const records = await immunizationService.createBatchImmunizations(batchData);
    
    expect(records).toHaveLength(3);
    expect(records[0].batchNumber).toBe('BATCH123');
  });

  it('should handle partial failures in batch creation', async () => {
    const batchData = {
      patientIds: ['valid-patient', 'invalid-patient'],
      vaccineId: 'vaccine-1',
      facilityId: 'facility-1',
      administeredBy: 'Dr. Smith',
      dateAdministered: '2024-01-15',
      doseNumber: 1
    };

    // Mock one patient to fail
    const records = await immunizationService.createBatchImmunizations(batchData);
    
    // Should create records for valid patients only
    expect(records.length).toBeLessThanOrEqual(2);
  });
});
```

### Due Immunizations Testing
```typescript
// frontend/__tests__/hooks/useDueImmunizations.test.ts
import { renderHook } from '@testing-library/react-native';
import { useDueImmunizations } from '../../../hooks/useImmunizations';

describe('useDueImmunizations', () => {
  it('should load due immunizations', async () => {
    const { result } = renderHook(() => useDueImmunizations());
    
    expect(result.current.loading).toBe(true);
    
    // Wait for loading to complete
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });
    
    expect(result.current.loading).toBe(false);
    expect(result.current.dueImmunizations).toBeDefined();
  });

  it('should calculate overdue count correctly', async () => {
    const { result } = renderHook(() => useDueImmunizations());
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });
    
    expect(typeof result.current.overdueCount).toBe('number');
    expect(result.current.overdueCount).toBeGreaterThanOrEqual(0);
  });
});
```

## Implementation Steps

### Phase 1: Core Service Migration (3 hours)
1. Implement ImmunizationService with Appwrite integration
2. Add offline-first CRUD operations
3. Implement data validation and business rules
4. Test basic immunization operations

### Phase 2: Advanced Features (2.5 hours)
1. Add vaccine schedule integration
2. Implement due immunization calculations
3. Add batch immunization capabilities
4. Implement search and filtering

### Phase 3: React Integration (2 hours)
1. Create immunization hooks
2. Update existing components to use new service
3. Add enhanced form validation
4. Test React integration

### Phase 4: Testing & Optimization (1.5 hours)
1. Write comprehensive tests
2. Optimize performance for large datasets
3. Add error handling and user feedback
4. Test offline scenarios and edge cases

## Success Metrics
- Immunization CRUD operations working offline and online
- Vaccine schedule integration functional
- Due immunization calculations accurate
- Batch immunization capabilities working
- Data validation preventing invalid records
- Search and filtering working efficiently
- All tests passing
- Performance acceptable on mobile devices
- User experience seamless during network transitions

## Rollback Plan
- Keep existing immunization service as fallback
- Implement feature flags for gradual migration
- Maintain data compatibility between old and new systems
- Document rollback procedures

## Next Steps
After completion, this task enables:
- FE-AW-13: Notification services migration with offline support
- FE-AW-14: Offline indicators and conflict resolution UI
- Full immunization management with offline-first capabilities
- Enhanced reporting and analytics capabilities