import winston from 'winston';
import { SafetyViolationError } from './SafetyConstraints.js';
import { ResourceMonitor } from './ResourceMonitor.js';

/**
 * ConstraintEnforcer middleware enforces safety constraints on agent actions
 */
export class ConstraintEnforcer {
  constructor(constraints, config = {}) {
    this.constraints = constraints;
    this.violations = new Map(); // Track violations per agent
    this.resourceMonitor = new ResourceMonitor();
    this.confirmationCallbacks = new Map();
    
    this.config = {
      throttleDelay: config.throttleDelay || 1000, // ms between actions when throttled
      maxViolationsBeforeThrottle: config.maxViolationsBeforeThrottle || 5,
      maxViolationsBeforeShutdown: config.maxViolationsBeforeShutdown || 10,
      violationRetentionMs: config.violationRetentionMs || 3600000, // 1 hour
      ...config
    };
    
    this.logger = winston.createLogger({
      level: config.logLevel || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { service: 'ConstraintEnforcer' },
      transports: [
        new winston.transports.Console({
          format: winston.format.simple()
        }),
        new winston.transports.File({ 
          filename: 'safety-violations.log',
          level: 'warn'
        })
      ]
    });
    
    // Start cleanup interval for old violations
    this._startViolationCleanup();
  }

  /**
   * Enforce constraints before action execution
   * @param {Object} agent - The agent executing the action
   * @param {Object} action - The action to be executed
   * @returns {boolean} True if action is allowed
   * @throws {SafetyViolationError} If critical violations found
   */
  async enforcePreAction(agent, action) {
    const context = await this._buildContext(agent);
    
    // Validate action against constraints
    const violations = this.constraints.validate(action, context);
    
    if (violations.length > 0) {
      // Record violations
      this._recordViolations(agent.id, violations);
      
      // Check for critical violations
      const criticalViolations = violations.filter(v => v.severity === 'CRITICAL');
      if (criticalViolations.length > 0) {
        this.logger.error('Critical safety violations detected', {
          agentId: agent.id,
          action: action.tool,
          violations: criticalViolations
        });
        
        throw new SafetyViolationError(
          `Critical safety violation: ${criticalViolations[0].message}`,
          criticalViolations
        );
      }
      
      // Check for high severity violations
      const highViolations = violations.filter(v => v.severity === 'HIGH');
      if (highViolations.length > 0) {
        this.logger.warn('High severity violations detected', {
          agentId: agent.id,
          action: action.tool,
          violations: highViolations
        });
        
        // Check if confirmation required
        if (this.constraints.requiresConfirmation(action)) {
          const confirmed = await this._requestConfirmation(agent, action, highViolations);
          if (!confirmed) {
            throw new SafetyViolationError('Action rejected by confirmation', highViolations);
          }
        }
      }
      
      // Log other violations
      const otherViolations = violations.filter(v => v.severity !== 'CRITICAL' && v.severity !== 'HIGH');
      if (otherViolations.length > 0) {
        this.logger.info('Safety violations detected', {
          agentId: agent.id,
          action: action.tool,
          violations: otherViolations
        });
      }
    }
    
    // Check if agent should be throttled
    if (this._shouldThrottle(agent.id)) {
      await this._throttleAgent(agent);
    }
    
    // Check if agent should be shut down
    if (this._shouldShutdown(agent.id)) {
      throw new SafetyViolationError('Agent shutdown due to excessive violations', []);
    }
    
    return true;
  }

  /**
   * Enforce constraints after action execution
   * @param {Object} agent - The agent that executed the action
   * @param {Object} action - The action that was executed
   * @param {Object} result - The result of the action
   */
  async enforcePostAction(agent, action, result) {
    try {
      // Check resource usage after action
      const postResources = await this.resourceMonitor.getCurrentUsage(agent.id);
      
      // Detect resource spikes
      if (this._detectResourceSpike(agent.id, postResources)) {
        this.logger.warn('Resource spike detected', {
          agentId: agent.id,
          resources: postResources
        });
        
        // Record as violation
        this._recordViolations(agent.id, [{
          type: 'RESOURCE_SPIKE',
          message: 'Significant resource usage spike detected',
          severity: 'MEDIUM',
          resources: postResources
        }]);
        
        // Apply throttling
        await this._throttleAgent(agent);
      }
      
      // Update action history
      this._updateActionHistory(agent, action, result);
      
    } catch (error) {
      this.logger.error('Error in post-action enforcement', { 
        agentId: agent.id,
        error 
      });
    }
  }

  /**
   * Register a confirmation callback for an agent
   * @param {string} agentId - The agent ID
   * @param {Function} callback - Confirmation callback function
   */
  registerConfirmationCallback(agentId, callback) {
    this.confirmationCallbacks.set(agentId, callback);
  }

  /**
   * Get violation history for an agent
   * @param {string} agentId - The agent ID
   * @returns {Array} Array of violations
   */
  getViolationHistory(agentId) {
    const agentViolations = this.violations.get(agentId);
    if (!agentViolations) return [];
    
    // Filter out expired violations
    const now = Date.now();
    return agentViolations.filter(v => 
      now - v.timestamp < this.config.violationRetentionMs
    );
  }

  /**
   * Clear violations for an agent
   * @param {string} agentId - The agent ID
   */
  clearViolations(agentId) {
    this.violations.delete(agentId);
    this.logger.info('Violations cleared', { agentId });
  }

  // Private methods
  async _buildContext(agent) {
    const resources = await this.resourceMonitor.getCurrentUsage(agent.id);
    
    return {
      agent: agent.id,
      resources,
      concurrentTasks: agent.state?.currentTasks?.length || 0,
      history: agent.actionHistory || [],
      timestamp: Date.now()
    };
  }

  _recordViolations(agentId, violations) {
    if (!this.violations.has(agentId)) {
      this.violations.set(agentId, []);
    }
    
    const agentViolations = this.violations.get(agentId);
    const timestamp = Date.now();
    
    violations.forEach(violation => {
      agentViolations.push({
        ...violation,
        timestamp,
        agentId
      });
    });
    
    // Trim old violations
    const cutoff = timestamp - this.config.violationRetentionMs;
    const filtered = agentViolations.filter(v => v.timestamp > cutoff);
    this.violations.set(agentId, filtered);
  }

  _shouldThrottle(agentId) {
    const violations = this.getViolationHistory(agentId);
    return violations.length >= this.config.maxViolationsBeforeThrottle;
  }

  _shouldShutdown(agentId) {
    const violations = this.getViolationHistory(agentId);
    return violations.length >= this.config.maxViolationsBeforeShutdown;
  }

  async _throttleAgent(agent) {
    this.logger.info('Throttling agent', { 
      agentId: agent.id,
      delay: this.config.throttleDelay 
    });
    
    // Set throttle flag on agent
    if (agent.setThrottled) {
      agent.setThrottled(true, this.config.throttleDelay);
    }
    
    // Delay execution
    await new Promise(resolve => setTimeout(resolve, this.config.throttleDelay));
  }

  async _requestConfirmation(agent, action, violations) {
    const callback = this.confirmationCallbacks.get(agent.id);
    
    if (!callback) {
      // No callback registered, log and reject by default
      this.logger.warn('No confirmation callback registered, rejecting action', {
        agentId: agent.id,
        action: action.tool
      });
      return false;
    }
    
    try {
      const confirmed = await callback({
        agent: agent.id,
        action,
        violations,
        message: `Action '${action.tool}' requires confirmation due to safety violations`
      });
      
      this.logger.info('Confirmation result', {
        agentId: agent.id,
        action: action.tool,
        confirmed
      });
      
      return confirmed;
    } catch (error) {
      this.logger.error('Error in confirmation callback', {
        agentId: agent.id,
        error
      });
      return false;
    }
  }

  _detectResourceSpike(agentId, currentResources) {
    const history = this.resourceMonitor.getResourceHistory(agentId);
    if (history.length < 5) return false;
    
    // Calculate average of last 5 measurements
    const recent = history.slice(-5);
    const avgCpu = recent.reduce((sum, r) => sum + r.cpu, 0) / recent.length;
    const avgMemory = recent.reduce((sum, r) => sum + r.memory, 0) / recent.length;
    
    // Check for 2x spike
    return currentResources.cpu > avgCpu * 2 || 
           currentResources.memory > avgMemory * 2;
  }

  _updateActionHistory(agent, action, result) {
    if (!agent.actionHistory) {
      agent.actionHistory = [];
    }
    
    agent.actionHistory.push({
      timestamp: Date.now(),
      tool: action.tool,
      success: !result.error,
      violations: this.getViolationHistory(agent.id).length
    });
    
    // Keep only last 100 actions
    if (agent.actionHistory.length > 100) {
      agent.actionHistory = agent.actionHistory.slice(-100);
    }
  }

  _startViolationCleanup() {
    // Clean up old violations every 10 minutes
    setInterval(() => {
      const now = Date.now();
      const cutoff = now - this.config.violationRetentionMs;
      
      for (const [agentId, violations] of this.violations.entries()) {
        const filtered = violations.filter(v => v.timestamp > cutoff);
        if (filtered.length === 0) {
          this.violations.delete(agentId);
        } else if (filtered.length < violations.length) {
          this.violations.set(agentId, filtered);
        }
      }
    }, 600000); // 10 minutes
  }
}