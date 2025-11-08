/**
 * Cache Invalidation and Optimistic Update Utilities
 * Provides utilities for invalidating related queries and managing optimistic updates
 */

import { queryClient } from '../../context/queryClient';
import { queryKeys } from './queryKeys';

// =============================================================================
// CACHE INVALIDATION UTILITIES
// =============================================================================

/**
 * Invalidate all facility-related queries
 */
export const invalidateFacilities = () => {
  queryClient.invalidateQueries({ queryKey: queryKeys.facilities.all });
};

/**
 * Invalidate all patient-related queries
 */
export const invalidatePatients = () => {
  queryClient.invalidateQueries({ queryKey: queryKeys.patients.all });
};

/**
 * Invalidate all vaccine-related queries
 */
export const invalidateVaccines = () => {
  queryClient.invalidateQueries({ queryKey: queryKeys.vaccines.all });
};

/**
 * Invalidate all immunization record-related queries
 */
export const invalidateImmunizationRecords = () => {
  queryClient.invalidateQueries({ queryKey: queryKeys.immunizationRecords.all });
};

/**
 * Invalidate all notification-related queries
 */
export const invalidateNotifications = () => {
  queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
};

/**
 * Invalidate all profile-related queries
 */
export const invalidateProfiles = () => {
  queryClient.invalidateQueries({ queryKey: queryKeys.profiles.all });
};

/**
 * Invalidate facility-specific queries when a facility is modified
 */
export const invalidateFacilityRelated = (facilityId: string) => {
  // Invalidate facility detail
  queryClient.invalidateQueries({ queryKey: queryKeys.facilities.detail(facilityId) });

  // Invalidate patients by facility
  queryClient.invalidateQueries({ queryKey: queryKeys.patients.byFacility(facilityId) });

  // Invalidate immunization records by facility
  queryClient.invalidateQueries({ queryKey: queryKeys.immunizationRecords.byFacility(facilityId) });

  // Invalidate employee profiles by facility
  queryClient.invalidateQueries({ queryKey: queryKeys.profiles.employee.byFacility(facilityId) });

  // Invalidate patient profiles by facility
  queryClient.invalidateQueries({ queryKey: queryKeys.profiles.patient.byFacility(facilityId) });

  // Invalidate notifications by facility
  queryClient.invalidateQueries({ queryKey: queryKeys.notifications.byFacility(facilityId) });
};

/**
 * Invalidate patient-specific queries when a patient is modified
 */
export const invalidatePatientRelated = (patientId: string) => {
  // Invalidate patient detail
  queryClient.invalidateQueries({ queryKey: queryKeys.patients.detail(patientId) });

  // Invalidate immunization records by patient
  queryClient.invalidateQueries({ queryKey: queryKeys.immunizationRecords.byPatient(patientId) });

  // Invalidate patient profile by user ID (if patient has a profile)
  // Note: This assumes patientId might be related to userId, adjust as needed
};

/**
 * Invalidate vaccine-specific queries when a vaccine is modified
 */
export const invalidateVaccineRelated = (vaccineId: string) => {
  // Invalidate vaccine detail
  queryClient.invalidateQueries({ queryKey: queryKeys.vaccines.detail(vaccineId) });

  // Invalidate immunization records by vaccine
  queryClient.invalidateQueries({ queryKey: queryKeys.immunizationRecords.byVaccine(vaccineId) });
};

// =============================================================================
// OPTIMISTIC UPDATE UTILITIES
// =============================================================================

/**
 * Optimistic update for creating a facility
 */
export const optimisticCreateFacility = async <T>(
  facilityData: T,
  createFn: () => Promise<any>
) => {
  // Cancel any outgoing refetches
  await queryClient.cancelQueries({ queryKey: queryKeys.facilities.lists() });

  // Snapshot the previous value
  const previousFacilities = queryClient.getQueryData(queryKeys.facilities.lists());

  // Optimistically update to the new value
  queryClient.setQueryData(queryKeys.facilities.lists(), (old: any) => {
    if (!old) return old;
    return {
      ...old,
      documents: [...old.documents, { ...facilityData, $id: 'temp-id' }],
    };
  });

  // Return a context object with the snapshotted value
  return {
    previousFacilities,
    rollback: () => {
      queryClient.setQueryData(queryKeys.facilities.lists(), previousFacilities);
    },
  };
};

/**
 * Optimistic update for updating a facility
 */
export const optimisticUpdateFacility = async <T>(
  facilityId: string,
  facilityData: T,
  updateFn: () => Promise<any>
) => {
  // Cancel any outgoing refetches
  await queryClient.cancelQueries({ queryKey: queryKeys.facilities.detail(facilityId) });
  await queryClient.cancelQueries({ queryKey: queryKeys.facilities.lists() });

  // Snapshot the previous values
  const previousFacility = queryClient.getQueryData(queryKeys.facilities.detail(facilityId));
  const previousFacilities = queryClient.getQueryData(queryKeys.facilities.lists());

  // Optimistically update the detail
  queryClient.setQueryData(queryKeys.facilities.detail(facilityId), facilityData);

  // Optimistically update the list
  queryClient.setQueryData(queryKeys.facilities.lists(), (old: any) => {
    if (!old) return old;
    return {
      ...old,
      documents: old.documents.map((facility: any) =>
        facility.$id === facilityId ? { ...facility, ...facilityData } : facility
      ),
    };
  });

  // Return a context object with the snapshotted values
  return {
    previousFacility,
    previousFacilities,
    rollback: () => {
      queryClient.setQueryData(queryKeys.facilities.detail(facilityId), previousFacility);
      queryClient.setQueryData(queryKeys.facilities.lists(), previousFacilities);
    },
  };
};

/**
 * Optimistic update for deleting a facility
 */
export const optimisticDeleteFacility = async (
  facilityId: string,
  deleteFn: () => Promise<any>
) => {
  // Cancel any outgoing refetches
  await queryClient.cancelQueries({ queryKey: queryKeys.facilities.detail(facilityId) });
  await queryClient.cancelQueries({ queryKey: queryKeys.facilities.lists() });

  // Snapshot the previous values
  const previousFacility = queryClient.getQueryData(queryKeys.facilities.detail(facilityId));
  const previousFacilities = queryClient.getQueryData(queryKeys.facilities.lists());

  // Optimistically remove from detail
  queryClient.removeQueries({ queryKey: queryKeys.facilities.detail(facilityId) });

  // Optimistically remove from list
  queryClient.setQueryData(queryKeys.facilities.lists(), (old: any) => {
    if (!old) return old;
    return {
      ...old,
      documents: old.documents.filter((facility: any) => facility.$id !== facilityId),
    };
  });

  // Return a context object with the snapshotted values
  return {
    previousFacility,
    previousFacilities,
    rollback: () => {
      if (previousFacility) {
        queryClient.setQueryData(queryKeys.facilities.detail(facilityId), previousFacility);
      }
      queryClient.setQueryData(queryKeys.facilities.lists(), previousFacilities);
    },
  };
};

/**
 * Generic optimistic update wrapper for any CRUD operation
 */
export const withOptimisticUpdate = async <T>(
  queryKey: readonly unknown[],
  operation: 'create' | 'update' | 'delete',
  optimisticData: T | null,
  apiCall: () => Promise<any>
) => {
  // Cancel any outgoing refetches
  await queryClient.cancelQueries({ queryKey });

  // Snapshot the previous value
  const previousData = queryClient.getQueryData(queryKey);

  // Apply optimistic update based on operation
  if (operation === 'create' && optimisticData) {
    queryClient.setQueryData(queryKey, (old: any) => {
      if (!old) return optimisticData;
      if (Array.isArray(old)) {
        return [...old, optimisticData];
      }
      return optimisticData;
    });
  } else if (operation === 'update' && optimisticData) {
    queryClient.setQueryData(queryKey, optimisticData);
  } else if (operation === 'delete') {
    queryClient.removeQueries({ queryKey });
  }

  // Return rollback function
  return {
    previousData,
    rollback: () => {
      queryClient.setQueryData(queryKey, previousData);
    },
  };
};

// =============================================================================
// BATCH INVALIDATION UTILITIES
// =============================================================================

/**
 * Invalidate all queries (useful for major data changes)
 */
export const invalidateAll = () => {
  queryClient.invalidateQueries();
};

/**
 * Invalidate queries related to a specific user
 */
export const invalidateUserRelated = (userId: string) => {
  // Invalidate profile queries
  queryClient.invalidateQueries({ queryKey: queryKeys.profiles.admin.byUserId(userId) });
  queryClient.invalidateQueries({ queryKey: queryKeys.profiles.employee.byUserId(userId) });
  queryClient.invalidateQueries({ queryKey: queryKeys.profiles.patient.byUserId(userId) });

  // Invalidate notifications
  queryClient.invalidateQueries({ queryKey: queryKeys.notifications.byRecipient(userId) });
  queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unread(userId) });
};