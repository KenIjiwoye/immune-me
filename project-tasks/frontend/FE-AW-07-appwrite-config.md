# FE-AW-07: Configure Appwrite SDK and Connection Setup

## Title
Configure Appwrite SDK and Connection Setup

## Priority
High

## Estimated Time
3-4 hours

## Dependencies
- BE-AW-01: Appwrite project setup completed
- BE-AW-02: Database collections created
- BE-AW-03: Authentication system configured

## Description
Configure the Appwrite React Native SDK in the existing Expo application with proper environment setup, client initialization, and connection management. This task focuses on establishing a robust foundation for offline-first capabilities by implementing connection state management, automatic reconnection, and proper error handling for network failures.

The configuration will support both online and offline modes, with intelligent fallback mechanisms and connection state monitoring to ensure seamless user experience regardless of network conditions.

## Acceptance Criteria
- [ ] Appwrite React Native SDK installed and configured
- [ ] Environment variables properly set up for different environments (dev, staging, prod)
- [ ] Appwrite client initialized with proper configuration
- [ ] Connection state management implemented
- [ ] Automatic reconnection logic for network failures
- [ ] Network state monitoring integrated
- [ ] Error handling for connection failures
- [ ] TypeScript types defined for Appwrite configuration
- [ ] Configuration validation and health checks
- [ ] Logging and debugging setup for development

## Technical Implementation

### Package Installation
```bash
# Install Appwrite React Native SDK
npm install react-native-appwrite

# Install network and storage dependencies for offline support
npm install @react-native-async-storage/async-storage
npm install @react-native-community/netinfo
npm install react-native-sqlite-storage

# Install additional utilities
npm install uuid
npm install @types/uuid
```

### Environment Configuration
```typescript
// frontend/.env.local
EXPO_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
EXPO_PUBLIC_APPWRITE_PROJECT_ID=your-project-id
EXPO_PUBLIC_APPWRITE_DATABASE_ID=immune-me-db
EXPO_PUBLIC_APPWRITE_STORAGE_BUCKET_ID=patient-files

# Development environment
EXPO_PUBLIC_APPWRITE_ENDPOINT_DEV=http://localhost/v1
EXPO_PUBLIC_APPWRITE_PROJECT_ID_DEV=immune-me-dev

# Staging environment
EXPO_PUBLIC_APPWRITE_ENDPOINT_STAGING=https://staging.appwrite.io/v1
EXPO_PUBLIC_APPWRITE_PROJECT_ID_STAGING=immune-me-staging
```

### Appwrite Client Configuration
```typescript
// frontend/config/appwrite.ts
import { Client, Account, Databases, Storage, Functions, Realtime } from 'react-native-appwrite';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface AppwriteConfig {
  endpoint: string;
  projectId: string;
  databaseId: string;
  storageBucketId: string;
  platform: string;
}

export interface ConnectionState {
  isConnected: boolean;
  isOnline: boolean;
  lastConnected: Date | null;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
}

class AppwriteClient {
  private client: Client;
  private config: AppwriteConfig;
  private connectionState: ConnectionState;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private connectionListeners: ((state: ConnectionState) => void)[] = [];

  public account: Account;
  public databases: Databases;
  public storage: Storage;
  public functions: Functions;
  public realtime: Realtime;

  constructor() {
    this.config = this.getConfig();
    this.connectionState = {
      isConnected: false,
      isOnline: false,
      lastConnected: null,
      reconnectAttempts: 0,
      maxReconnectAttempts: 5
    };

    this.client = new Client();
    this.initializeClient();
    this.initializeServices();
    this.setupNetworkMonitoring();
  }

  private getConfig(): AppwriteConfig {
    const isDev = __DEV__;
    const isStaging = process.env.EXPO_PUBLIC_ENV === 'staging';

    let endpoint = process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT!;
    let projectId = process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID!;

    if (isDev) {
      endpoint = process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT_DEV || endpoint;
      projectId = process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID_DEV || projectId;
    } else if (isStaging) {
      endpoint = process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT_STAGING || endpoint;
      projectId = process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID_STAGING || projectId;
    }

    return {
      endpoint,
      projectId,
      databaseId: process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!,
      storageBucketId: process.env.EXPO_PUBLIC_APPWRITE_STORAGE_BUCKET_ID!,
      platform: 'com.immuneme.app'
    };
  }

  private initializeClient(): void {
    this.client
      .setEndpoint(this.config.endpoint)
      .setProject(this.config.projectId)
      .setPlatform(this.config.platform);

    // Add request interceptor for connection state management
    this.client.addHeader('X-Appwrite-Response-Format', '1.4.0');
  }

  private initializeServices(): void {
    this.account = new Account(this.client);
    this.databases = new Databases(this.client);
    this.storage = new Storage(this.client);
    this.functions = new Functions(this.client);
    this.realtime = new Realtime(this.client);
  }

  private setupNetworkMonitoring(): void {
    // Monitor network state changes
    NetInfo.addEventListener(state => {
      const wasOnline = this.connectionState.isOnline;
      this.connectionState.isOnline = state.isConnected ?? false;

      if (!wasOnline && this.connectionState.isOnline) {
        // Network came back online
        this.handleNetworkReconnection();
      } else if (wasOnline && !this.connectionState.isOnline) {
        // Network went offline
        this.handleNetworkDisconnection();
      }

      this.notifyConnectionListeners();
    });

    // Initial network state check
    NetInfo.fetch().then(state => {
      this.connectionState.isOnline = state.isConnected ?? false;
      if (this.connectionState.isOnline) {
        this.testConnection();
      }
    });
  }

  private async testConnection(): Promise<boolean> {
    try {
      // Test connection with a simple health check
      await this.account.get();
      this.connectionState.isConnected = true;
      this.connectionState.lastConnected = new Date();
      this.connectionState.reconnectAttempts = 0;
      
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }

      this.notifyConnectionListeners();
      return true;
    } catch (error) {
      this.connectionState.isConnected = false;
      this.notifyConnectionListeners();
      return false;
    }
  }

  private handleNetworkReconnection(): void {
    console.log('Network reconnected, testing Appwrite connection...');
    this.testConnection();
  }

  private handleNetworkDisconnection(): void {
    console.log('Network disconnected');
    this.connectionState.isConnected = false;
    this.notifyConnectionListeners();
  }

  private scheduleReconnection(): void {
    if (this.reconnectTimer || 
        this.connectionState.reconnectAttempts >= this.connectionState.maxReconnectAttempts) {
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, this.connectionState.reconnectAttempts), 30000);
    
    this.reconnectTimer = setTimeout(async () => {
      this.connectionState.reconnectAttempts++;
      console.log(`Reconnection attempt ${this.connectionState.reconnectAttempts}/${this.connectionState.maxReconnectAttempts}`);
      
      const connected = await this.testConnection();
      if (!connected && this.connectionState.reconnectAttempts < this.connectionState.maxReconnectAttempts) {
        this.reconnectTimer = null;
        this.scheduleReconnection();
      }
    }, delay);
  }

  public onConnectionStateChange(listener: (state: ConnectionState) => void): () => void {
    this.connectionListeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.connectionListeners.indexOf(listener);
      if (index > -1) {
        this.connectionListeners.splice(index, 1);
      }
    };
  }

  private notifyConnectionListeners(): void {
    this.connectionListeners.forEach(listener => {
      try {
        listener({ ...this.connectionState });
      } catch (error) {
        console.error('Error in connection state listener:', error);
      }
    });
  }

  public getConnectionState(): ConnectionState {
    return { ...this.connectionState };
  }

  public async forceReconnect(): Promise<boolean> {
    this.connectionState.reconnectAttempts = 0;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    return await this.testConnection();
  }

  public getConfig(): AppwriteConfig {
    return { ...this.config };
  }

  // Health check method for debugging
  public async healthCheck(): Promise<{
    client: boolean;
    account: boolean;
    database: boolean;
    storage: boolean;
    network: boolean;
  }> {
    const health = {
      client: false,
      account: false,
      database: false,
      storage: false,
      network: this.connectionState.isOnline
    };

    try {
      // Test account service
      await this.account.get();
      health.account = true;
      health.client = true;
    } catch (error) {
      console.log('Account health check failed:', error);
    }

    try {
      // Test database service
      await this.databases.list();
      health.database = true;
    } catch (error) {
      console.log('Database health check failed:', error);
    }

    try {
      // Test storage service
      await this.storage.listBuckets();
      health.storage = true;
    } catch (error) {
      console.log('Storage health check failed:', error);
    }

    return health;
  }
}

// Create singleton instance
export const appwriteClient = new AppwriteClient();
export default appwriteClient;
```

### Connection State Hook
```typescript
// frontend/hooks/useAppwriteConnection.ts
import { useState, useEffect } from 'react';
import { appwriteClient, ConnectionState } from '../config/appwrite';

export const useAppwriteConnection = () => {
  const [connectionState, setConnectionState] = useState<ConnectionState>(
    appwriteClient.getConnectionState()
  );

  useEffect(() => {
    const unsubscribe = appwriteClient.onConnectionStateChange(setConnectionState);
    return unsubscribe;
  }, []);

  const forceReconnect = async () => {
    return await appwriteClient.forceReconnect();
  };

  const healthCheck = async () => {
    return await appwriteClient.healthCheck();
  };

  return {
    connectionState,
    isConnected: connectionState.isConnected,
    isOnline: connectionState.isOnline,
    lastConnected: connectionState.lastConnected,
    reconnectAttempts: connectionState.reconnectAttempts,
    forceReconnect,
    healthCheck
  };
};
```

### Configuration Validation
```typescript
// frontend/utils/configValidation.ts
import { AppwriteConfig } from '../config/appwrite';

export interface ConfigValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export const validateAppwriteConfig = (config: AppwriteConfig): ConfigValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate required fields
  if (!config.endpoint) {
    errors.push('Appwrite endpoint is required');
  } else if (!config.endpoint.startsWith('http')) {
    errors.push('Appwrite endpoint must be a valid URL');
  }

  if (!config.projectId) {
    errors.push('Appwrite project ID is required');
  } else if (config.projectId.length < 5) {
    warnings.push('Project ID seems unusually short');
  }

  if (!config.databaseId) {
    errors.push('Database ID is required');
  }

  if (!config.storageBucketId) {
    warnings.push('Storage bucket ID not configured - file uploads will not work');
  }

  if (!config.platform) {
    errors.push('Platform identifier is required');
  }

  // Environment-specific validations
  if (__DEV__) {
    if (config.endpoint.includes('localhost') && !config.endpoint.includes('http://')) {
      warnings.push('Development endpoint should use http:// for localhost');
    }
  } else {
    if (!config.endpoint.includes('https://')) {
      errors.push('Production endpoint must use HTTPS');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};
```

### Development Tools
```typescript
// frontend/utils/appwriteDebug.ts
import { appwriteClient } from '../config/appwrite';

export class AppwriteDebugger {
  private static logs: Array<{
    timestamp: Date;
    level: 'info' | 'warn' | 'error';
    message: string;
    data?: any;
  }> = [];

  static log(level: 'info' | 'warn' | 'error', message: string, data?: any) {
    if (__DEV__) {
      const logEntry = {
        timestamp: new Date(),
        level,
        message,
        data
      };
      
      this.logs.push(logEntry);
      console.log(`[Appwrite ${level.toUpperCase()}] ${message}`, data || '');
      
      // Keep only last 100 logs
      if (this.logs.length > 100) {
        this.logs.shift();
      }
    }
  }

  static getLogs() {
    return [...this.logs];
  }

  static clearLogs() {
    this.logs = [];
  }

  static async generateDebugReport() {
    const config = appwriteClient.getConfig();
    const connectionState = appwriteClient.getConnectionState();
    const healthCheck = await appwriteClient.healthCheck();
    
    return {
      timestamp: new Date().toISOString(),
      config: {
        ...config,
        // Mask sensitive data
        projectId: config.projectId.substring(0, 8) + '...'
      },
      connectionState,
      healthCheck,
      recentLogs: this.logs.slice(-20)
    };
  }
}

// Development helper functions
export const debugAppwrite = {
  log: AppwriteDebugger.log,
  getLogs: AppwriteDebugger.getLogs,
  clearLogs: AppwriteDebugger.clearLogs,
  generateReport: AppwriteDebugger.generateDebugReport,
  
  // Quick health check
  async quickCheck() {
    console.log('=== Appwrite Quick Health Check ===');
    const health = await appwriteClient.healthCheck();
    console.log('Health Status:', health);
    
    const connectionState = appwriteClient.getConnectionState();
    console.log('Connection State:', connectionState);
    
    return { health, connectionState };
  }
};
```

## Files to Create/Modify
- `frontend/config/appwrite.ts` - Main Appwrite client configuration
- `frontend/hooks/useAppwriteConnection.ts` - Connection state management hook
- `frontend/utils/configValidation.ts` - Configuration validation utilities
- `frontend/utils/appwriteDebug.ts` - Development and debugging tools
- `frontend/.env.local` - Environment variables
- `frontend/package.json` - Add new dependencies

## Testing Requirements

### Configuration Testing
```typescript
// frontend/__tests__/config/appwrite.test.ts
import { appwriteClient } from '../../config/appwrite';
import { validateAppwriteConfig } from '../../utils/configValidation';

describe('Appwrite Configuration', () => {
  it('should initialize client with correct configuration', () => {
    const config = appwriteClient.getConfig();
    expect(config.endpoint).toBeDefined();
    expect(config.projectId).toBeDefined();
    expect(config.databaseId).toBeDefined();
  });

  it('should validate configuration correctly', () => {
    const validConfig = {
      endpoint: 'https://cloud.appwrite.io/v1',
      projectId: 'test-project-id',
      databaseId: 'test-db',
      storageBucketId: 'test-bucket',
      platform: 'com.test.app'
    };

    const result = validateAppwriteConfig(validConfig);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should detect invalid configuration', () => {
    const invalidConfig = {
      endpoint: '',
      projectId: '',
      databaseId: '',
      storageBucketId: '',
      platform: ''
    };

    const result = validateAppwriteConfig(invalidConfig);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
```

### Connection State Testing
```typescript
// frontend/__tests__/hooks/useAppwriteConnection.test.ts
import { renderHook, act } from '@testing-library/react-native';
import { useAppwriteConnection } from '../../hooks/useAppwriteConnection';

describe('useAppwriteConnection', () => {
  it('should provide connection state', () => {
    const { result } = renderHook(() => useAppwriteConnection());
    
    expect(result.current.connectionState).toBeDefined();
    expect(typeof result.current.isConnected).toBe('boolean');
    expect(typeof result.current.isOnline).toBe('boolean');
  });

  it('should provide reconnection methods', () => {
    const { result } = renderHook(() => useAppwriteConnection());
    
    expect(typeof result.current.forceReconnect).toBe('function');
    expect(typeof result.current.healthCheck).toBe('function');
  });
});
```

### Network State Testing
```typescript
// frontend/__tests__/utils/networkState.test.ts
describe('Network State Management', () => {
  it('should handle network disconnection', async () => {
    // Mock NetInfo
    const mockNetInfo = {
      isConnected: false,
      isInternetReachable: false
    };

    // Test offline behavior
    expect(true).toBe(true); // Placeholder for actual network tests
  });

  it('should handle network reconnection', async () => {
    // Test online behavior
    expect(true).toBe(true); // Placeholder for actual network tests
  });
});
```

## Implementation Steps

### Phase 1: Basic Setup (1 hour)
1. Install required packages
2. Set up environment variables
3. Create basic Appwrite client configuration
4. Test basic connectivity

### Phase 2: Connection Management (1.5 hours)
1. Implement connection state management
2. Add network monitoring
3. Create reconnection logic
4. Test connection handling

### Phase 3: Development Tools (1 hour)
1. Create debugging utilities
2. Add configuration validation
3. Implement health check system
4. Set up logging

### Phase 4: Testing & Integration (0.5 hours)
1. Write unit tests
2. Test in different network conditions
3. Validate configuration in all environments
4. Document usage patterns

## Success Metrics
- Appwrite SDK successfully configured and connected
- Connection state properly managed and monitored
- Automatic reconnection working in network failure scenarios
- Configuration validation preventing runtime errors
- Development tools providing useful debugging information
- All tests passing
- No breaking changes to existing functionality

## Rollback Plan
- Keep existing API configuration as fallback
- Use feature flags to control Appwrite usage
- Maintain backward compatibility with current auth system
- Document rollback procedures for each environment

## Next Steps
After completion, this task enables:
- FE-AW-08: Offline database implementation
- FE-AW-09: Data synchronization service
- FE-AW-10: Authentication context migration
- All subsequent Appwrite integration tasks