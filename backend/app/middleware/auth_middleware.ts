import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import type { Authenticators } from '@adonisjs/auth/types'

/**
 * Auth middleware is used to authenticate HTTP requests and deny
 * access to unauthenticated users. It also supports role-based access control.
 */
export default class AuthMiddleware {
  /**
   * Handle request
   */
  async handle(
    ctx: HttpContext,
    next: NextFn,
    options: {
      guards?: (keyof Authenticators)[]
      roles?: string[]
    } = {}
  ) {
    // Authenticate user using the specified guards or the default guard
    await ctx.auth.authenticateUsing(options.guards)
    
    // If roles are specified, check if user has required role
    if (options.roles && options.roles.length > 0) {
      const user = ctx.auth.user!
      if (!options.roles.includes(user.role)) {
        return ctx.response.forbidden({
          error: 'Unauthorized access: insufficient permissions'
        })
      }
    }
    
    // Call next middleware
    return next()
  }
}