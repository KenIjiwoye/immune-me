# FE-AW-15: Role-Based Context and Permission Checking in Frontend

## Priority
**High** - Essential for frontend security and user experience

## Estimated Time
4-6 hours

## Dependencies
- BE-AW-08: User roles setup
- BE-AW-09: Facility-based teams
- FE-AW-01: Appwrite SDK integration

## Description
Create role-based context and permission checking utilities in the React Native frontend to manage user permissions, facility access, and role-based functionality. This task implements client-side permission checking that works in conjunction with backend security measures.

## Current Frontend Auth Analysis
Based on the existing auth context:
- User object contains: `id`, `email`, `fullName`, `role`, `facilityId`
- Roles: `'nurse' | 'doctor' | 'administrator' | 'supervisor'`
- Current auth context provides basic authentication state

## Role System Mapping
```typescript
// Map current frontend roles to backend roles
const ROLE_MAPPING = {
  'nurse': 'user',        // Frontend 'nurse' maps to backend 'user'
  'doctor': 'doctor',     // Direct mapping
  'administrator': 'administrator', // Direct mapping
  'supervisor': 'supervisor'        // Direct mapping
};
```

## Technical Implementation

### 1. Enhanced Auth Context with Permissions
```typescript
// frontend/context/auth.tsx (Enhanced)
import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import { Client, Account, Teams, Databases } from 'appwrite';

type UserRole = 'nurse' | 'doctor' | 'administrator' | 'supervisor';

type User = {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  facilityId: string;
  labels: string[];
  teamMemberships: string[];
  permissions: UserPermissions;
};

type UserPermissions = {
  canViewAllFacilities: boolean;
  canManageUsers: boolean;
  canManageFacilities: boolean;
  canDeleteRecords: boolean;
  canGenerateReports: boolean;
  canAccessAdminPanel: boolean;
  canManageVaccines: boolean;
  accessibleFacilities: string[];
};

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  hasRole: (role: UserRole | UserRole[]) => boolean;
  hasPermission: (permission: keyof UserPermissions) => boolean;
  canAccessFacility: (facilityId: string) => boolean;
  canPerformAction: (action: string, resource?: string, facilityId?: string) => boolean;
  refreshPermissions: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize Appwrite client
  const client = new Client()
    .setEndpoint(process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID!);

  const account = new Account(client);
  const teams = new Teams(client);
  const databases = new Databases(client);

  // Load user session and permissions
  useEffect(() => {
    loadUserSession();
  }, []);

  const loadUserSession = async () => {
    try {
      setIsLoading(true);
      
      // Get current session
      const session = await account.getSession('current');
      if (session) {
        // Get user details
        const accountData = await account.get();
        
        // Get user permissions and team memberships
        const permissions = await calculateUserPermissions(accountData);
        
        const userData: User = {
          id: accountData.$id,
          email: accountData.email,
          fullName: accountData.name,
          role: extractRoleFromLabels(accountData.labels),
          facilityId: extractFacilityFromLabels(accountData.labels),
          labels: accountData.labels,
          teamMemberships: await getUserTeamMemberships(accountData.$id),
          permissions
        };
        
        setUser(userData);
      }
    } catch (error) {
      console.error('Failed to load user session:', error);
      // Clear any stored session data
      await SecureStore.deleteItemAsync('auth_session');
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      // Create session with Appwrite
      const session = await account.createEmailSession(email, password);
      
      // Store session
      await SecureStore.setItemAsync('auth_session', session.$id);
      
      // Load user data
      await loadUserSession();
      
      // Navigate to home
      router.replace('/');
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      // Delete current session
      await account.deleteSession('current');
    } catch (error) {
      console.error('Logout API call failed:', error);
    } finally {
      // Clear local state
      await SecureStore.deleteItemAsync('auth_session');
      setUser(null);
      router.replace('/login');
      setIsLoading(false);
    }
  };

  const hasRole = (roles: UserRole | UserRole[]): boolean => {
    if (!user) return false;
    const roleArray = Array.isArray(roles) ? roles : [roles];
    return roleArray.includes(user.role);
  };

  const hasPermission = (permission: keyof UserPermissions): boolean => {
    if (!user) return false;
    return user.permissions[permission];
  };

  const canAccessFacility = (facilityId: string): boolean => {
    if (!user) return false;
    
    // Administrators can access all facilities
    if (user.role === 'administrator') return true;
    
    // Supervisors can access multiple facilities
    if (user.role === 'supervisor') {
      return user.permissions.accessibleFacilities.includes(facilityId);
    }
    
    // Others can only access their assigned facility
    return user.facilityId === facilityId;
  };

  const canPerformAction = (action: string, resource?: string, facilityId?: string): boolean => {
    if (!user) return false;

    // Check facility access if facilityId is provided
    if (facilityId && !canAccessFacility(facilityId)) {
      return false;
    }

    // Define action-permission mapping
    const actionPermissions: Record<string, keyof UserPermissions> = {
      'view_all_facilities': 'canViewAllFacilities',
      'manage_users': 'canManageUsers',
      'manage_facilities': 'canManageFacilities',
      'delete_records': 'canDeleteRecords',
      'generate_reports': 'canGenerateReports',
      'access_admin': 'canAccessAdminPanel',
      'manage_vaccines': 'canManageVaccines'
    };

    const requiredPermission = actionPermissions[action];
    if (requiredPermission) {
      return hasPermission(requiredPermission);
    }

    // Default role-based checks for common actions
    switch (action) {
      case 'create_patient':
      case 'update_patient':
        return hasRole(['doctor', 'nurse', 'administrator']);
      
      case 'create_immunization':
      case 'update_immunization':
        return hasRole(['doctor', 'nurse', 'administrator']);
      
      case 'view_reports':
        return hasRole(['doctor', 'supervisor', 'administrator']);
      
      case 'send_notifications':
        return hasRole(['doctor', 'supervisor', 'administrator']);
      
      default:
        return false;
    }
  };

  const refreshPermissions = async () => {
    if (!user) return;
    
    try {
      const accountData = await account.get();
      const permissions = await calculateUserPermissions(accountData);
      
      setUser(prev => prev ? {
        ...prev,
        permissions,
        labels: accountData.labels,
        teamMemberships: await getUserTeamMemberships(accountData.$id)
      } : null);
    } catch (error) {
      console.error('Failed to refresh permissions:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        logout,
        isAuthenticated: !!user,
        hasRole,
        hasPermission,
        canAccessFacility,
        canPerformAction,
        refreshPermissions
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Helper functions
async function calculateUserPermissions(accountData: any): Promise<UserPermissions> {
  const role = extractRoleFromLabels(accountData.labels);
  const facilityId = extractFacilityFromLabels(accountData.labels);
  
  // Base permissions by role
  const basePermissions: Record<UserRole, Partial<UserPermissions>> = {
    administrator: {
      canViewAllFacilities: true,
      canManageUsers: true,
      canManageFacilities: true,
      canDeleteRecords: true,
      canGenerateReports: true,
      canAccessAdminPanel: true,
      canManageVaccines: true,
      accessibleFacilities: [] // Will be populated with all facilities
    },
    supervisor: {
      canViewAllFacilities: true,
      canManageUsers: false,
      canManageFacilities: false,
      canDeleteRecords: false,
      canGenerateReports: true,
      canAccessAdminPanel: false,
      canManageVaccines: false,
      accessibleFacilities: [] // Will be populated based on team memberships
    },
    doctor: {
      canViewAllFacilities: false,
      canManageUsers: false,
      canManageFacilities: false,
      canDeleteRecords: false,
      canGenerateReports: true,
      canAccessAdminPanel: false,
      canManageVaccines: false,
      accessibleFacilities: [facilityId]
    },
    nurse: {
      canViewAllFacilities: false,
      canManageUsers: false,
      canManageFacilities: false,
      canDeleteRecords: false,
      canGenerateReports: false,
      canAccessAdminPanel: false,
      canManageVaccines: false,
      accessibleFacilities: [facilityId]
    }
  };

  const permissions = { ...basePermissions[role] } as UserPermissions;

  // For administrators, get all facilities
  if (role === 'administrator') {
    try {
      // This would need to be implemented based on your facility fetching logic
      const allFacilities = await getAllFacilities();
      permissions.accessibleFacilities = allFacilities.map(f => f.$id);
    } catch (error) {
      console.error('Failed to load all facilities for admin:', error);
      permissions.accessibleFacilities = [];
    }
  }

  // For supervisors, get accessible facilities from team memberships
  if (role === 'supervisor') {
    try {
      const teamMemberships = await getUserTeamMemberships(accountData.$id);
      permissions.accessibleFacilities = extractFacilitiesFromTeams(teamMemberships);
    } catch (error) {
      console.error('Failed to load team memberships for supervisor:', error);
      permissions.accessibleFacilities = [facilityId];
    }
  }

  return permissions;
}

function extractRoleFromLabels(labels: string[]): UserRole {
  const roleLabel = labels.find(label => label.startsWith('role:'));
  if (!roleLabel) return 'nurse'; // Default role
  
  const backendRole = roleLabel.split(':')[1];
  
  // Map backend roles to frontend roles
  const roleMapping: Record<string, UserRole> = {
    'user': 'nurse',
    'doctor': 'doctor',
    'administrator': 'administrator',
    'supervisor': 'supervisor'
  };
  
  return roleMapping[backendRole] || 'nurse';
}

function extractFacilityFromLabels(labels: string[]): string {
  const facilityLabel = labels.find(label => label.startsWith('facility:'));
  return facilityLabel ? facilityLabel.split(':')[1] : '';
}

async function getUserTeamMemberships(userId: string): Promise<string[]> {
  // This would need to be implemented based on your team fetching logic
  // For now, return empty array
  return [];
}

async function getAllFacilities(): Promise<any[]> {
  // This would need to be implemented based on your facility fetching logic
  return [];
}

function extractFacilitiesFromTeams(teamMemberships: string[]): string[] {
  // Extract facility IDs from team names (assuming team names like 'facility-1-team')
  return teamMemberships
    .filter(team => team.includes('facility-'))
    .map(team => {
      const match = team.match(/facility-(\d+)-team/);
      return match ? match[1] : null;
    })
    .filter(Boolean) as string[];
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
```

### 2. Permission Hook for Components
```typescript
// frontend/hooks/usePermissions.ts
import { useAuth } from '../context/auth';

export type PermissionAction = 
  | 'create_patient'
  | 'update_patient'
  | 'delete_patient'
  | 'create_immunization'
  | 'update_immunization'
  | 'delete_immunization'
  | 'view_reports'
  | 'generate_reports'
  | 'send_notifications'
  | 'manage_users'
  | 'manage_facilities'
  | 'manage_vaccines'
  | 'access_admin';

export const usePermissions = () => {
  const { user, hasRole, hasPermission, canAccessFacility, canPerformAction } = useAuth();

  const checkPermission = (
    action: PermissionAction,
    resource?: string,
    facilityId?: string
  ): boolean => {
    return canPerformAction(action, resource, facilityId);
  };

  const checkMultiplePermissions = (
    actions: PermissionAction[],
    resource?: string,
    facilityId?: string
  ): boolean => {
    return actions.some(action => checkPermission(action, resource, facilityId));
  };

  const checkAllPermissions = (
    actions: PermissionAction[],
    resource?: string,
    facilityId?: string
  ): boolean => {
    return actions.every(action => checkPermission(action, resource, facilityId));
  };

  const getFacilityPermissions = (facilityId: string) => {
    return {
      canAccess: canAccessFacility(facilityId),
      canCreatePatients: checkPermission('create_patient', 'patient', facilityId),
      canUpdatePatients: checkPermission('update_patient', 'patient', facilityId),
      canDeletePatients: checkPermission('delete_patient', 'patient', facilityId),
      canCreateImmunizations: checkPermission('create_immunization', 'immunization', facilityId),
      canUpdateImmunizations: checkPermission('update_immunization', 'immunization', facilityId),
      canDeleteImmunizations: checkPermission('delete_immunization', 'immunization', facilityId)
    };
  };

  const getUIPermissions = () => {
    return {
      showAdminPanel: hasPermission('canAccessAdminPanel'),
      showReportsSection: checkPermission('view_reports'),
      showUserManagement: hasPermission('canManageUsers'),
      showFacilityManagement: hasPermission('canManageFacilities'),
      showVaccineManagement: hasPermission('canManageVaccines'),
      showAllFacilities: hasPermission('canViewAllFacilities'),
      canDeleteRecords: hasPermission('canDeleteRecords')
    };
  };

  return {
    user,
    hasRole,
    hasPermission,
    canAccessFacility,
    checkPermission,
    checkMultiplePermissions,
    checkAllPermissions,
    getFacilityPermissions,
    getUIPermissions
  };
};
```

### 3. Permission-Based Component Wrapper
```typescript
// frontend/components/PermissionWrapper.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { usePermissions, PermissionAction } from '../hooks/usePermissions';

interface PermissionWrapperProps {
  children: React.ReactNode;
  requiredPermission?: PermissionAction;
  requiredPermissions?: PermissionAction[];
  requireAll?: boolean;
  requiredRole?: string | string[];
  facilityId?: string;
  resource?: string;
  fallback?: React.ReactNode;
  showFallback?: boolean;
}

export const PermissionWrapper: React.FC<PermissionWrapperProps> = ({
  children,
  requiredPermission,
  requiredPermissions,
  requireAll = false,
  requiredRole,
  facilityId,
  resource,
  fallback,
  showFallback = false
}) => {
  const { hasRole, checkPermission, checkMultiplePermissions, checkAllPermissions } = usePermissions();

  // Check role-based permissions
  if (requiredRole) {
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    if (!hasRole(roles as any)) {
      return showFallback ? (fallback || <UnauthorizedFallback />) : null;
    }
  }

  // Check single permission
  if (requiredPermission) {
    if (!checkPermission(requiredPermission, resource, facilityId)) {
      return showFallback ? (fallback || <UnauthorizedFallback />) : null;
    }
  }

  // Check multiple permissions
  if (requiredPermissions && requiredPermissions.length > 0) {
    const hasPermissions = requireAll
      ? checkAllPermissions(requiredPermissions, resource, facilityId)
      : checkMultiplePermissions(requiredPermissions, resource, facilityId);

    if (!hasPermissions) {
      return showFallback ? (fallback || <UnauthorizedFallback />) : null;
    }
  }

  return <>{children}</>;
};

const UnauthorizedFallback: React.FC = () => (
  <View style={styles.fallbackContainer}>
    <Text style={styles.fallbackText}>
      You don't have permission to access this content.
    </Text>
  </View>
);

const styles = StyleSheet.create({
  fallbackContainer: {
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    alignItems: 'center'
  },
  fallbackText: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center'
  }
});
```

### 4. Role-Based Navigation Helper
```typescript
// frontend/utils/navigation-permissions.ts
import { UserRole } from '../context/auth';

export interface NavigationItem {
  name: string;
  path: string;
  icon?: string;
  requiredRoles?: UserRole[];
  requiredPermissions?: string[];
  facilityScoped?: boolean;
}

export const NAVIGATION_ITEMS: NavigationItem[] = [
  {
    name: 'Dashboard',
    path: '/',
    requiredRoles: ['nurse', 'doctor', 'supervisor', 'administrator']
  },
  {
    name: 'Patients',
    path: '/patients',
    requiredRoles: ['nurse', 'doctor', 'supervisor', 'administrator'],
    facilityScoped: true
  },
  {
    name: 'Immunizations',
    path: '/immunizations',
    requiredRoles: ['nurse', 'doctor', 'supervisor', 'administrator'],
    facilityScoped: true
  },
  {
    name: 'Reports',
    path: '/reports',
    requiredRoles: ['doctor', 'supervisor', 'administrator'],
    requiredPermissions: ['canGenerateReports']
  },
  {
    name: 'Notifications',
    path: '/notifications',
    requiredRoles: ['nurse', 'doctor', 'supervisor', 'administrator']
  },
  {
    name: 'Admin Panel',
    path: '/admin',
    requiredRoles: ['administrator'],
    requiredPermissions: ['canAccessAdminPanel']
  },
  {
    name: 'User Management',
    path: '/admin/users',
    requiredRoles: ['administrator'],
    requiredPermissions: ['canManageUsers']
  },
  {
    name: 'Facility Management',
    path: '/admin/facilities',
    requiredRoles: ['administrator'],
    requiredPermissions: ['canManageFacilities']
  },
  {
    name: 'Vaccine Management',
    path: '/admin/vaccines',
    requiredRoles: ['administrator'],
    requiredPermissions: ['canManageVaccines']
  }
];

export const getAccessibleNavigationItems = (
  userRole: UserRole,
  userPermissions: any,
  facilityId?: string
): NavigationItem[] => {
  return NAVIGATION_ITEMS.filter(item => {
    // Check role requirements
    if (item.requiredRoles && !item.requiredRoles.includes(userRole)) {
      return false;
    }

    // Check permission requirements
    if (item.requiredPermissions) {
      const hasAllPermissions = item.requiredPermissions.every(
        permission => userPermissions[permission]
      );
      if (!hasAllPermissions) {
        return false;
      }
    }

    // Check facility scoping
    if (item.facilityScoped && !facilityId && userRole !== 'administrator') {
      return false;
    }

    return true;
  });
};
```

### 5. Permission-Based Form Fields
```typescript
// frontend/components/PermissionBasedForm.tsx
import React from 'react';
import { View, TextInput, Text, StyleSheet } from 'react-native';
import { usePermissions } from '../hooks/usePermissions';

interface PermissionBasedFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  requiredPermission?: string;
  readOnlyRoles?: string[];
  placeholder?: string;
  facilityId?: string;
}

export const PermissionBasedField: React.FC<PermissionBasedFieldProps> = ({
  label,
  value,
  onChangeText,
  requiredPermission,
  readOnlyRoles = [],
  placeholder,
  facilityId
}) => {
  const { hasRole, checkPermission, user } = usePermissions();

  // Check if field should be read-only
  const isReadOnly = readOnlyRoles.some(role => hasRole(role as any)) ||
    (requiredPermission && !checkPermission(requiredPermission as any, undefined, facilityId));

  return (
    <View style={styles.fieldContainer}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, isReadOnly && styles.readOnlyInput]}
        value={value}
        onChangeText={isReadOnly ? undefined : onChangeText}
        placeholder={placeholder}
        editable={!isReadOnly}
      />
      {isReadOnly && (
        <Text style={styles.readOnlyText}>
          Read-only: Insufficient permissions
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  fieldContainer: {
    marginBottom: 16
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333'
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff'
  },
  readOnlyInput: {
    backgroundColor: '#f5f5f5',
    color: '#666'
  },
  readOnlyText: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    fontStyle: 'italic'
  }
});
```

## Files to Create/Modify

### Context Files
1. **`frontend/context/auth.tsx`** - Enhanced auth context with permissions
2. **`frontend/context/permissions.tsx`** - Dedicated permissions context (optional)

### Hook Files
1. **`frontend/hooks/usePermissions.ts`** - Permission checking hook
2. **`frontend/hooks/useRoleAccess.ts`** - Role-based access hook

### Component Files
1. **`frontend/components/PermissionWrapper.tsx`** - Permission-based component wrapper
2. **`frontend/components/PermissionBasedForm.tsx`** - Form fields with permission checking
3. **`frontend/components/RoleBasedButton.tsx`** - Buttons with role-based visibility

### Utility Files
1. **`frontend/utils/navigation-permissions.ts`** - Navigation permission helpers
2. **`frontend/utils/permission-utils.ts`** - General permission utilities
3. **`frontend/types/permissions.ts`** - Permission-related TypeScript types

## Acceptance Criteria

### ✅ Role-Based Context
- [ ] Auth context includes comprehensive user permissions
- [ ] Role checking works for all defined roles
- [ ] Facility access control is properly implemented
- [ ] Permission refresh mechanism works correctly

### ✅ Permission Checking
- [ ] Permission hooks provide accurate access control
- [ ] Multiple permission checking strategies work
- [ ] Facility-scoped permissions are enforced
- [ ] Performance is optimized with proper caching

### ✅ Component Integration
- [ ] Permission wrapper components work correctly
- [ ] Form fields respect permission-based access
- [ ] Navigation items are filtered by permissions
- [ ] UI elements show/hide based on roles

### ✅ Error Handling
- [ ] Graceful handling of permission check failures
- [ ] Proper fallback components for unauthorized access
- [ ] Clear error messages for permission denials
- [ ] Logging of permission-related events

## Testing Requirements

### Unit Tests
```typescript
// frontend/__tests__/permissions.test.ts
import { renderHook } from '@testing-library/react-native';
import { usePermissions } from '../hooks/usePermissions';
import { AuthProvider } from '../context/auth';

describe('Permission System', () => {
  test('should grant administrator full permissions', () => {
    const mockUser = {
      id: '1',
      role: 'administrator',
      permissions: {
        canViewAllFacilities: true,
        canManageUsers: true,
        canDeleteRecords: true
      }
    };

    const { result } = renderHook(() => usePermissions(), {
      wrapper: ({ children }) => (
        <AuthProvider initialUser={mockUser}>
          {children}
        </AuthProvider>
      )
    });

    expect(result.current.hasPermission('canManageUsers')).toBe(true);
    expect(result.current.checkPermission('delete_patient')).toBe(true);
  });

  test('should restrict nurse permissions appropriately', () => {
    const mockUser = {
      id: '2',
      role: 'nurse',
      facilityId: '1',
      permissions: {
        canViewAllFacilities: false,
        canManageUsers: false,
        canDeleteRecords: false
      }
    };

    const { result } = renderHook(() => usePermissions(), {
      wrapper: ({ children }) => (
        <AuthProvider initialUser={mockUser}>
          {children}
        </AuthProvider>
      )
    });

    expect(result.current.hasPermission('canManageUsers')).toBe(false);
    expect(result.current.canAccessFacility('1')).toBe(true);
    expect(result.current.canAccessFacility('2')).toBe(false);
  });
});
```

### Integration Tests
- Test permission checking with real Appwrite responses
- Test role-based navigation filtering
- Test component permission wrappers
- Test form field permission enforcement

## Security Considerations

### Client-Side Security
- Remember that client-side permissions are for UX only
- Always validate permissions on the backend
- Don't rely solely on frontend permission checks
- Implement proper error handling for permission failures

### Performance Optimization
- Cache permission calculations where appropriate
- Minimize permission check frequency
- Use memoization for expensive permission calculations
- Implement efficient role checking algorithms

## Advanced Features

### Dynamic Permission Loading
```typescript
// Load permissions dynamically based on context
const useDynamicPermissions = (context: string) => {
  const [permissions, setPermissions] = useState({});
  
  useEffect(() => {
    loadContextPermissions(context).then(setPermissions);
  }, [context]);
  
  return permissions;
};
```

### Permission Caching
```typescript
// Cache permissions to improve performance
const usePermissionCache = () => {
  const cache = useRef(new Map());
  
  const getCachedPermission = (key: string, calculator: () => boolean) => {
    if (!cache.current.has(key)) {
      cache.current.set(key, calculator());
    }
    return cache.current.get(key);
  };
  
  return { getCachedPermission };
};
```

## Notes
- Frontend permissions are primarily for user experience and should not be relied upon for security
- Always implement corresponding backend validation for all permission checks
- Consider implementing permission preloading for better performance
- Regular testing of permission logic is essential for maintaining security
- Document all permission rules and role mappings clearly
- Plan for permission system evolution and role changes