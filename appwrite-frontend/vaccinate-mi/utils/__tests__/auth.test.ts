/**
 * Tests for the simplified authentication system
 */

import { getLoggedInUser, isUserAuthenticated, logoutUser } from '../authUtils';
import { authService } from '@/services/appwriteAuth';
import { router } from 'expo-router';

// Mock dependencies
jest.mock('@/services/appwriteAuth');
jest.mock('expo-router');

describe('Simple Authentication System', () => {
  const mockUser = {
    $id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
  };

  const mockSession = {
    user: mockUser,
    profile: {
      type: 'employee' as const,
      profileId: 'test-profile-id',
      permissions: ['read'],
    },
    session: {
      $id: 'test-session-id',
      provider: 'email',
      providerUid: 'test@example.com',
      expire: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
    },
    preferences: {
      language: 'en',
      timezone: 'UTC',
      theme: 'light' as const,
      notifications: {},
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (router.replace as jest.Mock).mockImplementation(() => {});
  });

  describe('getLoggedInUser', () => {
    it('should return user when authenticated', async () => {
      (authService.refreshSession as jest.Mock).mockResolvedValue(mockSession);

      const user = await getLoggedInUser();

      expect(user).toEqual({
        id: mockUser.$id,
        email: mockUser.email,
        name: mockUser.name,
        role: 'employee',
        isAuthenticated: true,
      });
      expect(router.replace).not.toHaveBeenCalled();
    });

    it('should redirect to login when not authenticated', async () => {
      (authService.refreshSession as jest.Mock).mockResolvedValue(null);

      await expect(getLoggedInUser()).rejects.toThrow('Not authenticated');
      expect(router.replace).toHaveBeenCalledWith('/(auth)/login');
    });

    it('should redirect to login when session refresh fails', async () => {
      (authService.refreshSession as jest.Mock).mockRejectedValue(new Error('Session expired'));

      await expect(getLoggedInUser()).rejects.toThrow('Not authenticated');
      expect(router.replace).toHaveBeenCalledWith('/(auth)/login');
    });
  });

  describe('isUserAuthenticated', () => {
    it('should return true when user is authenticated', async () => {
      (authService.refreshSession as jest.Mock).mockResolvedValue(mockSession);

      const isAuth = await isUserAuthenticated();

      expect(isAuth).toBe(true);
    });

    it('should return false when user is not authenticated', async () => {
      (authService.refreshSession as jest.Mock).mockResolvedValue(null);

      const isAuth = await isUserAuthenticated();

      expect(isAuth).toBe(false);
    });

    it('should return false when session refresh fails', async () => {
      (authService.refreshSession as jest.Mock).mockRejectedValue(new Error('Session expired'));

      const isAuth = await isUserAuthenticated();

      expect(isAuth).toBe(false);
    });
  });

  describe('logoutUser', () => {
    it('should logout successfully and redirect', async () => {
      (authService.logout as jest.Mock).mockResolvedValue(undefined);

      await logoutUser();

      expect(authService.logout).toHaveBeenCalled();
      expect(router.replace).toHaveBeenCalledWith('/(auth)/login');
    });

    it('should redirect even if logout fails', async () => {
      (authService.logout as jest.Mock).mockRejectedValue(new Error('Logout failed'));

      await logoutUser();

      expect(authService.logout).toHaveBeenCalled();
      expect(router.replace).toHaveBeenCalledWith('/(auth)/login');
    });
  });
});

describe('Simple Authentication Integration', () => {
  it('should handle the complete authentication flow', async () => {
    const mockSession = {
      user: {
        $id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
      },
      profile: {
        type: 'admin' as const,
        profileId: 'test-profile-id',
        permissions: ['read', 'write'],
      },
      session: {
        $id: 'test-session-id',
        provider: 'email',
        providerUid: 'test@example.com',
        expire: new Date(Date.now() + 3600000).toISOString(),
      },
      preferences: {
        language: 'en',
        timezone: 'UTC',
        theme: 'light' as const,
        notifications: {},
      },
    };

    // Mock successful authentication
    (authService.refreshSession as jest.Mock).mockResolvedValue(mockSession);

    // Test authentication check
    const isAuth = await isUserAuthenticated();
    expect(isAuth).toBe(true);

    // Test getting user
    const user = await getLoggedInUser();
    expect(user).toEqual({
      id: 'test-user-id',
      email: 'test@example.com',
      name: 'Test User',
      role: 'admin',
      isAuthenticated: true,
    });

    // Test logout
    (authService.logout as jest.Mock).mockResolvedValue(undefined);
    await logoutUser();
    expect(router.replace).toHaveBeenCalledWith('/(auth)/login');
  });

  it('should handle authentication failure gracefully', async () => {
    // Mock failed authentication
    (authService.refreshSession as jest.Mock).mockResolvedValue(null);

    // Test authentication check
    const isAuth = await isUserAuthenticated();
    expect(isAuth).toBe(false);

    // Test getting user (should redirect)
    await expect(getLoggedInUser()).rejects.toThrow('Not authenticated');
    expect(router.replace).toHaveBeenCalledWith('/(auth)/login');
  });
});