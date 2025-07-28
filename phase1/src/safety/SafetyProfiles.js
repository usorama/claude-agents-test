import winston from 'winston';

/**
 * IronClaude-S: Environment-based Safety Profiles
 * Configurable safety constraints for different environments
 */
export class SafetyProfiles {
  constructor() {
    this.profiles = {
      // Strict profile for production environments
      strict: {
        environment: 'production',
        resources: {
          maxCpuPercent: 30,
          maxMemoryMB: 256,
          maxExecutionTimeMs: 120000, // 2 minutes
          maxFileOperations: 50,
          maxFileSizeMB: 10,
          maxTokensPerSession: 50000
        },
        actions: {
          allowedTools: ['Read', 'Grep', 'Glob', 'LS'],
          forbiddenTools: ['Bash', 'Write', 'Edit', 'MultiEdit'],
          forbiddenPaths: ['/etc', '/sys', '/proc', '/boot', '/dev', '/usr', '/bin', '/sbin'],
          requireConfirmation: ['Read'],
          maxBashCommands: 0,
          allowedCommands: [],
          forbiddenCommands: ['*'] // All commands forbidden
        },
        scope: {
          allowedFileExtensions: ['.md', '.txt', '.json', '.yaml', '.yml'],
          forbiddenFileExtensions: ['.exe', '.dll', '.so', '.dylib', '.sh', '.bat', '.cmd'],
          maxContextSizeKB: 50,
          maxConcurrentTasks: 2,
          allowNetworkAccess: false,
          allowedDomains: [],
          forbiddenDomains: ['*']
        }
      },

      // Moderate profile for staging/testing environments  
      moderate: {
        environment: 'staging',
        resources: {
          maxCpuPercent: 50,
          maxMemoryMB: 512,
          maxExecutionTimeMs: 300000, // 5 minutes
          maxFileOperations: 100,
          maxFileSizeMB: 50,
          maxTokensPerSession: 100000
        },
        actions: {
          allowedTools: ['Read', 'Write', 'Edit', 'MultiEdit', 'Grep', 'Glob', 'LS'],
          forbiddenTools: ['Bash'],
          forbiddenPaths: ['/etc', '/sys', '/proc', '/boot', '/dev'],
          requireConfirmation: ['Write', 'Edit', 'MultiEdit'],
          maxBashCommands: 0,
          allowedCommands: [],
          forbiddenCommands: ['rm -rf', 'sudo', 'chmod 777', 'dd', 'format', 'fdisk']
        },
        scope: {
          allowedFileExtensions: null, // null means all allowed except forbidden
          forbiddenFileExtensions: ['.exe', '.dll', '.so', '.dylib'],
          maxContextSizeKB: 100,
          maxConcurrentTasks: 5,
          allowNetworkAccess: true,
          allowedDomains: ['docs.anthropic.com', 'github.com', 'stackoverflow.com'],
          forbiddenDomains: []
        }
      },

      // Permissive profile for development environments
      permissive: {
        environment: 'development',
        resources: {
          maxCpuPercent: 70,
          maxMemoryMB: 1024,
          maxExecutionTimeMs: 600000, // 10 minutes
          maxFileOperations: 200,
          maxFileSizeMB: 100,
          maxTokensPerSession: 200000
        },
        actions: {
          allowedTools: ['Read', 'Write', 'Edit', 'MultiEdit', 'Bash', 'Grep', 'Glob', 'LS'],
          forbiddenTools: [],
          forbiddenPaths: ['/etc', '/sys', '/proc', '/boot', '/dev'], // Still protect system dirs
          requireConfirmation: [],
          maxBashCommands: 20,
          allowedCommands: null, // null means all allowed except forbidden
          forbiddenCommands: ['rm -rf /', 'sudo rm -rf', 'format c:', 'dd if=/dev/zero']
        },
        scope: {
          allowedFileExtensions: null,
          forbiddenFileExtensions: ['.exe'], // Only block executables
          maxContextSizeKB: 200,
          maxConcurrentTasks: 10,
          allowNetworkAccess: true,
          allowedDomains: null, // null means all allowed except forbidden
          forbiddenDomains: []
        }
      },

      // Test profile for automated testing
      test: {
        environment: 'test',
        resources: {
          maxCpuPercent: 80,
          maxMemoryMB: 512,
          maxExecutionTimeMs: 300000,
          maxFileOperations: 500,
          maxFileSizeMB: 50,
          maxTokensPerSession: 100000
        },
        actions: {
          allowedTools: ['Read', 'Write', 'Edit', 'MultiEdit', 'Bash', 'Grep', 'Glob', 'LS'],
          forbiddenTools: [],
          forbiddenPaths: ['/etc', '/sys', '/proc', '/boot', '/dev'],
          requireConfirmation: [],
          maxBashCommands: 50,
          allowedCommands: ['node', 'npm', 'git', 'mkdir', 'cp', 'mv', 'cat', 'ls', 'grep'],
          forbiddenCommands: ['rm -rf /', 'sudo', 'chmod 777', 'dd', 'format']
        },
        scope: {
          allowedFileExtensions: null,
          forbiddenFileExtensions: ['.exe', '.dll', '.so', '.dylib'],
          maxContextSizeKB: 150,
          maxConcurrentTasks: 8,
          allowNetworkAccess: false, // No network access during testing
          allowedDomains: [],
          forbiddenDomains: ['*']
        }
      }
    };

    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      defaultMeta: { service: 'SafetyProfiles' },
      transports: [
        new winston.transports.Console({
          format: winston.format.simple()
        })
      ]
    });
  }

  /**
   * Get safety profile by name
   * @param {string} profileName - Name of the profile (strict/moderate/permissive/test)
   * @returns {Object} Safety profile configuration
   */
  getProfile(profileName) {
    if (!this.profiles[profileName]) {
      throw new Error(`Unknown safety profile: ${profileName}. Available: ${Object.keys(this.profiles).join(', ')}`);
    }

    return JSON.parse(JSON.stringify(this.profiles[profileName])); // Deep copy
  }

  /**
   * Get profile based on environment variable
   * @returns {Object} Safety profile configuration
   */
  getEnvironmentProfile() {
    const env = process.env.NODE_ENV || 'development';
    const profileMap = {
      'production': 'strict',
      'prod': 'strict',
      'staging': 'moderate',
      'stage': 'moderate',
      'development': 'permissive',
      'dev': 'permissive',
      'test': 'test',
      'testing': 'test'
    };

    const profileName = profileMap[env.toLowerCase()] || 'moderate';
    this.logger.info(`Environment ${env} mapped to safety profile: ${profileName}`);
    
    return this.getProfile(profileName);
  }

  /**
   * Create custom profile by merging with base profile
   * @param {string} baseProfile - Base profile to extend
   * @param {Object} overrides - Configuration overrides
   * @returns {Object} Custom safety profile
   */
  createCustomProfile(baseProfile, overrides) {
    const base = this.getProfile(baseProfile);
    
    // Deep merge overrides
    return this._deepMerge(base, overrides);
  }

  /**
   * Validate that profile has all required fields
   * @param {Object} profile - Profile to validate
   * @throws {Error} If profile is invalid
   */
  validateProfile(profile) {
    const requiredFields = [
      'environment',
      'resources.maxCpuPercent',
      'resources.maxMemoryMB',
      'resources.maxExecutionTimeMs',
      'actions.allowedTools',
      'actions.forbiddenTools',
      'scope.maxConcurrentTasks'
    ];

    for (const field of requiredFields) {
      const value = this._getNestedValue(profile, field);
      if (value === undefined) {
        throw new Error(`Missing required field in safety profile: ${field}`);
      }
    }

    // Validate resource limits
    if (profile.resources.maxCpuPercent > 100 || profile.resources.maxCpuPercent < 0) {
      throw new Error('maxCpuPercent must be between 0 and 100');
    }

    if (profile.resources.maxMemoryMB < 0) {
      throw new Error('maxMemoryMB must be positive');
    }

    if (profile.scope.maxConcurrentTasks < 1) {
      throw new Error('maxConcurrentTasks must be at least 1');
    }

    this.logger.info('Safety profile validation passed', { environment: profile.environment });
  }

  /**
   * Get list of available profiles
   * @returns {Array} Array of profile names
   */
  getAvailableProfiles() {
    return Object.keys(this.profiles);
  }

  /**
   * Get profile summary for display
   * @param {string} profileName - Name of profile
   * @returns {Object} Profile summary
   */
  getProfileSummary(profileName) {
    const profile = this.getProfile(profileName);
    
    return {
      name: profileName,
      environment: profile.environment,
      toolsAllowed: profile.actions.allowedTools.length,
      toolsForbidden: profile.actions.forbiddenTools.length,
      networkAccess: profile.scope.allowNetworkAccess,
      maxTasks: profile.scope.maxConcurrentTasks,
      maxMemoryMB: profile.resources.maxMemoryMB,
      maxExecutionTimeMs: profile.resources.maxExecutionTimeMs
    };
  }

  // Private helper methods
  _deepMerge(target, source) {
    const result = JSON.parse(JSON.stringify(target));
    
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this._deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    
    return result;
  }

  _getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }
}

export default SafetyProfiles;