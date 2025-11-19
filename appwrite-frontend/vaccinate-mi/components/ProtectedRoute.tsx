import React from 'react';
import { useRequireAuth } from '../hooks/useRequireAuth';

/**
 * ProtectedRoute wrapper component for pages that require authentication.
 * Automatically redirects to login if user is not authenticated.
 * 
 * Usage:
 * In your page file (e.g., app/(tabs)/dashboard.tsx):
 * 
 * import { ProtectedRoute } from '@/components/ProtectedRoute';
 * 
 * export default function Dashboard() {
 *   return (
 *     <ProtectedRoute>
 *       <div>Your protected dashboard content</div>
 *     </ProtectedRoute>
 *   );
 * }
 * 
 * This will automatically handle authentication check and redirect.
 */
export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useRequireAuth();
  return <>{children}</>;
};