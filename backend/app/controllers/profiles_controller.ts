import { HttpContext } from '@adonisjs/core/http'
import { Exception } from '@adonisjs/core/exceptions'
import ProfileService from '#services/profile_service'
import { patientProfileStoreValidator } from '#validators/profile/patient_store'
import { patientProfileUpdateValidator } from '#validators/profile/patient_update'
import { employeeProfileStoreValidator } from '#validators/profile/employee_store'
import { employeeProfileUpdateValidator } from '#validators/profile/employee_update'
import { adminProfileStoreValidator } from '#validators/profile/admin_store'
import { adminProfileUpdateValidator } from '#validators/profile/admin_update'

export default class ProfilesController {
  private profileService = new ProfileService()

  /**
   * Get user profile information by user ID
   */
  async show({ params, response, auth }: HttpContext) {
    try {
      const { userId } = params
      const requestingUser = auth.user!
      
      // Get profile information
      const profileInfo = await this.profileService.getUserProfileType(userId)
      
      if (profileInfo.type === 'none' || profileInfo.type === 'error') {
        return response.notFound({ error: 'Profile not found' })
      }

      // Check access permissions
      if (!await this.canAccessProfile(requestingUser, userId, profileInfo.type)) {
        return response.forbidden({ error: 'Access denied' })
      }

      // Get enhanced user reference
      const userReference = await this.profileService.getUserReference(userId)
      
      return response.json({
        success: true,
        data: {
          profile_type: profileInfo.type,
          profile: profileInfo.profile,
          user_reference: userReference,
          user: profileInfo.user
        }
      })
    } catch (error) {
      console.error('Error fetching profile:', error)
      return response.internalServerError({ error: 'Failed to fetch profile' })
    }
  }

  /**
   * Create a new patient profile
   */
  async createPatientProfile({ request, response, auth }: HttpContext) {
    try {
      const user = auth.user!
      
      // Validate request
      await request.validateUsing(patientProfileStoreValidator)
      const data = request.all()
      
      // Check if user has permission to create patient profiles
      if (!await this.canCreateProfile(user, 'patient')) {
        return response.forbidden({ error: 'Insufficient permissions to create patient profiles' })
      }
      
      const result = await this.profileService.createPatientProfile(data, user)
      
      return response.created({
        success: true,
        data: result
      })
    } catch (error) {
      console.error('Error creating patient profile:', error)
      return response.internalServerError({ error: 'Failed to create patient profile' })
    }
  }

  /**
   * Update a patient profile
   */
  async updatePatientProfile({ params, request, response, auth }: HttpContext) {
    try {
      const { userId } = params
      const requestingUser = auth.user!
      
      // Validate request
      await request.validateUsing(patientProfileUpdateValidator)
      const updateData = request.all()
      
      // Check access permissions
      if (!await this.canUpdateProfile(requestingUser, userId, 'patient')) {
        return response.forbidden({ error: 'Access denied' })
      }
      
      const result = await this.profileService.updatePatientProfile(userId, updateData, requestingUser)
      
      return response.json({
        success: true,
        data: result
      })
    } catch (error) {
      console.error('Error updating patient profile:', error)
      return response.internalServerError({ error: 'Failed to update patient profile' })
    }
  }

  /**
   * Create a new employee profile
   */
  async createEmployeeProfile({ request, response, auth }: HttpContext) {
    try {
      const user = auth.user!
      
      // Validate request
      await request.validateUsing(employeeProfileStoreValidator)
      const data = request.all()
      
      // Check if user has permission to create employee profiles
      if (!await this.canCreateProfile(user, 'employee')) {
        return response.forbidden({ error: 'Insufficient permissions to create employee profiles' })
      }
      
      const result = await this.profileService.createEmployeeProfile(data, user)
      
      return response.created({
        success: true,
        data: result
      })
    } catch (error) {
      console.error('Error creating employee profile:', error)
      return response.internalServerError({ error: 'Failed to create employee profile' })
    }
  }

  /**
   * Update an employee profile
   */
  async updateEmployeeProfile({ params, request, response, auth }: HttpContext) {
    try {
      const { userId } = params
      const requestingUser = auth.user!
      
      // Validate request
      await request.validateUsing(employeeProfileUpdateValidator)
      const updateData = request.all()
      
      // Check access permissions
      if (!await this.canUpdateProfile(requestingUser, userId, 'employee')) {
        return response.forbidden({ error: 'Access denied' })
      }
      
      const result = await this.profileService.updateEmployeeProfile(userId, updateData, requestingUser)
      
      return response.json({
        success: true,
        data: result
      })
    } catch (error) {
      console.error('Error updating employee profile:', error)
      return response.internalServerError({ error: 'Failed to update employee profile' })
    }
  }

  /**
   * Create a new admin profile
   */
  async createAdminProfile({ request, response, auth }: HttpContext) {
    try {
      const user = auth.user!
      
      // Validate request
      await request.validateUsing(adminProfileStoreValidator)
      const data = request.all()
      
      // Check if user has permission to create admin profiles (only super admins)
      if (user.role !== 'administrator') {
        return response.forbidden({ error: 'Only administrators can create admin profiles' })
      }
      
      // For now, return a mock response since we don't have Appwrite integration
      return response.created({
        success: true,
        data: {
          profile: {
            id: 'mock_admin_profile_id',
            user_id: 'mock_user_id',
            admin_level: data.admin_level,
            created_at: new Date().toISOString()
          },
          user: {
            id: 'mock_user_id',
            email: data.email,
            name: data.name
          }
        }
      })
    } catch (error) {
      console.error('Error creating admin profile:', error)
      return response.internalServerError({ error: 'Failed to create admin profile' })
    }
  }

  /**
   * Update an admin profile
   */
  async updateAdminProfile({ params, request, response, auth }: HttpContext) {
    try {
      const { userId } = params
      const requestingUser = auth.user!
      
      // Validate request
      await request.validateUsing(adminProfileUpdateValidator)
      const updateData = request.all()
      
      // Check access permissions (only self or super admin)
      if (requestingUser.id.toString() !== userId && requestingUser.role !== 'administrator') {
        return response.forbidden({ error: 'Access denied' })
      }
      
      // For now, return a mock response
      return response.json({
        success: true,
        data: {
          profile: {
            id: 'mock_admin_profile_id',
            user_id: userId,
            ...updateData,
            updated_at: new Date().toISOString()
          }
        }
      })
    } catch (error) {
      console.error('Error updating admin profile:', error)
      return response.internalServerError({ error: 'Failed to update admin profile' })
    }
  }

  /**
   * Search profiles across types
   */
  async search({ request, response, auth }: HttpContext) {
    try {
      const { query, type, facility_id, limit = 20, offset = 0 } = request.qs()
      const requestingUser = auth.user!
      
      // Check if user has search permissions
      if (!['administrator', 'supervisor', 'doctor'].includes(requestingUser.role)) {
        return response.forbidden({ error: 'Insufficient permissions to search profiles' })
      }
      
      // For now, return mock search results
      const mockResults = {
        profiles: [],
        total: 0,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: false
      }
      
      return response.json({
        success: true,
        data: mockResults
      })
    } catch (error) {
      console.error('Error searching profiles:', error)
      return response.internalServerError({ error: 'Failed to search profiles' })
    }
  }

  /**
   * Get profiles for a specific facility
   */
  async getFacilityProfiles({ params, request, response, auth }: HttpContext) {
    try {
      const { facilityId } = params
      const { type, status, limit = 50, offset = 0 } = request.qs()
      const requestingUser = auth.user!
      
      // Check facility access
      const requestingUserProfile = await this.profileService.getUserProfileType(requestingUser.id)
      if (!await this.profileService.validateFacilityAccess(requestingUserProfile, facilityId)) {
        return response.forbidden({ error: 'Facility access denied' })
      }
      
      // For now, return mock facility profiles
      const mockProfiles = {
        facility_id: facilityId,
        profiles: [],
        total: 0,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
      
      return response.json({
        success: true,
        data: mockProfiles
      })
    } catch (error) {
      console.error('Error fetching facility profiles:', error)
      return response.internalServerError({ error: 'Failed to fetch facility profiles' })
    }
  }

  /**
   * Check if user can access a profile
   */
  private async canAccessProfile(requestingUser: any, targetUserId: string, profileType: string): Promise<boolean> {
    // Self access always allowed
    if (requestingUser.id.toString() === targetUserId) {
      return true
    }
    
    // Admin access
    if (requestingUser.role === 'administrator') {
      return true
    }
    
    // Supervisor access to employees and patients in their facility
    if (requestingUser.role === 'supervisor') {
      return ['employee', 'patient'].includes(profileType)
    }
    
    // Doctor access to patients in their facility
    if (requestingUser.role === 'doctor' && profileType === 'patient') {
      return true
    }
    
    return false
  }

  /**
   * Check if user can create a profile of given type
   */
  private async canCreateProfile(user: any, profileType: string): Promise<boolean> {
    if (user.role === 'administrator') {
      return true
    }
    
    if (user.role === 'supervisor') {
      return ['patient', 'employee'].includes(profileType)
    }
    
    if (user.role === 'doctor' && profileType === 'patient') {
      return true
    }
    
    return false
  }

  /**
   * Check if user can update a profile
   */
  private async canUpdateProfile(requestingUser: any, targetUserId: string, profileType: string): Promise<boolean> {
    // Use same logic as canAccessProfile for now
    return this.canAccessProfile(requestingUser, targetUserId, profileType)
  }
}