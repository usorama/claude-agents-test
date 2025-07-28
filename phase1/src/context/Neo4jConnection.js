import neo4j from 'neo4j-driver';
import winston from 'winston';

/**
 * Manages Neo4j database connection
 */
export class Neo4jConnection {
  constructor(config = {}) {
    this.config = {
      uri: config.uri || process.env.NEO4J_URI || 'bolt://localhost:7689',
      username: config.username || process.env.NEO4J_USERNAME || 'neo4j',
      password: config.password || process.env.NEO4J_PASSWORD || 'claudeagents123',
      database: config.database || process.env.NEO4J_DATABASE || 'neo4j',
      maxConnectionPoolSize: config.maxConnectionPoolSize || 50,
      connectionAcquisitionTimeout: config.connectionAcquisitionTimeout || 60000,
      ...config
    };
    
    this.driver = null;
    this.connected = false;
    
    this.logger = winston.createLogger({
      level: config.logLevel || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { service: 'Neo4jConnection' },
      transports: [
        new winston.transports.Console({
          format: winston.format.simple()
        })
      ]
    });
  }

  /**
   * Connect to Neo4j database
   */
  async connect() {
    if (this.connected) {
      return;
    }
    
    try {
      this.driver = neo4j.driver(
        this.config.uri,
        neo4j.auth.basic(this.config.username, this.config.password),
        {
          maxConnectionPoolSize: this.config.maxConnectionPoolSize,
          connectionAcquisitionTimeout: this.config.connectionAcquisitionTimeout
        }
      );
      
      // Verify connectivity
      await this.driver.verifyConnectivity();
      
      this.connected = true;
      this.logger.info('Connected to Neo4j', { uri: this.config.uri });
      
      // Create indexes and constraints
      await this.createSchemaIfNotExists();
      
    } catch (error) {
      this.logger.error('Failed to connect to Neo4j', { error: error.message });
      throw error;
    }
  }

  /**
   * Create schema (indexes and constraints)
   */
  async createSchemaIfNotExists() {
    const session = this.driver.session();
    
    try {
      // Create unique constraint on Context ID
      await session.run(`
        CREATE CONSTRAINT context_id_unique IF NOT EXISTS
        FOR (c:Context) REQUIRE c.id IS UNIQUE
      `);
      
      // Create indexes for common queries
      await session.run(`
        CREATE INDEX context_level IF NOT EXISTS
        FOR (c:Context) ON (c.level)
      `);
      
      await session.run(`
        CREATE INDEX context_type IF NOT EXISTS
        FOR (c:Context) ON (c.type)
      `);
      
      await session.run(`
        CREATE INDEX context_agent_id IF NOT EXISTS
        FOR (c:Context) ON (c.agentId)
      `);
      
      // Create index on relationship types
      await session.run(`
        CREATE INDEX rel_type IF NOT EXISTS
        FOR ()-[r:RELATES_TO]-() ON (r.type)
      `);
      
      this.logger.info('Schema created/verified');
      
    } catch (error) {
      this.logger.error('Failed to create schema', { error: error.message });
      // Continue even if schema creation fails (might already exist)
    } finally {
      await session.close();
    }
  }

  /**
   * Get a session for running queries
   */
  getSession(options = {}) {
    if (!this.connected) {
      throw new Error('Not connected to Neo4j');
    }
    
    return this.driver.session({
      database: options.database || this.config.database,
      defaultAccessMode: options.writeMode ? neo4j.session.WRITE : neo4j.session.READ
    });
  }

  /**
   * Run a single query with automatic session management
   */
  async run(query, params = {}, options = {}) {
    // Detect write operations by query keywords
    const isWriteOperation = /\b(CREATE|MERGE|SET|DELETE|REMOVE|DETACH)\b/i.test(query);
    const sessionOptions = {
      ...options,
      writeMode: options.writeMode !== undefined ? options.writeMode : isWriteOperation
    };
    
    const session = this.getSession(sessionOptions);
    
    try {
      const result = await session.run(query, params);
      return result;
    } finally {
      await session.close();
    }
  }

  /**
   * Run a transaction with automatic session management
   */
  async transaction(work, options = {}) {
    const session = this.getSession({ ...options, writeMode: true });
    
    try {
      return await session.executeWrite(work);
    } finally {
      await session.close();
    }
  }

  /**
   * Run a read transaction
   */
  async readTransaction(work, options = {}) {
    const session = this.getSession(options);
    
    try {
      return await session.executeRead(work);
    } finally {
      await session.close();
    }
  }

  /**
   * Test connection
   */
  async testConnection() {
    try {
      const result = await this.run('RETURN 1 as test');
      return result.records[0].get('test').toNumber() === 1;
    } catch (error) {
      this.logger.error('Connection test failed', { error: error.message });
      return false;
    }
  }

  /**
   * Get database statistics
   */
  async getStats() {
    const result = await this.run(`
      MATCH (n)
      WITH count(n) as nodeCount
      MATCH ()-[r]->()
      WITH nodeCount, count(r) as relationshipCount
      MATCH (c:Context)
      WITH nodeCount, relationshipCount, count(c) as contextCount
      RETURN {
        totalNodes: nodeCount,
        totalRelationships: relationshipCount,
        contextNodes: contextCount,
        nonContextNodes: nodeCount - contextCount
      } as stats
    `);
    
    return result.records[0].get('stats');
  }

  /**
   * Clear all data (use with caution!)
   */
  async clearDatabase() {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Cannot clear database in production');
    }
    
    await this.run('MATCH (n) DETACH DELETE n');
    this.logger.warn('Database cleared');
  }

  /**
   * Close connection
   */
  async close() {
    if (this.driver) {
      await this.driver.close();
      this.connected = false;
      this.logger.info('Disconnected from Neo4j');
    }
  }

  /**
   * Check if connected
   */
  isConnected() {
    return this.connected;
  }
}