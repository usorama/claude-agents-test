#!/usr/bin/env node

/**
 * Test Suite: Error Recovery and Retry Mechanisms
 * Tests the error recovery system implementation for Phase 3
 */

import { ErrorRecoveryManager } from './src/recovery/ErrorRecoveryManager.js';
import { RetryableOperation, RetryUtils, RetryPolicies } from './src/recovery/RetryableOperation.js';
import { BaseAgent } from './src/agents/BaseAgent.js';
import { AnalystAgent } from './src/agents/core/AnalystAgent.js';
import { ContextManager } from './src/context/ContextManager.js';
import { GraphFactory } from './src/context/GraphFactory.js';

class ErrorRecoveryTest {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      total: 0,
      details: []
    };
    
    this.recovery = null;
    this.agents = new Map();
    this.contextManager = null;
  }

  async runAllTests() {
    console.log('🔄 Starting Error Recovery Tests');
    console.log('=' .repeat(60));
    
    try {
      await this.setupTestEnvironment();
      
      // Core error recovery tests
      await this.testRecoveryManagerInitialization();
      await this.testBasicRetryMechanism();
      await this.testExponentialBackoff();
      await this.testCircuitBreaker();
      await this.testFallbackMechanism();
      await this.testErrorPatternDetection();
      
      // Retry operation tests
      await this.testRetryableOperationWrapper();
      await this.testRetryPolicies();
      await this.testRetryUtilities();
      
      // Integration tests
      await this.testAgentIntegration();
      await this.testConcurrentRetries();
      await this.testRecoveryStrategies();
      await this.testHealthChecking();
      
      // Edge cases and error conditions
      await this.testNonRetryableErrors();
      await this.testTimeoutHandling();
      await this.testResourceCleanup();
      
      await this.cleanupTestEnvironment();
      
    } catch (error) {
      console.error('❌ Test suite failed:', error.message);
      this.recordTest('Test Suite', false, error.message);
    }
    
    this.printResults();
    return this.results.failed === 0;
  }

  async setupTestEnvironment() {
    console.log('\n📋 Setting up test environment...');
    
    try {
      // Initialize error recovery manager
      this.recovery = new ErrorRecoveryManager({
        maxRetries: 3,
        initialDelay: 100, // Fast for testing
        maxDelay: 1000,
        backoffMultiplier: 2,
        circuitBreakerThreshold: 3,
        circuitBreakerTimeout: 2000,
        healthCheckInterval: 1000
      });
      
      // Initialize context manager
      const graph = await GraphFactory.create();
      this.contextManager = new ContextManager({ graph });
      
      console.log('✅ Test environment setup complete');
      
    } catch (error) {
      console.error('❌ Failed to setup test environment:', error.message);
      throw error;
    }
  }

  async testRecoveryManagerInitialization() {
    console.log('\n🔍 Testing Recovery Manager Initialization...');
    
    try {
      // Test starting the recovery manager
      await this.recovery.start();
      this.recordTest('Recovery Manager Start', this.recovery.isActive, 'Should be active after start');
      
      // Test options initialization
      this.recordTest(
        'Options Configuration',
        this.recovery.options.maxRetries === 3 && this.recovery.options.initialDelay === 100,
        'Should initialize with correct options'
      );
      
      // Test event emitter functionality
      let eventReceived = false;
      this.recovery.on('test-event', () => { eventReceived = true; });
      this.recovery.emit('test-event');
      
      this.recordTest('Event Emitter', eventReceived, 'Should emit and receive events');
      
      // Test stopping
      this.recovery.stop();
      this.recordTest('Recovery Manager Stop', !this.recovery.isActive, 'Should be inactive after stop');
      
      // Restart for other tests
      await this.recovery.start();
      
    } catch (error) {
      this.recordTest('Recovery Manager Initialization', false, error.message);
    }
  }

  async testBasicRetryMechanism() {
    console.log('\n🔄 Testing Basic Retry Mechanism...');
    
    try {
      let attemptCount = 0;
      
      // Test successful retry after failures
      const result = await this.recovery.executeWithRetry(
        'test-task-001',
        'test-agent',
        async () => {
          attemptCount++;
          if (attemptCount < 3) {
            throw new Error('Temporary failure');
          }
          return { success: true, attempt: attemptCount };
        }
      );
      
      this.recordTest(
        'Successful Retry',
        result.success && result.attempt === 3,
        'Should succeed on third attempt'
      );
      
      // Test retry count tracking
      this.recordTest(
        'Attempt Count',
        attemptCount === 3,
        'Should make exactly 3 attempts'
      );
      
      // Test failure after max retries
      let maxRetriesReached = false;
      attemptCount = 0;
      
      try {
        await this.recovery.executeWithRetry(
          'test-task-002',
          'test-agent',
          async () => {
            attemptCount++;
            throw new Error('Persistent failure');
          }
        );
      } catch (error) {
        maxRetriesReached = true;
        this.recordTest(
          'Max Retries Reached',
          error.message.includes('Operation failed after') && attemptCount === 4,
          'Should fail after max retries with correct error'
        );
      }
      
      this.recordTest('Max Retries Test', maxRetriesReached, 'Should reach max retries');
      
    } catch (error) {
      this.recordTest('Basic Retry Mechanism', false, error.message);
    }
  }

  async testExponentialBackoff() {
    console.log('\n⏱️ Testing Exponential Backoff...');
    
    try {
      const delays = [];
      const startTimes = [];
      let attempt = 0;
      
      try {
        await this.recovery.executeWithRetry(
          'backoff-test-001',
          'test-agent',
          async () => {
            attempt++;
            const now = Date.now();
            startTimes.push(now);
            
            if (attempt > 1) {
              delays.push(now - startTimes[attempt - 2]);
            }
            
            if (attempt <= 3) {
              throw new Error('Backoff test failure');
            }
            return { success: true };
          }
        );
      } catch (error) {
        // Expected to fail after retries
      }
      
      // Test that delays increase exponentially
      const hasIncreasingDelays = delays.length >= 2 && delays[1] > delays[0];
      this.recordTest(
        'Exponential Backoff',
        hasIncreasingDelays,
        'Delays should increase exponentially'
      );
      
      // Test delay calculation
      const calculatedDelay = this.recovery.calculateBackoffDelay(2);
      this.recordTest(
        'Backoff Calculation',
        calculatedDelay >= 200 && calculatedDelay <= 400, // 100 * 2^1 with jitter
        'Should calculate correct exponential backoff delay'
      );
      
    } catch (error) {
      this.recordTest('Exponential Backoff', false, error.message);
    }
  }

  async testCircuitBreaker() {
    console.log('\n⚡ Testing Circuit Breaker...');
    
    try {
      const agentId = 'circuit-test-agent';
      let errorCount = 0;
      
      // Trigger multiple failures to open circuit breaker
      for (let i = 0; i < 5; i++) {
        try {
          await this.recovery.executeWithRetry(
            `circuit-task-${i}`,
            agentId,
            async () => {
              errorCount++;
              throw new Error('Circuit breaker test failure');
            },
            { maxRetries: 0 } // Don't retry, just fail immediately
          );
        } catch (error) {
          // Expected failures
        }
      }
      
      // Check if circuit breaker is open
      const isOpen = this.recovery.isCircuitBreakerOpen(agentId);
      this.recordTest(
        'Circuit Breaker Opens',
        isOpen,
        'Circuit breaker should open after threshold failures'
      );
      
      // Test that operations are rejected when circuit is open
      let circuitBreakerBlocked = false;
      try {
        await this.recovery.executeWithRetry(
          'blocked-task',
          agentId,
          async () => ({ success: true })
        );
      } catch (error) {
        circuitBreakerBlocked = error.code === 'CIRCUIT_BREAKER_OPEN';
      }
      
      this.recordTest(
        'Circuit Breaker Blocks',
        circuitBreakerBlocked,
        'Should block operations when circuit is open'
      );
      
      // Test circuit breaker status
      const status = this.recovery.getCircuitBreakerStatus();
      this.recordTest(
        'Circuit Breaker Status',
        status[agentId] && status[agentId].state === 'open',
        'Should report correct circuit breaker status'
      );
      
    } catch (error) {
      this.recordTest('Circuit Breaker', false, error.message);
    }
  }

  async testFallbackMechanism() {
    console.log('\n🔄 Testing Fallback Mechanism...');
    
    try {
      const agentId = 'fallback-test-agent';
      let fallbackExecuted = false;
      
      // Register fallback handler
      this.recovery.registerFallbackHandler(agentId, async (taskId, originalError, context) => {
        fallbackExecuted = true;
        return { 
          success: true, 
          fallback: true, 
          originalError: originalError.message,
          taskId 
        };
      });
      
      // Execute operation that will fail and trigger fallback
      const result = await this.recovery.executeWithRetry(
        'fallback-task-001',
        agentId,
        async () => {
          throw new Error('Primary operation failed');
        }
      );
      
      this.recordTest(
        'Fallback Execution',
        fallbackExecuted && result.fallback === true,
        'Should execute fallback when primary operation fails'
      );
      
      this.recordTest(
        'Fallback Result',
        result.originalError === 'Primary operation failed',
        'Fallback should receive original error information'
      );
      
      // Test fallback failure
      this.recovery.registerFallbackHandler(agentId, async () => {
        throw new Error('Fallback also failed');
      });
      
      let fallbackFailed = false;
      try {
        await this.recovery.executeWithRetry(
          'fallback-task-002',
          agentId,
          async () => {
            throw new Error('Primary failed');
          }
        );
      } catch (error) {
        fallbackFailed = error.message.includes('Primary failed');
      }
      
      this.recordTest(
        'Fallback Failure Handling',
        fallbackFailed,
        'Should handle fallback failures gracefully'
      );
      
    } catch (error) {
      this.recordTest('Fallback Mechanism', false, error.message);
    }
  }

  async testErrorPatternDetection() {
    console.log('\n🔍 Testing Error Pattern Detection...');
    
    try {
      const agentId = 'pattern-test-agent';
      
      // Generate similar errors to create patterns
      for (let i = 0; i < 5; i++) {
        try {
          await this.recovery.executeWithRetry(
            `pattern-task-${i}`,
            agentId,
            async () => {
              const error = new Error('Connection timeout');
              error.code = 'TIMEOUT';
              throw error;
            },
            { maxRetries: 0 }
          );
        } catch (error) {
          // Expected failures
        }
      }
      
      // Check error patterns
      const patterns = this.recovery.getErrorPatterns(agentId);
      const timeoutPattern = patterns[`${agentId}:TIMEOUT`];
      
      this.recordTest(
        'Error Pattern Detection',
        timeoutPattern && timeoutPattern.count === 5,
        'Should detect and count error patterns'
      );
      
      this.recordTest(
        'Pattern Metadata',
        timeoutPattern.firstSeen && timeoutPattern.lastSeen && timeoutPattern.messages.length > 0,
        'Should track pattern metadata'
      );
      
      // Test retry statistics
      const stats = this.recovery.getRetryStatistics(agentId);
      this.recordTest(
        'Retry Statistics',
        stats.totalRetries >= 0 && stats.patterns,
        'Should provide retry statistics'
      );
      
    } catch (error) {
      this.recordTest('Error Pattern Detection', false, error.message);
    }
  }

  async testRetryableOperationWrapper() {
    console.log('\n📦 Testing Retryable Operation Wrapper...');
    
    try {
      // Test basic wrapper functionality
      let attempts = 0;
      const result = await RetryableOperation.withRetry(
        async () => {
          attempts++;
          if (attempts < 2) {
            throw new Error('Wrapper test failure');
          }
          return { success: true, attempts };
        },
        { maxRetries: 3, initialDelay: 50 }
      );
      
      this.recordTest(
        'Wrapper Basic Retry',
        result.success && result.attempts === 2,
        'Should work with wrapper pattern'
      );
      
      // Test circuit breaker wrapper
      let circuitBreakerWorked = false;
      try {
        await RetryableOperation.withCircuitBreaker(
          async () => {
            throw new Error('Circuit breaker test');
          },
          'wrapper-agent',
          { maxRetries: 1, circuitBreakerThreshold: 1 }
        );
      } catch (error) {
        // First call should fail normally, second should be circuit breaker
        try {
          await RetryableOperation.withCircuitBreaker(
            async () => ({ success: true }),
            'wrapper-agent',
            { maxRetries: 1, circuitBreakerThreshold: 1 }
          );
        } catch (secondError) {
          circuitBreakerWorked = secondError.code === 'CIRCUIT_BREAKER_OPEN';
        }
      }
      
      this.recordTest(
        'Circuit Breaker Wrapper',
        circuitBreakerWorked,
        'Circuit breaker wrapper should work'
      );
      
      // Test fallback wrapper
      const fallbackResult = await RetryableOperation.withFallback(
        async () => {
          throw new Error('Primary failed');
        },
        async (originalError) => {
          return { fallback: true, originalError: originalError.message };
        },
        { maxRetries: 1 }
      );
      
      this.recordTest(
        'Fallback Wrapper',
        fallbackResult.fallback && fallbackResult.originalError === 'Primary failed',
        'Fallback wrapper should work'
      );
      
    } catch (error) {
      this.recordTest('Retryable Operation Wrapper', false, error.message);
    }
  }

  async testRetryPolicies() {
    console.log('\n📋 Testing Retry Policies...');
    
    try {
      // Test network policy
      let networkAttempts = 0;
      try {
        const retryableOp = new RetryableOperation(this.recovery, RetryPolicies.NETWORK);
        await retryableOp.execute(async () => {
          networkAttempts++;
          const error = new Error('Connection timeout');
          error.code = 'ETIMEDOUT';
          throw error;
        });
      } catch (error) {
        // Expected to fail
      }
      
      this.recordTest(
        'Network Policy',
        networkAttempts === 4, // 1 initial + 3 retries
        'Network policy should retry timeout errors'
      );
      
      // Test API policy
      let apiAttempts = 0;
      try {
        const retryableOp = new RetryableOperation(this.recovery, RetryPolicies.API);
        await retryableOp.execute(async () => {
          apiAttempts++;
          const error = new Error('Rate limited');
          error.status = 429;
          throw error;
        });
      } catch (error) {
        // Expected to fail
      }
      
      this.recordTest(
        'API Policy',
        apiAttempts === 4, // 1 initial + 3 retries
        'API policy should retry rate limit errors'
      );
      
      // Test quick fail policy
      let quickFailAttempts = 0;
      try {
        const retryableOp = new RetryableOperation(this.recovery, RetryPolicies.QUICK_FAIL);
        await retryableOp.execute(async () => {
          quickFailAttempts++;
          throw new Error('Quick fail test');
        });
      } catch (error) {
        // Expected to fail
      }
      
      this.recordTest(
        'Quick Fail Policy',
        quickFailAttempts === 2, // 1 initial + 1 retry
        'Quick fail policy should have limited retries'
      );
      
    } catch (error) {
      this.recordTest('Retry Policies', false, error.message);
    }
  }

  async testRetryUtilities() {
    console.log('\n🛠️ Testing Retry Utilities...');
    
    try {
      // Test exponential backoff utility
      let expAttempts = 0;
      try {
        await RetryUtils.withExponentialBackoff(
          async () => {
            expAttempts++;
            throw new Error('Exponential backoff test');
          },
          2, // maxRetries
          50  // baseDelay
        );
      } catch (error) {
        // Expected to fail
      }
      
      this.recordTest(
        'Exponential Backoff Utility',
        expAttempts === 3, // 1 initial + 2 retries
        'Should use exponential backoff'
      );
      
      // Test custom condition utility
      let conditionAttempts = 0;
      const result = await RetryUtils.withCustomCondition(
        async () => {
          conditionAttempts++;
          if (conditionAttempts < 3) {
            const error = new Error('Retryable error');
            error.code = 'RETRY_ME';
            throw error;
          }
          return { success: true };
        },
        (error) => error.code === 'RETRY_ME',
        3
      );
      
      this.recordTest(
        'Custom Condition Utility',
        result.success && conditionAttempts === 3,
        'Should retry based on custom condition'
      );
      
      // Test batch retry utility
      const operations = [
        async () => ({ id: 1, success: true }),
        async () => { throw new Error('Batch error'); },
        async () => ({ id: 3, success: true })
      ];
      
      const batchResult = await RetryUtils.batchWithRetry(operations, { maxRetries: 1 });
      
      this.recordTest(
        'Batch Retry Utility',
        batchResult.successCount === 2 && batchResult.failureCount === 1,
        'Should handle batch operations with individual retries'
      );
      
    } catch (error) {
      this.recordTest('Retry Utilities', false, error.message);
    }
  }

  async testAgentIntegration() {
    console.log('\n🤖 Testing Agent Integration...');
    
    try {
      // Create agent with error recovery enabled
      const agent = new AnalystAgent({
        id: 'recovery-test-analyst',
        retryEnabled: true,
        maxRetries: 2,
        retryDelay: 100,
        logLevel: 'error' // Reduce logging for test
      });
      
      await agent.initialize(this.contextManager, null, this.recovery);
      
      this.recordTest(
        'Agent Recovery Integration',
        agent.errorRecovery !== null && agent.retryEnabled,
        'Agent should be initialized with error recovery'
      );
      
      // Test health check registration
      this.recordTest(
        'Health Check Registration',
        this.recovery.healthChecks.has('recovery-test-analyst'),
        'Agent should register health check'
      );
      
      // Simulate task with recovery
      let taskAttempts = 0;
      let taskRecovered = false;
      
      // Override the _executeTask method to simulate failures
      const originalExecuteTask = agent._executeTask.bind(agent);
      agent._executeTask = async (request) => {
        taskAttempts++;
        if (taskAttempts < 2) {
          const error = new Error('Simulated task failure');
          error.code = 'TEMPORARY_FAILURE';
          throw error;
        }
        taskRecovered = true;
        return { result: 'Task succeeded after recovery' };
      };
      
      try {
        const result = await agent.execute({
          taskId: 'recovery-integration-test',
          taskType: 'analyze-requirements',
          input: { requirements: 'test requirements' }
        });
        
        this.recordTest(
          'Task Recovery Integration',
          taskRecovered && taskAttempts === 2,
          'Task should recover after failure'
        );
        
      } catch (error) {
        this.recordTest(
          'Task Recovery Integration',
          false,
          `Task recovery failed: ${error.message}`
        );
      }
      
      // Test cleanup
      await agent.cleanup();
      this.recordTest(
        'Agent Cleanup',
        !this.recovery.healthChecks.has('recovery-test-analyst'),
        'Agent should unregister from health checks on cleanup'
      );
      
    } catch (error) {
      this.recordTest('Agent Integration', false, error.message);
    }
  }

  async testConcurrentRetries() {
    console.log('\n⚡ Testing Concurrent Retries...');
    
    try {
      const promises = [];
      const results = [];
      const agentId = 'concurrent-test-agent';
      
      // Start multiple concurrent operations
      for (let i = 0; i < 5; i++) {
        const promise = this.recovery.executeWithRetry(
          `concurrent-task-${i}`,
          agentId,
          async () => {
            // Random failure for first few attempts
            if (Math.random() < 0.7) {
              throw new Error(`Concurrent failure ${i}`);
            }
            return { taskId: i, success: true };
          },
          { maxRetries: 3, initialDelay: 50 }
        ).then(result => {
          results.push(result);
          return result;
        }).catch(error => {
          results.push({ error: error.message });
          return { error: error.message };
        });
        
        promises.push(promise);
      }
      
      // Wait for all operations to complete
      await Promise.all(promises);
      
      this.recordTest(
        'Concurrent Execution',
        results.length === 5,
        'Should handle concurrent retry operations'
      );
      
      // Check that some operations succeeded
      const successCount = results.filter(r => r.success).length;
      this.recordTest(
        'Concurrent Success Rate',
        successCount > 0,
        'Some concurrent operations should succeed'
      );
      
    } catch (error) {
      this.recordTest('Concurrent Retries', false, error.message);
    }
  }

  async testRecoveryStrategies() {
    console.log('\n🔧 Testing Recovery Strategies...');
    
    try {
      let strategyApplied = false;
      
      // Register custom recovery strategy
      this.recovery.registerRecoveryStrategy('test-strategy', {
        apply: async (taskId, agentId, error, attempt, context) => {
          strategyApplied = true;
          context.customValue = 'strategy-applied';
        }
      });
      
      // Execute with custom strategy
      try {
        await this.recovery.executeWithRetry(
          'strategy-test-task',
          'strategy-test-agent',
          async (context) => {
            if (!context.customValue) {
              throw new Error('Strategy test failure');
            }
            return { success: true, customValue: context.customValue };
          },
          { recoveryStrategy: 'test-strategy', maxRetries: 1 }
        );
      } catch (error) {
        // May fail, but strategy should still be applied
      }
      
      this.recordTest(
        'Custom Recovery Strategy',
        strategyApplied,
        'Custom recovery strategy should be applied'
      );
      
      // Test default strategy behavior
      let timeoutIncreased = false;
      await this.recovery.executeWithRetry(
        'default-strategy-test',
        'default-test-agent',
        async (context, attempt) => {
          if (attempt === 1) {
            const error = new Error('Timeout test');
            error.code = 'TIMEOUT';
            throw error;
          } else {
            timeoutIncreased = context.timeout > 30000;
            return { success: true };
          }
        },
        { timeout: 30000, maxRetries: 1 }
      );
      
      this.recordTest(
        'Default Recovery Strategy',
        timeoutIncreased,
        'Default strategy should increase timeout for timeout errors'
      );
      
    } catch (error) {
      this.recordTest('Recovery Strategies', false, error.message);
    }
  }

  async testHealthChecking() {
    console.log('\n🏥 Testing Health Checking...');
    
    try {
      const agentId = 'health-test-agent';
      let healthCheckCalled = false;
      let isHealthy = true;
      
      // Register health check
      this.recovery.registerHealthCheck(agentId, async () => {
        healthCheckCalled = true;
        return isHealthy;
      });
      
      // Wait for health check to run
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      this.recordTest(
        'Health Check Execution',
        healthCheckCalled,
        'Health check should be called automatically'
      );
      
      // Test unhealthy state
      isHealthy = false;
      healthCheckCalled = false;
      
      // Wait for next health check
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      this.recordTest(
        'Unhealthy Detection',
        healthCheckCalled,
        'Should detect unhealthy state'
      );
      
      // Test unregistering health check
      this.recovery.unregisterHealthCheck(agentId);
      
      this.recordTest(
        'Health Check Unregistration',
        !this.recovery.healthChecks.has(agentId),
        'Should unregister health check'
      );
      
    } catch (error) {
      this.recordTest('Health Checking', false, error.message);
    }
  }

  async testNonRetryableErrors() {
    console.log('\n🚫 Testing Non-Retryable Errors...');
    
    try {
      let attemptCount = 0;
      
      // Test that authentication errors are not retried
      try {
        await this.recovery.executeWithRetry(
          'auth-error-test',
          'auth-test-agent',
          async () => {
            attemptCount++;
            const error = new Error('Authentication failed');
            error.code = 'AUTH_FAILED';
            throw error;
          }
        );
      } catch (error) {
        // Expected to fail
      }
      
      this.recordTest(
        'Authentication Error No Retry',
        attemptCount === 1,
        'Authentication errors should not be retried'
      );
      
      // Test that 404 errors are not retried
      attemptCount = 0;
      try {
        await this.recovery.executeWithRetry(
          'not-found-test',
          'not-found-agent',
          async () => {
            attemptCount++;
            const error = new Error('Not found');
            error.status = 404;
            throw error;
          }
        );
      } catch (error) {
        // Expected to fail
      }
      
      this.recordTest(
        'Not Found Error No Retry',
        attemptCount === 1,
        '404 errors should not be retried'
      );
      
      // Test retryable error recognition
      const retryableError = new Error('Connection timeout');
      retryableError.code = 'ETIMEDOUT';
      
      this.recordTest(
        'Retryable Error Detection',
        this.recovery.isRetryableError(retryableError),
        'Should correctly identify retryable errors'
      );
      
      // Test non-retryable error recognition
      const nonRetryableError = new Error('Bad request');
      nonRetryableError.status = 400;
      
      this.recordTest(
        'Non-Retryable Error Detection',
        this.recovery.isNonRetryableError(nonRetryableError),
        'Should correctly identify non-retryable errors'
      );
      
    } catch (error) {
      this.recordTest('Non-Retryable Errors', false, error.message);
    }
  }

  async testTimeoutHandling() {
    console.log('\n⏰ Testing Timeout Handling...');
    
    try {
      let timeoutTriggered = false;
      
      // Test operation timeout
      try {
        await this.recovery.executeWithRetry(
          'timeout-test',
          'timeout-agent',
          async () => {
            return new Promise((resolve) => {
              setTimeout(resolve, 2000); // 2 second delay
            });
          },
          { timeout: 500, maxRetries: 1 } // 500ms timeout
        );
      } catch (error) {
        timeoutTriggered = error.message.includes('timeout');
      }
      
      this.recordTest(
        'Operation Timeout',
        timeoutTriggered,
        'Should timeout long-running operations'
      );
      
      // Test progressive timeout utility
      let progressiveAttempts = 0;
      let timeouts = [];
      
      try {
        await RetryUtils.withProgressiveTimeout(
          async () => {
            const start = Date.now();
            progressiveAttempts++;
            
            return new Promise((resolve, reject) => {
              setTimeout(() => {
                timeouts.push(Date.now() - start);
                reject(new Error('Progressive timeout test'));
              }, 1000);
            });
          },
          200, // base timeout
          2    // max retries
        );
      } catch (error) {
        // Expected to fail
      }
      
      this.recordTest(
        'Progressive Timeout',
        progressiveAttempts === 3,
        'Should use progressive timeout increases'
      );
      
    } catch (error) {
      this.recordTest('Timeout Handling', false, error.message);
    }
  }

  async testResourceCleanup() {
    console.log('\n🧹 Testing Resource Cleanup...');
    
    try {
      // Test cleanup on operation failure
      let cleanupCalled = false;
      
      try {
        await this.recovery.executeWithRetry(
          'cleanup-test',
          'cleanup-agent',
          async () => {
            throw new Error('Operation failed');
          },
          {
            maxRetries: 1,
            cleanup: async () => {
              cleanupCalled = true;
            }
          }
        );
      } catch (error) {
        // Expected to fail
      }
      
      this.recordTest(
        'Cleanup on Failure',
        cleanupCalled,
        'Should call cleanup function on operation failure'
      );
      
      // Test refresh functionality
      let refreshCalled = false;
      
      await this.recovery.executeWithRetry(
        'refresh-test',
        'refresh-agent',
        async (context, attempt) => {
          if (attempt === 1) {
            throw new Error('First attempt fails');
          }
          return { success: true, refreshed: refreshCalled };
        },
        {
          maxRetries: 1,
          refresh: async () => {
            refreshCalled = true;
          }
        }
      );
      
      this.recordTest(
        'Refresh on Retry',
        refreshCalled,
        'Should call refresh function before retry'
      );
      
      // Test manager cleanup
      const retryCountBefore = this.recovery.retryHistory.size;
      this.recovery.cleanup();
      const retryCountAfter = this.recovery.retryHistory.size;
      
      this.recordTest(
        'Manager Cleanup',
        retryCountAfter === 0 && !this.recovery.isActive,
        'Should clean up all resources and stop'
      );
      
    } catch (error) {
      this.recordTest('Resource Cleanup', false, error.message);
    }
  }

  async cleanupTestEnvironment() {
    console.log('\n🧹 Cleaning up test environment...');
    
    try {
      // Stop recovery manager
      if (this.recovery) {
        this.recovery.cleanup();
      }
      
      console.log('✅ Test environment cleanup complete');
      
    } catch (error) {
      console.error('⚠️  Cleanup warning:', error.message);
    }
  }

  recordTest(testName, passed, message) {
    this.results.total++;
    if (passed) {
      this.results.passed++;
      console.log(`  ✅ ${testName}`);
    } else {
      this.results.failed++;
      console.log(`  ❌ ${testName}: ${message}`);
    }
    
    this.results.details.push({
      name: testName,
      passed,
      message
    });
  }

  printResults() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 ERROR RECOVERY TEST RESULTS');
    console.log('='.repeat(60));
    console.log(`Total Tests: ${this.results.total}`);
    console.log(`Passed: ${this.results.passed} ✅`);
    console.log(`Failed: ${this.results.failed} ${this.results.failed > 0 ? '❌' : '✅'}`);
    console.log(`Success Rate: ${((this.results.passed / this.results.total) * 100).toFixed(1)}%`);
    
    if (this.results.failed > 0) {
      console.log('\n❌ FAILED TESTS:');
      this.results.details
        .filter(t => !t.passed)
        .forEach(test => {
          console.log(`  • ${test.name}: ${test.message}`);
        });
    }
    
    console.log('\n' + (this.results.failed === 0 ? 
      '🎉 ALL TESTS PASSED! Error recovery system is ready.' :
      '⚠️  Some tests failed. Please review and fix issues before deployment.'
    ));
    console.log('='.repeat(60));
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new ErrorRecoveryTest();
  
  tester.runAllTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Test execution failed:', error);
      process.exit(1);
    });
}

export { ErrorRecoveryTest };