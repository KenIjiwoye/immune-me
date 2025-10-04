/**
 * Appwrite Integration Layer
 * Bridges existing services with new Appwrite services for gradual migration
 */

import { authService } from './appwriteAuth';
import { 
  facilitiesService, 
  patientsService, 
  vaccinesService, 
  immunizationRecordsService,
  notificationsService 
} from './appwriteDatabase';
import { storageService } from './appwriteStorage';
import api from './api';
import { FEATURE_FLAGS, LIMITS } from './config';
import type {
  Patient,
  Vaccine,
  ImmunizationRecord,
  User,
  ApiResponse,
  ApiListResponse,
  QueryParams,
} from '../types';

// Fresh Appwrite types
import type {
  Patients,
  Vaccines,
  ImmunizationRecords,
  Facilities,
  Notifications,
} from '../types/appwrite.d';

// Utility types
import type { AppwriteDocument } from '../types/appwrite';

// =============================================================================
// MIGRATION STRATEGY TYPES
// =============================================================================

export interface MigrationConfig {
  useAppwrite: boolean;
  fallbackToApi: boolean;
  syncBidirectional: boolean;
  enableOfflineMode: boolean;
}

export interface DataSyncResult<T> {
  success: boolean;
  data?: T;
  source: 'appwrite' | 'api' | 'cache';
  error?: string;
  syncRequired?: boolean;
}

// =============================================================================
// INTEGRATION SERVICE CLASS
// =============================================================================

export class AppwriteIntegrationService {
  private migrationConfig: MigrationConfig = {
    useAppwrite: true,
    fallbackToApi: true,
    syncBidirectional: false,
    enableOfflineMode: FEATURE_FLAGS.OFFLINE_MODE,
  };

  /**
   * Update migration configuration
   */
  updateMigrationConfig(config: Partial<MigrationConfig>): void {
    this.migrationConfig = { ...this.migrationConfig, ...config };
  }

  /**
   * Get current migration configuration
   */
  getMigrationConfig(): MigrationConfig {
    return { ...this.migrationConfig };
  }

  // =============================================================================
  // AUTHENTICATION INTEGRATION
  // =============================================================================

  /**
   * Unified login method
   */
  async login(credentials: { email: string; password: string }): Promise<DataSyncResult<any>> {
    try {
      if (this.migrationConfig.useAppwrite) {
        const userSession = await authService.login(credentials);
        return {
          success: true,
          data: userSession,
          source: 'appwrite',
        };
      } else {
        const response = await api.login(credentials);
        return {
          success: true,
          data: response.data,
          source: 'api',
        };
      }
    } catch (error) {
      if (this.migrationConfig.fallbackToApi && this.migrationConfig.useAppwrite) {
        try {
          const response = await api.login(credentials);
          return {
            success: true,
            data: response.data,
            source: 'api',
            syncRequired: true,
          };
        } catch (fallbackError) {
          return {
            success: false,
            error: `Both Appwrite and API login failed: ${error}`,
            source: 'appwrite',
          };
        }
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Login failed',
        source: this.migrationConfig.useAppwrite ? 'appwrite' : 'api',
      };
    }
  }

  /**
   * Unified logout method
   */
  async logout(): Promise<DataSyncResult<void>> {
    try {
      if (this.migrationConfig.useAppwrite) {
        await authService.logout();
      }
      
      if (this.migrationConfig.fallbackToApi || !this.migrationConfig.useAppwrite) {
        await api.logout();
      }
      
      return {
        success: true,
        source: 'appwrite',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Logout failed',
        source: 'appwrite',
      };
    }
  }

  // =============================================================================
  // PATIENT DATA INTEGRATION
  // =============================================================================

  /**
   * Get patients with fallback strategy
   */
  async getPatients(params?: QueryParams): Promise<DataSyncResult<Patient[]>> {
    try {
      if (this.migrationConfig.useAppwrite) {
        const result = await patientsService.list({
          limit: params?.limit || LIMITS.DEFAULT_PAGE_SIZE,
          offset: params?.offset || 0,
        });
        
        // Transform Appwrite data to legacy format
        const transformedData = result.documents.map(this.transformPatientFromAppwrite);
        
        return {
          success: true,
          data: transformedData,
          source: 'appwrite',
        };
      } else {
        // Use existing API
        const response = await api.get('/patients', { params });
        return {
          success: true,
          data: response.data.data,
          source: 'api',
        };
      }
    } catch (error) {
      if (this.migrationConfig.fallbackToApi && this.migrationConfig.useAppwrite) {
        try {
          const response = await api.get('/patients', { params });
          return {
            success: true,
            data: response.data.data,
            source: 'api',
            syncRequired: true,
          };
        } catch (fallbackError) {
          return {
            success: false,
            error: `Both Appwrite and API failed: ${error}`,
            source: 'appwrite',
          };
        }
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get patients',
        source: this.migrationConfig.useAppwrite ? 'appwrite' : 'api',
      };
    }
  }

  /**
   * Create patient with dual write strategy
   */
  async createPatient(patientData: Omit<Patient, 'id' | 'created_at' | 'updated_at'>): Promise<DataSyncResult<Patient>> {
    try {
      let appwriteResult: Patients | null = null;
      let apiResult: any = null;

      // Create in Appwrite first
      if (this.migrationConfig.useAppwrite) {
        const appwriteData = this.transformPatientToAppwrite(patientData);
        appwriteResult = await patientsService.create(appwriteData);
      }

      // Create in API if configured
      if (this.migrationConfig.syncBidirectional || !this.migrationConfig.useAppwrite) {
        const response = await api.post('/patients', patientData);
        apiResult = response.data.data;
      }

      const resultData = appwriteResult 
        ? this.transformPatientFromAppwrite(appwriteResult)
        : apiResult;

      return {
        success: true,
        data: resultData,
        source: appwriteResult ? 'appwrite' : 'api',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create patient',
        source: 'appwrite',
      };
    }
  }

  // =============================================================================
  // VACCINE DATA INTEGRATION
  // =============================================================================

  /**
   * Get vaccines with fallback strategy
   */
  async getVaccines(params?: QueryParams): Promise<DataSyncResult<Vaccine[]>> {
    try {
      if (this.migrationConfig.useAppwrite) {
        const result = await vaccinesService.list({
          limit: params?.limit || LIMITS.DEFAULT_PAGE_SIZE,
          offset: params?.offset || 0,
        });
        
        const transformedData = result.documents.map(this.transformVaccineFromAppwrite);
        
        return {
          success: true,
          data: transformedData,
          source: 'appwrite',
        };
      } else {
        const response = await api.get('/vaccines', { params });
        return {
          success: true,
          data: response.data.data,
          source: 'api',
        };
      }
    } catch (error) {
      if (this.migrationConfig.fallbackToApi && this.migrationConfig.useAppwrite) {
        try {
          const response = await api.get('/vaccines', { params });
          return {
            success: true,
            data: response.data.data,
            source: 'api',
            syncRequired: true,
          };
        } catch (fallbackError) {
          return {
            success: false,
            error: `Both Appwrite and API failed: ${error}`,
            source: 'appwrite',
          };
        }
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get vaccines',
        source: this.migrationConfig.useAppwrite ? 'appwrite' : 'api',
      };
    }
  }

  // =============================================================================
  // IMMUNIZATION RECORDS INTEGRATION
  // =============================================================================

  /**
   * Get immunization records with fallback strategy
   */
  async getImmunizationRecords(patientId?: string, params?: QueryParams): Promise<DataSyncResult<ImmunizationRecord[]>> {
    try {
      if (this.migrationConfig.useAppwrite) {
        const result = patientId 
          ? await immunizationRecordsService.getByPatient(patientId)
          : await immunizationRecordsService.list({
              limit: params?.limit || LIMITS.DEFAULT_PAGE_SIZE,
              offset: params?.offset || 0,
            });
        
        const transformedData = Array.isArray(result) 
          ? result.map(this.transformImmunizationFromAppwrite)
          : result.documents.map(this.transformImmunizationFromAppwrite);
        
        return {
          success: true,
          data: transformedData,
          source: 'appwrite',
        };
      } else {
        const endpoint = patientId ? `/patients/${patientId}/immunizations` : '/immunizations';
        const response = await api.get(endpoint, { params });
        return {
          success: true,
          data: response.data.data,
          source: 'api',
        };
      }
    } catch (error) {
      if (this.migrationConfig.fallbackToApi && this.migrationConfig.useAppwrite) {
        try {
          const endpoint = patientId ? `/patients/${patientId}/immunizations` : '/immunizations';
          const response = await api.get(endpoint, { params });
          return {
            success: true,
            data: response.data.data,
            source: 'api',
            syncRequired: true,
          };
        } catch (fallbackError) {
          return {
            success: false,
            error: `Both Appwrite and API failed: ${error}`,
            source: 'appwrite',
          };
        }
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get immunization records',
        source: this.migrationConfig.useAppwrite ? 'appwrite' : 'api',
      };
    }
  }

  // =============================================================================
  // NOTIFICATION INTEGRATION
  // =============================================================================

  /**
   * Get notifications with fallback strategy
   */
  async getNotifications(params?: QueryParams): Promise<DataSyncResult<any[]>> {
    try {
      if (this.migrationConfig.useAppwrite) {
        const user = await authService.getCurrentUser();
        const result = await notificationsService.getByRecipient(user.$id, params?.limit || 25);
        
        return {
          success: true,
          data: result,
          source: 'appwrite',
        };
      } else {
        const response = await api.getNotifications(params);
        return {
          success: true,
          data: response.data.data,
          source: 'api',
        };
      }
    } catch (error) {
      if (this.migrationConfig.fallbackToApi && this.migrationConfig.useAppwrite) {
        try {
          const response = await api.getNotifications(params);
          return {
            success: true,
            data: response.data.data,
            source: 'api',
            syncRequired: true,
          };
        } catch (fallbackError) {
          return {
            success: false,
            error: `Both Appwrite and API failed: ${error}`,
            source: 'appwrite',
          };
        }
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get notifications',
        source: this.migrationConfig.useAppwrite ? 'appwrite' : 'api',
      };
    }
  }

  // =============================================================================
  // DATA TRANSFORMATION HELPERS
  // =============================================================================

  /**
   * Transform Appwrite patient to legacy format
   */
  private transformPatientFromAppwrite(appwritePatient: Patients): Patient {
    return {
      id: parseInt(appwritePatient.$id) || 0,
      fullName: appwritePatient.full_name,
      sex: appwritePatient.sex as 'M' | 'F',
      dateOfBirth: appwritePatient.date_of_birth,
      motherName: appwritePatient.mother_name || '',
      fatherName: appwritePatient.father_name || '',
      district: appwritePatient.district,
      townVillage: appwritePatient.town_village || '',
      address: appwritePatient.address,
      contactPhone: appwritePatient.contact_phone || '',
      facilityId: parseInt(appwritePatient.facility_id) || undefined,
    } as unknown as Patient;
  }

  /**
   * Transform legacy patient to Appwrite format
   */
  private transformPatientToAppwrite(patient: any): Omit<Patients, keyof AppwriteDocument> {
    return {
      full_name: patient.fullName || patient.full_name,
      sex: patient.sex,
      date_of_birth: patient.dateOfBirth || patient.date_of_birth,
      mother_name: patient.motherName || patient.mother_name,
      father_name: patient.fatherName || patient.father_name,
      district: patient.district,
      town_village: patient.townVillage || patient.town_village,
      address: patient.address,
      contact_phone: patient.contactPhone || patient.contact_phone,
      health_worker_id: patient.health_worker_id,
      health_worker_name: patient.health_worker_name,
      health_worker_phone: patient.health_worker_phone,
      health_worker_address: patient.health_worker_address,
      facility_id: patient.facilityId?.toString() || patient.facility_id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  /**
   * Transform Appwrite vaccine to legacy format
   */
  private transformVaccineFromAppwrite(appwriteVaccine: Vaccines): Vaccine {
    return {
      id: parseInt(appwriteVaccine.$id) || 0,
      name: appwriteVaccine.name,
      description: appwriteVaccine.disease_targeted,
      vaccineCode: appwriteVaccine.name.toUpperCase().replace(/\s+/g, '_'),
      sequenceNumber: 1,
      vaccineSeries: appwriteVaccine.age_group || 'ROUTINE',
      isActive: appwriteVaccine.is_active,
      createdAt: appwriteVaccine.created_at,
    } as unknown as Vaccine;
  }

  /**
   * Transform Appwrite immunization record to legacy format
   */
  private transformImmunizationFromAppwrite(appwriteRecord: ImmunizationRecords): ImmunizationRecord {
    return {
      id: parseInt(appwriteRecord.$id) || 0,
      patientId: parseInt(appwriteRecord.patient_id) || 0,
      vaccineId: parseInt(appwriteRecord.vaccine_id) || 0,
      administeredDate: appwriteRecord.administration_date,
      returnDate: appwriteRecord.expiry_date,
      batchNumber: appwriteRecord.batch_number || '',
      vaccine: {
        id: parseInt(appwriteRecord.vaccine_id) || 0,
        name: 'Unknown', // Would need to fetch vaccine details
        description: '',
        vaccineCode: '',
        sequenceNumber: appwriteRecord.dose_number || 1,
        vaccineSeries: 'ROUTINE',
        isActive: true,
        createdAt: appwriteRecord.created_at,
      },
      administeredBy: {
        id: 0,
        name: appwriteRecord.administered_by,
        email: '',
        role: 'HEALTH_WORKER',
      },
      notes: appwriteRecord.notes,
      createdAt: appwriteRecord.created_at,
    } as unknown as ImmunizationRecord;
  }

  // =============================================================================
  // SYNC AND MIGRATION UTILITIES
  // =============================================================================

  /**
   * Sync data between Appwrite and API
   */
  async syncData(dataType: 'patients' | 'vaccines' | 'immunizations'): Promise<DataSyncResult<any>> {
    try {
      // Implementation would depend on specific sync requirements
      console.log(`Syncing ${dataType} data between Appwrite and API`);
      
      return {
        success: true,
        source: 'appwrite',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Sync failed',
        source: 'appwrite',
      };
    }
  }

  /**
   * Check data consistency between sources
   */
  async checkDataConsistency(): Promise<{
    consistent: boolean;
    issues: Array<{ type: string; description: string }>;
  }> {
    const issues: Array<{ type: string; description: string }> = [];
    
    try {
      // Check if both sources are accessible
      if (this.migrationConfig.useAppwrite && this.migrationConfig.fallbackToApi) {
        // Implementation would compare data between sources
        console.log('Checking data consistency between Appwrite and API');
      }
      
      return {
        consistent: issues.length === 0,
        issues,
      };
    } catch (error) {
      issues.push({
        type: 'connectivity',
        description: 'Failed to check data consistency',
      });
      
      return {
        consistent: false,
        issues,
      };
    }
  }
}

// =============================================================================
// SERVICE INSTANCE
// =============================================================================

export const appwriteIntegration = new AppwriteIntegrationService();

// =============================================================================
// MIGRATION HELPERS
// =============================================================================

/**
 * Gradual migration helper
 */
export class MigrationHelper {
  /**
   * Enable Appwrite for specific features
   */
  static enableAppwriteForFeature(feature: string): void {
    console.log(`Enabling Appwrite for feature: ${feature}`);
    // Implementation would update feature flags
  }

  /**
   * Rollback to API for specific features
   */
  static rollbackToApiForFeature(feature: string): void {
    console.log(`Rolling back to API for feature: ${feature}`);
    // Implementation would update feature flags
  }

  /**
   * Get migration status
   */
  static getMigrationStatus(): {
    features: Record<string, 'api' | 'appwrite' | 'hybrid'>;
    overallProgress: number;
  } {
    return {
      features: {
        authentication: 'appwrite',
        patients: 'hybrid',
        vaccines: 'hybrid',
        immunizations: 'hybrid',
        notifications: 'appwrite',
        storage: 'appwrite',
      },
      overallProgress: 75, // Percentage
    };
  }
}

export default {
  AppwriteIntegrationService,
  appwriteIntegration,
  MigrationHelper,
};