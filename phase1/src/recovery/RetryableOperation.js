import { ErrorRecoveryManager } from './ErrorRecoveryManager.js';

export class RetryableOperation {
  constructor(recoveryManager, options = {}) {
    this.recovery = recoveryManager;
    this.options = {
      maxRetries: options.maxRetries || 3,
      timeout: options.timeout || 30000,
      backoffStrategy: options.backoffStrategy || 'exponential',
      retryCondition: options.retryCondition || null,
      onRetry: options.onRetry || null,
      onFallback: options.onFallback || null,
      ...options
    };
  }

  async execute(operation, context = {}) {
    const taskId = context.taskId || `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const agentId = context.agentId || 'unknown';
    
    const operationContext = {
      ...this.options,
      ...context,
      taskId,
      agentId
    };
    
    return await this.recovery.executeWithRetry(
      taskId,
      agentId,
      operation,
      operationContext
    );
  }

  // Static factory methods for common patterns
  static async withRetry(operation, options = {}) {
    const recovery = new ErrorRecoveryManager(options);
    await recovery.start();
    
    try {
      const retryable = new RetryableOperation(recovery, options);
      return await retryable.execute(operation, options);
    } finally {
      recovery.stop();
    }
  }

  static async withCircuitBreaker(operation, agentId, options = {}) {
    const recovery = new ErrorRecoveryManager({
      circuitBreakerThreshold: 3,
      circuitBreakerTimeout: 30000,
      ...options
    });
    await recovery.start();
    
    try {
      const retryable = new RetryableOperation(recovery, options);
      return await retryable.execute(operation, { agentId, ...options });
    } finally {
      recovery.stop();
    }
  }

  static async withFallback(operation, fallbackOperation, options = {}) {
    const recovery = new ErrorRecoveryManager(options);
    await recovery.start();
    
    const agentId = options.agentId || 'fallback-agent';
    
    // Register fallback handler
    recovery.registerFallbackHandler(agentId, async (taskId, originalError, context) => {
      return await fallbackOperation(originalError, context);
    });
    
    try {
      const retryable = new RetryableOperation(recovery, options);
      return await retryable.execute(operation, { agentId, ...options });
    } finally {
      recovery.stop();
    }
  }
}

// Decorator for making methods retryable
export function retryable(options = {}) {
  return function(target, propertyKey, descriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function(...args) {
      const recovery = this.errorRecovery || new ErrorRecoveryManager(options);
      const wasRecoveryStarted = recovery.isActive;
      
      if (!wasRecoveryStarted) {
        await recovery.start();
      }
      
      try {
        const retryableOp = new RetryableOperation(recovery, options);
        
        return await retryableOp.execute(
          async (context) => originalMethod.apply(this, args),
          {
            agentId: this.id || 'unknown',
            taskId: args[0]?.taskId || `${propertyKey}-${Date.now()}`,
            methodName: propertyKey,
            ...options
          }
        );
      } finally {
        if (!wasRecoveryStarted) {
          recovery.stop();
        }
      }
    };
    
    return descriptor;
  };
}

// Utility functions for common retry patterns
export class RetryUtils {
  static async withExponentialBackoff(operation, maxRetries = 3, baseDelay = 1000) {
    return await RetryableOperation.withRetry(operation, {
      maxRetries,
      initialDelay: baseDelay,
      backoffMultiplier: 2,
      maxDelay: 30000
    });
  }

  static async withLinearBackoff(operation, maxRetries = 3, delay = 1000) {
    return await RetryableOperation.withRetry(operation, {
      maxRetries,
      initialDelay: delay,
      backoffMultiplier: 1,
      maxDelay: delay * maxRetries
    });
  }

  static async withCustomCondition(operation, shouldRetry, maxRetries = 3) {
    return await RetryableOperation.withRetry(operation, {
      maxRetries,
      shouldRetry
    });
  }

  static async withTimeout(operation, timeout = 30000, maxRetries = 3) {
    return await RetryableOperation.withRetry(operation, {
      maxRetries,
      timeout
    });
  }

  // Batch operations with individual retry logic
  static async batchWithRetry(operations, options = {}) {
    const results = [];
    const errors = [];
    
    const batchOptions = {
      maxRetries: 2,
      initialDelay: 500,
      ...options
    };
    
    for (let i = 0; i < operations.length; i++) {
      try {
        const result = await RetryableOperation.withRetry(
          operations[i],
          { ...batchOptions, taskId: `batch-${i}` }
        );
        results.push({ index: i, success: true, result });
      } catch (error) {
        results.push({ index: i, success: false, error });
        errors.push({ index: i, error });
      }
    }
    
    return {
      results,
      errors,
      successCount: results.filter(r => r.success).length,
      failureCount: errors.length
    };
  }

  // Retry with progressive timeout increase
  static async withProgressiveTimeout(operation, baseTimeout = 5000, maxRetries = 3) {
    let currentTimeout = baseTimeout;
    
    return await RetryableOperation.withRetry(operation, {
      maxRetries,
      timeout: currentTimeout,
      onRetry: (taskId, agentId, error, attempt) => {
        currentTimeout = Math.min(currentTimeout * 1.5, 60000); // Cap at 1 minute
        return { timeout: currentTimeout };
      }
    });
  }

  // Retry with jittered delay to avoid thundering herd
  static async withJitteredBackoff(operation, maxRetries = 3, baseDelay = 1000, jitterFactor = 0.3) {
    return await RetryableOperation.withRetry(operation, {
      maxRetries,
      initialDelay: baseDelay,
      backoffMultiplier: 2,
      jitterFactor,
      maxDelay: 30000
    });
  }
}

// Pre-configured retry policies for common scenarios
export const RetryPolicies = {
  // Network operations
  NETWORK: {
    maxRetries: 3,
    initialDelay: 1000,
    backoffMultiplier: 2,
    maxDelay: 10000,
    jitterFactor: 0.1,
    shouldRetry: (error) => {
      return /network|connection|timeout|dns/i.test(error.message) ||
             ['ECONNRESET', 'ENOTFOUND', 'ETIMEDOUT', 'ECONNREFUSED'].includes(error.code);
    }
  },

  // Database operations
  DATABASE: {
    maxRetries: 3,
    initialDelay: 500,
    backoffMultiplier: 2,
    maxDelay: 5000,
    shouldRetry: (error) => {
      return /database|connection|lock|deadlock/i.test(error.message) ||
             ['ECONNRESET', 'CONNECTION_LOST', 'LOCK_TIMEOUT'].includes(error.code);
    }
  },

  // API calls
  API: {
    maxRetries: 3,
    initialDelay: 1000,
    backoffMultiplier: 2,
    maxDelay: 15000,
    jitterFactor: 0.2,
    shouldRetry: (error) => {
      const status = error.status || error.statusCode;
      return status === 429 || status >= 500 || // Rate limit or server errors
             /rate.limit|server.error|service.unavailable/i.test(error.message);
    }
  },

  // File operations
  FILE_IO: {
    maxRetries: 2,
    initialDelay: 100,
    backoffMultiplier: 2,
    maxDelay: 1000,
    shouldRetry: (error) => {
      return /EBUSY|ENOENT|EACCES|EMFILE|ENFILE/.test(error.code) ||
             /file|permission|busy/i.test(error.message);
    }
  },

  // Quick operations that should fail fast
  QUICK_FAIL: {
    maxRetries: 1,
    initialDelay: 100,
    backoffMultiplier: 1,
    maxDelay: 500,
    timeout: 5000
  },

  // Long-running operations with patient retry
  PATIENT: {
    maxRetries: 5,
    initialDelay: 2000,
    backoffMultiplier: 1.5,
    maxDelay: 30000,
    jitterFactor: 0.3,
    timeout: 120000 // 2 minutes
  },

  // Critical operations that must succeed
  CRITICAL: {
    maxRetries: 5,
    initialDelay: 1000,
    backoffMultiplier: 2,
    maxDelay: 60000,
    jitterFactor: 0.4,
    circuitBreakerThreshold: 10, // Higher threshold for critical operations
    gracefulDegradation: false
  }
};

export default RetryableOperation;