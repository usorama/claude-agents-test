#!/usr/bin/env node

import { ContextManager } from '../src/context/ContextManager.js';
import { ContextLevel } from '../src/types/context.types.v2.js';
import { Neo4jConnection } from '../src/context/Neo4jConnection.js';
import winston from 'winston';

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
      return `${timestamp} [${level.toUpperCase()}] ${message}${metaStr}`;
    })
  ),
  transports: [new winston.transports.Console()]
});

async function checkNeo4jAvailability() {
  logger.info('Checking Neo4j availability...');
  
  const connection = new Neo4jConnection();
  try {
    await connection.connect();
    const isConnected = await connection.testConnection();
    await connection.close();
    
    if (isConnected) {
      logger.info('✓ Neo4j is available and ready');
      return true;
    } else {
      logger.error('✗ Neo4j connection test failed');
      return false;
    }
  } catch (error) {
    logger.error('✗ Neo4j is not available', { error: error.message });
    logger.info('Please ensure Neo4j is running: docker-compose up -d');
    return false;
  }
}

async function testNeo4jIntegration() {
  logger.info('Starting Neo4j integration test...');
  
  // Check if Neo4j is available
  const neo4jAvailable = await checkNeo4jAvailability();
  if (!neo4jAvailable) {
    logger.error('Cannot proceed without Neo4j. Exiting.');
    process.exit(1);
  }
  
  // Initialize ContextManager with Neo4j
  const contextManager = new ContextManager({
    baseDir: './test-context-store-neo4j',
    logLevel: 'debug',
    useNeo4j: true,
    graphConfig: {
      useNeo4j: true,
      neo4j: {
        uri: process.env.NEO4J_URI || 'bolt://localhost:7687',
        username: process.env.NEO4J_USERNAME || 'neo4j',
        password: process.env.NEO4J_PASSWORD || 'claudeagents123'
      }
    }
  });
  
  try {
    // Initialize the context manager
    logger.info('Initializing ContextManager with Neo4j...');
    await contextManager.initialize();
    logger.info('✓ ContextManager initialized');
    
    // Create project context
    logger.info('Creating project context...');
    const projectContext = await contextManager.createContext(
      ContextLevel.PROJECT,
      {
        projectId: 'test-project-neo4j',
        name: 'Neo4j Integration Test Project',
        description: 'Testing Neo4j graph database integration',
        status: 'active'
      }
    );
    logger.info('✓ Project context created', { id: projectContext.id });
    
    // Create agent contexts with relationships
    logger.info('Creating agent contexts...');
    const orchestratorAgent = await contextManager.createContext(
      ContextLevel.AGENT,
      {
        agentType: 'orchestrator',
        state: { active: true },
        capabilities: ['coordinate', 'delegate']
      },
      projectContext.id
    );
    logger.info('✓ Orchestrator agent created', { id: orchestratorAgent.id });
    
    const devAgent = await contextManager.createContext(
      ContextLevel.AGENT,
      {
        agentType: 'developer',
        state: { active: true },
        capabilities: ['code', 'test']
      },
      projectContext.id
    );
    logger.info('✓ Developer agent created', { id: devAgent.id });
    
    const qaAgent = await contextManager.createContext(
      ContextLevel.AGENT,
      {
        agentType: 'qa',
        state: { active: true },
        capabilities: ['test', 'review']
      },
      projectContext.id
    );
    logger.info('✓ QA agent created', { id: qaAgent.id });
    
    // Create task contexts with dependencies
    logger.info('Creating task contexts with dependencies...');
    const designTask = await contextManager.createContext(
      ContextLevel.TASK,
      {
        taskId: 'design-001',
        type: 'design',
        status: 'completed',
        assignedTo: devAgent.id
      },
      projectContext.id
    );
    
    const implementTask = await contextManager.createContext(
      ContextLevel.TASK,
      {
        taskId: 'impl-001',
        type: 'implementation',
        status: 'running',
        assignedTo: devAgent.id,
        dependencies: [designTask.id]
      },
      projectContext.id
    );
    
    const testTask = await contextManager.createContext(
      ContextLevel.TASK,
      {
        taskId: 'test-001',
        type: 'testing',
        status: 'pending',
        assignedTo: qaAgent.id,
        dependencies: [implementTask.id]
      },
      projectContext.id
    );
    logger.info('✓ Task contexts created with dependencies');
    
    // Test graph queries
    logger.info('\nTesting graph queries...');
    
    // Get context with relationships
    const projectWithRels = await contextManager.getContextWithRelationships(
      ContextLevel.PROJECT,
      projectContext.id
    );
    logger.info('✓ Project relationships:', {
      children: projectWithRels.relationships.children.length,
      dependencies: projectWithRels.relationships.dependencies.length
    });
    
    // Analyze impact
    const impact = await contextManager.analyzeImpact(implementTask.id);
    logger.info('✓ Impact analysis:', {
      totalImpacted: impact.summary.totalImpacted,
      critical: impact.summary.critical
    });
    
    // Find dependency cycles
    const cycles = await contextManager.findDependencyCycles();
    logger.info('✓ Dependency cycles check:', { cycles: cycles.length });
    
    // Query with relationships
    const queryResults = await contextManager.queryWithRelationships({
      startContextId: projectContext.id,
      relationshipTypes: ['parent'],
      maxDepth: 2
    });
    logger.info('✓ Query results:', { found: queryResults.length });
    
    // Get graph statistics
    const stats = await contextManager.getGraphStatistics();
    logger.info('✓ Graph statistics:', stats);
    
    // Test Neo4j-specific features
    logger.info('\nTesting Neo4j-specific features...');
    
    // Direct Neo4j query through connection
    const connection = new Neo4jConnection();
    await connection.connect();
    
    const cypherResult = await connection.run(`
      MATCH (p:Context {id: $projectId})-[r:RELATES_TO*1..2]->(related)
      RETURN count(related) as relatedCount
    `, { projectId: projectContext.id });
    
    const relatedCount = cypherResult.records[0].get('relatedCount').toNumber();
    logger.info('✓ Direct Cypher query result:', { relatedCount });
    
    await connection.close();
    
    logger.info('\n✅ All Neo4j integration tests passed!');
    
  } catch (error) {
    logger.error('Test failed:', { error: error.message, stack: error.stack });
    throw error;
  } finally {
    // Cleanup
    logger.info('\nCleaning up...');
    await contextManager.shutdown();
    
    // Clean test directory
    const fs = await import('fs/promises');
    await fs.rm('./test-context-store-neo4j', { recursive: true, force: true });
    logger.info('✓ Cleanup complete');
  }
}

// Run the test
testNeo4jIntegration().catch(error => {
  logger.error('Test execution failed:', error);
  process.exit(1);
});