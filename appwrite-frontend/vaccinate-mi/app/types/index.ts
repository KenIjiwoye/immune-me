/**
 * Application configuration
 */
export interface AppConfig {
  appwrite: {
    endpoint: string;
    projectId: string;
    databaseId: string;
  };
  features: {
    offlineMode: boolean;
    realTimeSync: boolean;
    biometricAuth: boolean;
    multiLanguage: boolean;
    darkMode: boolean;
  };
  limits: {
    maxFileSize: number;
    maxBulkOperations: number;
    sessionTimeout: number;
    maxRetries: number;
  };
  ui: {
    theme: 'light' | 'dark' | 'auto';
    language: string;
    dateFormat: string;
    timezone: string;
  };
}