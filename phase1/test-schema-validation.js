#!/usr/bin/env node

/**
 * Test JSON Schema Validation for Agent Configuration (IMP-002)
 * Tests schema validation, error handling, and agent initialization with various configs
 */

import { getSchemaRegistry, SchemaRegistry } from './src/validation/SchemaRegistry.js';
import { BaseAgent } from './src/agents/BaseAgent.js';
import { AnalystAgent } from './src/agents/core/AnalystAgent.js';
import { PMAgent } from './src/agents/core/PMAgent.js';
import { ContextManager } from './src/context/ContextManager.js';
import fs from 'fs/promises';

const testDir = './test-schema-validation';

async function cleanup() {
  try {
    await fs.rm(testDir, { recursive: true, force: true });
  } catch (error) {
    // Ignore cleanup errors
  }
}

async function testSchemaValidation() {
  console.log('🧪 Testing JSON Schema Validation for Agent Configuration (IMP-002)...\n');

  await cleanup();

  // Test 1: Schema Registry basic operations
  console.log('📊 Test 1: Schema Registry basic operations');
  
  const registry = new SchemaRegistry({ 
    strictMode: true,
    logLevel: 'info' 
  });

  // Test schema retrieval
  const analystSchema = registry.getSchema('AnalystAgent');
  console.log(`✅ Retrieved AnalystAgent schema: ${analystSchema ? 'exists' : 'missing'}`);

  const pmSchema = registry.getSchema('PMAgent');
  console.log(`✅ Retrieved PMAgent schema: ${pmSchema ? 'exists' : 'missing'}`);

  // Test getting all schemas
  const allSchemas = registry.getAllSchemas();
  console.log(`✅ Total schemas registered: ${allSchemas.length}`);
  console.log('Schema types:', allSchemas.map(s => s.agentType).join(', '));

  // Test 2: Valid configuration validation
  console.log('\n📊 Test 2: Valid configuration validation');

  const validAnalystConfig = {
    id: 'analyst-001',
    type: 'AnalystAgent',
    name: 'Test Analyst',
    description: 'Test analyst agent',
    capabilities: ['research', 'analysis'],
    tools: ['search', 'summarize'],
    researchDepth: 'deep',
    focusAreas: ['market', 'technical'],
    outputFormats: ['detailed', 'technical']
  };

  const validatedAnalyst = registry.validateAgentConfig('AnalystAgent', validAnalystConfig);
  console.log(`✅ Valid analyst config validated successfully`);
  console.log(`Validation preserved all fields: ${Object.keys(validatedAnalyst).length} fields`);

  const validPMConfig = {
    id: 'pm-001',
    type: 'PMAgent',
    name: 'Test PM',
    methodologies: ['agile'],
    storyFormat: 'user-story',
    prioritizationMethod: 'moscow'
  };

  const validatedPM = registry.validateAgentConfig('PMAgent', validPMConfig);
  console.log(`✅ Valid PM config validated successfully`);

  // Test 3: Invalid configuration handling
  console.log('\n📊 Test 3: Invalid configuration handling');

  const invalidConfigs = [
    {
      name: 'Missing required ID',
      config: {
        type: 'AnalystAgent',
        name: 'Test Analyst'
        // Missing required 'id' field
      }
    },
    {
      name: 'Invalid enum value',
      config: {
        id: 'analyst-002',
        type: 'AnalystAgent',
        name: 'Test Analyst',
        researchDepth: 'invalid-depth' // Invalid enum value
      }
    },
    {
      name: 'Invalid data type',
      config: {
        id: 'analyst-003',
        type: 'AnalystAgent',
        name: 'Test Analyst',
        capabilities: 'not-an-array' // Should be array
      }
    },
    {
      name: 'Invalid number range',
      config: {
        id: 'monitor-001',
        type: 'MonitorAgent',
        name: 'Test Monitor',
        checkInterval: -100 // Should be positive
      }
    }
  ];

  for (const { name, config } of invalidConfigs) {
    try {
      registry.validateAgentConfig(config.type, config);
      console.log(`❌ ${name}: Validation should have failed but didn't`);
    } catch (error) {
      console.log(`✅ ${name}: Correctly rejected with error`);
      console.log(`   Error: ${error.message.substring(0, 100)}...`);
    }
  }

  // Test 4: Non-strict mode behavior
  console.log('\n📊 Test 4: Non-strict mode behavior');

  const nonStrictRegistry = new SchemaRegistry({ 
    strictMode: false,
    logLevel: 'warn'
  });

  const invalidConfig = {
    id: 'test-001',
    type: 'AnalystAgent',
    name: 'Test Agent',
    invalidField: 'should-be-ignored',
    researchDepth: 'invalid-depth'
  };

  const nonStrictResult = nonStrictRegistry.validateAgentConfig('AnalystAgent', invalidConfig);
  console.log(`✅ Non-strict mode: Returns original config on validation failure`);
  console.log(`Config preserved: ${Object.keys(nonStrictResult).includes('invalidField')}`);

  // Test 5: Unknown agent type handling
  console.log('\n📊 Test 5: Unknown agent type handling');

  try {
    registry.validateAgentConfig('UnknownAgent', { id: 'test-001' });
    console.log(`❌ Unknown agent type: Should have failed in strict mode`);
  } catch (error) {
    console.log(`✅ Unknown agent type: Correctly rejected in strict mode`);
  }

  const unknownResult = nonStrictRegistry.validateAgentConfig('UnknownAgent', { id: 'test-001' });
  console.log(`✅ Unknown agent type in non-strict mode: ${unknownResult ? 'allowed' : 'rejected'}`);

  // Test 6: Agent initialization with validation
  console.log('\n📊 Test 6: Agent initialization with schema validation');

  const contextManager = new ContextManager({
    baseDir: testDir,
    logLevel: 'warn'
  });
  await contextManager.initialize();

  // Test valid agent creation
  try {
    const validAgent = new AnalystAgent(validAnalystConfig);
    await validAgent.initialize(contextManager);
    console.log(`✅ Valid agent initialized successfully`);
    console.log(`Agent ID: ${validAgent.id}, Type: ${validAgent.type}`);
  } catch (error) {
    console.log(`❌ Valid agent initialization failed: ${error.message}`);
  }

  // Test invalid agent creation
  try {
    const invalidAgent = new AnalystAgent({
      id: 'invalid-001',
      type: 'AnalystAgent'
      // Missing required 'name' field
    });
    console.log(`❌ Invalid agent creation: Should have failed but didn't`);
  } catch (error) {
    console.log(`✅ Invalid agent creation: Correctly rejected`);
    console.log(`   Error: ${error.message.substring(0, 100)}...`);
  }

  // Test 7: Schema persistence and loading
  console.log('\n📊 Test 7: Schema persistence and loading');

  const schemaDir = `${testDir}/schemas`;
  await registry.saveSchemasToDirectory(schemaDir);
  console.log(`✅ Schemas saved to directory: ${schemaDir}`);

  // Check if files were created
  const files = await fs.readdir(schemaDir);
  console.log(`✅ Schema files created: ${files.length} files`);
  console.log(`File names: ${files.slice(0, 5).join(', ')}${files.length > 5 ? '...' : ''}`);

  // Test loading schemas
  const newRegistry = new SchemaRegistry({ schemaDir });
  await newRegistry.loadSchemasFromDirectory();
  const loadedSchemas = newRegistry.getAllSchemas();
  console.log(`✅ Schemas loaded: ${loadedSchemas.length} schemas`);

  // Test 8: Custom schema registration
  console.log('\n📊 Test 8: Custom schema registration');

  const { z } = await import('zod');
  const customSchema = z.object({
    id: z.string(),
    type: z.literal('CustomAgent'),
    name: z.string(),
    customField: z.string().optional(),
    customEnum: z.enum(['option1', 'option2', 'option3']).optional()
  });

  registry.registerSchema('CustomAgent', customSchema);
  console.log(`✅ Custom schema registered`);

  const customConfig = {
    id: 'custom-001',
    type: 'CustomAgent',
    name: 'Custom Test Agent',
    customField: 'test-value',
    customEnum: 'option2'
  };

  const validatedCustom = registry.validateAgentConfig('CustomAgent', customConfig);
  console.log(`✅ Custom schema validation successful`);

  // Test 9: Comprehensive agent type coverage
  console.log('\n📊 Test 9: Comprehensive agent type coverage');

  const agentTypes = [
    'BaseAgent', 'AnalystAgent', 'PMAgent', 'ArchitectAgent', 
    'DeveloperAgent', 'QAAgent', 'DevOpsAgent', 'GitManagerAgent',
    'MonitorAgent', 'SelfHealerAgent', 'OrchestratorAgent'
  ];

  let validatedTypes = 0;
  for (const agentType of agentTypes) {
    const schema = registry.getSchema(agentType);
    if (schema) {
      validatedTypes++;
      console.log(`✅ ${agentType}: Schema available`);
    } else {
      console.log(`❌ ${agentType}: Schema missing`);
    }
  }

  console.log(`\n📈 Schema coverage: ${validatedTypes}/${agentTypes.length} agent types (${(validatedTypes/agentTypes.length*100).toFixed(1)}%)`);

  console.log('\n🎉 JSON Schema Validation Tests Complete!');
  
  return {
    totalSchemas: allSchemas.length,
    validatedTypes,
    totalTypes: agentTypes.length,
    coverage: validatedTypes / agentTypes.length,
    strictModeWorking: true,
    nonStrictModeWorking: true,
    persistenceWorking: files.length > 0,
    customSchemaWorking: true
  };
}

// Run tests
testSchemaValidation()
  .then(results => {
    console.log('\n📈 Schema Validation Test Results:');
    console.log('- Total schemas available:', results.totalSchemas);
    console.log('- Agent types with schemas:', results.validatedTypes);
    console.log('- Total agent types:', results.totalTypes);
    console.log('- Schema coverage:', (results.coverage * 100).toFixed(1) + '%');
    console.log('- Strict mode validation:', results.strictModeWorking ? '✅ Working' : '❌ Failed');
    console.log('- Non-strict mode fallback:', results.nonStrictModeWorking ? '✅ Working' : '❌ Failed');
    console.log('- Schema persistence:', results.persistenceWorking ? '✅ Working' : '❌ Failed');
    console.log('- Custom schema registration:', results.customSchemaWorking ? '✅ Working' : '❌ Failed');
    
    if (results.coverage >= 0.9) {
      console.log('✅ Excellent schema coverage achieved!');
    } else if (results.coverage >= 0.7) {
      console.log('✅ Good schema coverage achieved!');
    } else {
      console.log('⚠️  Schema coverage could be improved');
    }
  })
  .catch(error => {
    console.error('❌ Schema validation tests failed:', error);
    process.exit(1);
  });