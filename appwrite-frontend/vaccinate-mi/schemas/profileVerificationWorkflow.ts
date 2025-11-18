import { z } from 'zod';

// Base Appwrite document schema
const appwriteDocumentSchema = z.object({
  $id: z.string(),
  $collectionId: z.string(),
  $databaseId: z.string(),
  $createdAt: z.string().datetime(),
  $updatedAt: z.string().datetime(),
  $permissions: z.array(z.string()),
});

// Profile verification workflow base schema
const profileVerificationWorkflowBaseSchema = appwriteDocumentSchema.extend({
  profile_id: z.string().min(1, 'Profile ID is required'),
  profile_type: z.enum(['admin', 'employee', 'patient'], {
    errorMap: () => ({ message: 'Profile type must be one of: admin, employee, patient' }),
  }),
  user_id: z.string().min(1, 'User ID is required'),
  verification_type: z.enum(['identity', 'credentials', 'background_check', 'medical_license', 'facility_access'], {
    errorMap: () => ({ message: 'Verification type must be one of: identity, credentials, background_check, medical_license, facility_access' }),
  }),
  verification_method: z.enum(['document_upload', 'biometric', 'third_party', 'manual_review', 'self_declaration'], {
    errorMap: () => ({ message: 'Verification method must be one of: document_upload, biometric, third_party, manual_review, self_declaration' }),
  }),
  status: z.enum(['pending', 'in_review', 'approved', 'rejected', 'expired'], {
    errorMap: () => ({ message: 'Status must be one of: pending, in_review, approved, rejected, expired' }),
  }),
  initiated_by_user_id: z.string().min(1, 'Initiated by user ID is required'),
  assigned_to_user_id: z.string().optional(),
  facility_id: z.string().min(1, 'Facility ID is required'),
  verification_data: z.string().optional(), // JSON string
  documents_required: z.array(z.string()).optional(),
  documents_submitted: z.array(z.string()).optional(),
  verification_notes: z.string().max(1000, 'Verification notes must be less than 1000 characters').optional(),
  rejection_reason: z.string().max(500, 'Rejection reason must be less than 500 characters').optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent'], {
    errorMap: () => ({ message: 'Priority must be one of: low, medium, high, urgent' }),
  }),
  due_date: z.string().refine((date) => {
    const parsed = new Date(date);
    return !isNaN(parsed.getTime());
  }, 'Due date must be a valid date').optional(),
  completed_at: z.string().refine((date) => {
    const parsed = new Date(date);
    return !isNaN(parsed.getTime());
  }, 'Completed at must be a valid date').optional(),
  completed_by_user_id: z.string().optional(),
  workflow_steps: z.string().optional(), // JSON string
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// Profile verification workflow schema with business rules
export const profileVerificationWorkflowSchema = profileVerificationWorkflowBaseSchema.refine((data) => {
  // If status is rejected, rejection_reason must be provided
  if (data.status === 'rejected') {
    return data.rejection_reason && data.rejection_reason.trim().length > 0;
  }
  return true;
}, {
  message: 'Rejection reason is required when status is rejected',
  path: ['rejection_reason'],
}).refine((data) => {
  // If status is approved, completed_at and completed_by_user_id must be provided
  if (data.status === 'approved') {
    return data.completed_at && data.completed_by_user_id;
  }
  return true;
}, {
  message: 'Completed at and completed by user ID are required when status is approved',
  path: ['completed_at'],
}).refine((data) => {
  // Due date should be in the future for pending/in_review status
  if ((data.status === 'pending' || data.status === 'in_review') && data.due_date) {
    const dueDate = new Date(data.due_date);
    return dueDate > new Date();
  }
  return true;
}, {
  message: 'Due date must be in the future for pending or in_review status',
  path: ['due_date'],
});

// Create profile verification workflow schema (without Appwrite fields)
const createProfileVerificationWorkflowBaseSchema = profileVerificationWorkflowBaseSchema.omit({
  $id: true,
  $collectionId: true,
  $databaseId: true,
  $createdAt: true,
  $updatedAt: true,
  $permissions: true,
  created_at: true,
  updated_at: true,
});

export const createProfileVerificationWorkflowSchema = createProfileVerificationWorkflowBaseSchema.refine((data) => {
  // If status is rejected, rejection_reason must be provided
  if (data.status === 'rejected') {
    return data.rejection_reason && data.rejection_reason.trim().length > 0;
  }
  return true;
}, {
  message: 'Rejection reason is required when status is rejected',
  path: ['rejection_reason'],
}).refine((data) => {
  // If status is approved, completed_at and completed_by_user_id must be provided
  if (data.status === 'approved') {
    return data.completed_at && data.completed_by_user_id;
  }
  return true;
}, {
  message: 'Completed at and completed by user ID are required when status is approved',
  path: ['completed_at'],
}).refine((data) => {
  // Due date should be in the future for pending/in_review status
  if ((data.status === 'pending' || data.status === 'in_review') && data.due_date) {
    const dueDate = new Date(data.due_date);
    return dueDate > new Date();
  }
  return true;
}, {
  message: 'Due date must be in the future for pending or in_review status',
  path: ['due_date'],
});

// Update profile verification workflow schema
export const updateProfileVerificationWorkflowSchema = createProfileVerificationWorkflowBaseSchema.partial();

// Type exports
export type ProfileVerificationWorkflow = z.infer<typeof profileVerificationWorkflowSchema>;
export type CreateProfileVerificationWorkflow = z.infer<typeof createProfileVerificationWorkflowSchema>;
export type UpdateProfileVerificationWorkflow = z.infer<typeof updateProfileVerificationWorkflowSchema>;