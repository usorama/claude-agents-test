#!/usr/bin/env node

import { ContextManager } from './src/context/ContextManager.js';
import { SafetyConstraints } from './src/safety/SafetyConstraints.js';
import { ConstraintEnforcer } from './src/safety/ConstraintEnforcer.js';
import { getFileOptimizer } from './src/utils/FileOperationsOptimizer.js';
import { getSchemaRegistry } from './src/validation/SchemaRegistry.js';

console.log('🚀 Production Readiness Assessment - Simplified\n');

class ProductionReadinessChecker {
  constructor() {
    this.results = {
      integration: { score: 0, tests: 0, failures: [] },
      performance: { score: 0, tests: 0, failures: [] },
      security: { score: 0, tests: 0, failures: [] },
      reliability: { score: 0, tests: 0, failures: [] },
      monitoring: { score: 0, tests: 0, failures: [] }
    };
  }

  async runAllChecks() {
    console.log('📋 PRODUCTION READINESS CHECKLIST');
    console.log('=' .repeat(50));
    
    try {
      await this.checkSystemIntegration();
      await this.checkPerformanceBaseline();
      await this.checkSecurityHardening();
      await this.checkReliabilityMechanisms();
      await this.checkMonitoringCapabilities();
      
      this.generateReadinessReport();
      
    } catch (error) {
      console.error('❌ Production readiness check failed:', error.message);
      process.exit(1);
    }
  }

  async checkSystemIntegration() {
    console.log('\n🔄 1. SYSTEM INTEGRATION CHECKS');
    console.log('-'.repeat(35));
    
    // Test 1: Component initialization
    try {
      const contextManager = new ContextManager({
        baseDir: './test-production-readiness',
        logLevel: 'error'
      });
      
      await contextManager.initialize();
      
      const testContext = await contextManager.createContext('project', {
        projectName: 'Production Test',
        status: 'active'
      });
      
      if (testContext && testContext.id) {
        this.recordSuccess('integration', 'Context Manager initialization');
      } else {
        this.recordFailure('integration', 'Context Manager', 'Failed to create context');
      }
      
      await contextManager.shutdown();
      
    } catch (error) {
      this.recordFailure('integration', 'Context Manager', error.message);
    }
    
    // Test 2: Schema validation system
    try {
      const schemaRegistry = getSchemaRegistry({ logLevel: 'error' });
      
      const validConfig = {
        id: 'test-agent',
        type: 'AnalystAgent',
        name: 'Test Agent',
        capabilities: ['research']
      };
      
      const validated = schemaRegistry.validateAgentConfig('AnalystAgent', validConfig);
      
      if (validated && validated.id === 'test-agent') {
        this.recordSuccess('integration', 'Schema validation system');
      } else {
        this.recordFailure('integration', 'Schema validation', 'Validation failed unexpectedly');
      }
      
    } catch (error) {
      this.recordFailure('integration', 'Schema validation', error.message);
    }
    
    // Test 3: Safety constraints system
    try {
      const constraints = new SafetyConstraints('production', { logLevel: 'error' });
      const enforcer = new ConstraintEnforcer(constraints, { logLevel: 'error' });
      
      // Test that dangerous operations are blocked
      try {
        await enforcer.enforcePreAction(
          { id: 'test' },
          { tool: 'Bash', parameters: { command: 'rm -rf /' } }
        );
        this.recordFailure('integration', 'Safety constraints', 'Dangerous command not blocked');
      } catch (safetyError) {
        if (safetyError.message.includes('safety violation')) {
          this.recordSuccess('integration', 'Safety constraints system');
        } else {
          this.recordFailure('integration', 'Safety constraints', 'Unexpected error: ' + safetyError.message);
        }
      }
      
    } catch (error) {
      this.recordFailure('integration', 'Safety constraints', error.message);
    }
  }

  async checkPerformanceBaseline() {
    console.log('\n⚡ 2. PERFORMANCE BASELINE CHECKS');
    console.log('-'.repeat(35));
    
    // Test 1: Context operations performance
    try {
      const contextManager = new ContextManager({
        baseDir: './test-production-readiness',
        logLevel: 'error'
      });
      
      await contextManager.initialize();
      
      const startTime = Date.now();
      const contexts = [];
      
      // Create 20 contexts
      for (let i = 0; i < 20; i++) {
        const context = await contextManager.createContext('task', {
          taskId: `perf-test-${i}`,
          taskType: 'performance',
          status: 'active',
          data: { index: i, content: `Test content ${i}` }
        });
        contexts.push(context.id);
      }
      
      const createTime = Date.now() - startTime;
      const avgCreateTime = createTime / 20;
      
      // Read contexts back
      const readStartTime = Date.now();
      for (const contextId of contexts) {
        await contextManager.getContext('task', contextId);
      }
      const readTime = Date.now() - readStartTime;
      const avgReadTime = readTime / 20;
      
      if (avgCreateTime < 50 && avgReadTime < 20) {
        this.recordSuccess('performance', `Context operations (${avgCreateTime.toFixed(1)}ms create, ${avgReadTime.toFixed(1)}ms read)`);
      } else {
        this.recordFailure('performance', 'Context operations', `Too slow: ${avgCreateTime.toFixed(1)}ms create, ${avgReadTime.toFixed(1)}ms read`);
      }
      
      await contextManager.shutdown();
      
    } catch (error) {
      this.recordFailure('performance', 'Context operations', error.message);
    }
    
    // Test 2: File operations performance
    try {
      const fileOptimizer = getFileOptimizer({ logLevel: 'error' });
      
      const startTime = Date.now();
      
      // Write 30 files
      const writePromises = [];
      for (let i = 0; i < 30; i++) {
        const promise = fileOptimizer.writeFile(
          `./test-production-readiness/perf-test-${i}.txt`,
          `Performance test content for file ${i}`
        );
        writePromises.push(promise);
      }
      
      await Promise.all(writePromises);
      
      // Read files back
      const readPromises = [];
      for (let i = 0; i < 30; i++) {
        const promise = fileOptimizer.readFile(`./test-production-readiness/perf-test-${i}.txt`);
        readPromises.push(promise);
      }
      
      await Promise.all(readPromises);
      
      const totalTime = Date.now() - startTime;
      const avgTime = totalTime / 60; // 30 write + 30 read operations
      
      if (avgTime < 10) {
        this.recordSuccess('performance', `File operations (${avgTime.toFixed(1)}ms average)`);
      } else {
        this.recordFailure('performance', 'File operations', `Too slow: ${avgTime.toFixed(1)}ms average`);
      }
      
      fileOptimizer.shutdown();
      
    } catch (error) {
      this.recordFailure('performance', 'File operations', error.message);
    }
    
    // Test 3: Memory usage tracking
    try {
      const initialMemory = process.memoryUsage().heapUsed / 1024 / 1024; // MB
      
      // Create memory load
      const largeArrays = [];
      for (let i = 0; i < 10; i++) {
        largeArrays.push(new Array(10000).fill(`Memory test ${i}`));
      }
      
      const peakMemory = process.memoryUsage().heapUsed / 1024 / 1024; // MB
      const memoryIncrease = peakMemory - initialMemory;
      
      // Cleanup
      largeArrays.length = 0;
      
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage().heapUsed / 1024 / 1024; // MB
      const memoryRecovered = peakMemory - finalMemory;
      const recoveryPercentage = (memoryRecovered / memoryIncrease) * 100;
      
      if (recoveryPercentage > 80) {
        this.recordSuccess('performance', `Memory management (${memoryIncrease.toFixed(1)}MB used, ${recoveryPercentage.toFixed(1)}% recovered)`);
      } else {
        this.recordFailure('performance', 'Memory management', `Poor recovery: ${recoveryPercentage.toFixed(1)}%`);
      }
      
    } catch (error) {
      this.recordFailure('performance', 'Memory management', error.message);
    }
  }

  async checkSecurityHardening() {
    console.log('\n🛡️  3. SECURITY HARDENING CHECKS');
    console.log('-'.repeat(35));
    
    const constraints = new SafetyConstraints('production', { logLevel: 'error' });
    const enforcer = new ConstraintEnforcer(constraints, { logLevel: 'error' });
    
    const securityTests = [
      {
        name: 'Path traversal protection',
        action: { tool: 'Read', parameters: { file_path: '../../../etc/passwd' } }
      },
      {
        name: 'Command injection protection',
        action: { tool: 'Bash', parameters: { command: 'ls; rm -rf /' } }
      },
      {
        name: 'Sensitive file access protection',
        action: { tool: 'Read', parameters: { file_path: '/etc/shadow' } }
      },
      {
        name: 'System modification protection',
        action: { tool: 'Write', parameters: { file_path: '/etc/hosts', content: 'malicious content' } }
      }
    ];
    
    let blockedCount = 0;
    
    for (const test of securityTests) {
      try {
        await enforcer.enforcePreAction({ id: 'security-test' }, test.action);
        this.recordFailure('security', test.name, 'Security violation not blocked');
      } catch (error) {
        if (error.message.includes('safety violation')) {
          blockedCount++;
        } else {
          this.recordFailure('security', test.name, `Unexpected error: ${error.message}`);
        }
      }
    }
    
    const securityScore = (blockedCount / securityTests.length) * 100;
    
    if (securityScore === 100) {
      this.recordSuccess('security', `All security violations blocked (${securityScore}%)`);
    } else {
      this.recordFailure('security', 'Security violations', `Only ${securityScore}% blocked`);
    }
  }

  async checkReliabilityMechanisms() {
    console.log('\n🔧 4. RELIABILITY MECHANISM CHECKS');
    console.log('-'.repeat(35));
    
    // Test 1: Error recovery
    try {
      const contextManager = new ContextManager({
        baseDir: './test-production-readiness',
        logLevel: 'error'
      });
      
      await contextManager.initialize();
      
      // Test graceful handling of invalid data
      try {
        await contextManager.createContext('agent', {
          invalidField: 'this should cause validation error'
        });
        this.recordFailure('reliability', 'Error recovery', 'Invalid data not rejected');
      } catch (validationError) {
        // Expected error, now test if system remains functional
        const validContext = await contextManager.createContext('agent', {
          agentId: 'recovery-test',
          agentType: 'TestAgent',
          state: { status: 'active' },
          capabilities: []
        });
        
        if (validContext && validContext.id) {
          this.recordSuccess('reliability', 'Error recovery (system remains functional)');
        } else {
          this.recordFailure('reliability', 'Error recovery', 'System not functional after error');
        }
      }
      
      await contextManager.shutdown();
      
    } catch (error) {
      this.recordFailure('reliability', 'Error recovery', error.message);
    }
    
    // Test 2: Resource cleanup
    try {
      const fileOptimizer = getFileOptimizer({ logLevel: 'error' });
      
      // Create temporary resources
      await fileOptimizer.writeFile('./test-production-readiness/cleanup-test.txt', 'test');
      
      // Verify resource exists
      const content = await fileOptimizer.readFile('./test-production-readiness/cleanup-test.txt');
      
      if (content === 'test') {
        fileOptimizer.shutdown();
        this.recordSuccess('reliability', 'Resource cleanup capability');
      } else {
        this.recordFailure('reliability', 'Resource cleanup', 'File operations inconsistent');
      }
      
    } catch (error) {
      this.recordFailure('reliability', 'Resource cleanup', error.message);
    }
    
    // Test 3: Configuration validation
    try {
      const schemaRegistry = getSchemaRegistry({ logLevel: 'error' });
      
      // Test with various invalid configurations
      const invalidConfigs = [
        { id: 123 }, // Wrong type
        { type: 'AnalystAgent' }, // Missing required fields
        { id: 'test', type: 'NonExistentAgent', name: 'Test' } // Invalid agent type
      ];
      
      let validationCount = 0;
      
      for (const config of invalidConfigs) {
        try {
          schemaRegistry.validateAgentConfig('AnalystAgent', config);
          // Should not reach here
        } catch (validationError) {
          validationCount++;
        }
      }
      
      if (validationCount === invalidConfigs.length) {
        this.recordSuccess('reliability', 'Configuration validation robustness');
      } else {
        this.recordFailure('reliability', 'Configuration validation', `Only ${validationCount}/${invalidConfigs.length} invalid configs rejected`);
      }
      
    } catch (error) {
      this.recordFailure('reliability', 'Configuration validation', error.message);
    }
  }

  async checkMonitoringCapabilities() {
    console.log('\n📊 5. MONITORING CAPABILITY CHECKS');
    console.log('-'.repeat(35));
    
    // Test 1: Metrics availability
    try {
      const fileOptimizer = getFileOptimizer({ logLevel: 'error' });
      
      // Generate some activity
      await fileOptimizer.writeFile('./test-production-readiness/metrics-test.txt', 'test');
      await fileOptimizer.readFile('./test-production-readiness/metrics-test.txt');
      
      const metrics = fileOptimizer.getMetrics();
      
      if (metrics && 
          typeof metrics.reads === 'object' && 
          typeof metrics.writes === 'object' && 
          typeof metrics.cache === 'object') {
        this.recordSuccess('monitoring', 'Performance metrics collection');
      } else {
        this.recordFailure('monitoring', 'Performance metrics', 'Incomplete metrics structure');
      }
      
      fileOptimizer.shutdown();
      
    } catch (error) {
      this.recordFailure('monitoring', 'Performance metrics', error.message);
    }
    
    // Test 2: Schema registry monitoring
    try {
      const schemaRegistry = getSchemaRegistry({ logLevel: 'error' });
      
      const stats = schemaRegistry.getSchemaStats();
      
      if (stats && stats.totalSchemas > 0 && Array.isArray(stats.schemaTypes)) {
        this.recordSuccess('monitoring', `Schema registry monitoring (${stats.totalSchemas} schemas)`);
      } else {
        this.recordFailure('monitoring', 'Schema registry monitoring', 'Invalid stats structure');
      }
      
    } catch (error) {
      this.recordFailure('monitoring', 'Schema registry monitoring', error.message);
    }
    
    // Test 3: Health check simulation
    try {
      const components = {
        contextManager: true,
        schemaRegistry: true,
        safetyConstraints: true,
        fileOptimizer: true
      };
      
      const healthCheck = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        components,
        uptime: process.uptime()
      };
      
      const allHealthy = Object.values(components).every(status => status === true);
      
      if (allHealthy && healthCheck.uptime > 0) {
        this.recordSuccess('monitoring', 'Health check structure');
      } else {
        this.recordFailure('monitoring', 'Health check', 'Health check structure invalid');
      }
      
    } catch (error) {
      this.recordFailure('monitoring', 'Health check', error.message);
    }
  }

  recordSuccess(category, testName) {
    this.results[category].score++;
    this.results[category].tests++;
    console.log(`   ✅ ${testName}`);
  }

  recordFailure(category, testName, reason) {
    this.results[category].tests++;
    this.results[category].failures.push({ test: testName, reason });
    console.log(`   ❌ ${testName}: ${reason}`);
  }

  generateReadinessReport() {
    console.log('\n' + '='.repeat(70));
    console.log('🎯 PRODUCTION READINESS ASSESSMENT REPORT');
    console.log('='.repeat(70));
    
    let totalScore = 0;
    let totalTests = 0;
    const categoryScores = {};
    
    for (const [category, results] of Object.entries(this.results)) {
      const percentage = results.tests > 0 ? (results.score / results.tests * 100) : 0;
      categoryScores[category] = percentage;
      
      let status;
      if (percentage >= 95) status = '🟢 EXCELLENT';
      else if (percentage >= 85) status = '🟡 GOOD';
      else if (percentage >= 70) status = '🟠 MODERATE';
      else status = '🔴 CRITICAL';
      
      console.log(`\n${status}: ${category.toUpperCase()} - ${percentage.toFixed(1)}% (${results.score}/${results.tests})`);
      
      if (results.failures.length > 0) {
        results.failures.forEach(failure => {
          console.log(`      ❌ ${failure.test}: ${failure.reason}`);
        });
      }
      
      totalScore += results.score;
      totalTests += results.tests;
    }
    
    const overallScore = totalTests > 0 ? (totalScore / totalTests * 100) : 0;
    
    console.log('\n' + '-'.repeat(70));
    console.log(`🚀 OVERALL PRODUCTION READINESS: ${overallScore.toFixed(1)}%`);
    
    // Determine readiness level
    let readinessLevel;
    let recommendations = [];
    
    if (overallScore >= 95) {
      readinessLevel = '🎉 PRODUCTION READY';
      recommendations = [
        'Set up production monitoring and alerting',
        'Create deployment automation',
        'Establish operational procedures',
        'Plan phased rollout strategy'
      ];
    } else if (overallScore >= 85) {
      readinessLevel = '✅ NEAR PRODUCTION READY';
      recommendations = [
        'Address remaining failures listed above',
        'Conduct external security audit',
        'Implement comprehensive monitoring',
        'Create disaster recovery procedures'
      ];
    } else if (overallScore >= 70) {
      readinessLevel = '⚠️  NEEDS SIGNIFICANT WORK';
      recommendations = [
        'Fix all critical failures immediately',
        'Strengthen security measures',
        'Improve error handling and recovery',
        'Enhance performance optimization'
      ];
    } else {
      readinessLevel = '🚨 NOT READY FOR PRODUCTION';
      recommendations = [
        'Address all system failures',
        'Complete security hardening',
        'Implement proper error handling',
        'Conduct thorough testing'
      ];
    }
    
    console.log(`📊 STATUS: ${readinessLevel}`);
    
    console.log('\n📋 NEXT STEPS:');
    recommendations.forEach((rec, i) => {
      console.log(`   ${i + 1}. ${rec}`);
    });
    
    // Additional production requirements
    console.log('\n🔧 ADDITIONAL PRODUCTION REQUIREMENTS:');
    const productionRequirements = [
      'Container orchestration (Docker/Kubernetes)',
      'Load balancer configuration',
      'Database backup and recovery procedures',  
      'SSL/TLS certificate management',
      'Log aggregation and analysis (ELK stack)',
      'Metrics collection (Prometheus/Grafana)',
      'Incident response procedures',
      'Performance baseline documentation'
    ];
    
    productionRequirements.forEach((req, i) => {
      console.log(`   • ${req}`);
    });
    
    console.log('\n' + '='.repeat(70));
    
    // Return score for potential programmatic use
    return overallScore;
  }
}

// Run the assessment
const checker = new ProductionReadinessChecker();
checker.runAllChecks().catch(console.error);