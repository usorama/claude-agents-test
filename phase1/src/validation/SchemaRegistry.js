import { z } from 'zod';
import winston from 'winston';
import fs from 'fs/promises';
import path from 'path';

/**
 * SchemaRegistry manages JSON schemas for all agents and validates configurations
 */
export class SchemaRegistry {
  constructor(config = {}) {
    this.schemas = new Map();
    this.schemaDir = config.schemaDir || './schemas';
    this.strictMode = config.strictMode !== false; // Default to strict
    
    this.logger = winston.createLogger({
      level: config.logLevel || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { service: 'SchemaRegistry' },
      transports: [
        new winston.transports.Console({
          format: winston.format.simple()
        })
      ]
    });
    
    // Initialize default schemas
    this._initializeDefaultSchemas();
  }

  /**
   * Initialize with default agent schemas
   * @private
   */
  _initializeDefaultSchemas() {
    // Base agent schema
    this.registerSchema('BaseAgent', z.object({
      id: z.string().min(1),
      type: z.string().min(1),
      name: z.string().min(1),
      description: z.string().optional(),
      capabilities: z.array(z.string()).optional(),
      tools: z.array(z.string()).optional(),
      maxSessionTokens: z.number().positive().optional(),
      maxSessionDuration: z.number().positive().optional(),
      logLevel: z.enum(['error', 'warn', 'info', 'debug']).optional()
    }));
    
    // Analyst agent schema
    this.registerSchema('AnalystAgent', this.schemas.get('BaseAgent').extend({
      researchDepth: z.enum(['shallow', 'medium', 'deep']).optional(),
      focusAreas: z.array(z.string()).optional(),
      outputFormats: z.array(z.enum(['summary', 'detailed', 'technical'])).optional()
    }));
    
    // PM agent schema
    this.registerSchema('PMAgent', this.schemas.get('BaseAgent').extend({
      methodologies: z.array(z.enum(['agile', 'waterfall', 'hybrid'])).optional(),
      storyFormat: z.enum(['user-story', 'job-story', 'traditional']).optional(),
      prioritizationMethod: z.enum(['moscow', 'rice', 'value-effort']).optional()
    }));
    
    // Architect agent schema
    this.registerSchema('ArchitectAgent', this.schemas.get('BaseAgent').extend({
      designPatterns: z.array(z.string()).optional(),
      architectureStyles: z.array(z.enum(['microservices', 'monolithic', 'serverless', 'event-driven'])).optional(),
      documentationLevel: z.enum(['high-level', 'detailed', 'comprehensive']).optional()
    }));
    
    // Developer agent schema
    this.registerSchema('DeveloperAgent', this.schemas.get('BaseAgent').extend({
      languages: z.array(z.string()).optional(),
      frameworks: z.array(z.string()).optional(),
      testingStrategy: z.enum(['tdd', 'bdd', 'traditional']).optional(),
      codeStyle: z.enum(['verbose', 'concise', 'balanced']).optional()
    }));
    
    // QA agent schema
    this.registerSchema('QAAgent', this.schemas.get('BaseAgent').extend({
      testTypes: z.array(z.enum(['unit', 'integration', 'e2e', 'performance', 'security'])).optional(),
      coverageThreshold: z.number().min(0).max(100).optional(),
      automationLevel: z.enum(['manual', 'semi-automated', 'fully-automated']).optional()
    }));
    
    // DevOps agent schema
    this.registerSchema('DevOpsAgent', this.schemas.get('BaseAgent').extend({
      platforms: z.array(z.enum(['aws', 'gcp', 'azure', 'kubernetes', 'docker'])).optional(),
      automationTools: z.array(z.string()).optional(),
      monitoringTools: z.array(z.string()).optional(),
      deploymentStrategy: z.enum(['blue-green', 'canary', 'rolling', 'recreate']).optional()
    }));
    
    // Git manager agent schema
    this.registerSchema('GitManagerAgent', this.schemas.get('BaseAgent').extend({
      branchingStrategy: z.enum(['git-flow', 'github-flow', 'gitlab-flow', 'trunk-based']).optional(),
      commitMessageFormat: z.enum(['conventional', 'semantic', 'custom']).optional(),
      autoMergeEnabled: z.boolean().optional(),
      protectedBranches: z.array(z.string()).optional()
    }));
    
    // Monitor agent schema
    this.registerSchema('MonitorAgent', this.schemas.get('BaseAgent').extend({
      checkInterval: z.number().min(1000).optional(), // milliseconds
      metrics: z.array(z.string()).optional(),
      alertThresholds: z.record(z.number()).optional(),
      notificationChannels: z.array(z.enum(['email', 'slack', 'webhook', 'log'])).optional()
    }));
    
    // Self-healer agent schema
    this.registerSchema('SelfHealerAgent', this.schemas.get('BaseAgent').extend({
      healingStrategies: z.array(z.string()).optional(),
      maxRetries: z.number().min(1).optional(),
      cooldownPeriod: z.number().min(0).optional(), // milliseconds
      autoHealEnabled: z.boolean().optional()
    }));
    
    // Orchestrator schema
    this.registerSchema('OrchestratorAgent', this.schemas.get('BaseAgent').extend({
      type: z.literal('OrchestratorAgent'),
      maxConcurrency: z.number().min(1).max(10).optional(),
      defaultPattern: z.enum(['router', 'orchestrator-workers', 'pipeline']).optional(),
      patternConfig: z.object({
        router: z.object({
          fallbackStrategy: z.enum(['most-capable', 'round-robin', 'fail']).optional()
        }).optional(),
        orchestratorWorkers: z.object({
          maxWorkers: z.number().min(1).max(10).optional()
        }).optional(),
        pipeline: z.object({
          errorHandling: z.enum(['stop', 'continue', 'skip-stage']).optional()
        }).optional()
      }).optional()
    }));
  }

  /**
   * Register a new schema
   * @param {string} agentType - The agent type
   * @param {z.ZodSchema} schema - The Zod schema
   */
  registerSchema(agentType, schema) {
    this.schemas.set(agentType, schema);
    this.logger.info('Schema registered', { agentType });
  }

  /**
   * Get schema for an agent type
   * @param {string} agentType - The agent type
   * @returns {z.ZodSchema|null} The schema or null if not found
   */
  getSchema(agentType) {
    return this.schemas.get(agentType) || null;
  }

  /**
   * Validate agent configuration
   * @param {string} agentType - The agent type
   * @param {Object} config - The configuration to validate
   * @returns {Object} Validated configuration
   * @throws {Error} If validation fails
   */
  validateAgentConfig(agentType, config) {
    const schema = this.getSchema(agentType);
    
    if (!schema) {
      if (this.strictMode) {
        throw new Error(`No schema found for agent type: ${agentType}`);
      }
      this.logger.warn('No schema found, skipping validation', { agentType });
      return config;
    }
    
    try {
      const validated = schema.parse(config);
      this.logger.debug('Configuration validated', { agentType });
      return validated;
    } catch (error) {
      this.logger.error('Configuration validation failed', { 
        agentType, 
        errors: error.errors 
      });
      
      if (this.strictMode) {
        throw new Error(
          `Invalid configuration for ${agentType}: ${this._formatValidationErrors(error)}`
        );
      }
      
      // In non-strict mode, log warning and return original config
      this.logger.warn('Validation failed in non-strict mode, using original config', { agentType });
      return config;
    }
  }

  /**
   * Format validation errors for readable output
   * @private
   */
  _formatValidationErrors(error) {
    if (!error.errors || !Array.isArray(error.errors)) {
      return error.message;
    }
    
    return error.errors
      .map(err => `${err.path.join('.')}: ${err.message}`)
      .join(', ');
  }

  /**
   * Load schemas from directory
   * @param {string} dir - Directory containing schema files
   */
  async loadSchemasFromDirectory(dir = null) {
    const schemaDirectory = dir || this.schemaDir;
    
    try {
      await fs.mkdir(schemaDirectory, { recursive: true });
      const files = await fs.readdir(schemaDirectory);
      
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        
        const filePath = path.join(schemaDirectory, file);
        const content = await fs.readFile(filePath, 'utf8');
        const schemaData = JSON.parse(content);
        
        // Convert JSON schema to Zod schema (simplified version)
        const zodSchema = this._jsonSchemaToZod(schemaData);
        const agentType = path.basename(file, '.json');
        
        this.registerSchema(agentType, zodSchema);
        this.logger.info('Loaded schema from file', { agentType, file });
      }
    } catch (error) {
      this.logger.error('Failed to load schemas from directory', { 
        directory: schemaDirectory, 
        error: error.message 
      });
    }
  }

  /**
   * Save current schemas to directory
   * @param {string} dir - Directory to save schemas
   */
  async saveSchemasToDirectory(dir = null) {
    const schemaDirectory = dir || this.schemaDir;
    
    try {
      await fs.mkdir(schemaDirectory, { recursive: true });
      
      for (const [agentType, schema] of this.schemas.entries()) {
        const filePath = path.join(schemaDirectory, `${agentType}.json`);
        // Note: This is a simplified representation
        const schemaData = {
          agentType,
          description: `Schema for ${agentType}`,
          schemaDefinition: this._zodToJsonSchema(schema)
        };
        
        await fs.writeFile(filePath, JSON.stringify(schemaData, null, 2));
        this.logger.info('Saved schema to file', { agentType, file: filePath });
      }
    } catch (error) {
      this.logger.error('Failed to save schemas to directory', { 
        directory: schemaDirectory, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Convert JSON Schema to Zod (simplified)
   * @private
   */
  _jsonSchemaToZod(jsonSchema) {
    // This is a very simplified conversion
    // In production, use a proper converter like json-schema-to-zod
    return z.object(
      Object.fromEntries(
        Object.entries(jsonSchema.properties || {}).map(([key, prop]) => {
          let zodType;
          
          switch (prop.type) {
            case 'string':
              zodType = z.string();
              if (prop.minLength) zodType = zodType.min(prop.minLength);
              if (prop.enum) zodType = z.enum(prop.enum);
              break;
            case 'number':
              zodType = z.number();
              if (prop.minimum) zodType = zodType.min(prop.minimum);
              if (prop.maximum) zodType = zodType.max(prop.maximum);
              break;
            case 'boolean':
              zodType = z.boolean();
              break;
            case 'array':
              zodType = z.array(z.unknown());
              break;
            case 'object':
              zodType = z.record(z.unknown());
              break;
            default:
              zodType = z.unknown();
          }
          
          if (!jsonSchema.required?.includes(key)) {
            zodType = zodType.optional();
          }
          
          return [key, zodType];
        })
      )
    );
  }

  /**
   * Convert Zod schema to JSON Schema representation (simplified)
   * @private
   */
  _zodToJsonSchema(zodSchema) {
    // This is a very simplified representation
    // In production, use zodSchema._def for proper introspection
    return {
      type: 'object',
      properties: {},
      required: []
    };
  }

  /**
   * Get all registered schemas
   * @returns {Array} Array of {agentType, schema} objects
   */
  getAllSchemas() {
    return Array.from(this.schemas.entries()).map(([agentType, schema]) => ({
      agentType,
      schema
    }));
  }

  /**
   * Clear all schemas (useful for testing)
   */
  clearSchemas() {
    this.schemas.clear();
    this.logger.info('All schemas cleared');
  }
}

// Singleton instance
let schemaRegistryInstance = null;

/**
 * Get or create the singleton SchemaRegistry instance
 * @param {Object} config - Configuration options
 * @returns {SchemaRegistry} The singleton instance
 */
export function getSchemaRegistry(config = {}) {
  if (!schemaRegistryInstance) {
    schemaRegistryInstance = new SchemaRegistry(config);
  }
  return schemaRegistryInstance;
}