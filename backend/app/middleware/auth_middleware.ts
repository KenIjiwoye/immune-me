import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import type { Authenticators } from '@adonisjs/auth/types'
import ProfileService from '#services/profile_service'

/**
 * Auth middleware is used to authenticate HTTP requests and deny
 * access to unauthenticated users. It also supports role-based access control
 * with Profile awareness.
 */
export default class AuthMiddleware {
  private profileService = new ProfileService()

  /**
   * Handle request with enhanced Profile-aware authentication
   */
  async handle(
    ctx: HttpContext,
    next: NextFn,
    options: {
      guards?: (keyof Authenticators)[]
      roles?: string[]
      profileAware?: boolean
      requireValidCredentials?: boolean
    } = {}
  ) {
    // Authenticate user using the specified guards or the default guard
    await ctx.auth.authenticateUsing(options.guards)
    
    const user = ctx.auth.user!
    
    // If Profile-aware authentication is enabled, get profile information
    if (options.profileAware) {
      try {
        const userProfile = await this.profileService.getUserProfileType(user.id)
        ctx.userProfile = userProfile
        
        // Validate professional credentials if required
        if (options.requireValidCredentials && userProfile.type === 'employee' && userProfile.profile) {
          const employeeProfile = userProfile.profile as any
          const credentialCheck = await this.profileService.validateProfessionalCredentials(employeeProfile)
          
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
      } catch (error) {
        console.error('Profile-aware authentication error:', error)
        // Continue with traditional authentication if profile loading fails
      }
    }
    
    // If roles are specified, check if user has required role
    if (options.roles && options.roles.length > 0) {
      let hasAccess = false
      
      // Check traditional role
      if (options.roles.includes(user.role)) {
        hasAccess = true
      }
      
      // Check Profile-based role if Profile-aware authentication is enabled
      if (!hasAccess && options.profileAware && ctx.userProfile) {
        const userProfile = ctx.userProfile
        
        if (userProfile.type === 'admin') {
          hasAccess = options.roles.includes('administrator') || options.roles.includes('admin')
        } else if (userProfile.type === 'employee' && userProfile.profile) {
          const employeeProfile = userProfile.profile as any
          hasAccess = options.roles.includes(employeeProfile.employee_type) ||
                     options.roles.includes('employee') ||
                     options.roles.includes('staff')
        } else if (userProfile.type === 'patient') {
          hasAccess = options.roles.includes('patient')
        }
      }
      
      if (!hasAccess) {
        return ctx.response.forbidden({
          error: 'Unauthorized access: insufficient permissions',
          required_roles: options.roles
        })
      }
    }
    
    // Call next middleware
    return next()
  }

  /**
   * Static method for Profile-aware authentication
   */
  static profileAware(options: {
    guards?: (keyof Authenticators)[]
    roles?: string[]
    requireValidCredentials?: boolean
  } = {}) {
    return (ctx: HttpContext, next: NextFn) => {
      const middleware = new AuthMiddleware()
      return middleware.handle(ctx, next, { ...options, profileAware: true })
    }
  }

  /**
   * Static method for traditional authentication (backward compatibility)
   */
  static traditional(options: {
    guards?: (keyof Authenticators)[]
    roles?: string[]
  } = {}) {
    return (ctx: HttpContext, next: NextFn) => {
      const middleware = new AuthMiddleware()
      return middleware.handle(ctx, next, { ...options, profileAware: false })
    }
  }

  /**
   * Static method for medical operations requiring valid credentials
   */
  static medicalOperation(options: {
    guards?: (keyof Authenticators)[]
    roles?: string[]
  } = {}) {
    return (ctx: HttpContext, next: NextFn) => {
      const middleware = new AuthMiddleware()
      return middleware.handle(ctx, next, {
        ...options,
        profileAware: true,
        requireValidCredentials: true
      })
    }
  }
}

// Extend HttpContext type to include userProfile and credentialWarning
declare module '@adonisjs/core/http' {
  interface HttpContext {
    userProfile?: any
    credentialWarning?: string
  }
}