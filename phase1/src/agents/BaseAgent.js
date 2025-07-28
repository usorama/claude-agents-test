import winston from 'winston';
import { ContextManager } from '../context/ContextManager.js';
import { 
  ContextLevel,
  AgentStateSchema,
  AgentRequestSchema,
  AgentResponseSchema,
  ClaudeCodeTool
} from '../types/index.js';
import { getSchemaRegistry } from '../validation/SchemaRegistry.js';
import { SafetyConstraints, SafetyViolationError } from '../safety/SafetyConstraints.js';
import { ConstraintEnforcer } from '../safety/ConstraintEnforcer.js';
import { ErrorRecoveryManager } from '../recovery/ErrorRecoveryManager.js';
import { RetryableOperation } from '../recovery/RetryableOperation.js';
import { EnhancedLogger } from '../logging/EnhancedLogger.js';
import { DebugUtils } from '../logging/DebugUtils.js';

export class BaseAgent {
  constructor(config) {
    // Validate configuration using schema registry
    const schemaRegistry = getSchemaRegistry();
    const agentType = config.type || this.constructor.name;
    
    try {
      // Validate config against schema
      this.config = schemaRegistry.validateAgentConfig(agentType, config);
    } catch (error) {
      throw new Error(`Invalid agent configuration: ${error.message}`);
    }
    
    // Set properties from validated config
    this.id = this.config.id;
    this.type = this.config.type;
    this.name = this.config.name;
    this.description = this.config.description;
    this.capabilities = this.config.capabilities || [];
    this.tools = this.config.tools || [];
    this.contextManager = null;
    this.state = {
      agentId: this.id,
      status: 'idle',
      currentTasks: [],
      completedTasks: 0,
      failedTasks: 0,
      totalTokensUsed: 0,
      lastActiveAt: new Date().toISOString()
    };
    
    // Performance tracking
    this.startTime = Date.now();
    this.sessionTokens = 0;
    this.maxSessionTokens = config.maxSessionTokens || 100000;
    this.maxSessionDuration = config.maxSessionDuration || 2 * 60 * 60 * 1000; // 2 hours
    this.performanceMonitor = null;
    this.currentTaskTracker = null;
    
    // Error recovery
    this.errorRecovery = null;
    this.retryEnabled = config.retryEnabled !== false;
    
    // Enhanced logging and debugging
    this.enhancedLogger = config.enhancedLogger || null;
    this.debugUtils = null;
    this.enableDebug = config.enableDebug || false;
    
    // Safety constraints
    this.constraints = new SafetyConstraints(this.config.safety || {});
    this.enforcer = new ConstraintEnforcer(this.constraints, this.config.safety || {});
    this.actionHistory = [];
    this.isThrottled = false;
    this.throttleDelay = 0;
    
    // Initialize enhanced logger if not provided
    if (!this.enhancedLogger) {
      this.enhancedLogger = new EnhancedLogger({
        level: config.logLevel || 'info',
        serviceName: `agent-${this.id}`,
        environment: config.environment || 'development',
        enableDebugMode: this.enableDebug,
        debugComponents: config.debugComponents || [this.type.toLowerCase()],
        logDirectory: config.logDirectory || `./logs/agents/${this.id}`
      });
    }
    
    // Initialize debug utils if debugging is enabled
    if (this.enableDebug) {
      this.debugUtils = new DebugUtils(this.enhancedLogger, {
        enableTracing: config.enableTracing !== false,
        enableProfiling: config.enableProfiling !== false,
        enableMemoryTracking: config.enableMemoryTracking !== false,
        enableCallStackCapture: config.enableCallStackCapture !== false
      });
    }
    
    // Keep winston logger for backward compatibility
    this.logger = winston.createLogger({
      level: config.logLevel || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { agent: this.id, type: this.type },
      transports: [
        new winston.transports.File({ filename: `agent-${this.id}.log` }),
        new winston.transports.Console({
          format: winston.format.simple()
        })
      ]
    });
  }

  async initialize(contextManager, performanceMonitor = null, errorRecovery = null) {
    this.contextManager = contextManager;
    this.performanceMonitor = performanceMonitor;
    this.errorRecovery = errorRecovery;
    
    // Register with performance monitor if provided
    if (this.performanceMonitor) {
      this.performanceMonitor.registerAgent(this.id, {
        type: this.type,
        maxResponseTime: this.config.maxResponseTime || 5000,
        maxMemory: this.config.maxMemory || 100 * 1024 * 1024,
        maxTokens: this.maxSessionTokens,
        thresholds: this.config.performanceThresholds || {}
      });
    }
    
    // Initialize error recovery if not provided
    if (!this.errorRecovery && this.retryEnabled) {
      this.errorRecovery = new ErrorRecoveryManager({
        maxRetries: this.config.maxRetries || 3,
        initialDelay: this.config.retryDelay || 1000,
        backoffMultiplier: this.config.backoffMultiplier || 2,
        circuitBreakerThreshold: this.config.circuitBreakerThreshold || 5,
        ...this.config.errorRecovery
      });
      
      await this.errorRecovery.start();
      
      // Register health check for this agent
      this.errorRecovery.registerHealthCheck(this.id, async () => {
        return this.state.status !== 'error' && 
               Date.now() - new Date(this.state.lastActiveAt).getTime() < 300000; // 5 minutes
      });
    }
    
    // Create or load agent context
    let context = await this.contextManager.getContext(ContextLevel.AGENT, this.id);
    if (!context) {
      context = await this.contextManager.createContext(
        ContextLevel.AGENT,
        {
          data: {
            agentId: this.id,
            agentType: this.type,
            state: this.state,
            history: [],
            capabilities: this.capabilities
          }
        }
      );
    } else {
      // Restore state from context
      this.state = context.data.state;
    }
    
    // Store context ID for updates
    this.contextId = context.id;
    
    // Register message handler
    this.contextManager.registerMessageHandler(this.id, this.handleMessage.bind(this));
    
    // Start resource monitoring
    this.enforcer.resourceMonitor.startTracking(this.id);
    
    this.logger.info('Agent initialized', { 
      capabilities: this.capabilities,
      tools: this.tools 
    });
  }

  async execute(request) {
    // Use error recovery if enabled
    if (this.errorRecovery && this.retryEnabled) {
      return await this._executeWithRecovery(request);
    }
    
    return await this._executeWithoutRecovery(request);
  }

  async _executeWithRecovery(request) {
    const retryableOp = new RetryableOperation(this.errorRecovery, {
      maxRetries: this.config.maxRetries || 3,
      timeout: this.config.taskTimeout || 30000,
      agentId: this.id,
      taskId: request.taskId,
      recoveryStrategy: this.config.recoveryStrategy || 'default'
    });
    
    return await retryableOp.execute(
      async (context, attempt) => {
        this.logger.info(`Executing task (attempt ${attempt})`, { 
          taskId: request.taskId,
          taskType: request.taskType,
          attempt
        });
        
        return await this._executeWithoutRecovery(request, context, attempt);
      },
      {
        agentId: this.id,
        taskId: request.taskId,
        cleanup: async () => {
          // Cleanup any partial state from failed attempt
          await this._cleanupFailedTask(request.taskId);
        },
        refresh: async () => {
          // Refresh agent state or connections
          await this._refreshAgentState();
        }
      }
    );
  }

  async _executeWithoutRecovery(request, recoveryContext = null, attempt = 1) {
    const startTime = Date.now();
    let taskContext = null;
    let endTrace = null;
    let endProfile = null;
    
    try {
      // Start debugging if enabled
      if (this.debugUtils) {
        endTrace = this.debugUtils.trace(`${this.type}.executeTask`, [request], {
          agentId: this.id,
          taskId: request.taskId,
          attempt
        });
        endProfile = this.debugUtils.profile(`${this.type}.executeTask`, {
          agentId: this.id,
          taskType: request.taskType
        });
      }
      
      // Enhanced logging for task start
      this.enhancedLogger.logTaskExecution(
        request.taskId,
        this.id,
        request.taskType,
        'started',
        { attempt, recoveryContext: !!recoveryContext }
      );
      
      // Validate request
      const validatedRequest = AgentRequestSchema.parse(request);
      
      // Check session limits
      this._checkSessionLimits();
      
      // Apply throttling if needed
      if (this.isThrottled) {
        await new Promise(resolve => setTimeout(resolve, this.throttleDelay));
      }
      
      // Pre-execution safety check
      await this.enforcer.enforcePreAction(this, {
        tool: validatedRequest.taskType,
        ...validatedRequest.input
      });
      
      // Update state
      this.state.status = 'busy';
      this.state.currentTasks.push(validatedRequest.taskId);
      this.state.lastActiveAt = new Date().toISOString();
      await this._updateState();
      
      // Start performance tracking
      if (this.performanceMonitor) {
        this.currentTaskTracker = this.performanceMonitor.trackAgentTask(
          this.id, 
          validatedRequest.taskId, 
          {
            taskType: validatedRequest.taskType,
            input: validatedRequest.input
          }
        );
      }
      
      // Create task context
      taskContext = await this.contextManager.createContext(
        ContextLevel.TASK,
        {
          taskId: validatedRequest.taskId,
          taskType: validatedRequest.taskType,
          input: validatedRequest.input,
          status: 'running',
          progress: 0
        },
        this.id
      );
      
      this.logger.info('Executing task', { 
        taskId: validatedRequest.taskId,
        taskType: validatedRequest.taskType 
      });
      
      // Execute task implementation with timeout
      const result = await this._executeWithTimeout(
        () => this._executeTask(validatedRequest),
        this.constraints.constraints.resources.maxExecutionTimeMs
      );
      
      // Post-execution safety check
      await this.enforcer.enforcePostAction(this, {
        tool: validatedRequest.taskType,
        ...validatedRequest.input
      }, result);
      
      // Update task context
      await this.contextManager.updateContext(
        ContextLevel.TASK,
        taskContext.id,
        {
          output: result,
          status: 'completed',
          progress: 100
        }
      );
      
      // Update agent state
      this.state.completedTasks++;
      this.state.currentTasks = this.state.currentTasks.filter(
        t => t !== validatedRequest.taskId
      );
      this.state.status = this.state.currentTasks.length > 0 ? 'busy' : 'idle';
      
      // Calculate metrics
      const duration = Date.now() - startTime;
      const tokensUsed = this._estimateTokens(result);
      this.sessionTokens += tokensUsed;
      this.state.totalTokensUsed += tokensUsed;
      
      // Track token usage with performance monitor
      if (this.performanceMonitor) {
        this.performanceMonitor.trackTokenUsage(this.id, tokensUsed);
        
        // Complete task tracking
        if (this.currentTaskTracker) {
          this.currentTaskTracker.complete(result);
          this.currentTaskTracker = null;
        }
      }
      
      await this._updateState();
      
      // Enhanced logging for task completion
      this.enhancedLogger.logTaskExecution(
        validatedRequest.taskId,
        this.id,
        validatedRequest.taskType,
        'completed',
        { 
          duration, 
          tokensUsed, 
          attempt,
          success: true 
        }
      );
      
      // End debugging traces
      if (endTrace) endTrace(result);
      if (endProfile) endProfile({ tokensUsed, toolInvocations: 0 });
      
      // Build response
      const response = {
        taskId: validatedRequest.taskId,
        agentId: this.id,
        status: 'success',
        output: result,
        metrics: {
          duration,
          tokensUsed,
          toolInvocations: 0 // Will be set by subclasses
        }
      };
      
      this.logger.info('Task completed', { 
        taskId: validatedRequest.taskId,
        duration,
        tokensUsed 
      });
      
      return AgentResponseSchema.parse(response);
    } catch (error) {
      // Enhanced logging and debugging for errors
      this.enhancedLogger.logTaskExecution(
        request.taskId,
        this.id,
        request.taskType,
        'failed',
        { 
          duration: Date.now() - startTime,
          attempt,
          error: error.message,
          errorType: error.constructor.name
        }
      );
      
      // End debugging traces with error
      if (endTrace) endTrace(null, error);
      if (endProfile) endProfile({ error: error.message });
      
      // Handle safety violations specially
      if (error instanceof SafetyViolationError) {
        this.enhancedLogger.logSecurityEvent(
          'safety_violation',
          'high',
          {
            taskId: request.taskId,
            agentId: this.id,
            violations: error.violations,
            taskType: request.taskType
          }
        );
        
        this.logger.error('Safety violation prevented task execution', {
          taskId: request.taskId,
          violations: error.violations
        });
        
        // Update state
        this.state.currentTasks = this.state.currentTasks.filter(
          t => t !== request.taskId
        );
        this.state.status = this.state.currentTasks.length > 0 ? 'busy' : 'idle';
        await this._updateState();
        
        return {
          taskId: request.taskId,
          agentId: this.id,
          status: 'blocked',
          output: null,
          metrics: {
            duration: Date.now() - startTime,
            tokensUsed: 0,
            toolInvocations: 0
          },
          error: `Safety violation: ${error.message}`,
          violations: error.violations
        };
      }
      
      this.logger.error('Task failed', { 
        taskId: request.taskId,
        error: error.message 
      });
      
      // Update failure state
      this.state.failedTasks++;
      this.state.currentTasks = this.state.currentTasks.filter(
        t => t !== request.taskId
      );
      this.state.status = this.state.currentTasks.length > 0 ? 'busy' : 'idle';
      
      // Track task failure with performance monitor
      if (this.performanceMonitor && this.currentTaskTracker) {
        this.currentTaskTracker.fail(error);
        this.currentTaskTracker = null;
      }
      
      await this._updateState();
      
      // Update task context if exists
      if (taskContext) {
        await this.contextManager.updateContext(
          ContextLevel.TASK,
          taskContext.id,
          {
            status: 'failed',
            error: error.message
          }
        );
      }
      
      return {
        taskId: request.taskId,
        agentId: this.id,
        status: 'failure',
        output: null,
        metrics: {
          duration: Date.now() - startTime,
          tokensUsed: 0,
          toolInvocations: 0
        },
        error: error.message
      };
    }
  }

  async _executeTask(request) {
    // Override in subclasses
    throw new Error('_executeTask must be implemented by subclass');
  }

  async handleMessage(message) {
    this.logger.info('Message received', { 
      from: message.from,
      subject: message.subject,
      type: message.type,
      priority: message.priority
    });
    
    try {
      switch (message.type) {
        case 'request':
          await this._handleRequestMessage(message);
          break;
        
        case 'task_assignment':
          await this._handleTaskAssignment(message);
          break;
        
        case 'resource_request':
          await this._handleResourceRequest(message);
          break;
        
        case 'coordination':
          await this._handleCoordinationMessage(message);
          break;
        
        case 'status_update':
          await this._handleStatusUpdate(message);
          break;
        
        case 'heartbeat':
          await this._handleHeartbeat(message);
          break;
        
        case 'broadcast':
          await this._handleBroadcast(message);
          break;
        
        case 'notification':
          await this._handleNotification(message);
          break;
        
        case 'response':
          await this._handleResponse(message);
          break;
        
        default:
          this.logger.warn('Unknown message type', { 
            messageId: message.id, 
            type: message.type 
          });
      }
      
      // Send acknowledgment if required
      if (message.acknowledgment?.required) {
        await this._sendAcknowledgment(message);
      }
      
    } catch (error) {
      this.logger.error('Error handling message', { 
        messageId: message.id, 
        error: error.message 
      });
      
      // Send error response if it was a request
      if (message.type === 'request' && message.replyTo) {
        await this.sendMessage({
          to: message.from,
          type: 'response',
          subject: `Error: ${message.subject}`,
          data: { error: error.message },
          replyTo: message.id
        });
      }
    }
  }

  async _handleRequestMessage(message) {
    if (message.data && message.data.taskType) {
      const response = await this.execute(message.data);
      if (message.replyTo) {
        await this.sendMessage({
          to: message.from,
          type: 'response',
          subject: `Re: ${message.subject}`,
          data: response,
          replyTo: message.id
        });
      }
    } else {
      throw new Error('Invalid request message format');
    }
  }

  async _handleTaskAssignment(message) {
    const { taskId, taskType, input, priority } = message.data;
    
    this.logger.info('Task assigned', { taskId, taskType, from: message.from });
    
    // Add to current tasks
    this.state.currentTasks.push(taskId);
    await this._updateState();
    
    // Execute task asynchronously
    this.execute({
      taskId,
      taskType,
      input
    }).then(result => {
      // Send completion notification
      return this.sendMessage({
        to: message.from,
        type: 'task_completion',
        subject: `Task completed: ${taskId}`,
        data: { taskId, result },
        priority: priority || 'normal'
      });
    }).catch(error => {
      // Send error notification
      return this.sendMessage({
        to: message.from,
        type: 'error_report',
        subject: `Task failed: ${taskId}`,
        data: { taskId, error: error.message },
        priority: 'high'
      });
    });
  }

  async _handleResourceRequest(message) {
    const { resourceType, amount, priority } = message.data;
    
    // Check if we can fulfill the resource request
    const available = await this._checkResourceAvailability(resourceType, amount);
    
    await this.sendMessage({
      to: message.from,
      type: 'resource_response',
      subject: `Resource availability: ${resourceType}`,
      data: {
        resourceType,
        requested: amount,
        available,
        canFulfill: available >= amount
      },
      replyTo: message.id,
      priority: message.priority
    });
  }

  async _handleCoordinationMessage(message) {
    const { action, data } = message.data;
    
    switch (action) {
      case 'sync_state':
        await this.sendMessage({
          to: message.from,
          type: 'status_update',
          subject: 'State synchronization',
          data: { state: this.state, capabilities: this.capabilities },
          replyTo: message.id
        });
        break;
      
      case 'request_collaboration':
        // Handle collaboration request
        this.logger.info('Collaboration requested', { from: message.from, data });
        break;
      
      default:
        this.logger.warn('Unknown coordination action', { action });
    }
  }

  async _handleStatusUpdate(message) {
    this.logger.info('Status update received', { 
      from: message.from, 
      data: message.data 
    });
    
    // Store peer status for coordination
    if (!this.peerStates) {
      this.peerStates = new Map();
    }
    this.peerStates.set(message.from, {
      ...message.data,
      lastUpdate: new Date().toISOString()
    });
  }

  async _handleHeartbeat(message) {
    // Respond to heartbeat
    await this.sendMessage({
      to: message.from,
      type: 'heartbeat',
      subject: 'Heartbeat response',
      data: { status: this.state.status, timestamp: new Date().toISOString() },
      priority: 'low'
    });
  }

  async _handleBroadcast(message) {
    this.logger.info('Broadcast received', { 
      from: message.from, 
      subject: message.subject 
    });
    
    // Process broadcast based on subject/data
    // This can be overridden by specific agent types
  }

  async _handleNotification(message) {
    this.logger.info('Notification received', { 
      from: message.from, 
      subject: message.subject,
      data: message.data
    });
  }

  async _handleResponse(message) {
    this.logger.info('Response received', { 
      from: message.from, 
      subject: message.subject,
      replyTo: message.replyTo
    });
    
    // Handle acknowledgments
    if (message.data?.acknowledged) {
      this.logger.debug('Acknowledgment received', { 
        messageId: message.data.messageId 
      });
    }
  }

  async _sendAcknowledgment(message) {
    await this.sendMessage({
      to: message.from,
      type: 'response',
      subject: 'Acknowledgment',
      data: { 
        acknowledged: true, 
        messageId: message.id,
        processedAt: new Date().toISOString()
      },
      replyTo: message.id,
      priority: 'low'
    });
  }

  async _checkResourceAvailability(resourceType, amount) {
    // Basic resource availability check
    // Can be overridden by specific agent types
    switch (resourceType) {
      case 'cpu':
        // Simple simulation of CPU availability
        return Math.max(0, 100 - Math.floor(Math.random() * 40)); // 60-100% available
      case 'memory':
        // Simple simulation of memory availability  
        return Math.max(0, 100 - Math.floor(Math.random() * 50)); // 50-100% available
      case 'tokens':
        return Math.max(0, this.maxSessionTokens - this.sessionTokens);
      default:
        return Math.floor(Math.random() * 100); // Random availability for unknown resources
    }
  }

  /**
   * Enhanced message sending through communication system
   */
  async sendMessage(messageData) {
    if (this.communicationSystem) {
      return await this.communicationSystem.sendMessage({
        from: this.id,
        ...messageData
      });
    } else {
      // Fallback to context manager
      return await this.contextManager.sendMessage({
        from: this.id,
        ...messageData
      });
    }
  }

  /**
   * Broadcast a message to multiple agents
   */
  async broadcastMessage(messageData, criteria = {}) {
    if (this.communicationSystem) {
      return await this.communicationSystem.broadcastMessage({
        from: this.id,
        ...messageData
      }, criteria);
    } else {
      throw new Error('Communication system not available for broadcasting');
    }
  }

  /**
   * Start a conversation with other agents
   */
  async startConversation(participants, topic, metadata = {}) {
    if (this.communicationSystem) {
      return await this.communicationSystem.startConversation(
        [this.id, ...participants], 
        topic, 
        metadata
      );
    } else {
      throw new Error('Communication system not available for conversations');
    }
  }

  /**
   * Set the communication system reference
   */
  setCommunicationSystem(communicationSystem) {
    this.communicationSystem = communicationSystem;
    this.logger.info('Communication system connected');
  }

  // Tool invocation methods (simulate Claude Code tools)
  async invokeTool(tool, parameters) {
    this.logger.debug('Invoking tool', { tool, parameters });
    
    // Safety check for tool invocation
    await this.enforcer.enforcePreAction(this, {
      tool,
      ...parameters
    });
    
    // Track file operations
    if (['Read', 'Write', 'Edit', 'MultiEdit'].includes(tool)) {
      this.enforcer.resourceMonitor.incrementFileOperations(this.id);
    }
    
    // In real implementation, these would call actual Claude Code tools
    // For now, we'll simulate the behavior
    switch (tool) {
      case ClaudeCodeTool.READ:
        return this._simulateRead(parameters);
      case ClaudeCodeTool.WRITE:
        return this._simulateWrite(parameters);
      case ClaudeCodeTool.BASH:
        return this._simulateBash(parameters);
      case ClaudeCodeTool.WEB_SEARCH:
        return this._simulateWebSearch(parameters);
      case ClaudeCodeTool.TASK:
        return this._simulateTask(parameters);
      default:
        throw new Error(`Unknown tool: ${tool}`);
    }
  }

  async _simulateRead(params) {
    // Simulate file read
    return `[Simulated content of ${params.file_path}]`;
  }

  async _simulateWrite(params) {
    // Simulate file write
    return { success: true, path: params.file_path };
  }

  async _simulateBash(params) {
    // Simulate command execution
    return { stdout: `[Simulated output of: ${params.command}]`, exitCode: 0 };
  }

  async _simulateWebSearch(params) {
    // Simulate web search
    return {
      results: [
        { title: 'Result 1', url: 'https://example.com/1', snippet: 'Sample result' },
        { title: 'Result 2', url: 'https://example.com/2', snippet: 'Another result' }
      ]
    };
  }

  async _simulateTask(params) {
    // Simulate sub-agent task
    return { result: `[Simulated task result for: ${params.description}]` };
  }

  // Utility methods
  async _updateState() {
    await this.contextManager.updateContext(
      ContextLevel.AGENT,
      this.contextId,
      { state: this.state }
    );
  }

  _checkSessionLimits() {
    const sessionDuration = Date.now() - this.startTime;
    
    if (sessionDuration > this.maxSessionDuration) {
      throw new Error(`Session duration limit exceeded (${this.maxSessionDuration}ms)`);
    }
    
    if (this.sessionTokens > this.maxSessionTokens) {
      throw new Error(`Session token limit exceeded (${this.maxSessionTokens})`);
    }
  }

  _estimateTokens(data) {
    // Simple token estimation (4 chars = 1 token)
    const str = JSON.stringify(data);
    return Math.ceil(str.length / 4);
  }

  async getMetrics() {
    const uptime = Date.now() - this.startTime;
    const avgTaskDuration = this.state.completedTasks > 0
      ? uptime / this.state.completedTasks
      : 0;
    const successRate = this.state.completedTasks + this.state.failedTasks > 0
      ? this.state.completedTasks / (this.state.completedTasks + this.state.failedTasks)
      : 0;
    const tokenEfficiency = this.state.completedTasks > 0
      ? this.state.totalTokensUsed / this.state.completedTasks
      : 0;
    
    return {
      ...this.state,
      uptime,
      sessionTokens: this.sessionTokens,
      metrics: {
        avgTaskDuration,
        successRate,
        tokenEfficiency
      }
    };
  }

  async shutdown() {
    this.logger.info('Agent shutting down');
    this.state.status = 'offline';
    await this._updateState();
    
    // Stop resource monitoring
    if (this.enforcer?.resourceMonitor) {
      this.enforcer.resourceMonitor.stopTracking(this.id);
    }
  }

  // Safety-related methods
  async _executeWithTimeout(fn, timeoutMs) {
    return Promise.race([
      fn(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Execution timeout')), timeoutMs)
      )
    ]);
  }

  setThrottled(throttled, delay = 0) {
    this.isThrottled = throttled;
    this.throttleDelay = delay;
    
    if (throttled) {
      this.logger.warn('Agent throttled', { delay });
    }
  }

  getActionHistory() {
    return this.actionHistory;
  }

  recordAction(action, result) {
    this.actionHistory.push({
      timestamp: Date.now(),
      action: action.tool,
      success: !result.error,
      path: action.path || action.file_path
    });
    
    // Keep only last 100 actions
    if (this.actionHistory.length > 100) {
      this.actionHistory = this.actionHistory.slice(-100);
    }
  }

  // Register confirmation callback
  registerConfirmationCallback(callback) {
    this.enforcer.registerConfirmationCallback(this.id, callback);
  }
  
  // Error recovery support methods
  async _cleanupFailedTask(taskId) {
    try {
      // Remove task from current tasks if present
      this.state.currentTasks = this.state.currentTasks.filter(t => t !== taskId);
      
      // Clear any task-specific timers or resources
      if (this.currentTaskTracker) {
        this.currentTaskTracker = null;
      }
      
      // Update context if task context exists
      const taskContext = await this.contextManager.getContext(ContextLevel.TASK, taskId);
      if (taskContext) {
        await this.contextManager.updateContext(
          ContextLevel.TASK,
          taskId,
          { 
            status: 'cleanup',
            cleanedUp: true,
            cleanupAt: new Date().toISOString()
          }
        );
      }
      
      this.logger.debug('Task cleanup completed', { taskId });
      
    } catch (error) {
      this.logger.warn('Task cleanup failed', { taskId, error: error.message });
    }
  }
  
  async _refreshAgentState() {
    try {
      // Reset any cached state
      this.state.lastActiveAt = new Date().toISOString();
      
      // Clear throttling if active
      if (this.isThrottled) {
        this.isThrottled = false;
        this.throttleDelay = 0;
      }
      
      // Refresh context connection
      if (this.contextManager) {
        // Verify context manager connection
        try {
          await this.contextManager.getContext(ContextLevel.AGENT, this.id);
        } catch (error) {
          this.logger.warn('Context manager refresh needed', { error: error.message });
          // Could implement context manager reconnection here
        }
      }
      
      // Update state
      await this._updateState();
      
      this.logger.debug('Agent state refreshed');
      
    } catch (error) {
      this.logger.warn('Agent state refresh failed', { error: error.message });
    }
  }
  
  // Cleanup method for agent shutdown
  async cleanup() {
    try {
      // Stop error recovery if owned by this agent
      if (this.errorRecovery && !this.config.sharedErrorRecovery) {
        this.errorRecovery.unregisterHealthCheck(this.id);
        this.errorRecovery.stop();
      }
      
      // Unregister from performance monitor
      if (this.performanceMonitor) {
        this.performanceMonitor.unregisterAgent(this.id);
      }
      
      // Clear any active timers
      for (const timer of this.backoffTimers?.values() || []) {
        clearTimeout(timer);
      }
      
      this.logger.info('Agent cleanup completed');
      
    } catch (error) {
      this.logger.error('Agent cleanup failed', { error: error.message });
    }
  }
}