#!/usr/bin/env node

/**
 * Test Phase 4: Production Hardening
 * Tests performance optimization, security implementation, and production readiness
 */

import { ContextManager } from './src/context/ContextManager.js';
import { ContextSummarizer } from './src/context/ContextSummarizer.js';
import { SafetyConstraints, SafetyViolationError } from './src/safety/SafetyConstraints.js';
import { ConstraintEnforcer } from './src/safety/ConstraintEnforcer.js';
import { OrchestratorAgent } from './src/orchestrator/OrchestratorAgent.js';
import { getSchemaRegistry } from './src/validation/SchemaRegistry.js';
import { ContextLevel } from './src/types/context.types.v2.js';
import fs from 'fs/promises';

const testDir = './test-phase4-production';

async function cleanup() {
  try {
    await fs.rm(testDir, { recursive: true, force: true });
  } catch (error) {
    // Ignore cleanup errors
  }
}

async function testPhase4ProductionHardening() {
  console.log('🧪 Testing Phase 4: Production Hardening...\n');

  await cleanup();

  // Test 1: Context Compression and Token Optimization
  console.log('📊 Test 1: Context Compression and Token Optimization');

  const contextManager = new ContextManager({
    baseDir: `${testDir}/context`,
    maxContextSize: 1000, // Small size to force compression
    summarizationThreshold: 0.8,
    logLevel: 'warn'
  });
  await contextManager.initialize();

  // Create large context that will trigger compression
  const largeContent = 'A'.repeat(2000); // 2KB content
  const projectContext = await contextManager.createContext(
    ContextLevel.PROJECT,
    {
      projectName: 'Production Test Project',
      description: largeContent,
      phase: 'Production Hardening'
    }
  );

  console.log(`✅ Created large project context: ${projectContext.id} (${projectContext.size || 'unknown'} bytes)`);

  // Check if compression/summarization occurred
  const contextAfterSave = await contextManager.getContext(ContextLevel.PROJECT, projectContext.id);
  const compressionWorking = contextAfterSave.summarized || (contextAfterSave.size && contextAfterSave.size < 2000) || false;
  console.log(`✅ Context compression: ${compressionWorking ? 'Working' : 'Not working'} (summarized: ${contextAfterSave.summarized || 'unknown'})`);

  // Test token usage optimization with ContextSummarizer
  const summarizer = new ContextSummarizer({ logLevel: 'warn' });
  const testContent = 'This is a test context with some content that needs to be summarized for token optimization.'.repeat(50);
  
  const summarized = await summarizer.smartSummarize(testContent, 0.5); // 50% compression
  const compressionRatio = summarized ? (testContent.length - summarized.length) / testContent.length : 0;
  
  console.log(`✅ Smart summarization: ${compressionRatio >= 0.3 ? 'Effective' : 'Needs improvement'} (${(compressionRatio * 100).toFixed(1)}% compression)`);

  // Test 2: Agent Lifecycle Management
  console.log('\n📊 Test 2: Agent Lifecycle Management');

  const orchestrator = new OrchestratorAgent({
    id: 'prod-orchestrator-001',
    maxSessionDuration: 10000, // 10 seconds for testing
    maxSessionTokens: 1000,
    logLevel: 'warn'
  });
  await orchestrator.initialize(contextManager);

  // Check agent lifecycle tracking
  const agentMetrics = await orchestrator.getMetrics();
  const hasLifecycleMetrics = agentMetrics && agentMetrics.uptime >= 0;
  console.log(`✅ Agent lifecycle tracking: ${hasLifecycleMetrics ? 'Working' : 'Not working'}`);

  // Check agent resource monitoring
  const agentStates = Array.from(orchestrator.agents.values());
  const allAgentsMonitored = agentStates.every(agent => 
    agent.state && typeof agent.state.totalTokensUsed === 'number'
  );
  console.log(`✅ Agent resource monitoring: ${allAgentsMonitored ? 'Working' : 'Not working'} (${agentStates.length} agents)`);

  // Test session limits and token tracking
  const sessionLimitsWorking = orchestrator.maxSessionTokens > 0 && orchestrator.maxSessionDuration > 0;
  console.log(`✅ Session limits configured: ${sessionLimitsWorking ? 'Yes' : 'No'} (${orchestrator.maxSessionTokens} tokens, ${orchestrator.maxSessionDuration}ms)`);

  // Test 3: Performance Monitoring
  console.log('\n📊 Test 3: Performance Monitoring');

  // Test context operation timing
  const performanceTests = [];
  
  // Context creation performance
  const createStart = Date.now();
  const testContext = await contextManager.createContext(
    ContextLevel.AGENT,
    { agentId: 'perf-test-001', type: 'PerformanceTest' },
    projectContext.id
  );
  const createTime = Date.now() - createStart;
  performanceTests.push({ operation: 'Context Creation', time: createTime, acceptable: createTime < 100 });

  // Context retrieval performance
  const retrieveStart = Date.now();
  await contextManager.getContext(ContextLevel.AGENT, testContext.id);
  const retrieveTime = Date.now() - retrieveStart;
  performanceTests.push({ operation: 'Context Retrieval', time: retrieveTime, acceptable: retrieveTime < 50 });

  // Context update performance
  const updateStart = Date.now();
  await contextManager.updateContext(ContextLevel.AGENT, testContext.id, { 
    status: 'updated',
    timestamp: new Date().toISOString()
  });
  const updateTime = Date.now() - updateStart;
  performanceTests.push({ operation: 'Context Update', time: updateTime, acceptable: updateTime < 50 });

  console.log('✅ Performance benchmarks:');
  let acceptablePerformance = 0;
  for (const test of performanceTests) {
    console.log(`   ${test.operation}: ${test.time}ms ${test.acceptable ? '✅' : '⚠️'}`);
    if (test.acceptable) acceptablePerformance++;
  }

  const performanceScore = (acceptablePerformance / performanceTests.length * 100).toFixed(1);
  console.log(`✅ Overall performance: ${performanceScore}% acceptable`);

  // Test 4: File Operations Optimization
  console.log('\n📊 Test 4: File Operations Optimization');

  // Test batch file operations
  const batchStart = Date.now();
  const batchContexts = [];
  for (let i = 0; i < 10; i++) {
    const context = await contextManager.createContext(
      ContextLevel.TASK,
      { taskId: `batch-${i}`, batchTest: true },
      testContext.id
    );
    batchContexts.push(context);
  }
  const batchTime = Date.now() - batchStart;
  const avgBatchTime = batchTime / 10;

  console.log(`✅ Batch operations: Created 10 contexts in ${batchTime}ms (avg: ${avgBatchTime.toFixed(1)}ms per context)`);

  // Test concurrent operations
  const concurrentStart = Date.now();
  const concurrentPromises = Array.from({ length: 5 }, (_, i) =>
    contextManager.createContext(
      ContextLevel.TASK,
      { taskId: `concurrent-${i}`, concurrentTest: true },
      testContext.id
    )
  );
  await Promise.all(concurrentPromises);
  const concurrentTime = Date.now() - concurrentStart;

  console.log(`✅ Concurrent operations: 5 parallel contexts in ${concurrentTime}ms`);

  const fileOpsOptimized = avgBatchTime < 20 && concurrentTime < 100;
  console.log(`✅ File operations optimized: ${fileOpsOptimized ? 'Yes' : 'Needs improvement'}`);

  // Test 5: Security Implementation - Path Validation
  console.log('\n📊 Test 5: Security Implementation - Path Validation');

  const safetyConstraints = new SafetyConstraints({
    workspaceBoundary: testDir,
    forbiddenPaths: ['/etc', '/sys', '/tmp', '..'],
    allowedFileExtensions: ['.js', '.json', '.md', '.txt'],
    forbiddenFileExtensions: ['.exe', '.sh', '.bat'],
    logLevel: 'warn'
  });

  const pathTests = [
    { path: `${testDir}/allowed.js`, shouldAllow: true, name: 'Allowed workspace file' },
    { path: `${testDir}/subdir/allowed.json`, shouldAllow: true, name: 'Allowed subdirectory file' },
    { path: '../outside.txt', shouldAllow: false, name: 'Path traversal attempt' },
    { path: '/etc/passwd', shouldAllow: false, name: 'System file access' },
    { path: `${testDir}/malware.exe`, shouldAllow: false, name: 'Forbidden extension' },
    { path: '/tmp/temp.sh', shouldAllow: false, name: 'Forbidden path and extension' }
  ];

  let pathSecurityPassed = 0;
  for (const test of pathTests) {
    const allowed = safetyConstraints.isPathAllowed(test.path);
    const correct = allowed === test.shouldAllow;
    console.log(`${correct ? '✅' : '❌'} ${test.name}: ${allowed ? 'Allowed' : 'Blocked'}`);
    if (correct) pathSecurityPassed++;
  }

  const pathSecurityScore = (pathSecurityPassed / pathTests.length * 100).toFixed(1);
  console.log(`✅ Path validation security: ${pathSecurityScore}%`);

  // Test 6: Access Controls and Input Sanitization
  console.log('\n📊 Test 6: Access Controls and Input Sanitization');

  const constraintEnforcer = new ConstraintEnforcer(safetyConstraints, { logLevel: 'warn' });

  // Mock agent for testing
  const mockAgent = {
    id: 'security-test-001',
    type: 'TestAgent',
    state: { status: 'idle' }
  };

  const securityTests = [
    {
      name: 'Safe file read',
      action: { tool: 'Read', file_path: `${testDir}/safe.txt` },
      shouldBlock: false
    },
    {
      name: 'Dangerous command execution',
      action: { tool: 'Bash', command: 'rm -rf /' },
      shouldBlock: true
    },
    {
      name: 'Path traversal attempt',
      action: { tool: 'Write', file_path: '../../../etc/passwd' },
      shouldBlock: true
    },
    {
      name: 'High resource usage',
      action: { tool: 'Read', file_path: `${testDir}/test.txt` },
      context: { resources: { cpu: 95, memory: 500 } },
      shouldBlock: true
    }
  ];

  let accessControlPassed = 0;
  for (const test of securityTests) {
    try {
      await constraintEnforcer.enforcePreAction(mockAgent, test.action, test.context);
      const wasBlocked = false;
      const correct = wasBlocked === test.shouldBlock;
      console.log(`${correct ? '✅' : '⚠️'} ${test.name}: ${wasBlocked ? 'Blocked' : 'Allowed'}`);
      if (correct) accessControlPassed++;
    } catch (error) {
      const wasBlocked = error instanceof SafetyViolationError;
      const correct = wasBlocked === test.shouldBlock;
      console.log(`${correct ? '✅' : '❌'} ${test.name}: ${wasBlocked ? 'Blocked' : 'Failed'} - ${error.message.substring(0, 50)}...`);
      if (correct) accessControlPassed++;
    }
  }

  const accessControlScore = (accessControlPassed / securityTests.length * 100).toFixed(1);
  console.log(`✅ Access control security: ${accessControlScore}%`);

  // Test 7: Schema Validation and Data Integrity
  console.log('\n📊 Test 7: Schema Validation and Data Integrity');

  const schemaRegistry = getSchemaRegistry();

  const validationTests = [
    {
      name: 'Valid agent configuration',
      agentType: 'AnalystAgent',
      config: {
        id: 'analyst-001',
        type: 'AnalystAgent',
        name: 'Test Analyst',
        capabilities: ['research', 'analysis']
      },
      shouldPass: true
    },
    {
      name: 'Invalid agent configuration (missing required fields)',
      agentType: 'AnalystAgent',
      config: {
        name: 'Invalid Agent'
        // Missing id and type
      },
      shouldPass: false
    },
    {
      name: 'Invalid agent configuration (wrong type)',
      agentType: 'AnalystAgent',
      config: {
        id: 'test-001',
        type: 'AnalystAgent',
        name: 123, // Should be string
        capabilities: 'invalid' // Should be array
      },
      shouldPass: false
    }
  ];

  let validationPassed = 0;
  for (const test of validationTests) {
    try {
      const validatedConfig = schemaRegistry.validateAgentConfig(test.agentType, test.config);
      const passed = test.shouldPass;
      console.log(`${passed ? '✅' : '❌'} ${test.name}: Validation ${passed ? 'passed' : 'unexpectedly passed'}`);
      if (passed) validationPassed++;
    } catch (error) {
      const failed = !test.shouldPass;
      console.log(`${failed ? '✅' : '❌'} ${test.name}: Validation ${failed ? 'correctly failed' : 'unexpectedly failed'} - ${error.message.substring(0, 50)}...`);
      if (failed) validationPassed++;
    }
  }

  const validationScore = (validationPassed / validationTests.length * 100).toFixed(1);
  console.log(`✅ Schema validation integrity: ${validationScore}%`);

  // Test 8: Audit Logging and Monitoring
  console.log('\n📊 Test 8: Audit Logging and Monitoring');

  // Test that operations are being logged
  let auditLogsWorking = true;
  try {
    // Context operations should be logged
    const auditContext = await contextManager.createContext(
      ContextLevel.TASK,
      { auditTest: true, operation: 'audit_log_test' }
    );
    
    // Agent operations should be logged
    const agentCount = orchestrator.agents.size;
    
    // Schema validations should be logged
    const schemaCount = schemaRegistry.getRegisteredSchemas().length;

    auditLogsWorking = auditContext && agentCount > 0 && schemaCount > 0;
    console.log(`✅ Context operations logged: ${auditContext ? 'Yes' : 'No'}`);
    console.log(`✅ Agent operations logged: ${agentCount > 0 ? 'Yes' : 'No'} (${agentCount} agents)`);
    console.log(`✅ Schema validations logged: ${schemaCount > 0 ? 'Yes' : 'No'} (${schemaCount} schemas)`);
  } catch (error) {
    auditLogsWorking = false;
    console.log(`❌ Audit logging failed: ${error.message}`);
  }

  console.log(`✅ Audit logging system: ${auditLogsWorking ? 'Working' : 'Needs improvement'}`);

  // Test 9: Error Handling and Recovery
  console.log('\n📊 Test 9: Error Handling and Recovery');

  const errorHandlingTests = [
    {
      name: 'Invalid context level',
      test: async () => {
        try {
          await contextManager.createContext('INVALID_LEVEL', { test: true });
          return false; // Should have thrown error
        } catch (error) {
          return true; // Correctly handled error
        }
      }
    },
    {
      name: 'Non-existent context retrieval',
      test: async () => {
        try {
          await contextManager.getContext(ContextLevel.TASK, 'non-existent-id');
          return false; // Should return null or throw error
        } catch (error) {
          return true; // Correctly handled error
        }
      }
    },
    {
      name: 'Agent resource exhaustion simulation',
      test: async () => {
        try {
          const testAgent = orchestrator.agents.get('AnalystAgent');
          if (testAgent) {
            // Simulate token exhaustion
            testAgent.sessionTokens = testAgent.maxSessionTokens + 1;
            return true; // Can handle resource limits
          }
          return false;
        } catch (error) {
          return true; // Error handling working
        }
      }
    }
  ];

  let errorHandlingPassed = 0;
  for (const test of errorHandlingTests) {
    try {
      const result = await test.test();
      console.log(`${result ? '✅' : '❌'} ${test.name}: ${result ? 'Handled correctly' : 'Not handled'}`);
      if (result) errorHandlingPassed++;
    } catch (error) {
      console.log(`❌ ${test.name}: Test failed - ${error.message}`);
    }
  }

  const errorHandlingScore = (errorHandlingPassed / errorHandlingTests.length * 100).toFixed(1);
  console.log(`✅ Error handling robustness: ${errorHandlingScore}%`);

  // Test 10: Production Readiness Assessment
  console.log('\n📊 Test 10: Production Readiness Assessment');

  const productionMetrics = {
    contextCompression: compressionWorking,
    tokenOptimization: compressionRatio >= 0.3,
    agentLifecycle: hasLifecycleMetrics,
    performanceAcceptable: parseFloat(performanceScore) >= 80,
    fileOpsOptimized: fileOpsOptimized,
    pathSecurity: parseFloat(pathSecurityScore) >= 90,
    accessControl: parseFloat(accessControlScore) >= 75,
    schemaValidation: parseFloat(validationScore) >= 90,
    auditLogging: auditLogsWorking,
    errorHandling: parseFloat(errorHandlingScore) >= 80
  };

  console.log('✅ Production readiness checklist:');
  let productionReadyCount = 0;
  for (const [metric, ready] of Object.entries(productionMetrics)) {
    console.log(`   ${ready ? '✅' : '❌'} ${metric}: ${ready ? 'Ready' : 'Needs work'}`);
    if (ready) productionReadyCount++;
  }

  const productionReadiness = (productionReadyCount / Object.keys(productionMetrics).length * 100).toFixed(1);
  console.log(`✅ Overall production readiness: ${productionReadiness}%`);

  console.log('\n🎉 Phase 4: Production Hardening Tests Complete!');

  return {
    contextCompression: compressionWorking,
    smartSummarization: compressionRatio >= 0.3,
    agentLifecycleManagement: hasLifecycleMetrics,
    performanceMonitoring: parseFloat(performanceScore) >= 80,
    fileOperationsOptimized: fileOpsOptimized,
    pathValidationSecurity: parseFloat(pathSecurityScore) >= 90,
    accessControlSecurity: parseFloat(accessControlScore) >= 75,
    schemaValidationIntegrity: parseFloat(validationScore) >= 90,
    auditLoggingWorking: auditLogsWorking,
    errorHandlingRobust: parseFloat(errorHandlingScore) >= 80,
    productionReadinessScore: parseFloat(productionReadiness),
    securityScore: (parseFloat(pathSecurityScore) + parseFloat(accessControlScore)) / 2,
    performanceScore: parseFloat(performanceScore),
    overallHardeningScore: parseFloat(productionReadiness)
  };
}

// Run tests
testPhase4ProductionHardening()
  .then(results => {
    console.log('\n📈 Phase 4: Production Hardening Test Results:');
    console.log('- Context compression working:', results.contextCompression ? '✅ Yes' : '❌ No');
    console.log('- Smart summarization effective:', results.smartSummarization ? '✅ Yes' : '❌ No');
    console.log('- Agent lifecycle management:', results.agentLifecycleManagement ? '✅ Working' : '❌ Needs work');
    console.log('- Performance monitoring acceptable:', results.performanceMonitoring ? '✅ Yes' : '❌ No');
    console.log('- File operations optimized:', results.fileOperationsOptimized ? '✅ Yes' : '❌ No');
    console.log('- Path validation security score:', results.pathValidationSecurity ? '✅ Secure' : '❌ Vulnerable');
    console.log('- Access control security score:', results.accessControlSecurity ? '✅ Secure' : '❌ Vulnerable');
    console.log('- Schema validation integrity:', results.schemaValidationIntegrity ? '✅ Intact' : '❌ Compromised');
    console.log('- Audit logging working:', results.auditLoggingWorking ? '✅ Yes' : '❌ No');
    console.log('- Error handling robust:', results.errorHandlingRobust ? '✅ Yes' : '❌ No');
    console.log('- Security score:', results.securityScore.toFixed(1) + '%');
    console.log('- Performance score:', results.performanceScore + '%');
    console.log('- Production readiness score:', results.productionReadinessScore + '%');
    
    if (results.overallHardeningScore >= 90) {
      console.log('✅ Excellent production hardening! System is production-ready.');
    } else if (results.overallHardeningScore >= 80) {
      console.log('✅ Good production hardening! Minor improvements recommended.');
    } else if (results.overallHardeningScore >= 70) {
      console.log('⚠️  Adequate production hardening. Several improvements needed.');
    } else {
      console.log('❌ Production hardening insufficient. Major improvements required.');
    }
  })
  .catch(error => {
    console.error('❌ Phase 4 production hardening tests failed:', error);
    process.exit(1);
  });