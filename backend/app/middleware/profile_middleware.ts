import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import ProfileService from '#services/profile_service'
import type { ProfileType } from '../types/profile_types.js'

/**
 * Profile middleware for Profile-aware authentication and authorization
 */
export default class ProfileMiddleware {
  private profileService = new ProfileService()

  /**
   * Handle request with Profile-aware authentication
   */
  async handle(
    ctx: HttpContext,
    next: NextFn,
    options: {
      requireProfileTypes?: ProfileType[]
      requireFacilityAccess?: boolean
      allowSelfAccess?: boolean
    } = {}
  ) {
    const { requireProfileTypes, requireFacilityAccess, allowSelfAccess = true } = options
    
    // Ensure user is authenticated
    if (!ctx.auth.user) {
      return ctx.response.unauthorized({ error: 'Authentication required' })
    }

    const user = ctx.auth.user
    
    try {
      // Get user profile information
      const userProfile = await this.profileService.getUserProfileType(user.id)
      
      // Attach profile information to context for use in controllers
      ctx.userProfile = userProfile
      
      // Check if specific profile types are required
      if (requireProfileTypes && requireProfileTypes.length > 0) {
        if (!requireProfileTypes.includes(userProfile.type)) {
          return ctx.response.forbidden({ 
            error: `Access denied. Required profile types: ${requireProfileTypes.join(', ')}` 
          })
        }
      }
      
      // Check facility access if required
      if (requireFacilityAccess) {
        const facilityId = ctx.params.facilityId || ctx.request.input('facility_id')
        if (facilityId) {
          const hasAccess = await this.profileService.validateFacilityAccess(userProfile, facilityId)
          if (!hasAccess) {
            return ctx.response.forbidden({ error: 'Facility access denied' })
          }
        }
      }
      
      // Check self-access for user-specific operations
      if (allowSelfAccess && ctx.params.userId) {
        const targetUserId = ctx.params.userId
        const isSelfAccess = user.id.toString() === targetUserId
        const isAdmin = userProfile.type === 'admin' || user.role === 'administrator'
        const isSupervisor = userProfile.type === 'employee' || user.role === 'supervisor'
        
        if (!isSelfAccess && !isAdmin && !isSupervisor) {
          return ctx.response.forbidden({ error: 'Access denied' })
        }
      }
      
      return next()
    } catch (error) {
      console.error('Profile middleware error:', error)
      return ctx.response.internalServerError({ error: 'Profile validation failed' })
    }
  }

  /**
   * Require specific profile types
   */
  static requireProfileTypes(profileTypes: ProfileType[]) {
    return (ctx: HttpContext, next: NextFn) => {
      const middleware = new ProfileMiddleware()
      return middleware.handle(ctx, next, { requireProfileTypes: profileTypes })
    }
  }

  /**
   * Require facility access validation
   */
  static requireFacilityAccess() {
    return (ctx: HttpContext, next: NextFn) => {
      const middleware = new ProfileMiddleware()
      return middleware.handle(ctx, next, { requireFacilityAccess: true })
    }
  }

  /**
   * Require admin profile
   */
  static requireAdmin() {
    return (ctx: HttpContext, next: NextFn) => {
      const middleware = new ProfileMiddleware()
      return middleware.handle(ctx, next, { requireProfileTypes: ['admin'] })
    }
  }

  /**
   * Require employee profile
   */
  static requireEmployee() {
    return (ctx: HttpContext, next: NextFn) => {
      const middleware = new ProfileMiddleware()
      return middleware.handle(ctx, next, { requireProfileTypes: ['employee'] })
    }
  }

  /**
   * Require patient profile
   */
  static requirePatient() {
    return (ctx: HttpContext, next: NextFn) => {
      const middleware = new ProfileMiddleware()
      return middleware.handle(ctx, next, { requireProfileTypes: ['patient'] })
    }
  }

  /**
   * Allow admin or employee profiles
   */
  static requireStaff() {
    return (ctx: HttpContext, next: NextFn) => {
      const middleware = new ProfileMiddleware()
      return middleware.handle(ctx, next, { requireProfileTypes: ['admin', 'employee'] })
    }
  }

  /**
   * Enhanced role-based access with Profile awareness
   */
  static requireRole(roles: string[]) {
    return async (ctx: HttpContext, next: NextFn) => {
      if (!ctx.auth.user) {
        return ctx.response.unauthorized({ error: 'Authentication required' })
      }

      const user = ctx.auth.user
      const middleware = new ProfileMiddleware()
      
      try {
        // Get user profile for enhanced role checking
        const userProfile = await middleware.profileService.getUserProfileType(user.id)
        ctx.userProfile = userProfile
        
        // Check traditional role
        const hasTraditionalRole = roles.includes(user.role)
        
        // Check profile-based role
        let hasProfileRole = false
        if (userProfile.type === 'admin') {
          hasProfileRole = roles.includes('administrator') || roles.includes('admin')
        } else if (userProfile.type === 'employee' && userProfile.profile) {
          const employeeProfile = userProfile.profile as any
          hasProfileRole = roles.includes(employeeProfile.employee_type) || 
                          roles.includes('employee') || 
                          roles.includes('staff')
        } else if (userProfile.type === 'patient') {
          hasProfileRole = roles.includes('patient')
        }
        
        if (!hasTraditionalRole && !hasProfileRole) {
          return ctx.response.forbidden({ 
            error: `Access denied. Required roles: ${roles.join(', ')}` 
          })
        }
        
        return next()
      } catch (error) {
        console.error('Enhanced role check error:', error)
        return ctx.response.internalServerError({ error: 'Role validation failed' })
      }
    }
  }

  /**
   * Validate professional credentials for medical operations
   */
  static requireValidCredentials() {
    return async (ctx: HttpContext, next: NextFn) => {
      if (!ctx.userProfile) {
        const middleware = new ProfileMiddleware()
        const userProfile = await middleware.profileService.getUserProfileType(ctx.auth.user!.id)
        ctx.userProfile = userProfile
      }
      
      if (ctx.userProfile.type === 'employee' && ctx.userProfile.profile) {
        const employeeProfile = ctx.userProfile.profile as any
        const credentialCheck = await new ProfileMiddleware().profileService
          .validateProfessionalCredentials(employeeProfile)
        
        if (!credentialCheck.valid) {
          return ctx.response.forbidden({ 
            error: credentialCheck.message,
            code: 'INVALID_CREDENTIALS'
          })
        }
        
        // Add warning to context if license expires soon
        if (credentialCheck.warning) {
          ctx.credentialWarning = credentialCheck.message
        }
      }
      
      return next()
    }
  }
}

// Extend HttpContext type to include userProfile
declare module '@adonisjs/core/http' {
  interface HttpContext {
    userProfile?: any
    credentialWarning?: string
  }
}