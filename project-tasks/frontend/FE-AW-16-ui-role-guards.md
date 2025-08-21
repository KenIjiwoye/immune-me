# FE-AW-16: UI Components and Route Guards Based on User Roles

## Priority
**High** - Critical for user experience and security

## Estimated Time
5-7 hours

## Dependencies
- FE-AW-15: Role-based context and permission checking
- BE-AW-08: User roles setup
- Existing React Navigation setup

## Description
Implement UI components and route guards that enforce role-based access control throughout the React Native application. This task creates reusable components, navigation guards, and UI elements that automatically adapt based on user roles and permissions.

## Current Navigation Analysis
Based on the existing app structure:
- Uses Expo Router with drawer navigation
- Routes: `/`, `/patients`, `/notifications`, `/reports`, `/admin`, `/profile`
- Current auth context provides basic role checking

## Technical Implementation

### 1. Route Guard Components

#### Protected Route Component
```typescript
// frontend/components/guards/ProtectedRoute.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '../../context/auth';
import { usePermissions, PermissionAction } from '../../hooks/usePermissions';
import { LoadingSpinner } from '../LoadingSpinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: string[];
  requiredPermissions?: PermissionAction[];
  requireAll?: boolean;
  facilityId?: string;
  redirectTo?: string;
  fallbackComponent?: React.ComponentType;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRoles = [],
  requiredPermissions = [],
  requireAll = false,
  facilityId,
  redirectTo = '/unauthorized',
  fallbackComponent: FallbackComponent
}) => {
  const { isLoading, isAuthenticated } = useAuth();
  const { hasRole, checkPermission, checkMultiplePermissions, checkAllPermissions } = usePermissions();

  // Show loading while checking authentication
  if (isLoading) {
    return <LoadingSpinner />;
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  // Check role requirements
  if (requiredRoles.length > 0) {
    const hasRequiredRole = hasRole(requiredRoles as any);
    if (!hasRequiredRole) {
      if (FallbackComponent) {
        return <FallbackComponent />;
      }
      return <Redirect href={redirectTo} />;
    }
  }

  // Check permission requirements
  if (requiredPermissions.length > 0) {
    const hasPermissions = requireAll
      ? checkAllPermissions(requiredPermissions, undefined, facilityId)
      : checkMultiplePermissions(requiredPermissions, undefined, facilityId);

    if (!hasPermissions) {
      if (FallbackComponent) {
        return <FallbackComponent />;
      }
      return <Redirect href={redirectTo} />;
    }
  }

  return <>{children}</>;
};
```

#### Role-Based Layout Component
```typescript
// frontend/components/guards/RoleBasedLayout.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { usePermissions } from '../../hooks/usePermissions';
import { DrawerNavigationOptions } from '@react-navigation/drawer';

interface RoleBasedLayoutProps {
  children: React.ReactNode;
  adminOnly?: boolean;
  supervisorAndAbove?: boolean;
  doctorAndAbove?: boolean;
  facilityScoped?: boolean;
  customPermissionCheck?: () => boolean;
}

export const RoleBasedLayout: React.FC<RoleBasedLayoutProps> = ({
  children,
  adminOnly = false,
  supervisorAndAbove = false,
  doctorAndAbove = false,
  facilityScoped = false,
  customPermissionCheck
}) => {
  const { hasRole, user } = usePermissions();

  // Custom permission check
  if (customPermissionCheck && !customPermissionCheck()) {
    return null;
  }

  // Admin only check
  if (adminOnly && !hasRole('administrator')) {
    return null;
  }

  // Supervisor and above check
  if (supervisorAndAbove && !hasRole(['administrator', 'supervisor'])) {
    return null;
  }

  // Doctor and above check
  if (doctorAndAbove && !hasRole(['administrator', 'supervisor', 'doctor'])) {
    return null;
  }

  // Facility scoped check
  if (facilityScoped && !user?.facilityId && !hasRole('administrator')) {
    return null;
  }

  return <View style={styles.container}>{children}</View>;
};

const styles = StyleSheet.create({
  container: {
    flex: 1
  }
});
```

### 2. Navigation Guards and Filters

#### Navigation Item Filter
```typescript
// frontend/utils/navigation-filter.ts
import { usePermissions } from '../hooks/usePermissions';

export interface NavigationItem {
  name: string;
  href: string;
  icon: string;
  requiredRoles?: string[];
  requiredPermissions?: string[];
  facilityScoped?: boolean;
  adminOnly?: boolean;
  supervisorAndAbove?: boolean;
  doctorAndAbove?: boolean;
}

export const DRAWER_NAVIGATION_ITEMS: NavigationItem[] = [
  {
    name: 'Dashboard',
    href: '/',
    icon: 'home',
    requiredRoles: ['nurse', 'doctor', 'supervisor', 'administrator']
  },
  {
    name: 'Patients',
    href: '/patients',
    icon: 'people',
    requiredRoles: ['nurse', 'doctor', 'supervisor', 'administrator'],
    facilityScoped: true
  },
  {
    name: 'Immunizations',
    href: '/immunizations',
    icon: 'medical',
    requiredRoles: ['nurse', 'doctor', 'supervisor', 'administrator'],
    facilityScoped: true
  },
  {
    name: 'Notifications',
    href: '/notifications',
    icon: 'notifications',
    requiredRoles: ['nurse', 'doctor', 'supervisor', 'administrator']
  },
  {
    name: 'Reports',
    href: '/reports',
    icon: 'analytics',
    doctorAndAbove: true,
    requiredPermissions: ['canGenerateReports']
  },
  {
    name: 'Admin Panel',
    href: '/admin',
    icon: 'settings',
    adminOnly: true,
    requiredPermissions: ['canAccessAdminPanel']
  },
  {
    name: 'Profile',
    href: '/profile',
    icon: 'person',
    requiredRoles: ['nurse', 'doctor', 'supervisor', 'administrator']
  }
];

export const useFilteredNavigation = () => {
  const { hasRole, hasPermission, user } = usePermissions();

  const getAccessibleItems = (): NavigationItem[] => {
    return DRAWER_NAVIGATION_ITEMS.filter(item => {
      // Check role requirements
      if (item.requiredRoles && !hasRole(item.requiredRoles as any)) {
        return false;
      }

      // Check admin only
      if (item.adminOnly && !hasRole('administrator')) {
        return false;
      }

      // Check supervisor and above
      if (item.supervisorAndAbove && !hasRole(['administrator', 'supervisor'])) {
        return false;
      }

      // Check doctor and above
      if (item.doctorAndAbove && !hasRole(['administrator', 'supervisor', 'doctor'])) {
        return false;
      }

      // Check permission requirements
      if (item.requiredPermissions) {
        const hasAllPermissions = item.requiredPermissions.every(
          permission => hasPermission(permission as any)
        );
        if (!hasAllPermissions) {
          return false;
        }
      }

      // Check facility scoping
      if (item.facilityScoped && !user?.facilityId && !hasRole('administrator')) {
        return false;
      }

      return true;
    });
  };

  return { getAccessibleItems };
};
```

#### Custom Drawer Content
```typescript
// frontend/components/navigation/CustomDrawerContent.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert
} from 'react-native';
import { DrawerContentScrollView, DrawerContentComponentProps } from '@react-navigation/drawer';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/auth';
import { useFilteredNavigation } from '../../utils/navigation-filter';
import { router } from 'expo-router';

export const CustomDrawerContent: React.FC<DrawerContentComponentProps> = (props) => {
  const { user, logout } = useAuth();
  const { getAccessibleItems } = useFilteredNavigation();

  const accessibleItems = getAccessibleItems();

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: logout
        }
      ]
    );
  };

  const navigateToRoute = (href: string) => {
    router.push(href as any);
  };

  return (
    <DrawerContentScrollView {...props} style={styles.container}>
      {/* User Info Section */}
      <View style={styles.userSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.fullName?.charAt(0)?.toUpperCase() || 'U'}
          </Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{user?.fullName}</Text>
          <Text style={styles.userRole}>{user?.role?.toUpperCase()}</Text>
          {user?.facilityId && (
            <Text style={styles.facilityInfo}>Facility: {user.facilityId}</Text>
          )}
        </View>
      </View>

      {/* Navigation Items */}
      <ScrollView style={styles.navigationSection}>
        {accessibleItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.navigationItem}
            onPress={() => navigateToRoute(item.href)}
          >
            <Ionicons 
              name={item.icon as any} 
              size={24} 
              color="#666" 
              style={styles.navigationIcon}
            />
            <Text style={styles.navigationText}>{item.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Logout Section */}
      <View style={styles.logoutSection}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out" size={24} color="#ff4444" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </DrawerContentScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff'
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#007bff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold'
  },
  userInfo: {
    flex: 1
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333'
  },
  userRole: {
    fontSize: 14,
    color: '#666',
    marginTop: 2
  },
  facilityInfo: {
    fontSize: 12,
    color: '#999',
    marginTop: 2
  },
  navigationSection: {
    flex: 1,
    paddingTop: 10
  },
  navigationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5'
  },
  navigationIcon: {
    marginRight: 15
  },
  navigationText: {
    fontSize: 16,
    color: '#333'
  },
  logoutSection: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    padding: 20
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  logoutText: {
    fontSize: 16,
    color: '#ff4444',
    marginLeft: 15
  }
});
```

### 3. Role-Based UI Components

#### Role-Based Button Component
```typescript
// frontend/components/ui/RoleBasedButton.tsx
import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { usePermissions, PermissionAction } from '../../hooks/usePermissions';

interface RoleBasedButtonProps {
  title: string;
  onPress: () => void;
  requiredRoles?: string[];
  requiredPermissions?: PermissionAction[];
  facilityId?: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
  disabledStyle?: ViewStyle;
  disabledTextStyle?: TextStyle;
  showDisabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
}

export const RoleBasedButton: React.FC<RoleBasedButtonProps> = ({
  title,
  onPress,
  requiredRoles = [],
  requiredPermissions = [],
  facilityId,
  style,
  textStyle,
  disabledStyle,
  disabledTextStyle,
  showDisabled = false,
  variant = 'primary'
}) => {
  const { hasRole, checkMultiplePermissions } = usePermissions();

  // Check if user has required roles
  const hasRequiredRole = requiredRoles.length === 0 || hasRole(requiredRoles as any);
  
  // Check if user has required permissions
  const hasRequiredPermissions = requiredPermissions.length === 0 || 
    checkMultiplePermissions(requiredPermissions, undefined, facilityId);

  const canAccess = hasRequiredRole && hasRequiredPermissions;

  // Don't render if no access and not showing disabled
  if (!canAccess && !showDisabled) {
    return null;
  }

  const buttonStyles = [
    styles.button,
    styles[variant],
    style,
    !canAccess && (disabledStyle || styles.disabled)
  ];

  const textStyles = [
    styles.buttonText,
    styles[`${variant}Text`],
    textStyle,
    !canAccess && (disabledTextStyle || styles.disabledText)
  ];

  return (
    <TouchableOpacity
      style={buttonStyles}
      onPress={canAccess ? onPress : undefined}
      disabled={!canAccess}
    >
      <Text style={textStyles}>{title}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center'
  },
  primary: {
    backgroundColor: '#007bff'
  },
  secondary: {
    backgroundColor: '#6c757d'
  },
  danger: {
    backgroundColor: '#dc3545'
  },
  disabled: {
    backgroundColor: '#e9ecef',
    opacity: 0.6
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600'
  },
  primaryText: {
    color: '#fff'
  },
  secondaryText: {
    color: '#fff'
  },
  dangerText: {
    color: '#fff'
  },
  disabledText: {
    color: '#6c757d'
  }
});
```

#### Role-Based Tab Bar
```typescript
// frontend/components/navigation/RoleBasedTabBar.tsx
import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePermissions } from '../../hooks/usePermissions';

interface TabItem {
  key: string;
  title: string;
  icon: string;
  requiredRoles?: string[];
  requiredPermissions?: string[];
  adminOnly?: boolean;
}

interface RoleBasedTabBarProps {
  tabs: TabItem[];
  activeTab: string;
  onTabPress: (tabKey: string) => void;
}

export const RoleBasedTabBar: React.FC<RoleBasedTabBarProps> = ({
  tabs,
  activeTab,
  onTabPress
}) => {
  const { hasRole, hasPermission } = usePermissions();

  const getAccessibleTabs = (): TabItem[] => {
    return tabs.filter(tab => {
      // Check admin only
      if (tab.adminOnly && !hasRole('administrator')) {
        return false;
      }

      // Check role requirements
      if (tab.requiredRoles && !hasRole(tab.requiredRoles as any)) {
        return false;
      }

      // Check permission requirements
      if (tab.requiredPermissions) {
        const hasAllPermissions = tab.requiredPermissions.every(
          permission => hasPermission(permission as any)
        );
        if (!hasAllPermissions) {
          return false;
        }
      }

      return true;
    });
  };

  const accessibleTabs = getAccessibleTabs();

  if (accessibleTabs.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {accessibleTabs.map((tab) => (
        <TouchableOpacity
          key={tab.key}
          style={[
            styles.tab,
            activeTab === tab.key && styles.activeTab
          ]}
          onPress={() => onTabPress(tab.key)}
        >
          <Ionicons
            name={tab.icon as any}
            size={20}
            color={activeTab === tab.key ? '#007bff' : '#666'}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === tab.key && styles.activeTabText
            ]}
          >
            {tab.title}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingVertical: 8
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8
  },
  activeTab: {
    borderTopWidth: 2,
    borderTopColor: '#007bff'
  },
  tabText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4
  },
  activeTabText: {
    color: '#007bff',
    fontWeight: '600'
  }
});
```

### 4. Route-Level Guards Implementation

#### Layout with Route Guards
```typescript
// frontend/app/_layout.tsx (Enhanced)
import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Drawer } from 'expo-router/drawer';
import { AuthProvider } from '../context/auth';
import { CustomDrawerContent } from '../components/navigation/CustomDrawerContent';
import { ProtectedRoute } from '../components/guards/ProtectedRoute';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <Drawer
          drawerContent={(props) => <CustomDrawerContent {...props} />}
          screenOptions={{
            headerShown: true,
            drawerStyle: {
              width: 280
            }
          }}
        >
          <Drawer.Screen
            name="index"
            options={{
              drawerLabel: 'Dashboard',
              title: 'Dashboard'
            }}
          />
          <Drawer.Screen
            name="patients"
            options={{
              drawerLabel: 'Patients',
              title: 'Patients'
            }}
          />
          <Drawer.Screen
            name="reports"
            options={{
              drawerLabel: 'Reports',
              title: 'Reports'
            }}
          />
          <Drawer.Screen
            name="admin"
            options={{
              drawerLabel: 'Admin',
              title: 'Administration'
            }}
          />
        </Drawer>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
```

#### Protected Admin Routes
```typescript
// frontend/app/admin/_layout.tsx
import React from 'react';
import { Stack } from 'expo-router';
import { ProtectedRoute } from '../../components/guards/ProtectedRoute';

export default function AdminLayout() {
  return (
    <ProtectedRoute
      requiredRoles={['administrator']}
      requiredPermissions={['access_admin']}
      redirectTo="/unauthorized"
    >
      <Stack>
        <Stack.Screen
          name="index"
          options={{
            title: 'Admin Dashboard'
          }}
        />
        <Stack.Screen
          name="users"
          options={{
            title: 'User Management'
          }}
        />
        <Stack.Screen
          name="facilities"
          options={{
            title: 'Facility Management'
          }}
        />
      </Stack>
    </ProtectedRoute>
  );
}
```

#### Protected Reports Routes
```typescript
// frontend/app/reports/_layout.tsx
import React from 'react';
import { Stack } from 'expo-router';
import { ProtectedRoute } from '../../components/guards/ProtectedRoute';

export default function ReportsLayout() {
  return (
    <ProtectedRoute
      requiredRoles={['doctor', 'supervisor', 'administrator']}
      requiredPermissions={['generate_reports']}
      redirectTo="/unauthorized"
    >
      <Stack>
        <Stack.Screen
          name="index"
          options={{
            title: 'Reports'
          }}
        />
        <Stack.Screen
          name="facility-summary"
          options={{
            title: 'Facility Summary'
          }}
        />
        <Stack.Screen
          name="cross-facility"
          options={{
            title: 'Cross-Facility Reports'
          }}
        />
      </Stack>
    </ProtectedRoute>
  );
}
```

### 5. Unauthorized Access Component
```typescript
// frontend/app/unauthorized.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../context/auth';

export default function UnauthorizedScreen() {
  const { user } = useAuth();

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  return (
    <View style={styles.container}>
      <Ionicons name="lock-closed" size={80} color="#ff4444" />
      <Text style={styles.title}>Access Denied</Text>
      <Text style={styles.message}>
        You don't have permission to access this page.
      </Text>
      <Text style={styles.roleInfo}>
        Current role: {user?.role?.toUpperCase() || 'Unknown'}
      </Text>
      
      <TouchableOpacity style={styles.button} onPress={goBack}>
        <Text style={styles.buttonText}>Go Back</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.button, styles.homeButton]} 
        onPress={() => router.replace('/')}
      >
        <Text style={styles.buttonText}>Go to Dashboard</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 10
  },
  roleInfo: {
    fontSize: 14,
    color: '#999',
    marginBottom: 30
  },
  button: {
    backgroundColor: '#007bff',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 10
  },
  homeButton: {
    backgroundColor: '#28a745'
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  }
});
```

## Files to Create/Modify

### Guard Components
1. **`frontend/components/guards/ProtectedRoute.tsx`** - Route protection component
2. **`frontend/components/guards/RoleBasedLayout.tsx`** - Layout with role checking
3. **`frontend/components/guards/PermissionGate.tsx`** - General permission gate component

### Navigation Components
1. **`frontend/components/navigation/CustomDrawerContent.tsx`** - Role-filtered drawer
2. **`frontend/components/navigation/RoleBasedTabBar.tsx`** - Tab bar with role filtering
3. **`frontend/utils/navigation-filter.ts`** - Navigation filtering utilities

### UI Components
1. **`frontend/components/ui/RoleBasedButton.tsx`** - Button with role checking
2. **`frontend/components/ui/RoleBasedCard.tsx`** - Card component with permissions
3. **`frontend/components/ui/ConditionalRender.tsx`** - Conditional rendering helper

### Route Files
1. **`frontend/app/_layout.tsx`** - Enhanced root layout with guards
2. **`frontend/app/admin/_layout.tsx`** - Protected admin layout
3. **`frontend/app/reports/_layout.tsx`** - Protected reports layout
4. **`frontend/app/unauthorized.tsx`** - Unauthorized access screen

## Acceptance Criteria

### ✅ Route Protection
- [ ] All sensitive routes are protected with appropriate guards
- [ ] Users are redirected appropriately when access is denied
- [ ] Route guards work with nested navigation structures
- [ ] Loading states are handled properly during permission checks

### ✅ UI Component Security
- [ ] Buttons and UI elements respect role-based permissions
- [ ] Navigation items are filtered based on user roles
- [ ] Form elements adapt to user permission levels
- [ ] Unauthorized content is hidden or disabled appropriately

### ✅ User Experience
- [ ] Clear feedback when access is denied
- [ ] Smooth navigation between accessible routes
- [ ] Consistent UI behavior across different roles
- [ ] Proper loading and error states

### ✅ Performance
- [ ] Permission checks are optimized and cached
- [ ] Navigation filtering is efficient
- [ ] UI updates are smooth and responsive
- [ ] Memory usage is optimized for role checking

## Testing Requirements

### Unit Tests
```typescript
// frontend/__tests__/role-guards.test.tsx
import React from 'react';
import { render } from '@testing-library/react-native';
import { ProtectedRoute } from '../components/guards/ProtectedRoute';
import { AuthProvider } from '../context/auth';

describe('Role Guards', () => {
  test('should render content for authorized users', () => {
    const mockUser = {
      id: '1',
      role: 'administrator',
      permissions: { canAccessAdminPanel: true }
    };

    const { getByText } = render(
      <AuthProvider initialUser={mockUser}>
        <ProtectedRoute requiredRoles={['administrator']}>
          <Text>Admin Content</Text>
        </ProtectedRoute>
      </AuthProvider>
    );

    expect(getByText('Admin Content')).toBeTruthy();
  });

  test('should redirect unauthorized users', () => {
    const mockUser = {
      id: '2',
      role: 'nurse',
      permissions: { canAccessAdminPanel: false }
    };

    const { queryByText } = render(
      <AuthProvider initialUser={mockUser}>
        <ProtectedRoute requiredRoles={['administrator']}>
          <Text>Admin Content</Text>
        </ProtectedRoute>
      </AuthProvider>
    );

    expect(queryByText('Admin Content')).toBeNull();
  });
});
```

### Integration Tests
- Test complete navigation flows with different user roles
- Test route protection with real authentication states
- Test UI component visibility with various permission combinations
- Test navigation filtering with different user types

## Security Considerations

### Client-Side Security
- Route guards are for UX only, not security
- Always validate permissions on the backend
- Don't expose sensitive data in client-side code
- Implement proper error handling for permission failures

### Performance Optimization
- Cache permission calculations
- Minimize re-renders during permission checks
- Use efficient filtering algorithms for navigation
- Implement proper memoization for expensive operations

## Advanced Features

### Dynamic Route Generation
```typescript
// Generate routes dynamically based on permissions
const useDynamicRoutes = () => {
  const { user } = usePermissions();
  
  const generateRoutes = () => {
    const baseRoutes = ['/dashboard', '/profile'];
    const roleRoutes = {
      administrator: ['/admin', '/users', '/facilities'],
      supervisor: ['/reports', '/analytics'],
      doctor: ['/patients', '/immunizations'],
      nurse: ['/patients', '/immunizations']
    };
    
    return [...baseRoutes, ...(roleRoutes[user?.role] || [])];
  };
  
  return { generateRoutes };
};
```

### Permission-Based Feature Flags
```typescript
// Feature flags based on user permissions
const useFeatureFlags = () => {
  const { hasPermission } = usePermissions();
  
  const features = {
    advancedReporting: hasPermission('canGenerateReports'),
    userManagement: hasPermission('canManageUsers'),
    facilityManagement: hasPermission('canManageFacilities'),
    dataExport: hasPermission('canExportData')
  };
  
  return features;
};
```

## Notes
- Route guards provide user experience improvements but are not security measures
- Always implement corresponding backend validation for all protected operations
- Consider implementing progressive disclosure based on user roles
- Regular testing of permission logic is essential for maintaining proper access control
- Document all route protection rules and UI permission patterns
- Plan for role system evolution and permission changes
- Monitor user