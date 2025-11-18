/**
 * Relationship Management Service
 * Handles complex relationships between entities including:
 * - Patient-immunization linking
 * - Facility-employee relationships
 * - User-profile associations
 * - Audit trail relationships
 */

import { DatabaseService } from './appwriteDatabase';
import { Query } from 'react-native-appwrite';
import { logAppwriteError, withRetry } from './appwrite';
import type {
  Patient,
  ImmunizationRecord,
  Vaccine,
  VaccineScheduleItem,
  EmployeeProfile,
  Facility,
  AdminProfile,
  PatientProfile,
  AccessAuditLog,
  AuditCollection,
  RoleChangeLog,
  PatientImmunizationHistory,
  PatientVaccineStatus,
  ImmunizationScheduleCompliance,
  FacilityEmployeeAssignment,
  EmployeeFacilityHistory,
  FacilityStaffing,
  UserProfileLink,
  UserProfileCollection,
  ProfileUserDetails,
  AuditTrailEntry,
  AuditTrailSummary,
  ChangeLog,
} from '../types/appwrite';

export class RelationshipService {
  private patientsService: DatabaseService<Patient>;
  private immunizationRecordsService: DatabaseService<ImmunizationRecord>;
  private vaccinesService: DatabaseService<Vaccine>;
  private vaccineScheduleItemsService: DatabaseService<VaccineScheduleItem>;
  private employeeProfilesService: DatabaseService<EmployeeProfile>;
  private facilitiesService: DatabaseService<Facility>;
  private adminProfilesService: DatabaseService<AdminProfile>;
  private patientProfilesService: DatabaseService<PatientProfile>;
  private accessAuditLogService: DatabaseService<AccessAuditLog>;
  private auditCollectionService: DatabaseService<AuditCollection>;
  private roleChangeLogService: DatabaseService<RoleChangeLog>;

  constructor() {
    this.patientsService = new DatabaseService<Patient>('patients');
    this.immunizationRecordsService = new DatabaseService<ImmunizationRecord>('immunization_records');
    this.vaccinesService = new DatabaseService<Vaccine>('vaccines');
    this.vaccineScheduleItemsService = new DatabaseService<VaccineScheduleItem>('vaccine_schedule_items');
    this.employeeProfilesService = new DatabaseService<EmployeeProfile>('employee_profiles');
    this.facilitiesService = new DatabaseService<Facility>('facilities');
    this.adminProfilesService = new DatabaseService<AdminProfile>('admin_profiles');
    this.patientProfilesService = new DatabaseService<PatientProfile>('patient_profiles');
    this.accessAuditLogService = new DatabaseService<AccessAuditLog>('access_audit_log');
    this.auditCollectionService = new DatabaseService<AuditCollection>('audit_collections');
    this.roleChangeLogService = new DatabaseService<RoleChangeLog>('role_change_log');
  }

  // =============================================================================
  // PATIENT-IMMUNIZATION RELATIONSHIPS
  // =============================================================================

  /**
   * Get complete immunization history for a patient
   */
  async getPatientImmunizationHistory(patientId: string): Promise<PatientImmunizationHistory> {
    try {
      // Get all immunization records for the patient
      const immunizationRecords = await this.immunizationRecordsService.list({
        queries: [Query.equal('patient_id', patientId), Query.orderDesc('administration_date')],
      });

      // Get vaccine schedule items for the patient's age group
      const patient = await this.patientsService.get(patientId);
      const ageInWeeks = this.calculateAgeInWeeks(patient.date_of_birth);

      const vaccineScheduleItems = await this.vaccineScheduleItemsService.list({
        queries: [
          Query.lessThanEqual('minimum_age_weeks', ageInWeeks),
          Query.greaterThanEqual('maximum_age_weeks', ageInWeeks),
          Query.equal('is_active', true),
        ],
      });

      // Calculate next due vaccines and completed vaccines
      const nextDueVaccines = await this.calculateNextDueVaccines(patientId, vaccineScheduleItems.documents);
      const completedVaccines = await this.calculateCompletedVaccines(patientId, immunizationRecords.documents);

      return {
        patientId,
        immunizations: immunizationRecords.documents,
        vaccineSchedule: vaccineScheduleItems.documents,
        nextDueVaccines,
        completedVaccines,
      };
    } catch (error) {
      logAppwriteError(error, `RelationshipService.getPatientImmunizationHistory - Patient: ${patientId}`);
      throw error;
    }
  }

  /**
   * Get vaccine status for a specific patient-vaccine combination
   */
  async getPatientVaccineStatus(patientId: string, vaccineId: string): Promise<PatientVaccineStatus> {
    try {
      // Get patient details
      const patient = await this.patientsService.get(patientId);
      const ageInWeeks = this.calculateAgeInWeeks(patient.date_of_birth);

      // Get vaccine schedule for this vaccine
      const scheduleItems = await this.vaccineScheduleItemsService.list({
        queries: [
          Query.equal('vaccine_id', vaccineId),
          Query.lessThanEqual('minimum_age_weeks', ageInWeeks),
          Query.equal('is_active', true),
        ],
      });

      // Get immunization records for this vaccine
      const immunizationRecords = await this.immunizationRecordsService.list({
        queries: [
          Query.equal('patient_id', patientId),
          Query.equal('vaccine_id', vaccineId),
          Query.orderDesc('administration_date'),
        ],
      });

      const dosesReceived = immunizationRecords.documents.length;
      const dosesRequired = scheduleItems.documents.length;

      let status: PatientVaccineStatus['status'] = 'not_started';
      let lastDoseDate: string | undefined;
      let nextDoseDate: string | undefined;

      if (dosesReceived > 0) {
        lastDoseDate = immunizationRecords.documents[0].administration_date;

        if (dosesReceived >= dosesRequired) {
          status = 'completed';
        } else {
          status = 'in_progress';
          // Calculate next dose date based on schedule
          const nextDose = scheduleItems.documents.find(item => item.dose_number === dosesReceived + 1);
          if (nextDose && nextDose.minimum_age_weeks !== undefined) {
            nextDoseDate = this.calculateDoseDate(patient.date_of_birth, nextDose.minimum_age_weeks);
            const now = new Date();
            const nextDoseDateTime = new Date(nextDoseDate);
            if (nextDoseDateTime < now) {
              status = 'overdue';
            }
          }
        }
      }

      return {
        patientId,
        vaccineId,
        status,
        dosesReceived,
        dosesRequired,
        lastDoseDate,
        nextDoseDate,
      };
    } catch (error) {
      logAppwriteError(error, `RelationshipService.getPatientVaccineStatus - Patient: ${patientId}, Vaccine: ${vaccineId}`);
      throw error;
    }
  }

  /**
   * Get immunization schedule compliance for a patient
   */
  async getImmunizationScheduleCompliance(patientId: string): Promise<ImmunizationScheduleCompliance> {
    try {
      const history = await this.getPatientImmunizationHistory(patientId);

      let onTimeDoses = 0;
      let delayedDoses = 0;
      let missedDoses = 0;
      const upcomingDoses: Array<{ vaccineId: string; dueDate: string; daysOverdue?: number }> = [];

      const now = new Date();

      // Analyze each scheduled vaccine
      for (const scheduleItem of history.vaccineSchedule) {
        const vaccineRecords = history.immunizations.filter(imm => imm.vaccine_id === scheduleItem.vaccine_id);
        const doseRecord = vaccineRecords.find(record => record.dose_number === scheduleItem.dose_number);

        if (doseRecord) {
          // Dose administered - check if on time
          if (scheduleItem.minimum_age_weeks !== undefined) {
            const scheduledDate = this.calculateDoseDate(history.immunizations[0]?.administration_date || new Date().toISOString(), scheduleItem.minimum_age_weeks);
            const actualDate = new Date(doseRecord.administration_date);
            const scheduledDateTime = new Date(scheduledDate);

            if (actualDate <= scheduledDateTime) {
              onTimeDoses++;
            } else {
              delayedDoses++;
            }
          }
        } else {
          // Dose not administered - check if overdue
          if (scheduleItem.minimum_age_weeks !== undefined) {
            const patient = await this.patientsService.get(patientId);
            const dueDate = this.calculateDoseDate(patient.date_of_birth, scheduleItem.minimum_age_weeks);
            const dueDateTime = new Date(dueDate);

            if (dueDateTime < now) {
              missedDoses++;
              upcomingDoses.push({
                vaccineId: scheduleItem.vaccine_id,
                dueDate,
                daysOverdue: Math.floor((now.getTime() - dueDateTime.getTime()) / (1000 * 60 * 60 * 24)),
              });
            } else {
              upcomingDoses.push({
                vaccineId: scheduleItem.vaccine_id,
                dueDate,
              });
            }
          }
        }
      }

      const totalDoses = history.vaccineSchedule.length;
      const completedDoses = onTimeDoses + delayedDoses;
      const overallCompliance = totalDoses > 0 ? (onTimeDoses / totalDoses) * 100 : 100;

      return {
        patientId,
        overallCompliance,
        onTimeDoses,
        delayedDoses,
        missedDoses,
        upcomingDoses,
      };
    } catch (error) {
      logAppwriteError(error, `RelationshipService.getImmunizationScheduleCompliance - Patient: ${patientId}`);
      throw error;
    }
  }

  // =============================================================================
  // FACILITY-EMPLOYEE RELATIONSHIPS
  // =============================================================================

  /**
   * Get employee facility assignment details
   */
  async getEmployeeFacilityAssignment(employeeId: string): Promise<EmployeeFacilityHistory> {
    try {
      const employee = await this.employeeProfilesService.get(employeeId);

      // Get primary facility
      const primaryFacility = employee.primary_facility_id
        ? await this.facilitiesService.get(employee.primary_facility_id)
        : undefined;

      // Get assigned facilities
      const assignedFacilities: Facility[] = [];
      if (employee.assigned_facilities) {
        for (const facilityId of employee.assigned_facilities) {
          try {
            const facility = await this.facilitiesService.get(facilityId);
            assignedFacilities.push(facility);
          } catch (error) {
            // Facility might not exist, skip
            console.warn(`Facility ${facilityId} not found for employee ${employeeId}`);
          }
        }
      }

      // Create facility assignments (simplified - in real implementation, this might come from a separate collection)
      const facilityAssignments: FacilityEmployeeAssignment[] = [
        {
          employeeId,
          facilityId: employee.primary_facility_id,
          assignmentType: 'primary',
          startDate: employee.hire_date || employee.created_at,
          isActive: employee.employment_status === 'active',
          role: employee.professional_title,
          department: employee.department,
          permissions: [], // Would need to be determined based on role
        },
        ...assignedFacilities.map(facility => ({
          employeeId,
          facilityId: facility.$id,
          assignmentType: 'secondary' as const,
          startDate: employee.hire_date || employee.created_at,
          isActive: employee.employment_status === 'active',
          role: employee.professional_title,
          department: employee.department,
          permissions: [],
        })),
      ];

      return {
        employeeId,
        facilityAssignments,
        currentFacility: primaryFacility,
        primaryFacility,
        assignedFacilities,
      };
    } catch (error) {
      logAppwriteError(error, `RelationshipService.getEmployeeFacilityAssignment - Employee: ${employeeId}`);
      throw error;
    }
  }

  /**
   * Get facility staffing information
   */
  async getFacilityStaffing(facilityId: string): Promise<FacilityStaffing> {
    try {
      // Get all employees assigned to this facility
      const employees = await this.employeeProfilesService.list({
        queries: [
          Query.equal('primary_facility_id', facilityId),
          Query.equal('employment_status', 'active'),
        ],
      });

      // Also check assigned_facilities array
      const additionalEmployees = await this.employeeProfilesService.list({
        queries: [
          Query.search('assigned_facilities', facilityId),
          Query.equal('employment_status', 'active'),
        ],
      });

      // Combine and deduplicate employees
      const allEmployeeIds = new Set([
        ...employees.documents.map(emp => emp.$id),
        ...additionalEmployees.documents.map(emp => emp.$id),
      ]);

      const allEmployees: EmployeeProfile[] = [];
      for (const empId of allEmployeeIds) {
        try {
          const employee = await this.employeeProfilesService.get(empId);
          allEmployees.push(employee);
        } catch (error) {
          // Employee might not exist, skip
        }
      }

      // Calculate staffing statistics
      const staffByRole: Record<string, number> = {};
      const staffByType: Record<string, number> = {};

      for (const employee of allEmployees) {
        staffByRole[employee.professional_title] = (staffByRole[employee.professional_title] || 0) + 1;
        staffByType[employee.employee_type] = (staffByType[employee.employee_type] || 0) + 1;
      }

      // Calculate staffing gaps (simplified - would need facility requirements data)
      const staffingGaps: Array<{ role: string; required: number; current: number }> = [
        // This would be calculated based on facility requirements vs current staffing
      ];

      return {
        facilityId,
        totalStaff: allEmployees.length,
        staffByRole,
        staffByType,
        activeStaff: allEmployees,
        staffingGaps,
      };
    } catch (error) {
      logAppwriteError(error, `RelationshipService.getFacilityStaffing - Facility: ${facilityId}`);
      throw error;
    }
  }

  // =============================================================================
  // USER-PROFILE RELATIONSHIPS
  // =============================================================================

  /**
   * Get all profiles associated with a user
   */
  async getUserProfiles(userId: string): Promise<UserProfileCollection> {
    try {
      const profiles: UserProfileLink[] = [];

      // Check admin profile
      try {
        const adminProfile = await this.adminProfilesService.list({
          queries: [Query.equal('user_id', userId)],
          limit: 1,
        });
        if (adminProfile.documents.length > 0) {
          profiles.push({
            userId,
            profileId: adminProfile.documents[0].$id,
            profileType: 'admin',
            isPrimary: false, // Logic to determine primary profile
            status: 'active',
            createdAt: adminProfile.documents[0].created_at,
            verifiedAt: adminProfile.documents[0].updated_at,
          });
        }
      } catch (error) {
        // No admin profile, continue
      }

      // Check employee profile
      try {
        const employeeProfile = await this.employeeProfilesService.list({
          queries: [Query.equal('user_id', userId)],
          limit: 1,
        });
        if (employeeProfile.documents.length > 0) {
          profiles.push({
            userId,
            profileId: employeeProfile.documents[0].$id,
            profileType: 'employee',
            isPrimary: profiles.length === 0, // First profile is primary
            status: employeeProfile.documents[0].employment_status === 'active' ? 'active' : 'inactive',
            createdAt: employeeProfile.documents[0].created_at,
            verifiedAt: employeeProfile.documents[0].updated_at,
          });
        }
      } catch (error) {
        // No employee profile, continue
      }

      // Check patient profile
      try {
        const patientProfile = await this.patientProfilesService.list({
          queries: [Query.equal('user_id', userId)],
          limit: 1,
        });
        if (patientProfile.documents.length > 0) {
          profiles.push({
            userId,
            profileId: patientProfile.documents[0].$id,
            profileType: 'patient',
            isPrimary: profiles.length === 0,
            status: patientProfile.documents[0].profile_status === 'active' ? 'active' : 'inactive',
            createdAt: patientProfile.documents[0].created_at,
            verifiedAt: patientProfile.documents[0].updated_at,
          });
        }
      } catch (error) {
        // No patient profile, continue
      }

      const primaryProfile = profiles.find(p => p.isPrimary);
      const activeProfiles = profiles.filter(p => p.status === 'active');

      return {
        userId,
        profiles,
        primaryProfile,
        activeProfiles,
      };
    } catch (error) {
      logAppwriteError(error, `RelationshipService.getUserProfiles - User: ${userId}`);
      throw error;
    }
  }

  /**
   * Get detailed user information for a profile
   */
  async getProfileUserDetails(profileId: string, profileType: 'admin' | 'employee' | 'patient'): Promise<ProfileUserDetails> {
    try {
      let profile: any;
      let userId: string;

      switch (profileType) {
        case 'admin':
          profile = await this.adminProfilesService.get(profileId);
          userId = profile.user_id;
          break;
        case 'employee':
          profile = await this.employeeProfilesService.get(profileId);
          userId = profile.user_id;
          break;
        case 'patient':
          profile = await this.patientProfilesService.get(profileId);
          userId = profile.user_id;
          break;
      }

      // Note: In a real implementation, you'd need to get user details from Appwrite Users API
      // For now, returning a placeholder structure
      const user = {
        $id: userId,
        email: '', // Would need to fetch from Users API
        name: '',
        phone: '',
        emailVerification: false,
        phoneVerification: false,
        status: true,
        labels: [],
        prefs: {},
        $createdAt: profile.created_at,
        $updatedAt: profile.updated_at,
      };

      return {
        profileId,
        user,
        profileType,
        verificationStatus: profile.verification_status || 'pending',
      };
    } catch (error) {
      logAppwriteError(error, `RelationshipService.getProfileUserDetails - Profile: ${profileId}`);
      throw error;
    }
  }

  // =============================================================================
  // AUDIT TRAIL RELATIONSHIPS
  // =============================================================================

  /**
   * Get audit trail for a specific resource
   */
  async getAuditTrailForResource(resourceType: string, resourceId: string, limit: number = 50): Promise<AuditTrailEntry[]> {
    try {
      const auditLogs = await this.accessAuditLogService.list({
        queries: [
          Query.equal('resource_type', resourceType),
          Query.equal('resource_id', resourceId),
          Query.orderDesc('created_at'),
        ],
        limit,
      });

      const auditCollections = await this.auditCollectionService.list({
        queries: [
          Query.equal('collection_name', resourceType),
          Query.equal('document_id', resourceId),
          Query.orderDesc('created_at'),
        ],
        limit,
      });

      // Combine and sort audit entries
      const auditEntries: AuditTrailEntry[] = [
        ...auditLogs.documents.map(log => ({
          id: log.$id,
          timestamp: log.created_at,
          userId: log.user_id,
          profileId: log.profile_id,
          action: log.action_type,
          resourceType: log.resource_type,
          resourceId: log.resource_id,
          metadata: log.additional_data ? JSON.parse(log.additional_data) : undefined,
          ipAddress: log.ip_address,
          userAgent: log.user_agent,
          sessionId: log.session_id,
        })),
        ...auditCollections.documents.map(collection => ({
          id: collection.$id,
          timestamp: collection.created_at,
          userId: collection.user_id,
          profileId: collection.profile_id,
          action: collection.action_type,
          resourceType: collection.collection_name,
          resourceId: collection.document_id,
          changes: collection.changes_summary ? JSON.parse(collection.changes_summary) : undefined,
          metadata: {
            oldData: collection.old_data ? JSON.parse(collection.old_data) : undefined,
            newData: collection.new_data ? JSON.parse(collection.new_data) : undefined,
          },
          ipAddress: collection.ip_address,
          userAgent: collection.user_agent,
        })),
      ];

      // Sort by timestamp descending
      auditEntries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      return auditEntries.slice(0, limit);
    } catch (error) {
      logAppwriteError(error, `RelationshipService.getAuditTrailForResource - Resource: ${resourceType}/${resourceId}`);
      throw error;
    }
  }

  /**
   * Get audit trail summary for a date range
   */
  async getAuditTrailSummary(startDate: string, endDate: string): Promise<AuditTrailSummary> {
    try {
      const auditLogs = await this.accessAuditLogService.list({
        queries: [
          Query.greaterThanEqual('created_at', startDate),
          Query.lessThanEqual('created_at', endDate),
        ],
      });

      const auditCollections = await this.auditCollectionService.list({
        queries: [
          Query.greaterThanEqual('created_at', startDate),
          Query.lessThanEqual('created_at', endDate),
        ],
      });

      // Calculate statistics
      const entriesByAction: Record<string, number> = {};
      const entriesByUser: Record<string, number> = {};
      const entriesByResourceType: Record<string, number> = {};

      const allEntries = [...auditLogs.documents, ...auditCollections.documents];

      for (const entry of allEntries) {
        // Action counts
        const action = 'action_type' in entry ? (entry as any).action_type : (entry as any).action_type;
        entriesByAction[action] = (entriesByAction[action] || 0) + 1;

        // User counts
        const userId = entry.user_id;
        entriesByUser[userId] = (entriesByUser[userId] || 0) + 1;

        // Resource type counts
        const resourceType = 'resource_type' in entry ? (entry as any).resource_type : (entry as any).collection_name;
        entriesByResourceType[resourceType] = (entriesByResourceType[resourceType] || 0) + 1;
      }

      // Get recent entries
      const recentEntries = allEntries
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 10)
        .map(entry => ({
          id: entry.$id,
          timestamp: entry.created_at,
          userId: entry.user_id,
          profileId: 'profile_id' in entry ? (entry as any).profile_id : undefined,
          action: 'action_type' in entry ? (entry as any).action_type : (entry as any).action_type,
          resourceType: 'resource_type' in entry ? (entry as any).resource_type : (entry as any).collection_name,
          resourceId: 'resource_id' in entry ? (entry as any).resource_id : ('document_id' in entry ? (entry as any).document_id : undefined),
        }));

      return {
        totalEntries: allEntries.length,
        entriesByAction,
        entriesByUser,
        entriesByResourceType,
        recentEntries,
        dateRange: { start: startDate, end: endDate },
      };
    } catch (error) {
      logAppwriteError(error, `RelationshipService.getAuditTrailSummary - Range: ${startDate} to ${endDate}`);
      throw error;
    }
  }

  /**
   * Get change log for a specific document
   */
  async getChangeLog(collectionName: string, documentId: string): Promise<ChangeLog[]> {
    try {
      const auditEntries = await this.auditCollectionService.list({
        queries: [
          Query.equal('collection_name', collectionName),
          Query.equal('document_id', documentId),
          Query.orderDesc('created_at'),
        ],
      });

      const changeLogs: ChangeLog[] = auditEntries.documents.map(entry => ({
        documentId: entry.document_id,
        collectionName: entry.collection_name,
        changes: entry.changes_summary ? JSON.parse(entry.changes_summary) : [],
        changedBy: entry.user_id,
        changedAt: entry.created_at,
        reason: entry.changes_summary ? 'Audit trail change' : undefined,
      }));

      return changeLogs;
    } catch (error) {
      logAppwriteError(error, `RelationshipService.getChangeLog - Collection: ${collectionName}, Document: ${documentId}`);
      throw error;
    }
  }

  // =============================================================================
  // HELPER METHODS
  // =============================================================================

  private calculateAgeInWeeks(dateOfBirth: string): number {
    const birthDate = new Date(dateOfBirth);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - birthDate.getTime());
    return Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
  }

  private calculateDoseDate(referenceDate: string, weeksFromReference: number): string {
    const refDate = new Date(referenceDate);
    const doseDate = new Date(refDate.getTime() + (weeksFromReference * 7 * 24 * 60 * 60 * 1000));
    return doseDate.toISOString();
  }

  private async calculateNextDueVaccines(
    patientId: string,
    scheduleItems: VaccineScheduleItem[]
  ): Promise<Array<{ vaccineId: string; vaccineName: string; dueDate: string; doseNumber: number }>> {
    const nextDueVaccines: Array<{ vaccineId: string; vaccineName: string; dueDate: string; doseNumber: number }> = [];

    for (const item of scheduleItems) {
      try {
        // Check if this dose has been administered
        const existingDoses = await this.immunizationRecordsService.list({
          queries: [
            Query.equal('patient_id', patientId),
            Query.equal('vaccine_id', item.vaccine_id),
            Query.equal('dose_number', item.dose_number),
          ],
        });

        if (existingDoses.documents.length === 0 && item.minimum_age_weeks !== undefined) {
          // Dose not administered, calculate due date
          const patient = await this.patientsService.get(patientId);
          const dueDate = this.calculateDoseDate(patient.date_of_birth, item.minimum_age_weeks);

          const vaccine = await this.vaccinesService.get(item.vaccine_id);

          nextDueVaccines.push({
            vaccineId: item.vaccine_id,
            vaccineName: vaccine.name,
            dueDate,
            doseNumber: item.dose_number,
          });
        }
      } catch (error) {
        // Skip this vaccine if there's an error
        console.warn(`Error calculating next due vaccine for ${item.vaccine_id}:`, error);
      }
    }

    return nextDueVaccines.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }

  private async calculateCompletedVaccines(
    patientId: string,
    immunizationRecords: ImmunizationRecord[]
  ): Promise<Array<{ vaccineId: string; vaccineName: string; completionDate: string; administeredBy: string }>> {
    const completedVaccines: Array<{ vaccineId: string; vaccineName: string; completionDate: string; administeredBy: string }> = [];
    const vaccineGroups = new Map<string, ImmunizationRecord[]>();

    // Group immunizations by vaccine
    for (const record of immunizationRecords) {
      if (!vaccineGroups.has(record.vaccine_id)) {
        vaccineGroups.set(record.vaccine_id, []);
      }
      vaccineGroups.get(record.vaccine_id)!.push(record);
    }

    for (const [vaccineId, records] of vaccineGroups) {
      try {
        // Sort by dose number and date
        records.sort((a, b) => {
          const aDose = a.dose_number || 0;
          const bDose = b.dose_number || 0;
          if (aDose !== bDose) {
            return bDose - aDose;
          }
          return new Date(b.administration_date).getTime() - new Date(a.administration_date).getTime();
        });

        const latestRecord = records[0];
        const vaccine = await this.vaccinesService.get(vaccineId);

        completedVaccines.push({
          vaccineId,
          vaccineName: vaccine.name,
          completionDate: latestRecord.administration_date,
          administeredBy: latestRecord.administered_by,
        });
      } catch (error) {
        // Skip this vaccine if there's an error
        console.warn(`Error calculating completed vaccine for ${vaccineId}:`, error);
      }
    }

    return completedVaccines.sort((a, b) => new Date(b.completionDate).getTime() - new Date(a.completionDate).getTime());
  }
}

// =============================================================================
// SERVICE INSTANCE (Lazy initialization to avoid circular dependency)
// =============================================================================

let relationshipServiceInstance: RelationshipService | null = null;

/**
 * Get the singleton instance of RelationshipService
 * Uses lazy initialization to avoid circular dependency with DatabaseService
 */
export function getRelationshipService(): RelationshipService {
  if (!relationshipServiceInstance) {
    relationshipServiceInstance = new RelationshipService();
  }
  return relationshipServiceInstance;
}

// Maintain backward compatibility with object property access
export const relationshipService = {
  get instance(): RelationshipService {
    return getRelationshipService();
  }
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Validate relationship data
 */
export function validateRelationshipData(data: any, relationshipType: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  switch (relationshipType) {
    case 'patient-immunization':
      if (!data.patientId) errors.push('Patient ID is required');
      if (!data.vaccineId) errors.push('Vaccine ID is required');
      if (!data.administrationDate) errors.push('Administration date is required');
      break;

    case 'facility-employee':
      if (!data.employeeId) errors.push('Employee ID is required');
      if (!data.facilityId) errors.push('Facility ID is required');
      if (!data.startDate) errors.push('Start date is required');
      break;

    case 'user-profile':
      if (!data.userId) errors.push('User ID is required');
      if (!data.profileId) errors.push('Profile ID is required');
      if (!['admin', 'employee', 'patient'].includes(data.profileType)) {
        errors.push('Invalid profile type');
      }
      break;

    default:
      errors.push('Unknown relationship type');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export default {
  RelationshipService,
  relationshipService,
  getRelationshipService,
  validateRelationshipData,
};