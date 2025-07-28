#!/usr/bin/env node

/**
 * Test Agent Safety Constraints and Guardrails (IMP-005)
 * Tests resource limits, action whitelisting/blacklisting, confirmation flows,
 * and violation tracking
 */

import { SafetyConstraints, SafetyViolationError } from './src/safety/SafetyConstraints.js';
import { ConstraintEnforcer } from './src/safety/ConstraintEnforcer.js';
import { BaseAgent } from './src/agents/BaseAgent.js';
import { ContextManager } from './src/context/ContextManager.js';
import fs from 'fs/promises';

const testDir = './test-safety-constraints';

async function cleanup() {
  try {
    await fs.rm(testDir, { recursive: true, force: true });
  } catch (error) {
    // Ignore cleanup errors
  }
}

async function testSafetyConstraints() {
  console.log('🧪 Testing Agent Safety Constraints and Guardrails (IMP-005)...\n');

  await cleanup();

  // Test 1: SafetyConstraints basic validation
  console.log('📊 Test 1: SafetyConstraints basic validation');

  const constraints = new SafetyConstraints({
    maxCpuPercent: 70,
    maxMemoryMB: 256,
    maxExecutionTimeMs: 120000, // 2 minutes
    maxFileOperations: 50,
    allowedTools: ['Read', 'Write', 'Edit', 'Grep', 'Glob'],
    forbiddenTools: ['Bash'],
    forbiddenPaths: ['/etc', '/sys', '/tmp'],
    requireConfirmation: ['Write', 'Edit'],
    forbiddenCommands: ['rm -rf', 'sudo', 'chmod 777'],
    workspaceBoundary: testDir,
    logLevel: 'warn'
  });

  console.log('✅ SafetyConstraints initialized with custom configuration');

  // Test allowed tool
  const readAllowed = constraints.isToolAllowed('Read');
  console.log(`✅ Read tool allowed: ${readAllowed}`);

  // Test forbidden tool
  const bashAllowed = constraints.isToolAllowed('Bash');
  console.log(`✅ Bash tool forbidden: ${!bashAllowed}`);

  // Test path validation
  const validPath = constraints.isPathAllowed(`${testDir}/test.txt`);
  const invalidPath = constraints.isPathAllowed('/etc/passwd');
  console.log(`✅ Valid path allowed: ${validPath}`);
  console.log(`✅ Invalid path forbidden: ${!invalidPath}`);

  // Test 2: Action validation with violations
  console.log('\n📊 Test 2: Action validation with violations');

  const testActions = [
    {
      name: 'Valid Read Action',
      action: { tool: 'Read', file_path: `${testDir}/test.txt` },
      context: { resources: { cpu: 30, memory: 100, fileOps: 5 }, concurrentTasks: 2 },
      shouldViolate: false
    },
    {
      name: 'Forbidden Tool Action',
      action: { tool: 'Bash', command: 'ls -la' },
      context: { resources: { cpu: 30, memory: 100 }, concurrentTasks: 2 },
      shouldViolate: true
    },
    {
      name: 'High CPU Usage Action',
      action: { tool: 'Read', file_path: `${testDir}/test.txt` },
      context: { resources: { cpu: 80, memory: 100, fileOps: 5 }, concurrentTasks: 2 },
      shouldViolate: true
    },
    {
      name: 'High Memory Usage Action',
      action: { tool: 'Write', file_path: `${testDir}/test.txt` },
      context: { resources: { cpu: 30, memory: 300, fileOps: 5 }, concurrentTasks: 2 },
      shouldViolate: true
    },
    {
      name: 'Forbidden Path Action',
      action: { tool: 'Read', file_path: '/etc/passwd' },
      context: { resources: { cpu: 30, memory: 100, fileOps: 5 }, concurrentTasks: 2 },
      shouldViolate: true
    },
    {
      name: 'Too Many File Operations',
      action: { tool: 'Read', file_path: `${testDir}/test.txt` },
      context: { resources: { cpu: 30, memory: 100, fileOps: 60 }, concurrentTasks: 2 },
      shouldViolate: true
    },
    {
      name: 'Forbidden Command',
      action: { tool: 'Bash', command: 'sudo rm -rf /' },
      context: { resources: { cpu: 30, memory: 100 }, concurrentTasks: 2 },
      shouldViolate: true
    }
  ];

  let correctValidations = 0;
  for (const test of testActions) {
    const violations = constraints.validate(test.action, test.context);
    const hasViolations = violations.length > 0;
    const isCorrect = hasViolations === test.shouldViolate;
    
    console.log(`${isCorrect ? '✅' : '❌'} ${test.name}: ${violations.length} violations (expected: ${test.shouldViolate ? 'some' : 'none'})`);
    
    if (violations.length > 0) {
      console.log(`   Violations: ${violations.map(v => `${v.type}(${v.severity})`).join(', ')}`);
    }
    
    if (isCorrect) correctValidations++;
  }

  const validationAccuracy = (correctValidations / testActions.length * 100).toFixed(1);
  console.log(`\nValidation accuracy: ${validationAccuracy}%`);

  // Test 3: ConstraintEnforcer integration
  console.log('\n📊 Test 3: ConstraintEnforcer integration');

  const enforcer = new ConstraintEnforcer(constraints, {
    throttleDelay: 500,
    maxViolationsBeforeThrottle: 3,
    maxViolationsBeforeShutdown: 5,
    logLevel: 'warn'
  });

  console.log('✅ ConstraintEnforcer initialized');

  // Mock agent for testing
  const mockAgent = {
    id: 'test-agent-001',
    type: 'TestAgent',
    state: { status: 'idle' }
  };

  // Test enforcement with valid action
  try {
    const validAction = { tool: 'Read', file_path: `${testDir}/test.txt` };
    await enforcer.enforcePreAction(mockAgent, validAction);
    console.log('✅ Valid action enforcement passed');
  } catch (error) {
    console.log(`❌ Valid action enforcement failed: ${error.message}`);
  }

  // Test enforcement with critical violation
  try {
    const criticalAction = { tool: 'Bash', command: 'sudo rm -rf /' };
    await enforcer.enforcePreAction(mockAgent, criticalAction);
    console.log('❌ Critical action should have been blocked');
  } catch (error) {
    if (error instanceof SafetyViolationError) {
      console.log('✅ Critical action correctly blocked');
      console.log(`   Reason: ${error.message}`);
    } else {
      console.log(`❌ Unexpected error: ${error.message}`);
    }
  }

  // Test 4: Resource monitoring and throttling
  console.log('\n📊 Test 4: Resource monitoring and throttling');

  // Simulate high resource usage violations
  const highResourceActions = [
    { tool: 'Read', file_path: `${testDir}/test1.txt` },
    { tool: 'Write', file_path: `${testDir}/test2.txt` },
    { tool: 'Edit', file_path: `${testDir}/test3.txt` }
  ];

  let throttledAgent = null;
  let violationCount = 0;

  for (const action of highResourceActions) {
    try {
      // Simulate high CPU usage context
      const highResourceContext = {
        resources: { cpu: 85, memory: 280, fileOps: 55 },
        concurrentTasks: 2
      };
      
      // Override the _buildContext method to return our test context
      const originalBuildContext = enforcer._buildContext;
      enforcer._buildContext = async () => highResourceContext;
      
      await enforcer.enforcePreAction(mockAgent, action);
      console.log(`⚠️  High resource action allowed: ${action.tool}`);
    } catch (error) {
      violationCount++;
      console.log(`✅ High resource action blocked: ${action.tool} (${error.message.substring(0, 50)}...)`);
      
      if (error.message.includes('shutdown')) {
        throttledAgent = mockAgent.id;
        break;
      }
    }
  }

  console.log(`Violations recorded: ${violationCount}`);
  if (throttledAgent) {
    console.log(`✅ Agent ${throttledAgent} was throttled/shutdown due to violations`);
  }

  // Test 5: Workspace boundary enforcement
  console.log('\n📊 Test 5: Workspace boundary enforcement');

  const boundaryTests = [
    { path: `${testDir}/allowed.txt`, shouldAllow: true },
    { path: `${testDir}/subdir/allowed.txt`, shouldAllow: true },
    { path: '../outside.txt', shouldAllow: false },
    { path: '/etc/passwd', shouldAllow: false },
    { path: '/tmp/temp.txt', shouldAllow: false }
  ];

  let boundaryCorrect = 0;
  for (const test of boundaryTests) {
    const allowed = constraints.isPathAllowed(test.path);
    const isCorrect = allowed === test.shouldAllow;
    
    console.log(`${isCorrect ? '✅' : '❌'} Path ${test.path}: ${allowed ? 'allowed' : 'forbidden'} (expected: ${test.shouldAllow ? 'allowed' : 'forbidden'})`);
    
    if (isCorrect) boundaryCorrect++;
  }

  const boundaryAccuracy = (boundaryCorrect / boundaryTests.length * 100).toFixed(1);
  console.log(`Workspace boundary accuracy: ${boundaryAccuracy}%`);

  // Test 6: File extension filtering
  console.log('\n📊 Test 6: File extension filtering');

  const extConstraints = new SafetyConstraints({
    workspaceBoundary: testDir,
    allowedFileExtensions: ['.txt', '.md', '.json'],
    forbiddenFileExtensions: ['.exe', '.sh', '.bat'],
    logLevel: 'warn'
  });

  const extensionTests = [
    { file: 'test.txt', shouldAllow: true },
    { file: 'readme.md', shouldAllow: true },
    { file: 'config.json', shouldAllow: true },
    { file: 'script.sh', shouldAllow: false },
    { file: 'malware.exe', shouldAllow: false },
    { file: 'batch.bat', shouldAllow: false }
  ];

  let extensionCorrect = 0;
  for (const test of extensionTests) {
    const testPath = `${testDir}/${test.file}`;
    const allowed = extConstraints.isPathAllowed(testPath);
    const isCorrect = allowed === test.shouldAllow;
    
    console.log(`${isCorrect ? '✅' : '❌'} File ${test.file}: ${allowed ? 'allowed' : 'forbidden'} (expected: ${test.shouldAllow ? 'allowed' : 'forbidden'})`);
    
    if (isCorrect) extensionCorrect++;
  }

  const extensionAccuracy = (extensionCorrect / extensionTests.length * 100).toFixed(1);
  console.log(`File extension filtering accuracy: ${extensionAccuracy}%`);

  // Test 7: Command pattern detection
  console.log('\n📊 Test 7: Command pattern detection');

  const commandTests = [
    { command: 'ls -la', shouldAllow: true },
    { command: 'echo "hello"', shouldAllow: true },
    { command: 'rm -rf /', shouldAllow: false },
    { command: 'sudo apt install', shouldAllow: false },
    { command: 'chmod 777 *', shouldAllow: false },
    { command: 'cat file.txt', shouldAllow: true }
  ];

  let commandCorrect = 0;
  for (const test of commandTests) {
    const action = { tool: 'Bash', command: test.command };
    const violations = constraints.validate(action, { resources: { cpu: 30, memory: 100 }, concurrentTasks: 1 });
    const hasCommandViolations = violations.some(v => v.type.includes('COMMAND'));
    const isAllowed = !hasCommandViolations;
    const isCorrect = isAllowed === test.shouldAllow;
    
    console.log(`${isCorrect ? '✅' : '❌'} Command '${test.command}': ${isAllowed ? 'allowed' : 'forbidden'} (expected: ${test.shouldAllow ? 'allowed' : 'forbidden'})`);
    
    if (isCorrect) commandCorrect++;
  }

  const commandAccuracy = (commandCorrect / commandTests.length * 100).toFixed(1);
  console.log(`Command pattern detection accuracy: ${commandAccuracy}%`);

  // Test 8: Severity classification
  console.log('\n📊 Test 8: Safety violation severity classification');

  const severityTests = [
    { type: 'ACTION_FORBIDDEN', expectedSeverity: 'CRITICAL' },
    { type: 'PATH_FORBIDDEN', expectedSeverity: 'CRITICAL' },
    { type: 'COMMAND_FORBIDDEN', expectedSeverity: 'CRITICAL' },
    { type: 'RESOURCE_LIMIT_CPU', expectedSeverity: 'HIGH' },
    { type: 'RESOURCE_LIMIT_MEMORY', expectedSeverity: 'HIGH' },
    { type: 'FILE_SIZE_LIMIT', expectedSeverity: 'MEDIUM' },
    { type: 'EXTENSION_FORBIDDEN', expectedSeverity: 'MEDIUM' }
  ];

  let severityCorrect = 0;
  for (const test of severityTests) {
    const actualSeverity = constraints.getViolationSeverity(test.type);
    const isCorrect = actualSeverity === test.expectedSeverity;
    
    console.log(`${isCorrect ? '✅' : '❌'} ${test.type}: ${actualSeverity} (expected: ${test.expectedSeverity})`);
    
    if (isCorrect) severityCorrect++;
  }

  const severityAccuracy = (severityCorrect / severityTests.length * 100).toFixed(1);
  console.log(`Severity classification accuracy: ${severityAccuracy}%`);

  console.log('\n🎉 Agent Safety Constraints and Guardrails Tests Complete!');

  return {
    validationAccuracy: parseFloat(validationAccuracy),
    boundaryAccuracy: parseFloat(boundaryAccuracy),
    extensionAccuracy: parseFloat(extensionAccuracy),
    commandAccuracy: parseFloat(commandAccuracy),
    severityAccuracy: parseFloat(severityAccuracy),
    totalTests: testActions.length + boundaryTests.length + extensionTests.length + commandTests.length + severityTests.length,
    violationsDetected: violationCount,
    throttlingWorking: throttledAgent !== null
  };
}

// Run tests
testSafetyConstraints()
  .then(results => {
    console.log('\n📈 Safety Constraints Test Results:');
    console.log('- Validation accuracy:', results.validationAccuracy + '%');
    console.log('- Workspace boundary accuracy:', results.boundaryAccuracy + '%');
    console.log('- File extension filtering accuracy:', results.extensionAccuracy + '%');
    console.log('- Command pattern detection accuracy:', results.commandAccuracy + '%');
    console.log('- Severity classification accuracy:', results.severityAccuracy + '%');
    console.log('- Total tests conducted:', results.totalTests);
    console.log('- Violations detected and recorded:', results.violationsDetected);
    console.log('- Throttling mechanism working:', results.throttlingWorking ? '✅ Yes' : '❌ No');
    
    const overallAccuracy = (
      results.validationAccuracy + 
      results.boundaryAccuracy + 
      results.extensionAccuracy + 
      results.commandAccuracy + 
      results.severityAccuracy
    ) / 5;
    
    console.log('- Overall accuracy:', overallAccuracy.toFixed(1) + '%');
    
    if (overallAccuracy >= 90) {
      console.log('✅ Excellent safety system performance!');
    } else if (overallAccuracy >= 80) {
      console.log('✅ Good safety system performance!');
    } else {
      console.log('⚠️  Safety system needs improvement');
    }
  })
  .catch(error => {
    console.error('❌ Safety constraints tests failed:', error);
    process.exit(1);
  });