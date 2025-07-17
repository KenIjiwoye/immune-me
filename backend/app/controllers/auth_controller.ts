import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'

export default class AuthController {
  /**
   * Handle user login
   */
  async login({ request, response, auth }: HttpContext) {
    const { email, password } = request.only(['email', 'password'])
    
    try {
      // Using the new AuthFinder mixin's verifyCredentials method
      const user = await User.verifyCredentials(email, password)
      
      // Generate token
      const token = await auth.use('api').createToken(user)
      
      // Explicitly include the token value in the response
      const tokenValue = token.value?.release ? token.value.release() : token.value
      
      return response.json({
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          facilityId: user.facilityId
        },
        token: tokenValue,
        type: 'bearer'
      })
    } catch (error) {
      return response.unauthorized('Invalid credentials')
    }
  }

  /**
   * Handle user logout
   */
  async logout({ auth, response }: HttpContext) {
    await auth.use('api').invalidateToken()
    return response.noContent()
  }

  /**
   * Refresh token
   */
  async refreshToken({ auth, response }: HttpContext) {
    const user = auth.user!
    await auth.use('api').invalidateToken()
    
    // Generate new token
    const token = await auth.use('api').createToken(user)
    
    // Explicitly include the token value in the response
    const tokenValue = token.value?.release ? token.value.release() : token.value
    
    return response.json({
      token: tokenValue,
      type: 'bearer'
    })
  }
  
  /**
   * Get the authenticated user profile
   */
  async me({ auth, response }: HttpContext) {
    const user = await auth.use('api').authenticate()
    
    return response.ok({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        facilityId: user.facilityId
      }
    })
  }
}