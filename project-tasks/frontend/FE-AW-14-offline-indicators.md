veAllConflicts = async () => {
    Alert.alert(
      'Resolve All Conflicts',
      'This will resolve all conflicts using the "Keep Local" strategy. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Resolve All',
          style: 'destructive',
          onPress: async () => {
            try {
              for (const conflict of conflicts) {
                await resolveConflict(conflict.id, 'local');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to resolve all conflicts');
            }
          }
        }
      ]
    );
  };

  const renderConflictItem = (conflict: ConflictItem) => (
    <TouchableOpacity
      key={conflict.id}
      style={styles.conflictItem}
      onPress={() => setSelectedConflict(conflict)}
    >
      <View style={styles.conflictHeader}>
        <Text style={styles.conflictTitle}>
          {conflict.tableName.replace('_', ' ')} - {conflict.recordId}
        </Text>
        <Ionicons name="chevron-forward" size={20} color="#6c757d" />
      </View>
      <Text style={styles.conflictType}>{conflict.conflictType}</Text>
    </TouchableOpacity>
  );

  const renderConflictDetails = () => {
    if (!selectedConflict) return null;

    return (
      <View style={styles.conflictDetails}>
        <View style={styles.detailsHeader}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setSelectedConflict(null)}
          >
            <Ionicons name="chevron-back" size={20} color="#007bff" />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.detailsTitle}>Resolve Conflict</Text>
        </View>
        
        <View style={styles.dataComparison}>
          <View style={styles.dataColumn}>
            <Text style={styles.dataTitle}>Local Version</Text>
            <ScrollView style={styles.dataContent}>
              <Text style={styles.dataText}>
                {JSON.stringify(selectedConflict.localData, null, 2)}
              </Text>
            </ScrollView>
            <TouchableOpacity
              style={[styles.resolutionButton, styles.localButton]}
              onPress={() => resolveConflict(selectedConflict.id, 'local')}
            >
              <Text style={styles.buttonText}>Keep Local</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.dataColumn}>
            <Text style={styles.dataTitle}>Remote Version</Text>
            <ScrollView style={styles.dataContent}>
              <Text style={styles.dataText}>
                {JSON.stringify(selectedConflict.remoteData, null, 2)}
              </Text>
            </ScrollView>
            <TouchableOpacity
              style={[styles.resolutionButton, styles.remoteButton]}
              onPress={() => resolveConflict(selectedConflict.id, 'remote')}
            >
              <Text style={styles.buttonText}>Keep Remote</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Data Conflicts</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.closeButton}>Close</Text>
          </TouchableOpacity>
        </View>
        
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text>Loading conflicts...</Text>
          </View>
        ) : selectedConflict ? (
          renderConflictDetails()
        ) : (
          <View style={styles.content}>
            {conflicts.length === 0 ? (
              <View style={styles.noConflictsContainer}>
                <Ionicons name="checkmark-circle" size={64} color="#28a745" />
                <Text style={styles.noConflictsText}>No conflicts to resolve</Text>
              </View>
            ) : (
              <>
                <View style={styles.conflictsHeader}>
                  <Text style={styles.conflictsCount}>
                    {conflicts.length} conflict{conflicts.length !== 1 ? 's' : ''} found
                  </Text>
                  <TouchableOpacity
                    style={styles.resolveAllButton}
                    onPress={resolveAllConflicts}
                  >
                    <Text style={styles.resolveAllButtonText}>Resolve All</Text>
                  </TouchableOpacity>
                </View>
                
                <ScrollView style={styles.conflictsList}>
                  {conflicts.map(renderConflictItem)}
                </ScrollView>
              </>
            )}
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    color: '#007bff',
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  noConflictsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noConflictsText: {
    fontSize: 18,
    color: '#28a745',
    marginTop: 16,
  },
  conflictsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  conflictsCount: {
    fontSize: 16,
    fontWeight: '500',
  },
  resolveAllButton: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  resolveAllButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  conflictsList: {
    flex: 1,
    padding: 16,
  },
  conflictItem: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 8,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#dc3545',
  },
  conflictHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  conflictTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  conflictType: {
    fontSize: 14,
    color: '#6c757d',
  },
  conflictDetails: {
    flex: 1,
  },
  detailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  backButtonText: {
    color: '#007bff',
    fontSize: 16,
    marginLeft: 4,
  },
  detailsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  dataComparison: {
    flex: 1,
    flexDirection: 'row',
    padding: 16,
    gap: 16,
  },
  dataColumn: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
  },
  dataTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  dataContent: {
    flex: 1,
    maxHeight: 300,
    marginBottom: 12,
  },
  dataText: {
    fontSize: 12,
    fontFamily: 'monospace',
  },
  resolutionButton: {
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  localButton: {
    backgroundColor: '#28a745',
  },
  remoteButton: {
    backgroundColor: '#007bff',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
```

### Sync Progress Indicator Component
```typescript
// frontend/components/status/SyncProgressIndicator.tsx
import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSync } from '../../hooks/useSync';

export const SyncProgressIndicator: React.FC = () => {
  const { status } = useSync();
  const [rotateValue] = React.useState(new Animated.Value(0));

  React.useEffect(() => {
    if (status.isRunning) {
      const rotation = Animated.loop(
        Animated.timing(rotateValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      );
      rotation.start();
      return () => rotation.stop();
    }
  }, [status.isRunning]);

  const rotate = rotateValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  if (!status.isRunning && status.progress.current === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Animated.View style={{ transform: [{ rotate }] }}>
          <Ionicons name="sync" size={20} color="#007bff" />
        </Animated.View>
        
        <View style={styles.textContainer}>
          <Text style={styles.statusText}>
            {status.progress.stage === 'uploading' && 'Uploading changes...'}
            {status.progress.stage === 'downloading' && 'Downloading updates...'}
            {status.progress.stage === 'resolving_conflicts' && 'Resolving conflicts...'}
            {status.progress.stage === 'idle' && 'Sync complete'}
          </Text>
          
          {status.progress.total > 0 && (
            <Text style={styles.progressText}>
              {status.progress.current} of {status.progress.total}
            </Text>
          )}
        </View>
      </View>
      
      {status.progress.total > 0 && (
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill,
              { width: `${(status.progress.current / status.progress.total) * 100}%` }
            ]} 
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  textContainer: {
    marginLeft: 12,
    flex: 1,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  progressText: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 2,
  },
  progressBar: {
    height: 3,
    backgroundColor: '#e9ecef',
    borderRadius: 1.5,
    marginTop: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007bff',
    borderRadius: 1.5,
  },
});
```

### Data Freshness Indicator Component
```typescript
// frontend/components/status/DataFreshnessIndicator.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface DataFreshnessIndicatorProps {
  lastUpdated: Date | null;
  isOffline?: boolean;
  showIcon?: boolean;
}

export const DataFreshnessIndicator: React.FC<DataFreshnessIndicatorProps> = ({
  lastUpdated,
  isOffline = false,
  showIcon = true
}) => {
  const getTimeAgo = (date: Date | null): string => {
    if (!date) return 'Never updated';
    
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  const getFreshnessColor = (): string => {
    if (!lastUpdated) return '#dc3545';
    
    const now = new Date();
    const diff = now.getTime() - lastUpdated.getTime();
    const hours = diff / (1000 * 60 * 60);

    if (isOffline) return '#fd7e14';
    if (hours < 1) return '#28a745';
    if (hours < 24) return '#ffc107';
    return '#dc3545';
  };

  const getFreshnessIcon = (): string => {
    if (!lastUpdated) return 'alert-circle';
    if (isOffline) return 'cloud-offline';
    
    const now = new Date();
    const diff = now.getTime() - lastUpdated.getTime();
    const hours = diff / (1000 * 60 * 60);

    if (hours < 1) return 'checkmark-circle';
    if (hours < 24) return 'time';
    return 'warning';
  };

  return (
    <View style={styles.container}>
      {showIcon && (
        <Ionicons 
          name={getFreshnessIcon()} 
          size={12} 
          color={getFreshnessColor()} 
          style={styles.icon}
        />
      )}
      <Text style={[styles.text, { color: getFreshnessColor() }]}>
        {getTimeAgo(lastUpdated)}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 4,
  },
  text: {
    fontSize: 11,
    fontWeight: '500',
  },
});
```

## Files to Create/Modify
- `frontend/services/connection/ConnectionStatusService.ts` - Connection status monitoring service
- `frontend/hooks/useConnectionStatus.ts` - React hook for connection status
- `frontend/components/status/GlobalStatusBar.tsx` - Global status bar component
- `frontend/components/status/ConflictResolutionModal.tsx` - Conflict resolution modal
- `frontend/components/status/SyncProgressIndicator.tsx` - Sync progress indicator
- `frontend/components/status/DataFreshnessIndicator.tsx` - Data freshness indicator
- `frontend/components/status/OfflineIndicator.tsx` - Simple offline indicator
- `frontend/utils/statusHelpers.ts` - Status utility functions

## Testing Requirements

### Connection Status Testing
```typescript
// frontend/__tests__/services/connection/ConnectionStatusService.test.ts
import { connectionStatusService } from '../../../services/connection/ConnectionStatusService';
import NetInfo from '@react-native-community/netinfo';

describe('ConnectionStatusService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with correct status', async () => {
    const mockNetInfo = {
      isConnected: true,
      type: 'wifi',
      isInternetReachable: true
    };
    
    jest.spyOn(NetInfo, 'fetch').mockResolvedValue(mockNetInfo as any);
    
    await connectionStatusService.initialize();
    const status = connectionStatusService.getStatus();
    
    expect(status.isOnline).toBe(true);
    expect(status.connectionType).toBe('wifi');
  });

  it('should handle network state changes', async () => {
    const statusListener = jest.fn();
    connectionStatusService.onStatusChange(statusListener);
    
    // Simulate network change
    const mockNetInfo = {
      isConnected: false,
      type: 'none',
      isInternetReachable: false
    };
    
    // This would be triggered by NetInfo listener
    expect(statusListener).toHaveBeenCalled();
  });

  it('should trigger sync when coming back online', async () => {
    const mockTriggerSync = jest.fn();
    
    // Test would verify sync is triggered when network comes back
    expect(mockTriggerSync).toHaveBeenCalled();
  });
});
```

### Status Components Testing
```typescript
// frontend/__tests__/components/status/GlobalStatusBar.test.tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { GlobalStatusBar } from '../../../components/status/GlobalStatusBar';

describe('GlobalStatusBar', () => {
  it('should display offline status', () => {
    const { getByText } = render(<GlobalStatusBar />);
    
    // Mock offline state
    expect(getByText('Working offline')).toBeTruthy();
  });

  it('should show conflict count when conflicts exist', () => {
    const { getByText } = render(<GlobalStatusBar />);
    
    // Mock conflict state
    expect(getByText(/conflicts need resolution/)).toBeTruthy();
  });

  it('should trigger sync when pressed', () => {
    const { getByTestId } = render(<GlobalStatusBar />);
    
    const statusBar = getByTestId('status-bar');
    fireEvent.press(statusBar);
    
    // Verify sync was triggered
  });
});
```

### Conflict Resolution Testing
```typescript
// frontend/__tests__/components/status/ConflictResolutionModal.test.tsx
describe('ConflictResolutionModal', () => {
  it('should load and display conflicts', async () => {
    const mockConflicts = [
      {
        id: 'conflict-1',
        tableName: 'patients',
        recordId: 'patient-1',
        localData: { name: 'Local Name' },
        remoteData: { name: 'Remote Name' },
        conflictType: 'update_conflict'
      }
    ];
    
    const { getByText } = render(
      <ConflictResolutionModal visible={true} onClose={() => {}} />
    );
    
    expect(getByText('patients - patient-1')).toBeTruthy();
  });

  it('should resolve conflicts when buttons are pressed', async () => {
    const mockResolve = jest.fn();
    
    const { getByText } = render(
      <ConflictResolutionModal visible={true} onClose={() => {}} />
    );
    
    fireEvent.press(getByText('Keep Local'));
    
    expect(mockResolve).toHaveBeenCalledWith('conflict-1', 'local');
  });
});
```

## Implementation Steps

### Phase 1: Core Status Services (2 hours)
1. Implement ConnectionStatusService
2. Create useConnectionStatus hook
3. Add network state monitoring
4. Test basic status functionality

### Phase 2: UI Components (2 hours)
1. Create GlobalStatusBar component
2. Implement SyncProgressIndicator
3. Add DataFreshnessIndicator
4. Test UI components

### Phase 3: Conflict Resolution (1.5 hours)
1. Build ConflictResolutionModal
2. Add conflict comparison views
3. Implement resolution actions
4. Test conflict resolution workflow

### Phase 4: Integration & Testing (0.5 hours)
1. Integrate components with existing app
2. Add comprehensive tests
3. Optimize performance
4. Test offline scenarios

## Success Metrics
- Status indicators working correctly across all screens
- Conflict resolution UI functional and user-friendly
- Network state changes handled properly
- Sync progress clearly communicated to users
- Data freshness accurately displayed
- All tests passing
- Performance acceptable on mobile devices
- Accessibility requirements met

## Rollback Plan
- Components can be disabled via feature flags
- Fallback to simple text-based status indicators
- Maintain existing error handling mechanisms
- Document rollback procedures

## Next Steps
After completion, this task provides:
- Complete offline-first user experience
- Clear visibility into data synchronization status
- User control over conflict resolution
- Enhanced user confidence in offline capabilities
- Foundation for advanced offline features