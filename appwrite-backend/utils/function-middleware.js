/**
 * Enhanced Function Middleware - BE-AW-11 Implementation
 * 
 * This middleware provides comprehensive authentication, authorization, and security
 * controls for Appwrite functions. It integrates with the existing permission system
 * and implements the function permission matrix.
 */

const { Client, Users, Databases } = require('node-appwrite');
const { PermissionValidator } = require('./permission-validator');
const FacilityScopedQueries = require('./facility-scoped-queries');
const TeamPermissionChecker = require('./team-permission-checker');
const RoleManager = require('./role-manager');
const { 
  FUNCTION_PERMISSIONS, 
  FUNCTION_CATEGORIES, 
  EXECUTION_CONDITIONS,
  FUNCTION_SECURITY_POLICIES,
  DEFAULT_RATE_LIMITS 
} = require('../config/function-roles');

class FunctionMiddleware {
  constructor(options = {}) {
    // Initialize Appwrite client
    this.client = new Client()
      .setEndpoint(options.endpoint || process.env.APPWRITE_ENDPOINT)
      .setProject(options.projectId || process.env.APPWRITE_PROJECT_ID)
      .setKey(options.apiKey || process.env.APPWRITE_API_KEY);
    
    this.users = new Users(this.client);
    this.databases = new Databases(this.client);
    
    // Initialize permission utilities
    this.permissionValidator = new PermissionValidator(options);
    this.facilityScopedQueries = new FacilityScopedQueries(options);
    this.teamChecker = new TeamPermissionChecker(options);
    this.roleManager = new RoleManager(options);
    
    // Configuration
    this.config = {
      databaseId: options.databaseId || process.env.APPWRITE_DATABASE_ID,
      enableRateLimit: options.enableRateLimit !== false,
      enableAuditLogging: options.enableAuditLogging !== false,
      enableSecurityLogging: options.enableSecurityLogging !== false,
      strictMode: options.strictMode !== false,
      ...options.config
    };
    
    // Rate limiting storage
    this.rateLimitStore = new Map();
    this.rateLimitCleanupInterval = setInterval(() => {
      this._cleanupRateLimit();
    }, 300000); // Clean up every 5 minutes
    
    // Security event logging
    this.securityEvents = [];
  }

  /**
   * Main middleware function for Appwrite functions
   * @param {Object} context - Function execution context
   * @param {string} functionName - Name of the function being executed
   * @param {string} category - Function category (DATA_SYNC, NOTIFICATIONS, etc.)
   * @returns {Promise<Object>} Middleware result with user context and permissions
   */
  async validateFunctionExecution(context, functionName, category) {
    const startTime = Date.now();
    
    try {
      // 1. Extract and validate authentication
      const authResult = await this._validateAuthentication(context);
      if (!authResult.success) {
        await this._logSecurityEvent('authentication_failed', {
          functionName,
          category,
          reason: authResult.error,
          context: this._sanitizeContext(context)
        });
        return this._createErrorResponse('AUTHENTICATION_FAILED', authResult.error, 401);
      }

      const { userId, user } = authResult;

      // 2. Get user role and facility information
      const roleInfo = await this.roleManager.getUserRoleInfo(userId);
      if (!roleInfo.success) {
        await this._logSecurityEvent('role_determination_failed', {
          userId,
          functionName,
          category,
          reason: roleInfo.error
        });
        return this._createErrorResponse('ROLE_DETERMINATION_FAILED', roleInfo.error, 403);
      }

      // 3. Validate function permissions
      const permissionResult = await this._validateFunctionPermissions(
        roleInfo.role, 
        category, 
        functionName, 
        userId, 
        roleInfo.facilityId
      );
      
      if (!permissionResult.allowed) {
        await this._logSecurityEvent('function_permission_denied', {
          userId,
          role: roleInfo.role,
          functionName,
          category,
          reason: permissionResult.reason,
          facilityId: roleInfo.facilityId
        });
        return this._createErrorResponse('PERMISSION_DENIED', permissionResult.reason, 403);
      }

      // 4. Validate execution conditions
      const conditionResult = await this._validateExecutionConditions(
        permissionResult.conditions,
        userId,
        roleInfo,
        context,
        functionName
      );
      
      if (!conditionResult.valid) {
        await this._logSecurityEvent('execution_condition_failed', {
          userId,
          role: roleInfo.role,
          functionName,
          category,
          condition: conditionResult.failedCondition,
          reason: conditionResult.reason
        });
        return this._createErrorResponse('CONDITION_NOT_MET', conditionResult.reason, 403);
      }

      // 5. Apply rate limiting
      if (this.config.enableRateLimit) {
        const rateLimitResult = await this._checkRateLimit(
          userId,
          roleInfo.role,
          category,
          functionName
        );
        
        if (!rateLimitResult.allowed) {
          await this._logSecurityEvent('rate_limit_exceeded', {
            userId,
            role: roleInfo.role,
            functionName,
            category,
            limit: rateLimitResult.limit,
            current: rateLimitResult.current
          });
          return this._createErrorResponse('RATE_LIMIT_EXCEEDED', rateLimitResult.message, 429);
        }
      }

      // 6. Apply security policies
      const securityResult = await this._applySecurityPolicies(
        category,
        context,
        userId,
        roleInfo
      );
      
      if (!securityResult.valid) {
        await this._logSecurityEvent('security_policy_violation', {
          userId,
          role: roleInfo.role,
          functionName,
          category,
          policy: securityResult.violatedPolicy,
          reason: securityResult.reason
        });
        return this._createErrorResponse('SECURITY_POLICY_VIOLATION', securityResult.reason, 403);
      }

      // 7. Log successful validation
      if (this.config.enableAuditLogging) {
        await this._logAuditEvent('function_execution_authorized', {
          userId,
          role: roleInfo.role,
          functionName,
          category,
          facilityId: roleInfo.facilityId,
          executionTime: Date.now() - startTime
        });
      }

      // 8. Return success with enhanced context
      return this._createSuccessResponse({
        userId,
        user,
        role: roleInfo.role,
        facilityId: roleInfo.facilityId,
        permissions: permissionResult.permissions,
        rateLimit: this.config.enableRateLimit ? {
          remaining: rateLimitResult.remaining,
          resetTime: rateLimitResult.resetTime
        } : null,
        securityContext: securityResult.context,
        executionTime: Date.now() - startTime
      });

    } catch (error) {
      console.error('Function middleware error:', error);
      
      await this._logSecurityEvent('middleware_error', {
        functionName,
        category,
        error: error.message,
        stack: error.stack
      });
      
      return this._createErrorResponse('MIDDLEWARE_ERROR', 'Internal security validation error', 500);
    }
  }

  /**
   * Validate user authentication
   * @private
   */
  async _validateAuthentication(context) {
    try {
      // Extract user ID from context (Appwrite provides this in req.variables)
      const userId = context.req?.variables?.APPWRITE_FUNCTION_USER_ID;
      
      if (!userId) {
        return {
          success: false,
          error: 'No authenticated user found'
        };
      }

      // Get user details
      const user = await this.users.get(userId);
      
      if (!user) {
        return {
          success: false,
          error: 'User not found'
        };
      }

      // Check if user account is active
      if (!user.status) {
        return {
          success: false,
          error: 'User account is inactive'
        };
      }

      return {
        success: true,
        userId,
        user
      };

    } catch (error) {
      console.error('Authentication validation error:', error);
      return {
        success: false,
        error: `Authentication validation failed: ${error.message}`
      };
    }
  }

  /**
   * Validate function permissions based on role and function
   * @private
   */
  async _validateFunctionPermissions(role, category, functionName, userId, facilityId) {
    try {
      // Get role permissions for the category
      const rolePermissions = FUNCTION_PERMISSIONS[role];
      if (!rolePermissions) {
        return {
          allowed: false,
          reason: `Unknown role: ${role}`
        };
      }

      const categoryPermissions = rolePermissions[category];
      if (!categoryPermissions) {
        return {
          allowed: false,
          reason: `Role ${role} has no permissions for category ${category}`
        };
      }

      // Check if function is allowed
      const allowedFunctions = categoryPermissions.allowed;
      const isAllowed = allowedFunctions.includes('*') || allowedFunctions.includes(functionName);
      
      if (!isAllowed) {
        return {
          allowed: false,
          reason: `Role ${role} is not allowed to execute function ${functionName}`
        };
      }

      return {
        allowed: true,
        permissions: categoryPermissions,
        conditions: categoryPermissions.conditions || [],
        rateLimit: categoryPermissions.rateLimit
      };

    } catch (error) {
      console.error('Function permission validation error:', error);
      return {
        allowed: false,
        reason: `Permission validation failed: ${error.message}`
      };
    }
  }

  /**
   * Validate execution conditions
   * @private
   */
  async _validateExecutionConditions(conditions, userId, roleInfo, context, functionName) {
    try {
      for (const condition of conditions) {
        const conditionConfig = EXECUTION_CONDITIONS[condition];
        if (!conditionConfig) {
          return {
            valid: false,
            failedCondition: condition,
            reason: `Unknown execution condition: ${condition}`
          };
        }

        // Validate the specific condition
        const isValid = await this._validateCondition(
          condition,
          conditionConfig,
          userId,
          roleInfo,
          context,
          functionName
        );

        if (!isValid.valid) {
          return {
            valid: false,
            failedCondition: condition,
            reason: isValid.reason || conditionConfig.description
          };
        }
      }

      return { valid: true };

    } catch (error) {
      console.error('Execution condition validation error:', error);
      return {
        valid: false,
        reason: `Condition validation failed: ${error.message}`
      };
    }
  }

  /**
   * Validate individual condition
   * @private
   */
  async _validateCondition(condition, conditionConfig, userId, roleInfo, context, functionName) {
    try {
      switch (condition) {
        case 'facility_match':
          return await this._validateFacilityMatch(userId, roleInfo, context);
        
        case 'active_facility':
          return await this._validateActiveFacility(userId, roleInfo);
        
        case 'clinical_access':
          return await this._validateClinicalAccess(userId, roleInfo);
        
        case 'assigned_patients':
          return await this._validateAssignedPatients(userId, roleInfo, context);
        
        case 'role_hierarchy':
          return await this._validateRoleHierarchy(userId, roleInfo, context);
        
        case 'self_only':
          return await this._validateSelfAccess(userId, context);
        
        default:
          return {
            valid: false,
            reason: `Unknown condition validator: ${condition}`
          };
      }
    } catch (error) {
      console.error(`Condition validation error for ${condition}:`, error);
      return {
        valid: false,
        reason: `Condition validation failed: ${error.message}`
      };
    }
  }

  /**
   * Validate facility match condition
   * @private
   */
  async _validateFacilityMatch(userId, roleInfo, context) {
    if (!roleInfo.facilityId) {
      return {
        valid: false,
        reason: 'User is not assigned to any facility'
      };
    }

    // Check if context contains facility-specific data
    const contextFacilityId = context.req?.body?.facilityId || 
                             context.req?.query?.facilityId ||
                             context.req?.variables?.facilityId;

    if (contextFacilityId && contextFacilityId !== roleInfo.facilityId) {
      return {
        valid: false,
        reason: 'User facility does not match requested facility'
      };
    }

    return { valid: true };
  }

  /**
   * Validate active facility condition
   * @private
   */
  async _validateActiveFacility(userId, roleInfo) {
    if (!roleInfo.facilityId) {
      return {
        valid: false,
        reason: 'User is not assigned to any facility'
      };
    }

    try {
      // Check if facility is active
      const facility = await this.databases.getDocument(
        this.config.databaseId,
        'facilities',
        roleInfo.facilityId
      );

      if (!facility.isActive) {
        return {
          valid: false,
          reason: 'User facility is not active'
        };
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        reason: 'Could not verify facility status'
      };
    }
  }

  /**
   * Validate clinical access condition
   * @private
   */
  async _validateClinicalAccess(userId, roleInfo) {
    const clinicalRoles = ['administrator', 'supervisor', 'doctor'];
    
    if (!clinicalRoles.includes(roleInfo.role)) {
      return {
        valid: false,
        reason: 'User does not have clinical access permissions'
      };
    }

    return { valid: true };
  }

  /**
   * Validate assigned patients condition
   * @private
   */
  async _validateAssignedPatients(userId, roleInfo, context) {
    // For now, we'll assume all users in a facility can access facility patients
    // This can be enhanced with specific patient assignments
    return await this._validateFacilityMatch(userId, roleInfo, context);
  }

  /**
   * Validate role hierarchy condition
   * @private
   */
  async _validateRoleHierarchy(userId, roleInfo, context) {
    const targetUserId = context.req?.body?.targetUserId || 
                        context.req?.body?.userId ||
                        context.req?.query?.userId;

    if (!targetUserId) {
      return { valid: true }; // No target user to validate against
    }

    try {
      const targetRoleInfo = await this.roleManager.getUserRoleInfo(targetUserId);
      if (!targetRoleInfo.success) {
        return {
          valid: false,
          reason: 'Could not determine target user role'
        };
      }

      // Check role hierarchy
      const roleHierarchy = {
        'administrator': 4,
        'supervisor': 3,
        'doctor': 2,
        'user': 1
      };

      const currentLevel = roleHierarchy[roleInfo.role] || 0;
      const targetLevel = roleHierarchy[targetRoleInfo.role] || 0;

      if (currentLevel <= targetLevel) {
        return {
          valid: false,
          reason: 'Insufficient role level to manage target user'
        };
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        reason: 'Could not validate role hierarchy'
      };
    }
  }

  /**
   * Validate self access condition
   * @private
   */
  async _validateSelfAccess(userId, context) {
    const targetUserId = context.req?.body?.userId || 
                        context.req?.query?.userId ||
                        context.req?.variables?.targetUserId;

    if (targetUserId && targetUserId !== userId) {
      return {
        valid: false,
        reason: 'User can only access their own data'
      };
    }

    return { valid: true };
  }

  /**
   * Check rate limiting
   * @private
   */
  async _checkRateLimit(userId, role, category, functionName) {
    const key = `${userId}:${category}:${functionName}`;
    const now = Date.now();
    const windowStart = now - (3600 * 1000); // 1 hour window

    // Get or create rate limit entry
    let rateLimitEntry = this.rateLimitStore.get(key);
    if (!rateLimitEntry) {
      rateLimitEntry = {
        requests: [],
        windowStart: now
      };
      this.rateLimitStore.set(key, rateLimitEntry);
    }

    // Clean old requests
    rateLimitEntry.requests = rateLimitEntry.requests.filter(timestamp => timestamp > windowStart);

    // Get rate limit for role and category
    const rolePermissions = FUNCTION_PERMISSIONS[role];
    const categoryPermissions = rolePermissions?.[category];
    const rateLimit = categoryPermissions?.rateLimit || DEFAULT_RATE_LIMITS.medium;

    // Check if limit exceeded
    if (rateLimitEntry.requests.length >= rateLimit.requests) {
      return {
        allowed: false,
        limit: rateLimit.requests,
        current: rateLimitEntry.requests.length,
        message: `Rate limit exceeded: ${rateLimit.requests} requests per ${rateLimit.duration} seconds`
      };
    }

    // Add current request
    rateLimitEntry.requests.push(now);

    return {
      allowed: true,
      remaining: rateLimit.requests - rateLimitEntry.requests.length,
      resetTime: windowStart + (rateLimit.duration * 1000)
    };
  }

  /**
   * Apply security policies
   * @private
   */
  async _applySecurityPolicies(category, context, userId, roleInfo) {
    try {
      const policies = FUNCTION_SECURITY_POLICIES[category];
      if (!policies) {
        return { valid: true, context: {} };
      }

      // IP restriction check
      if (policies.ipRestriction) {
        const clientIP = context.req?.headers?.['x-forwarded-for'] || 
                        context.req?.headers?.['x-real-ip'] ||
                        context.req?.connection?.remoteAddress;
        
        // For now, we'll log the IP but not restrict
        // This can be enhanced with IP whitelist validation
        if (this.config.enableSecurityLogging) {
          console.log(`Function execution from IP: ${clientIP} by user: ${userId}`);
        }
      }

      // Time restriction check
      if (policies.timeRestriction) {
        const currentHour = new Date().getHours();
        if (currentHour < 6 || currentHour > 22) {
          return {
            valid: false,
            violatedPolicy: 'time_restriction',
            reason: 'Function execution not allowed outside business hours (06:00-22:00)'
          };
        }
      }

      return {
        valid: true,
        context: {
          encryptionRequired: policies.encryptionRequired,
          auditRequired: policies.auditRequired
        }
      };

    } catch (error) {
      console.error('Security policy application error:', error);
      return {
        valid: false,
        reason: `Security policy validation failed: ${error.message}`
      };
    }
  }

  /**
   * Log security events
   * @private
   */
  async _logSecurityEvent(eventType, details) {
    if (!this.config.enableSecurityLogging) return;

    const event = {
      timestamp: new Date().toISOString(),
      type: eventType,
      details,
      severity: this._getEventSeverity(eventType)
    };

    this.securityEvents.push(event);
    console.log(`Security Event [${event.severity}]:`, JSON.stringify(event));

    // Keep only last 1000 events in memory
    if (this.securityEvents.length > 1000) {
      this.securityEvents = this.securityEvents.slice(-1000);
    }
  }

  /**
   * Log audit events
   * @private
   */
  async _logAuditEvent(eventType, details) {
    if (!this.config.enableAuditLogging) return;

    const event = {
      timestamp: new Date().toISOString(),
      type: eventType,
      details
    };

    console.log(`Audit Event:`, JSON.stringify(event));
  }

  /**
   * Get event severity level
   * @private
   */
  _getEventSeverity(eventType) {
    const severityMap = {
      'authentication_failed': 'HIGH',
      'function_permission_denied': 'HIGH',
      'execution_condition_failed': 'MEDIUM',
      'rate_limit_exceeded': 'MEDIUM',
      'security_policy_violation': 'HIGH',
      'middleware_error': 'CRITICAL',
      'role_determination_failed': 'HIGH',
      'function_execution_authorized': 'LOW'
    };

    return severityMap[eventType] || 'MEDIUM';
  }

  /**
   * Clean up old rate limit entries
   * @private
   */
  _cleanupRateLimit() {
    const now = Date.now();
    const cutoff = now - (3600 * 1000); // 1 hour ago

    for (const [key, entry] of this.rateLimitStore.entries()) {
      entry.requests = entry.requests.filter(timestamp => timestamp > cutoff);
      
      if (entry.requests.length === 0) {
        this.rateLimitStore.delete(key);
      }
    }
  }

  /**
   * Sanitize context for logging
   * @private
   */
  _sanitizeContext(context) {
    return {
      method: context.req?.method,
      path: context.req?.path,
      userAgent: context.req?.headers?.['user-agent'],
      contentType: context.req?.headers?.['content-type']
    };
  }

  /**
   * Create error response
   * @private
   */
  _createErrorResponse(code, message, statusCode) {
    return {
      success: false,
      error: {
        code,
        message,
        statusCode
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Create success response
   * @private
   */
  _createSuccessResponse(data) {
    return {
      success: true,
      data,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get middleware statistics
   */
  getMiddlewareStats() {
    return {
      rateLimitEntries: this.rateLimitStore.size,
      securityEvents: this.securityEvents.length,
      recentEvents: this.securityEvents.slice(-10)
    };
  }

  /**
   * Clear middleware caches
   */
  clearCaches() {
    this.rateLimitStore.clear();
    this.securityEvents = [];
    
    // Clear related utility caches
    this.permissionValidator.clearCache();
    this.facilityScopedQueries.clearCache();
  }

  /**
   * Cleanup resources
   */
  destroy() {
    if (this.rateLimitCleanupInterval) {
      clearInterval(this.rateLimitCleanupInterval);
    }
    this.clearCaches();
  }
}

module.exports = FunctionMiddleware;