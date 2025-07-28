import { ContextManager } from '../context/ContextManager.js';
import winston from 'winston';

export class BaseAgent {
  constructor(config = {}) {
    this.id = config.id || this.constructor.name;
    this.type = config.type || 'base';
    this.contextManager = config.contextManager || new ContextManager();
    this.tools = config.tools || [];
    this.maxTokens = config.maxTokens || 50000;
    this.usedTokens = 0;
    this.startTime = Date.now();
    
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      defaultMeta: { agentId: this.id },
      transports: [
        new winston.transports.File({ filename: `poc-agent-${this.id}.log` }),
        new winston.transports.Console()
      ]
    });
  }

  async initialize() {
    this.logger.info('Agent initializing', { type: this.type });
    await this.contextManager.initialize();
    
    // Load previous context if exists
    this.context = await this.contextManager.loadContext(this.id, 'state') || {
      history: [],
      metadata: {},
      createdAt: new Date().toISOString()
    };
    
    this.logger.info('Agent initialized', { 
      type: this.type, 
      hasContext: !!this.context.history.length 
    });
  }

  async execute(task, input = {}) {
    const taskStart = Date.now();
    this.logger.info('Executing task', { task, input });
    
    try {
      // Check token limit
      if (this.usedTokens > this.maxTokens) {
        throw new Error(`Token limit exceeded: ${this.usedTokens}/${this.maxTokens}`);
      }
      
      // Check time limit (2 hours)
      const elapsed = Date.now() - this.startTime;
      if (elapsed > 2 * 60 * 60 * 1000) {
        throw new Error('Session time limit exceeded (2 hours)');
      }
      
      // Execute task implementation
      const result = await this._executeTask(task, input);
      
      // Update context
      this.context.history.push({
        task,
        input,
        result,
        timestamp: new Date().toISOString(),
        duration: Date.now() - taskStart
      });
      
      // Save context
      await this.contextManager.saveContext(this.id, 'state', this.context);
      
      // Simulate token usage
      this.usedTokens += Math.floor(Math.random() * 1000) + 500;
      
      this.logger.info('Task completed', { 
        task, 
        duration: Date.now() - taskStart,
        tokensUsed: this.usedTokens 
      });
      
      return result;
    } catch (error) {
      this.logger.error('Task failed', { task, error: error.message });
      throw error;
    }
  }

  async _executeTask(task, input) {
    // Override in subclasses
    throw new Error('_executeTask must be implemented by subclass');
  }

  async shareContext(toAgentId, data) {
    return await this.contextManager.shareContext(this.id, toAgentId, 'shared', data);
  }

  async getSharedContext(shareId) {
    return await this.contextManager.getSharedContext(shareId);
  }

  getMetrics() {
    return {
      id: this.id,
      type: this.type,
      tokensUsed: this.usedTokens,
      sessionDuration: Date.now() - this.startTime,
      tasksExecuted: this.context.history.length,
      lastTaskTime: this.context.history[this.context.history.length - 1]?.timestamp
    };
  }
}