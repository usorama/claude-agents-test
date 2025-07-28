import winston from 'winston';

/**
 * IronClaude-S: Execution Mode Management
 * Controls simulation vs real execution for agent operations
 */
export class ExecutionModes {
  static SIMULATION = 'simulation';
  static REAL = 'real';
  static HYBRID = 'hybrid';  // Real for safe operations, simulation for risky ones

  constructor(config = {}) {
    this.currentMode = config.mode || this._detectEnvironmentMode();
    this.allowModeSwitch = config.allowModeSwitch !== false;
    this.safeOperations = config.safeOperations || [
      'Read', 'Grep', 'Glob', 'LS'
    ];
    this.riskyOperations = config.riskyOperations || [
      'Bash', 'Write', 'Edit', 'MultiEdit'
    ];

    this.logger = winston.createLogger({
      level: config.logLevel || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      defaultMeta: { service: 'ExecutionModes' },
      transports: [
        new winston.transports.Console({
          format: winston.format.simple()
        })
      ]
    });

    this.logger.info('ExecutionModes initialized', {
      mode: this.currentMode,
      allowModeSwitch: this.allowModeSwitch
    });
  }

  /**
   * Get current execution mode
   * @returns {string} Current execution mode
   */
  getCurrentMode() {
    return this.currentMode;
  }

  /**
   * Check if operation should be executed in real mode
   * @param {Object} operation - Operation to check
   * @returns {boolean} True if should execute in real mode
   */
  shouldExecuteReal(operation) {
    switch (this.currentMode) {
      case ExecutionModes.SIMULATION:
        return false;
      
      case ExecutionModes.REAL:
        return true;
      
      case ExecutionModes.HYBRID:
        // In hybrid mode, only execute safe operations for real
        return this.safeOperations.includes(operation.tool);
      
      default:
        this.logger.warn('Unknown execution mode, defaulting to simulation', {
          mode: this.currentMode
        });
        return false;
    }
  }

  /**
   * Switch execution mode
   * @param {string} newMode - New execution mode
   * @param {string} authorization - Authorization for mode switch
   * @returns {boolean} True if mode switch successful
   */
  switchMode(newMode, authorization) {
    if (!this.allowModeSwitch) {
      this.logger.error('Mode switching disabled');
      return false;
    }

    if (!Object.values(ExecutionModes).includes(newMode)) {
      this.logger.error('Invalid execution mode', { newMode });
      return false;
    }

    // Require authorization for switching to real mode
    if (newMode === ExecutionModes.REAL && !this._isAuthorized(authorization)) {
      this.logger.error('Unauthorized attempt to switch to real mode', {
        authorization: authorization?.substring(0, 20)
      });
      return false;
    }

    const oldMode = this.currentMode;
    this.currentMode = newMode;

    this.logger.info('Execution mode switched', {
      from: oldMode,
      to: newMode,
      authorized: !!authorization
    });

    return true;
  }

  /**
   * Execute operation in appropriate mode
   * @param {Object} operation - Operation to execute
   * @param {Function} realExecutor - Function to execute real operation
   * @param {Function} simulationExecutor - Function to execute simulation
   * @returns {Object} Execution result
   */
  async executeOperation(operation, realExecutor, simulationExecutor) {
    const shouldExecuteReal = this.shouldExecuteReal(operation);
    const mode = shouldExecuteReal ? 'real' : 'simulation';

    this.logger.info('Executing operation', {
      tool: operation.tool,
      mode: mode,
      executionMode: this.currentMode
    });

    try {
      let result;
      const startTime = Date.now();

      if (shouldExecuteReal && realExecutor) {
        result = await realExecutor(operation);
        result._executionMode = 'real';
      } else if (simulationExecutor) {
        result = await simulationExecutor(operation);
        result._executionMode = 'simulation';
      } else {
        // Default simulation behavior
        result = this._defaultSimulation(operation);
        result._executionMode = 'simulation';
      }

      const executionTime = Date.now() - startTime;

      this.logger.info('Operation completed', {
        tool: operation.tool,
        mode: result._executionMode,
        executionTimeMs: executionTime,
        success: result.success !== false
      });

      return {
        ...result,
        executionInfo: {
          mode: result._executionMode,
          executionTime: executionTime,
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      this.logger.error('Operation execution failed', {
        tool: operation.tool,
        mode: mode,
        error: error.message
      });

      return {
        success: false,
        error: error.message,
        _executionMode: mode,
        executionInfo: {
          mode: mode,
          executionTime: Date.now() - Date.now(),
          timestamp: new Date().toISOString(),
          error: true
        }
      };
    }
  }

  /**
   * Get execution mode statistics
   * @returns {Object} Execution statistics
   */
  getStatistics() {
    return {
      currentMode: this.currentMode,
      allowModeSwitch: this.allowModeSwitch,
      safeOperationsCount: this.safeOperations.length,
      riskyOperationsCount: this.riskyOperations.length,
      supportedModes: Object.values(ExecutionModes)
    };
  }

  /**
   * Validate execution mode configuration
   * @returns {Array} Array of validation errors
   */
  validateConfiguration() {
    const errors = [];

    if (!Object.values(ExecutionModes).includes(this.currentMode)) {
      errors.push(`Invalid current mode: ${this.currentMode}`);
    }

    if (!Array.isArray(this.safeOperations)) {
      errors.push('safeOperations must be an array');
    }

    if (!Array.isArray(this.riskyOperations)) {
      errors.push('riskyOperations must be an array');
    }

    // Check for overlapping operations
    const overlap = this.safeOperations.filter(op => 
      this.riskyOperations.includes(op)
    );
    if (overlap.length > 0) {
      errors.push(`Operations cannot be both safe and risky: ${overlap.join(', ')}`);
    }

    return errors;
  }

  // Private methods
  _detectEnvironmentMode() {
    const env = process.env.NODE_ENV || 'development';
    const executionMode = process.env.IRONCLAUDE_EXECUTION_MODE;

    if (executionMode) {
      return executionMode.toLowerCase();
    }

    // Default modes based on environment
    switch (env.toLowerCase()) {
      case 'production':
        return ExecutionModes.SIMULATION; // Safe default for production
      case 'staging':
        return ExecutionModes.HYBRID;     // Mixed mode for staging
      case 'test':
        return ExecutionModes.REAL;       // Real execution for testing
      case 'development':
      default:
        return ExecutionModes.REAL;       // Real execution for development
    }
  }

  _isAuthorized(authorization) {
    if (!authorization) return false;

    // Simple authorization - in production you'd want proper tokens
    return authorization.length > 10 && 
           (authorization.includes('REAL_MODE_AUTH:') || 
            authorization.includes('DEV_AUTH:') ||
            authorization.includes('TEST_AUTH:'));
  }

  _defaultSimulation(operation) {
    return {
      success: true,
      simulated: true,
      operation: {
        tool: operation.tool,
        description: `Simulated execution of ${operation.tool}`
      },
      result: `Simulated successful execution of ${operation.tool}`,
      timestamp: new Date().toISOString()
    };
  }
}

export default ExecutionModes;