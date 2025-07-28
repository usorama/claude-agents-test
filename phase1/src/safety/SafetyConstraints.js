import winston from 'winston';
import path from 'path';
import { z } from 'zod';
import { SafetyProfiles } from './SafetyProfiles.js';

/**
 * IronClaude-S: SafetyConstraints with configurable profiles
 * Environment-based safety rules for agent operations
 */
export class SafetyConstraints {
  constructor(config = {}) {
    this.profiles = new SafetyProfiles();
    
    // Determine which profile to use
    let profileConfig;
    if (config.profile) {
      profileConfig = this.profiles.getProfile(config.profile);
    } else if (config.environment) {
      const profileMap = {
        'production': 'strict',
        'staging': 'moderate', 
        'development': 'permissive',
        'test': 'test'
      };
      const profileName = profileMap[config.environment] || 'moderate';
      profileConfig = this.profiles.getProfile(profileName);
    } else {
      profileConfig = this.profiles.getEnvironmentProfile();
    }

    // Store initial profile name for reference
    let profileName = config.profile || 'environment-based';
    
    // Apply any config overrides
    if (config.overrides) {
      const baseProfileName = config.profile || 
        (config.environment ? 
          ({'production': 'strict', 'staging': 'moderate', 'development': 'permissive', 'test': 'test'}[config.environment] || 'moderate') :
          'moderate');
      profileConfig = this.profiles.createCustomProfile(baseProfileName, config.overrides);
    }
    // Use profile configuration as constraints
    this.constraints = {
      resources: profileConfig.resources,
      actions: {
        ...profileConfig.actions,
        workspaceBoundary: config.workspaceBoundary || process.cwd()
      },
      scope: {
        ...profileConfig.scope,
        workspaceBoundary: config.workspaceBoundary || process.cwd()
      }
    };

    // Store profile info for reference
    this.currentProfile = {
      name: profileName,
      environment: profileConfig.environment,
      config: profileConfig
    };
    
    this.logger = winston.createLogger({
      level: config.logLevel || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { 
        service: 'SafetyConstraints',
        profile: this.currentProfile.name,
        environment: this.currentProfile.environment
      },
      transports: [
        new winston.transports.Console({
          format: winston.format.simple()
        })
      ]
    });
    
    // Validate configuration
    this.profiles.validateProfile(profileConfig);
    this._validateConfig();
    
    this.logger.info('SafetyConstraints initialized', { 
      profile: this.currentProfile.name,
      environment: this.currentProfile.environment,
      toolsAllowed: this.constraints.actions.allowedTools.length,
      networkAccess: this.constraints.scope.allowNetworkAccess
    });
  }

  /**
   * Validate an action against constraints
   * @param {Object} action - The action to validate
   * @param {Object} context - Current context (agent state, resources, etc.)
   * @returns {Array} Array of violations
   */
  validate(action, context) {
    const violations = [];
    
    try {
      // Check action constraints
      const actionViolations = this._checkActionConstraints(action);
      violations.push(...actionViolations);
      
      // Check path constraints
      if (action.path || action.file_path) {
        const pathViolations = this._checkPathConstraints(action.path || action.file_path);
        violations.push(...pathViolations);
      }
      
      // Check resource constraints
      if (context.resources) {
        const resourceViolations = this._checkResourceConstraints(context.resources);
        violations.push(...resourceViolations);
      }
      
      // Check scope constraints
      const scopeViolations = this._checkScopeConstraints(action, context);
      violations.push(...scopeViolations);
      
      // Check command constraints for Bash actions
      if (action.tool === 'Bash' && action.command) {
        const commandViolations = this._checkCommandConstraints(action.command);
        violations.push(...commandViolations);
      }
      
    } catch (error) {
      this.logger.error('Error during constraint validation', { error });
      violations.push({
        type: 'VALIDATION_ERROR',
        message: error.message,
        severity: 'MEDIUM'
      });
    }
    
    return violations;
  }

  /**
   * Check if an action is allowed
   * @param {string} tool - The tool name
   * @returns {boolean} True if allowed
   */
  isToolAllowed(tool) {
    if (this.constraints.actions.forbiddenTools.includes(tool)) {
      return false;
    }
    
    if (this.constraints.actions.allowedTools) {
      return this.constraints.actions.allowedTools.includes(tool);
    }
    
    return true;
  }

  /**
   * Check if a path is allowed
   * @param {string} filePath - The file path to check
   * @returns {boolean} True if allowed
   */
  isPathAllowed(filePath) {
    if (!filePath) return true;
    
    const normalizedPath = path.normalize(filePath);
    const absolutePath = path.isAbsolute(normalizedPath) ? normalizedPath : path.join(process.cwd(), normalizedPath);
    
    // Check forbidden paths
    for (const forbidden of this.constraints.actions.forbiddenPaths) {
      if (absolutePath.startsWith(forbidden)) {
        return false;
      }
    }
    
    // Check workspace boundary
    const boundary = path.resolve(this.constraints.scope.workspaceBoundary);
    if (!absolutePath.startsWith(boundary)) {
      return false;
    }
    
    // Check file extensions
    const ext = path.extname(filePath).toLowerCase();
    if (ext && this.constraints.scope.forbiddenFileExtensions.includes(ext)) {
      return false;
    }
    
    if (this.constraints.scope.allowedFileExtensions && ext) {
      return this.constraints.scope.allowedFileExtensions.includes(ext);
    }
    
    return true;
  }

  /**
   * Check if confirmation is required for an action
   * @param {Object} action - The action to check
   * @returns {boolean} True if confirmation required
   */
  requiresConfirmation(action) {
    return this.constraints.actions.requireConfirmation.includes(action.tool);
  }

  /**
   * Get severity level for a violation type
   * @param {string} violationType - The type of violation
   * @returns {string} Severity level
   */
  getViolationSeverity(violationType) {
    const severityMap = {
      'ACTION_FORBIDDEN': 'CRITICAL',
      'PATH_FORBIDDEN': 'CRITICAL',
      'COMMAND_FORBIDDEN': 'CRITICAL',
      'RESOURCE_LIMIT_CPU': 'HIGH',
      'RESOURCE_LIMIT_MEMORY': 'HIGH',
      'RESOURCE_LIMIT_TIME': 'HIGH',
      'FILE_SIZE_LIMIT': 'MEDIUM',
      'CONCURRENT_TASK_LIMIT': 'MEDIUM',
      'EXTENSION_FORBIDDEN': 'MEDIUM',
      'WORKSPACE_BOUNDARY': 'HIGH',
      'NETWORK_FORBIDDEN': 'HIGH'
    };
    
    return severityMap[violationType] || 'LOW';
  }

  /**
   * Get current safety profile information
   * @returns {Object} Current profile info
   */
  getCurrentProfile() {
    // For environment-based profiles, we need to determine the actual profile name
    let profileName = this.currentProfile.name;
    if (profileName === 'environment-based') {
      const profileMap = {
        'production': 'strict',
        'staging': 'moderate', 
        'development': 'permissive',
        'test': 'test'
      };
      profileName = profileMap[this.currentProfile.environment] || 'moderate';
    }

    return {
      name: this.currentProfile.name,
      environment: this.currentProfile.environment,
      actualProfile: profileName,
      summary: this.profiles.getProfileSummary(profileName)
    };
  }

  /**
   * Check if action can be overridden with authorization
   * @param {Object} action - The action to check
   * @param {string} authorization - Authorization token/reason
   * @returns {boolean} True if override is allowed
   */
  canOverride(action, authorization) {
    // In development/test environments, allow overrides with proper authorization
    if (this.currentProfile.environment === 'development' || 
        this.currentProfile.environment === 'test') {
      return authorization && authorization.length > 10; // Require meaningful authorization
    }
    
    // In production/staging, very limited overrides
    if (this.currentProfile.environment === 'staging') {
      return authorization && authorization.startsWith('STAGING_OVERRIDE:');
    }
    
    // Production - no overrides
    return false;
  }

  /**
   * Apply authorized override to bypass certain constraints
   * @param {Object} action - The action to override
   * @param {string} authorization - Authorization token/reason
   * @returns {Object} Action with override applied
   */
  applyOverride(action, authorization) {
    if (!this.canOverride(action, authorization)) {
      throw new Error('Override not authorized for current environment');
    }

    this.logger.warn('Safety constraint override applied', {
      action: action.tool,
      authorization: authorization.substring(0, 50),
      environment: this.currentProfile.environment
    });

    return {
      ...action,
      _override: {
        applied: true,
        authorization,
        timestamp: new Date().toISOString()
      }
    };
  }

  // Private methods
  _validateConfig() {
    // Ensure workspace boundary is valid
    try {
      this.constraints.scope.workspaceBoundary = path.resolve(this.constraints.scope.workspaceBoundary);
    } catch (error) {
      throw new Error(`Invalid workspace boundary: ${error.message}`);
    }
    
    // Validate resource limits
    if (this.constraints.resources.maxCpuPercent > 100) {
      this.constraints.resources.maxCpuPercent = 100;
    }
    
    // Ensure arrays are arrays
    const arrayFields = [
      'actions.allowedTools',
      'actions.forbiddenTools',
      'actions.forbiddenPaths',
      'actions.requireConfirmation',
      'actions.forbiddenCommands',
      'scope.forbiddenFileExtensions'
    ];
    
    for (const field of arrayFields) {
      const parts = field.split('.');
      const value = parts.reduce((obj, key) => obj?.[key], this.constraints);
      if (value && !Array.isArray(value)) {
        throw new Error(`${field} must be an array`);
      }
    }
  }

  _checkActionConstraints(action) {
    const violations = [];
    
    if (!this.isToolAllowed(action.tool)) {
      violations.push({
        type: 'ACTION_FORBIDDEN',
        message: `Tool '${action.tool}' is not allowed`,
        tool: action.tool,
        severity: this.getViolationSeverity('ACTION_FORBIDDEN')
      });
    }
    
    return violations;
  }

  _checkPathConstraints(filePath) {
    const violations = [];
    
    if (!this.isPathAllowed(filePath)) {
      const normalizedPath = path.normalize(filePath);
      const absolutePath = path.isAbsolute(normalizedPath) ? normalizedPath : path.join(process.cwd(), normalizedPath);
      
      // Determine specific violation
      let violationType = 'PATH_FORBIDDEN';
      let message = `Path '${filePath}' is not allowed`;
      
      for (const forbidden of this.constraints.actions.forbiddenPaths) {
        if (absolutePath.startsWith(forbidden)) {
          message = `Path '${filePath}' is in forbidden directory '${forbidden}'`;
          break;
        }
      }
      
      const boundary = path.resolve(this.constraints.scope.workspaceBoundary);
      if (!absolutePath.startsWith(boundary)) {
        violationType = 'WORKSPACE_BOUNDARY';
        message = `Path '${filePath}' is outside workspace boundary '${boundary}'`;
      }
      
      const ext = path.extname(filePath).toLowerCase();
      if (ext && this.constraints.scope.forbiddenFileExtensions.includes(ext)) {
        violationType = 'EXTENSION_FORBIDDEN';
        message = `File extension '${ext}' is forbidden`;
      }
      
      violations.push({
        type: violationType,
        message,
        path: filePath,
        severity: this.getViolationSeverity(violationType)
      });
    }
    
    return violations;
  }

  _checkResourceConstraints(resources) {
    const violations = [];
    
    if (resources.cpu > this.constraints.resources.maxCpuPercent) {
      violations.push({
        type: 'RESOURCE_LIMIT_CPU',
        message: `CPU usage ${resources.cpu}% exceeds limit ${this.constraints.resources.maxCpuPercent}%`,
        current: resources.cpu,
        limit: this.constraints.resources.maxCpuPercent,
        severity: this.getViolationSeverity('RESOURCE_LIMIT_CPU')
      });
    }
    
    if (resources.memory > this.constraints.resources.maxMemoryMB) {
      violations.push({
        type: 'RESOURCE_LIMIT_MEMORY',
        message: `Memory usage ${resources.memory}MB exceeds limit ${this.constraints.resources.maxMemoryMB}MB`,
        current: resources.memory,
        limit: this.constraints.resources.maxMemoryMB,
        severity: this.getViolationSeverity('RESOURCE_LIMIT_MEMORY')
      });
    }
    
    if (resources.fileOps > this.constraints.resources.maxFileOperations) {
      violations.push({
        type: 'RESOURCE_LIMIT_FILE_OPS',
        message: `File operations ${resources.fileOps} exceeds limit ${this.constraints.resources.maxFileOperations}`,
        current: resources.fileOps,
        limit: this.constraints.resources.maxFileOperations,
        severity: 'MEDIUM'
      });
    }
    
    return violations;
  }

  _checkScopeConstraints(action, context) {
    const violations = [];
    
    // Check concurrent tasks
    if (context.concurrentTasks > this.constraints.scope.maxConcurrentTasks) {
      violations.push({
        type: 'CONCURRENT_TASK_LIMIT',
        message: `Concurrent tasks ${context.concurrentTasks} exceeds limit ${this.constraints.scope.maxConcurrentTasks}`,
        current: context.concurrentTasks,
        limit: this.constraints.scope.maxConcurrentTasks,
        severity: this.getViolationSeverity('CONCURRENT_TASK_LIMIT')
      });
    }
    
    // Check network access for web tools
    if ((action.tool === 'WebSearch' || action.tool === 'WebFetch') && !this.constraints.scope.allowNetworkAccess) {
      violations.push({
        type: 'NETWORK_FORBIDDEN',
        message: 'Network access is not allowed',
        tool: action.tool,
        severity: this.getViolationSeverity('NETWORK_FORBIDDEN')
      });
    }
    
    // Check domain constraints for web tools
    if (action.url && this.constraints.scope.allowNetworkAccess) {
      try {
        const url = new URL(action.url);
        const domain = url.hostname;
        
        if (this.constraints.scope.forbiddenDomains.includes(domain)) {
          violations.push({
            type: 'DOMAIN_FORBIDDEN',
            message: `Domain '${domain}' is forbidden`,
            domain,
            severity: 'HIGH'
          });
        }
        
        if (this.constraints.scope.allowedDomains && !this.constraints.scope.allowedDomains.includes(domain)) {
          violations.push({
            type: 'DOMAIN_NOT_ALLOWED',
            message: `Domain '${domain}' is not in allowed list`,
            domain,
            severity: 'HIGH'
          });
        }
      } catch (error) {
        // Invalid URL
      }
    }
    
    return violations;
  }

  _checkCommandConstraints(command) {
    const violations = [];
    
    // Check forbidden commands
    for (const forbidden of this.constraints.actions.forbiddenCommands) {
      if (command.includes(forbidden)) {
        violations.push({
          type: 'COMMAND_FORBIDDEN',
          message: `Command contains forbidden pattern '${forbidden}'`,
          command: command.substring(0, 100), // Truncate for safety
          pattern: forbidden,
          severity: this.getViolationSeverity('COMMAND_FORBIDDEN')
        });
      }
    }
    
    // Check allowed commands if specified
    if (this.constraints.actions.allowedCommands) {
      let allowed = false;
      for (const allowedCmd of this.constraints.actions.allowedCommands) {
        if (command.startsWith(allowedCmd)) {
          allowed = true;
          break;
        }
      }
      
      if (!allowed) {
        violations.push({
          type: 'COMMAND_NOT_ALLOWED',
          message: 'Command is not in allowed list',
          command: command.substring(0, 100),
          severity: 'HIGH'
        });
      }
    }
    
    return violations;
  }
}

/**
 * Custom error for safety violations
 */
export class SafetyViolationError extends Error {
  constructor(message, violations) {
    super(message);
    this.name = 'SafetyViolationError';
    this.violations = violations;
  }
}