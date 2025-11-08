import { useQuery, useMutation, useQueryClient, UseQueryOptions, QueryKey } from '@tanstack/react-query';
import profileService from '../services/profileService';
import {
  AdminProfiles,
  EmployeeProfiles,
  PatientProfiles,
  Profile,
  ProfileType,
  ProfileWithUser,
  ProfileWithFacility,
  ProfileWithVerification,
  ProfileWithRoleHistory,
  ProfileQueryOptions,
  CreateProfileData,
  UpdateProfileData,
  NewAdminProfile,
  NewEmployeeProfile,
  NewPatientProfile,
  AdminProfileUpdate,
  EmployeeProfileUpdate,
  PatientProfileUpdate,
} from '../types/profile';
import type { AdminProfile, EmployeeProfile, PatientProfile } from '../types/appwrite';

// Query keys for Profile-related queries
export const profileKeys = {
  all: ['profiles'] as const,

  // User profile detection
  userProfile: (userId: string) => [...profileKeys.all, 'user', userId] as const,
  userWithProfile: (userId: string) => [...profileKeys.all, 'userWithProfile', userId] as const,

  // Patient profiles
  patients: () => [...profileKeys.all, 'patient'] as const,
  patientLists: () => [...profileKeys.patients(), 'list'] as const,
  patientList: (filters: ProfileQueryOptions) => [...profileKeys.patientLists(), filters] as const,
  patientDetails: () => [...profileKeys.patients(), 'detail'] as const,
  patientDetail: (id: string) => [...profileKeys.patientDetails(), id] as const,
  patientByUser: (userId: string) => [...profileKeys.patients(), 'byUser', userId] as const,
  patientByPatientId: (patientId: string) => [...profileKeys.patients(), 'byPatientId', patientId] as const,

  // Employee profiles
  employees: () => [...profileKeys.all, 'employee'] as const,
  employeeLists: () => [...profileKeys.employees(), 'list'] as const,
  employeeList: (filters: ProfileQueryOptions) => [...profileKeys.employeeLists(), filters] as const,
  employeeDetails: () => [...profileKeys.employees(), 'detail'] as const,
  employeeDetail: (id: string) => [...profileKeys.employeeDetails(), id] as const,
  employeeByUser: (userId: string) => [...profileKeys.employees(), 'byUser', userId] as const,
  employeeByEmployeeId: (employeeId: string) => [...profileKeys.employees(), 'byEmployeeId', employeeId] as const,
  employeesByFacility: (facilityId: string) => [...profileKeys.employees(), 'facility', facilityId] as const,
  employeesByType: (employeeType: string) => [...profileKeys.employees(), 'type', employeeType] as const,

  // Admin profiles
  admins: () => [...profileKeys.all, 'admin'] as const,
  adminLists: () => [...profileKeys.admins(), 'list'] as const,
  adminList: (filters: ProfileQueryOptions) => [...profileKeys.adminLists(), filters] as const,
  adminDetails: () => [...profileKeys.admins(), 'detail'] as const,
  adminDetail: (id: string) => [...profileKeys.adminDetails(), id] as const,
  adminByUser: (userId: string) => [...profileKeys.admins(), 'byUser', userId] as const,

  // Profile relationships
  profileWithUser: (profileId: string) => [...profileKeys.all, 'withUser', profileId] as const,
  profileWithFacility: (profileId: string) => [...profileKeys.all, 'withFacility', profileId] as const,
  profileWithVerification: (profileId: string) => [...profileKeys.all, 'withVerification', profileId] as const,
  profileWithRoleHistory: (profileId: string) => [...profileKeys.all, 'withRoleHistory', profileId] as const,

  // Profile switching
  availableProfiles: (userId: string) => [...profileKeys.all, 'available', userId] as const,
};

// Profile type detection hook
export const useProfileType = (userId: string, options?: Omit<UseQueryOptions<{ type: ProfileType; profile: Profile | null }, Error, { type: ProfileType; profile: Profile | null }, QueryKey>, 'queryKey' | 'queryFn'>) => {
  return useQuery({
    queryKey: profileKeys.userProfile(userId),
    queryFn: () => profileService.detectProfileType(userId),
    enabled: !!userId,
    ...options,
  });
};

// User with profile hook
export const useUserWithProfile = (userId: string, options?: Omit<UseQueryOptions<{
  $id: string;
  email: string;
  name: string;
  profileType: ProfileType;
  profile: Profile | null;
  role: 'admin' | 'employee' | 'patient';
  facilityId?: string;
  permissions: string[];
}, Error, {
  $id: string;
  email: string;
  name: string;
  profileType: ProfileType;
  profile: Profile | null;
  role: 'admin' | 'employee' | 'patient';
  facilityId?: string;
  permissions: string[];
}, QueryKey>, 'queryKey' | 'queryFn'>) => {
  return useQuery({
    queryKey: profileKeys.userWithProfile(userId),
    queryFn: () => profileService.getUserWithProfile(userId),
    enabled: !!userId,
    ...options,
  });
};

// Patient Profile Hooks
export const usePatientProfiles = (params: ProfileQueryOptions = {}, options?: Omit<UseQueryOptions<PatientProfiles, Error, PatientProfiles, QueryKey>, 'queryKey' | 'queryFn'>) => {
  return useQuery({
    queryKey: profileKeys.patientList(params),
    queryFn: async () => {
      const result = await profileService.patient.list(params);
      return result.documents || [];
    },
    ...options,
  });
};

export const usePatientProfile = (profileId: string, options?: Omit<UseQueryOptions<PatientProfile, Error, PatientProfile, QueryKey>, 'queryKey' | 'queryFn'>) => {
  return useQuery({
    queryKey: profileKeys.patientDetail(profileId),
    queryFn: async () => {
      const result = await profileService.patient.list({ limit: 1, queries: [`equal("$id", "${profileId}")`] });
      return result.documents?.[0] || null;
    },
    enabled: !!profileId,
    ...options,
  });
};

export const usePatientProfileByUser = (userId: string, options?: Omit<UseQueryOptions<PatientProfile | null, Error, PatientProfile | null, QueryKey>, 'queryKey' | 'queryFn'>) => {
  return useQuery({
    queryKey: profileKeys.patientByUser(userId),
    queryFn: () => profileService.patient.getByUserId(userId),
    enabled: !!userId,
    ...options,
  });
};

export const usePatientProfileByPatientId = (patientId: string, options?: Omit<UseQueryOptions<PatientProfile | null, Error, PatientProfile | null, QueryKey>, 'queryKey' | 'queryFn'>) => {
  return useQuery({
    queryKey: profileKeys.patientByPatientId(patientId),
    queryFn: async () => {
      const result = await profileService.patient.list({ limit: 1, queries: [`equal("patient_id", "${patientId}")`] });
      return result.documents?.[0] || null;
    },
    enabled: !!patientId,
    ...options,
  });
};

export const useCreatePatientProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: NewPatientProfile) => profileService.patient.create(data),
    onSuccess: (response) => {
      console.log('Patient profile created successfully:', response);
      queryClient.invalidateQueries({ queryKey: profileKeys.patientLists() });
      if (response.user_id) {
        queryClient.invalidateQueries({ queryKey: profileKeys.patientByUser(response.user_id) });
      }
      if (response.patient_id) {
        queryClient.invalidateQueries({ queryKey: profileKeys.patientByPatientId(response.patient_id) });
      }
    },
    onError: (error) => {
      console.error('Failed to create patient profile:', error);
    },
  });
};

export const useUpdatePatientProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ profileId, data }: { profileId: string; data: PatientProfileUpdate }) =>
      profileService.patient.update(profileId, data),
    onSuccess: (response) => {
      console.log('Patient profile updated successfully:', response);
      queryClient.invalidateQueries({ queryKey: profileKeys.patientLists() });
      queryClient.invalidateQueries({ queryKey: profileKeys.patientDetail(response.$id) });
      if (response.user_id) {
        queryClient.invalidateQueries({ queryKey: profileKeys.patientByUser(response.user_id) });
      }
    },
    onError: (error) => {
      console.error('Failed to update patient profile:', error);
    },
  });
};

export const useDeletePatientProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (profileId: string) => profileService.patient.delete(profileId),
    onSuccess: () => {
      console.log('Patient profile deleted successfully');
      queryClient.invalidateQueries({ queryKey: profileKeys.patientLists() });
    },
    onError: (error) => {
      console.error('Failed to delete patient profile:', error);
    },
  });
};

// Employee Profile Hooks
export const useEmployeeProfiles = (params: ProfileQueryOptions = {}, options?: Omit<UseQueryOptions<EmployeeProfiles, Error, EmployeeProfiles, QueryKey>, 'queryKey' | 'queryFn'>) => {
  return useQuery({
    queryKey: profileKeys.employeeList(params),
    queryFn: async () => {
      const result = await profileService.employee.list(params);
      return result.documents || [];
    },
    ...options,
  });
};

export const useEmployeeProfile = (profileId: string, options?: Omit<UseQueryOptions<EmployeeProfile, Error, EmployeeProfile, QueryKey>, 'queryKey' | 'queryFn'>) => {
  return useQuery({
    queryKey: profileKeys.employeeDetail(profileId),
    queryFn: async () => {
      const result = await profileService.employee.list({ limit: 1, queries: [`equal("$id", "${profileId}")`] });
      return result.documents?.[0] || null;
    },
    enabled: !!profileId,
    ...options,
  });
};

export const useEmployeeProfileByUser = (userId: string, options?: Omit<UseQueryOptions<EmployeeProfile | null, Error, EmployeeProfile | null, QueryKey>, 'queryKey' | 'queryFn'>) => {
  return useQuery({
    queryKey: profileKeys.employeeByUser(userId),
    queryFn: () => profileService.employee.getByUserId(userId),
    enabled: !!userId,
    ...options,
  });
};

export const useEmployeesByFacility = (facilityId: string, params: ProfileQueryOptions = {}, options?: Omit<UseQueryOptions<EmployeeProfile[], Error, EmployeeProfile[], QueryKey>, 'queryKey' | 'queryFn'>) => {
  return useQuery({
    queryKey: profileKeys.employeesByFacility(facilityId),
    queryFn: () => profileService.employee.getByFacility(facilityId),
    enabled: !!facilityId,
    ...options,
  });
};

export const useEmployeesByType = (employeeType: string, params: ProfileQueryOptions = {}, options?: Omit<UseQueryOptions<EmployeeProfile[], Error, EmployeeProfile[], QueryKey>, 'queryKey' | 'queryFn'>) => {
  return useQuery({
    queryKey: profileKeys.employeesByType(employeeType),
    queryFn: () => profileService.employee.getByEmployeeType(employeeType),
    enabled: !!employeeType,
    ...options,
  });
};

export const useCreateEmployeeProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: NewEmployeeProfile) => profileService.employee.create(data),
    onSuccess: (response) => {
      console.log('Employee profile created successfully:', response);
      queryClient.invalidateQueries({ queryKey: profileKeys.employeeLists() });
      if (response.user_id) {
        queryClient.invalidateQueries({ queryKey: profileKeys.employeeByUser(response.user_id) });
      }
      if (response.primary_facility_id) {
        queryClient.invalidateQueries({ queryKey: profileKeys.employeesByFacility(response.primary_facility_id) });
      }
    },
    onError: (error) => {
      console.error('Failed to create employee profile:', error);
    },
  });
};

export const useUpdateEmployeeProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ profileId, data }: { profileId: string; data: EmployeeProfileUpdate }) =>
      profileService.employee.update(profileId, data),
    onSuccess: (response) => {
      console.log('Employee profile updated successfully:', response);
      queryClient.invalidateQueries({ queryKey: profileKeys.employeeLists() });
      queryClient.invalidateQueries({ queryKey: profileKeys.employeeDetail(response.$id) });
      if (response.user_id) {
        queryClient.invalidateQueries({ queryKey: profileKeys.employeeByUser(response.user_id) });
      }
    },
    onError: (error) => {
      console.error('Failed to update employee profile:', error);
    },
  });
};

export const useDeleteEmployeeProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (profileId: string) => profileService.employee.delete(profileId),
    onSuccess: () => {
      console.log('Employee profile deleted successfully');
      queryClient.invalidateQueries({ queryKey: profileKeys.employeeLists() });
    },
    onError: (error) => {
      console.error('Failed to delete employee profile:', error);
    },
  });
};

// Admin Profile Hooks
export const useAdminProfiles = (params: ProfileQueryOptions = {}, options?: Omit<UseQueryOptions<AdminProfiles, Error, AdminProfiles, QueryKey>, 'queryKey' | 'queryFn'>) => {
  return useQuery({
    queryKey: profileKeys.adminList(params),
    queryFn: async () => {
      const result = await profileService.admin.list(params);
      return result.documents || [];
    },
    ...options,
  });
};

export const useAdminProfile = (profileId: string, options?: Omit<UseQueryOptions<AdminProfile, Error, AdminProfile, QueryKey>, 'queryKey' | 'queryFn'>) => {
  return useQuery({
    queryKey: profileKeys.adminDetail(profileId),
    queryFn: async () => {
      const result = await profileService.admin.list({ limit: 1, queries: [`equal("$id", "${profileId}")`] });
      return result.documents?.[0] || null;
    },
    enabled: !!profileId,
    ...options,
  });
};

export const useAdminProfileByUser = (userId: string, options?: Omit<UseQueryOptions<AdminProfile | null, Error, AdminProfile | null, QueryKey>, 'queryKey' | 'queryFn'>) => {
  return useQuery({
    queryKey: profileKeys.adminByUser(userId),
    queryFn: () => profileService.admin.getByUserId(userId),
    enabled: !!userId,
    ...options,
  });
};

export const useCreateAdminProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: NewAdminProfile) => profileService.admin.create(data),
    onSuccess: (response) => {
      console.log('Admin profile created successfully:', response);
      queryClient.invalidateQueries({ queryKey: profileKeys.adminLists() });
      if (response.user_id) {
        queryClient.invalidateQueries({ queryKey: profileKeys.adminByUser(response.user_id) });
      }
    },
    onError: (error) => {
      console.error('Failed to create admin profile:', error);
    },
  });
};

export const useUpdateAdminProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ profileId, data }: { profileId: string; data: AdminProfileUpdate }) =>
      profileService.admin.update(profileId, data),
    onSuccess: (response) => {
      console.log('Admin profile updated successfully:', response);
      queryClient.invalidateQueries({ queryKey: profileKeys.adminLists() });
      queryClient.invalidateQueries({ queryKey: profileKeys.adminDetail(response.$id) });
      if (response.user_id) {
        queryClient.invalidateQueries({ queryKey: profileKeys.adminByUser(response.user_id) });
      }
    },
    onError: (error) => {
      console.error('Failed to update admin profile:', error);
    },
  });
};

export const useDeleteAdminProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (profileId: string) => profileService.admin.delete(profileId),
    onSuccess: () => {
      console.log('Admin profile deleted successfully');
      queryClient.invalidateQueries({ queryKey: profileKeys.adminLists() });
    },
    onError: (error) => {
      console.error('Failed to delete admin profile:', error);
    },
  });
};

// Profile Relationship Hooks
export const useProfileWithUser = (profileId: string, options?: Omit<UseQueryOptions<ProfileWithUser<Profile>, Error, ProfileWithUser<Profile>, QueryKey>, 'queryKey' | 'queryFn'>) => {
  return useQuery({
    queryKey: profileKeys.profileWithUser(profileId),
    queryFn: async () => {
      // For now, just return the profile - relationship expansion would need additional service methods
      const employeeResult = await profileService.employee.list({ limit: 1, queries: [`equal("$id", "${profileId}")`] });
      const adminResult = await profileService.admin.list({ limit: 1, queries: [`equal("$id", "${profileId}")`] });

      const profile = employeeResult.documents?.[0] || adminResult.documents?.[0];
      return profile ? { ...profile, user: null } : null; // User relationship not implemented yet
    },
    enabled: !!profileId,
    ...options,
  });
};

export const useProfileWithFacility = (profileId: string, options?: Omit<UseQueryOptions<ProfileWithFacility<Profile>, Error, ProfileWithFacility<Profile>, QueryKey>, 'queryKey' | 'queryFn'>) => {
  return useQuery({
    queryKey: profileKeys.profileWithFacility(profileId),
    queryFn: async () => {
      // For now, just return the profile - relationship expansion would need additional service methods
      const employeeResult = await profileService.employee.list({ limit: 1, queries: [`equal("$id", "${profileId}")`] });
      const adminResult = await profileService.admin.list({ limit: 1, queries: [`equal("$id", "${profileId}")`] });

      const profile = employeeResult.documents?.[0] || adminResult.documents?.[0];
      return profile ? { ...profile, facility: null } : null; // Facility relationship not implemented yet
    },
    enabled: !!profileId,
    ...options,
  });
};

export const useProfileWithVerification = (profileId: string, options?: Omit<UseQueryOptions<ProfileWithVerification<Profile>, Error, ProfileWithVerification<Profile>, QueryKey>, 'queryKey' | 'queryFn'>) => {
  return useQuery({
    queryKey: profileKeys.profileWithVerification(profileId),
    queryFn: async () => {
      // For now, just return the profile - relationship expansion would need additional service methods
      const employeeResult = await profileService.employee.list({ limit: 1, queries: [`equal("$id", "${profileId}")`] });
      const adminResult = await profileService.admin.list({ limit: 1, queries: [`equal("$id", "${profileId}")`] });

      const profile = employeeResult.documents?.[0] || adminResult.documents?.[0];
      return profile ? { ...profile, verificationWorkflow: null } : null; // Verification relationship not implemented yet
    },
    enabled: !!profileId,
    ...options,
  });
};

export const useProfileWithRoleHistory = (profileId: string, options?: Omit<UseQueryOptions<ProfileWithRoleHistory<Profile>, Error, ProfileWithRoleHistory<Profile>, QueryKey>, 'queryKey' | 'queryFn'>) => {
  return useQuery({
    queryKey: profileKeys.profileWithRoleHistory(profileId),
    queryFn: async () => {
      // For now, just return the profile - relationship expansion would need additional service methods
      const employeeResult = await profileService.employee.list({ limit: 1, queries: [`equal("$id", "${profileId}")`] });
      const adminResult = await profileService.admin.list({ limit: 1, queries: [`equal("$id", "${profileId}")`] });

      const profile = employeeResult.documents?.[0] || adminResult.documents?.[0];
      return profile ? { ...profile, roleChanges: [] } : null; // Role history relationship not implemented yet
    },
    enabled: !!profileId,
    ...options,
  });
};

// Profile Switching Hooks
export const useAvailableProfiles = (userId: string, options?: Omit<UseQueryOptions<{ type: ProfileType; profile: Profile }[], Error, { type: ProfileType; profile: Profile }[], QueryKey>, 'queryKey' | 'queryFn'>) => {
  return useQuery({
    queryKey: profileKeys.availableProfiles(userId),
    queryFn: () => profileService.switching.getAvailableProfiles(userId),
    enabled: !!userId,
    ...options,
  });
};

export const useHasMultipleProfiles = (userId: string, options?: Omit<UseQueryOptions<boolean, Error, boolean, QueryKey>, 'queryKey' | 'queryFn'>) => {
  return useQuery({
    queryKey: [...profileKeys.availableProfiles(userId), 'hasMultiple'],
    queryFn: () => profileService.switching.hasMultipleProfiles(userId),
    enabled: !!userId,
    ...options,
  });
};

export const useSwitchProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, targetProfileType }: { userId: string; targetProfileType: ProfileType }) =>
      profileService.switching.switchProfile(userId, targetProfileType),
    onSuccess: (result, variables) => {
      console.log('Profile switched successfully:', result);
      // Invalidate all profile-related queries for this user
      queryClient.invalidateQueries({ queryKey: profileKeys.userProfile(variables.userId) });
      queryClient.invalidateQueries({ queryKey: profileKeys.userWithProfile(variables.userId) });
      queryClient.invalidateQueries({ queryKey: profileKeys.availableProfiles(variables.userId) });
    },
    onError: (error) => {
      console.error('Failed to switch profile:', error);
    },
  });
};

// Utility hooks
export const useProfilePermissions = (profile: Profile | null) => {
  return {
    hasPermission: (permission: string) => {
      if (!profile) return false;
      if ('system_permissions' in profile) {
        return profile.system_permissions?.includes(permission as any) || false;
      }
      return false;
    },
    canAccessFacility: (facilityId: string) => {
      if (!profile) return false;
      // Simple facility access check - can be expanded
      if ('facility_id' in profile) {
        return profile.facility_id === facilityId;
      }
      if ('primary_facility_id' in profile) {
        return profile.primary_facility_id === facilityId;
      }
      return false;
    },
    getFacilityAccess: () => {
      if (!profile) return [];
      if ('assigned_facilities' in profile && profile.assigned_facilities) {
        return profile.assigned_facilities;
      }
      if ('accessible_facilities' in profile && profile.accessible_facilities) {
        return profile.accessible_facilities;
      }
      const facilityId = 'facility_id' in profile ? profile.facility_id : ('primary_facility_id' in profile ? profile.primary_facility_id : undefined);
      return facilityId ? [facilityId] : [];
    },
    isLicenseValid: () => profile && 'license_expiry_date' in profile ? profileService.utils.isLicenseValid(profile as EmployeeProfile) : true,
  };
};

// Combined hook for current user's profile
export const useCurrentUserProfile = (userId?: string) => {
  const profileTypeQuery = useProfileType(userId || '', {
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  const userWithProfileQuery = useUserWithProfile(userId || '', {
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    ...userWithProfileQuery,
    profileType: profileTypeQuery.data?.type || 'employee',
    profile: profileTypeQuery.data?.profile || null,
    permissions: useProfilePermissions(profileTypeQuery.data?.profile || null),
  };
};

// Export all hooks
export default {
  // Profile detection
  useProfileType,
  useUserWithProfile,
  useCurrentUserProfile,

  // Patient profiles
  usePatientProfiles,
  usePatientProfile,
  usePatientProfileByUser,
  usePatientProfileByPatientId,
  useCreatePatientProfile,
  useUpdatePatientProfile,
  useDeletePatientProfile,

  // Employee profiles
  useEmployeeProfiles,
  useEmployeeProfile,
  useEmployeeProfileByUser,
  useEmployeesByFacility,
  useEmployeesByType,
  useCreateEmployeeProfile,
  useUpdateEmployeeProfile,
  useDeleteEmployeeProfile,

  // Admin profiles
  useAdminProfiles,
  useAdminProfile,
  useAdminProfileByUser,
  useCreateAdminProfile,
  useUpdateAdminProfile,
  useDeleteAdminProfile,

  // Profile relationships
  useProfileWithUser,
  useProfileWithFacility,
  useProfileWithVerification,
  useProfileWithRoleHistory,

  // Profile switching
  useAvailableProfiles,
  useHasMultipleProfiles,
  useSwitchProfile,

  // Utilities
  useProfilePermissions,
};