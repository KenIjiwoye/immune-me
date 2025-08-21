# FE-AW-01: Integrate Appwrite SDK into React Native App

## Title
Integrate Appwrite SDK into React Native App

## Priority
High

## Estimated Time
4-6 hours

## Dependencies
- BE-AW-01: Appwrite project setup completed
- BE-AW-03: Authentication system migrated

## Description
Integrate the Appwrite React Native SDK into the existing Expo/React Native application, replacing the current axios-based API client. This includes setting up the Appwrite client configuration, implementing authentication flows, and creating service layers for database operations, real-time subscriptions, and file storage.

The integration will provide a foundation for all subsequent frontend migration tasks and enable offline-first capabilities with real-time synchronization.

## Acceptance Criteria
- [ ] Appwrite React Native SDK installed and configured
- [ ] Appwrite client properly initialized with environment configuration
- [ ] Authentication service migrated to use Appwrite Auth
- [ ] Database service layer created for CRUD operations
- [ ] Real-time subscription service implemented
- [ ] File storage service configured
- [ ] Error handling and retry mechanisms implemented
- [ ] TypeScript types defined for Appwrite responses
- [ ] Service layer testing completed
- [ ] Migration from axios to Appwrite SDK verified

## Technical Notes

### SDK Installation and Setup

#### Package Installation
```bash
# Install Appwrite React Native SDK
npm install react-native-appwrite

# Install additional dependencies for offline support
npm install @react-native-async-storage/async-storage
npm install react-native-network-info
```

#### Appwrite Client Configuration
```typescript
// frontend/services/appwrite.ts
import { Client, Account, Databases, Storage, Functions, Realtime } from 'react-native-appwrite';

class AppwriteService {
  private client: Client;
  public account: Account;
  public databases: Databases;
  public storage: Storage;
  public functions: Functions;
  public realtime: Realtime;

  constructor() {
    this.client = new Client();
    
    this.client
      .setEndpoint(process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT!)
      .setProject(process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID!)
      .setPlatform('com.immuneme.app'); // Your app's bundle ID

    this.account = new Account(this.client);
    this.databases = new Databases(this.client);
    this.storage = new Storage(this.client);
    this.functions = new Functions(this.client);
    this.realtime = new Realtime(this.client);
  }

  // Get current session
  async getCurrentSession() {
    try {
      return await this.account.getSession('current');
    } catch (error) {
      return null;
    }
  }

  // Get current user
  async getCurrentUser() {
    try {
      return await this.account.get();
    } catch (error) {
      return null;
    }
  }
}

export const appwrite = new AppwriteService();
export default appwrite;
```

### Authentication Service Migration

#### Updated Authentication Context
```typescript
// frontend/context/auth.tsx
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Models } from 'react-native-appwrite';
import appwrite from '../services/appwrite';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface User extends Models.User<Models.Preferences> {
  role?: string;
  facilityId?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  updateUserInfo: (userInfo: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      setIsLoading(true);
      
      // Check for existing session
      const session = await appwrite.getCurrentSession();
      if (session) {
        const currentUser = await appwrite.getCurrentUser();
        setUser(currentUser);
      }
    } catch (error) {
      console.log('No active session found');
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      // Create email session
      await appwrite.account.createEmailSession(email, password);
      
      // Get user details
      const currentUser = await appwrite.getCurrentUser();
      setUser(currentUser);

      // Store session info locally for offline access
      await AsyncStorage.setItem('user_session', JSON.stringify({
        userId: currentUser.$id,
        email: currentUser.email,
        name: currentUser.name,
        role: currentUser.prefs?.role,
        facilityId: currentUser.prefs?.facilityId
      }));

    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      // Delete current session
      await appwrite.account.deleteSession('current');
      
      // Clear local storage
      await AsyncStorage.removeItem('user_session');
      
      setUser(null);
    } catch (error) {
      console.error('Logout failed:', error);
      // Clear local state even if server logout fails
      setUser(null);
      await AsyncStorage.removeItem('user_session');
    }
  };

  const register = async (email: string, password: string, name: string) => {
    try {
      // Create account
      await appwrite.account.create('unique()', email, password, name);
      
      // Automatically log in after registration
      await login(email, password);
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  };

  const updateUserInfo = (userInfo: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...userInfo });
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    register,
    updateUserInfo
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
```

### Database Service Layer

#### Generic Database Service
```typescript
// frontend/services/database.ts
import { ID, Query, Models } from 'react-native-appwrite';
import appwrite from './appwrite';

export interface DatabaseConfig {
  databaseId: string;
  collectionId: string;
}

export class DatabaseService<T extends Models.Document> {
  private config: DatabaseConfig;

  constructor(config: DatabaseConfig) {
    this.config = config;
  }

  // Create document
  async create(data: Omit<T, keyof Models.Document>, documentId?: string): Promise<T> {
    try {
      const response = await appwrite.databases.createDocument(
        this.config.databaseId,
        this.config.collectionId,
        documentId || ID.unique(),
        data
      );
      return response as T;
    } catch (error) {
      console.error(`Failed to create document in ${this.config.collectionId}:`, error);
      throw error;
    }
  }

  // Get document by ID
  async getById(documentId: string): Promise<T> {
    try {
      const response = await appwrite.databases.getDocument(
        this.config.databaseId,
        this.config.collectionId,
        documentId
      );
      return response as T;
    } catch (error) {
      console.error(`Failed to get document ${documentId}:`, error);
      throw error;
    }
  }

  // List documents with queries
  async list(queries?: string[]): Promise<Models.DocumentList<T>> {
    try {
      const response = await appwrite.databases.listDocuments(
        this.config.databaseId,
        this.config.collectionId,
        queries
      );
      return response as Models.DocumentList<T>;
    } catch (error) {
      console.error(`Failed to list documents from ${this.config.collectionId}:`, error);
      throw error;
    }
  }

  // Update document
  async update(documentId: string, data: Partial<Omit<T, keyof Models.Document>>): Promise<T> {
    try {
      const response = await appwrite.databases.updateDocument(
        this.config.databaseId,
        this.config.collectionId,
        documentId,
        data
      );
      return response as T;
    } catch (error) {
      console.error(`Failed to update document ${documentId}:`, error);
      throw error;
    }
  }

  // Delete document
  async delete(documentId: string): Promise<void> {
    try {
      await appwrite.databases.deleteDocument(
        this.config.databaseId,
        this.config.collectionId,
        documentId
      );
    } catch (error) {
      console.error(`Failed to delete document ${documentId}:`, error);
      throw error;
    }
  }

  // Subscribe to real-time updates
  subscribe(
    callback: (payload: Models.RealtimeResponseEvent<T>) => void,
    events?: string[]
  ) {
    const channels = [
      `databases.${this.config.databaseId}.collections.${this.config.collectionId}.documents`
    ];

    return appwrite.realtime.subscribe(channels, callback);
  }
}
```

#### Specific Service Implementations
```typescript
// frontend/services/patients.ts
import { Query } from 'react-native-appwrite';
import { DatabaseService } from './database';

export interface Patient {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  fullName: string;
  sex: 'M' | 'F';
  dateOfBirth: string;
  motherName?: string;
  fatherName?: string;
  district: string;
  townVillage?: string;
  address?: string;
  contactPhone?: string;
  healthWorkerId?: string;
  healthWorkerName?: string;
  healthWorkerPhone?: string;
  healthWorkerAddress?: string;
  facilityId: string;
}

class PatientsService extends DatabaseService<Patient> {
  constructor() {
    super({
      databaseId: 'immune-me-db',
      collectionId: 'patients'
    });
  }

  // Get patients by facility
  async getByFacility(facilityId: string, limit = 50, offset = 0): Promise<Patient[]> {
    const response = await this.list([
      Query.equal('facilityId', facilityId),
      Query.limit(limit),
      Query.offset(offset),
      Query.orderDesc('$createdAt')
    ]);
    return response.documents;
  }

  // Search patients by name
  async searchByName(name: string, facilityId?: string): Promise<Patient[]> {
    const queries = [
      Query.search('fullName', name),
      Query.limit(20)
    ];

    if (facilityId) {
      queries.push(Query.equal('facilityId', facilityId));
    }

    const response = await this.list(queries);
    return response.documents;
  }

  // Get patients with due immunizations
  async getPatientsWithDueImmunizations(facilityId?: string): Promise<Patient[]> {
    // This would typically involve a more complex query or function call
    // For now, we'll get all patients and filter on the client side
    const queries = [Query.limit(100)];
    if (facilityId) {
      queries.push(Query.equal('facilityId', facilityId));
    }

    const response = await this.list(queries);
    return response.documents;
  }
}

export const patientsService = new PatientsService();
```

### Real-time Subscription Service

#### Real-time Manager
```typescript
// frontend/services/realtime.ts
import { Models } from 'react-native-appwrite';
import appwrite from './appwrite';

export type RealtimeCallback<T = any> = (payload: Models.RealtimeResponseEvent<T>) => void;

class RealtimeService {
  private subscriptions: Map<string, () => void> = new Map();

  // Subscribe to collection changes
  subscribeToCollection<T>(
    databaseId: string,
    collectionId: string,
    callback: RealtimeCallback<T>,
    documentId?: string
  ): string {
    const subscriptionId = `${databaseId}-${collectionId}-${documentId || 'all'}-${Date.now()}`;
    
    let channels: string[];
    if (documentId) {
      channels = [`databases.${databaseId}.collections.${collectionId}.documents.${documentId}`];
    } else {
      channels = [`databases.${databaseId}.collections.${collectionId}.documents`];
    }

    const unsubscribe = appwrite.realtime.subscribe(channels, callback);
    this.subscriptions.set(subscriptionId, unsubscribe);

    return subscriptionId;
  }

  // Subscribe to user-specific events
  subscribeToUser(userId: string, callback: RealtimeCallback): string {
    const subscriptionId = `user-${userId}-${Date.now()}`;
    const channels = [`account.${userId}`];

    const unsubscribe = appwrite.realtime.subscribe(channels, callback);
    this.subscriptions.set(subscriptionId, unsubscribe);

    return subscriptionId;
  }

  // Unsubscribe from specific subscription
  unsubscribe(subscriptionId: string): void {
    const unsubscribeFn = this.subscriptions.get(subscriptionId);
    if (unsubscribeFn) {
      unsubscribeFn();
      this.subscriptions.delete(subscriptionId);
    }
  }

  // Unsubscribe from all subscriptions
  unsubscribeAll(): void {
    this.subscriptions.forEach((unsubscribeFn) => {
      unsubscribeFn();
    });
    this.subscriptions.clear();
  }
}

export const realtimeService = new RealtimeService();
```

### Error Handling and Retry Logic

#### Error Handler Service
```typescript
// frontend/services/errorHandler.ts
import { AppwriteException } from 'react-native-appwrite';
import NetInfo from '@react-native-community/netinfo';

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
}

export class ErrorHandler {
  private static defaultRetryConfig: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000
  };

  static async withRetry<T>(
    operation: () => Promise<T>,
    config: Partial<RetryConfig> = {}
  ): Promise<T> {
    const { maxRetries, baseDelay, maxDelay } = { ...this.defaultRetryConfig, ...config };
    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        // Don't retry on certain errors
        if (this.isNonRetryableError(error)) {
          throw error;
        }

        // Don't retry if no network connection
        const netInfo = await NetInfo.fetch();
        if (!netInfo.isConnected) {
          throw new Error('No network connection available');
        }

        if (attempt < maxRetries) {
          const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
          await this.delay(delay);
        }
      }
    }

    throw lastError!;
  }

  private static isNonRetryableError(error: any): boolean {
    if (error instanceof AppwriteException) {
      // Don't retry on authentication errors, validation errors, etc.
      const nonRetryableCodes = [400, 401, 403, 404, 409];
      return nonRetryableCodes.includes(error.code);
    }
    return false;
  }

  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  static handleError(error: any, context?: string): void {
    console.error(`Error in ${context || 'unknown context'}:`, error);

    if (error instanceof AppwriteException) {
      switch (error.code) {
        case 401:
          // Handle authentication error
          console.log('Authentication required');
          break;
        case 403:
          // Handle permission error
          console.log('Permission denied');
          break;
        case 404:
          // Handle not found error
          console.log('Resource not found');
          break;
        default:
          console.log('Appwrite error:', error.message);
      }
    } else {
      console.log('Unknown error:', error.message);
    }
  }
}
```

### TypeScript Type Definitions

#### Appwrite Types
```typescript
// frontend/types/appwrite.ts
import { Models } from 'react-native-appwrite';

// Extend base document type
export interface BaseDocument extends Models.Document {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  $permissions: string[];
  $collectionId: string;
  $databaseId: string;
}

// Patient type
export interface Patient extends BaseDocument {
  fullName: string;
  sex: 'M' | 'F';
  dateOfBirth: string;
  motherName?: string;
  fatherName?: string;
  district: string;
  townVillage?: string;
  address?: string;
  contactPhone?: string;
  healthWorkerId?: string;
  healthWorkerName?: string;
  healthWorkerPhone?: string;
  healthWorkerAddress?: string;
  facilityId: string;
}

// Immunization Record type
export interface ImmunizationRecord extends BaseDocument {
  patientId: string;
  vaccineId: string;
  facilityId: string;
  administeredBy: string;
  dateAdministered: string;
  doseNumber: number;
  batchNumber?: string;
  expirationDate?: string;
  siteOfAdministration?: string;
  adverseEvents?: string;
  notes?: string;
}

// Notification type
export interface Notification extends BaseDocument {
  patientId: string;
  vaccineId: string;
  facilityId: string;
  type: 'due' | 'overdue' | 'reminder';
  status: 'pending' | 'viewed' | 'completed';
  dueDate: string;
  message?: string;
  priority: 'low' | 'medium' | 'high';
}

// Facility type
export interface Facility extends BaseDocument {
  name: string;
  type: 'hospital' | 'clinic' | 'health_center' | 'outreach_post';
  district: string;
  address?: string;
  contactPhone?: string;
  contactEmail?: string;
  isActive: boolean;
}

// Vaccine type
export interface Vaccine extends BaseDocument {
  name: string;
  description?: string;
  manufacturer?: string;
  dosageForm?: string;
  routeOfAdministration?: string;
  storageRequirements?: string;
  isActive: boolean;
}
```

## Files to Create/Modify
- `frontend/services/appwrite.ts` - Main Appwrite client configuration
- `frontend/services/database.ts` - Generic database service layer
- `frontend/services/patients.ts` - Patient-specific service
- `frontend/services/immunizations.ts` - Immunization records service
- `frontend/services/notifications.ts` - Notifications service
- `frontend/services/facilities.ts` - Facilities service
- `frontend/services/realtime.ts` - Real-time subscription manager
- `frontend/services/errorHandler.ts` - Error handling and retry logic
- `frontend/context/auth.tsx` - Updated authentication context
- `frontend/types/appwrite.ts` - TypeScript type definitions
- `frontend/package.json` - Add Appwrite SDK dependency

## Testing Requirements

### SDK Integration Testing
1. **Client Initialization Test**
   ```typescript
   // Test Appwrite client setup
   describe('Appwrite Client', () => {
     it('should initialize with correct configuration', () => {
       expect(appwrite.client).toBeDefined();
       expect(appwrite.account).toBeDefined();
       expect(appwrite.databases).toBeDefined();
     });
   });
   ```

2. **Authentication Flow Test**
   ```typescript
   // Test authentication with Appwrite
   describe('Authentication', () => {
     it('should login with valid credentials', async () => {
       const { login } = useAuth();
       await expect(login('test@example.com', 'password123')).resolves.not.toThrow();
     });

     it('should handle login errors', async () => {
       const { login } = useAuth();
       await expect(login('invalid@example.com', 'wrong')).rejects.toThrow();
     });
   });
   ```

3. **Database Operations Test**
   ```typescript
   // Test database CRUD operations
   describe('Database Service', () => {
     it('should create a patient record', async () => {
       const patientData = {
         fullName: 'Test Patient',
         sex: 'M' as const,
         dateOfBirth: '2020-01-01',
         district: 'Test District',
         facilityId: 'test-facility-id'
       };

       const patient = await patientsService.create(patientData);
       expect(patient.$id).toBeDefined();
       expect(patient.fullName).toBe('Test Patient');
     });
   });
   ```

### Real-time Testing
1. **Subscription Test**
   ```typescript
   // Test real-time subscriptions
   describe('Real-time Service', () => {
     it('should receive real-time updates', (done) => {
       const subscriptionId = realtimeService.subscribeToCollection(
         'immune-me-db',
         'patients',
         (payload) => {
           expect(payload.events).toContain('databases.*.collections.patients.documents.*.create');
           realtimeService.unsubscribe(subscriptionId);
           done();
         }
       );

       // Trigger a change to test subscription
       patientsService.create({
         fullName: 'Real-time Test Patient',
         sex: 'F',
         dateOfBirth: '2020-01-01',
         district: 'Test District',
         facilityId: 'test-facility-id'
       });
     });
   });
   ```

### Error Handling Testing
1. **Retry Logic Test**
   ```typescript
   // Test error handling and retry logic
   describe('Error Handler', () => {
     it('should retry failed operations', async () => {
       let attempts = 0;
       const operation = () => {
         attempts++;
         if (attempts < 3) {
           throw new Error('Temporary failure');
         }
         return Promise.resolve('success');
       };

       const result = await ErrorHandler.withRetry(operation);
       expect(result).toBe('success');
       expect(attempts).toBe(3);
     });
   });
   ```

## Implementation Steps

### Phase 1: SDK Setup
1. Install Appwrite React Native SDK
2. Configure Appwrite client
3. Set up environment variables
4. Test basic connectivity

### Phase 2: Authentication Migration
1. Update authentication context
2. Migrate login/logout flows
3. Implement session management
4. Test authentication flows

### Phase 3: Database Services
1. Create generic database service
2. Implement specific service classes
3. Add error handling and retry logic
4. Test CRUD operations

### Phase 4: Real-time Integration
1. Set up real-time service
2. Implement subscription management
3. Test real-time updates
4. Optimize performance

## Success Metrics
- Appwrite SDK successfully integrated
- Authentication flows working with Appwrite Auth
- Database operations functional
- Real-time subscriptions working
- Error handling and retry logic operational
- All existing functionality maintained
- Performance meets or exceeds current implementation

## Rollback Plan
- Keep existing axios-based API client as fallback
- Implement feature flags for gradual migration
- Maintain parallel implementations during transition
- Test rollback procedures thoroughly

## Next Steps
After completion, this task enables:
- FE-AW-02: Offline storage implementation
- FE-AW-03: Authentication integration
- FE-AW-04: Data services migration
- All other frontend Appwrite integration tasks