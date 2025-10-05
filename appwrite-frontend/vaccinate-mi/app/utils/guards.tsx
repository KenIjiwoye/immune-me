import React, { useEffect } from 'react';
import { router } from 'expo-router';
import { useAuth } from '../context/auth';
import { ProfileType } from '../types/profile';
import { Permission } from './permissions';

// Auth Guard Component - Redirects unauthenticated users to login
export const AuthGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/(auth)/login');
    }
  }, [isAuthenticated, isLoading]);

  if (isLoading) {
    return null; // Or a loading spinner
  }

  if (!isAuthenticated) {
    return null; // Will redirect
  }

  return <>{children}</>;
};

// Role-based Guard Component
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
  const { user, isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
      const hasAccess = roles.includes(user.profileType);

      if (!hasAccess && redirectTo) {
        router.replace(redirectTo);
      }
    }
  }, [user, isAuthenticated, isLoading, allowedRoles, redirectTo]);

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
  const hasAccess = roles.includes(user.profileType);

  if (!hasAccess) {
    return fallback || null;
  }

  return <>{children}</>;
};

// Permission-based Guard Component
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
  const { user, isAuthenticated, isLoading, hasPermission } = useAuth();

  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      const permissions = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];
      const hasAccess = requireAll
        ? permissions.every(perm => hasPermission(perm))
        : permissions.some(perm => hasPermission(perm));

      if (!hasAccess && redirectTo) {
        router.replace(redirectTo);
      }
    }
  }, [user, isAuthenticated, isLoading, requiredPermissions, requireAll, redirectTo, hasPermission]);

  if (isLoading) {
    return null; // Or a loading spinner
  }

  if (!isAuthenticated) {
    return null; // AuthGuard should handle this
  }

  if (!user) {
    return fallback || null;
  }

  const permissions = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];
  const hasAccess = requireAll
    ? permissions.every(perm => hasPermission(perm))
    : permissions.some(perm => hasPermission(perm));

  if (!hasAccess) {
    return fallback || null;
  }

  return <>{children}</>;
};

// Facility-based Guard Component
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
  const { user, isAuthenticated, isLoading, canAccessFacility } = useAuth();

  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      const facilityIds = Array.isArray(facilityId) ? facilityId : [facilityId];
      const hasAccess = requireAll
        ? facilityIds.every(id => canAccessFacility(id))
        : facilityIds.some(id => canAccessFacility(id));

      if (!hasAccess && redirectTo) {
        router.replace(redirectTo);
      }
    }
  }, [user, isAuthenticated, isLoading, facilityId, requireAll, redirectTo, canAccessFacility]);

  if (isLoading) {
    return null; // Or a loading spinner
  }

  if (!isAuthenticated) {
    return null; // AuthGuard should handle this
  }

  if (!user) {
    return fallback || null;
  }

  const facilityIds = Array.isArray(facilityId) ? facilityId : [facilityId];
  const hasAccess = requireAll
    ? facilityIds.every(id => canAccessFacility(id))
    : facilityIds.some(id => canAccessFacility(id));

  if (!hasAccess) {
    return fallback || null;
  }

  return <>{children}</>;
};

// Combined Guard for complex requirements
interface CombinedGuardProps {
  children: React.ReactNode;
  allowedRoles?: ProfileType | ProfileType[];
  requiredPermissions?: Permission | Permission[];
  facilityId?: string | string[];
  requireAllPermissions?: boolean;
  requireAllFacilities?: boolean;
  fallback?: React.ReactNode;
  redirectTo?: string;
}

export const CombinedGuard: React.FC<CombinedGuardProps> = ({
  children,
  allowedRoles,
  requiredPermissions,
  facilityId,
  requireAllPermissions = false,
  requireAllFacilities = false,
  fallback,
  redirectTo
}) => {
  const { user, isAuthenticated, isLoading, hasPermission, canAccessFacility } = useAuth();

  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      let hasAccess = true;

      // Check roles
      if (allowedRoles) {
        const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
        hasAccess = hasAccess && roles.includes(user.profileType);
      }

      // Check permissions
      if (requiredPermissions && hasAccess) {
        const permissions = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];
        hasAccess = hasAccess && (requireAllPermissions
          ? permissions.every(perm => hasPermission(perm))
          : permissions.some(perm => hasPermission(perm)));
      }

      // Check facilities
      if (facilityId && hasAccess) {
        const facilityIds = Array.isArray(facilityId) ? facilityId : [facilityId];
        hasAccess = hasAccess && (requireAllFacilities
          ? facilityIds.every(id => canAccessFacility(id))
          : facilityIds.some(id => canAccessFacility(id)));
      }

      if (!hasAccess && redirectTo) {
        router.replace(redirectTo);
      }
    }
  }, [
    user, isAuthenticated, isLoading, allowedRoles, requiredPermissions,
    facilityId, requireAllPermissions, requireAllFacilities, redirectTo,
    hasPermission, canAccessFacility
  ]);

  if (isLoading) {
    return null; // Or a loading spinner
  }

  if (!isAuthenticated) {
    return null; // AuthGuard should handle this
  }

  if (!user) {
    return fallback || null;
  }

  let hasAccess = true;

  // Check roles
  if (allowedRoles) {
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    hasAccess = hasAccess && roles.includes(user.profileType);
  }

  // Check permissions
  if (requiredPermissions && hasAccess) {
    const permissions = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];
    hasAccess = hasAccess && (requireAllPermissions
      ? permissions.every(perm => hasPermission(perm))
      : permissions.some(perm => hasPermission(perm)));
  }

  // Check facilities
  if (facilityId && hasAccess) {
    const facilityIds = Array.isArray(facilityId) ? facilityId : [facilityId];
    hasAccess = hasAccess && (requireAllFacilities
      ? facilityIds.every(id => canAccessFacility(id))
      : facilityIds.some(id => canAccessFacility(id)));
  }

  if (!hasAccess) {
    return fallback || null;
  }

  return <>{children}</>;
};

// Hook for programmatic navigation with guards
export const useGuardedNavigation = () => {
  const { user, hasPermission, canAccessFacility } = useAuth();

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
      router.replace('/(auth)/login');
      return;
    }

    let hasAccess = true;

    // Check roles
    if (options?.allowedRoles) {
      const roles = Array.isArray(options.allowedRoles) ? options.allowedRoles : [options.allowedRoles];
      hasAccess = hasAccess && roles.includes(user.profileType);
    }

    // Check permissions
    if (options?.requiredPermissions && hasAccess) {
      const permissions = Array.isArray(options.requiredPermissions) ? options.requiredPermissions : [options.requiredPermissions];
      hasAccess = hasAccess && (options.requireAllPermissions
        ? permissions.every(perm => hasPermission(perm))
        : permissions.some(perm => hasPermission(perm)));
    }

    // Check facilities
    if (options?.facilityId && hasAccess) {
      const facilityIds = Array.isArray(options.facilityId) ? options.facilityId : [options.facilityId];
      hasAccess = hasAccess && (options.requireAllFacilities
        ? facilityIds.every(id => canAccessFacility(id))
        : facilityIds.some(id => canAccessFacility(id)));
    }

    if (hasAccess) {
      router.push(route);
    } else if (options?.fallbackRoute) {
      router.replace(options.fallbackRoute);
    }
  };

  return { navigateWithGuard };
};

export default {
  AuthGuard,
  RoleGuard,
  PermissionGuard,
  FacilityGuard,
  CombinedGuard,
  useGuardedNavigation,
};