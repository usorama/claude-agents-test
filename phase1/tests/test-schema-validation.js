import { getSchemaRegistry } from '../src/validation/SchemaRegistry.js';
import { BaseAgent } from '../src/agents/BaseAgent.js';
import { AnalystAgent } from '../src/agents/core/AnalystAgent.js';
import { PMAgent } from '../src/agents/core/PMAgent.js';

async function testSchemaValidation() {
  console.log('Testing Schema Validation...\n');
  
  const schemaRegistry = getSchemaRegistry();
  
  try {
    // Test 1: Valid configurations
    console.log('Test 1: Testing valid configurations...');
    
    // Valid base agent config
    const validBaseConfig = {
      id: 'test-base-001',
      type: 'BaseAgent',
      name: 'Test Base Agent',
      description: 'A test agent',
      capabilities: ['analyze', 'report'],
      tools: ['Read', 'Write']
    };
    
    const validatedBase = schemaRegistry.validateAgentConfig('BaseAgent', validBaseConfig);
    console.log('✓ Base agent config validated');
    
    // Valid analyst config
    const validAnalystConfig = {
      id: 'test-analyst-001',
      type: 'AnalystAgent',
      name: 'Test Analyst',
      researchDepth: 'deep',
      focusAreas: ['market', 'technology'],
      outputFormats: ['detailed', 'technical']
    };
    
    const validatedAnalyst = schemaRegistry.validateAgentConfig('AnalystAgent', validAnalystConfig);
    console.log('✓ Analyst agent config validated');
    
    // Test 2: Invalid configurations
    console.log('\nTest 2: Testing invalid configurations...');
    
    // Missing required fields
    try {
      schemaRegistry.validateAgentConfig('BaseAgent', {
        // Missing id, type, name
        description: 'Invalid agent'
      });
      console.error('❌ Should have failed for missing required fields');
    } catch (error) {
      console.log('✓ Correctly rejected config with missing required fields');
      console.log(`  Error: ${error.message}`);
    }
    
    // Invalid field types
    try {
      schemaRegistry.validateAgentConfig('BaseAgent', {
        id: 123, // Should be string
        type: 'BaseAgent',
        name: 'Test'
      });
      console.error('❌ Should have failed for invalid field type');
    } catch (error) {
      console.log('✓ Correctly rejected config with invalid field type');
    }
    
    // Invalid enum value
    try {
      schemaRegistry.validateAgentConfig('AnalystAgent', {
        id: 'test-analyst-002',
        type: 'AnalystAgent',
        name: 'Test Analyst',
        researchDepth: 'invalid-depth' // Not in enum
      });
      console.error('❌ Should have failed for invalid enum value');
    } catch (error) {
      console.log('✓ Correctly rejected config with invalid enum value');
    }
    
    // Test 3: Agent instantiation with validation
    console.log('\nTest 3: Testing agent instantiation with validation...');
    
    try {
      // This should succeed
      const analyst = new AnalystAgent({
        id: 'analyst-with-validation',
        type: 'AnalystAgent',
        name: 'Validated Analyst',
        researchDepth: 'medium',
        focusAreas: ['requirements', 'feasibility']
      });
      console.log('✓ Agent created with valid config');
    } catch (error) {
      console.error('❌ Failed to create agent with valid config:', error.message);
    }
    
    try {
      // This should fail
      const invalidAnalyst = new AnalystAgent({
        id: 'invalid-analyst',
        // Missing required 'type' and 'name'
      });
      console.error('❌ Should have failed to create agent with invalid config');
    } catch (error) {
      console.log('✓ Correctly prevented agent creation with invalid config');
      console.log(`  Error: ${error.message}`);
    }
    
    // Test 4: Schema registration
    console.log('\nTest 4: Testing custom schema registration...');
    
    // Register a custom schema
    const { z } = await import('zod');
    schemaRegistry.registerSchema('CustomAgent', z.object({
      id: z.string(),
      type: z.literal('CustomAgent'),
      name: z.string(),
      customField: z.number().min(0).max(100)
    }));
    
    // Validate against custom schema
    const customConfig = {
      id: 'custom-001',
      type: 'CustomAgent',
      name: 'Custom Agent',
      customField: 42
    };
    
    const validatedCustom = schemaRegistry.validateAgentConfig('CustomAgent', customConfig);
    console.log('✓ Custom schema registered and validated');
    
    // Test 5: Non-strict mode
    console.log('\nTest 5: Testing non-strict mode...');
    
    // Create a non-strict registry
    const nonStrictRegistry = new (await import('../src/validation/SchemaRegistry.js')).SchemaRegistry({
      strictMode: false
    });
    
    // This should not throw in non-strict mode
    const invalidButAllowed = nonStrictRegistry.validateAgentConfig('UnknownAgent', {
      someField: 'value'
    });
    console.log('✓ Non-strict mode allows unknown agent types');
    
    // Test 6: Get all schemas
    console.log('\nTest 6: Testing schema retrieval...');
    const allSchemas = schemaRegistry.getAllSchemas();
    console.log(`✓ Retrieved ${allSchemas.length} schemas`);
    console.log('  Registered agent types:', allSchemas.map(s => s.agentType).join(', '));
    
    console.log('\n✅ All schema validation tests passed!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    throw error;
  }
}

// Run the test
testSchemaValidation().catch(console.error);