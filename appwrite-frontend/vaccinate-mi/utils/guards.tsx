import React, { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { ProfileType } from '../types/profile';
import { Permission, PERMISSIONS } from './permissions';
import { getLoggedInUser, isUserAuthenticated } from './authUtils';

// Auth Guard Component - Redirects unauthenticated users to login
export const AuthGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const authStatus = await isUserAuthenticated();
        setIsAuthenticated(authStatus);
        
        if (!authStatus) {
          router.replace('/(auth)/login');
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        router.replace('/(auth)/login');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  if (isLoading) {
    return null; // Or a loading spinner
  }

  if (!isAuthenticated) {
    return null; // Will redirect
  }

  return <>{children}</>;
};

// Simple Role Guard Component - Basic role checking
interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: ProfileType | ProfileType[];
  fallback?: React.ReactNode;
  redirectTo?: string;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({
  children,
  allowedRoles,
  fallback,
  redirectTo
}) => {
  const [user, setUser] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const authStatus = await isUserAuthenticated();
        setIsAuthenticated(authStatus);
        
        if (authStatus) {
          const userData = await getLoggedInUser();
          setUser(userData);
          
          const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
          const hasAccess = roles.includes(userData.role as ProfileType);

          if (!hasAccess && redirectTo) {
            router.replace(redirectTo as any);
          }
        }
      } catch (error) {
        console.error('Role guard check failed:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [allowedRoles, redirectTo]);

  if (isLoading) {
    return null; // Or a loading spinner
  }

  if (!isAuthenticated) {
    return null; // AuthGuard should handle this
  }

  if (!user) {
    return fallback || null;
  }

  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  const hasAccess = roles.includes(user.role as ProfileType);

  if (!hasAccess) {
    return fallback || null;
  }

  return <>{children}</>;
};

// Simple Permission Guard Component - Basic permission checking
interface PermissionGuardProps {
  children: React.ReactNode;
  requiredPermissions: Permission | Permission[];
  requireAll?: boolean; // If true, user must have ALL permissions; if false, ANY permission
  fallback?: React.ReactNode;
  redirectTo?: string;
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  children,
  requiredPermissions,
  requireAll = false,
  fallback,
  redirectTo
}) => {
  const [user, setUser] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const authStatus = await isUserAuthenticated();
        setIsAuthenticated(authStatus);
        
        if (authStatus) {
          const userData = await getLoggedInUser();
          setUser(userData);
          
          // For now, we'll assume basic permissions based on role
          // In a full implementation, you'd fetch user permissions
          const hasAccess = checkBasicPermissions(userData.role as ProfileType, requiredPermissions, requireAll);

          if (!hasAccess && redirectTo) {
            router.replace(redirectTo as any);
          }
        }
      } catch (error) {
        console.error('Permission guard check failed:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [requiredPermissions, requireAll, redirectTo]);

  if (isLoading) {
    return null; // Or a loading spinner
  }

  if (!isAuthenticated) {
    return null; // AuthGuard should handle this
  }

  if (!user) {
    return fallback || null;
  }

  const hasAccess = checkBasicPermissions(user.role as ProfileType, requiredPermissions, requireAll);

  if (!hasAccess) {
    return fallback || null;
  }

  return <>{children}</>;
};

// Helper function for basic permission checking
function checkBasicPermissions(userRole: ProfileType, requiredPermissions: Permission | Permission[], requireAll: boolean): boolean {
  // Basic role-based permission mapping using actual permission constants
  const rolePermissions: Record<ProfileType, Permission[]> = {
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
    ]
  };

  const userPermissions = rolePermissions[userRole] || [];
  const permissions = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];

  if (requireAll) {
    return permissions.every(perm => userPermissions.includes(perm));
  } else {
    return permissions.some(perm => userPermissions.includes(perm));
  }
}

// Simple Facility Guard Component - Basic facility checking
interface FacilityGuardProps {
  children: React.ReactNode;
  facilityId: string | string[];
  requireAll?: boolean; // If true, user must access ALL facilities; if false, ANY facility
  fallback?: React.ReactNode;
  redirectTo?: string;
}

export const FacilityGuard: React.FC<FacilityGuardProps> = ({
  children,
  facilityId,
  requireAll = false,
  fallback,
  redirectTo
}) => {
  const [user, setUser] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const authStatus = await isUserAuthenticated();
        setIsAuthenticated(authStatus);
        
        if (authStatus) {
          const userData = await getLoggedInUser();
          setUser(userData);
          
          // For now, we'll assume basic facility access based on role
          // In a full implementation, you'd check user facility permissions
          const hasAccess = checkBasicFacilityAccess(userData, facilityId, requireAll);

          if (!hasAccess && redirectTo) {
            router.replace(redirectTo as any);
          }
        }
      } catch (error) {
        console.error('Facility guard check failed:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [facilityId, requireAll, redirectTo]);

  if (isLoading) {
    return null; // Or a loading spinner
  }

  if (!isAuthenticated) {
    return null; // AuthGuard should handle this
  }

  if (!user) {
    return fallback || null;
  }

  const hasAccess = checkBasicFacilityAccess(user, facilityId, requireAll);

  if (!hasAccess) {
    return fallback || null;
  }

  return <>{children}</>;
};

// Helper function for basic facility access checking
function checkBasicFacilityAccess(user: any, facilityId: string | string[], requireAll: boolean): boolean {
  // For now, admins and employees have access to all facilities
  // Patients only have access to their own facility
  if (user.role === 'admin' || user.role === 'employee') {
    return true;
  }
  
  if (user.role === 'patient') {
    const facilityIds = Array.isArray(facilityId) ? facilityId : [facilityId];
    if (requireAll) {
      return facilityIds.every(id => id === user.facilityId);
    } else {
      return facilityIds.some(id => id === user.facilityId);
    }
  }
  
  return false;
}

// Hook for programmatic navigation with guards
export const useGuardedNavigation = () => {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await getLoggedInUser();
        setUser(userData);
      } catch (error) {
        // User not authenticated
        setUser(null);
      }
    };

    loadUser();
  }, []);

  const navigateWithGuard = (
    route: string,
    options?: {
      allowedRoles?: ProfileType | ProfileType[];
      requiredPermissions?: Permission | Permission[];
      facilityId?: string | string[];
      requireAllPermissions?: boolean;
      requireAllFacilities?: boolean;
      fallbackRoute?: string;
    }
  ) => {
    if (!user) {
      router.replace('/(auth)/login' as any);
      return;
    }

    let hasAccess = true;

    // Check roles
    if (options?.allowedRoles) {
      const roles = Array.isArray(options.allowedRoles) ? options.allowedRoles : [options.allowedRoles];
      hasAccess = hasAccess && roles.includes(user.role as ProfileType);
    }

    // Check permissions
    if (options?.requiredPermissions && hasAccess) {
      const permissions = Array.isArray(options.requiredPermissions) ? options.requiredPermissions : [options.requiredPermissions];
      hasAccess = hasAccess && checkBasicPermissions(user.role as ProfileType, permissions, options.requireAllPermissions || false);
    }

    // Check facilities
    if (options?.facilityId && hasAccess) {
      const facilityIds = Array.isArray(options.facilityId) ? options.facilityId : [options.facilityId];
      hasAccess = hasAccess && checkBasicFacilityAccess(user, facilityIds, options.requireAllFacilities || false);
    }

    if (hasAccess) {
      router.push(route as any);
    } else if (options?.fallbackRoute) {
      router.replace(options.fallbackRoute as any);
    }
  };

  return { navigateWithGuard };
};

export default {
  AuthGuard,
  RoleGuard,
  PermissionGuard,
  FacilityGuard,
  CombinedGuard: AuthGuard, // For now, just use AuthGuard as combined guard
  useGuardedNavigation,
};