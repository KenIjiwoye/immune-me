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

// Notification base schema
const notificationBaseSchema = appwriteDocumentSchema.extend({
  type: z.enum(['appointment', 'reminder', 'alert', 'system', 'custom'], {
    errorMap: () => ({ message: 'Type must be one of: appointment, reminder, alert, system, custom' }),
  }),
  title: z.string().min(1, 'Title is required').max(100, 'Title must be less than 100 characters'),
  message: z.string().min(1, 'Message is required').max(1000, 'Message must be less than 1000 characters'),
  recipient_id: z.string().optional(),
  recipient_type: z.enum(['patient', 'employee', 'admin', 'facility'], {
    errorMap: () => ({ message: 'Recipient type must be one of: patient, employee, admin, facility' }),
  }).optional(),
  facility_id: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent'], {
    errorMap: () => ({ message: 'Priority must be one of: low, medium, high, urgent' }),
  }),
  status: z.enum(['pending', 'sent', 'delivered', 'read', 'failed'], {
    errorMap: () => ({ message: 'Status must be one of: pending, sent, delivered, read, failed' }),
  }),
  is_read: z.boolean(),
  scheduled_for: z.string().refine((date) => {
    const parsed = new Date(date);
    return !isNaN(parsed.getTime());
  }, 'Scheduled for must be a valid date').optional(),
  sent_at: z.string().refine((date) => {
    const parsed = new Date(date);
    return !isNaN(parsed.getTime());
  }, 'Sent at must be a valid date').optional(),
  delivery_method: z.enum(['sms', 'email', 'push', 'in_app'], {
    errorMap: () => ({ message: 'Delivery method must be one of: sms, email, push, in_app' }),
  }).optional(),
  metadata: z.string().optional(), // JSON string
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// Notification schema with business rules
export const notificationSchema = notificationBaseSchema.refine((data) => {
  // If scheduled_for is provided, it must be in the future
  if (data.scheduled_for) {
    const scheduledDate = new Date(data.scheduled_for);
    return scheduledDate > new Date();
  }
  return true;
}, {
  message: 'Scheduled for date must be in the future',
  path: ['scheduled_for'],
}).refine((data) => {
  // If sent_at is provided, it must be before or equal to now
  if (data.sent_at) {
    const sentDate = new Date(data.sent_at);
    return sentDate <= new Date();
  }
  return true;
}, {
  message: 'Sent at date cannot be in the future',
  path: ['sent_at'],
});

// Create notification schema (without Appwrite fields)
const createNotificationBaseSchema = notificationBaseSchema.omit({
  $id: true,
  $collectionId: true,
  $databaseId: true,
  $createdAt: true,
  $updatedAt: true,
  $permissions: true,
  created_at: true,
  updated_at: true,
});

export const createNotificationSchema = createNotificationBaseSchema.refine((data) => {
  // If scheduled_for is provided, it must be in the future
  if (data.scheduled_for) {
    const scheduledDate = new Date(data.scheduled_for);
    return scheduledDate > new Date();
  }
  return true;
}, {
  message: 'Scheduled for date must be in the future',
  path: ['scheduled_for'],
});

// Update notification schema
export const updateNotificationSchema = createNotificationBaseSchema.partial();

// Type exports
export type Notification = z.infer<typeof notificationSchema>;
export type CreateNotification = z.infer<typeof createNotificationSchema>;
export type UpdateNotification = z.infer<typeof updateNotificationSchema>;