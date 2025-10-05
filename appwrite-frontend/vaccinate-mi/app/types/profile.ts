import { AdminProfile, EmployeeProfile, PatientProfile, Facility, CreateData, UpdateData, QueryOptions } from './appwrite';

// =============================================================================
// PROFILE TYPE DEFINITIONS
// =============================================================================

// Profile type literals
export type ProfileType = 'admin' | 'employee' | 'patient';

// Union type for all profiles
export type Profile = AdminProfile | EmployeeProfile | PatientProfile;

// Profile collection arrays
export type AdminProfiles = AdminProfile[];
export type EmployeeProfiles = EmployeeProfile[];
export type PatientProfiles = PatientProfile[];

// =============================================================================
// PROFILE RELATIONSHIP TYPES
// =============================================================================

// Profile with associated user data
export type ProfileWithUser<T extends Profile = Profile> = T & {
  user?: {
    $id: string;
    email: string;
    name?: string;
    phone?: string;
    emailVerification: boolean;
    phoneVerification: boolean;
    status: boolean;
    labels: string[];
    prefs: Record<string, any>;
  };
};

// Profile with associated facility data
export type ProfileWithFacility<T extends Profile = Profile> = T & {
  facility?: Facility;
};

// Profile with verification workflow
export type ProfileWithVerification<T extends Profile = Profile> = T & {
  verificationWorkflow?: {
    status: string;
    verificationType: string;
    dueDate?: string;
    assignedTo?: string;
    notes?: string;
  };
};

// Profile with role change history
export type ProfileWithRoleHistory<T extends Profile = Profile> = T & {
  roleChanges?: Array<{
    changeType: string;
    oldRole?: string;
    newRole: string;
    effectiveDate: string;
    assignedBy: string;
    reason?: string;
  }>;
};

// =============================================================================
// PROFILE STATUS AND VERIFICATION TYPES
// =============================================================================

export type ProfileStatus = 'active' | 'inactive' | 'pending' | 'suspended' | 'terminated';

export type VerificationStatus = 'unverified' | 'pending' | 'in_review' | 'verified' | 'rejected' | 'expired';

export type EmploymentStatus = 'active' | 'inactive' | 'terminated' | 'on_leave' | 'suspended';

export type AdminLevel = 'super_admin' | 'regional_admin' | 'facility_admin' | 'department_admin';

export type EmployeeType = 'doctor' | 'nurse' | 'pharmacist' | 'administrator' | 'technician' | 'other';

export type PatientProfileStatus = 'active' | 'inactive' | 'deceased' | 'transferred';

// =============================================================================
// PROFILE UTILITY TYPES
// =============================================================================

// CRUD operations for profiles
export type CreateProfileData<T extends Profile> = CreateData<T>;
export type UpdateProfileData<T extends Profile> = UpdateData<T>;

// Profile creation data (without system fields)
export type NewAdminProfile = Omit<AdminProfile, keyof import('./appwrite').AppwriteDocument>;
export type NewEmployeeProfile = Omit<EmployeeProfile, keyof import('./appwrite').AppwriteDocument>;
export type NewPatientProfile = Omit<PatientProfile, keyof import('./appwrite').AppwriteDocument>;

// Profile update data
export type AdminProfileUpdate = Partial<NewAdminProfile>;
export type EmployeeProfileUpdate = Partial<NewEmployeeProfile>;
export type PatientProfileUpdate = Partial<NewPatientProfile>;

// Profile query options
export interface ProfileQueryOptions extends QueryOptions {
  profileType?: ProfileType;
  facilityId?: string;
  status?: ProfileStatus;
  verificationStatus?: VerificationStatus;
  employmentStatus?: EmploymentStatus;
  adminLevel?: AdminLevel;
  employeeType?: EmployeeType;
}

// =============================================================================
// PROFILE PERMISSIONS AND ACCESS CONTROL
// =============================================================================

export interface ProfilePermissions {
  // Patient management
  canViewPatients: boolean;
  canCreatePatients: boolean;
  canEditPatients: boolean;
  canDeletePatients: boolean;

  // Immunization management
  canViewImmunizations: boolean;
  canAdministerVaccines: boolean;
  canEditImmunizationRecords: boolean;

  // Vaccine management
  canViewVaccines: boolean;
  canCreateVaccines: boolean;
  canEditVaccines: boolean;
  canDeleteVaccines: boolean;

  // Facility management
  canViewFacilities: boolean;
  canCreateFacilities: boolean;
  canEditFacilities: boolean;
  canDeleteFacilities: boolean;

  // User management
  canViewUsers: boolean;
  canCreateUsers: boolean;
  canEditUsers: boolean;
  canDeleteUsers: boolean;
  canManageRoles: boolean;

  // Reporting
  canGenerateReports: boolean;
  canViewAnalytics: boolean;
  canExportData: boolean;

  // System administration
  canManageSystemSettings: boolean;
  canAccessAuditLogs: boolean;
  canManageNotifications: boolean;
  canManageSchedules: boolean;

  // Emergency access
  emergencyAccess: boolean;
}

// Access scope definitions
export type FacilityAccessScope = 'all' | 'region' | 'district' | 'facility' | 'none';

export type DataAccessLevel = 'full' | 'facility' | 'department' | 'restricted' | 'none';

// =============================================================================
// PROFILE VALIDATION TYPES
// =============================================================================

export interface ProfileValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  fieldErrors: Record<string, string[]>;
}

export interface ProfileValidationRules {
  requiredFields: string[];
  fieldConstraints: Record<string, {
    maxLength?: number;
    minLength?: number;
    pattern?: RegExp;
    enum?: string[];
  }>;
  customValidators?: Array<(profile: Partial<Profile>) => string | null>;
}

// =============================================================================
// PROFILE HELPER TYPES
// =============================================================================

// Profile display information
export interface ProfileDisplayInfo {
  id: string;
  type: ProfileType;
  name: string;
  email?: string;
  status: ProfileStatus;
  verificationStatus: VerificationStatus;
  facilityName?: string;
  role?: string;
  lastActive?: string;
}

// Profile summary for lists
export interface ProfileSummary {
  $id: string;
  profileType: ProfileType;
  userId: string;
  displayName: string;
  status: ProfileStatus;
  verificationStatus: VerificationStatus;
  facilityId?: string;
  createdAt: string;
  updatedAt: string;
}

// Profile statistics
export interface ProfileStats {
  totalProfiles: number;
  activeProfiles: number;
  verifiedProfiles: number;
  profilesByType: Record<ProfileType, number>;
  profilesByStatus: Record<ProfileStatus, number>;
  profilesByFacility: Record<string, number>;
}

// =============================================================================
// TYPE GUARDS AND UTILITY FUNCTIONS
// =============================================================================

// Type guards
export const isAdminProfile = (profile: Profile): profile is AdminProfile => {
  return '$collectionId' in profile && profile.$collectionId === 'admin-profiles';
};

export const isEmployeeProfile = (profile: Profile): profile is EmployeeProfile => {
  return '$collectionId' in profile && profile.$collectionId === 'employee-profiles';
};

export const isPatientProfile = (profile: Profile): profile is PatientProfile => {
  return '$collectionId' in profile && profile.$collectionId === 'patient-profiles';
};

// Utility functions (types for implementation)
export type GetProfileType = (profile: Profile) => ProfileType;
export type GetProfilePermissions = (profile: Profile) => ProfilePermissions;
export type ValidateProfile = (profile: Partial<Profile>, rules?: ProfileValidationRules) => ProfileValidationResult;
export type GetProfileDisplayInfo = (profile: Profile) => ProfileDisplayInfo;
export type GetProfileSummary = (profile: Profile) => ProfileSummary;