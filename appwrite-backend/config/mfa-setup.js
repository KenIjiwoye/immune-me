const { Client, Users, Account } = require('node-appwrite');
const authConfig = require('./auth-config.json');

class MFASetup {
  constructor() {
    this.client = new Client()
      .setEndpoint(process.env.APPWRITE_ENDPOINT)
      .setProject(process.env.APPWRITE_PROJECT_ID)
      .setKey(process.env.APPWRITE_API_KEY);
    
    this.users = new Users(this.client);
    this.account = new Account(this.client);
    this.config = authConfig.auth.mfa;
  }
  
  async setupMFA(userId, method = 'totp') {
    try {
      if (!this.config.enabled) {
        return {
          success: false,
          error: 'MFA is not enabled in configuration'
        };
      }
      
      if (!this.config.methods.includes(method)) {
        return {
          success: false,
          error: `MFA method ${method} is not supported`
        };
      }
      
      let setupResult;
      
      switch (method) {
        case 'totp':
          setupResult = await this.setupTOTP(userId);
          break;
        case 'email':
          setupResult = await this.setupEmailMFA(userId);
          break;
        default:
          return {
            success: false,
            error: `Unsupported MFA method: ${method}`
          };
      }
      
      return setupResult;
      
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  async setupTOTP(userId) {
    try {
      // Create TOTP authenticator
      const authenticator = await this.users.createMfaAuthenticator(
        userId,
        'totp'
      );
      
      // Generate QR code for setup
      const qrCode = await this.users.createMfaChallenge(
        userId,
        'totp'
      );
      
      return {
        success: true,
        method: 'totp',
        authenticator: {
          id: authenticator.$id,
          type: authenticator.type,
          verified: authenticator.verified
        },
        setup: {
          qrCode: qrCode.qr,
          secret: qrCode.secret,
          uri: qrCode.uri
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  async setupEmailMFA(userId) {
    try {
      // Create email authenticator
      const authenticator = await this.users.createMfaAuthenticator(
        userId,
        'email'
      );
      
      return {
        success: true,
        method: 'email',
        authenticator: {
          id: authenticator.$id,
          type: authenticator.type,
          verified: authenticator.verified
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  async verifyMFA(userId, method, code) {
    try {
      const challenge = await this.users.createMfaChallenge(
        userId,
        method
      );
      
      const verification = await this.users.updateMfaChallenge(
        userId,
        challenge.$id,
        code
      );
      
      return {
        success: true,
        verified: verification.verified
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  async enableMFAForUser(userId, required = false) {
    try {
      await this.users.updateMfa(userId, true);
      
      if (required) {
        // Update user preferences to mark MFA as required
        await this.users.updatePrefs(userId, {
          mfaRequired: true,
          mfaEnabledAt: new Date().toISOString()
        });
      }
      
      return {
        success: true,
        message: 'MFA enabled for user'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  async disableMFAForUser(userId) {
    try {
      await this.users.updateMfa(userId, false);
      
      // Update user preferences
      await this.users.updatePrefs(userId, {
        mfaRequired: false,
        mfaDisabledAt: new Date().toISOString()
      });
      
      return {
        success: true,
        message: 'MFA disabled for user'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  async getUserMFAStatus(userId) {
    try {
      const user = await this.users.get(userId);
      const factors = await this.users.listMfaFactors(userId);
      
      return {
        success: true,
        mfaEnabled: user.mfa,
        factors: factors.factors || [],
        authenticators: factors.authenticators || []
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  async setupRecoveryCodes(userId) {
    try {
      const recoveryCodes = await this.users.createMfaRecoveryCodes(userId);
      
      return {
        success: true,
        recoveryCodes: recoveryCodes.recoveryCodes
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  async setupMFAForRole(role) {
    if (!this.config.requiredForRoles.includes(role)) {
      return {
        success: false,
        error: `MFA is not required for role: ${role}`
      };
    }
    
    console.log(`Setting up MFA for ${role} role...`);
    
    // This would typically be called after user migration
    // to enable MFA for specific roles
    
    return {
      success: true,
      message: `MFA setup configured for ${role} role`
    };
  }
  
  async setupMFAForAdminUsers() {
    console.log('Setting up MFA for admin users...');
    
    try {
      // This would be called after user migration
      // to enable MFA for all admin users
      
      return {
        success: true,
        message: 'MFA setup configured for admin users'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  async validateMFAToken(userId, token) {
    try {
      const factors = await this.users.listMfaFactors(userId);
      
      if (!factors.factors || factors.factors.length === 0) {
        return {
          success: false,
          error: 'No MFA factors configured'
        };
      }
      
      // Validate token against configured factors
      for (const factor of factors.factors) {
        try {
          const challenge = await this.users.createMfaChallenge(
            userId,
            factor.type
          );
          
          const verification = await this.users.updateMfaChallenge(
            userId,
            challenge.$id,
            token
          );
          
          if (verification.verified) {
            return {
              success: true,
              factor: factor.type,
              verified: true
            };
          }
        } catch (error) {
          // Continue to next factor
          continue;
        }
      }
      
      return {
        success: false,
        error: 'Invalid MFA token'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// CLI functionality
if (require.main === module) {
  const mfaSetup = new MFASetup();
  
  const command = process.argv[2];
  const userId = process.argv[3];
  const method = process.argv[4] || 'totp';
  
  switch (command) {
    case 'setup':
      if (!userId) {
        console.error('Usage: node mfa-setup.js setup <userId> [method]');
        process.exit(1);
      }
      
      mfaSetup.setupMFA(userId, method)
        .then(result => {
          console.log('MFA setup result:', result);
          process.exit(0);
        })
        .catch(error => {
          console.error('MFA setup failed:', error);
          process.exit(1);
        });
      break;
      
    case 'status':
      if (!userId) {
        console.error('Usage: node mfa-setup.js status <userId>');
        process.exit(1);
      }
      
      mfaSetup.getUserMFAStatus(userId)
        .then(result => {
          console.log('MFA status:', result);
          process.exit(0);
        })
        .catch(error => {
          console.error('Failed to get MFA status:', error);
          process.exit(1);
        });
      break;
      
    case 'enable':
      if (!userId) {
        console.error('Usage: node mfa-setup.js enable <userId>');
        process.exit(1);
      }
      
      mfaSetup.enableMFAForUser(userId, true)
        .then(result => {
          console.log('MFA enabled:', result);
          process.exit(0);
        })
        .catch(error => {
          console.error('Failed to enable MFA:', error);
          process.exit(1);
        });
      break;
      
    case 'disable':
      if (!userId) {
        console.error('Usage: node mfa-setup.js disable <userId>');
        process.exit(1);
      }
      
      mfaSetup.disableMFAForUser(userId)
        .then(result => {
          console.log('MFA disabled:', result);
          process.exit(0);
        })
        .catch(error => {
          console.error('Failed to disable MFA:', error);
          process.exit(1);
        });
      break;
      
    default:
      console.log('Usage: node mfa-setup.js [setup|status|enable|disable] <userId> [method]');
      process.exit(1);
  }
}

module.exports = MFASetup;