# SMS-00: OAuth Token Management

## Context
The Orange Network SMS API requires OAuth 2.0 authentication using the client credentials flow. This foundational task implements secure token generation, caching, refresh, and lifecycle management to enable all SMS operations. The OAuth token management system ensures proper authentication for all API requests while maintaining security best practices and healthcare compliance requirements.

## Dependencies
- None (foundation task)

## Requirements

### 1. OAuth 2.0 Client Credentials Flow
Implement the complete OAuth 2.0 client credentials flow for Orange Network API authentication, including token generation, validation, and error handling.

### 2. Access Token Generation and Caching
Create a robust token generation system with intelligent caching to minimize API calls and improve performance while ensuring token validity.

### 3. Token Refresh and Lifecycle Management
Implement automatic token refresh logic with proper lifecycle management, including expiration handling and proactive renewal.

### 4. Secure Credential Storage
Ensure secure storage and handling of client credentials with proper environment variable management and encryption where necessary.

### 5. Healthcare Compliance Integration
Implement audit logging and security measures that comply with healthcare data protection regulations and HIPAA requirements.

## Code Examples

### OAuth Token Service

```typescript
// backend/app/services/oauth_token_service.ts
import { DateTime } from 'luxon'
import axios, { AxiosInstance } from 'axios'
import Logger from '@adonisjs/core/logger'
import env from '#start/env'

export interface TokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  scope?: string
}

export interface TokenInfo {
  accessToken: string
  tokenType: string
  expiresAt: DateTime
  scope?: string
}

export interface TokenServiceConfig {
  clientId: string
  clientSecret: string
  tokenEndpoint: string
  scope?: string
  cacheEnabled: boolean
  refreshThresholdMinutes: number
}

export default class OAuthTokenService {
  private client: AxiosInstance
  private config: TokenServiceConfig
  private cachedToken: TokenInfo | null = null
  private refreshPromise: Promise<TokenInfo> | null = null

  constructor() {
    this.config = this.loadConfig()
    this.client = this.createHttpClient()
  }

  /**
   * Get valid access token (from cache or generate new)
   */
  public async getAccessToken(): Promise<string> {
    try {
      // Check if we have a valid cached token
      if (this.isTokenValid()) {
        Logger.debug('Using cached OAuth token')
        return this.cachedToken!.accessToken
      }

      // Check if token needs refresh
      if (this.shouldRefreshToken()) {
        Logger.info('OAuth token needs refresh')
        await this.refreshToken()
        return this.cachedToken!.accessToken
      }

      // Generate new token
      Logger.info('Generating new OAuth token')
      const tokenInfo = await this.generateToken()
      this.cacheToken(tokenInfo)
      
      return tokenInfo.accessToken

    } catch (error) {
      Logger.error('Failed to get OAuth access token:', error)
      throw new Error(`OAuth token generation failed: ${error.message}`)
    }
  }

  /**
   * Generate new OAuth token using client credentials flow
   */
  public async generateToken(): Promise<TokenInfo> {
    try {
      const credentials = Buffer.from(
        `${this.config.clientId}:${this.config.clientSecret}`
      ).toString('base64')

      const requestData = new URLSearchParams({
        grant_type: 'client_credentials'
      })

      if (this.config.scope) {
        requestData.append('scope', this.config.scope)
      }

      Logger.debug(`Requesting OAuth token from: ${this.config.tokenEndpoint}`)

      const response = await this.client.post(this.config.tokenEndpoint, requestData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${credentials}`,
          'Accept': 'application/json'
        },
        timeout: 30000 // 30 second timeout
      })

      const tokenResponse: TokenResponse = response.data

      if (!tokenResponse.access_token) {
        throw new Error('Invalid token response: missing access_token')
      }

      const tokenInfo: TokenInfo = {
        accessToken: tokenResponse.access_token,
        tokenType: tokenResponse.token_type || 'Bearer',
        expiresAt: DateTime.now().plus({ seconds: tokenResponse.expires_in }),
        scope: tokenResponse.scope
      }

      Logger.info(`OAuth token generated successfully, expires at: ${tokenInfo.expiresAt.toISO()}`)
      
      // Log for audit trail (without sensitive data)
      this.logTokenEvent('TOKEN_GENERATED', {
        expiresAt: tokenInfo.expiresAt.toISO(),
        scope: tokenInfo.scope,
        tokenType: tokenInfo.tokenType
      })

      return tokenInfo

    } catch (error) {
      Logger.error('OAuth token generation failed:', error)
      
      // Log security event
      this.logTokenEvent('TOKEN_GENERATION_FAILED', {
        error: error.message,
        endpoint: this.config.tokenEndpoint
      })

      if (error.response?.data) {
        const errorData = error.response.data
        throw new Error(`OAuth error: ${errorData.error_description || errorData.error || 'Unknown error'}`)
      }

      throw error
    }
  }

  /**
   * Refresh the current token
   */
  public async refreshToken(): Promise<void> {
    // Prevent multiple concurrent refresh attempts
    if (this.refreshPromise) {
      Logger.debug('Token refresh already in progress, waiting...')
      await this.refreshPromise
      return
    }

    this.refreshPromise = this.generateToken()

    try {
      const tokenInfo = await this.refreshPromise
      this.cacheToken(tokenInfo)
      Logger.info('OAuth token refreshed successfully')
    } catch (error) {
      Logger.error('OAuth token refresh failed:', error)
      throw error
    } finally {
      this.refreshPromise = null
    }
  }

  /**
   * Check if current token is valid
   */
  public isTokenValid(): boolean {
    if (!this.cachedToken) {
      return false
    }

    const now = DateTime.now()
    const bufferMinutes = 5 // 5-minute buffer before expiration

    return this.cachedToken.expiresAt.minus({ minutes: bufferMinutes }) > now
  }

  /**
   * Check if token should be refreshed proactively
   */
  public shouldRefreshToken(): boolean {
    if (!this.cachedToken) {
      return false
    }

    const now = DateTime.now()
    const refreshThreshold = this.cachedToken.expiresAt.minus({ 
      minutes: this.config.refreshThresholdMinutes 
    })

    return now >= refreshThreshold
  }

  /**
   * Clear cached token (force regeneration on next request)
   */
  public clearToken(): void {
    if (this.cachedToken) {
      Logger.info('Clearing cached OAuth token')
      this.logTokenEvent('TOKEN_CLEARED', {
        previousExpiresAt: this.cachedToken.expiresAt.toISO()
      })
    }
    
    this.cachedToken = null
  }

  /**
   * Get token information (without sensitive data)
   */
  public getTokenInfo(): { 
    isValid: boolean
    expiresAt?: string
    tokenType?: string
    scope?: string
  } {
    if (!this.cachedToken) {
      return { isValid: false }
    }

    return {
      isValid: this.isTokenValid(),
      expiresAt: this.cachedToken.expiresAt.toISO(),
      tokenType: this.cachedToken.tokenType,
      scope: this.cachedToken.scope
    }
  }

  /**
   * Health check for OAuth service
   */
  public async healthCheck(): Promise<{ healthy: boolean; message: string; details?: any }> {
    try {
      // Test token generation
      const startTime = DateTime.now()
      await this.getAccessToken()
      const duration = DateTime.now().diff(startTime).as('milliseconds')

      return {
        healthy: true,
        message: 'OAuth token service is healthy',
        details: {
          tokenValid: this.isTokenValid(),
          responseTime: `${duration}ms`,
          expiresAt: this.cachedToken?.expiresAt.toISO()
        }
      }
    } catch (error) {
      return {
        healthy: false,
        message: `OAuth token service health check failed: ${error.message}`,
        details: {
          error: error.message,
          tokenValid: this.isTokenValid()
        }
      }
    }
  }

  /**
   * Cache token information
   */
  private cacheToken(tokenInfo: TokenInfo): void {
    if (this.config.cacheEnabled) {
      this.cachedToken = tokenInfo
      Logger.debug(`OAuth token cached, expires at: ${tokenInfo.expiresAt.toISO()}`)
    }
  }

  /**
   * Create HTTP client for OAuth requests
   */
  private createHttpClient(): AxiosInstance {
    const client = axios.create({
      timeout: 30000,
      headers: {
        'User-Agent': 'ImmuneMe-OAuth/1.0',
        'Accept': 'application/json'
      }
    })

    // Request interceptor for logging
    client.interceptors.request.use(
      (config) => {
        Logger.debug(`OAuth Request: ${config.method?.toUpperCase()} ${config.url}`)
        return config
      },
      (error) => {
        Logger.error('OAuth Request Error:', error)
        return Promise.reject(error)
      }
    )

    // Response interceptor for logging
    client.interceptors.response.use(
      (response) => {
        Logger.debug(`OAuth Response: ${response.status} ${response.statusText}`)
        return response
      },
      (error) => {
        Logger.error(`OAuth Error: ${error.response?.status} ${error.response?.statusText}`)
        if (error.response?.data) {
          Logger.error('OAuth Error Details:', error.response.data)
        }
        return Promise.reject(error)
      }
    )

    return client
  }

  /**
   * Load configuration from environment
   */
  private loadConfig(): TokenServiceConfig {
    const requiredEnvVars = [
      'ORANGE_CLIENT_ID',
      'ORANGE_CLIENT_SECRET',
      'ORANGE_TOKEN_ENDPOINT'
    ]

    for (const envVar of requiredEnvVars) {
      if (!env.get(envVar)) {
        throw new Error(`Missing required environment variable: ${envVar}`)
      }
    }

    return {
      clientId: env.get('ORANGE_CLIENT_ID')!,
      clientSecret: env.get('ORANGE_CLIENT_SECRET')!,
      tokenEndpoint: env.get('ORANGE_TOKEN_ENDPOINT', 'https://api.orange.com/oauth/v3/token')!,
      scope: env.get('ORANGE_OAUTH_SCOPE'),
      cacheEnabled: env.get('OAUTH_CACHE_ENABLED', true),
      refreshThresholdMinutes: env.get('OAUTH_REFRESH_THRESHOLD_MINUTES', 10)
    }
  }

  /**
   * Log token-related events for audit trail
   */
  private logTokenEvent(event: string, details: Record<string, any>): void {
    Logger.info(`OAuth Event: ${event}`, {
      event,
      timestamp: DateTime.now().toISO(),
      service: 'OAuthTokenService',
      ...details
    })
  }
}
```

### Orange Auth Service (AdonisJS Integration)

```typescript
// backend/app/services/orange_auth_service.ts
import { DateTime } from 'luxon'
import OAuthTokenService from './oauth_token_service.js'
import Logger from '@adonisjs/core/logger'

export interface AuthenticatedRequest {
  headers: Record<string, string>
  url: string
  method: string
}

export default class OrangeAuthService {
  private tokenService: OAuthTokenService

  constructor() {
    this.tokenService = new OAuthTokenService()
  }

  /**
   * Get authenticated headers for Orange Network API requests
   */
  public async getAuthenticatedHeaders(): Promise<Record<string, string>> {
    try {
      const accessToken = await this.tokenService.getAccessToken()
      
      return {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    } catch (error) {
      Logger.error('Failed to get authenticated headers:', error)
      throw new Error(`Authentication failed: ${error.message}`)
    }
  }

  /**
   * Prepare authenticated request configuration
   */
  public async prepareAuthenticatedRequest(
    url: string, 
    method: string = 'GET',
    additionalHeaders: Record<string, string> = {}
  ): Promise<AuthenticatedRequest> {
    const authHeaders = await this.getAuthenticatedHeaders()
    
    return {
      url,
      method: method.toUpperCase(),
      headers: {
        ...authHeaders,
        ...additionalHeaders
      }
    }
  }

  /**
   * Handle authentication errors and retry logic
   */
  public async handleAuthError(error: any, retryCallback: () => Promise<any>): Promise<any> {
    if (this.isAuthenticationError(error)) {
      Logger.warn('Authentication error detected, clearing token and retrying')
      
      // Clear cached token to force regeneration
      this.tokenService.clearToken()
      
      try {
        // Retry the original request with new token
        return await retryCallback()
      } catch (retryError) {
        Logger.error('Retry after authentication error failed:', retryError)
        throw retryError
      }
    }
    
    throw error
  }

  /**
   * Check if error is authentication-related
   */
  private isAuthenticationError(error: any): boolean {
    if (!error.response) return false
    
    const status = error.response.status
    const errorData = error.response.data
    
    // Check for common authentication error indicators
    return (
      status === 401 || 
      status === 403 ||
      (errorData?.error === 'invalid_token') ||
      (errorData?.error === 'expired_token') ||
      (errorData?.requestError?.serviceException?.messageId === 'SVC0001')
    )
  }

  /**
   * Get authentication service status
   */
  public async getStatus(): Promise<{
    authenticated: boolean
    tokenInfo: any
    healthCheck: any
  }> {
    const tokenInfo = this.tokenService.getTokenInfo()
    const healthCheck = await this.tokenService.healthCheck()
    
    return {
      authenticated: tokenInfo.isValid,
      tokenInfo,
      healthCheck
    }
  }

  /**
   * Force token refresh
   */
  public async forceTokenRefresh(): Promise<void> {
    Logger.info('Forcing OAuth token refresh')
    this.tokenService.clearToken()
    await this.tokenService.getAccessToken()
  }
}
```

### Environment Configuration

```bash
# backend/.env.example (OAuth section)

# Orange Network OAuth 2.0 Configuration
ORANGE_CLIENT_ID=your_client_id_here
ORANGE_CLIENT_SECRET=your_client_secret_here
ORANGE_API_BASE_URL=https://api.orange.com
ORANGE_TOKEN_ENDPOINT=https://api.orange.com/oauth/v3/token
ORANGE_SMS_ENDPOINT=/smsmessaging/v1/outbound
ORANGE_OAUTH_SCOPE=

# OAuth Token Management
OAUTH_CACHE_ENABLED=true
OAUTH_REFRESH_THRESHOLD_MINUTES=10

# SMS Configuration (depends on OAuth)
SMS_ENABLED=true
SMS_SANDBOX_MODE=false
ORANGE_SMS_SENDER_ADDRESS=your_sender_address
ORANGE_SMS_WEBHOOK_BASE_URL=https://your-domain.com
```

### OAuth Middleware for API Protection

```typescript
// backend/app/middleware/oauth_middleware.ts
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import OrangeAuthService from '#services/orange_auth_service'
import Logger from '@adonisjs/core/logger'

export default class OAuthMiddleware {
  private authService: OrangeAuthService

  constructor() {
    this.authService = new OrangeAuthService()
  }

  async handle(ctx: HttpContext, next: NextFn) {
    try {
      // Check if OAuth is required for this route
      if (this.requiresOAuth(ctx.request.url())) {
        const status = await this.authService.getStatus()
        
        if (!status.authenticated) {
          Logger.warn(`OAuth authentication required but not available for: ${ctx.request.url()}`)
          return ctx.response.status(503).json({
            error: 'SMS service temporarily unavailable',
            message: 'OAuth authentication is not available'
          })
        }
      }

      await next()
    } catch (error) {
      Logger.error('OAuth middleware error:', error)
      return ctx.response.status(500).json({
        error: 'Authentication service error',
        message: 'Unable to verify SMS service authentication'
      })
    }
  }

  private requiresOAuth(url: string): boolean {
    const oauthRequiredPaths = [
      '/api/sms/',
      '/api/notifications/sms'
    ]
    
    return oauthRequiredPaths.some(path => url.includes(path))
  }
}
```

### OAuth Health Check Controller

```typescript
// backend/app/controllers/oauth_health_controller.ts
import type { HttpContext } from '@adonisjs/core/http'
import OrangeAuthService from '#services/orange_auth_service'

export default class OAuthHealthController {
  private authService: OrangeAuthService

  constructor() {
    this.authService = new OrangeAuthService()
  }

  /**
   * Get OAuth service health status
   */
  public async status({ response }: HttpContext) {
    try {
      const status = await this.authService.getStatus()
      
      return response.json({
        service: 'OAuth Token Management',
        status: status.authenticated ? 'healthy' : 'unhealthy',
        details: status
      })
    } catch (error) {
      return response.status(500).json({
        service: 'OAuth Token Management',
        status: 'error',
        error: error.message
      })
    }
  }

  /**
   * Force token refresh (admin only)
   */
  public async refresh({ response }: HttpContext) {
    try {
      await this.authService.forceTokenRefresh()
      
      return response.json({
        message: 'OAuth token refreshed successfully',
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      return response.status(500).json({
        error: 'Token refresh failed',
        message: error.message
      })
    }
  }
}
```

## Acceptance Criteria

1. **OAuth 2.0 Flow**: Successfully implements client credentials flow with Orange Network API
2. **Token Generation**: Generates valid access tokens with proper error handling
3. **Token Caching**: Efficiently caches tokens to minimize API calls
4. **Token Refresh**: Automatically refreshes tokens before expiration
5. **Secure Storage**: Securely manages client credentials via environment variables
6. **Error Handling**: Comprehensive error handling for all authentication scenarios
7. **Health Checks**: Provides health check endpoints for monitoring
8. **Audit Logging**: Logs all authentication events for compliance
9. **Integration Ready**: Provides clean interfaces for SMS service integration
10. **Testing Support**: Includes mock capabilities for development and testing

## Implementation Notes

### Security Best Practices
- Store client credentials in environment variables only
- Never log sensitive authentication data (tokens, secrets)
- Implement proper token lifecycle management
- Use secure HTTP client configuration
- Audit log all authentication events

### Performance Optimization
- Cache tokens to minimize API calls
- Implement proactive token refresh
- Use connection pooling for HTTP requests
- Optimize retry logic and timeouts
- Monitor token generation performance

### Healthcare Compliance
- Maintain complete audit trails for all authentication events
- Implement secure credential storage practices
- Log security-relevant events for compliance monitoring
- Ensure proper access controls and authorization
- Support data retention and deletion policies

### Error Handling Strategy
- Distinguish between different types of authentication errors
- Implement intelligent retry logic with exponential backoff
- Provide meaningful error messages for debugging
- Handle network failures and timeouts gracefully
- Log all errors with sufficient context for troubleshooting

### Monitoring and Observability
- Track token generation and refresh metrics
- Monitor authentication success/failure rates
- Alert on authentication service degradation
- Provide health check endpoints for service monitoring
- Log performance metrics for optimization

## Testing Requirements

### Unit Testing
- Test OAuth token generation with various scenarios
- Mock HTTP client for isolated testing
- Test token caching and refresh logic
- Validate error handling for different failure modes
- Test configuration loading and validation

### Integration Testing
- Test against Orange Network OAuth endpoint
- Verify token lifecycle management
- Test authentication error handling and recovery
- Validate health check functionality
- Test middleware integration

### Security Testing
- Validate secure credential handling
- Test for token leakage in logs
- Verify proper error message sanitization
- Test authentication bypass scenarios
- Validate audit logging completeness

### Performance Testing
- Test token generation under load
- Validate caching performance
- Test concurrent token requests
- Measure authentication latency
- Test memory usage and cleanup

## Related Documentation

- **SMS Service Layer**: [`SMS-02-sms-service-layer.md`](SMS-02-sms-service-layer.md)
- **Orange Network API**: [`SMS-03-orange-network-api.md`](SMS-03-orange-network-api.md)
- **API Specifications**: [`01-api-specifications.md`](01-api-specifications.md)
- **Integration Requirements**: [`02-integration-requirements.md`](02-integration-requirements.md)
- **Healthcare Compliance**: [`05-healthcare-compliance.md`](05-healthcare-compliance.md)