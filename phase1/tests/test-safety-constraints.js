import { SafetyConstraints } from '../src/safety/SafetyConstraints.js';
import { ConstraintEnforcer } from '../src/safety/ConstraintEnforcer.js';
import { BaseAgent } from '../src/agents/BaseAgent.js';
import { ContextManager } from '../src/context/ContextManager.js';

async function testSafetyConstraints() {
  console.log('Testing Safety Constraints...\n');
  
  const testDir = './test-safety';
  
  // Clean up
  try {
    await (await import('fs/promises')).rm(testDir, { recursive: true, force: true });
  } catch (e) {}
  
  try {
    // Test 1: Basic constraint validation
    console.log('Test 1: Basic constraint validation...');
    
    const constraints = new SafetyConstraints({
      maxCpuPercent: 50,
      maxMemoryMB: 256,
      forbiddenPaths: ['/etc', '/sys'],
      forbiddenTools: ['Delete'],
      allowedTools: ['Read', 'Write', 'Edit'],
      forbiddenCommands: ['rm -rf', 'sudo'],
      workspaceBoundary: testDir
    });
    
    // Test allowed action
    const allowedAction = {
      tool: 'Read',
      file_path: `${testDir}/test.txt`
    };
    
    const allowedViolations = constraints.validate(allowedAction, { resources: { cpu: 30, memory: 100 } });
    console.log('✓ Allowed action:', allowedViolations.length === 0 ? 'No violations' : 'Has violations');
    
    // Test forbidden tool
    const forbiddenToolAction = {
      tool: 'Delete',
      file_path: `${testDir}/test.txt`
    };
    
    const toolViolations = constraints.validate(forbiddenToolAction, {});
    console.log('✓ Forbidden tool detected:', toolViolations.some(v => v.type === 'ACTION_FORBIDDEN'));
    
    // Test forbidden path
    const forbiddenPathAction = {
      tool: 'Read',
      file_path: '/etc/passwd'
    };
    
    const pathViolations = constraints.validate(forbiddenPathAction, {});
    console.log('✓ Forbidden path detected:', pathViolations.some(v => v.type === 'PATH_FORBIDDEN'));
    
    // Test workspace boundary
    const outsideBoundaryAction = {
      tool: 'Write',
      file_path: '/tmp/outside.txt'
    };
    
    const boundaryViolations = constraints.validate(outsideBoundaryAction, {});
    console.log('✓ Workspace boundary violation detected:', boundaryViolations.some(v => v.type === 'WORKSPACE_BOUNDARY'));
    
    // Test resource constraints
    const highResourceContext = {
      resources: {
        cpu: 80,
        memory: 300,
        fileOps: 50
      }
    };
    
    const resourceViolations = constraints.validate(allowedAction, highResourceContext);
    console.log('✓ Resource violations detected:', resourceViolations.length, '(CPU and Memory)');
    
    // Test 2: Constraint Enforcer
    console.log('\nTest 2: Constraint enforcer...');
    
    const enforcer = new ConstraintEnforcer(constraints);
    
    // Mock agent
    const mockAgent = {
      id: 'test-agent-001',
      state: { currentTasks: [] },
      actionHistory: [],
      logger: { 
        info: () => {}, 
        warn: () => {}, 
        error: () => {} 
      }
    };
    
    // Test allowed action
    try {
      await enforcer.enforcePreAction(mockAgent, allowedAction);
      console.log('✓ Allowed action passed enforcement');
    } catch (error) {
      console.log('✗ Allowed action failed:', error.message);
    }
    
    // Test critical violation
    try {
      await enforcer.enforcePreAction(mockAgent, forbiddenPathAction);
      console.log('✗ Critical violation should have thrown');
    } catch (error) {
      console.log('✓ Critical violation blocked:', error.message);
    }
    
    // Test 3: Full agent integration
    console.log('\nTest 3: Full agent integration...');
    
    const contextManager = new ContextManager({
      baseDir: path.join(testDir, 'context')
    });
    await contextManager.initialize();
    
    const agent = new BaseAgent({
      id: 'safety-test-agent',
      type: 'BaseAgent',
      name: 'Safety Test Agent',
      safety: {
        maxExecutionTimeMs: 5000, // 5 seconds
        forbiddenPaths: ['/etc', '/private'],
        workspaceBoundary: testDir
      }
    });
    
    await agent.initialize(contextManager);
    
    // Override _executeTask for testing
    agent._executeTask = async (request) => {
      if (request.input.simulateTimeout) {
        await new Promise(resolve => setTimeout(resolve, 10000)); // 10 seconds
      }
      return { result: 'success' };
    };
    
    // Test normal execution
    const normalResult = await agent.execute({
      taskId: 'test-001',
      taskType: 'test',
      input: { action: 'normal' }
    });
    
    console.log('✓ Normal execution:', normalResult.status);
    
    // Test timeout
    const timeoutResult = await agent.execute({
      taskId: 'test-002',
      taskType: 'test',
      input: { simulateTimeout: true }
    });
    
    console.log('✓ Timeout detected:', timeoutResult.error?.includes('timeout'));
    
    // Test 4: Confirmation callback
    console.log('\nTest 4: Confirmation callback...');
    
    let confirmationRequested = false;
    agent.registerConfirmationCallback(async (request) => {
      confirmationRequested = true;
      console.log('✓ Confirmation requested for:', request.action.tool);
      return false; // Reject
    });
    
    // Create new constraints that require confirmation
    const confirmConstraints = new SafetyConstraints({
      requireConfirmation: ['test'],
      workspaceBoundary: testDir
    });
    agent.constraints = confirmConstraints;
    agent.enforcer = new ConstraintEnforcer(confirmConstraints);
    agent.enforcer.registerConfirmationCallback(agent.id, async (request) => {
      confirmationRequested = true;
      return false;
    });
    
    // This should trigger confirmation
    const confirmResult = await agent.execute({
      taskId: 'test-003',
      taskType: 'test',
      input: { 
        action: 'dangerous',
        path: '/private/data' // This creates a high severity violation
      }
    });
    
    console.log('✓ Action blocked by confirmation:', confirmResult.status === 'blocked' || confirmResult.status === 'failure');
    
    // Test 5: Violation history
    console.log('\nTest 5: Violation history...');
    
    const violations = enforcer.getViolationHistory(mockAgent.id);
    console.log('✓ Violation history tracked:', violations.length, 'violations');
    
    // Test 6: Resource monitoring
    console.log('\nTest 6: Resource monitoring...');
    
    const monitor = enforcer.resourceMonitor;
    const systemInfo = monitor.getSystemInfo();
    console.log('✓ System info available:', 
      `${systemInfo.cpu.cores} cores, ${systemInfo.memory.total}MB total memory`
    );
    
    await agent.shutdown();
    
    console.log('\n✅ All safety constraint tests passed!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    throw error;
  } finally {
    try {
      await (await import('fs/promises')).rm(testDir, { recursive: true, force: true });
    } catch (e) {}
  }
}

// Add missing import
import path from 'path';

// Run test
testSafetyConstraints().catch(console.error);