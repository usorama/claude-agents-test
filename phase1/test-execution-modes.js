#!/usr/bin/env node

/**
 * IronClaude-S: Execution Modes Testing
 * Tests simulation vs real execution mode functionality
 */

import { ExecutionModes } from './src/orchestrator/ExecutionModes.js';

async function testExecutionModes() {
  console.log('🎯 IronClaude-S: Testing Execution Modes\n');

  let allTestsPassed = true;

  // Test 1: Mode Detection and Initialization
  console.log('📋 Test 1: Mode Detection and Initialization\n');

  const testEnvironments = [
    { env: 'development', expected: 'real' },
    { env: 'test', expected: 'real' },
    { env: 'staging', expected: 'hybrid' },
    { env: 'production', expected: 'simulation' }
  ];

  for (const { env, expected } of testEnvironments) {
    try {
      // Set environment
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = env;
      delete process.env.IRONCLAUDE_EXECUTION_MODE; // Clear any override

      const executionMode = new ExecutionModes();
      const currentMode = executionMode.getCurrentMode();

      if (currentMode === expected) {
        console.log(`   ✅ ENV=${env}: Detected mode "${currentMode}" (expected: ${expected})`);
      } else {
        console.log(`   ❌ ENV=${env}: Detected mode "${currentMode}" (expected: ${expected})`);
        allTestsPassed = false;
      }

      // Restore environment
      process.env.NODE_ENV = originalEnv;

    } catch (error) {
      console.log(`   ❌ ENV=${env}: Failed to initialize - ${error.message}`);
      allTestsPassed = false;
    }
  }

  // Test 2: Explicit Mode Configuration
  console.log('\n🔧 Test 2: Explicit Mode Configuration\n');

  const explicitModes = [
    ExecutionModes.SIMULATION,
    ExecutionModes.REAL,
    ExecutionModes.HYBRID
  ];

  for (const mode of explicitModes) {
    try {
      const executionMode = new ExecutionModes({ mode });
      const currentMode = executionMode.getCurrentMode();

      if (currentMode === mode) {
        console.log(`   ✅ Explicit mode "${mode}": Successfully configured`);
      } else {
        console.log(`   ❌ Explicit mode "${mode}": Configuration failed`);
        allTestsPassed = false;
      }

    } catch (error) {
      console.log(`   ❌ Explicit mode "${mode}": Failed - ${error.message}`);
      allTestsPassed = false;
    }
  }

  // Test 3: Operation Execution Logic
  console.log('\n⚙️  Test 3: Operation Execution Logic\n');

  const testOperations = [
    { tool: 'Read', file_path: './test.txt' },
    { tool: 'Write', file_path: './output.txt' },
    { tool: 'Bash', command: 'ls -la' },
    { tool: 'Grep', pattern: 'test' }
  ];

  const modeTests = [
    { mode: ExecutionModes.SIMULATION, shouldExecuteReal: [false, false, false, false] },
    { mode: ExecutionModes.REAL, shouldExecuteReal: [true, true, true, true] },
    { mode: ExecutionModes.HYBRID, shouldExecuteReal: [true, false, false, true] } // Only safe operations
  ];

  for (const { mode, shouldExecuteReal } of modeTests) {
    console.log(`   Testing ${mode} mode:`);
    
    try {
      const executionMode = new ExecutionModes({ 
        mode,
        safeOperations: ['Read', 'Grep', 'Glob', 'LS'],
        riskyOperations: ['Write', 'Edit', 'Bash', 'MultiEdit']
      });

      for (let i = 0; i < testOperations.length; i++) {
        const operation = testOperations[i];
        const expected = shouldExecuteReal[i];
        const actual = executionMode.shouldExecuteReal(operation);

        const status = actual === expected ? '✅' : '❌';
        const expectedText = expected ? 'REAL' : 'SIMULATION';
        const actualText = actual ? 'REAL' : 'SIMULATION';

        console.log(`      ${status} ${operation.tool}: ${actualText} (expected: ${expectedText})`);

        if (actual !== expected) {
          allTestsPassed = false;
        }
      }
      console.log('');

    } catch (error) {
      console.log(`      ❌ ${mode} mode test failed: ${error.message}\n`);
      allTestsPassed = false;
    }
  }

  // Test 4: Mode Switching
  console.log('🔄 Test 4: Mode Switching\n');

  try {
    const executionMode = new ExecutionModes({ 
      mode: ExecutionModes.SIMULATION,
      allowModeSwitch: true
    });

    console.log(`   Initial mode: ${executionMode.getCurrentMode()}`);

    // Test unauthorized switch to real mode
    const unauthorizedSwitch = executionMode.switchMode(ExecutionModes.REAL, 'invalid');
    if (!unauthorizedSwitch) {
      console.log('   ✅ Unauthorized switch to real mode correctly denied');
    } else {
      console.log('   ❌ Unauthorized switch to real mode incorrectly allowed');
      allTestsPassed = false;
    }

    // Test authorized switch to real mode
    const authorizedSwitch = executionMode.switchMode(ExecutionModes.REAL, 'REAL_MODE_AUTH: Testing mode switch');
    if (authorizedSwitch && executionMode.getCurrentMode() === ExecutionModes.REAL) {
      console.log('   ✅ Authorized switch to real mode successful');
    } else {
      console.log('   ❌ Authorized switch to real mode failed');
      allTestsPassed = false;
    }

    // Test switch to simulation mode (should not require authorization)
    const switchToSim = executionMode.switchMode(ExecutionModes.SIMULATION);
    if (switchToSim && executionMode.getCurrentMode() === ExecutionModes.SIMULATION) {
      console.log('   ✅ Switch to simulation mode successful');
    } else {
      console.log('   ❌ Switch to simulation mode failed');
      allTestsPassed = false;
    }

  } catch (error) {
    console.log(`   ❌ Mode switching test failed: ${error.message}`);
    allTestsPassed = false;
  }

  // Test 5: Operation Execution
  console.log('\n🚀 Test 5: Operation Execution\n');

  const executionTests = [
    { mode: ExecutionModes.SIMULATION, operation: { tool: 'Write', file_path: './test.txt' } },
    { mode: ExecutionModes.REAL, operation: { tool: 'Read', file_path: './test.txt' } },
    { mode: ExecutionModes.HYBRID, operation: { tool: 'Grep', pattern: 'test' } }
  ];

  for (const { mode, operation } of executionTests) {
    try {
      const executionMode = new ExecutionModes({ 
        mode,
        safeOperations: ['Read', 'Grep', 'Glob', 'LS']
      });

      const realExecutor = async (op) => ({
        success: true,
        result: `Real execution of ${op.tool}`,
        executionType: 'real'
      });

      const simulationExecutor = async (op) => ({
        success: true,
        result: `Simulation of ${op.tool}`,
        executionType: 'simulation'
      });

      const result = await executionMode.executeOperation(
        operation,
        realExecutor,
        simulationExecutor
      );

      const expectedMode = executionMode.shouldExecuteReal(operation) ? 'real' : 'simulation';
      
      if (result.executionInfo.mode === expectedMode) {
        console.log(`   ✅ ${mode} mode: ${operation.tool} executed in ${result.executionInfo.mode} mode`);
      } else {
        console.log(`   ❌ ${mode} mode: ${operation.tool} executed in ${result.executionInfo.mode} mode (expected: ${expectedMode})`);
        allTestsPassed = false;
      }

    } catch (error) {
      console.log(`   ❌ ${mode} execution test failed: ${error.message}`);
      allTestsPassed = false;
    }
  }

  // Test 6: Configuration Validation
  console.log('\n🔍 Test 6: Configuration Validation\n');

  const validationTests = [
    {
      name: 'Valid configuration',
      config: { 
        mode: ExecutionModes.REAL,
        safeOperations: ['Read', 'Grep'],
        riskyOperations: ['Write', 'Bash']
      },
      shouldPass: true
    },
    {
      name: 'Invalid mode',
      config: { 
        mode: 'invalid-mode',
        safeOperations: ['Read'],
        riskyOperations: ['Write']
      },
      shouldPass: false
    },
    {
      name: 'Overlapping operations',
      config: { 
        mode: ExecutionModes.REAL,
        safeOperations: ['Read', 'Write'],
        riskyOperations: ['Write', 'Bash'] // Write appears in both
      },
      shouldPass: false
    }
  ];

  for (const { name, config, shouldPass } of validationTests) {
    try {
      const executionMode = new ExecutionModes(config);
      const errors = executionMode.validateConfiguration();
      
      if (shouldPass && errors.length === 0) {
        console.log(`   ✅ ${name}: Validation passed as expected`);
      } else if (!shouldPass && errors.length > 0) {
        console.log(`   ✅ ${name}: Validation failed as expected (${errors.length} errors)`);
      } else {
        console.log(`   ❌ ${name}: Validation result unexpected`);
        allTestsPassed = false;
      }

    } catch (error) {
      if (!shouldPass) {
        console.log(`   ✅ ${name}: Configuration rejected as expected`);
      } else {
        console.log(`   ❌ ${name}: Configuration unexpectedly rejected - ${error.message}`);
        allTestsPassed = false;
      }
    }
  }

  // Test 7: Environment Variable Override
  console.log('\n🌍 Test 7: Environment Variable Override\n');

  try {
    // Set environment variable override
    process.env.IRONCLAUDE_EXECUTION_MODE = 'hybrid';
    process.env.NODE_ENV = 'production'; // Would normally be simulation

    const executionMode = new ExecutionModes();
    const currentMode = executionMode.getCurrentMode();

    if (currentMode === 'hybrid') {
      console.log('   ✅ Environment variable override working correctly');
    } else {
      console.log(`   ❌ Environment variable override failed: got "${currentMode}", expected "hybrid"`);
      allTestsPassed = false;
    }

    // Clean up
    delete process.env.IRONCLAUDE_EXECUTION_MODE;

  } catch (error) {
    console.log(`   ❌ Environment variable override test failed: ${error.message}`);
    allTestsPassed = false;
  }

  // Summary
  console.log('\n📊 Execution Modes Test Results:');
  console.log(`   - Mode detection: ${allTestsPassed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`   - Mode configuration: ${allTestsPassed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`   - Operation execution logic: ${allTestsPassed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`   - Mode switching: ${allTestsPassed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`   - Operation execution: ${allTestsPassed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`   - Configuration validation: ${allTestsPassed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`   - Environment overrides: ${allTestsPassed ? '✅ PASSED' : '❌ FAILED'}`);
  
  if (allTestsPassed) {
    console.log('\n🎉 All execution mode tests passed!');
    console.log('✅ TASK-001-03: Real task execution mode implemented');
  } else {
    console.log('\n❌ Some execution mode tests failed');
    console.log('⚠️  TASK-001-03: Additional fixes needed');
  }

  return allTestsPassed;
}

// Run the test
testExecutionModes()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Execution modes test failed:', error);
    process.exit(1);
  });