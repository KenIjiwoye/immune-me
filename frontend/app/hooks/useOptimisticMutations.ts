/**
 * Optimistic Mutation Hooks
 * Provides reusable hooks for CRUD operations with optimistic updates
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from './queryKeys';
import {
  withOptimisticUpdate,
  invalidateFacilityRelated,
  invalidatePatientRelated,
  invalidateVaccineRelated,
  invalidateFacilities,
  invalidatePatients,
  invalidateVaccines,
  invalidateImmunizationRecords,
  invalidateNotifications,
  invalidateProfiles,
} from './cacheUtils';

// =============================================================================
// FACILITY MUTATIONS
// =============================================================================

export const useCreateFacility = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (facilityData: any) => {
      // Replace with actual API call
      // return facilitiesService.create(facilityData);
      throw new Error('Implement actual API call');
    },
    onMutate: async (facilityData) => {
      return withOptimisticUpdate(
        queryKeys.facilities.lists(),
        'create',
        { ...facilityData, $id: 'temp-id' },
        () => Promise.resolve()
      );
    },
    onError: (error, variables, context) => {
      if (context?.rollback) {
        context.rollback();
      }
    },
    onSuccess: () => {
      invalidateFacilities();
    },
  });
};

export const useUpdateFacility = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      // Replace with actual API call
      // return facilitiesService.update(id, data);
      throw new Error('Implement actual API call');
    },
    onMutate: async ({ id, data }) => {
      const context = await withOptimisticUpdate(
        queryKeys.facilities.detail(id),
        'update',
        data,
        () => Promise.resolve()
      );

      // Also update the list
      await withOptimisticUpdate(
        queryKeys.facilities.lists(),
        'update',
        null, // We'll handle this in the list update
        () => Promise.resolve()
      );

      return context;
    },
    onError: (error, variables, context) => {
      if (context?.rollback) {
        context.rollback();
      }
    },
    onSuccess: (data, variables) => {
      invalidateFacilityRelated(variables.id);
    },
  });
};

export const useDeleteFacility = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Replace with actual API call
      // return facilitiesService.delete(id);
      throw new Error('Implement actual API call');
    },
    onMutate: async (id) => {
      const context = await withOptimisticUpdate(
        queryKeys.facilities.detail(id),
        'delete',
        null,
        () => Promise.resolve()
      );

      // Also remove from list
      await withOptimisticUpdate(
        queryKeys.facilities.lists(),
        'update',
        null, // We'll handle this in the list update
        () => Promise.resolve()
      );

      return context;
    },
    onError: (error, variables, context) => {
      if (context?.rollback) {
        context.rollback();
      }
    },
    onSuccess: (data, id) => {
      invalidateFacilityRelated(id);
    },
  });
};

// =============================================================================
// PATIENT MUTATIONS
// =============================================================================

export const useCreatePatient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (patientData: any) => {
      // Replace with actual API call
      // return patientsService.create(patientData);
      throw new Error('Implement actual API call');
    },
    onMutate: async (patientData) => {
      return withOptimisticUpdate(
        queryKeys.patients.lists(),
        'create',
        { ...patientData, $id: 'temp-id' },
        () => Promise.resolve()
      );
    },
    onError: (error, variables, context) => {
      if (context?.rollback) {
        context.rollback();
      }
    },
    onSuccess: () => {
      invalidatePatients();
    },
  });
};

export const useUpdatePatient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      // Replace with actual API call
      // return patientsService.update(id, data);
      throw new Error('Implement actual API call');
    },
    onMutate: async ({ id, data }) => {
      const context = await withOptimisticUpdate(
        queryKeys.patients.detail(id),
        'update',
        data,
        () => Promise.resolve()
      );

      return context;
    },
    onError: (error, variables, context) => {
      if (context?.rollback) {
        context.rollback();
      }
    },
    onSuccess: (data, variables) => {
      invalidatePatientRelated(variables.id);
    },
  });
};

// =============================================================================
// VACCINE MUTATIONS
// =============================================================================

export const useCreateVaccine = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (vaccineData: any) => {
      // Replace with actual API call
      // return vaccinesService.create(vaccineData);
      throw new Error('Implement actual API call');
    },
    onMutate: async (vaccineData) => {
      return withOptimisticUpdate(
        queryKeys.vaccines.lists(),
        'create',
        { ...vaccineData, $id: 'temp-id' },
        () => Promise.resolve()
      );
    },
    onError: (error, variables, context) => {
      if (context?.rollback) {
        context.rollback();
      }
    },
    onSuccess: () => {
      invalidateVaccines();
    },
  });
};

export const useUpdateVaccine = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      // Replace with actual API call
      // return vaccinesService.update(id, data);
      throw new Error('Implement actual API call');
    },
    onMutate: async ({ id, data }) => {
      const context = await withOptimisticUpdate(
        queryKeys.vaccines.detail(id),
        'update',
        data,
        () => Promise.resolve()
      );

      return context;
    },
    onError: (error, variables, context) => {
      if (context?.rollback) {
        context.rollback();
      }
    },
    onSuccess: (data, variables) => {
      invalidateVaccineRelated(variables.id);
    },
  });
};

// =============================================================================
// IMMUNIZATION RECORD MUTATIONS
// =============================================================================

export const useCreateImmunizationRecord = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (recordData: any) => {
      // Replace with actual API call
      // return immunizationRecordsService.create(recordData);
      throw new Error('Implement actual API call');
    },
    onMutate: async (recordData) => {
      return withOptimisticUpdate(
        queryKeys.immunizationRecords.lists(),
        'create',
        { ...recordData, $id: 'temp-id' },
        () => Promise.resolve()
      );
    },
    onError: (error, variables, context) => {
      if (context?.rollback) {
        context.rollback();
      }
    },
    onSuccess: () => {
      invalidateImmunizationRecords();
    },
  });
};

// =============================================================================
// NOTIFICATION MUTATIONS
// =============================================================================

export const useMarkNotificationAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      // Replace with actual API call
      // return notificationsService.markAsRead(notificationId);
      throw new Error('Implement actual API call');
    },
    onMutate: async (notificationId) => {
      const context = await withOptimisticUpdate(
        queryKeys.notifications.detail(notificationId),
        'update',
        { is_read: true },
        () => Promise.resolve()
      );

      return context;
    },
    onError: (error, variables, context) => {
      if (context?.rollback) {
        context.rollback();
      }
    },
    onSuccess: () => {
      invalidateNotifications();
    },
  });
};

// =============================================================================
// GENERIC OPTIMISTIC MUTATION HOOK
// =============================================================================

export const useOptimisticMutation = <TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options: {
    queryKey: readonly unknown[];
    operation: 'create' | 'update' | 'delete';
    getOptimisticData?: (variables: TVariables) => any;
    onSuccess?: (data: TData, variables: TVariables) => void;
  }
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onMutate: async (variables) => {
      const optimisticData = options.getOptimisticData?.(variables) || null;

      return withOptimisticUpdate(
        options.queryKey,
        options.operation,
        optimisticData,
        () => Promise.resolve()
      );
    },
    onError: (error, variables, context) => {
      if (context?.rollback) {
        context.rollback();
      }
    },
    onSuccess: (data, variables) => {
      options.onSuccess?.(data, variables);
    },
  });
};