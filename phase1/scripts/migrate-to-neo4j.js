#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { ContextManager } from '../src/context/ContextManager.js';
import { Neo4jConnection } from '../src/context/Neo4jConnection.js';
import winston from 'winston';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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

/**
 * Check if Neo4j is available
 */
async function checkNeo4jAvailability() {
  const connection = new Neo4jConnection();
  try {
    await connection.connect();
    const isConnected = await connection.testConnection();
    await connection.close();
    return isConnected;
  } catch (error) {
    logger.error('Neo4j is not available', { error: error.message });
    return false;
  }
}

/**
 * Migrate existing contexts to Neo4j
 */
async function migrateToNeo4j(options = {}) {
  const {
    contextDir = './context-store',
    useNeo4j = true,
    clearExisting = false
  } = options;
  
  logger.info('Starting migration to Neo4j', { contextDir, clearExisting });
  
  // Check if Neo4j is available
  if (useNeo4j) {
    const neo4jAvailable = await checkNeo4jAvailability();
    if (!neo4jAvailable) {
      logger.error('Cannot proceed without Neo4j. Please ensure Neo4j is running.');
      return false;
    }
  }
  
  // Check if context directory exists
  try {
    await fs.access(contextDir);
  } catch (error) {
    logger.error('Context directory does not exist', { contextDir });
    return false;
  }
  
  // Initialize context managers
  const sourceManager = new ContextManager({
    baseDir: contextDir,
    logLevel: 'warn',
    useNeo4j: false  // Read from file system
  });
  
  const targetManager = new ContextManager({
    baseDir: contextDir,
    logLevel: 'info',
    useNeo4j: useNeo4j,
    graphConfig: {
      useNeo4j: useNeo4j
    }
  });
  
  try {
    // Initialize managers
    logger.info('Initializing context managers...');
    await sourceManager.initialize();
    await targetManager.initialize();
    
    // Clear existing Neo4j data if requested
    if (clearExisting && useNeo4j) {
      logger.info('Clearing existing Neo4j data...');
      const connection = new Neo4jConnection();
      await connection.connect();
      
      if (process.env.NODE_ENV !== 'production') {
        await connection.clearDatabase();
      }
      
      await connection.close();
    }
    
    // Initialize graph from existing contexts
    logger.info('Migrating contexts to graph database...');
    const stats = await targetManager.initializeGraph();
    
    logger.info('Migration completed successfully', {
      nodes: stats.nodeCount,
      edges: stats.edgeCount,
      relationshipTypes: stats.relationshipTypes
    });
    
    // Verify migration by running some queries
    logger.info('Verifying migration...');
    
    // Get graph statistics
    const graphStats = await targetManager.getGraphStatistics();
    logger.info('Graph statistics', graphStats);
    
    // Find dependency cycles
    const cycles = await targetManager.findDependencyCycles();
    logger.info('Dependency cycles found', { count: cycles.length });
    
    // Shutdown managers
    await sourceManager.shutdown();
    await targetManager.shutdown();
    
    return true;
    
  } catch (error) {
    logger.error('Migration failed', { error: error.message, stack: error.stack });
    
    // Cleanup
    try {
      await sourceManager.shutdown();
      await targetManager.shutdown();
    } catch (cleanupError) {
      logger.error('Cleanup failed', { error: cleanupError.message });
    }
    
    return false;
  }
}

// Command line interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Context to Neo4j Migration Tool

Usage: node migrate-to-neo4j.js [options]

Options:
  --context-dir <path>   Path to context store directory (default: ./context-store)
  --no-neo4j            Disable Neo4j and use in-memory graph
  --clear               Clear existing Neo4j data before migration
  --help, -h            Show this help message

Examples:
  # Migrate from default context store to Neo4j
  node migrate-to-neo4j.js

  # Migrate from custom directory and clear existing data
  node migrate-to-neo4j.js --context-dir ./my-contexts --clear

  # Test migration with in-memory graph
  node migrate-to-neo4j.js --no-neo4j
`);
    return;
  }
  
  // Parse arguments
  const contextDirIndex = args.indexOf('--context-dir');
  const contextDir = contextDirIndex !== -1 && args[contextDirIndex + 1] 
    ? args[contextDirIndex + 1] 
    : './context-store';
  
  const useNeo4j = !args.includes('--no-neo4j');
  const clearExisting = args.includes('--clear');
  
  // Run migration
  const success = await migrateToNeo4j({
    contextDir,
    useNeo4j,
    clearExisting
  });
  
  if (!success) {
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    logger.error('Unexpected error', { error: error.message, stack: error.stack });
    process.exit(1);
  });
}