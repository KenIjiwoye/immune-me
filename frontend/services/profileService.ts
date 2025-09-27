import api from './api';
import {
  Profile,
  PatientProfile,
  EmployeeProfile,
  AdminProfile,
  ProfileType,
  ProfileWithType,
  UserWithProfile,
  ProfileResponse,
  ProfileListResponse,
  ProfileQueryParams,
  CreatePatientProfileData,
  CreateEmployeeProfileData,
  CreateAdminProfileData,
  UpdatePatientProfileData,
  UpdateEmployeeProfileData,
  UpdateAdminProfileData,
} from '../types/profile';

// Profile type detection utility
export const detectProfileType = async (userId: string): Promise<ProfileWithType> => {
  try {
    // Check all profile types in parallel
    const [patientCheck, employeeCheck, adminCheck] = await Promise.allSettled([
      api.get(`/profiles/patient/by-user/${userId}`),
      api.get(`/profiles/employee/by-user/${userId}`),
      api.get(`/profiles/admin/by-user/${userId}`)
    ]);

    if (patientCheck.status === 'fulfilled' && patientCheck.value.data) {
      return { type: 'patient', profile: patientCheck.value.data };
    }
    
    if (employeeCheck.status === 'fulfilled' && employeeCheck.value.data) {
      return { type: 'employee', profile: employeeCheck.value.data };
    }
    
    if (adminCheck.status === 'fulfilled' && adminCheck.value.data) {
      return { type: 'admin', profile: adminCheck.value.data };
    }

    return { type: 'legacy', profile: null };
  } catch (error) {
    console.error('Error detecting profile type:', error);
    return { type: 'legacy', profile: null };
  }
};

// Get user with profile information
export const getUserWithProfile = async (userId: string): Promise<UserWithProfile> => {
  try {
    // Get user data
    const userResponse = await api.get(`/users/${userId}`);
    const user = userResponse.data;

    // Get profile information
    const profileInfo = await detectProfileType(userId);

    // Create enhanced user object
    const userWithProfile: UserWithProfile = {
      ...user,
      profileType: profileInfo.type,
      profile: profileInfo.profile,
      // Legacy compatibility
      role: extractLegacyRole(user.labels, profileInfo),
      facilityId: extractFacilityId(user.labels, profileInfo.profile)
    };

    return userWithProfile;
  } catch (error) {
    console.error('Error getting user with profile:', error);
    throw error;
  }
};

// Extract legacy role for backward compatibility
const extractLegacyRole = (labels: string[], profileInfo: ProfileWithType): 'nurse' | 'doctor' | 'administrator' | 'supervisor' | undefined => {
  if (profileInfo.type === 'employee' && profileInfo.profile) {
    const employeeProfile = profileInfo.profile as EmployeeProfile;
    switch (employeeProfile.employee_type) {
      case 'doctor':
        return 'doctor';
      case 'supervisor':
        return 'supervisor';
      case 'administrator':
        return 'administrator';
      case 'nurse':
      default:
        return 'nurse';
    }
  }

  // Fallback to label-based detection
  if (labels.includes('role:administrator')) return 'administrator';
  if (labels.includes('role:supervisor')) return 'supervisor';
  if (labels.includes('role:doctor')) return 'doctor';
  if (labels.includes('role:nurse')) return 'nurse';
  
  return undefined;
};

// Extract facility ID for backward compatibility
const extractFacilityId = (labels: string[], profile: Profile | null): string | undefined => {
  if (profile) {
    return profile.facility_id;
  }

  // Fallback to label-based detection
  const facilityLabel = labels.find(label => label.startsWith('facility_'));
  return facilityLabel ? facilityLabel.replace('facility_', '') : undefined;
};

// Patient Profile Services
export const patientProfileService = {
  // Get patient profile by user ID
  getByUserId: async (userId: string): Promise<PatientProfile> => {
    const response = await api.get(`/profiles/patient/by-user/${userId}`);
    return response.data;
  },

  // Get patient profile by patient ID
  getByPatientId: async (patientId: string): Promise<PatientProfile> => {
    const response = await api.get(`/profiles/patient/by-patient/${patientId}`);
    return response.data;
  },

  // Get patient profile by ID
  getById: async (profileId: string): Promise<PatientProfile> => {
    const response = await api.get(`/profiles/patient/${profileId}`);
    return response.data;
  },

  // List patient profiles
  list: async (params?: ProfileQueryParams): Promise<ProfileListResponse<PatientProfile>> => {
    const response = await api.get('/profiles/patient', { params });
    return response.data;
  },

  // Create patient profile
  create: async (data: CreatePatientProfileData): Promise<ProfileResponse<PatientProfile>> => {
    const response = await api.post('/profiles/patient', data);
    return response.data;
  },

  // Update patient profile
  update: async (profileId: string, data: UpdatePatientProfileData): Promise<ProfileResponse<PatientProfile>> => {
    const response = await api.put(`/profiles/patient/${profileId}`, data);
    return response.data;
  },

  // Delete patient profile
  delete: async (profileId: string): Promise<void> => {
    await api.delete(`/profiles/patient/${profileId}`);
  },

  // Verify patient profile
  verify: async (profileId: string, verificationData: { method: string; notes?: string }): Promise<ProfileResponse<PatientProfile>> => {
    const response = await api.post(`/profiles/patient/${profileId}/verify`, verificationData);
    return response.data;
  },

  // Update notification preferences
  updateNotificationPreferences: async (profileId: string, preferences: any): Promise<ProfileResponse<PatientProfile>> => {
    const response = await api.put(`/profiles/patient/${profileId}/notifications`, { notification_preferences: preferences });
    return response.data;
  }
};

// Employee Profile Services
export const employeeProfileService = {
  // Get employee profile by user ID
  getByUserId: async (userId: string): Promise<EmployeeProfile> => {
    const response = await api.get(`/profiles/employee/by-user/${userId}`);
    return response.data;
  },

  // Get employee profile by employee ID
  getByEmployeeId: async (employeeId: string): Promise<EmployeeProfile> => {
    const response = await api.get(`/profiles/employee/by-employee/${employeeId}`);
    return response.data;
  },

  // Get employee profile by ID
  getById: async (profileId: string): Promise<EmployeeProfile> => {
    const response = await api.get(`/profiles/employee/${profileId}`);
    return response.data;
  },

  // List employee profiles
  list: async (params?: ProfileQueryParams): Promise<ProfileListResponse<EmployeeProfile>> => {
    const response = await api.get('/profiles/employee', { params });
    return response.data;
  },

  // Create employee profile
  create: async (data: CreateEmployeeProfileData): Promise<ProfileResponse<EmployeeProfile>> => {
    const response = await api.post('/profiles/employee', data);
    return response.data;
  },

  // Update employee profile
  update: async (profileId: string, data: UpdateEmployeeProfileData): Promise<ProfileResponse<EmployeeProfile>> => {
    const response = await api.put(`/profiles/employee/${profileId}`, data);
    return response.data;
  },

  // Delete employee profile
  delete: async (profileId: string): Promise<void> => {
    await api.delete(`/profiles/employee/${profileId}`);
  },

  // Get employees by facility
  getByFacility: async (facilityId: string, params?: ProfileQueryParams): Promise<ProfileListResponse<EmployeeProfile>> => {
    const response = await api.get(`/profiles/employee/facility/${facilityId}`, { params });
    return response.data;
  },

  // Get employees by type
  getByType: async (employeeType: string, params?: ProfileQueryParams): Promise<ProfileListResponse<EmployeeProfile>> => {
    const response = await api.get(`/profiles/employee/type/${employeeType}`, { params });
    return response.data;
  },

  // Update license information
  updateLicense: async (profileId: string, licenseData: { license_number: string; license_expiry_date: string }): Promise<ProfileResponse<EmployeeProfile>> => {
    const response = await api.put(`/profiles/employee/${profileId}/license`, licenseData);
    return response.data;
  },

  // Add training record
  addTraining: async (profileId: string, trainingData: any): Promise<ProfileResponse<EmployeeProfile>> => {
    const response = await api.post(`/profiles/employee/${profileId}/training`, trainingData);
    return response.data;
  },

  // Update performance metrics
  updatePerformance: async (profileId: string, performanceData: any): Promise<ProfileResponse<EmployeeProfile>> => {
    const response = await api.put(`/profiles/employee/${profileId}/performance`, performanceData);
    return response.data;
  }
};

// Admin Profile Services
export const adminProfileService = {
  // Get admin profile by user ID
  getByUserId: async (userId: string): Promise<AdminProfile> => {
    const response = await api.get(`/profiles/admin/by-user/${userId}`);
    return response.data;
  },

  // Get admin profile by ID
  getById: async (profileId: string): Promise<AdminProfile> => {
    const response = await api.get(`/profiles/admin/${profileId}`);
    return response.data;
  },

  // List admin profiles
  list: async (params?: ProfileQueryParams): Promise<ProfileListResponse<AdminProfile>> => {
    const response = await api.get('/profiles/admin', { params });
    return response.data;
  },

  // Create admin profile
  create: async (data: CreateAdminProfileData): Promise<ProfileResponse<AdminProfile>> => {
    const response = await api.post('/profiles/admin', data);
    return response.data;
  },

  // Update admin profile
  update: async (profileId: string, data: UpdateAdminProfileData): Promise<ProfileResponse<AdminProfile>> => {
    const response = await api.put(`/profiles/admin/${profileId}`, data);
    return response.data;
  },

  // Delete admin profile
  delete: async (profileId: string): Promise<void> => {
    await api.delete(`/profiles/admin/${profileId}`);
  },

  // Update system permissions
  updatePermissions: async (profileId: string, permissions: string[]): Promise<ProfileResponse<AdminProfile>> => {
    const response = await api.put(`/profiles/admin/${profileId}/permissions`, { system_permissions: permissions });
    return response.data;
  },

  // Update security settings
  updateSecurity: async (profileId: string, securityData: { mfa_enabled: boolean; security_clearance: string }): Promise<ProfileResponse<AdminProfile>> => {
    const response = await api.put(`/profiles/admin/${profileId}/security`, securityData);
    return response.data;
  }
};

// Profile utilities
export const profileUtils = {
  // Check if user has specific permission
  hasPermission: (profile: Profile | null, permission: string): boolean => {
    if (!profile) return false;

    if ('access_permissions' in profile) {
      return profile.access_permissions.includes(permission as any);
    }

    if ('system_permissions' in profile) {
      return profile.system_permissions.includes(permission as any);
    }

    return false;
  },

  // Check if employee license is valid
  isLicenseValid: (profile: EmployeeProfile): boolean => {
    if (!profile.license_expiry_date) return true; // No expiry date means no license required
    
    const expiryDate = new Date(profile.license_expiry_date);
    const today = new Date();
    return expiryDate > today;
  },

  // Get user display name with professional title
  getDisplayName: (user: UserWithProfile): string => {
    if (user.profileType === 'employee' && user.profile) {
      const employeeProfile = user.profile as EmployeeProfile;
      if (employeeProfile.professional_title) {
        return `${employeeProfile.professional_title} ${user.name}`;
      }
    }
    return user.name;
  },

  // Get facility access for user
  getFacilityAccess: (profile: Profile | null): string[] => {
    if (!profile) return [];

    if ('assigned_facilities' in profile && profile.assigned_facilities) {
      return profile.assigned_facilities;
    }

    return [profile.facility_id];
  },

  // Check if user can access facility
  canAccessFacility: (profile: Profile | null, facilityId: string): boolean => {
    if (!profile) return false;

    const accessibleFacilities = profileUtils.getFacilityAccess(profile);
    return accessibleFacilities.includes(facilityId);
  },

  // Format profile for display
  formatProfileForDisplay: (profile: Profile): any => {
    const baseInfo = {
      id: profile.$id,
      facility_id: profile.facility_id,
      created_at: profile.created_at,
      updated_at: profile.updated_at
    };

    if ('patient_id' in profile) {
      return {
        ...baseInfo,
        type: 'patient',
        patient_id: profile.patient_id,
        verification_status: profile.verification_status,
        profile_status: profile.profile_status
      };
    }

    if ('employee_id' in profile) {
      return {
        ...baseInfo,
        type: 'employee',
        employee_id: profile.employee_id,
        employee_type: profile.employee_type,
        professional_title: profile.professional_title,
        employment_status: profile.employment_status
      };
    }

    if ('admin_level' in profile) {
      return {
        ...baseInfo,
        type: 'admin',
        admin_level: profile.admin_level,
        security_clearance: profile.security_clearance,
        facility_access_scope: profile.facility_access_scope
      };
    }

    return baseInfo;
  }
};

// Export all services
export default {
  detectProfileType,
  getUserWithProfile,
  patient: patientProfileService,
  employee: employeeProfileService,
  admin: adminProfileService,
  utils: profileUtils
};