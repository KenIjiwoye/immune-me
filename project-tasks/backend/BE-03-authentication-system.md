# BE-03: Implement JWT Authentication System

## Context
The Immunization Records Management System requires a secure authentication system with role-based access control. AdonisJS v6 provides built-in authentication support that we'll configure to use JWT tokens.

## Dependencies
- BE-01: Database configuration completed
- User model and migration already exist

## Requirements
1. Configure JWT authentication in AdonisJS
2. Implement login endpoint
3. Implement refresh token mechanism
4. Set up role-based access control
5. Create auth middleware for protected routes

## Code Example

### Auth Configuration

```typescript
// backend/config/auth.ts
import { defineConfig } from '@adonisjs/auth'
import { InferAuthEvents, Authenticators } from '@adonisjs/auth/types'

const authConfig = defineConfig({
  default: 'api',
  guards: {
    api: {
      driver: 'jwt',
      tokenProvider: {
        type: 'api',
        driver: 'database',
        table: 'access_tokens',
        foreignKey: 'user_id',
      },
      provider: {
        driver: 'lucid',
        identifierKey: 'id',
        uids: ['email', 'username'],
        model: () => import('#models/user'),
      },
    },
  },
})

export default authConfig

declare module '@adonisjs/auth/types' {
  interface Authenticators extends InferAuthenticators<typeof authConfig> {}
  interface AuthEvents extends InferAuthEvents<Authenticators> {}
}
```

### Auth Controller

```typescript
// backend/app/controllers/auth_controller.ts
import { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'
import Hash from '@adonisjs/core/hash'

export default class AuthController {
  /**
   * Handle user login
   */
  async login({ request, response, auth }: HttpContext) {
    const { email, password } = request.only(['email', 'password'])
    
    // Find user
    const user = await User.findBy('email', email)
    if (!user) {
      return response.unauthorized('Invalid credentials')
    }
    
    // Verify password
    if (!(await Hash.verify(user.password, password))) {
      return response.unauthorized('Invalid credentials')
    }
    
    // Generate token
    const token = await auth.use('api').generate(user, {
      expiresIn: '1 day'
    })
    
    return response.json({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role
      },
      token
    })
  }

  /**
   * Handle user logout
   */
  async logout({ auth, response }: HttpContext) {
    await auth.use('api').revoke()
    return response.noContent()
  }

  /**
   * Refresh token
   */
  async refreshToken({ auth, response }: HttpContext) {
    const user = auth.user!
    await auth.use('api').revoke()
    const token = await auth.use('api').generate(user)
    
    return response.json({ token })
  }
}
```

### Auth Middleware

```typescript
// backend/app/middleware/auth_middleware.ts
import { HttpContext } from '@adonisjs/core/http'
import { NextFn } from '@adonisjs/core/types/http'
import { AuthenticationException } from '@adonisjs/auth/exceptions'

/**
 * Auth middleware with role-based access control
 */
export default class AuthMiddleware {
  /**
   * Handle request
   */
  async handle(
    ctx: HttpContext,
    next: NextFn,
    options: { roles?: string[] } = {}
  ) {
    /**
     * Authenticate user using the "api" guard
     */
    await ctx.auth.use('api').authenticate()
    
    /**
     * If roles are specified, check if user has required role
     */
    if (options.roles && options.roles.length > 0) {
      const user = ctx.auth.user!
      if (!options.roles.includes(user.role)) {
        throw new AuthenticationException(
          'Unauthorized access',
          { guard: 'api' }
        )
      }
    }
    
    /**
     * Call next middleware
     */
    await next()
  }
}
```

### Routes Configuration

```typescript
// backend/start/routes.ts
import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

// Auth routes
router.post('/api/auth/login', '#controllers/auth_controller.login')
router.post('/api/auth/logout', '#controllers/auth_controller.logout').use(middleware.auth())
router.post('/api/auth/refresh-token', '#controllers/auth_controller.refreshToken').use(middleware.auth())

// Example of role-based route protection
router.get('/api/admin/users', '#controllers/users_controller.index').use(
  middleware.auth({ roles: ['administrator'] })
)
```

## Expected Outcome
- JWT authentication configured and working
- Login, logout, and refresh token endpoints implemented
- Role-based access control working for protected routes
- Auth middleware properly protecting routes based on user roles

## Testing
Test the authentication system with the following commands:

```bash
# Login
curl -X POST http://localhost:3333/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password123"}'

# Access protected route with token
curl -X GET http://localhost:3333/api/admin/users \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# Refresh token
curl -X POST http://localhost:3333/api/auth/refresh-token \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# Logout
curl -X POST http://localhost:3333/api/auth/logout \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
