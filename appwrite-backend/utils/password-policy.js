const authConfig = require('../config/auth-config.json');

class PasswordPolicy {
  constructor() {
    this.policy = authConfig.auth.passwordPolicy;
  }
  
  validate(password, userInfo = {}) {
    const errors = [];
    
    // Length validation
    if (password.length < this.policy.minLength) {
      errors.push(`Password must be at least ${this.policy.minLength} characters long`);
    }
    
    if (password.length > this.policy.maxLength) {
      errors.push(`Password must not exceed ${this.policy.maxLength} characters`);
    }
    
    // Character requirements
    if (this.policy.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    
    if (this.policy.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    
    if (this.policy.requireNumbers && !/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    
    if (this.policy.requireSymbols && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }
    
    // Personal information check
    if (this.policy.noPersonalInfo && userInfo) {
      const personalInfo = [
        userInfo.email?.split('@')[0],
        userInfo.fullName,
        userInfo.username,
        userInfo.firstName,
        userInfo.lastName
      ].filter(Boolean);
      
      const containsPersonalInfo = personalInfo.some(info => 
        info && password.toLowerCase().includes(info.toLowerCase())
      );
      
      if (containsPersonalInfo) {
        errors.push('Password should not contain personal information');
      }
    }
    
    // Common password check (simplified - in production, use a comprehensive list)
    if (this.policy.noCommonPasswords) {
      const commonPasswords = [
        'password', '123456', '123456789', 'qwerty', 'abc123', 'password123',
        'admin', 'letmein', 'welcome', 'monkey', '1234567890', 'password1'
      ];
      
      if (commonPasswords.includes(password.toLowerCase())) {
        errors.push('Password is too common and easily guessable');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      strength: this.calculateStrength(password)
    };
  }
  
  calculateStrength(password) {
    let score = 0;
    
    // Length score
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;
    if (password.length >= 16) score += 1;
    
    // Character variety score
    if (/[a-z]/.test(password)) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/\d/.test(password)) score += 1;
    if (/[^a-zA-Z0-9]/.test(password)) score += 1;
    
    // Complexity score
    if (/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9])/.test(password)) score += 2;
    
    // Determine strength level
    if (score <= 2) return 'weak';
    if (score <= 4) return 'medium';
    if (score <= 6) return 'strong';
    return 'very-strong';
  }
  
  generatePassword(length = 12) {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*(),.?":{}|<>';
    
    const allChars = lowercase + uppercase + numbers + symbols;
    let password = '';
    
    // Ensure at least one of each required character type
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += symbols[Math.floor(Math.random() * symbols.length)];
    
    // Fill the rest
    for (let i = 4; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }
    
    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }
  
  async checkPasswordHistory(userId, newPassword, passwordHistory = []) {
    // In a real implementation, this would check against stored password hashes
    // For now, we'll just validate against the provided history
    
    const isInHistory = passwordHistory.some(oldPassword => 
      oldPassword === newPassword
    );
    
    if (isInHistory) {
      return {
        isValid: false,
        error: `Password has been used in the last ${this.policy.passwordHistory} passwords`
      };
    }
    
    return { isValid: true };
  }
  
  getPasswordRequirements() {
    return {
      minLength: this.policy.minLength,
      maxLength: this.policy.maxLength,
      requireUppercase: this.policy.requireUppercase,
      requireLowercase: this.policy.requireLowercase,
      requireNumbers: this.policy.requireNumbers,
      requireSymbols: this.policy.requireSymbols,
      noPersonalInfo: this.policy.noPersonalInfo,
      noCommonPasswords: this.policy.noCommonPasswords,
      passwordHistory: this.policy.passwordHistory
    };
  }
  
  getStrengthRequirements(strength = 'medium') {
    const requirements = {
      weak: {
        minLength: 8,
        requireUppercase: false,
        requireLowercase: true,
        requireNumbers: true,
        requireSymbols: false
      },
      medium: {
        minLength: 10,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSymbols: false
      },
      strong: {
        minLength: 12,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSymbols: true
      },
      'very-strong': {
        minLength: 16,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSymbols: true
      }
    };
    
    return requirements[strength] || requirements.medium;
  }
}

module.exports = PasswordPolicy;