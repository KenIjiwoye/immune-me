import { adminProfilesService, employeeProfilesService, patientProfilesService } from './appwriteDatabase';
import { AdminProfile, EmployeeProfile, PatientProfile } from '../types/appwrite';
import { ProfileType } from '../types/profile';
import { auditService } from './auditService';

// Union type for all profiles
export type Profile = AdminProfile | EmployeeProfile | PatientProfile;

// Profile type detection utility
export const detectProfileType = async (userId: string): Promise<{ type: ProfileType; profile: Profile | null }> => {
  try {
    // Check all profile types in parallel
    const [patientCheck, employeeCheck, adminCheck] = await Promise.allSettled([
      patientProfilesService.getByUserId(userId),
      employeeProfilesService.getByUserId(userId),
      adminProfilesService.getByUserId(userId)
    ]);

    if (patientCheck.status === 'fulfilled' && patientCheck.value) {
      return { type: 'patient', profile: patientCheck.value };
    }

    if (employeeCheck.status === 'fulfilled' && employeeCheck.value) {
      return { type: 'employee', profile: employeeCheck.value };
    }

    if (adminCheck.status === 'fulfilled' && adminCheck.value) {
      return { type: 'admin', profile: adminCheck.value };
    }

    return { type: 'patient', profile: null }; // Default fallback
  } catch (error) {
    console.error('Error detecting profile type:', error);
    return { type: 'patient', profile: null };
  }
};

// Get user with profile information
export const getUserWithProfile = async (userId: string): Promise<{
  $id: string;
  email: string;
  name: string;
  profileType: ProfileType;
  profile: Profile | null;
  role: 'admin' | 'employee' | 'patient';
  facilityId?: string;
  permissions: string[];
}> => {
  try {
    // Get profile information
    const profileInfo = await detectProfileType(userId);

    // Create enhanced user object
    const userWithProfile = {
      $id: userId,
      email: '', // Will be populated by auth service
      name: '', // Will be populated by auth service
      profileType: profileInfo.type,
      profile: profileInfo.profile,
      role: profileInfo.type,
      facilityId: extractFacilityId(profileInfo.profile),
      permissions: extractPermissions(profileInfo.profile),
    };

    return userWithProfile;
  } catch (error) {
    console.error('Error getting user with profile:', error);
    throw error;
  }
};

// Extract facility ID from profile
const extractFacilityId = (profile: Profile | null): string | undefined => {
  if (!profile) return undefined;

  if ('facility_id' in profile) {
    return profile.facility_id;
  }

  if ('primary_facility_id' in profile) {
    return profile.primary_facility_id;
  }

  if ('accessible_facilities' in profile && profile.accessible_facilities?.length) {
    return profile.accessible_facilities[0];
  }

  return undefined;
};

// Extract permissions from profile
const extractPermissions = (profile: Profile | null): string[] => {
  if (!profile) return [];

  if ('access_permissions' in profile) {
    return profile.access_permissions || [];
  }

  if ('system_permissions' in profile) {
    return profile.system_permissions || [];
  }

  return [];
};

// Patient Profile Services
export const patientProfileService = {
  // Get patient profile by user ID
  getByUserId: async (userId: string): Promise<PatientProfile | null> => {
    return await patientProfilesService.getByUserId(userId);
  },

  // List patient profiles
  list: async (params?: any) => {
    return await patientProfilesService.list(params);
  },

  // Create patient profile
  create: async (data: any) => {
    return await patientProfilesService.create(data);
  },

  // Update patient profile
  update: async (profileId: string, data: any) => {
    return await patientProfilesService.update(profileId, data);
  },

  // Delete patient profile
  delete: async (profileId: string) => {
    return await patientProfilesService.delete(profileId);
  },

  // Get by facility
  getByFacility: async (facilityId: string) => {
    return await patientProfilesService.getByFacility(facilityId);
  },

  // Get by verification status
  getByVerificationStatus: async (status: string) => {
    return await patientProfilesService.getByVerificationStatus(status);
  }
};

// Employee Profile Services
export const employeeProfileService = {
  // Get employee profile by user ID
  getByUserId: async (userId: string): Promise<EmployeeProfile | null> => {
    return await employeeProfilesService.getByUserId(userId);
  },

  // List employee profiles
  list: async (params?: any) => {
    return await employeeProfilesService.list(params);
  },

  // Create employee profile
  create: async (data: any) => {
    return await employeeProfilesService.create(data);
  },

  // Update employee profile
  update: async (profileId: string, data: any) => {
    return await employeeProfilesService.update(profileId, data);
  },

  // Delete employee profile
  delete: async (profileId: string) => {
    return await employeeProfilesService.delete(profileId);
  },

  // Get employees by facility
  getByFacility: async (facilityId: string) => {
    return await employeeProfilesService.getByFacility(facilityId);
  },

  // Get employees by type
  getByEmployeeType: async (employeeType: string) => {
    return await employeeProfilesService.getByEmployeeType(employeeType);
  }
};

// Admin Profile Services
export const adminProfileService = {
  // Get admin profile by user ID
  getByUserId: async (userId: string): Promise<AdminProfile | null> => {
    return await adminProfilesService.getByUserId(userId);
  },

  // List admin profiles
  list: async (params?: any) => {
    return await adminProfilesService.list(params);
  },

  // Create admin profile
  create: async (data: any) => {
    return await adminProfilesService.create(data);
  },

  // Update admin profile
  update: async (profileId: string, data: any) => {
    return await adminProfilesService.update(profileId, data);
  },

  // Delete admin profile
  delete: async (profileId: string) => {
    return await adminProfilesService.delete(profileId);
  },

  // Get by admin level
  getByAdminLevel: async (adminLevel: string) => {
    return await adminProfilesService.getByAdminLevel(adminLevel);
  }
};

// Profile utilities
export const profileUtils = {
  // Check if user has specific permission
  hasPermission: (profile: Profile | null, permission: string): boolean => {
    if (!profile) return false;

    if ('access_permissions' in profile) {
      return profile.access_permissions?.includes(permission as any) || false;
    }

    if ('system_permissions' in profile) {
      return profile.system_permissions?.includes(permission as any) || false;
    }

    return false;
  },

  // Extract permissions from profile
  extractPermissions: (profile: Profile | null): string[] => {
    if (!profile) return [];

    if ('access_permissions' in profile) {
      return profile.access_permissions || [];
    }

    if ('system_permissions' in profile) {
      return profile.system_permissions || [];
    }

    return [];
  },

  // Check if employee license is valid
  isLicenseValid: (profile: EmployeeProfile): boolean => {
    if (!profile.license_expiry_date) return true; // No expiry date means no license required

    const expiryDate = new Date(profile.license_expiry_date);
    const today = new Date();
    return expiryDate > today;
  },

  // Get user display name with professional title
  getDisplayName: (user: { name: string; profileType: ProfileType; profile: Profile | null }): string => {
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

    if ('accessible_facilities' in profile && profile.accessible_facilities) {
      return profile.accessible_facilities;
    }

    const facilityId = extractFacilityId(profile);
    return facilityId ? [facilityId] : [];
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
      facility_id: extractFacilityId(profile),
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
        facility_access_scope: profile.facility_access_scope
      };
    }

    return baseInfo;
  }
};

// Profile switching functionality for multi-role users
export const profileSwitchingService = {
  // Get all available profiles for a user
  getAvailableProfiles: async (userId: string): Promise<{ type: ProfileType; profile: Profile }[]> => {
    try {
      const profiles: { type: ProfileType; profile: Profile }[] = [];

      // Check all profile types
      const [patientProfile, employeeProfile, adminProfile] = await Promise.allSettled([
        patientProfilesService.getByUserId(userId),
        employeeProfilesService.getByUserId(userId),
        adminProfilesService.getByUserId(userId)
      ]);

      if (patientProfile.status === 'fulfilled' && patientProfile.value) {
        profiles.push({ type: 'patient', profile: patientProfile.value });
      }

      if (employeeProfile.status === 'fulfilled' && employeeProfile.value) {
        profiles.push({ type: 'employee', profile: employeeProfile.value });
      }

      if (adminProfile.status === 'fulfilled' && adminProfile.value) {
        profiles.push({ type: 'admin', profile: adminProfile.value });
      }

      return profiles;
    } catch (error) {
      console.error('Error getting available profiles:', error);
      return [];
    }
  },

  // Switch to a different profile
  switchProfile: async (userId: string, targetProfileType: ProfileType): Promise<{ type: ProfileType; profile: Profile | null }> => {
    try {
      // Get current profile before switching
      const currentProfileInfo = await detectProfileType(userId);
      const currentProfileId = currentProfileInfo.profile?.$id;

      // Perform the switch
      const result = await detectProfileType(userId);

      // Log profile switch if successful
      if (result.profile && currentProfileId !== result.profile.$id) {
        await auditService.logProfileSwitch(
          userId,
          currentProfileId || '',
          result.profile.$id,
          targetProfileType
        );
      }

      return result;
    } catch (error) {
      console.error('Error switching profile:', error);
      return { type: 'patient', profile: null };
    }
  },

  // Check if user has multiple profiles
  hasMultipleProfiles: async (userId: string): Promise<boolean> => {
    const profiles = await profileSwitchingService.getAvailableProfiles(userId);
    return profiles.length > 1;
  }
};

// Export all services
export default {
  detectProfileType,
  getUserWithProfile,
  patient: patientProfileService,
  employee: employeeProfileService,
  admin: adminProfileService,
  utils: profileUtils,
  switching: profileSwitchingService
};