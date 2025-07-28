#!/usr/bin/env node

/**
 * IronClaude-S: Configurable Safety Constraints Testing
 * Tests environment-based safety profiles and override mechanisms
 */

import { SafetyConstraints } from './src/safety/SafetyConstraints.js';
import { SafetyProfiles } from './src/safety/SafetyProfiles.js';

async function testConfigurableSafety() {
  console.log('🛡️  IronClaude-S: Testing Configurable Safety Constraints\n');

  let allTestsPassed = true;

  // Test 1: Profile Loading
  console.log('📋 Test 1: Safety Profile Loading\n');

  const profiles = new SafetyProfiles();
  const availableProfiles = profiles.getAvailableProfiles();
  
  console.log(`   Available profiles: ${availableProfiles.join(', ')}`);

  for (const profileName of availableProfiles) {
    try {
      const profile = profiles.getProfile(profileName);
      const summary = profiles.getProfileSummary(profileName);
      
      console.log(`   ✅ ${profileName}: ${summary.environment} - ${summary.toolsAllowed} tools allowed, network: ${summary.networkAccess}`);
      
    } catch (error) {
      console.log(`   ❌ ${profileName}: Failed to load - ${error.message}`);
      allTestsPassed = false;
    }
  }

  // Test 2: Environment-based Configuration
  console.log('\n🌍 Test 2: Environment-based Configuration\n');

  const environments = ['development', 'test', 'staging', 'production'];

  for (const env of environments) {
    try {
      // Set environment variable
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = env;

      const safety = new SafetyConstraints();
      const currentProfile = safety.getCurrentProfile();
      
      console.log(`   ✅ ENV=${env}: Profile="${currentProfile.actualProfile}", Environment="${currentProfile.environment}"`);
      console.log(`      - Tools allowed: ${currentProfile.summary.toolsAllowed}`);
      console.log(`      - Network access: ${currentProfile.summary.networkAccess}`);
      console.log(`      - Max tasks: ${currentProfile.summary.maxTasks}\n`);

      // Restore environment
      process.env.NODE_ENV = originalEnv;
      
    } catch (error) {
      console.log(`   ❌ ENV=${env}: Configuration failed - ${error.message}\n`);
      allTestsPassed = false;
    }
  }

  // Test 3: Profile-specific Behavior
  console.log('🔒 Test 3: Profile-specific Tool Restrictions\n');

  const testActions = [
    { tool: 'Read', file_path: '/tmp/test.txt' },
    { tool: 'Write', file_path: '/tmp/test.txt' },
    { tool: 'Bash', command: 'ls -la' },
    { tool: 'WebFetch', url: 'https://github.com' }
  ];

  for (const profileName of ['strict', 'moderate', 'permissive']) {
    console.log(`   Testing ${profileName} profile:`);
    
    try {
      const safety = new SafetyConstraints({ profile: profileName });
      
      for (const action of testActions) {
        const violations = safety.validate(action, { resources: {}, concurrentTasks: 1 });
        const isAllowed = violations.length === 0;
        const status = isAllowed ? '✅ ALLOWED' : '❌ BLOCKED';
        
        console.log(`      ${action.tool}: ${status}`);
        if (!isAllowed) {
          console.log(`         Reason: ${violations[0].message}`);
        }
      }
      console.log('');
      
    } catch (error) {
      console.log(`      ❌ Profile test failed: ${error.message}\n`);
      allTestsPassed = false;
    }
  }

  // Test 4: Override Mechanisms
  console.log('🔓 Test 4: Override Mechanisms\n');

  const overrideTests = [
    {
      environment: 'development',
      authorization: 'DEV_OVERRIDE: Testing file operations',
      shouldAllow: true
    },
    {
      environment: 'test', 
      authorization: 'TEST_OVERRIDE: Automated testing',
      shouldAllow: true
    },
    {
      environment: 'staging',
      authorization: 'STAGING_OVERRIDE: Deployment testing',
      shouldAllow: true
    },
    {
      environment: 'staging',
      authorization: 'INVALID_OVERRIDE: Should fail',
      shouldAllow: false
    },
    {
      environment: 'production',
      authorization: 'PROD_OVERRIDE: Should never work',
      shouldAllow: false
    }
  ];

  for (const test of overrideTests) {
    try {
      const safety = new SafetyConstraints({ environment: test.environment });
      const action = { tool: 'Bash', command: 'rm -rf /tmp/test' };
      
      const canOverride = safety.canOverride(action, test.authorization);
      const status = canOverride === test.shouldAllow ? '✅' : '❌';
      
      console.log(`   ${status} ${test.environment}: Override ${canOverride ? 'ALLOWED' : 'DENIED'} (expected: ${test.shouldAllow ? 'allow' : 'deny'})`);
      
      if (canOverride !== test.shouldAllow) {
        allTestsPassed = false;
      }

      // Test actual override application
      if (canOverride) {
        const overriddenAction = safety.applyOverride(action, test.authorization);
        if (overriddenAction._override && overriddenAction._override.applied) {
          console.log(`      ✅ Override successfully applied`);
        } else {
          console.log(`      ❌ Override application failed`);
          allTestsPassed = false;
        }
      }
      
    } catch (error) {
      console.log(`   ❌ ${test.environment}: Override test failed - ${error.message}`);
      allTestsPassed = false;
    }
  }

  // Test 5: Custom Profile Creation
  console.log('\n🛠️  Test 5: Custom Profile Creation\n');

  try {
    // Test custom profile creation via SafetyProfiles
    const customProfile = profiles.createCustomProfile('moderate', {
      resources: {
        maxMemoryMB: 2048
      },
      actions: {
        allowedTools: ['Read', 'Write', 'Edit', 'Bash']
      }
    });

    console.log('   ✅ Custom profile created via SafetyProfiles successfully');
    console.log(`   ✅ Custom profile maxMemoryMB: ${customProfile.resources.maxMemoryMB}`);

    // Test custom profile via SafetyConstraints with overrides
    const safety = new SafetyConstraints({ 
      profile: 'moderate',
      overrides: {
        resources: {
          maxMemoryMB: 2048  
        }
      }
    });

    console.log(`   ✅ Custom constraints applied: maxMemoryMB = ${safety.constraints.resources.maxMemoryMB}`);
    
  } catch (error) {
    console.log(`   ❌ Custom profile creation failed: ${error.message}`);
    allTestsPassed = false;
  }

  // Test 6: File Operations in Test Environment
  console.log('\n📁 Test 6: File Operations in Test Environment\n');

  try {
    // Set test environment
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'test';

    const safety = new SafetyConstraints();
    
    const writeAction = { 
      tool: 'Write', 
      file_path: './test-file.txt',
      content: 'Test content'
    };

    const violations = safety.validate(writeAction, { 
      resources: { cpu: 10, memory: 100, fileOps: 5 }, 
      concurrentTasks: 1 
    });

    if (violations.length === 0) {
      console.log('   ✅ File operations allowed in test environment');
    } else {
      console.log('   ❌ File operations blocked in test environment');
      console.log(`      Violations: ${violations.map(v => v.message).join(', ')}`);
      allTestsPassed = false;
    }

    // Restore environment
    process.env.NODE_ENV = originalEnv;
    
  } catch (error) {
    console.log(`   ❌ File operations test failed: ${error.message}`);
    allTestsPassed = false;
  }

  // Summary
  console.log('\n📊 Configurable Safety Constraints Test Results:');
  console.log(`   - Profile loading: ${allTestsPassed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`   - Environment detection: ${allTestsPassed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`   - Tool restrictions: ${allTestsPassed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`   - Override mechanisms: ${allTestsPassed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`   - Custom profiles: ${allTestsPassed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`   - Test environment operations: ${allTestsPassed ? '✅ PASSED' : '❌ FAILED'}`);
  
  if (allTestsPassed) {
    console.log('\n🎉 All configurable safety constraint tests passed!');
    console.log('✅ TASK-001-02: Configurable safety constraints implemented');
  } else {
    console.log('\n❌ Some safety constraint tests failed');
    console.log('⚠️  TASK-001-02: Additional fixes needed');
  }

  return allTestsPassed;
}

// Run the test
testConfigurableSafety()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Configurable safety test failed:', error);
    process.exit(1);
  });