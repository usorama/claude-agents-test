import EventEmitter from 'events';
import { performance } from 'perf_hooks';

export class ErrorRecoveryManager extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      // Retry strategy options
      maxRetries: options.maxRetries || 3,
      initialDelay: options.initialDelay || 1000, // 1 second
      maxDelay: options.maxDelay || 30000, // 30 seconds
      backoffMultiplier: options.backoffMultiplier || 2,
      jitterFactor: options.jitterFactor || 0.1,
      
      // Circuit breaker options
      circuitBreakerThreshold: options.circuitBreakerThreshold || 5,
      circuitBreakerTimeout: options.circuitBreakerTimeout || 60000, // 1 minute
      circuitBreakerResetTimeout: options.circuitBreakerResetTimeout || 30000, // 30 seconds
      
      // Recovery strategy options
      gracefulDegradation: options.gracefulDegradation !== false,
      fallbackEnabled: options.fallbackEnabled !== false,
      healthCheckInterval: options.healthCheckInterval || 30000, // 30 seconds
      
      ...options
    };
    
    // Retry tracking
    this.retryAttempts = new Map(); // taskId -> retry count
    this.retryHistory = new Map(); // taskId -> retry history
    this.backoffTimers = new Map(); // taskId -> timer reference
    
    // Circuit breaker state
    this.circuitBreakers = new Map(); // agentId -> circuit breaker state
    
    // Recovery strategies
    this.recoveryStrategies = new Map();
    this.fallbackHandlers = new Map();
    
    // Health monitoring
    this.healthChecks = new Map();
    this.healthCheckTimer = null;
    
    // Error patterns and predictions
    this.errorPatterns = new Map();
    this.errorCounts = new Map();
    
    this.isActive = false;
  }

  async start() {
    if (this.isActive) return;
    
    this.isActive = true;
    
    // Start health check monitoring
    this.startHealthChecking();
    
    // Initialize default recovery strategies
    this.initializeDefaultStrategies();
    
    this.emit('recovery:started', {
      timestamp: new Date().toISOString(),
      options: this.options
    });
  }

  stop() {
    if (!this.isActive) return;
    
    this.isActive = false;
    
    // Clear all timers
    for (const timer of this.backoffTimers.values()) {
      clearTimeout(timer);
    }
    this.backoffTimers.clear();
    
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
    
    this.emit('recovery:stopped', {
      timestamp: new Date().toISOString()
    });
  }

  async executeWithRetry(taskId, agentId, operation, context = {}) {
    const startTime = performance.now();
    let lastError = null;
    let attempt = 0;
    
    // Check circuit breaker
    if (this.isCircuitBreakerOpen(agentId)) {
      const error = new Error(`Circuit breaker is open for agent ${agentId}`);
      error.code = 'CIRCUIT_BREAKER_OPEN';
      throw error;
    }
    
    // Initialize retry tracking
    if (!this.retryAttempts.has(taskId)) {
      this.retryAttempts.set(taskId, 0);
      this.retryHistory.set(taskId, []);
    }
    
    const maxRetries = context.maxRetries || this.options.maxRetries;
    
    while (attempt <= maxRetries) {
      try {
        // Execute the operation
        const result = await this.executeOperation(operation, context, attempt);
        
        // Success - reset counters and circuit breaker
        this.onOperationSuccess(taskId, agentId, attempt, performance.now() - startTime);
        
        return result;
        
      } catch (error) {
        attempt++;
        lastError = error;
        
        // Record the error
        this.recordError(taskId, agentId, error, attempt);
        
        // Check if we should continue retrying
        if (!this.shouldRetry(error, attempt, maxRetries, context)) {
          break;
        }
        
        // Apply recovery strategy
        await this.applyRecoveryStrategy(taskId, agentId, error, attempt, context);
        
        // Calculate and apply backoff delay
        const delay = this.calculateBackoffDelay(attempt, context);
        await this.applyBackoffDelay(taskId, delay);
        
        this.emit('retry:attempt', {
          taskId,
          agentId,
          attempt,
          error: error.message,
          delay,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    // All retries exhausted
    this.onOperationFailed(taskId, agentId, lastError, attempt);
    
    // Try fallback if available
    if (this.options.fallbackEnabled && this.fallbackHandlers.has(agentId)) {
      try {
        const fallbackResult = await this.executeFallback(taskId, agentId, lastError, context);
        
        this.emit('fallback:success', {
          taskId,
          agentId,
          originalError: lastError.message,
          timestamp: new Date().toISOString()
        });
        
        return fallbackResult;
        
      } catch (fallbackError) {
        this.emit('fallback:failed', {
          taskId,
          agentId,
          originalError: lastError.message,
          fallbackError: fallbackError.message,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    // Final failure
    const finalError = new Error(`Operation failed after ${attempt} attempts: ${lastError.message}`);
    finalError.originalError = lastError;
    finalError.attempts = attempt;
    finalError.taskId = taskId;
    finalError.agentId = agentId;
    
    throw finalError;
  }

  async executeOperation(operation, context, attempt) {
    // Add timeout protection
    const timeout = context.timeout || 30000; // 30 seconds default
    
    return new Promise(async (resolve, reject) => {
      const timeoutTimer = setTimeout(() => {
        reject(new Error(`Operation timeout after ${timeout}ms (attempt ${attempt})`));
      }, timeout);
      
      try {
        const result = await operation(context, attempt);
        clearTimeout(timeoutTimer);
        resolve(result);
      } catch (error) {
        clearTimeout(timeoutTimer);
        reject(error);
      }
    });
  }

  shouldRetry(error, attempt, maxRetries, context) {
    // Don't retry if max attempts reached
    if (attempt > maxRetries) return false;
    
    // Check for non-retryable errors
    if (this.isNonRetryableError(error)) return false;
    
    // Check custom retry conditions
    if (context.shouldRetry && typeof context.shouldRetry === 'function') {
      return context.shouldRetry(error, attempt, maxRetries);
    }
    
    // Default retry logic
    return this.isRetryableError(error);
  }

  isRetryableError(error) {
    // Retryable error patterns
    const retryablePatterns = [
      /timeout/i,
      /network/i,
      /connection/i,
      /temporary/i,
      /unavailable/i,
      /busy/i,
      /rate.limit/i,
      /429/,
      /502/,
      /503/,
      /504/
    ];
    
    // Retryable error codes
    const retryableCodes = [
      'TIMEOUT',
      'NETWORK_ERROR',
      'CONNECTION_LOST',
      'TEMPORARY_FAILURE',
      'SERVICE_UNAVAILABLE',
      'RATE_LIMITED',
      'ECONNRESET',
      'ENOTFOUND',
      'ETIMEDOUT'
    ];
    
    const errorMessage = error.message || '';
    const errorCode = error.code || '';
    
    return retryablePatterns.some(pattern => pattern.test(errorMessage)) ||
           retryableCodes.includes(errorCode);
  }

  isNonRetryableError(error) {
    // Non-retryable error patterns
    const nonRetryablePatterns = [
      /authentication/i,
      /authorization/i,
      /forbidden/i,
      /not.found/i,
      /bad.request/i,
      /invalid/i,
      /malformed/i,
      /401/,
      /403/,
      /404/,
      /400/
    ];
    
    // Non-retryable error codes
    const nonRetryableCodes = [
      'AUTH_FAILED',
      'FORBIDDEN',
      'NOT_FOUND',
      'BAD_REQUEST',
      'INVALID_INPUT',
      'MALFORMED_REQUEST',
      'PERMISSION_DENIED'
    ];
    
    const errorMessage = error.message || '';
    const errorCode = error.code || '';
    
    return nonRetryablePatterns.some(pattern => pattern.test(errorMessage)) ||
           nonRetryableCodes.includes(errorCode);
  }

  calculateBackoffDelay(attempt, context = {}) {
    const baseDelay = context.initialDelay || this.options.initialDelay;
    const maxDelay = context.maxDelay || this.options.maxDelay;
    const multiplier = context.backoffMultiplier || this.options.backoffMultiplier;
    const jitterFactor = context.jitterFactor || this.options.jitterFactor;
    
    // Exponential backoff
    let delay = baseDelay * Math.pow(multiplier, attempt - 1);
    
    // Apply jitter to avoid thundering herd
    const jitter = delay * jitterFactor * Math.random();
    delay += jitter;
    
    // Cap at maximum delay
    delay = Math.min(delay, maxDelay);
    
    return Math.round(delay);
  }

  async applyBackoffDelay(taskId, delay) {
    return new Promise(resolve => {
      const timer = setTimeout(() => {
        this.backoffTimers.delete(taskId);
        resolve();
      }, delay);
      
      this.backoffTimers.set(taskId, timer);
    });
  }

  async applyRecoveryStrategy(taskId, agentId, error, attempt, context) {
    const strategyKey = context.recoveryStrategy || 'default';
    const strategy = this.recoveryStrategies.get(strategyKey);
    
    if (strategy) {
      try {
        await strategy.apply(taskId, agentId, error, attempt, context);
        
        this.emit('recovery:strategy:applied', {
          taskId,
          agentId,
          strategy: strategyKey,
          attempt,
          timestamp: new Date().toISOString()
        });
        
      } catch (strategyError) {
        this.emit('recovery:strategy:failed', {
          taskId,
          agentId,
          strategy: strategyKey,
          error: strategyError.message,
          timestamp: new Date().toISOString()
        });
      }
    }
  }

  recordError(taskId, agentId, error, attempt) {
    // Update retry history
    const history = this.retryHistory.get(taskId) || [];
    history.push({
      attempt,
      error: error.message,
      code: error.code,
      timestamp: new Date().toISOString()
    });
    this.retryHistory.set(taskId, history);
    
    // Update error counts for circuit breaker
    const errorKey = `${agentId}:errors`;
    const currentCount = this.errorCounts.get(errorKey) || 0;
    this.errorCounts.set(errorKey, currentCount + 1);
    
    // Check circuit breaker threshold
    this.checkCircuitBreaker(agentId);
    
    // Update error patterns for prediction
    this.updateErrorPatterns(agentId, error);
    
    this.emit('error:recorded', {
      taskId,
      agentId,
      error: error.message,
      attempt,
      timestamp: new Date().toISOString()
    });
  }

  onOperationSuccess(taskId, agentId, attempts, duration) {
    // Clear retry tracking
    this.retryAttempts.delete(taskId);
    this.retryHistory.delete(taskId);
    
    // Reset circuit breaker success counter
    const successKey = `${agentId}:successes`;
    const currentSuccesses = this.errorCounts.get(successKey) || 0;
    this.errorCounts.set(successKey, currentSuccesses + 1);
    
    // Check if circuit breaker should be reset
    this.checkCircuitBreakerReset(agentId);
    
    this.emit('operation:success', {
      taskId,
      agentId,
      attempts,
      duration,
      timestamp: new Date().toISOString()
    });
  }

  onOperationFailed(taskId, agentId, error, attempts) {
    this.emit('operation:failed', {
      taskId,
      agentId,
      error: error.message,
      attempts,
      timestamp: new Date().toISOString()
    });
  }

  // Circuit Breaker Implementation
  isCircuitBreakerOpen(agentId) {
    const breaker = this.circuitBreakers.get(agentId);
    if (!breaker) return false;
    
    if (breaker.state === 'open') {
      // Check if we should transition to half-open
      if (Date.now() - breaker.openedAt > this.options.circuitBreakerTimeout) {
        breaker.state = 'half-open';
        this.emit('circuit-breaker:half-open', {
          agentId,
          timestamp: new Date().toISOString()
        });
      }
      return breaker.state === 'open';
    }
    
    return false;
  }

  checkCircuitBreaker(agentId) {
    const errorKey = `${agentId}:errors`;
    const errorCount = this.errorCounts.get(errorKey) || 0;
    
    if (errorCount >= this.options.circuitBreakerThreshold) {
      this.openCircuitBreaker(agentId);
    }
  }

  openCircuitBreaker(agentId) {
    this.circuitBreakers.set(agentId, {
      state: 'open',
      openedAt: Date.now(),
      errorCount: this.errorCounts.get(`${agentId}:errors`) || 0
    });
    
    // Schedule automatic reset attempt
    setTimeout(() => {
      this.checkCircuitBreakerReset(agentId);
    }, this.options.circuitBreakerResetTimeout);
    
    this.emit('circuit-breaker:opened', {
      agentId,
      errorCount: this.errorCounts.get(`${agentId}:errors`) || 0,
      timestamp: new Date().toISOString()
    });
  }

  checkCircuitBreakerReset(agentId) {
    const breaker = this.circuitBreakers.get(agentId);
    if (!breaker) return;
    
    const successKey = `${agentId}:successes`;
    const recentSuccesses = this.errorCounts.get(successKey) || 0;
    
    if (breaker.state === 'half-open' && recentSuccesses > 0) {
      this.resetCircuitBreaker(agentId);
    }
  }

  resetCircuitBreaker(agentId) {
    this.circuitBreakers.delete(agentId);
    this.errorCounts.delete(`${agentId}:errors`);
    this.errorCounts.delete(`${agentId}:successes`);
    
    this.emit('circuit-breaker:reset', {
      agentId,
      timestamp: new Date().toISOString()
    });
  }

  // Recovery Strategies
  registerRecoveryStrategy(name, strategy) {
    this.recoveryStrategies.set(name, strategy);
  }

  registerFallbackHandler(agentId, handler) {
    this.fallbackHandlers.set(agentId, handler);
  }

  async executeFallback(taskId, agentId, originalError, context) {
    const handler = this.fallbackHandlers.get(agentId);
    if (!handler) {
      throw new Error(`No fallback handler registered for agent ${agentId}`);
    }
    
    return await handler(taskId, originalError, context);
  }

  initializeDefaultStrategies() {
    // Default recovery strategy
    this.registerRecoveryStrategy('default', {
      apply: async (taskId, agentId, error, attempt, context) => {
        // Basic recovery actions
        if (error.code === 'TIMEOUT') {
          // Increase timeout for next attempt
          context.timeout = (context.timeout || 30000) * 1.5;
        }
        
        if (error.code === 'RATE_LIMITED') {
          // Extend delay for rate limiting
          context.initialDelay = (context.initialDelay || 1000) * 2;
        }
      }
    });
    
    // Resource cleanup strategy
    this.registerRecoveryStrategy('cleanup', {
      apply: async (taskId, agentId, error, attempt, context) => {
        // Attempt to clean up resources before retry
        if (context.cleanup && typeof context.cleanup === 'function') {
          await context.cleanup();
        }
      }
    });
    
    // Context refresh strategy
    this.registerRecoveryStrategy('refresh', {
      apply: async (taskId, agentId, error, attempt, context) => {
        // Refresh context or connections before retry
        if (context.refresh && typeof context.refresh === 'function') {
          await context.refresh();
        }
      }
    });
  }

  // Health Checking
  startHealthChecking() {
    if (this.healthCheckTimer) return;
    
    this.healthCheckTimer = setInterval(
      () => this.performHealthChecks(),
      this.options.healthCheckInterval
    );
  }

  async performHealthChecks() {
    for (const [agentId, healthCheck] of this.healthChecks) {
      try {
        const isHealthy = await healthCheck();
        
        if (isHealthy && this.circuitBreakers.has(agentId)) {
          // Agent is healthy again, consider resetting circuit breaker
          this.checkCircuitBreakerReset(agentId);
        }
        
        this.emit('health-check:completed', {
          agentId,
          healthy: isHealthy,
          timestamp: new Date().toISOString()
        });
        
      } catch (error) {
        this.emit('health-check:failed', {
          agentId,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }
  }

  registerHealthCheck(agentId, healthCheckFunction) {
    this.healthChecks.set(agentId, healthCheckFunction);
  }

  unregisterHealthCheck(agentId) {
    this.healthChecks.delete(agentId);
  }

  // Error Pattern Analysis
  updateErrorPatterns(agentId, error) {
    const patternKey = `${agentId}:${error.code || 'UNKNOWN'}`;
    const pattern = this.errorPatterns.get(patternKey) || {
      count: 0,
      firstSeen: Date.now(),
      lastSeen: Date.now(),
      messages: []
    };
    
    pattern.count++;
    pattern.lastSeen = Date.now();
    pattern.messages.push({
      message: error.message,
      timestamp: Date.now()
    });
    
    // Keep only recent messages
    if (pattern.messages.length > 10) {
      pattern.messages = pattern.messages.slice(-10);
    }
    
    this.errorPatterns.set(patternKey, pattern);
  }

  getErrorPatterns(agentId = null) {
    if (agentId) {
      const patterns = {};
      for (const [key, pattern] of this.errorPatterns) {
        if (key.startsWith(`${agentId}:`)) {
          patterns[key] = pattern;
        }
      }
      return patterns;
    }
    
    return Object.fromEntries(this.errorPatterns);
  }

  // Statistics and Reporting
  getRetryStatistics(agentId = null) {
    const stats = {
      totalRetries: 0,
      successfulRetries: 0,
      failedRetries: 0,
      averageAttempts: 0,
      patterns: this.getErrorPatterns(agentId)
    };
    
    let totalAttempts = 0;
    let operationCount = 0;
    
    for (const [taskId, history] of this.retryHistory) {
      if (agentId && !taskId.includes(agentId)) continue;
      
      operationCount++;
      totalAttempts += history.length;
      stats.totalRetries += history.length;
      
      // Check if operation ultimately succeeded (not in current retry attempts)
      if (!this.retryAttempts.has(taskId)) {
        stats.successfulRetries += history.length;
      } else {
        stats.failedRetries += history.length;
      }
    }
    
    stats.averageAttempts = operationCount > 0 ? totalAttempts / operationCount : 0;
    
    return stats;
  }

  getCircuitBreakerStatus() {
    const status = {};
    
    for (const [agentId, breaker] of this.circuitBreakers) {
      status[agentId] = {
        state: breaker.state,
        openedAt: breaker.openedAt,
        errorCount: breaker.errorCount,
        openDuration: Date.now() - breaker.openedAt
      };
    }
    
    return status;
  }

  // Cleanup
  cleanup() {
    this.stop();
    
    // Clear all tracking data
    this.retryAttempts.clear();
    this.retryHistory.clear();
    this.circuitBreakers.clear();
    this.errorPatterns.clear();
    this.errorCounts.clear();
    this.healthChecks.clear();
    this.recoveryStrategies.clear();
    this.fallbackHandlers.clear();
  }
}