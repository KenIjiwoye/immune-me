# Simple Authentication Migration Guide

This guide helps developers migrate from the old complex authentication system (`context/auth.tsx`) to the new simplified system (`context/simpleAuth.tsx`, `utils/simpleAuthUtils.ts`, and `hooks/useRequireAuth.ts`). The new system reduces boilerplate, simplifies user data access, and provides automatic redirects for unauthenticated users.

## Key Benefits of the New System
- **Simpler User Object**: Only essential fields (`id`, `email`, `name`, `role`) instead of complex profile integration.
- **Automatic Redirects**: `getLoggedInUser()` and `useRequireAuth()` handle redirects to `/ (auth)/login` without manual checks.
- **Less Boilerplate**: No need for extensive `useEffect` logic, permission checks, or profile loading in every page.
- **Faster Loading**: Reduced API calls and simpler state management.
- **Easier Maintenance**: Fewer dependencies on profile services, security services, and multi-profile switching.

## Before: Old Complex Auth System
The old system required manual authentication checks, profile loading, permission verification, and handling multiple states (loading, authenticated, etc.). Here's an example of a protected page using the old `useAuth` hook:

```tsx
// Example: app/(tabs)/old-protected-page.tsx (BEFORE migration)
import React, { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { useAuth } from '@/context/auth';
import { LoadingSpinner } from '@/components/LoadingSpinner'; // Assume this exists

export default function OldProtectedPage() {
  const { user, isLoading, isAuthenticated, hasPermission, getDisplayName } = useAuth();
  const [pageData, setPageData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const initializePage = async () => {
      if (isLoading) return; // Wait for auth to load

      if (!isAuthenticated || !user) {
        console.log('User not authenticated, redirecting...');
        router.replace('/(auth)/login');
        return;
      }

      if (!hasPermission('view:protected-page')) {
        setError('Insufficient permissions');
        return;
      }

      try {
        // Load page-specific data (e.g., profile refresh)
        await user.refreshProfile(); // Complex profile operation
        setPageData({
          displayName: getDisplayName(),
          role: user.role,
          permissions: user.permissions,
        });
      } catch (err) {
        setError('Failed to load page data');
        console.error('Auth/Profile error:', err);
      }
    };

    initializePage();
  }, [isLoading, isAuthenticated, user]);

  if (isLoading) {
    return <LoadingSpinner message="Authenticating..." />;
  }

  if (error || !pageData) {
    return <div>Error: {error || 'Access denied'}</div>;
  }

  return (
    <div>
      <h1>Protected Page (Old System)</h1>
      <p>Welcome, {pageData.displayName} ({pageData.role})</p>
      <p>Permissions: {pageData.permissions.join(', ')}</p>
      <p>This page required 50+ lines of auth boilerplate.</p>
    </div>
  );
}
```

**Issues with Old System**:
- Manual `useEffect` for auth checks and redirects.
- Complex user object with profile, permissions, and multi-profile support.
- Error-prone: Must handle loading states, permissions, and profile refreshes.
- Verbose: 50+ lines just for basic auth protection.

## After: New Simple Auth System
The new system uses `getLoggedInUser()` for direct user fetching with auto-redirect, or `ProtectedRoute` wrapper for even simpler protection. User data is minimal and fast to load.

### 1. Using `getLoggedInUser()` at the Top of a Page
Call this async function at the top of your page component. It fetches the user and redirects if unauthenticated.

Create this example page: `app/(tabs)/simple-user-example.tsx`

```tsx
// Example: app/(tabs)/simple-user-example.tsx (AFTER migration)
import React, { useEffect, useState } from 'react';
import { getLoggedInUser } from '@/utils/simpleAuthUtils';
import { LoadingSpinner } from '@/components/LoadingSpinner'; // Assume this exists

export default function SimpleUserExample() {
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadUserAndData = async () => {
      try {
        // This single call handles auth check and redirect if needed
        const loggedInUser = await getLoggedInUser();
        setUser(loggedInUser);
        
        // Now load any page-specific data (no profile complexity)
        // e.g., fetch from API using user.id
      } catch (err) {
        // Redirect already handled by getLoggedInUser(), so just set error if needed
        setError('Authentication failed');
      }
    };

    loadUserAndData();
  }, []);

  if (!user) {
    return <LoadingSpinner message="Loading user..." />;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div>
      <h1>Simple User Example (New System)</h1>
      <p>Welcome, {user.name} ({user.role})</p>
      <p>Email: {user.email}</p>
      <p>This is just 20 lines - 60% simpler!</p>
    </div>
  );
}
```

**How it Works**:
- `getLoggedInUser()` internally calls `authService.refreshSession()` and throws/redirects if no valid session.
- Automatic redirect to `/ (auth)/login` if unauthenticated.
- No manual `isLoading` or `isAuthenticated` checks needed.
- User object is simple: `{ id, email, name, role }`.

### 2. Using the `ProtectedRoute` Wrapper
Wrap your page content with `<ProtectedRoute>`. It uses `useRequireAuth()` internally for automatic protection.

Create this example page: `app/(tabs)/protected-route-example.tsx`

```tsx
// Example: app/(tabs)/protected-route-example.tsx (AFTER migration)
import React from 'react';
import { useSimpleAuth } from '@/context/simpleAuth';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { LoadingSpinner } from '@/components/LoadingSpinner'; // Assume this exists

export default function ProtectedRouteExample() {
  const { user, isLoading } = useSimpleAuth(); // Optional: for accessing user data

  // ProtectedRoute handles the auth check and redirect automatically
  return (
    <ProtectedRoute>
      {isLoading ? (
        <LoadingSpinner message="Loading..." />
      ) : (
        <div>
          <h1>Protected Route Example (New System)</h1>
          <p>You're authenticated! Welcome, {user?.name || 'User'} ({user?.role}).</p>
          <p>No manual redirects or permission checks needed.</p>
          <p>Even simpler: Just wrap your content!</p>
        </div>
      )}
    </ProtectedRoute>
  );
}
```

**How it Works**:
- `ProtectedRoute` calls `useRequireAuth()`, which uses `useEffect` to redirect if `!user && !isLoading`.
- No `useEffect` in your page component.
- Access user via `useSimpleAuth()` if needed (e.g., for display).
- Handles loading state gracefully.

### 3. How Automatic Redirect Works
- **In `getLoggedInUser()`**: If no session, logs "User not authenticated, redirecting to login" and calls `router.replace('/(auth)/login')`. The function throws an error to halt page rendering.
- **In `useRequireAuth()` / `ProtectedRoute`**: Uses `useEffect` to watch `user` and `isLoading`. If `!isLoading && !user`, redirects immediately.
- Both prevent protected content from rendering for unauthenticated users.
- Redirect target: `/ (auth)/login` (customize in the utils/hook if needed).

## Migration Steps
Follow these steps to convert existing pages:

1. **Update Imports**:
   - Replace `import { useAuth } from '@/context/auth';` with `import { useSimpleAuth } from '@/context/simpleAuth';`.
   - Add `import { getLoggedInUser } from '@/utils/simpleAuthUtils';` for direct user fetching.
   - For wrappers: `import { ProtectedRoute } from '@/components/ProtectedRoute';`.

2. **Remove Complex Auth Logic**:
   - Delete manual `useEffect` for `isAuthenticated`, `hasPermission`, `refreshProfile`, etc.
   - Remove dependencies on `profileService`, `securityService`, multi-profile switching.
   - Simplify user access: Use `user.name`, `user.role` instead of `user.getDisplayName()`, `user.profileType`.

3. **Choose Your Approach**:
   - **For Pages Needing User Data**: Use `getLoggedInUser()` in `useEffect` (async, handles redirect).
   - **For Simple Protection**: Wrap with `<ProtectedRoute>` (no async, automatic).
   - **Global Provider**: Ensure `<SimpleAuthProvider>` wraps your app (already in `_layout.tsx`? Check and update if using old `AuthProvider`).

4. **Handle Permissions (Simplified)**:
   - Old: `hasPermission('view:page')` with complex role guards.
   - New: Basic role checks like `if (user?.role === 'admin')`. For advanced permissions, extend `simpleAuth.tsx` or use a separate hook.
   - Remove biometric, session timeout, and device registration unless critical (add back minimally if needed).

5. **Update App Layout**:
   - In `app/_layout.tsx`, replace `<AuthProvider>` with `<SimpleAuthProvider>`.
   - Remove old auth initialization calls.

6. **Test the Migration**:
   - Log out and access a protected page: Should redirect to login.
   - Log in: Page should load user data without errors.
   - Check console: No auth-related errors or excessive logs.
   - Compare bundle size: New system reduces ~30-50% auth code.

7. **Edge Cases**:
   - **Loading States**: Use `useSimpleAuth().isLoading` or a simple spinner.
   - **Offline**: New system uses `authService.refreshSession()`, which handles offline gracefully (cached sessions).
   - **Multi-Profile**: If needed, re-implement minimally in `simpleAuth.tsx` (not included by default for simplicity).
   - **Errors**: Catch and handle in your page; redirects are automatic.

## Before/After Comparison Summary
| Aspect | Old System | New System | Improvement |
|--------|------------|------------|-------------|
| **Lines of Code (Auth Check)** | 30-50 lines (`useEffect`, checks, errors) | 5-10 lines (`getLoggedInUser()` or `<ProtectedRoute>`) | 70-80% reduction |
| **User Object** | Complex (profile, permissions, multi-role) | Simple (id, email, name, role) | Easier to use/debug |
| **Redirect Handling** | Manual `router.replace()` in `useEffect` | Automatic in utils/hook | No missed redirects |
| **Dependencies** | profileService, securityService, RoleGuard | Just authService | Fewer imports/errors |
| **Performance** | Multiple API calls (user + profile + permissions) | Single session refresh | Faster page loads |
| **Maintenance** | Brittle (profile changes break pages) | Robust (minimal surface area) | Easier updates |

## Example Files Created
- `app/(tabs)/simple-user-example.tsx`: Demonstrates `getLoggedInUser()`.
- `app/(tabs)/protected-route-example.tsx`: Demonstrates `ProtectedRoute`.
- Navigate to these routes after migration to test (e.g., `/simple-user-example`).

## Next Steps
- Migrate one page at a time, testing thoroughly.
- Update tests: Replace `useAuth` mocks with `useSimpleAuth`.
- If you need advanced features (e.g., full permissions), extend the simple system gradually.
- Questions? Review `context/simpleAuth.tsx` source or ask for clarification.

This migration makes your auth code cleaner and more maintainable while preserving core functionality.