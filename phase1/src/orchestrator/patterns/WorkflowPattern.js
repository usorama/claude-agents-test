import winston from 'winston';

/**
 * Base class for all workflow patterns
 * Provides common functionality and interface for pattern implementations
 */
export class WorkflowPattern {
  constructor(orchestrator, config = {}) {
    if (!orchestrator) {
      throw new Error('Orchestrator instance required for workflow pattern');
    }
    
    this.orchestrator = orchestrator;
    this.config = {
      name: 'BasePattern',
      description: 'Base workflow pattern',
      maxRetries: 2,
      timeout: 300000, // 5 minutes default
      ...config
    };
    
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.label({ label: `WorkflowPattern:${this.config.name}` }),
        winston.format.printf(({ timestamp, label, level, message, ...metadata }) => {
          let msg = `${timestamp} [${label}] ${level}: ${message}`;
          if (Object.keys(metadata).length > 0) {
            msg += ` ${JSON.stringify(metadata)}`;
          }
          return msg;
        })
      ),
      transports: [new winston.transports.Console()]
    });
    this.metrics = {
      executionCount: 0,
      successCount: 0,
      failureCount: 0,
      averageExecutionTime: 0,
      lastExecutionTime: null,
      patternSpecificMetrics: {}
    };
  }

  /**
   * Execute the workflow pattern with given tasks
   * Must be implemented by subclasses
   */
  async execute(tasks, options = {}) {
    throw new Error('Pattern must implement execute method');
  }

  /**
   * Check if this pattern can handle the given task analysis
   * Must be implemented by subclasses
   */
  canHandle(taskAnalysis) {
    throw new Error('Pattern must implement canHandle method');
  }

  /**
   * Get pattern-specific configuration schema
   * Can be overridden by subclasses
   */
  getConfigSchema() {
    return {
      maxRetries: { type: 'number', min: 0, max: 5 },
      timeout: { type: 'number', min: 1000, max: 3600000 },
      patternSpecific: {}
    };
  }

  /**
   * Validate pattern configuration
   */
  validateConfig(config) {
    const schema = this.getConfigSchema();
    // Basic validation - can be enhanced with Zod
    for (const [key, rules] of Object.entries(schema)) {
      if (config[key] !== undefined) {
        if (rules.type && typeof config[key] !== rules.type) {
          throw new Error(`Invalid type for ${key}: expected ${rules.type}`);
        }
        if (rules.min !== undefined && config[key] < rules.min) {
          throw new Error(`${key} must be at least ${rules.min}`);
        }
        if (rules.max !== undefined && config[key] > rules.max) {
          throw new Error(`${key} must be at most ${rules.max}`);
        }
      }
    }
    return true;
  }

  /**
   * Pre-execution hook for pattern setup
   */
  async beforeExecute(tasks, options) {
    this.logger.info(`Starting ${this.config.name} pattern execution`, {
      taskCount: tasks.length,
      options
    });
    
    const executionId = this.generateExecutionId();
    const startTime = Date.now();
    
    return { executionId, startTime };
  }

  /**
   * Post-execution hook for cleanup and metrics
   */
  async afterExecute(executionContext, result, error = null) {
    const { executionId, startTime } = executionContext;
    const executionTime = Date.now() - startTime;
    
    // Update metrics
    this.updateMetrics(executionTime, !error);
    
    if (error) {
      this.logger.error(`${this.config.name} pattern execution failed`, {
        executionId,
        executionTime,
        error: error.message
      });
    } else {
      this.logger.info(`${this.config.name} pattern execution completed`, {
        executionId,
        executionTime,
        resultSummary: this.summarizeResult(result)
      });
    }
    
    return { executionTime, success: !error };
  }

  /**
   * Execute a single task through an agent
   */
  async executeTask(task, agent, options = {}) {
    const { retries = this.config.maxRetries } = options;
    let lastError = null;
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const result = await this.orchestrator.taskQueue.add(
          async () => {
            return await agent.execute({
              taskId: task.id || this.generateTaskId(),
              taskType: task.type,
              input: task.input
            });
          },
          { 
            priority: this.getTaskPriority(task.priority),
            timeout: task.timeout || this.config.timeout
          }
        );
        
        return {
          task: task.id,
          agent: agent.type,
          result,
          attempts: attempt + 1,
          success: true
        };
      } catch (error) {
        lastError = error;
        this.logger.warn(`Task execution failed (attempt ${attempt + 1}/${retries + 1})`, {
          task: task.id,
          agent: agent.type,
          error: error.message
        });
        
        if (attempt < retries) {
          await this.delay(Math.pow(2, attempt) * 1000); // Exponential backoff
        }
      }
    }
    
    return {
      task: task.id,
      agent: agent.type,
      error: lastError,
      attempts: retries + 1,
      success: false
    };
  }

  /**
   * Get agent instance by type
   */
  getAgent(agentType) {
    // Try direct lookup first
    let agent = this.orchestrator.agents.get(agentType);
    
    // If not found, try mapping from uppercase constant
    if (!agent && this.orchestrator.agentTypeMap) {
      const mappedType = this.orchestrator.agentTypeMap[agentType];
      if (mappedType) {
        agent = this.orchestrator.agents.get(mappedType);
      }
    }
    
    if (!agent) {
      throw new Error(`Agent not found: ${agentType}`);
    }
    return agent;
  }

  /**
   * Check if agent is available
   */
  async isAgentAvailable(agentType) {
    const agent = this.orchestrator.agents.get(agentType);
    if (!agent) return false;
    
    // Check if agent has isAvailable method
    if (typeof agent.isAvailable === 'function') {
      return await agent.isAvailable();
    }
    
    // Default: check if agent is initialized
    return agent.state && agent.state.status === 'idle';
  }

  /**
   * Select best agent for a task based on capabilities
   */
  selectAgentForTask(task) {
    const requiredCapabilities = task.requiredCapabilities || [];
    let bestAgent = null;
    let bestScore = 0;
    
    for (const [agentType, agent] of this.orchestrator.agents) {
      const score = this.calculateAgentScore(agent, requiredCapabilities);
      if (score > bestScore) {
        bestScore = score;
        bestAgent = agentType;
      }
    }
    
    return bestAgent;
  }

  /**
   * Calculate agent score based on capabilities match
   */
  calculateAgentScore(agent, requiredCapabilities) {
    if (!agent.capabilities || requiredCapabilities.length === 0) {
      return 0;
    }
    
    let score = 0;
    for (const capability of requiredCapabilities) {
      if (agent.capabilities.includes(capability)) {
        score++;
      }
    }
    
    return score / requiredCapabilities.length;
  }

  /**
   * Group tasks by various criteria
   */
  groupTasks(tasks, groupBy = 'agent') {
    const groups = new Map();
    
    for (const task of tasks) {
      let key;
      switch (groupBy) {
        case 'agent':
          key = task.agent || this.selectAgentForTask(task);
          break;
        case 'priority':
          key = task.priority || 'medium';
          break;
        case 'type':
          key = task.type;
          break;
        default:
          key = 'default';
      }
      
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key).push(task);
    }
    
    return groups;
  }

  /**
   * Update pattern metrics
   */
  updateMetrics(executionTime, success) {
    this.metrics.executionCount++;
    if (success) {
      this.metrics.successCount++;
    } else {
      this.metrics.failureCount++;
    }
    
    // Update average execution time
    const totalTime = this.metrics.averageExecutionTime * (this.metrics.executionCount - 1) + executionTime;
    this.metrics.averageExecutionTime = totalTime / this.metrics.executionCount;
    
    this.metrics.lastExecutionTime = executionTime;
  }

  /**
   * Get pattern metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      successRate: this.metrics.executionCount > 0 
        ? this.metrics.successCount / this.metrics.executionCount 
        : 0
    };
  }

  /**
   * Summarize execution result
   */
  summarizeResult(result) {
    if (Array.isArray(result)) {
      return {
        totalTasks: result.length,
        successful: result.filter(r => r.success).length,
        failed: result.filter(r => !r.success).length
      };
    }
    return { type: typeof result };
  }

  /**
   * Utility: Generate unique execution ID
   */
  generateExecutionId() {
    return `EXEC-${this.config.name}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  }

  /**
   * Utility: Generate unique task ID
   */
  generateTaskId() {
    return `TASK-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  }

  /**
   * Utility: Get numeric priority for task queue
   */
  getTaskPriority(priority) {
    const priorities = {
      critical: 1,
      high: 2,
      medium: 3,
      low: 4
    };
    return priorities[priority] || 3;
  }

  /**
   * Utility: Delay execution
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get pattern information
   */
  getInfo() {
    return {
      name: this.config.name,
      description: this.config.description,
      metrics: this.getMetrics(),
      config: this.config
    };
  }
}