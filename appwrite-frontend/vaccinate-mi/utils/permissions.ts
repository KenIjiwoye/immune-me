import React from 'react';
import { useAuth } from '../context/auth';
import { ProfileType, Profile } from '../types/profile';
import profileService from '../services/profileService';

// Permission constants
export const PERMISSIONS = {
  // Patient management
  VIEW_PATIENTS: 'view_patients',
  CREATE_PATIENTS: 'create_patients',
  EDIT_PATIENTS: 'edit_patients',
  DELETE_PATIENTS: 'delete_patients',

  // Immunization management
  VIEW_IMMUNIZATIONS: 'view_immunizations',
  ADMINISTER_VACCINES: 'administer_vaccines',
  EDIT_IMMUNIZATION_RECORDS: 'edit_immunization_records',

  // Vaccine management
  VIEW_VACCINES: 'view_vaccines',
  CREATE_VACCINES: 'create_vaccines',
  EDIT_VACCINES: 'edit_vaccines',
  DELETE_VACCINES: 'delete_vaccines',

  // Facility management
  VIEW_FACILITIES: 'view_facilities',
  CREATE_FACILITIES: 'create_facilities',
  EDIT_FACILITIES: 'edit_facilities',
  DELETE_FACILITIES: 'delete_facilities',

  // User management
  VIEW_USERS: 'view_users',
  CREATE_USERS: 'create_users',
  EDIT_USERS: 'edit_users',
  DELETE_USERS: 'delete_users',
  MANAGE_ROLES: 'manage_roles',

  // Reporting
  GENERATE_REPORTS: 'generate_reports',
  VIEW_ANALYTICS: 'view_analytics',
  EXPORT_DATA: 'export_data',

  // System administration
  MANAGE_SYSTEM_SETTINGS: 'manage_system_settings',
  ACCESS_AUDIT_LOGS: 'access_audit_logs',
  MANAGE_NOTIFICATIONS: 'manage_notifications',
  MANAGE_SCHEDULES: 'manage_schedules',

  // Emergency access
  EMERGENCY_ACCESS: 'emergency_access',

  // Patient-specific permissions
  VIEW_OWN_RECORDS: 'view_own_records',
  EDIT_OWN_PROFILE: 'edit_own_profile',
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

// Role-based permission mappings
export const ROLE_PERMISSIONS: Record<ProfileType, Permission[]> = {
  admin: [
    PERMISSIONS.VIEW_PATIENTS,
    PERMISSIONS.CREATE_PATIENTS,
    PERMISSIONS.EDIT_PATIENTS,
    PERMISSIONS.DELETE_PATIENTS,
    PERMISSIONS.VIEW_IMMUNIZATIONS,
    PERMISSIONS.ADMINISTER_VACCINES,
    PERMISSIONS.EDIT_IMMUNIZATION_RECORDS,
    PERMISSIONS.VIEW_VACCINES,
    PERMISSIONS.CREATE_VACCINES,
    PERMISSIONS.EDIT_VACCINES,
    PERMISSIONS.DELETE_VACCINES,
    PERMISSIONS.VIEW_FACILITIES,
    PERMISSIONS.CREATE_FACILITIES,
    PERMISSIONS.EDIT_FACILITIES,
    PERMISSIONS.DELETE_FACILITIES,
    PERMISSIONS.VIEW_USERS,
    PERMISSIONS.CREATE_USERS,
    PERMISSIONS.EDIT_USERS,
    PERMISSIONS.DELETE_USERS,
    PERMISSIONS.MANAGE_ROLES,
    PERMISSIONS.GENERATE_REPORTS,
    PERMISSIONS.VIEW_ANALYTICS,
    PERMISSIONS.EXPORT_DATA,
    PERMISSIONS.MANAGE_SYSTEM_SETTINGS,
    PERMISSIONS.ACCESS_AUDIT_LOGS,
    PERMISSIONS.MANAGE_NOTIFICATIONS,
    PERMISSIONS.MANAGE_SCHEDULES,
    PERMISSIONS.EMERGENCY_ACCESS,
  ],
  employee: [
    PERMISSIONS.VIEW_PATIENTS,
    PERMISSIONS.CREATE_PATIENTS,
    PERMISSIONS.EDIT_PATIENTS,
    PERMISSIONS.VIEW_IMMUNIZATIONS,
    PERMISSIONS.ADMINISTER_VACCINES,
    PERMISSIONS.EDIT_IMMUNIZATION_RECORDS,
    PERMISSIONS.VIEW_VACCINES,
    PERMISSIONS.VIEW_FACILITIES,
    PERMISSIONS.GENERATE_REPORTS,
    PERMISSIONS.VIEW_ANALYTICS,
    PERMISSIONS.MANAGE_NOTIFICATIONS,
    PERMISSIONS.MANAGE_SCHEDULES,
  ],
  patient: [
    PERMISSIONS.VIEW_OWN_RECORDS,
    PERMISSIONS.EDIT_OWN_PROFILE,
  ],
};

// Permission checking utilities
export class PermissionChecker {
  /**
   * Check if user has specific permission
   */
  static hasPermission(userPermissions: string[], permission: Permission): boolean {
    return userPermissions.includes(permission);
  }

  /**
   * Check if user has any of the specified permissions
   */
  static hasAnyPermission(userPermissions: string[], permissions: Permission[]): boolean {
    return permissions.some(permission => userPermissions.includes(permission));
  }

  /**
   * Check if user has all of the specified permissions
   */
  static hasAllPermissions(userPermissions: string[], permissions: Permission[]): boolean {
    return permissions.every(permission => userPermissions.includes(permission));
  }

  /**
   * Check if user has specific role
   */
  static hasRole(userRole: ProfileType, requiredRole: ProfileType): boolean {
    return userRole === requiredRole;
  }

  /**
   * Check if user has any of the specified roles
   */
  static hasAnyRole(userRole: ProfileType, roles: ProfileType[]): boolean {
    return roles.includes(userRole);
  }

  /**
   * Check if user can access specific facility
   */
  static canAccessFacility(profile: Profile | null, facilityId: string): boolean {
    return profileService.utils.canAccessFacility(profile, facilityId);
  }

  /**
   * Check if user can access any of the specified facilities
   */
  static canAccessAnyFacility(profile: Profile | null, facilityIds: string[]): boolean {
    return facilityIds.some(facilityId => this.canAccessFacility(profile, facilityId));
  }

  /**
   * Check if user can access all of the specified facilities
   */
  static canAccessAllFacilities(profile: Profile | null, facilityIds: string[]): boolean {
    return facilityIds.every(facilityId => this.canAccessFacility(profile, facilityId));
  }

  /**
   * Get accessible facilities for user
   */
  static getAccessibleFacilities(profile: Profile | null): string[] {
    return profileService.utils.getFacilityAccess(profile);
  }

  /**
   * Check if user is admin
   */
  static isAdmin(profileType: ProfileType): boolean {
    return profileType === 'admin';
  }

  /**
   * Check if user is employee
   */
  static isEmployee(profileType: ProfileType): boolean {
    return profileType === 'employee';
  }

  /**
   * Check if user is patient
   */
  static isPatient(profileType: ProfileType): boolean {
    return profileType === 'patient';
  }

  /**
   * Get permissions for role
   */
  static getRolePermissions(role: ProfileType): Permission[] {
    return ROLE_PERMISSIONS[role] || [];
  }

  /**
   * Check if permission is valid
   */
  static isValidPermission(permission: string): permission is Permission {
    return Object.values(PERMISSIONS).includes(permission as Permission);
  }

  /**
   * Check if role is valid
   */
  static isValidRole(role: string): role is ProfileType {
    return ['admin', 'employee', 'patient'].includes(role);
  }
}

// React hooks for permission checking
export const usePermissions = () => {
  const { user, hasPermission, canAccessFacility } = useAuth();

  return {
    // User info
    user,
    profileType: user?.profileType || 'patient',
    permissions: user?.permissions || [],
    facilityId: user?.facilityId,

    // Permission checks
    hasPermission: (permission: Permission) => hasPermission(permission),
    hasAnyPermission: (permissions: Permission[]) =>
      PermissionChecker.hasAnyPermission(user?.permissions || [], permissions),
    hasAllPermissions: (permissions: Permission[]) =>
      PermissionChecker.hasAllPermissions(user?.permissions || [], permissions),

    // Role checks
    hasRole: (role: ProfileType) => PermissionChecker.hasRole(user?.profileType || 'patient', role),
    hasAnyRole: (roles: ProfileType[]) =>
      PermissionChecker.hasAnyRole(user?.profileType || 'patient', roles),
    isAdmin: () => PermissionChecker.isAdmin(user?.profileType || 'patient'),
    isEmployee: () => PermissionChecker.isEmployee(user?.profileType || 'patient'),
    isPatient: () => PermissionChecker.isPatient(user?.profileType || 'patient'),

    // Facility checks
    canAccessFacility: (facilityId: string) => canAccessFacility(facilityId),
    canAccessAnyFacility: (facilityIds: string[]) =>
      PermissionChecker.canAccessAnyFacility(user?.profile || null, facilityIds),
    canAccessAllFacilities: (facilityIds: string[]) =>
      PermissionChecker.canAccessAllFacilities(user?.profile || null, facilityIds),
    getAccessibleFacilities: () => PermissionChecker.getAccessibleFacilities(user?.profile || null),

    // Utility functions
    getRolePermissions: (role: ProfileType) => PermissionChecker.getRolePermissions(role),
  };
};

// Higher-order component for permission-based rendering
export const withPermission = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  permission: Permission,
  fallback?: React.ComponentType<any>
) => {
  const WithPermissionComponent = (props: P) => {
    const { hasPermission } = usePermissions();

    if (!hasPermission(permission)) {
      if (fallback) {
        const FallbackComponent = fallback;
        return React.createElement(FallbackComponent, props);
      }
      return null;
    }

    return React.createElement(WrappedComponent, props);
  };

  WithPermissionComponent.displayName = `withPermission(${WrappedComponent.displayName || WrappedComponent.name})`;
  return WithPermissionComponent;
};

// Higher-order component for role-based rendering
export const withRole = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  role: ProfileType | ProfileType[],
  fallback?: React.ComponentType<any>
) => {
  const WithRoleComponent = (props: P) => {
    const { hasAnyRole } = usePermissions();
    const roles = Array.isArray(role) ? role : [role];

    if (!hasAnyRole(roles)) {
      if (fallback) {
        const FallbackComponent = fallback;
        return React.createElement(FallbackComponent, props);
      }
      return null;
    }

    return React.createElement(WrappedComponent, props);
  };

  WithRoleComponent.displayName = `withRole(${WrappedComponent.displayName || WrappedComponent.name})`;
  return WithRoleComponent;
};

// Higher-order component for facility-based rendering
export const withFacilityAccess = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  facilityId: string | string[],
  fallback?: React.ComponentType<any>
) => {
  const WithFacilityAccessComponent = (props: P) => {
    const { canAccessAnyFacility } = usePermissions();
    const facilityIds = Array.isArray(facilityId) ? facilityId : [facilityId];

    if (!canAccessAnyFacility(facilityIds)) {
      if (fallback) {
        const FallbackComponent = fallback;
        return React.createElement(FallbackComponent, props);
      }
      return null;
    }

    return React.createElement(WrappedComponent, props);
  };

  WithFacilityAccessComponent.displayName = `withFacilityAccess(${WrappedComponent.displayName || WrappedComponent.name})`;
  return WithFacilityAccessComponent;
};

// Conditional rendering hook
export const useConditionalRender = () => {
  const permissions = usePermissions();

  return {
    // Render if user has permission
    renderIfHasPermission: (permission: Permission, component: React.ReactElement) => {
      return permissions.hasPermission(permission) ? component : null;
    },

    // Render if user has any of the permissions
    renderIfHasAnyPermission: (permissionsList: Permission[], component: React.ReactElement) => {
      return permissions.hasAnyPermission(permissionsList) ? component : null;
    },

    // Render if user has role
    renderIfHasRole: (role: ProfileType, component: React.ReactElement) => {
      return permissions.hasRole(role) ? component : null;
    },

    // Render if user has any of the roles
    renderIfHasAnyRole: (roles: ProfileType[], component: React.ReactElement) => {
      return permissions.hasAnyRole(roles) ? component : null;
    },

    // Render if user can access facility
    renderIfCanAccessFacility: (facilityId: string, component: React.ReactElement) => {
      return permissions.canAccessFacility(facilityId) ? component : null;
    },

    // Render if user can access any of the facilities
    renderIfCanAccessAnyFacility: (facilityIds: string[], component: React.ReactElement) => {
      return permissions.canAccessAnyFacility(facilityIds) ? component : null;
    },
  };
};

export default PermissionChecker;