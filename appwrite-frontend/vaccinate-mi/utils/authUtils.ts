import { router } from 'expo-router';
import { authService } from '../services/appwriteAuth';

export interface SimpleUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'employee' | 'patient';
  isAuthenticated: boolean;
}

/**
 * Get the currently logged in user. If not authenticated, redirects to login.
 * Call this at the top of any page component to ensure authentication.
 *
 * Usage:
 * const user = await getLoggedInUser();
 * // User is guaranteed to be authenticated here
 */
export async function getLoggedInUser(): Promise<SimpleUser> {
  try {
    const session = await authService.refreshSession();
    if (!session || !session.user) {
      console.log('User not authenticated, redirecting to login');
      router.replace('/(auth)/login');
      throw new Error('Not authenticated'); // This prevents further execution
    }

    const simpleUser: SimpleUser = {
      id: session.user.$id,
      email: session.user.email,
      name: session.user.name,
      role: (session.profile?.type as 'admin' | 'employee' | 'patient') || 'patient',
      isAuthenticated: true
    };

    return simpleUser;
  } catch (error) {
    console.error('Failed to get logged in user:', error);
    router.replace('/(auth)/login');
    throw error;
  }
}

/**
 * Check if user is authenticated without redirecting.
 * This is useful for conditional rendering or early returns.
 *
 * Usage:
 * if (await isUserAuthenticated()) {
 *   // Show authenticated content
 * } else {
 *   // Show login prompt or redirect
 * }
 */
export async function isUserAuthenticated(): Promise<boolean> {
  try {
    const session = await authService.refreshSession();
    return !!session && !!session.user;
  } catch {
    return false;
  }
}

/**
 * Require authentication for a page or component.
 * This will redirect to login if the user is not authenticated.
 *
 * Usage in React components:
 * useEffect(() => {
 *   requireAuth();
 * }, []);
 */
export async function requireAuth(): Promise<void> {
  const isAuth = await isUserAuthenticated();
  if (!isAuth) {
    router.replace('/(auth)/login');
    throw new Error('Authentication required');
  }
}

/**
 * Get user role with fallback.
 * This is useful for role-based rendering without authentication checks.
 *
 * Usage:
 * const role = await getUserRole();
 * if (role === 'admin') {
 *   // Show admin features
 * }
 */
export async function getUserRole(): Promise<'admin' | 'employee' | 'patient' | null> {
  try {
    const session = await authService.refreshSession();
    if (!session || !session.user) {
      return null;
    }
    return (session.profile?.type as 'admin' | 'employee' | 'patient') || 'patient';
  } catch {
    return null;
  }
}

/**
 * Logout helper function that handles navigation and cleanup.
 *
 * Usage:
 * await logoutUser();
 * // User is logged out and redirected to login
 */
export async function logoutUser(): Promise<void> {
  try {
    await authService.logout();
    router.replace('/(auth)/login');
  } catch (error) {
    console.error('Logout failed:', error);
    // Still redirect even if logout fails
    router.replace('/(auth)/login');
  }
}