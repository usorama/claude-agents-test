#!/usr/bin/env node

/**
 * IronClaude-S: Schema Validation Fix Testing
 * Tests all task status transitions after schema updates
 */

import { ContextManager } from './src/context/ContextManager.js';
import { ContextLevel } from './src/types/context.types.v2.js';

async function testSchemaValidation() {
  console.log('🧪 IronClaude-S: Testing Schema Validation Fixes\n');

  // Initialize context manager
  const contextManager = new ContextManager({
    baseDir: './test-schema-fixed/context',
    logLevel: 'info'
  });
  await contextManager.initialize();

  // Test all task status values
  const statusValues = [
    'pending',
    'assigned', 
    'running',
    'in-progress',  // This was failing before
    'completed',
    'failed',
    'blocked',      // New status
    'cancelled'     // New status
  ];

  console.log('📋 Testing all task status values...\n');

  let allTestsPassed = true;

  for (const status of statusValues) {
    try {
      console.log(`   Testing status: "${status}"`);
      
      const taskContext = await contextManager.createContext(
        ContextLevel.TASK,
        {
          taskId: `test-task-${status}`,
          taskType: 'validation-test',
          input: { testData: 'Schema validation test' },
          status: status,  // This should now work for all values
          progress: status === 'completed' ? 100 : 50
        }
      );

      console.log(`   ✅ Status "${status}" - Context created: ${taskContext.id}`);

      // Test status update
      await contextManager.updateContext(
        ContextLevel.TASK,
        taskContext.id,
        { status: 'completed' }
      );

      console.log(`   ✅ Status "${status}" - Update successful\n`);

    } catch (error) {
      console.log(`   ❌ Status "${status}" - Failed: ${error.message}\n`);
      allTestsPassed = false;
    }
  }

  // Test status transitions
  console.log('🔄 Testing status transitions...\n');

  const transitions = [
    ['pending', 'assigned'],
    ['assigned', 'running'],
    ['running', 'in-progress'],
    ['in-progress', 'completed'],
    ['running', 'blocked'],
    ['blocked', 'running'],
    ['assigned', 'cancelled'],
    ['running', 'failed']
  ];

  for (const [fromStatus, toStatus] of transitions) {
    try {
      console.log(`   Testing transition: ${fromStatus} → ${toStatus}`);

      const taskContext = await contextManager.createContext(
        ContextLevel.TASK,
        {
          taskId: `transition-${fromStatus}-${toStatus}`,
          taskType: 'transition-test',
          input: { testData: 'Status transition test' },
          status: fromStatus
        }
      );

      await contextManager.updateContext(
        ContextLevel.TASK,
        taskContext.id,
        { status: toStatus }
      );

      console.log(`   ✅ Transition ${fromStatus} → ${toStatus} successful\n`);

    } catch (error) {
      console.log(`   ❌ Transition ${fromStatus} → ${toStatus} failed: ${error.message}\n`);
      allTestsPassed = false;
    }
  }

  // Test edge cases
  console.log('🔍 Testing edge cases...\n');

  try {
    console.log('   Testing invalid status value...');
    
    await contextManager.createContext(
      ContextLevel.TASK,
      {
        taskId: 'invalid-status-test',
        taskType: 'edge-case-test',
        input: { testData: 'Invalid status test' },
        status: 'invalid-status'  // This should fail
      }
    );

    console.log('   ❌ Invalid status test - Should have failed but didn\'t\n');
    allTestsPassed = false;

  } catch (error) {
    console.log('   ✅ Invalid status test - Correctly rejected invalid status\n');
  }

  // Summary
  console.log('📊 Schema Validation Test Results:');
  console.log(`   - All status values: ${allTestsPassed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`   - Status transitions: ${allTestsPassed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`   - Edge cases: ${allTestsPassed ? '✅ PASSED' : '❌ FAILED'}`);
  
  if (allTestsPassed) {
    console.log('\n🎉 All schema validation tests passed!');
    console.log('✅ TASK-001-01: Schema validation issues fixed');
  } else {
    console.log('\n❌ Some schema validation tests failed');
    console.log('⚠️  TASK-001-01: Additional fixes needed');
  }

  return allTestsPassed;
}

// Run the test
testSchemaValidation()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Schema validation test failed:', error);
    process.exit(1);
  });