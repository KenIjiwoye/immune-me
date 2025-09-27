import type { 
  UserProfileInfo, 
  ProfileType, 
  EmployeeProfile, 
  PatientProfile, 
  AdminProfile 
} from '../types/profile_types.js'

/**
 * Profile utility functions and helpers
 */
export class ProfileUtils {
  /**
   * Check if user has a specific profile type
   */
  static hasProfileType(userProfile: UserProfileInfo, profileType: ProfileType): boolean {
    return userProfile.type === profileType
  }

  /**
   * Check if user has any of the specified profile types
   */
  static hasAnyProfileType(userProfile: UserProfileInfo, profileTypes: ProfileType[]): boolean {
    return profileTypes.includes(userProfile.type)
  }

  /**
   * Get profile display name
   */
  static getProfileDisplayName(userProfile: UserProfileInfo): string {
    if (!userProfile.profile || !userProfile.user) {
      return userProfile.user?.fullName || 'Unknown User'
    }

    switch (userProfile.type) {
      case 'employee':
        const employeeProfile = userProfile.profile as EmployeeProfile
        return `${employeeProfile.professional_title || ''} ${userProfile.user.fullName}`.trim()
      
      case 'admin':
        const adminProfile = userProfile.profile as AdminProfile
        return `${adminProfile.admin_level.replace('_', ' ').toUpperCase()} ${userProfile.user.fullName}`
      
      case 'patient':
        return userProfile.user.fullName
      
      default:
        return userProfile.user.fullName
    }
  }

  /**
   * Get user's primary facility ID
   */
  static getPrimaryFacilityId(userProfile: UserProfileInfo): string | number | null {
    if (!userProfile.profile) {
      return userProfile.user?.facilityId || null
    }

    switch (userProfile.type) {
      case 'employee':
        const employeeProfile = userProfile.profile as EmployeeProfile
        return employeeProfile.primary_facility_id
      
      case 'patient':
        const patientProfile = userProfile.profile as PatientProfile
        return patientProfile.facility_id
      
      case 'admin':
        // Admins may have system-wide access
        return null
      
      default:
        return userProfile.user?.facilityId || null
    }
  }

  /**
   * Get all facility IDs user has access to
   */
  static getAccessibleFacilityIds(userProfile: UserProfileInfo): string[] {
    if (!userProfile.profile) {
      const facilityId = userProfile.user?.facilityId
      return facilityId ? [facilityId.toString()] : []
    }

    switch (userProfile.type) {
      case 'employee':
        const employeeProfile = userProfile.profile as EmployeeProfile
        return employeeProfile.assigned_facilities || [employeeProfile.primary_facility_id]
      
      case 'patient':
        const patientProfile = userProfile.profile as PatientProfile
        return [patientProfile.facility_id]
      
      case 'admin':
        const adminProfile = userProfile.profile as AdminProfile
        if (adminProfile.facility_access_scope === 'all') {
          return [] // Empty array indicates all facilities
        }
        return adminProfile.assigned_facilities || []
      
      default:
        const facilityId = userProfile.user?.facilityId
        return facilityId ? [facilityId.toString()] : []
    }
  }

  /**
   * Check if user can access a specific facility
   */
  static canAccessFacility(userProfile: UserProfileInfo, facilityId: string | number): boolean {
    const accessibleFacilities = this.getAccessibleFacilityIds(userProfile)
    
    // Empty array for admin means access to all facilities
    if (userProfile.type === 'admin' && accessibleFacilities.length === 0) {
      return true
    }
    
    return accessibleFacilities.includes(facilityId.toString())
  }

  /**
   * Get user's role hierarchy level (higher number = more permissions)
   */
  static getRoleHierarchyLevel(userProfile: UserProfileInfo): number {
    if (!userProfile.profile) {
      // Legacy role hierarchy
      switch (userProfile.user?.role) {
        case 'administrator': return 100
        case 'supervisor': return 80
        case 'doctor': return 60
        case 'user': return 40
        default: return 0
      }
    }

    switch (userProfile.type) {
      case 'admin':
        const adminProfile = userProfile.profile as AdminProfile
        switch (adminProfile.admin_level) {
          case 'super_admin': return 100
          case 'system_admin': return 90
          case 'facility_admin': return 80
          default: return 70
        }
      
      case 'employee':
        const employeeProfile = userProfile.profile as EmployeeProfile
        switch (employeeProfile.employee_type) {
          case 'supervisor': return 70
          case 'doctor': return 60
          case 'nurse': return 50
          case 'technician': return 40
          case 'data_entry_clerk': return 30
          default: return 20
        }
      
      case 'patient':
        return 10
      
      default:
        return 0
    }
  }

  /**
   * Check if user can manage another user (based on hierarchy)
   */
  static canManageUser(managerProfile: UserProfileInfo, targetProfile: UserProfileInfo): boolean {
    const managerLevel = this.getRoleHierarchyLevel(managerProfile)
    const targetLevel = this.getRoleHierarchyLevel(targetProfile)
    
    return managerLevel > targetLevel
  }

  /**
   * Get user's permissions based on profile
   */
  static getUserPermissions(userProfile: UserProfileInfo): string[] {
    const permissions: string[] = []

    if (!userProfile.profile) {
      // Legacy permissions based on role
      switch (userProfile.user?.role) {
        case 'administrator':
          return ['*'] // All permissions
        case 'supervisor':
          return ['manage_patients', 'manage_employees', 'view_reports', 'manage_immunizations']
        case 'doctor':
          return ['manage_patients', 'manage_immunizations', 'view_reports']
        default:
          return ['view_patients', 'manage_immunizations']
      }
    }

    switch (userProfile.type) {
      case 'admin':
        const adminProfile = userProfile.profile as AdminProfile
        return adminProfile.system_permissions
      
      case 'employee':
        const employeeProfile = userProfile.profile as EmployeeProfile
        switch (employeeProfile.employee_type) {
          case 'supervisor':
            return ['manage_patients', 'manage_employees', 'view_reports', 'manage_immunizations']
          case 'doctor':
            return ['manage_patients', 'manage_immunizations', 'view_reports']
          case 'nurse':
            return ['manage_patients', 'manage_immunizations']
          case 'technician':
            return ['manage_immunizations', 'view_patients']
          case 'data_entry_clerk':
            return ['manage_patients', 'view_immunizations']
          default:
            return ['view_patients']
        }
      
      case 'patient':
        const patientProfile = userProfile.profile as PatientProfile
        return patientProfile.access_permissions
      
      default:
        return []
    }
  }

  /**
   * Check if user has a specific permission
   */
  static hasPermission(userProfile: UserProfileInfo, permission: string): boolean {
    const permissions = this.getUserPermissions(userProfile)
    return permissions.includes('*') || permissions.includes(permission)
  }

  /**
   * Get profile status information
   */
  static getProfileStatus(userProfile: UserProfileInfo): {
    active: boolean
    status: string
    warnings: string[]
  } {
    const warnings: string[] = []
    
    if (!userProfile.profile) {
      return {
        active: true,
        status: 'legacy',
        warnings: ['Using legacy user system']
      }
    }

    switch (userProfile.type) {
      case 'employee':
        const employeeProfile = userProfile.profile as EmployeeProfile
        const isActive = employeeProfile.employment_status === 'active'
        
        // Check license expiry
        if (employeeProfile.license_expiry_date) {
          const expiryDate = new Date(employeeProfile.license_expiry_date)
          const now = new Date()
          const thirtyDaysFromNow = new Date()
          thirtyDaysFromNow.setDate(now.getDate() + 30)
          
          if (expiryDate < now) {
            warnings.push('Professional license has expired')
          } else if (expiryDate < thirtyDaysFromNow) {
            warnings.push('Professional license expires within 30 days')
          }
        }
        
        return {
          active: isActive,
          status: employeeProfile.employment_status,
          warnings
        }
      
      case 'patient':
        const patientProfile = userProfile.profile as PatientProfile
        const patientActive = patientProfile.profile_status === 'active'
        
        if (patientProfile.verification_status === 'pending') {
          warnings.push('Profile verification pending')
        } else if (patientProfile.verification_status === 'rejected') {
          warnings.push('Profile verification rejected')
        }
        
        return {
          active: patientActive,
          status: patientProfile.profile_status,
          warnings
        }
      
      case 'admin':
        const adminProfile = userProfile.profile as AdminProfile
        
        if (!adminProfile.mfa_enabled) {
          warnings.push('Multi-factor authentication not enabled')
        }
        
        if (adminProfile.last_security_review) {
          const lastReview = new Date(adminProfile.last_security_review)
          const sixMonthsAgo = new Date()
          sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
          
          if (lastReview < sixMonthsAgo) {
            warnings.push('Security review overdue')
          }
        } else {
          warnings.push('No security review on record')
        }
        
        return {
          active: true,
          status: 'active',
          warnings
        }
      
      default:
        return {
          active: false,
          status: 'unknown',
          warnings: ['Unknown profile type']
        }
    }
  }

  /**
   * Format profile for API response
   */
  static formatProfileForResponse(userProfile: UserProfileInfo, includePrivateData: boolean = false): any {
    const baseData = {
      profile_type: userProfile.type,
      display_name: this.getProfileDisplayName(userProfile),
      primary_facility_id: this.getPrimaryFacilityId(userProfile),
      accessible_facilities: this.getAccessibleFacilityIds(userProfile),
      permissions: this.getUserPermissions(userProfile),
      hierarchy_level: this.getRoleHierarchyLevel(userProfile),
      status: this.getProfileStatus(userProfile)
    }

    if (includePrivateData && userProfile.profile) {
      return {
        ...baseData,
        profile_data: userProfile.profile,
        user_data: userProfile.user
      }
    }

    return baseData
  }
}

/**
 * Profile validation utilities
 */
export class ProfileValidationUtils {
  /**
   * Validate employee profile completeness
   */
  static validateEmployeeProfileCompleteness(profile: EmployeeProfile): {
    complete: boolean
    missing_fields: string[]
    warnings: string[]
  } {
    const missing_fields: string[] = []
    const warnings: string[] = []

    // Required fields
    if (!profile.employee_id) missing_fields.push('employee_id')
    if (!profile.employee_type) missing_fields.push('employee_type')
    if (!profile.primary_facility_id) missing_fields.push('primary_facility_id')

    // Recommended fields for medical staff
    if (['doctor', 'nurse'].includes(profile.employee_type)) {
      if (!profile.license_number) warnings.push('license_number recommended for medical staff')
      if (!profile.professional_title) warnings.push('professional_title recommended for medical staff')
    }

    return {
      complete: missing_fields.length === 0,
      missing_fields,
      warnings
    }
  }

  /**
   * Validate patient profile completeness
   */
  static validatePatientProfileCompleteness(profile: PatientProfile): {
    complete: boolean
    missing_fields: string[]
    warnings: string[]
  } {
    const missing_fields: string[] = []
    const warnings: string[] = []

    // Required fields
    if (!profile.patient_id) missing_fields.push('patient_id')
    if (!profile.facility_id) missing_fields.push('facility_id')
    if (!profile.access_permissions || profile.access_permissions.length === 0) {
      missing_fields.push('access_permissions')
    }

    // Recommended fields
    if (!profile.emergency_contact) warnings.push('emergency_contact recommended')
    if (profile.verification_status === 'pending') warnings.push('profile verification pending')

    return {
      complete: missing_fields.length === 0,
      missing_fields,
      warnings
    }
  }
}