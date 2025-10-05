import { Databases } from 'react-native-appwrite';

// Database ID
export const DATABASE_ID = process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!;

// Collection IDs extracted from .env.local
export const COLLECTIONS = {
  FACILITIES: process.env.EXPO_PUBLIC_APPWRITE_COLLECTION_FACILITIES!,
  PATIENTS: process.env.EXPO_PUBLIC_APPWRITE_COLLECTION_PATIENTS!,
  VACCINES: process.env.EXPO_PUBLIC_APPWRITE_COLLECTION_VACCINES!,
  IMMUNIZATION_RECORDS: process.env.EXPO_PUBLIC_APPWRITE_COLLECTION_IMMUNIZATION_RECORDS!,
  NOTIFICATIONS: process.env.EXPO_PUBLIC_APPWRITE_COLLECTION_NOTIFICATIONS!,
  VACCINE_SCHEDULES: process.env.EXPO_PUBLIC_APPWRITE_COLLECTION_VACCINE_SCHEDULES!,
  VACCINE_SCHEDULE_ITEMS: process.env.EXPO_PUBLIC_APPWRITE_COLLECTION_VACCINE_SCHEDULE_ITEMS!,
  SUPPLEMENTARY_IMMUNIZATIONS: process.env.EXPO_PUBLIC_APPWRITE_COLLECTION_SUPPLEMENTARY_IMMUNIZATIONS!,
  PATIENT_PROFILES: process.env.EXPO_PUBLIC_APPWRITE_COLLECTION_PATIENT_PROFILES!,
  EMPLOYEE_PROFILES: process.env.EXPO_PUBLIC_APPWRITE_COLLECTION_EMPLOYEE_PROFILES!,
  ADMIN_PROFILES: process.env.EXPO_PUBLIC_APPWRITE_COLLECTION_ADMIN_PROFILES!,
  ACCESS_AUDIT_LOG: process.env.EXPO_PUBLIC_APPWRITE_COLLECTION_ACCESS_AUDIT_LOG!,
  ROLE_CHANGE_LOG: process.env.EXPO_PUBLIC_APPWRITE_COLLECTION_ROLE_CHANGE_LOG!,
  PROFILE_VERIFICATION_WORKFLOW: process.env.EXPO_PUBLIC_APPWRITE_COLLECTION_PROFILE_VERIFICATION_WORKFLOW!,
} as const;

// Storage bucket IDs (hardcoded as not in .env.local)
export const STORAGE_BUCKETS = {
  PATIENT_DOCUMENTS: 'patient-documents',
  VACCINE_IMAGES: 'vaccine-images',
  REPORTS: 'reports',
  PROFILE_IMAGES: 'profile-images',
} as const;

// Type-safe collection references
export type CollectionName = keyof typeof COLLECTIONS;

export const getCollectionId = (name: CollectionName): string => COLLECTIONS[name];

// Type-safe storage bucket references
export type StorageBucketName = keyof typeof STORAGE_BUCKETS;

export const getStorageBucketId = (name: StorageBucketName): string => STORAGE_BUCKETS[name];

// Validation for collection existence (checks if IDs are defined)
export const validateCollections = (): { valid: boolean; missing: string[] } => {
  const missing: string[] = [];

  for (const [name, id] of Object.entries(COLLECTIONS)) {
    if (!id || id.trim() === '') {
      missing.push(name);
    }
  }

  return {
    valid: missing.length === 0,
    missing,
  };
};