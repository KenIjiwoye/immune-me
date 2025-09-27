import {
  Profile,
  PatientProfile,
  EmployeeProfile,
  AdminProfile,
  ProfileType,
  UserWithProfile,
  EmployeeType,
  ProfileStatus,
  VerificationStatus,
  EmploymentStatus,
  AdminLevel,
  SecurityClearance,
  PatientAccessPermission,
  SystemPermission,
  NotificationPreferences,
  EmergencyContact,
  WorkSchedule,
  ContactInformation,
  TrainingRecord,
  PerformanceMetrics,
} from '../types/profile';

// Profile Type Guards
export const isPatientProfile = (profile: Profile): profile is PatientProfile => {
  return 'patient_id' in profile && 'verification_status' in profile;
};

export const isEmployeeProfile = (profile: Profile): profile is EmployeeProfile => {
  return 'employee_id' in profile && 'employee_type' in profile;
};

export const isAdminProfile = (profile: Profile): profile is AdminProfile => {
  return 'admin_level' in profile && 'system_permissions' in profile;
};

// Profile Status Utilities
export const getProfileStatusColor = (status: ProfileStatus | EmploymentStatus): string => {
  switch (status) {
    case 'active': return '#10B981';
    case 'inactive': return '#6B7280';
    case 'suspended': return '#EF4444';
    case 'terminated': return '#DC2626';
    case 'on_leave': return '#F59E0B';
    default: return '#6B7280';
  }
};

export const getProfileStatusText = (status: ProfileStatus | EmploymentStatus): string => {
  return status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
};

export const getVerificationStatusColor = (status: VerificationStatus): string => {
  switch (status) {
    case 'verified': return '#10B981';
    case 'pending': return '#F59E0B';
    case 'rejected': return '#EF4444';
    default: return '#6B7280';
  }
};

// Profile Type Utilities
export const getProfileTypeColor = (type: ProfileType): string => {
  switch (type) {
    case 'patient': return '#3B82F6';
    case 'employee': return '#10B981';
    case 'admin': return '#8B5CF6';
    case 'legacy': return '#6B7280';
    default: return '#6B7280';
  }
};

export const getEmployeeTypeDisplayName = (type: EmployeeType): string => {
  const displayNames: Record<EmployeeType, string> = {
    doctor: 'Doctor',
    supervisor: 'Supervisor',
    nurse: 'Nurse',
    data_entry_clerk: 'Data Entry Clerk',
    technician: 'Technician',
    administrator: 'Administrator'
  };
  return displayNames[type] || type;
};

export const getAdminLevelDisplayName = (level: AdminLevel): string => {
  const displayNames: Record<AdminLevel, string> = {
    super_admin: 'Super Administrator',
    system_admin: 'System Administrator',
    facility_admin: 'Facility Administrator'
  };
  return displayNames[level] || level;
};

// Permission Utilities
export const hasPatientPermission = (profile: PatientProfile, permission: PatientAccessPermission): boolean => {
  return profile.access_permissions.includes(permission);
};

export const hasSystemPermission = (profile: AdminProfile, permission: SystemPermission): boolean => {
  return profile.system_permissions.includes(permission);
};

export const canUserPerformAction = (user: UserWithProfile, action: string): boolean => {
  if (!user.profile) return false;

  // Admin users have broad permissions
  if (user.profileType === 'admin') {
    const adminProfile = user.profile as AdminProfile;
    return hasSystemPermission(adminProfile, action as SystemPermission);
  }

  // Employee permissions based on type and role
  if (user.profileType === 'employee') {
    const employeeProfile = user.profile as EmployeeProfile;
    
    // Doctors and supervisors have more permissions
    if (['doctor', 'supervisor', 'administrator'].includes(employeeProfile.employee_type)) {
      return true;
    }
    
    // Nurses can perform basic medical actions
    if (employeeProfile.employee_type === 'nurse') {
      const nurseActions = ['administer_vaccine', 'view_patient_records', 'update_immunization_records'];
      return nurseActions.includes(action);
    }
    
    // Data entry clerks can perform data-related actions
    if (employeeProfile.employee_type === 'data_entry_clerk') {
      const dataActions = ['create_patient', 'update_patient', 'view_patient_records'];
      return dataActions.includes(action);
    }
  }

  // Patient permissions
  if (user.profileType === 'patient') {
    const patientProfile = user.profile as PatientProfile;
    const patientActions = ['view_own_records', 'update_contact_info', 'download_certificates'];
    return patientActions.includes(action) && hasPatientPermission(patientProfile, action as PatientAccessPermission);
  }

  return false;
};

// License Validation Utilities
export const isLicenseValid = (profile: EmployeeProfile): boolean => {
  if (!profile.license_expiry_date) return true; // No expiry date means no license required
  
  const expiryDate = new Date(profile.license_expiry_date);
  const today = new Date();
  return expiryDate > today;
};

export const getLicenseExpiryStatus = (profile: EmployeeProfile): {
  isValid: boolean;
  status: 'valid' | 'expiring_soon' | 'expired' | 'no_license';
  daysUntilExpiry?: number;
  message: string;
} => {
  if (!profile.license_number) {
    return {
      isValid: true,
      status: 'no_license',
      message: 'No license required'
    };
  }

  if (!profile.license_expiry_date) {
    return {
      isValid: true,
      status: 'valid',
      message: 'No expiry date'
    };
  }

  const expiryDate = new Date(profile.license_expiry_date);
  const today = new Date();
  const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (daysUntilExpiry < 0) {
    return {
      isValid: false,
      status: 'expired',
      daysUntilExpiry,
      message: `Expired ${Math.abs(daysUntilExpiry)} days ago`
    };
  }

  if (daysUntilExpiry <= 30) {
    return {
      isValid: true,
      status: 'expiring_soon',
      daysUntilExpiry,
      message: `Expires in ${daysUntilExpiry} days`
    };
  }

  return {
    isValid: true,
    status: 'valid',
    daysUntilExpiry,
    message: 'Valid'
  };
};

// Facility Access Utilities
export const getFacilityAccess = (profile: Profile): string[] => {
  if (isEmployeeProfile(profile)) {
    const facilities = [profile.primary_facility_id];
    if (profile.assigned_facilities) {
      facilities.push(...profile.assigned_facilities);
    }
    return [...new Set(facilities)]; // Remove duplicates
  }

  if (isAdminProfile(profile)) {
    if (profile.facility_access_scope === 'all') {
      return ['*']; // Represents all facilities
    }
    if (profile.assigned_facilities) {
      return profile.assigned_facilities;
    }
  }

  return [profile.facility_id];
};

export const canAccessFacility = (profile: Profile, facilityId: string): boolean => {
  const accessibleFacilities = getFacilityAccess(profile);
  return accessibleFacilities.includes('*') || accessibleFacilities.includes(facilityId);
};

// Display Name Utilities
export const getDisplayName = (user: UserWithProfile): string => {
  if (user.profileType === 'employee' && user.profile) {
    const employeeProfile = user.profile as EmployeeProfile;
    if (employeeProfile.professional_title) {
      return `${employeeProfile.professional_title} ${user.name}`;
    }
  }
  return user.name;
};

export const getProfileDisplayInfo = (profile: Profile): {
  title: string;
  subtitle: string;
  status: string;
  statusColor: string;
} => {
  if (isPatientProfile(profile)) {
    return {
      title: 'Patient Profile',
      subtitle: `Patient ID: ${profile.patient_id}`,
      status: profile.verification_status,
      statusColor: getVerificationStatusColor(profile.verification_status)
    };
  }

  if (isEmployeeProfile(profile)) {
    return {
      title: getEmployeeTypeDisplayName(profile.employee_type),
      subtitle: `Employee ID: ${profile.employee_id}`,
      status: profile.employment_status,
      statusColor: getProfileStatusColor(profile.employment_status)
    };
  }

  if (isAdminProfile(profile)) {
    return {
      title: getAdminLevelDisplayName(profile.admin_level),
      subtitle: `Security Clearance: ${profile.security_clearance}`,
      status: 'active',
      statusColor: getProfileStatusColor('active')
    };
  }

  return {
    title: 'Profile',
    subtitle: '',
    status: 'active',
    statusColor: getProfileStatusColor('active')
  };
};

// Notification Preferences Utilities
export const getDefaultNotificationPreferences = (): NotificationPreferences => ({
  email: true,
  sms: false,
  push: true,
  immunization_reminders: true,
  appointment_reminders: true,
  health_alerts: true,
  system_notifications: false,
  frequency: 'immediate'
});

export const mergeNotificationPreferences = (
  current: Partial<NotificationPreferences>,
  defaults: NotificationPreferences = getDefaultNotificationPreferences()
): NotificationPreferences => ({
  ...defaults,
  ...current
});

// Emergency Contact Utilities
export const formatEmergencyContact = (contact: EmergencyContact): string => {
  return `${contact.name} (${contact.relationship}) - ${contact.phone}`;
};

export const validateEmergencyContact = (contact: Partial<EmergencyContact>): string[] => {
  const errors: string[] = [];
  
  if (!contact.name?.trim()) {
    errors.push('Name is required');
  }
  
  if (!contact.relationship?.trim()) {
    errors.push('Relationship is required');
  }
  
  if (!contact.phone?.trim()) {
    errors.push('Phone number is required');
  } else if (!/^\+?[0-9\s-()]+$/.test(contact.phone)) {
    errors.push('Invalid phone number format');
  }
  
  if (contact.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)) {
    errors.push('Invalid email format');
  }
  
  return errors;
};

// Work Schedule Utilities
export const formatWorkSchedule = (schedule: WorkSchedule): string => {
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const workDays = days.filter(day => schedule[day as keyof WorkSchedule]);
  
  if (workDays.length === 0) return 'No schedule set';
  if (workDays.length === 7) return 'Full week';
  if (workDays.length === 5 && !workDays.includes('saturday') && !workDays.includes('sunday')) {
    return 'Weekdays';
  }
  
  return workDays.map(day => day.charAt(0).toUpperCase() + day.slice(1, 3)).join(', ');
};

export const isWorkingDay = (schedule: WorkSchedule, date: Date): boolean => {
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayName = dayNames[date.getDay()] as keyof WorkSchedule;
  return !!schedule[dayName];
};

// Training Record Utilities
export const getActiveTrainingRecords = (records: TrainingRecord[]): TrainingRecord[] => {
  return records.filter(record => record.status === 'active');
};

export const getExpiringTrainingRecords = (records: TrainingRecord[], daysAhead: number = 30): TrainingRecord[] => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() + daysAhead);
  
  return records.filter(record => {
    if (!record.expiry_date) return false;
    const expiryDate = new Date(record.expiry_date);
    return expiryDate <= cutoffDate && expiryDate > new Date();
  });
};

// Performance Metrics Utilities
export const calculateCompletionRate = (metrics: PerformanceMetrics): number => {
  if (metrics.goals.length === 0) return 100;
  
  const completedGoals = metrics.goals.filter(goal => goal.current >= goal.target).length;
  return Math.round((completedGoals / metrics.goals.length) * 100);
};

export const getPerformanceStatus = (metrics: PerformanceMetrics): 'excellent' | 'good' | 'needs_improvement' => {
  const completionRate = calculateCompletionRate(metrics);
  
  if (completionRate >= 90) return 'excellent';
  if (completionRate >= 70) return 'good';
  return 'needs_improvement';
};

// Profile Validation Utilities
export const validateProfileData = (profile: Partial<Profile>, profileType: ProfileType): string[] => {
  const errors: string[] = [];
  
  // Common validations
  if (!profile.facility_id?.trim()) {
    errors.push('Facility ID is required');
  }
  
  // Type-specific validations
  if (profileType === 'patient') {
    const patientProfile = profile as Partial<PatientProfile>;
    if (!patientProfile.patient_id?.trim()) {
      errors.push('Patient ID is required');
    }
  }
  
  if (profileType === 'employee') {
    const employeeProfile = profile as Partial<EmployeeProfile>;
    if (!employeeProfile.employee_id?.trim()) {
      errors.push('Employee ID is required');
    }
    if (!employeeProfile.employee_type) {
      errors.push('Employee type is required');
    }
    if (!employeeProfile.primary_facility_id?.trim()) {
      errors.push('Primary facility ID is required');
    }
  }
  
  if (profileType === 'admin') {
    const adminProfile = profile as Partial<AdminProfile>;
    if (!adminProfile.admin_level) {
      errors.push('Admin level is required');
    }
    if (!adminProfile.security_clearance) {
      errors.push('Security clearance is required');
    }
  }
  
  return errors;
};

// Profile Search and Filter Utilities
export const searchProfiles = <T extends Profile>(
  profiles: T[],
  searchTerm: string,
  searchFields: (keyof T)[] = ['$id' as keyof T]
): T[] => {
  if (!searchTerm.trim()) return profiles;
  
  const term = searchTerm.toLowerCase();
  return profiles.filter(profile =>
    searchFields.some(field => {
      const value = profile[field];
      if (typeof value === 'string') {
        return value.toLowerCase().includes(term);
      }
      if (Array.isArray(value)) {
        return value.some(item => 
          typeof item === 'string' && item.toLowerCase().includes(term)
        );
      }
      return false;
    })
  );
};

export const filterProfilesByStatus = <T extends Profile>(
  profiles: T[],
  status: string
): T[] => {
  return profiles.filter(profile => {
    if ('profile_status' in profile) {
      return profile.profile_status === status;
    }
    if ('employment_status' in profile) {
      return profile.employment_status === status;
    }
    return true;
  });
};

// Export all utilities
export default {
  // Type guards
  isPatientProfile,
  isEmployeeProfile,
  isAdminProfile,
  
  // Status utilities
  getProfileStatusColor,
  getProfileStatusText,
  getVerificationStatusColor,
  
  // Type utilities
  getProfileTypeColor,
  getEmployeeTypeDisplayName,
  getAdminLevelDisplayName,
  
  // Permission utilities
  hasPatientPermission,
  hasSystemPermission,
  canUserPerformAction,
  
  // License utilities
  isLicenseValid,
  getLicenseExpiryStatus,
  
  // Facility utilities
  getFacilityAccess,
  canAccessFacility,
  
  // Display utilities
  getDisplayName,
  getProfileDisplayInfo,
  
  // Notification utilities
  getDefaultNotificationPreferences,
  mergeNotificationPreferences,
  
  // Emergency contact utilities
  formatEmergencyContact,
  validateEmergencyContact,
  
  // Work schedule utilities
  formatWorkSchedule,
  isWorkingDay,
  
  // Training utilities
  getActiveTrainingRecords,
  getExpiringTrainingRecords,
  
  // Performance utilities
  calculateCompletionRate,
  getPerformanceStatus,
  
  // Validation utilities
  validateProfileData,
  
  // Search and filter utilities
  searchProfiles,
  filterProfilesByStatus,
};