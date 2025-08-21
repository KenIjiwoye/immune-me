2020-01-01',
        facilityId: 'facility-1',
        isActive: true
      });
    });
    
    expect(result.current.patients).toHaveLength(1);
    expect(result.current.patients[0].fullName).toBe('New Patient');
  });
});
```

### Offline Functionality Testing
```typescript
// frontend/__tests__/services/patient/OfflinePatientService.test.ts
import NetInfo from '@react-native-community/netinfo';
import { patientService } from '../../../services/patient/PatientService';

describe('Offline Patient Service', () => {
  beforeEach(() => {
    // Mock offline state
    jest.spyOn(NetInfo, 'fetch').mockResolvedValue({
      isConnected: false,
      isInternetReachable: false
    } as any);
  });

  it('should work offline for patient creation', async () => {
    const patient = await patientService.createPatient({
      fullName: 'Offline Patient',
      sex: 'M',
      dateOfBirth: '2020-01-01',
      facilityId: 'facility-1',
      isActive: true
    });

    expect(patient).toBeDefined();
    expect(patient.isDirty).toBe(true); // Should be marked for sync
  });

  it('should retrieve patients from local storage when offline', async () => {
    // Create patient first
    await patientService.createPatient({
      fullName: 'Local Patient',
      sex: 'F',
      dateOfBirth: '2021-01-01',
      facilityId: 'facility-1',
      isActive: true
    });

    const patients = await patientService.getPatients();
    
    expect(patients.patients).toHaveLength(1);
    expect(patients.patients[0].fullName).toBe('Local Patient');
  });
});
```

## Implementation Steps

### Phase 1: Core Service Migration (3 hours)
1. Implement PatientService with Appwrite integration
2. Add offline-first CRUD operations
3. Implement data transformation utilities
4. Test basic patient operations

### Phase 2: Advanced Features (2 hours)
1. Add search and filtering capabilities
2. Implement photo upload functionality
3. Add data export/import features
4. Test advanced features

### Phase 3: React Integration (2 hours)
1. Create usePatients and usePatientSearch hooks
2. Update existing components to use new service
3. Add enhanced form validation
4. Test React integration

### Phase 4: Testing & Optimization (1 hour)
1. Write comprehensive tests
2. Optimize performance for mobile
3. Add error handling and user feedback
4. Test offline scenarios

## Success Metrics
- Patient CRUD operations working offline and online
- Data synchronization functioning correctly
- Search and filtering working efficiently
- Photo upload and management operational
- Export/import functionality working
- All tests passing
- Performance acceptable on mobile devices
- User experience seamless during network transitions

## Rollback Plan
- Keep existing patient service as fallback
- Implement feature flags for gradual migration
- Maintain data compatibility between old and new systems
- Document rollback procedures

## Next Steps
After completion, this task enables:
- FE-AW-12: Immunization services migration with offline support
- FE-AW-13: Notification services migration with offline support
- FE-AW-14: Offline indicators and conflict resolution UI
- Full patient management with offline-first capabilities