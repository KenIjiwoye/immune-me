# FE-AW-05: Implement Real-Time Data Synchronization

## Title
Implement Real-Time Data Synchronization

## Priority
Medium

## Estimated Time
6-8 hours

## Dependencies
- FE-AW-01: Appwrite SDK integrated
- FE-AW-04: Data services migrated to Appwrite
- BE-AW-06: Data sync functions created

## Description
Implement real-time data synchronization using Appwrite's real-time capabilities to provide live updates for patient data, immunization records, and notifications. This includes setting up WebSocket connections, managing subscription lifecycles, handling real-time events, and providing visual feedback for data changes.

The implementation will ensure that healthcare workers see immediate updates when data changes occur, improving collaboration and data accuracy across the system.

## Acceptance Criteria
- [ ] Real-time subscriptions configured for all critical data types
- [ ] WebSocket connection management implemented
- [ ] Subscription lifecycle management working
- [ ] Real-time event handling functional
- [ ] Visual indicators for real-time updates
- [ ] Conflict resolution for concurrent edits
- [ ] Connection state management implemented
- [ ] Automatic reconnection on network restore
- [ ] Performance optimization for multiple subscriptions
- [ ] Real-time notifications for due immunizations

## Technical Notes

### Real-Time Subscription Manager

#### Enhanced Real-Time Service
```typescript
// frontend/services/realtime.ts
import { Models } from 'react-native-appwrite';
import appwrite from './appwrite';
import { EventEmitter } from 'events';
import NetInfo from '@react-native-community/netinfo';

export type RealtimeCallback<T = any> = (payload: Models.RealtimeResponseEvent<T>) => void;
export type ConnectionStateCallback = (state: 'connected' | 'disconnected' | 'connecting') => void;

interface Subscription {
  id: string;
  channels: string[];
  callback: RealtimeCallback;
  unsubscribe: () => void;
  isActive: boolean;
}

class RealtimeService extends EventEmitter {
  private subscriptions: Map<string, Subscription> = new Map();
  private connectionState: 'connected' | 'disconnected' | 'connecting' = 'disconnected';
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isOnline = true;

  constructor() {
    super();
    this.setupNetworkListener();
    this.setupConnectionMonitoring();
  }

  private setupNetworkListener() {
    NetInfo.addEventListener(state => {
      const wasOnline = this.isOnline;
      this.isOnline = state.isConnected ?? false;

      if (!wasOnline && this.isOnline) {
        // Network restored, reconnect subscriptions
        this.reconnectAllSubscriptions();
      } else if (wasOnline && !this.isOnline) {
        // Network lost, update connection state
        this.setConnectionState('disconnected');
      }
    });
  }

  private setupConnectionMonitoring() {
    // Monitor connection health
    setInterval(() => {
      if (this.isOnline && this.subscriptions.size > 0) {
        this.checkConnectionHealth();
      }
    }, 30000); // Check every 30 seconds
  }

  private setConnectionState(state: 'connected' | 'disconnected' | 'connecting') {
    if (this.connectionState !== state) {
      this.connectionState = state;
      this.emit('connectionStateChanged', state);
    }
  }

  private async checkConnectionHealth() {
    // Simple health check by trying to get account info
    try {
      await appwrite.account.get();
      if (this.connectionState !== 'connected') {
        this.setConnectionState('connected');
        this.reconnectAttempts = 0;
      }
    } catch (error) {
      if (this.connectionState === 'connected') {
        this.setConnectionState('disconnected');
        this.attemptReconnection();
      }
    }
  }

  private async attemptReconnection() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    this.setConnectionState('connecting');

    setTimeout(async () => {
      try {
        await this.reconnectAllSubscriptions();
        this.setConnectionState('connected');
        this.reconnectAttempts = 0;
      } catch (error) {
        console.error('Reconnection failed:', error);
        this.attemptReconnection();
      }
    }, this.reconnectDelay * Math.pow(2, this.reconnectAttempts));
  }

  private async reconnectAllSubscriptions() {
    const subscriptionsToReconnect = Array.from(this.subscriptions.values())
      .filter(sub => sub.isActive);

    for (const subscription of subscriptionsToReconnect) {
      try {
        // Unsubscribe old connection
        subscription.unsubscribe();
        
        // Create new subscription
        const unsubscribe = appwrite.realtime.subscribe(
          subscription.channels,
          subscription.callback
        );
        
        subscription.unsubscribe = unsubscribe;
      } catch (error) {
        console.error('Failed to reconnect subscription:', subscription.id, error);
      }
    }
  }

  // Subscribe to collection changes with enhanced features
  subscribeToCollection<T>(
    databaseId: string,
    collectionId: string,
    callback: RealtimeCallback<T>,
    options: {
      documentId?: string;
      events?: string[];
      facilityFilter?: string;
    } = {}
  ): string {
    const subscriptionId = `${databaseId}-${collectionId}-${options.documentId || 'all'}-${Date.now()}`;
    
    let channels: string[];
    if (options.documentId) {
      channels = [`databases.${databaseId}.collections.${collectionId}.documents.${options.documentId}`];
    } else {
      channels = [`databases.${databaseId}.collections.${collectionId}.documents`];
    }

    // Wrap callback with filtering and error handling
    const wrappedCallback: RealtimeCallback<T> = (payload) => {
      try {
        // Filter by facility if specified
        if (options.facilityFilter && payload.payload) {
          const document = payload.payload as any;
          if (document.facilityId && document.facilityId !== options.facilityFilter) {
            return; // Skip this update
          }
        }

        // Filter by events if specified
        if (options.events && options.events.length > 0) {
          const hasMatchingEvent = payload.events.some(event => 
            options.events!.some(filterEvent => event.includes(filterEvent))
          );
          if (!hasMatchingEvent) {
            return; // Skip this update
          }
        }

        callback(payload);
      } catch (error) {
        console.error('Error in realtime callback:', error);
      }
    };

    try {
      const unsubscribe = appwrite.realtime.subscribe(channels, wrappedCallback);
      
      const subscription: Subscription = {
        id: subscriptionId,
        channels,
        callback: wrappedCallback,
        unsubscribe,
        isActive: true
      };

      this.subscriptions.set(subscriptionId, subscription);
      this.setConnectionState('connected');

      return subscriptionId;
    } catch (error) {
      console.error('Failed to create subscription:', error);
      throw error;
    }
  }

  // Subscribe to user-specific events
  subscribeToUser(userId: string, callback: RealtimeCallback): string {
    const subscriptionId = `user-${userId}-${Date.now()}`;
    const channels = [`account.${userId}`];

    try {
      const unsubscribe = appwrite.realtime.subscribe(channels, callback);
      
      const subscription: Subscription = {
        id: subscriptionId,
        channels,
        callback,
        unsubscribe,
        isActive: true
      };

      this.subscriptions.set(subscriptionId, subscription);
      return subscriptionId;
    } catch (error) {
      console.error('Failed to create user subscription:', error);
      throw error;
    }
  }

  // Unsubscribe from specific subscription
  unsubscribe(subscriptionId: string): void {
    const subscription = this.subscriptions.get(subscriptionId);
    if (subscription) {
      subscription.isActive = false;
      subscription.unsubscribe();
      this.subscriptions.delete(subscriptionId);
    }
  }

  // Unsubscribe from all subscriptions
  unsubscribeAll(): void {
    this.subscriptions.forEach((subscription) => {
      subscription.isActive = false;
      subscription.unsubscribe();
    });
    this.subscriptions.clear();
  }

  // Get connection state
  getConnectionState(): 'connected' | 'disconnected' | 'connecting' {
    return this.connectionState;
  }

  // Get active subscriptions count
  getActiveSubscriptionsCount(): number {
    return Array.from(this.subscriptions.values())
      .filter(sub => sub.isActive).length;
  }

  // Subscribe to connection state changes
  onConnectionStateChange(callback: ConnectionStateCallback): () => void {
    this.on('connectionStateChanged', callback);
    
    return () => {
      this.off('connectionStateChanged', callback);
    };
  }
}

export const realtimeService = new RealtimeService();
```

### Real-Time Data Hooks

#### Patient Real-Time Hook
```typescript
// frontend/hooks/useRealtimePatients.ts
import { useState, useEffect, useCallback } from 'react';
import { Patient } from '../types/appwrite';
import { realtimeService } from '../services/realtime';
import { patientsService } from '../services/patients';
import { useAuth } from '../context/auth';

interface UseRealtimePatientsOptions {
  facilityId?: string;
  autoRefresh?: boolean;
}

export function useRealtimePatients(options: UseRealtimePatientsOptions = {}) {
  const { user } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionState, setConnectionState] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected');
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const facilityId = options.facilityId || user?.prefs?.facilityId;

  // Load initial data
  const loadPatients = useCallback(async () => {
    try {
      setIsLoading(true);
      const patientList = await patientsService.getPatients(facilityId);
      setPatients(patientList);
    } catch (error) {
      console.error('Failed to load patients:', error);
    } finally {
      setIsLoading(false);
    }
  }, [facilityId]);

  // Handle real-time updates
  const handleRealtimeUpdate = useCallback((payload: any) => {
    const patient = payload.payload as Patient;
    const eventType = payload.events[0]?.split('.').pop();

    setPatients(currentPatients => {
      switch (eventType) {
        case 'create':
          // Add new patient if not already exists
          if (!currentPatients.find(p => p.$id === patient.$id)) {
            return [...currentPatients, patient];
          }
          return currentPatients;

        case 'update':
          // Update existing patient
          return currentPatients.map(p => 
            p.$id === patient.$id ? patient : p
          );

        case 'delete':
          // Remove deleted patient
          return currentPatients.filter(p => p.$id !== patient.$id);

        default:
          return currentPatients;
      }
    });

    setLastUpdate(new Date());
  }, []);

  // Set up real-time subscription
  useEffect(() => {
    let subscriptionId: string | null = null;

    if (facilityId) {
      subscriptionId = realtimeService.subscribeToCollection(
        'immune-me-db',
        'patients',
        handleRealtimeUpdate,
        {
          facilityFilter: facilityId,
          events: ['create', 'update', 'delete']
        }
      );
    }

    return () => {
      if (subscriptionId) {
        realtimeService.unsubscribe(subscriptionId);
      }
    };
  }, [facilityId, handleRealtimeUpdate]);

  // Monitor connection state
  useEffect(() => {
    const unsubscribe = realtimeService.onConnectionStateChange(setConnectionState);
    setConnectionState(realtimeService.getConnectionState());

    return unsubscribe;
  }, []);

  // Auto-refresh on connection restore
  useEffect(() => {
    if (connectionState === 'connected' && options.autoRefresh) {
      loadPatients();
    }
  }, [connectionState, options.autoRefresh, loadPatients]);

  // Initial load
  useEffect(() => {
    loadPatients();
  }, [loadPatients]);

  return {
    patients,
    isLoading,
    connectionState,
    lastUpdate,
    refresh: loadPatients
  };
}
```

#### Notifications Real-Time Hook
```typescript
// frontend/hooks/useRealtimeNotifications.ts
import { useState, useEffect, useCallback } from 'react';
import { Notification } from '../types/appwrite';
import { realtimeService } from '../services/realtime';
import { notificationsService } from '../services/notifications';
import { useAuth } from '../context/auth';

export function useRealtimeNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionState, setConnectionState] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected');

  const facilityId = user?.prefs?.facilityId;

  // Load initial notifications
  const loadNotifications = useCallback(async () => {
    if (!facilityId) return;

    try {
      setIsLoading(true);
      const notificationList = await notificationsService.getFacilityNotifications(facilityId);
      setNotifications(notificationList);
      
      // Calculate unread count
      const unread = notificationList.filter(n => n.status === 'pending').length;
      setUnreadCount(unread);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, [facilityId]);

  // Handle real-time notification updates
  const handleRealtimeUpdate = useCallback((payload: any) => {
    const notification = payload.payload as Notification;
    const eventType = payload.events[0]?.split('.').pop();

    setNotifications(currentNotifications => {
      let updatedNotifications: Notification[];

      switch (eventType) {
        case 'create':
          // Add new notification
          updatedNotifications = [notification, ...currentNotifications];
          break;

        case 'update':
          // Update existing notification
          updatedNotifications = currentNotifications.map(n => 
            n.$id === notification.$id ? notification : n
          );
          break;

        case 'delete':
          // Remove deleted notification
          updatedNotifications = currentNotifications.filter(n => n.$id !== notification.$id);
          break;

        default:
          updatedNotifications = currentNotifications;
      }

      // Update unread count
      const unread = updatedNotifications.filter(n => n.status === 'pending').length;
      setUnreadCount(unread);

      return updatedNotifications;
    });
  }, []);

  // Set up real-time subscription
  useEffect(() => {
    let subscriptionId: string | null = null;

    if (facilityId) {
      subscriptionId = realtimeService.subscribeToCollection(
        'immune-me-db',
        'notifications',
        handleRealtimeUpdate,
        {
          facilityFilter: facilityId,
          events: ['create', 'update', 'delete']
        }
      );
    }

    return () => {
      if (subscriptionId) {
        realtimeService.unsubscribe(subscriptionId);
      }
    };
  }, [facilityId, handleRealtimeUpdate]);

  // Monitor connection state
  useEffect(() => {
    const unsubscribe = realtimeService.onConnectionStateChange(setConnectionState);
    setConnectionState(realtimeService.getConnectionState());

    return unsubscribe;
  }, []);

  // Initial load
  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Mark notification as viewed
  const markAsViewed = useCallback(async (notificationId: string) => {
    try {
      await notificationsService.updateNotificationStatus(notificationId, 'viewed');
    } catch (error) {
      console.error('Failed to mark notification as viewed:', error);
    }
  }, []);

  // Mark notification as completed
  const markAsCompleted = useCallback(async (notificationId: string) => {
    try {
      await notificationsService.updateNotificationStatus(notificationId, 'completed');
    } catch (error) {
      console.error('Failed to mark notification as completed:', error);
    }
  }, []);

  return {
    notifications,
    unreadCount,
    isLoading,
    connectionState,
    refresh: loadNotifications,
    markAsViewed,
    markAsCompleted
  };
}
```

### Real-Time UI Components

#### Connection Status Indicator
```typescript
// frontend/components/ConnectionStatusIndicator.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { realtimeService } from '../services/realtime';

interface ConnectionStatusIndicatorProps {
  connectionState: 'connected' | 'disconnected' | 'connecting';
  showText?: boolean;
}

export default function ConnectionStatusIndicator({ 
  connectionState, 
  showText = false 
}: ConnectionStatusIndicatorProps) {
  const getStatusConfig = () => {
    switch (connectionState) {
      case 'connected':
        return {
          icon: 'wifi' as const,
          color: '#28a745',
          text: 'Connected',
          backgroundColor: '#d4edda'
        };
      case 'connecting':
        return {
          icon: 'wifi-outline' as const,
          color: '#ffc107',
          text: 'Connecting...',
          backgroundColor: '#fff3cd'
        };
      case 'disconnected':
        return {
          icon: 'wifi-off' as const,
          color: '#dc3545',
          text: 'Offline',
          backgroundColor: '#f8d7da'
        };
    }
  };

  const config = getStatusConfig();

  if (!showText) {
    return (
      <View style={[styles.indicator, { backgroundColor: config.backgroundColor }]}>
        <Ionicons name={config.icon} size={16} color={config.color} />
      </View>
    );
  }

  return (
    <View style={[styles.statusBar, { backgroundColor: config.backgroundColor }]}>
      <Ionicons name={config.icon} size={16} color={config.color} />
      <Text style={[styles.statusText, { color: config.color }]}>
        {config.text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  indicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 6,
  },
});
```

#### Real-Time Update Toast
```typescript
// frontend/components/RealtimeUpdateToast.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface RealtimeUpdateToastProps {
  message: string;
  type: 'create' | 'update' | 'delete';
  visible: boolean;
  onDismiss: () => void;
  onAction?: () => void;
  actionText?: string;
}

export default function RealtimeUpdateToast({
  message,
  type,
  visible,
  onDismiss,
  onAction,
  actionText = 'View'
}: RealtimeUpdateToastProps) {
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(-100));

  useEffect(() => {
    if (visible) {
      // Slide in and fade in
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto dismiss after 5 seconds
      const timer = setTimeout(() => {
        dismissToast();
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  const dismissToast = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss();
    });
  };

  const getTypeConfig = () => {
    switch (type) {
      case 'create':
        return {
          icon: 'add-circle' as const,
          color: '#28a745',
          backgroundColor: '#d4edda'
        };
      case 'update':
        return {
          icon: 'refresh-circle' as const,
          color: '#007bff',
          backgroundColor: '#d1ecf1'
        };
      case 'delete':
        return {
          icon: 'remove-circle' as const,
          color: '#dc3545',
          backgroundColor: '#f8d7da'
        };
    }
  };

  if (!visible) return null;

  const config = getTypeConfig();

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
          backgroundColor: config.backgroundColor
        }
      ]}
    >
      <View style={styles.content}>
        <Ionicons name={config.icon} size={20} color={config.color} />
        <Text style={[styles.message, { color: config.color }]}>
          {message}
        </Text>
      </View>

      <View style={styles.actions}>
        {onAction && (
          <TouchableOpacity onPress={onAction} style={styles.actionButton}>
            <Text style={[styles.actionText, { color: config.color }]}>
              {actionText}
            </Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={dismissToast} style={styles.dismissButton}>
          <Ionicons name="close" size={16} color={config.color} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 1000,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  message: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 8,
  },
  actionText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  dismissButton: {
    padding: 4,
  },
});
```

### Enhanced Patient List with Real-Time Updates

#### Updated Patient List Screen
```typescript
// frontend/app/(drawer)/patients/index.tsx
import React, { useState, useCallback } from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { Stack, router } from 'expo-router';
import { Patient } from '../../../types/appwrite';
import { useRealtimePatients } from '../../../hooks/useRealtimePatients';
import PatientCard from '../../../components/PatientCard';
import ConnectionStatusIndicator from '../../../components/ConnectionStatusIndicator';
import RealtimeUpdateToast from '../../../components/RealtimeUpdateToast';
import SearchBar from '../../../components/SearchBar';
import EmptyState from '../../../components/EmptyState';

export default function PatientsScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showUpdateToast, setShowUpdateToast] = useState(false);
  const [lastUpdateMessage, setLastUpdateMessage] = useState('');
  const [lastUpdateType, setLastUpdateType] = useState<'create' | 'update' | 'delete'>('update');

  const {
    patients,
    isLoading,
    connectionState,
    lastUpdate,
    refresh
  } = useRealtimePatients({
    autoRefresh: true
  });

  // Show toast when data updates
  React.useEffect(() => {
    if (lastUpdate) {
      setLastUpdateMessage('Patient data updated');
      setLastUpdateType('update');
      setShowUpdateToast(true);
    }
  }, [lastUpdate]);

  // Filter patients based on search query
  const filteredPatients = patients.filter(patient =>
    patient.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    patient.district.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handlePatientPress = useCallback((patient: Patient) => {
    router.push(`/patients/${patient.$id}`);
  }, []);

  const handleAddPatient = useCallback(() => {
    router.push('/patients/new');
  }, []);

  const renderPatient = useCallback(({ item }: { item: Patient }) => (
    <PatientCard
      patient={item}
      onPress={() => handlePatientPress(item)}
    />
  ), [handlePatientPress]);

  return (
    <>
      <Stack.Screen 
        options={{ 
          title: 'Patients',
          headerRight: () => (
            <ConnectionStatusIndicator connectionState={connectionState} />
          )
        }} 
      />
      
      <View style={styles.container}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search patients..."
        />

        <FlatList
          data={filteredPatients}
          renderItem={renderPatient}
          keyExtractor={(item) => item.$id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={refresh}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="people-outline"
              title="No patients found"
              description={searchQuery ? 
                "No patients match your search criteria" : 
                "No patients have been added yet"
              }
              actionText="Add Patient"
              onAction={handleAddPatient}
            />
          }
        />

        <RealtimeUpdateToast
          message={lastUpdateMessage}
          type={lastUpdateType}
          visible={showUpdateToast}
          onDismiss={() => setShowUpdateToast(false)}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  listContainer: {
    padding: 16,
  },
});
```

## Files to Create/Modify
- `frontend/services/realtime.ts` - Enhanced real-time service
- `frontend/hooks/useRealtimePatients.ts` - Real-time patients hook
- `frontend/hooks/useRealtimeNotifications.ts` - Real-time notifications hook
- `frontend/hooks/useRealtimeImmunizations.ts` - Real-time immunizations hook
- `frontend/components/ConnectionStatusIndicator.tsx` - Connection status component
- `frontend/components/RealtimeUpdateToast.tsx` - Update notification component
- `frontend/app/(drawer)/patients/index.tsx` - Updated patients screen
- `frontend/app/(drawer)/notifications/index.tsx` - Updated notifications screen
- `frontend/context/RealtimeContext.tsx` - Real-time context provider

## Testing Requirements

### Real-Time Functionality Testing
1. **Subscription Management Test**
   ```typescript
   describe('Realtime Service', () => {
     it('should manage subscriptions correctly', () => {
       const callback = jest.fn();
       const subscriptionId = realtimeService.subscribeToCollection(
         'immune-me-db',
         'patients',
         callback
       );

       expect(realtimeService.getActiveSubscriptionsCount()).toBe(1);
       
       realtimeService.unsubscribe(subscriptionId);
       expect(realtimeService.getActiveSubscriptionsCount()).toBe(0);
     });
   });
   ```

2. **Connection State Test**
   ```typescript
   describe('Connection State', () => {
     it('should handle connection state changes', () => {
       const callback = jest.fn();
       const unsubscribe = realtimeService.onConnectionStateChange(callback);

       // Simulate connection state change
       realtimeService.emit('connectionStateChanged', 'connected');
       
       expect(callback).toHaveBeenCalledWith('connected');
       unsubscribe();
     });
   });
   ```

### UI Integration Testing
1. **Real-Time Updates Test**
   ```typescript
   describe('Realtime Patients Hook', () => {
     it('should update patients list on real-time events', async () => {
       const { result } = renderHook(() => useRealtimePatients());
       
       // Simulate real-time update
       const mockPayload = {
         events: ['databases.immune-me-db.collections.patients.documents.create'],
         payload: mockPatient
       };

       act(() => {
         // Trigger real-time callback
         result.current.handleRealtimeUpdate(mockPayload);
       });