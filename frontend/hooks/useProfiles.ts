import { useQuery, useMutation, useQueryClient, UseQueryOptions, QueryKey } from '@tanstack/react-query';
import profileService from '../services/profileService';
import {
  Profile,
  PatientProfile,
  EmployeeProfile,
  AdminProfile,
  ProfileType,
  ProfileWithType,
  UserWithProfile,
  ProfileListResponse,
  ProfileQueryParams,
  CreatePatientProfileData,
  CreateEmployeeProfileData,
  CreateAdminProfileData,
  UpdatePatientProfileData,
  UpdateEmployeeProfileData,
  UpdateAdminProfileData,
} from '../types/profile';

// Query keys for Profile-related queries
export const profileKeys = {
  all: ['profiles'] as const,
  
  // User profile detection
  userProfile: (userId: string) => [...profileKeys.all, 'user', userId] as const,
  userWithProfile: (userId: string) => [...profileKeys.all, 'userWithProfile', userId] as const,
  
  // Patient profiles
  patients: () => [...profileKeys.all, 'patient'] as const,
  patientLists: () => [...profileKeys.patients(), 'list'] as const,
  patientList: (filters: ProfileQueryParams) => [...profileKeys.patientLists(), filters] as const,
  patientDetails: () => [...profileKeys.patients(), 'detail'] as const,
  patientDetail: (id: string) => [...profileKeys.patientDetails(), id] as const,
  patientByUser: (userId: string) => [...profileKeys.patients(), 'byUser', userId] as const,
  patientByPatientId: (patientId: string) => [...profileKeys.patients(), 'byPatientId', patientId] as const,
  
  // Employee profiles
  employees: () => [...profileKeys.all, 'employee'] as const,
  employeeLists: () => [...profileKeys.employees(), 'list'] as const,
  employeeList: (filters: ProfileQueryParams) => [...profileKeys.employeeLists(), filters] as const,
  employeeDetails: () => [...profileKeys.employees(), 'detail'] as const,
  employeeDetail: (id: string) => [...profileKeys.employeeDetails(), id] as const,
  employeeByUser: (userId: string) => [...profileKeys.employees(), 'byUser', userId] as const,
  employeeByEmployeeId: (employeeId: string) => [...profileKeys.employees(), 'byEmployeeId', employeeId] as const,
  employeesByFacility: (facilityId: string) => [...profileKeys.employees(), 'facility', facilityId] as const,
  employeesByType: (employeeType: string) => [...profileKeys.employees(), 'type', employeeType] as const,
  
  // Admin profiles
  admins: () => [...profileKeys.all, 'admin'] as const,
  adminLists: () => [...profileKeys.admins(), 'list'] as const,
  adminList: (filters: ProfileQueryParams) => [...profileKeys.adminLists(), filters] as const,
  adminDetails: () => [...profileKeys.admins(), 'detail'] as const,
  adminDetail: (id: string) => [...profileKeys.adminDetails(), id] as const,
  adminByUser: (userId: string) => [...profileKeys.admins(), 'byUser', userId] as const,
};

// Profile type detection hook
export const useProfileType = (userId: string, options?: Omit<UseQueryOptions<ProfileWithType, Error, ProfileWithType, QueryKey>, 'queryKey' | 'queryFn'>) => {
  return useQuery({
    queryKey: profileKeys.userProfile(userId),
    queryFn: () => profileService.detectProfileType(userId),
    enabled: !!userId,
    ...options,
  });
};

// User with profile hook
export const useUserWithProfile = (userId: string, options?: Omit<UseQueryOptions<UserWithProfile, Error, UserWithProfile, QueryKey>, 'queryKey' | 'queryFn'>) => {
  return useQuery({
    queryKey: profileKeys.userWithProfile(userId),
    queryFn: () => profileService.getUserWithProfile(userId),
    enabled: !!userId,
    ...options,
  });
};

// Patient Profile Hooks
export const usePatientProfiles = (params: ProfileQueryParams = {}, options?: Omit<UseQueryOptions<ProfileListResponse<PatientProfile>, Error, ProfileListResponse<PatientProfile>, QueryKey>, 'queryKey' | 'queryFn'>) => {
  return useQuery({
    queryKey: profileKeys.patientList(params),
    queryFn: () => profileService.patient.list(params),
    ...options,
  });
};

export const usePatientProfile = (profileId: string, options?: Omit<UseQueryOptions<PatientProfile, Error, PatientProfile, QueryKey>, 'queryKey' | 'queryFn'>) => {
  return useQuery({
    queryKey: profileKeys.patientDetail(profileId),
    queryFn: () => profileService.patient.getById(profileId),
    enabled: !!profileId,
    ...options,
  });
};

export const usePatientProfileByUser = (userId: string, options?: Omit<UseQueryOptions<PatientProfile, Error, PatientProfile, QueryKey>, 'queryKey' | 'queryFn'>) => {
  return useQuery({
    queryKey: profileKeys.patientByUser(userId),
    queryFn: () => profileService.patient.getByUserId(userId),
    enabled: !!userId,
    ...options,
  });
};

export const usePatientProfileByPatientId = (patientId: string, options?: Omit<UseQueryOptions<PatientProfile, Error, PatientProfile, QueryKey>, 'queryKey' | 'queryFn'>) => {
  return useQuery({
    queryKey: profileKeys.patientByPatientId(patientId),
    queryFn: () => profileService.patient.getByPatientId(patientId),
    enabled: !!patientId,
    ...options,
  });
};

export const useCreatePatientProfile = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: CreatePatientProfileData) => profileService.patient.create(data),
    onSuccess: (response) => {
      console.log('Patient profile created successfully:', response);
      queryClient.invalidateQueries({ queryKey: profileKeys.patientLists() });
      queryClient.invalidateQueries({ queryKey: profileKeys.patientByUser(response.data.user_id) });
      queryClient.invalidateQueries({ queryKey: profileKeys.patientByPatientId(response.data.patient_id) });
    },
    onError: (error) => {
      console.error('Failed to create patient profile:', error);
    },
  });
};

export const useUpdatePatientProfile = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ profileId, data }: { profileId: string; data: UpdatePatientProfileData }) => 
      profileService.patient.update(profileId, data),
    onSuccess: (response) => {
      console.log('Patient profile updated successfully:', response);
      queryClient.invalidateQueries({ queryKey: profileKeys.patientLists() });
      queryClient.invalidateQueries({ queryKey: profileKeys.patientDetail(response.data.$id) });
      queryClient.invalidateQueries({ queryKey: profileKeys.patientByUser(response.data.user_id) });
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

export const useVerifyPatientProfile = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ profileId, verificationData }: { profileId: string; verificationData: { method: string; notes?: string } }) => 
      profileService.patient.verify(profileId, verificationData),
    onSuccess: (response) => {
      console.log('Patient profile verified successfully:', response);
      queryClient.invalidateQueries({ queryKey: profileKeys.patientDetail(response.data.$id) });
      queryClient.invalidateQueries({ queryKey: profileKeys.patientLists() });
    },
    onError: (error) => {
      console.error('Failed to verify patient profile:', error);
    },
  });
};

// Employee Profile Hooks
export const useEmployeeProfiles = (params: ProfileQueryParams = {}, options?: Omit<UseQueryOptions<ProfileListResponse<EmployeeProfile>, Error, ProfileListResponse<EmployeeProfile>, QueryKey>, 'queryKey' | 'queryFn'>) => {
  return useQuery({
    queryKey: profileKeys.employeeList(params),
    queryFn: () => profileService.employee.list(params),
    ...options,
  });
};

export const useEmployeeProfile = (profileId: string, options?: Omit<UseQueryOptions<EmployeeProfile, Error, EmployeeProfile, QueryKey>, 'queryKey' | 'queryFn'>) => {
  return useQuery({
    queryKey: profileKeys.employeeDetail(profileId),
    queryFn: () => profileService.employee.getById(profileId),
    enabled: !!profileId,
    ...options,
  });
};

export const useEmployeeProfileByUser = (userId: string, options?: Omit<UseQueryOptions<EmployeeProfile, Error, EmployeeProfile, QueryKey>, 'queryKey' | 'queryFn'>) => {
  return useQuery({
    queryKey: profileKeys.employeeByUser(userId),
    queryFn: () => profileService.employee.getByUserId(userId),
    enabled: !!userId,
    ...options,
  });
};

export const useEmployeesByFacility = (facilityId: string, params: ProfileQueryParams = {}, options?: Omit<UseQueryOptions<ProfileListResponse<EmployeeProfile>, Error, ProfileListResponse<EmployeeProfile>, QueryKey>, 'queryKey' | 'queryFn'>) => {
  return useQuery({
    queryKey: profileKeys.employeesByFacility(facilityId),
    queryFn: () => profileService.employee.getByFacility(facilityId, params),
    enabled: !!facilityId,
    ...options,
  });
};

export const useEmployeesByType = (employeeType: string, params: ProfileQueryParams = {}, options?: Omit<UseQueryOptions<ProfileListResponse<EmployeeProfile>, Error, ProfileListResponse<EmployeeProfile>, QueryKey>, 'queryKey' | 'queryFn'>) => {
  return useQuery({
    queryKey: profileKeys.employeesByType(employeeType),
    queryFn: () => profileService.employee.getByType(employeeType, params),
    enabled: !!employeeType,
    ...options,
  });
};

export const useCreateEmployeeProfile = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: CreateEmployeeProfileData) => profileService.employee.create(data),
    onSuccess: (response) => {
      console.log('Employee profile created successfully:', response);
      queryClient.invalidateQueries({ queryKey: profileKeys.employeeLists() });
      queryClient.invalidateQueries({ queryKey: profileKeys.employeeByUser(response.data.user_id) });
      queryClient.invalidateQueries({ queryKey: profileKeys.employeesByFacility(response.data.primary_facility_id) });
    },
    onError: (error) => {
      console.error('Failed to create employee profile:', error);
    },
  });
};

export const useUpdateEmployeeProfile = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ profileId, data }: { profileId: string; data: UpdateEmployeeProfileData }) => 
      profileService.employee.update(profileId, data),
    onSuccess: (response) => {
      console.log('Employee profile updated successfully:', response);
      queryClient.invalidateQueries({ queryKey: profileKeys.employeeLists() });
      queryClient.invalidateQueries({ queryKey: profileKeys.employeeDetail(response.data.$id) });
      queryClient.invalidateQueries({ queryKey: profileKeys.employeeByUser(response.data.user_id) });
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
export const useAdminProfiles = (params: ProfileQueryParams = {}, options?: Omit<UseQueryOptions<ProfileListResponse<AdminProfile>, Error, ProfileListResponse<AdminProfile>, QueryKey>, 'queryKey' | 'queryFn'>) => {
  return useQuery({
    queryKey: profileKeys.adminList(params),
    queryFn: () => profileService.admin.list(params),
    ...options,
  });
};

export const useAdminProfile = (profileId: string, options?: Omit<UseQueryOptions<AdminProfile, Error, AdminProfile, QueryKey>, 'queryKey' | 'queryFn'>) => {
  return useQuery({
    queryKey: profileKeys.adminDetail(profileId),
    queryFn: () => profileService.admin.getById(profileId),
    enabled: !!profileId,
    ...options,
  });
};

export const useAdminProfileByUser = (userId: string, options?: Omit<UseQueryOptions<AdminProfile, Error, AdminProfile, QueryKey>, 'queryKey' | 'queryFn'>) => {
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
    mutationFn: (data: CreateAdminProfileData) => profileService.admin.create(data),
    onSuccess: (response) => {
      console.log('Admin profile created successfully:', response);
      queryClient.invalidateQueries({ queryKey: profileKeys.adminLists() });
      queryClient.invalidateQueries({ queryKey: profileKeys.adminByUser(response.data.user_id) });
    },
    onError: (error) => {
      console.error('Failed to create admin profile:', error);
    },
  });
};

export const useUpdateAdminProfile = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ profileId, data }: { profileId: string; data: UpdateAdminProfileData }) => 
      profileService.admin.update(profileId, data),
    onSuccess: (response) => {
      console.log('Admin profile updated successfully:', response);
      queryClient.invalidateQueries({ queryKey: profileKeys.adminLists() });
      queryClient.invalidateQueries({ queryKey: profileKeys.adminDetail(response.data.$id) });
      queryClient.invalidateQueries({ queryKey: profileKeys.adminByUser(response.data.user_id) });
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

// Utility hooks
export const useProfilePermissions = (profile: Profile | null) => {
  return {
    hasPermission: (permission: string) => profileService.utils.hasPermission(profile, permission),
    canAccessFacility: (facilityId: string) => profileService.utils.canAccessFacility(profile, facilityId),
    getFacilityAccess: () => profileService.utils.getFacilityAccess(profile),
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
    profileType: profileTypeQuery.data?.type || 'legacy',
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
  useVerifyPatientProfile,
  
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
  
  // Utilities
  useProfilePermissions,
};