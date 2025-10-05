import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
  Alert,
} from 'react-native';
import { useAuth } from '../context/auth';
import { ProfileType, Profile } from '../types/profile';

interface ProfileSwitcherProps {
  visible: boolean;
  onClose: () => void;
}

export const ProfileSwitcher: React.FC<ProfileSwitcherProps> = ({ visible, onClose }) => {
  const { availableProfiles, switchProfile, user, isLoading } = useAuth();
  const [switching, setSwitching] = useState(false);

  const handleProfileSwitch = async (profileType: ProfileType) => {
    if (!user || switching) return;

    try {
      setSwitching(true);
      await switchProfile(profileType);
      onClose();
      Alert.alert('Success', 'Profile switched successfully');
    } catch (error) {
      console.error('Failed to switch profile:', error);
      Alert.alert('Error', 'Failed to switch profile. Please try again.');
    } finally {
      setSwitching(false);
    }
  };

  const getProfileDisplayName = (profileType: ProfileType, profile: Profile): string => {
    switch (profileType) {
      case 'admin':
        return `Administrator`;
      case 'employee':
        const employeeProfile = profile as any; // EmployeeProfile
        return `${employeeProfile.professional_title || 'Healthcare Worker'}`;
      case 'patient':
        return 'Patient';
      default:
        return profileType;
    }
  };

  const getProfileDescription = (profileType: ProfileType, profile: Profile): string => {
    switch (profileType) {
      case 'admin':
        const adminProfile = profile as any; // AdminProfile
        return `Admin Level: ${adminProfile.admin_level}`;
      case 'employee':
        const employeeProfile = profile as any; // EmployeeProfile
        return `${employeeProfile.employee_type} at ${employeeProfile.primary_facility_id || 'Facility'}`;
      case 'patient':
        const patientProfile = profile as any; // PatientProfile
        return `Patient at ${patientProfile.facility_id || 'Facility'}`;
      default:
        return '';
    }
  };

  const renderProfileItem = ({ item }: { item: { type: ProfileType; profile: Profile } }) => {
    const isCurrentProfile = user?.profileType === item.type;
    const displayName = getProfileDisplayName(item.type, item.profile);
    const description = getProfileDescription(item.type, item.profile);

    return (
      <TouchableOpacity
        style={[
          styles.profileItem,
          isCurrentProfile && styles.currentProfileItem,
        ]}
        onPress={() => handleProfileSwitch(item.type)}
        disabled={isCurrentProfile || switching}
      >
        <View style={styles.profileInfo}>
          <Text style={[styles.profileName, isCurrentProfile && styles.currentProfileText]}>
            {displayName}
          </Text>
          <Text style={styles.profileDescription}>
            {description}
          </Text>
          {isCurrentProfile && (
            <Text style={styles.currentLabel}>Current</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Switch Profile</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>
            Select a profile to switch to:
          </Text>

          <FlatList
            data={availableProfiles}
            keyExtractor={(item) => item.type}
            renderItem={renderProfileItem}
            style={styles.profilesList}
            showsVerticalScrollIndicator={false}
          />

          {switching && (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Switching profile...</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    margin: 20,
    maxHeight: '70%',
    width: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 18,
    color: '#666',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  profilesList: {
    maxHeight: 300,
  },
  profileItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  currentProfileItem: {
    backgroundColor: '#e3f2fd',
    borderColor: '#2196f3',
  },
  profileInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  profileName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  currentProfileText: {
    color: '#2196f3',
  },
  profileDescription: {
    fontSize: 14,
    color: '#666',
    flex: 1,
    textAlign: 'right',
  },
  currentLabel: {
    fontSize: 12,
    color: '#2196f3',
    fontWeight: 'bold',
    backgroundColor: '#bbdefb',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
});

export default ProfileSwitcher;