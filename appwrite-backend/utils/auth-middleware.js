const { Client, Account, Users } = require('node-appwrite');
const authConfig = require('../config/auth-config.json');

class AuthMiddleware {
  constructor() {
    this.client = new Client()
      .setEndpoint(process.env.APPWRITE_ENDPOINT)
      .setProject(process.env.APPWRITE_PROJECT_ID)
      .setKey(process.env.APPWRITE_API_KEY);
    
    this.account = new Account(this.client);
    this.users = new Users(this.client);
    this.config = authConfig.auth;
  }
  
  async verifySession(sessionId) {
    try {
      const session = await this.account.getSession(sessionId);
      const user = await this.users.get(session.userId);
      
      return {
        user,
        session,
        isValid: true
      };
    } catch (error) {
      return {
        user: null,
        session: null,
        isValid: false,
        error: error.message
      };
    }
  }
  
  async checkPermissions(userId, requiredPermissions) {
    try {
      const user = await this.users.get(userId);
      const userPrefs = user.prefs || {};
      const userRole = userPrefs.role;
      
      const rolePermissions = this.config.roles[userRole]?.permissions || [];
      
      // Check if user has required permissions
      for (const permission of requiredPermissions) {
        const hasPermission = rolePermissions.includes('*') || 
                            rolePermissions.some(p => this.matchPermission(p, permission));
        
        if (!hasPermission) {
          return false;
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error checking permissions:', error);
      return false;
    }
  }
  
  matchPermission(userPermission, requiredPermission) {
    // Handle wildcard permissions
    if (userPermission.endsWith('*')) {
      const prefix = userPermission.slice(0, -1);
      return requiredPermission.startsWith(prefix);
    }
    
    return userPermission === requiredPermission;
  }
  
  async requireAuth(req, res, next) {
    try {
      const sessionId = req.headers['x-session-id'] || req.headers.authorization?.replace('Bearer ', '');
      
      if (!sessionId) {
        return res.status(401).json({ error: 'No session provided' });
      }
      
      const authResult = await this.verifySession(sessionId);
      
      if (!authResult.isValid) {
        return res.status(401).json({ error: 'Invalid session' });
      }
      
      req.user = authResult.user;
      req.session = authResult.session;
      
      next();
    } catch (error) {
      return res.status(401).json({ error: 'Authentication failed' });
    }
  }
  
  requireRole(roles) {
    return async (req, res, next) => {
      try {
        const userRole = req.user.prefs?.role;
        
        if (!userRole || !roles.includes(userRole)) {
          return res.status(403).json({ error: 'Insufficient permissions' });
        }
        
        next();
      } catch (error) {
        return res.status(403).json({ error: 'Permission check failed' });
      }
    };
  }
  
  requirePermissions(permissions) {
    return async (req, res, next) => {
      try {
        const hasPermission = await this.checkPermissions(req.user.$id, permissions);
        
        if (!hasPermission) {
          return res.status(403).json({ error: 'Insufficient permissions' });
        }
        
        next();
      } catch (error) {
        return res.status(403).json({ error: 'Permission check failed' });
      }
    };
  }
}

module.exports = AuthMiddleware;