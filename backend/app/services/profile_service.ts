import { DateTime } from 'luxon'
import { Exception } from '@adonisjs/core/exceptions'
import User from '#models/user'
import Patient from '#models/patient'
import Facility from '#models/facility'
import type {
  UserProfileInfo,
  UserReference,
  PatientProfile,
  EmployeeProfile,
  AdminProfile,
  ProfileValidationResult,
  EnhancedImmunizationData,
  ProfileType
} from '../types/profile_types.js'

/**
 * Profile Service - Handles Profile operations and user type detection
 */
export default class ProfileService {
  /**
   * Detect user profile type by checking profile collections
   */
  async getUserProfileType(userId: string | number): Promise<UserProfileInfo> {
    try {
      // For now, we'll simulate profile detection since we don't have Appwrite integration yet
      // In the actual implementation, this would query the profile collections
      
      // Check if user exists
      const user = await User.find(userId)
      if (!user) {
        return { type: 'none', profile: null, user: null }
      }

      // For now, determine type based on user role
      // This will be replaced with actual profile collection queries
      switch (user.role) {
        case 'administrator':
          return {
            type: 'admin',
            profile: await this.createMockAdminProfile(user),
            user
          }
        case 'doctor':
        case 'supervisor':
          return {
            type: 'employee',
            profile: await this.createMockEmployeeProfile(user),
            user
          }
        default:
          return { type: 'legacy', profile: null, user }
      }
    } catch (error) {
      console.error('Error detecting user profile type:', error)
      return { type: 'error', profile: null, user: null }
    }
  }

  /**
   * Get enhanced user reference with profile information
   */
  async getUserReference(userId: string | number): Promise<UserReference> {
    const profileInfo = await this.getUserProfileType(userId)
    
    if (profileInfo.type === 'employee' && profileInfo.profile) {
      const employeeProfile = profileInfo.profile as EmployeeProfile
      return {
        id: userId,
        name: `${employeeProfile.professional_title || ''} ${profileInfo.user?.fullName || ''}`.trim(),
        type: employeeProfile.employee_type,
        facility_id: employeeProfile.primary_facility_id,
        profile_type: 'employee'
      }
    }
    
    if (profileInfo.type === 'admin' && profileInfo.profile) {
      return {
        id: userId,
        name: profileInfo.user?.fullName || '',
        type: 'administrator',
        facility_id: null, // Admins may have system-wide access
        profile_type: 'admin'
      }
    }
    
    // Fallback to legacy user information
    if (profileInfo.user) {
      return {
        id: userId,
        name: profileInfo.user.fullName,
        type: profileInfo.user.role,
        facility_id: profileInfo.user.facilityId,
        profile_type: 'legacy'
      }
    }

    throw new Exception('User not found', { status: 404 })
  }

  /**
   * Create patient profile (placeholder for Appwrite integration)
   */
  async createPatientProfile(patientData: any, createdBy: User) {
    // This will be implemented when Appwrite integration is added
    // For now, return a mock response
    return {
      success: true,
      profile: {
        id: 'mock_patient_profile_id',
        user_id: 'mock_user_id',
        patient_id: patientData.patient_id,
        verification_status: 'pending',
        created_at: new Date().toISOString()
      },
      user: {
        id: 'mock_user_id',
        email: patientData.email,
        name: patientData.name
      }
    }
  }

  /**
   * Create employee profile (placeholder for Appwrite integration)
   */
  async createEmployeeProfile(employeeData: any, createdBy: User) {
    // This will be implemented when Appwrite integration is added
    return {
      success: true,
      profile: {
        id: 'mock_employee_profile_id',
        user_id: 'mock_user_id',
        employee_id: employeeData.employee_id,
        employee_type: employeeData.employee_type,
        employment_status: 'active',
        created_at: new Date().toISOString()
      },
      user: {
        id: 'mock_user_id',
        email: employeeData.email,
        name: employeeData.name
      }
    }
  }

  /**
   * Update patient profile
   */
  async updatePatientProfile(userId: string | number, updateData: any, updatedBy: User) {
    // Placeholder for Appwrite integration
    return {
      success: true,
      profile: {
        id: 'mock_patient_profile_id',
        user_id: userId,
        ...updateData,
        updated_at: new Date().toISOString()
      }
    }
  }

  /**
   * Update employee profile
   */
  async updateEmployeeProfile(userId: string | number, updateData: any, updatedBy: User) {
    // Placeholder for Appwrite integration
    return {
      success: true,
      profile: {
        id: 'mock_employee_profile_id',
        user_id: userId,
        ...updateData,
        updated_at: new Date().toISOString()
      }
    }
  }

  /**
   * Get patient profile
   */
  async getPatientProfile(userId: string | number) {
    // Placeholder - will query Appwrite patient_profiles collection
    return null
  }

  /**
   * Get employee profile
   */
  async getEmployeeProfile(userId: string | number) {
    // Placeholder - will query Appwrite employee_profiles collection
    return null
  }

  /**
   * Get admin profile
   */
  async getAdminProfile(userId: string | number) {
    // Placeholder - will query Appwrite admin_profiles collection
    return null
  }

  /**
   * Validate professional credentials for employees
   */
  async validateProfessionalCredentials(employeeProfile: EmployeeProfile): Promise<ProfileValidationResult> {
    if (!employeeProfile.license_expiry_date) {
      return { valid: true, message: 'No license expiry date set' }
    }

    const expiryDate = new Date(employeeProfile.license_expiry_date)
    const now = new Date()

    if (expiryDate < now) {
      return { 
        valid: false, 
        message: 'Healthcare worker license has expired',
        expired_date: employeeProfile.license_expiry_date
      }
    }

    // Check if expiring within 30 days
    const thirtyDaysFromNow = new Date()
    thirtyDaysFromNow.setDate(now.getDate() + 30)

    if (expiryDate < thirtyDaysFromNow) {
      return {
        valid: true,
        warning: true,
        message: 'Healthcare worker license expires within 30 days',
        expiry_date: employeeProfile.license_expiry_date
      }
    }

    return { valid: true, message: 'License is valid' }
  }

  /**
   * Enhanced immunization record creation with profile validation
   */
  async createEnhancedImmunizationRecord(data: EnhancedImmunizationData): Promise<EnhancedImmunizationData> {
    const administeringUser = await this.getUserProfileType(data.administered_by_user_id)
    
    if (administeringUser.type === 'employee' && administeringUser.profile) {
      const employeeProfile = administeringUser.profile as EmployeeProfile
      
      // Validate professional credentials
      const credentialCheck = await this.validateProfessionalCredentials(employeeProfile)
      
      if (!credentialCheck.valid) {
        throw new Exception(credentialCheck.message, { status: 400 })
      }
      
      // Enhanced audit trail
      data.administered_by_details = {
        employee_id: employeeProfile.employee_id,
        professional_title: employeeProfile.professional_title || '',
        license_number: employeeProfile.license_number || '',
        employee_type: employeeProfile.employee_type
      }

      // Add warning if license expires soon
      if (credentialCheck.warning) {
        data.administration_notes = (data.administration_notes || '') +
          ` [WARNING: ${credentialCheck.message}]`
      }
    }
    
    return data
  }

  /**
   * Check facility access for users
   */
  async validateFacilityAccess(userProfile: UserProfileInfo, facilityId: string | number): Promise<boolean> {
    if (userProfile.type === 'admin') {
      // Admins typically have access to all facilities
      return true
    }
    
    if (userProfile.type === 'employee' && userProfile.profile) {
      const employeeProfile = userProfile.profile as EmployeeProfile
      // Check if facility is in assigned facilities or is primary facility
      const assignedFacilities = employeeProfile.assigned_facilities || []
      return assignedFacilities.includes(facilityId.toString()) ||
             employeeProfile.primary_facility_id === facilityId.toString()
    }
    
    if (userProfile.type === 'patient' && userProfile.profile) {
      const patientProfile = userProfile.profile as PatientProfile
      // Patients can only access their own facility
      return patientProfile.facility_id === facilityId.toString()
    }
    
    // Legacy users - check facility ID from user record
    if (userProfile.type === 'legacy' && userProfile.user) {
      return userProfile.user.facilityId === facilityId
    }
    
    return false
  }

  /**
   * Create mock admin profile for testing
   */
  private async createMockAdminProfile(user: User): Promise<AdminProfile> {
    const now = new Date().toISOString()
    return {
      id: `admin_profile_${user.id}`,
      user_id: user.id.toString(),
      admin_level: 'system_admin',
      system_permissions: ['user_management', 'facility_management', 'system_config'],
      facility_access_scope: 'all',
      security_clearance: 'high',
      mfa_enabled: true,
      audit_log_access: true,
      system_config_access: true,
      user_management_scope: 'global',
      created_at: now,
      updated_at: now
    }
  }

  /**
   * Create mock employee profile for testing
   */
  private async createMockEmployeeProfile(user: User): Promise<EmployeeProfile> {
    const now = new Date().toISOString()
    return {
      id: `employee_profile_${user.id}`,
      user_id: user.id.toString(),
      employee_id: `EMP${user.id}`,
      employee_type: user.role === 'supervisor' ? 'supervisor' : 'doctor',
      professional_title: user.role === 'supervisor' ? 'Supervisor' : 'Dr.',
      license_number: `LIC${user.id}${Date.now()}`,
      license_expiry_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year from now
      primary_facility_id: user.facilityId?.toString() || '',
      assigned_facilities: [user.facilityId?.toString() || ''],
      employment_status: 'active',
      specializations: user.role === 'doctor' ? ['General Practice', 'Immunization'] : [],
      created_at: now,
      updated_at: now
    }
  }
}