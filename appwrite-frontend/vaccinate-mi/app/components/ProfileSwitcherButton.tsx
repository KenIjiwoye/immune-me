import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { useAuth } from '../context/auth';
import { ProfileSwitcher } from './ProfileSwitcher';

export const ProfileSwitcherButton: React.FC = () => {
  const { hasMultipleProfiles, profileType, getDisplayName } = useAuth();
  const [showSwitcher, setShowSwitcher] = useState(false);

  if (!hasMultipleProfiles) {
    return null; // Don't show if user doesn't have multiple profiles
  }

  const handlePress = () => {
    setShowSwitcher(true);
  };

  const handleClose = () => {
    setShowSwitcher(false);
  };

  return (
    <>
      <TouchableOpacity style={styles.container} onPress={handlePress}>
        <View style={styles.button}>
          <Text style={styles.displayName}>
            {getDisplayName()}
          </Text>
          <Text style={styles.profileType}>
            {profileType.charAt(0).toUpperCase() + profileType.slice(1)}
          </Text>
          <Text style={styles.switchIcon}>⇅</Text>
        </View>
      </TouchableOpacity>

      <ProfileSwitcher
        visible={showSwitcher}
        onClose={handleClose}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    marginRight: 16,
  },
  button: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
    minWidth: 120,
    alignItems: 'center',
  },
  displayName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  profileType: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 2,
  },
  switchIcon: {
    fontSize: 12,
    color: '#2196f3',
    marginTop: 2,
  },
});

export default ProfileSwitcherButton;