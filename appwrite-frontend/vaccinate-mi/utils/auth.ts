/**
 * Simplified Authentication System - Main Export File
 * 
 * This file provides a clean, simple interface for authentication.
 * Import everything you need from this single file.
 * 
 * Usage:
 * import { getLoggedInUser, usePageAuth, logoutUser } from '@/utils/auth';
 */

// Export all utility functions
export {
  getLoggedInUser,
  isUserAuthenticated,
  requireAuth,
  getUserRole,
  logoutUser,
} from './authUtils';

// Export type
export type { SimpleUser } from './authUtils';

// Export all React hooks
export {
  useSimpleAuth,
  usePageAuth,
  useAuthCheck,
} from '@/hooks/useAuth';