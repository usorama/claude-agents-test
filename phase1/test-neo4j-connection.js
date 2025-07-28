#!/usr/bin/env node

/**
 * IronClaude-S: Neo4j Connection Testing
 * Tests connection to Neo4j Docker container and basic operations
 */

import { Neo4jConnection } from './src/context/Neo4jConnection.js';
import { Neo4jContextGraph } from './src/context/Neo4jContextGraph.js';
import { GraphFactory } from './src/context/GraphFactory.js';

async function testNeo4jConnection() {
  console.log('🔌 IronClaude-S: Testing Neo4j Connection\n');

  let allTestsPassed = true;

  // Test 1: Basic Connection
  console.log('📋 Test 1: Basic Neo4j Connection\n');

  try {
    const connection = new Neo4jConnection({
      uri: 'bolt://localhost:7689',
      username: 'neo4j',
      password: 'claudeagents123'
    });

    await connection.connect();
    console.log('   ✅ Connected to Neo4j successfully');

    const isConnected = await connection.testConnection();
    if (isConnected) {
      console.log('   ✅ Connection test passed');
    } else {
      console.log('   ❌ Connection test failed');
      allTestsPassed = false;
    }

    await connection.close();
    console.log('   ✅ Connection closed successfully\n');

  } catch (error) {
    console.log(`   ❌ Basic connection failed: ${error.message}\n`);
    allTestsPassed = false;
  }

  // Test 2: Neo4j Context Graph
  console.log('📊 Test 2: Neo4j Context Graph Operations\n');

  try {
    const graph = new Neo4jContextGraph({
      neo4j: {
        uri: 'bolt://localhost:7689',
        username: 'neo4j',
        password: 'claudeagents123'
      }
    });

    await graph.initialize();
    console.log('   ✅ Neo4j context graph initialized');

    // Test adding a node
    const testContext = {
      id: 'test-context-001',
      level: 'project',
      data: {
        projectName: 'Neo4j Test Project',
        testData: true
      },
      metadata: {
        createdAt: new Date().toISOString(),
        version: 1
      }
    };

    await graph.addNode(testContext.id, testContext);
    console.log('   ✅ Added test node to Neo4j');

    // Test adding an edge
    const testContext2 = {
      id: 'test-context-002',
      level: 'agent',
      data: {
        agentId: 'test-agent',
        agentType: 'TestAgent'
      },
      metadata: {
        createdAt: new Date().toISOString(),
        version: 1
      }
    };

    await graph.addNode(testContext2.id, testContext2);
    await graph.addEdge(testContext.id, testContext2.id, {
      type: 'parent',
      weight: 1.0,
      metadata: { level: 'agent' }
    });
    console.log('   ✅ Added test edge to Neo4j');

    // Test querying nodes
    const neighbors = await graph.getNeighbors(testContext.id);
    if (neighbors.length > 0) {
      console.log(`   ✅ Found ${neighbors.length} neighbors`);
    } else {
      console.log('   ❌ No neighbors found');
      allTestsPassed = false;
    }

    await graph.close();
    console.log('   ✅ Neo4j context graph closed\n');

  } catch (error) {
    console.log(`   ❌ Neo4j context graph test failed: ${error.message}\n`);
    allTestsPassed = false;
  }

  // Test 3: Graph Factory with Neo4j
  console.log('🏭 Test 3: Graph Factory Neo4j Selection\n');

  try {
    // Set environment to prefer Neo4j
    process.env.USE_NEO4J = 'true';
    process.env.NEO4J_URI = 'bolt://localhost:7689';
    process.env.NEO4J_USERNAME = 'neo4j';
    process.env.NEO4J_PASSWORD = 'claudeagents123';

    const graph = await GraphFactory.create({
      useNeo4j: true,
      neo4j: {
        uri: 'bolt://localhost:7689',
        username: 'neo4j',
        password: 'claudeagents123'
      }
    });

    if (graph instanceof Neo4jContextGraph) {
      console.log('   ✅ GraphFactory correctly created Neo4j graph');
    } else {
      console.log('   ❌ GraphFactory created wrong graph type');
      allTestsPassed = false;
    }

    // Test availability check
    const isAvailable = await GraphFactory.isNeo4jAvailable({
      neo4j: {
        uri: 'bolt://localhost:7689',
        username: 'neo4j',
        password: 'claudeagents123'
      }
    });

    if (isAvailable) {
      console.log('   ✅ Neo4j availability check passed');
    } else {
      console.log('   ❌ Neo4j availability check failed');
      allTestsPassed = false;
    }

    await graph.close();
    console.log('   ✅ Factory-created graph closed\n');

  } catch (error) {
    console.log(`   ❌ Graph factory test failed: ${error.message}\n`);
    allTestsPassed = false;
  }

  // Test 4: Context Migration Test
  console.log('📦 Test 4: Context Data Migration\n');

  try {
    const graph = new Neo4jContextGraph({
      neo4j: {
        uri: 'bolt://localhost:7689',
        username: 'neo4j',
        password: 'claudeagents123'
      }
    });

    await graph.initialize();

    // Create a complex context hierarchy
    const projectCtx = {
      id: 'migration-project-001',
      level: 'project',
      data: {
        projectName: 'Migration Test Project',
        description: 'Testing context migration to Neo4j',
        activeAgents: ['agent-001', 'agent-002'],
        sharedState: { migrationTest: true }
      },
      metadata: {
        createdAt: new Date().toISOString(),
        version: 1,
        tags: ['test', 'migration']
      }
    };

    const agentCtx = {
      id: 'migration-agent-001',
      level: 'agent',
      data: {
        agentId: 'migration-agent',
        agentType: 'MigrationTestAgent',
        capabilities: ['testing', 'migration'],
        state: { active: true, progress: 0.5 }
      },
      metadata: {
        createdAt: new Date().toISOString(),
        version: 1,
        tags: ['agent', 'test']
      }
    };

    const taskCtx = {
      id: 'migration-task-001',
      level: 'task',
      data: {
        taskId: 'migration-task',
        taskType: 'migration-test',
        input: { testData: 'Migration test input' },
        status: 'completed',
        output: { result: 'Migration successful' }
      },
      metadata: {
        createdAt: new Date().toISOString(),
        version: 1,
        tags: ['task', 'completed']
      }
    };

    // Add nodes
    await graph.addNode(projectCtx.id, projectCtx);
    await graph.addNode(agentCtx.id, agentCtx);
    await graph.addNode(taskCtx.id, taskCtx);

    // Add relationships
    await graph.addEdge(projectCtx.id, agentCtx.id, {
      type: 'parent',
      weight: 1.0,
      metadata: { level: 'agent' }
    });

    await graph.addEdge(projectCtx.id, taskCtx.id, {
      type: 'parent',
      weight: 1.0,
      metadata: { level: 'task' }
    });

    await graph.addEdge(agentCtx.id, taskCtx.id, {
      type: 'executes',
      weight: 0.8,
      metadata: { relationship: 'execution' }
    });

    console.log('   ✅ Created complex context hierarchy in Neo4j');

    // Test querying the hierarchy
    const projectNeighbors = await graph.getNeighbors(projectCtx.id);
    const dependencies = await graph.findDependencies(taskCtx.id);

    console.log(`   ✅ Project has ${projectNeighbors.length} direct relationships`);
    console.log(`   ✅ Task has ${dependencies.length} dependencies`);

    // Test impact analysis
    const impactedContexts = await graph.findImpactedContexts(projectCtx.id, {
      maxDistance: 2,
      relationshipTypes: ['parent', 'executes']
    });

    console.log(`   ✅ Project impacts ${impactedContexts.length} contexts`);

    await graph.close();
    console.log('   ✅ Migration test completed\n');

  } catch (error) {
    console.log(`   ❌ Context migration test failed: ${error.message}\n`);
    allTestsPassed = false;
  }

  // Summary
  console.log('📊 Neo4j Integration Test Results:');
  console.log(`   - Basic connection: ${allTestsPassed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`   - Context graph operations: ${allTestsPassed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`   - Graph factory integration: ${allTestsPassed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`   - Context migration: ${allTestsPassed ? '✅ PASSED' : '❌ FAILED'}`);
  
  if (allTestsPassed) {
    console.log('\n🎉 All Neo4j integration tests passed!');
    console.log('✅ Neo4j Docker container is working correctly');
    console.log('✅ Context data can be migrated to Neo4j');
    console.log('✅ Graph operations are functional');
  } else {
    console.log('\n❌ Some Neo4j integration tests failed');
    console.log('⚠️  Check Neo4j container status and credentials');
  }

  // Clean up environment variables
  delete process.env.USE_NEO4J;
  delete process.env.NEO4J_URI;
  delete process.env.NEO4J_USERNAME;
  delete process.env.NEO4J_PASSWORD;

  return allTestsPassed;
}

// Run the test
testNeo4jConnection()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Neo4j connection test failed:', error);
    process.exit(1);
  });