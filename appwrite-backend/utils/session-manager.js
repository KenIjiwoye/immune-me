const { Client, Account } = require('node-appwrite');
const authConfig = require('../config/auth-config.json');

class SessionManager {
  constructor() {
    this.client = new Client()
      .setEndpoint(process.env.APPWRITE_ENDPOINT)
      .setProject(process.env.APPWRITE_PROJECT_ID)
      .setKey(process.env.APPWRITE_API_KEY);
    
    this.account = new Account(this.client);
    this.config = authConfig.auth.session;
  }
  
  async createSession(email, password) {
    try {
      const session = await this.account.createEmailPasswordSession(email, password);
      
      // Set session expiration based on configuration
      if (this.config.duration) {
        // Session duration is handled by Appwrite configuration
        console.log(`Session created with ${this.config.duration}s duration`);
      }
      
      return {
        success: true,
        session: {
          id: session.$id,
          userId: session.userId,
          expire: session.expire,
          provider: session.provider,
          providerUid: session.providerUid,
          providerAccessToken: session.providerAccessToken
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  async getSession(sessionId) {
    try {
      const session = await this.account.getSession(sessionId);
      
      return {
        success: true,
        session: {
          id: session.$id,
          userId: session.userId,
          expire: session.expire,
          provider: session.provider,
          providerUid: session.providerUid,
          providerAccessToken: session.providerAccessToken,
          ip: session.ip,
          osName: session.osName,
          osVersion: session.osVersion,
          clientName: session.clientName,
          clientVersion: session.clientVersion,
          clientEngine: session.clientEngine,
          deviceName: session.deviceName,
          deviceBrand: session.deviceBrand,
          deviceModel: session.deviceModel
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  async getAllSessions() {
    try {
      const sessions = await this.account.listSessions();
      
      return {
        success: true,
        sessions: sessions.sessions.map(session => ({
          id: session.$id,
          userId: session.userId,
          expire: session.expire,
          provider: session.provider,
          providerUid: session.providerUid,
          ip: session.ip,
          osName: session.osName,
          osVersion: session.osVersion,
          clientName: session.clientName,
          clientVersion: session.clientVersion,
          clientEngine: session.clientEngine,
          deviceName: session.deviceName,
          deviceBrand: session.deviceBrand,
          deviceModel: session.deviceModel
        }))
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  async deleteSession(sessionId) {
    try {
      await this.account.deleteSession(sessionId);
      
      return {
        success: true,
        message: 'Session deleted successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  async deleteAllSessions() {
    try {
      await this.account.deleteSessions();
      
      return {
        success: true,
        message: 'All sessions deleted successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  async isSessionValid(sessionId) {
    try {
      const session = await this.account.getSession(sessionId);
      const now = new Date();
      const expire = new Date(session.expire);
      
      return {
        valid: expire > now,
        expiresIn: Math.floor((expire - now) / 1000),
        session: {
          id: session.$id,
          userId: session.userId,
          expire: session.expire
        }
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message
      };
    }
  }
  
  async refreshSession(sessionId) {
    try {
      // Appwrite sessions are refreshed automatically
      // This method checks if the session is still valid
      const validation = await this.isSessionValid(sessionId);
      
      if (validation.valid) {
        return {
          success: true,
          message: 'Session is still valid',
          expiresIn: validation.expiresIn
        };
      } else {
        return {
          success: false,
          error: 'Session has expired'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  async getSessionAlerts(sessionId) {
    try {
      const validation = await this.isSessionValid(sessionId);
      
      if (!validation.valid) {
        return {
          alert: 'expired',
          message: 'Session has expired'
        };
      }
      
      if (this.config.alerts.enabled && this.config.alerts.beforeExpiry) {
        const expiresIn = validation.expiresIn;
        
        if (expiresIn <= this.config.alerts.beforeExpiry) {
          return {
            alert: 'expiring',
            message: `Session will expire in ${Math.floor(expiresIn / 60)} minutes`,
            expiresIn
          };
        }
      }
      
      return {
        alert: 'none',
        message: 'Session is valid'
      };
    } catch (error) {
      return {
        alert: 'error',
        message: error.message
      };
    }
  }
  
  async enforceSessionLimit(userId, maxSessions = null) {
    const limit = maxSessions || this.config.maxSessions;
    
    try {
      const sessions = await this.getAllSessions();
      
      if (sessions.success && sessions.sessions.length > limit) {
        // Sort sessions by creation date (oldest first)
        const sortedSessions = sessions.sessions.sort((a, b) => 
          new Date(a.createdAt) - new Date(b.createdAt)
        );
        
        // Delete oldest sessions to enforce limit
        const sessionsToDelete = sortedSessions.slice(0, -limit);
        
        const deletionResults = await Promise.all(
          sessionsToDelete.map(session => this.deleteSession(session.id))
        );
        
        return {
          success: true,
          deleted: sessionsToDelete.length,
          results: deletionResults
        };
      }
      
      return {
        success: true,
        message: 'Session limit not exceeded',
        currentSessions: sessions.sessions?.length || 0
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = SessionManager;