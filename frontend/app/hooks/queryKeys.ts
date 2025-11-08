/**
 * Query Key Factories for React Query
 * Provides consistent query key patterns for all entities
 */

export const queryKeys = {
  // Facilities
  facilities: {
    all: ['facilities'] as const,
    lists: () => [...queryKeys.facilities.all, 'list'] as const,
    list: (filters: Record<string, unknown>) => [...queryKeys.facilities.lists(), filters] as const,
    details: () => [...queryKeys.facilities.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.facilities.details(), id] as const,
    search: (query: string) => [...queryKeys.facilities.all, 'search', query] as const,
    byDistrict: (district: string) => [...queryKeys.facilities.all, 'district', district] as const,
  },

  // Patients
  patients: {
    all: ['patients'] as const,
    lists: () => [...queryKeys.patients.all, 'list'] as const,
    list: (filters: Record<string, unknown>) => [...queryKeys.patients.lists(), filters] as const,
    details: () => [...queryKeys.patients.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.patients.details(), id] as const,
    search: (query: string) => [...queryKeys.patients.all, 'search', query] as const,
    byFacility: (facilityId: string) => [...queryKeys.patients.all, 'facility', facilityId] as const,
    byHealthWorker: (healthWorkerId: string) => [...queryKeys.patients.all, 'healthWorker', healthWorkerId] as const,
    byDistrict: (district: string) => [...queryKeys.patients.all, 'district', district] as const,
  },

  // Vaccines
  vaccines: {
    all: ['vaccines'] as const,
    lists: () => [...queryKeys.vaccines.all, 'list'] as const,
    list: (filters: Record<string, unknown>) => [...queryKeys.vaccines.lists(), filters] as const,
    details: () => [...queryKeys.vaccines.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.vaccines.details(), id] as const,
    active: () => [...queryKeys.vaccines.all, 'active'] as const,
    byDisease: (disease: string) => [...queryKeys.vaccines.all, 'disease', disease] as const,
    byAgeGroup: (ageGroup: string) => [...queryKeys.vaccines.all, 'ageGroup', ageGroup] as const,
  },

  // Immunization Records
  immunizationRecords: {
    all: ['immunizationRecords'] as const,
    lists: () => [...queryKeys.immunizationRecords.all, 'list'] as const,
    list: (filters: Record<string, unknown>) => [...queryKeys.immunizationRecords.lists(), filters] as const,
    details: () => [...queryKeys.immunizationRecords.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.immunizationRecords.details(), id] as const,
    byPatient: (patientId: string) => [...queryKeys.immunizationRecords.all, 'patient', patientId] as const,
    byFacility: (facilityId: string) => [...queryKeys.immunizationRecords.all, 'facility', facilityId] as const,
    byVaccine: (vaccineId: string) => [...queryKeys.immunizationRecords.all, 'vaccine', vaccineId] as const,
    byDateRange: (startDate: string, endDate: string, facilityId?: string) =>
      [...queryKeys.immunizationRecords.all, 'dateRange', startDate, endDate, facilityId] as const,
  },

  // Notifications
  notifications: {
    all: ['notifications'] as const,
    lists: () => [...queryKeys.notifications.all, 'list'] as const,
    list: (filters: Record<string, unknown>) => [...queryKeys.notifications.lists(), filters] as const,
    details: () => [...queryKeys.notifications.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.notifications.details(), id] as const,
    byRecipient: (recipientId: string) => [...queryKeys.notifications.all, 'recipient', recipientId] as const,
    unread: (recipientId: string) => [...queryKeys.notifications.all, 'unread', recipientId] as const,
    byFacility: (facilityId: string) => [...queryKeys.notifications.all, 'facility', facilityId] as const,
    byPriority: (priority: string) => [...queryKeys.notifications.all, 'priority', priority] as const,
  },

  // Profiles
  profiles: {
    all: ['profiles'] as const,
    admin: {
      all: ['profiles', 'admin'] as const,
      lists: () => [...queryKeys.profiles.admin.all, 'list'] as const,
      list: (filters: Record<string, unknown>) => [...queryKeys.profiles.admin.lists(), filters] as const,
      details: () => [...queryKeys.profiles.admin.all, 'detail'] as const,
      detail: (id: string) => [...queryKeys.profiles.admin.details(), id] as const,
      byUserId: (userId: string) => [...queryKeys.profiles.admin.all, 'userId', userId] as const,
      byAdminLevel: (adminLevel: string) => [...queryKeys.profiles.admin.all, 'adminLevel', adminLevel] as const,
    },
    employee: {
      all: ['profiles', 'employee'] as const,
      lists: () => [...queryKeys.profiles.employee.all, 'list'] as const,
      list: (filters: Record<string, unknown>) => [...queryKeys.profiles.employee.lists(), filters] as const,
      details: () => [...queryKeys.profiles.employee.all, 'detail'] as const,
      detail: (id: string) => [...queryKeys.profiles.employee.details(), id] as const,
      byUserId: (userId: string) => [...queryKeys.profiles.employee.all, 'userId', userId] as const,
      byFacility: (facilityId: string) => [...queryKeys.profiles.employee.all, 'facility', facilityId] as const,
      byEmployeeType: (employeeType: string) => [...queryKeys.profiles.employee.all, 'employeeType', employeeType] as const,
    },
    patient: {
      all: ['profiles', 'patient'] as const,
      lists: () => [...queryKeys.profiles.patient.all, 'list'] as const,
      list: (filters: Record<string, unknown>) => [...queryKeys.profiles.patient.lists(), filters] as const,
      details: () => [...queryKeys.profiles.patient.all, 'detail'] as const,
      detail: (id: string) => [...queryKeys.profiles.patient.details(), id] as const,
      byUserId: (userId: string) => [...queryKeys.profiles.patient.all, 'userId', userId] as const,
      byFacility: (facilityId: string) => [...queryKeys.profiles.patient.all, 'facility', facilityId] as const,
      byVerificationStatus: (status: string) => [...queryKeys.profiles.patient.all, 'verificationStatus', status] as const,
    },
  },

  // Supplementary Immunizations
  supplementaryImmunizations: {
    all: ['supplementaryImmunizations'] as const,
    lists: () => [...queryKeys.supplementaryImmunizations.all, 'list'] as const,
    list: (filters: Record<string, unknown>) => [...queryKeys.supplementaryImmunizations.lists(), filters] as const,
    details: () => [...queryKeys.supplementaryImmunizations.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.supplementaryImmunizations.details(), id] as const,
  },

  // Vaccine Schedules
  vaccineSchedules: {
    all: ['vaccineSchedules'] as const,
    lists: () => [...queryKeys.vaccineSchedules.all, 'list'] as const,
    list: (filters: Record<string, unknown>) => [...queryKeys.vaccineSchedules.lists(), filters] as const,
    details: () => [...queryKeys.vaccineSchedules.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.vaccineSchedules.details(), id] as const,
  },

  // Vaccine Schedule Items
  vaccineScheduleItems: {
    all: ['vaccineScheduleItems'] as const,
    lists: () => [...queryKeys.vaccineScheduleItems.all, 'list'] as const,
    list: (filters: Record<string, unknown>) => [...queryKeys.vaccineScheduleItems.lists(), filters] as const,
    details: () => [...queryKeys.vaccineScheduleItems.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.vaccineScheduleItems.details(), id] as const,
  },

  // Audit Logs
  auditLogs: {
    all: ['auditLogs'] as const,
    lists: () => [...queryKeys.auditLogs.all, 'list'] as const,
    list: (filters: Record<string, unknown>) => [...queryKeys.auditLogs.lists(), filters] as const,
    details: () => [...queryKeys.auditLogs.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.auditLogs.details(), id] as const,
  },

  // Sync Collections
  syncCollections: {
    all: ['syncCollections'] as const,
    lists: () => [...queryKeys.syncCollections.all, 'list'] as const,
    list: (filters: Record<string, unknown>) => [...queryKeys.syncCollections.lists(), filters] as const,
    details: () => [...queryKeys.syncCollections.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.syncCollections.details(), id] as const,
  },
} as const;