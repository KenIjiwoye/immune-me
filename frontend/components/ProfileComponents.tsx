import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useAuth } from '../context/auth';
import { 
  Profile, 
  PatientProfile, 
  EmployeeProfile, 
  AdminProfile, 
  UserWithProfile,
  ProfileType 
} from '../types/profile';
import profileService from '../services/profileService';

// Profile Status Badge Component
interface ProfileStatusBadgeProps {
  profile: Profile;
  size?: 'small' | 'medium' | 'large';
}

export const ProfileStatusBadge: React.FC<ProfileStatusBadgeProps> = ({ profile, size = 'medium' }) => {
  const getStatusColor = (profile: Profile): string => {
    if ('profile_status' in profile) {
      switch (profile.profile_status) {
        case 'active': return '#10B981';
        case 'inactive': return '#6B7280';
        case 'suspended': return '#EF4444';
        default: return '#6B7280';
      }
    }
    
    if ('employment_status' in profile) {
      switch (profile.employment_status) {
        case 'active': return '#10B981';
        case 'inactive': return '#6B7280';
        case 'suspended': return '#EF4444';
        case 'terminated': return '#DC2626';
        case 'on_leave': return '#F59E0B';
        default: return '#6B7280';
      }
    }
    
    return '#10B981'; // Default active color
  };

  const getStatusText = (profile: Profile): string => {
    if ('profile_status' in profile) {
      return profile.profile_status.charAt(0).toUpperCase() + profile.profile_status.slice(1);
    }
    
    if ('employment_status' in profile) {
      return profile.employment_status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
    
    return 'Active';
  };

  const sizeStyles = {
    small: { paddingHorizontal: 6, paddingVertical: 2, fontSize: 10 },
    medium: { paddingHorizontal: 8, paddingVertical: 4, fontSize: 12 },
    large: { paddingHorizontal: 12, paddingVertical: 6, fontSize: 14 }
  };

  return (
    <View style={[
      styles.badge,
      { backgroundColor: getStatusColor(profile) },
      sizeStyles[size]
    ]}>
      <Text style={[styles.badgeText, { fontSize: sizeStyles[size].fontSize }]}>
        {getStatusText(profile)}
      </Text>
    </View>
  );
};

// Profile Type Badge Component
interface ProfileTypeBadgeProps {
  profileType: ProfileType;
  profile?: Profile | null;
  size?: 'small' | 'medium' | 'large';
}

export const ProfileTypeBadge: React.FC<ProfileTypeBadgeProps> = ({ profileType, profile, size = 'medium' }) => {
  const getTypeColor = (type: ProfileType): string => {
    switch (type) {
      case 'patient': return '#3B82F6';
      case 'employee': return '#10B981';
      case 'admin': return '#8B5CF6';
      case 'legacy': return '#6B7280';
      default: return '#6B7280';
    }
  };

  const getTypeText = (type: ProfileType, profile?: Profile | null): string => {
    if (type === 'employee' && profile && 'employee_type' in profile) {
      return profile.employee_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
    
    if (type === 'admin' && profile && 'admin_level' in profile) {
      return profile.admin_level.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
    
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  const sizeStyles = {
    small: { paddingHorizontal: 6, paddingVertical: 2, fontSize: 10 },
    medium: { paddingHorizontal: 8, paddingVertical: 4, fontSize: 12 },
    large: { paddingHorizontal: 12, paddingVertical: 6, fontSize: 14 }
  };

  return (
    <View style={[
      styles.badge,
      { backgroundColor: getTypeColor(profileType) },
      sizeStyles[size]
    ]}>
      <Text style={[styles.badgeText, { fontSize: sizeStyles[size].fontSize }]}>
        {getTypeText(profileType, profile)}
      </Text>
    </View>
  );
};

// User Display Name Component
interface UserDisplayNameProps {
  user: UserWithProfile;
  showTitle?: boolean;
  showBadges?: boolean;
  style?: any;
}

export const UserDisplayName: React.FC<UserDisplayNameProps> = ({ 
  user, 
  showTitle = true, 
  showBadges = false,
  style 
}) => {
  const displayName = showTitle ? profileService.utils.getDisplayName(user) : user.name;

  return (
    <View style={[styles.userDisplayContainer, style]}>
      <Text style={styles.userDisplayName}>{displayName}</Text>
      {showBadges && (
        <View style={styles.badgeContainer}>
          <ProfileTypeBadge profileType={user.profileType} profile={user.profile} size="small" />
          {user.profile && (
            <ProfileStatusBadge profile={user.profile} size="small" />
          )}
        </View>
      )}
    </View>
  );
};

// License Status Component (for Employee Profiles)
interface LicenseStatusProps {
  profile: EmployeeProfile;
  showDetails?: boolean;
}

export const LicenseStatus: React.FC<LicenseStatusProps> = ({ profile, showDetails = false }) => {
  const isValid = profileService.utils.isLicenseValid(profile);
  const hasLicense = !!profile.license_number;

  if (!hasLicense) {
    return (
      <View style={styles.licenseContainer}>
        <Text style={styles.licenseText}>No License Required</Text>
      </View>
    );
  }

  const getExpiryStatus = () => {
    if (!profile.license_expiry_date) return 'No Expiry';
    
    const expiryDate = new Date(profile.license_expiry_date);
    const today = new Date();
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry < 0) return 'Expired';
    if (daysUntilExpiry <= 30) return `Expires in ${daysUntilExpiry} days`;
    return 'Valid';
  };

  const statusColor = isValid ? '#10B981' : '#EF4444';
  const statusText = getExpiryStatus();

  return (
    <View style={styles.licenseContainer}>
      <View style={[styles.licenseStatus, { backgroundColor: statusColor }]}>
        <Text style={styles.licenseStatusText}>{statusText}</Text>
      </View>
      {showDetails && (
        <View style={styles.licenseDetails}>
          <Text style={styles.licenseDetailText}>License: {profile.license_number}</Text>
          {profile.license_expiry_date && (
            <Text style={styles.licenseDetailText}>
              Expires: {new Date(profile.license_expiry_date).toLocaleDateString()}
            </Text>
          )}
        </View>
      )}
    </View>
  );
};

// Profile Verification Status Component (for Patient Profiles)
interface VerificationStatusProps {
  profile: PatientProfile;
  onVerify?: () => void;
  canVerify?: boolean;
}

export const VerificationStatus: React.FC<VerificationStatusProps> = ({ 
  profile, 
  onVerify, 
  canVerify = false 
}) => {
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'verified': return '#10B981';
      case 'pending': return '#F59E0B';
      case 'rejected': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const handleVerify = () => {
    if (onVerify) {
      Alert.alert(
        'Verify Patient Profile',
        'Are you sure you want to verify this patient profile?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Verify', onPress: onVerify }
        ]
      );
    }
  };

  return (
    <View style={styles.verificationContainer}>
      <View style={[styles.verificationStatus, { backgroundColor: getStatusColor(profile.verification_status) }]}>
        <Text style={styles.verificationStatusText}>
          {profile.verification_status.charAt(0).toUpperCase() + profile.verification_status.slice(1)}
        </Text>
      </View>
      {profile.verification_method && (
        <Text style={styles.verificationMethod}>
          Method: {profile.verification_method.replace('_', ' ')}
        </Text>
      )}
      {canVerify && profile.verification_status === 'pending' && (
        <TouchableOpacity style={styles.verifyButton} onPress={handleVerify}>
          <Text style={styles.verifyButtonText}>Verify</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

// Profile Permissions Display Component
interface ProfilePermissionsProps {
  profile: Profile;
  showAll?: boolean;
}

export const ProfilePermissions: React.FC<ProfilePermissionsProps> = ({ profile, showAll = false }) => {
  const getPermissions = (profile: Profile): string[] => {
    if ('access_permissions' in profile) {
      return profile.access_permissions;
    }
    
    if ('system_permissions' in profile) {
      return profile.system_permissions;
    }
    
    return [];
  };

  const permissions = getPermissions(profile);
  const displayPermissions = showAll ? permissions : permissions.slice(0, 3);

  return (
    <View style={styles.permissionsContainer}>
      <Text style={styles.permissionsTitle}>Permissions:</Text>
      {displayPermissions.map((permission, index) => (
        <View key={index} style={styles.permissionItem}>
          <Text style={styles.permissionText}>
            {permission.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </Text>
        </View>
      ))}
      {!showAll && permissions.length > 3 && (
        <Text style={styles.morePermissions}>
          +{permissions.length - 3} more
        </Text>
      )}
    </View>
  );
};

// Profile Summary Card Component
interface ProfileSummaryCardProps {
  user: UserWithProfile;
  onPress?: () => void;
  showDetails?: boolean;
}

export const ProfileSummaryCard: React.FC<ProfileSummaryCardProps> = ({ 
  user, 
  onPress, 
  showDetails = true 
}) => {
  const { hasPermission, canAccessFacility } = useAuth();

  const renderProfileSpecificInfo = () => {
    if (!user.profile) return null;

    if (user.profileType === 'patient') {
      const patientProfile = user.profile as PatientProfile;
      return (
        <View style={styles.profileSpecificInfo}>
          <VerificationStatus profile={patientProfile} />
        </View>
      );
    }

    if (user.profileType === 'employee') {
      const employeeProfile = user.profile as EmployeeProfile;
      return (
        <View style={styles.profileSpecificInfo}>
          <LicenseStatus profile={employeeProfile} />
          {employeeProfile.department && (
            <Text style={styles.departmentText}>Dept: {employeeProfile.department}</Text>
          )}
        </View>
      );
    }

    if (user.profileType === 'admin') {
      const adminProfile = user.profile as AdminProfile;
      return (
        <View style={styles.profileSpecificInfo}>
          <Text style={styles.adminLevelText}>
            Level: {adminProfile.admin_level.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </Text>
          <Text style={styles.securityClearanceText}>
            Clearance: {adminProfile.security_clearance.charAt(0).toUpperCase() + adminProfile.security_clearance.slice(1)}
          </Text>
        </View>
      );
    }

    return null;
  };

  return (
    <TouchableOpacity 
      style={styles.profileCard} 
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.profileCardHeader}>
        <UserDisplayName user={user} showBadges={true} />
        <Text style={styles.profileCardEmail}>{user.email}</Text>
      </View>
      
      {showDetails && renderProfileSpecificInfo()}
      
      {showDetails && user.profile && (
        <View style={styles.profileCardFooter}>
          <ProfilePermissions profile={user.profile} />
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  badge: {
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginHorizontal: 2,
  },
  badgeText: {
    color: 'white',
    fontWeight: '600',
  },
  userDisplayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  userDisplayName: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  licenseContainer: {
    marginVertical: 4,
  },
  licenseStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  licenseStatusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  licenseDetails: {
    marginTop: 4,
  },
  licenseDetailText: {
    fontSize: 12,
    color: '#6B7280',
  },
  licenseText: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  verificationContainer: {
    marginVertical: 4,
  },
  verificationStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  verificationStatusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  verificationMethod: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  verifyButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  verifyButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  permissionsContainer: {
    marginVertical: 4,
  },
  permissionsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  permissionItem: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 2,
    alignSelf: 'flex-start',
  },
  permissionText: {
    fontSize: 11,
    color: '#4B5563',
  },
  morePermissions: {
    fontSize: 11,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  profileCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profileCardHeader: {
    marginBottom: 12,
  },
  profileCardEmail: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  profileSpecificInfo: {
    marginBottom: 12,
  },
  departmentText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  adminLevelText: {
    fontSize: 12,
    color: '#8B5CF6',
    fontWeight: '600',
  },
  securityClearanceText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  profileCardFooter: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 12,
  },
});

export default {
  ProfileStatusBadge,
  ProfileTypeBadge,
  UserDisplayName,
  LicenseStatus,
  VerificationStatus,
  ProfilePermissions,
  ProfileSummaryCard,
};