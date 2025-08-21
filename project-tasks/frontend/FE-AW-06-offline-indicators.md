# FE-AW-06: Add Offline/Online Status Indicators and Handling

## Title
Add Offline/Online Status Indicators and Handling

## Priority
Medium

## Estimated Time
4-6 hours

## Dependencies
- FE-AW-01: Appwrite SDK integrated
- FE-AW-02: Offline storage implemented
- FE-AW-05: Real-time synchronization implemented

## Description
Implement comprehensive offline/online status indicators and handling throughout the application. This includes visual indicators for network status, offline mode notifications, sync status displays, and user-friendly messaging for offline operations. The implementation will provide clear feedback to users about their connectivity status and data synchronization state.

The system will help healthcare workers understand when they're working offline and when their data will be synchronized, ensuring confidence in the offline-first approach.

## Acceptance Criteria
- [ ] Network status indicators implemented across the app
- [ ] Offline mode banner and notifications
- [ ] Sync status indicators for data operations
- [ ] Offline data badges on list items
- [ ] Sync queue status display
- [ ] User-friendly offline messaging
- [ ] Automatic sync notifications when online
- [ ] Conflict resolution indicators
- [ ] Offline capabilities documentation
- [ ] Graceful degradation for offline features

## Technical Notes

### Network Status Management

#### Network Status Hook
```typescript
// frontend/hooks/useNetworkStatus.ts
import { useState, useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';

export interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: string;
  isWifiEnabled?: boolean;
  strength?: number;
}

export function useNetworkStatus() {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isConnected: false,
    isInternetReachable: null,
    type: 'unknown'
  });
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    // Get initial network state
    NetInfo.fetch().then(state => {
      setNetworkStatus({
        isConnected: state.isConnected ?? false,
        isInternetReachable: state.isInternetReachable,
        type: state.type,
        isWifiEnabled: state.isWifiEnabled,
        strength: state.details?.strength
      });
    });

    // Subscribe to network state changes
    const unsubscribe = NetInfo.addEventListener(state => {
      const newStatus = {
        isConnected: state.isConnected ?? false,
        isInternetReachable: state.isInternetReachable,
        type: state.type,
        isWifiEnabled: state.isWifiEnabled,
        strength: state.details?.strength
      };

      // Track if we were offline and came back online
      if (!networkStatus.isConnected && newStatus.isConnected) {
        setWasOffline(true);
        // Reset after a short delay to allow for sync notifications
        setTimeout(() => setWasOffline(false), 3000);
      }

      setNetworkStatus(newStatus);
    });

    return unsubscribe;
  }, [networkStatus.isConnected]);

  return {
    ...networkStatus,
    wasOffline
  };
}
```

### Offline Status Components

#### Offline Banner Component
```typescript
// frontend/components/OfflineBanner.tsx
import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

interface OfflineBannerProps {
  showSyncStatus?: boolean;
}

export default function OfflineBanner({ showSyncStatus = true }: OfflineBannerProps) {
  const { isConnected, wasOffline } = useNetworkStatus();
  const [fadeAnim] = React.useState(new Animated.Value(0));

  React.useEffect(() => {
    if (!isConnected) {
      // Show offline banner
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else if (wasOffline) {
      // Show "back online" message briefly
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.delay(2000),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Hide banner
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [isConnected, wasOffline]);

  if (isConnected && !wasOffline) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.banner,
        {
          opacity: fadeAnim,
          backgroundColor: isConnected ? '#d4edda' : '#f8d7da'
        }
      ]}
    >
      <Ionicons
        name={isConnected ? 'checkmark-circle' : 'wifi-off'}
        size={16}
        color={isConnected ? '#155724' : '#721c24'}
      />
      <Text style={[
        styles.bannerText,
        { color: isConnected ? '#155724' : '#721c24' }
      ]}>
        {isConnected 
          ? 'Back online - Syncing data...' 
          : 'You\'re offline - Changes will sync when connected'
        }
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  bannerText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 8,
    flex: 1,
  },
});
```

#### Sync Status Indicator
```typescript
// frontend/components/SyncStatusIndicator.tsx
import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export type SyncStatus = 'synced' | 'pending' | 'syncing' | 'conflict' | 'error';

interface SyncStatusIndicatorProps {
  status: SyncStatus;
  size?: 'small' | 'medium' | 'large';
  showText?: boolean;
  lastSyncTime?: Date;
}

export default function SyncStatusIndicator({
  status,
  size = 'medium',
  showText = false,
  lastSyncTime
}: SyncStatusIndicatorProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'synced':
        return {
          icon: 'checkmark-circle' as const,
          color: '#28a745',
          text: 'Synced',
          backgroundColor: '#d4edda'
        };
      case 'pending':
        return {
          icon: 'time' as const,
          color: '#ffc107',
          text: 'Pending sync',
          backgroundColor: '#fff3cd'
        };
      case 'syncing':
        return {
          icon: null,
          color: '#007bff',
          text: 'Syncing...',
          backgroundColor: '#d1ecf1'
        };
      case 'conflict':
        return {
          icon: 'warning' as const,
          color: '#fd7e14',
          text: 'Conflict',
          backgroundColor: '#ffeaa7'
        };
      case 'error':
        return {
          icon: 'alert-circle' as const,
          color: '#dc3545',
          text: 'Sync error',
          backgroundColor: '#f8d7da'
        };
    }
  };

  const getSizeConfig = () => {
    switch (size) {
      case 'small':
        return { iconSize: 12, fontSize: 10, padding: 4 };
      case 'medium':
        return { iconSize: 16, fontSize: 12, padding: 6 };
      case 'large':
        return { iconSize: 20, fontSize: 14, padding: 8 };
    }
  };

  const statusConfig = getStatusConfig();
  const sizeConfig = getSizeConfig();

  const formatLastSync = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  return (
    <View style={[
      styles.container,
      {
        backgroundColor: statusConfig.backgroundColor,
        padding: sizeConfig.padding
      }
    ]}>
      {status === 'syncing' ? (
        <ActivityIndicator size="small" color={statusConfig.color} />
      ) : (
        statusConfig.icon && (
          <Ionicons
            name={statusConfig.icon}
            size={sizeConfig.iconSize}
            color={statusConfig.color}
          />
        )
      )}
      
      {showText && (
        <View style={styles.textContainer}>
          <Text style={[
            styles.statusText,
            {
              color: statusConfig.color,
              fontSize: sizeConfig.fontSize
            }
          ]}>
            {statusConfig.text}
          </Text>
          {lastSyncTime && status === 'synced' && (
            <Text style={[
              styles.timeText,
              { fontSize: sizeConfig.fontSize - 1 }
            ]}>
              {formatLastSync(lastSyncTime)}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  textContainer: {
    marginLeft: 6,
  },
  statusText: {
    fontWeight: '500',
  },
  timeText: {
    color: '#6c757d',
    marginTop: 1,
  },
});
```

#### Offline Data Badge
```typescript
// frontend/components/OfflineDataBadge.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface OfflineDataBadgeProps {
  isOfflineData: boolean;
  size?: 'small' | 'medium';
}

export default function OfflineDataBadge({ 
  isOfflineData, 
  size = 'medium' 
}: OfflineDataBadgeProps) {
  if (!isOfflineData) return null;

  const sizeConfig = size === 'small' 
    ? { iconSize: 10, fontSize: 9, padding: 3 }
    : { iconSize: 12, fontSize: 10, padding: 4 };

  return (
    <View style={[styles.badge, { padding: sizeConfig.padding }]}>
      <Ionicons
        name="cloud-offline"
        size={sizeConfig.iconSize}
        color="#6c757d"
      />
      <Text style={[styles.badgeText, { fontSize: sizeConfig.fontSize }]}>
        Offline
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e9ecef',
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  badgeText: {
    color: '#6c757d',
    fontWeight: '500',
    marginLeft: 3,
  },
});
```

### Sync Queue Status Display

#### Sync Queue Component
```typescript
// frontend/components/SyncQueueStatus.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { offlineStorage } from '../services/offlineStorage';
import SyncStatusIndicator from './SyncStatusIndicator';

interface SyncQueueItem {
  id: string;
  type: 'create' | 'update' | 'delete';
  collection: string;
  status: 'pending' | 'syncing' | 'completed' | 'error';
  timestamp: string;
  retryCount?: number;
}

export default function SyncQueueStatus() {
  const [queueItems, setQueueItems] = useState<SyncQueueItem[]>([]);
  const [showDetails, setShowDetails] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadQueueItems();
    
    // Refresh queue status every 30 seconds
    const interval = setInterval(loadQueueItems, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadQueueItems = async () => {
    try {
      const items = await offlineStorage.getSyncQueue();
      setQueueItems(items);
    } catch (error) {
      console.error('Failed to load sync queue:', error);
    }
  };

  const handleRetrySync = async () => {
    setIsLoading(true);
    try {
      // Trigger manual sync
      await offlineStorage.processSyncQueue();
      await loadQueueItems();
    } catch (error) {
      console.error('Manual sync failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const pendingCount = queueItems.filter(item => item.status === 'pending').length;
  const errorCount = queueItems.filter(item => item.status === 'error').length;

  if (queueItems.length === 0) return null;

  return (
    <>
      <TouchableOpacity
        style={styles.container}
        onPress={() => setShowDetails(true)}
      >
        <View style={styles.content}>
          <Ionicons
            name="sync"
            size={16}
            color={errorCount > 0 ? '#dc3545' : '#007bff'}
          />
          <Text style={[
            styles.text,
            { color: errorCount > 0 ? '#dc3545' : '#007bff' }
          ]}>
            {pendingCount > 0 ? `${pendingCount} pending` : 'All synced'}
            {errorCount > 0 && ` (${errorCount} errors)`}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color="#6c757d" />
      </TouchableOpacity>

      <Modal
        visible={showDetails}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Sync Queue</Text>
            <TouchableOpacity onPress={() => setShowDetails(false)}>
              <Ionicons name="close" size={24} color="#6c757d" />
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            {queueItems.map((item) => (
              <View key={item.id} style={styles.queueItem}>
                <View style={styles.queueItemHeader}>
                  <Text style={styles.queueItemTitle}>
                    {item.type.charAt(0).toUpperCase() + item.type.slice(1)} {item.collection}
                  </Text>
                  <SyncStatusIndicator
                    status={item.status as any}
                    size="small"
                  />
                </View>
                <Text style={styles.queueItemTime}>
                  {new Date(item.timestamp).toLocaleString()}
                </Text>
                {item.retryCount && item.retryCount > 0 && (
                  <Text style={styles.retryText}>
                    Retried {item.retryCount} times
                  </Text>
                )}
              </View>
            ))}

            {pendingCount > 0 && (
              <TouchableOpacity
                style={styles.retryButton}
                onPress={handleRetrySync}
                disabled={isLoading}
              >
                <Text style={styles.retryButtonText}>
                  {isLoading ? 'Syncing...' : 'Retry Sync'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  text: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  modal: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  queueItem: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  queueItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  queueItemTitle: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  queueItemTime: {
    fontSize: 12,
    color: '#6c757d',
  },
  retryText: {
    fontSize: 12,
    color: '#dc3545',
    marginTop: 2,
  },
  retryButton: {
    backgroundColor: '#007bff',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
```

### Enhanced UI Components with Offline Indicators

#### Updated Patient Card with Offline Status
```typescript
// frontend/components/PatientCard.tsx (Enhanced)
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Patient } from '../types/appwrite';
import OfflineDataBadge from './OfflineDataBadge';
import SyncStatusIndicator from './SyncStatusIndicator';

interface PatientCardProps {
  patient: Patient;
  onPress: () => void;
  syncStatus?: 'synced' | 'pending' | 'syncing' | 'conflict' | 'error';
  isOfflineData?: boolean;
  lastSyncTime?: Date;
}

export default function PatientCard({
  patient,
  onPress,
  syncStatus = 'synced',
  isOfflineData = false,
  lastSyncTime
}: PatientCardProps) {
  const formatAge = (dateOfBirth: string) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.header}>
        <View style={styles.patientInfo}>
          <Text style={styles.name}>{patient.fullName}</Text>
          <Text style={styles.details}>
            {patient.sex === 'M' ? 'Male' : 'Female'} • {formatAge(patient.dateOfBirth)} years
          </Text>
          <Text style={styles.location}>
            {patient.district}{patient.townVillage ? `, ${patient.townVillage}` : ''}
          </Text>
        </View>
        
        <View style={styles.statusContainer}>
          <OfflineDataBadge isOfflineData={isOfflineData} size="small" />
          <SyncStatusIndicator
            status={syncStatus}
            size="small"
            lastSyncTime={lastSyncTime}
          />
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.contactInfo}>
          {patient.contactPhone && (
            <View style={styles.contactItem}>
              <Ionicons name="call-outline" size={14} color="#6c757d" />
              <Text style={styles.contactText}>{patient.contactPhone}</Text>
            </View>
          )}
        </View>
        
        <Ionicons name="chevron-forward" size={20} color="#6c757d" />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  patientInfo: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  details: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 2,
  },
  location: {
    fontSize: 14,
    color: '#6c757d',
  },
  statusContainer: {
    alignItems: 'flex-end',
    gap: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  contactInfo: {
    flex: 1,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactText: {
    fontSize: 12,
    color: '#6c757d',
    marginLeft: 4,
  },
});
```

### App-Wide Offline Status Integration

#### Enhanced App Layout with Offline Status
```typescript
// frontend/app/_layout.tsx (Enhanced)
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { AuthProvider } from '../context/auth';
import OfflineBanner from '../components/OfflineBanner';
import SyncQueueStatus from '../components/SyncQueueStatus';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

export default function RootLayout() {
  return (
    <AuthProvider>
      <View style={styles.container}>
        <OfflineBanner />
        <Stack screenOptions={{ headerShown: false }} />
        <SyncQueueStatus />
      </View>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
```

## Files to Create/Modify
- `frontend/hooks/useNetworkStatus.ts` - Network status management hook
- `frontend/components/OfflineBanner.tsx` - Offline status banner
- `frontend/components/SyncStatusIndicator.tsx` - Sync status indicator
- `frontend/components/OfflineDataBadge.tsx` - Offline data badge
- `frontend/components/SyncQueueStatus.tsx` - Sync queue status display
- `frontend/components/PatientCard.tsx` - Enhanced patient card with status
- `frontend/components/NotificationCard.tsx` - Enhanced notification card
- `frontend/app/_layout.tsx` - Enhanced app layout with offline status
- `frontend/context/OfflineContext.tsx` - Offline status context provider

## Testing Requirements

### Network Status Testing
1. **Network State Detection Test**
   ```typescript
   describe('Network Status Hook', () => {
     it('should detect network state changes', async () => {
       const { result } = renderHook(() => useNetworkStatus());
       
       // Mock network state change
       NetInfo.fetch.mockResolvedValue({
         isConnected: false,
         isInternetReachable: false,
         type: 'none'
       });
       
       await waitFor(() => {
         expect(result.current.isConnected).toBe(false);
       });
     });
   });
   ```

2. **Offline Banner Test**
   ```typescript
   describe('Offline Banner', () => {
     it('should show when offline', () => {
       const { getByText } = render(<OfflineBanner />);
       
       // Mock offline state
       jest.mocked(useNetworkStatus).mockReturnValue({
         isConnected: false,
         isInternetReachable: false,
         type: 'none',
         wasOffline: false
       });
       
       expect(getByText(/offline/i)).toBeTruthy();
     });
   });
   ```

### UI Integration Testing
1. **Sync Status Display Test**
   ```typescript
   describe('Sync Status Indicator', () => {
     it('should show correct status', () => {
       const { getByTestId } = render(
         <SyncStatusIndicator status="pending" showText />
       );
       
       expect(getByTestId('sync-status')).toBeTruthy();
     });
   });
   ```

## Implementation Steps

### Phase 1: Network Status Foundation
1. Implement network status hook
2. Create basic offline banner
3. Add network state monitoring
4. Test network detection

### Phase 2: Status Indicators
1. Create sync status indicator component
2. Add offline data badges
3. Implement sync queue status display
4. Test status indicators

### Phase 3: UI Integration
1. Enhance existing components with status indicators
2. Add offline status to list items
3. Integrate with app layout
4. Test UI integration

### Phase 4: User Experience Polish
1. Add smooth animations for status changes
2. Implement user-friendly messaging
3. Add help documentation for offline features
4. Final testing and optimization

## Success Metrics
- Network status accurately detected and displayed
- Offline indicators clearly visible throughout app
- Sync status properly communicated to users
- User confidence in offline functionality increased
- Smooth transitions between online/offline states
- Clear feedback for all data operations

## Rollback Plan
- Status indicators can be disabled via feature flags
- Fallback to basic connectivity checking
- Maintain existing functionality without indicators
- Gradual rollout of offline status features

## Next Steps
After completion, this task enables:
- Complete offline-first user experience
- Full Appwrite migration completion
- Production deployment readiness
- User training and documentation