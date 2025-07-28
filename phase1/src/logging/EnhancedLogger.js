import winston from 'winston';
import fs from 'fs/promises';
import path from 'path';
import { performance } from 'perf_hooks';

export class EnhancedLogger {
  constructor(options = {}) {
    this.options = {
      // Basic configuration
      level: options.level || 'info',
      environment: options.environment || 'development',
      serviceName: options.serviceName || 'ironclaude-s',
      
      // File logging
      enableFileLogging: options.enableFileLogging !== false,
      logDirectory: options.logDirectory || './logs',
      maxFileSize: options.maxFileSize || 10 * 1024 * 1024, // 10MB
      maxFiles: options.maxFiles || 10,
      
      // Console logging
      enableConsoleLogging: options.enableConsoleLogging !== false,
      colorize: options.colorize !== false,
      
      // Structured logging
      enableStructuredLogging: options.enableStructuredLogging !== false,
      enableCorrelationIds: options.enableCorrelationIds !== false,
      
      // Performance logging
      enablePerformanceLogging: options.enablePerformanceLogging !== false,
      slowQueryThreshold: options.slowQueryThreshold || 1000, // 1 second
      
      // Error tracking
      enableErrorTracking: options.enableErrorTracking !== false,
      enableStackTraces: options.enableStackTraces !== false,
      
      // Debug features
      enableDebugMode: options.enableDebugMode || false,
      debugComponents: options.debugComponents || [],
      
      // Context tracking
      enableContextTracking: options.enableContextTracking !== false,
      maxContextDepth: options.maxContextDepth || 10,
      
      ...options
    };
    
    // Internal state
    this.correlationIdCounter = 0;
    this.activeContexts = new Map();
    this.performanceTimers = new Map();
    this.errorCounts = new Map();
    this.logCounts = new Map();
    
    // Winston logger instance
    this.logger = null;
    
    this.initialize();
  }

  async initialize() {
    // Create log directory if it doesn't exist
    if (this.options.enableFileLogging) {
      try {
        await fs.mkdir(this.options.logDirectory, { recursive: true });
      } catch (error) {
        console.warn('Failed to create log directory:', error.message);
      }
    }
    
    // Configure Winston logger
    this.logger = winston.createLogger({
      level: this.options.level,
      format: this.createLogFormat(),
      defaultMeta: {
        service: this.options.serviceName,
        environment: this.options.environment,
        pid: process.pid
      },
      transports: this.createTransports()
    });
    
    // Add error handling
    this.logger.on('error', (error) => {
      console.error('Logger error:', error);
    });
    
    this.info('Enhanced logger initialized', {
      level: this.options.level,
      environment: this.options.environment,
      fileLogging: this.options.enableFileLogging,
      structuredLogging: this.options.enableStructuredLogging
    });
  }

  createLogFormat() {
    const formats = [];
    
    // Add timestamp
    formats.push(winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss.SSS'
    }));
    
    // Add errors format for stack traces
    if (this.options.enableStackTraces) {
      formats.push(winston.format.errors({ stack: true }));
    }
    
    // Add structured format
    if (this.options.enableStructuredLogging) {
      formats.push(winston.format.json());
    } else {
      formats.push(winston.format.simple());
    }
    
    return winston.format.combine(...formats);
  }

  createTransports() {
    const transports = [];
    
    // Console transport
    if (this.options.enableConsoleLogging) {
      const consoleFormat = this.options.colorize
        ? winston.format.combine(
            winston.format.colorize(),
            winston.format.printf(this.createConsoleFormatter())
          )
        : winston.format.printf(this.createConsoleFormatter());
      
      transports.push(new winston.transports.Console({
        format: consoleFormat,
        level: this.options.debugComponents.length > 0 ? 'debug' : this.options.level
      }));
    }
    
    // File transports
    if (this.options.enableFileLogging) {
      // Main log file
      transports.push(new winston.transports.File({
        filename: path.join(this.options.logDirectory, 'application.log'),
        maxsize: this.options.maxFileSize,
        maxFiles: this.options.maxFiles,
        tailable: true
      }));
      
      // Error log file
      transports.push(new winston.transports.File({
        filename: path.join(this.options.logDirectory, 'error.log'),
        level: 'error',
        maxsize: this.options.maxFileSize,
        maxFiles: this.options.maxFiles,
        tailable: true
      }));
      
      // Debug log file (if debug enabled)
      if (this.options.enableDebugMode) {
        transports.push(new winston.transports.File({
          filename: path.join(this.options.logDirectory, 'debug.log'),
          level: 'debug',
          maxsize: this.options.maxFileSize,
          maxFiles: this.options.maxFiles,
          tailable: true
        }));
      }
      
      // Performance log file
      if (this.options.enablePerformanceLogging) {
        transports.push(new winston.transports.File({
          filename: path.join(this.options.logDirectory, 'performance.log'),
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
          ),
          level: 'info'
        }));
      }
    }
    
    return transports;
  }

  createConsoleFormatter() {
    return (info) => {
      const { timestamp, level, message, service, component, correlationId, duration, ...meta } = info;
      
      let output = `${timestamp} [${level.toUpperCase()}]`;
      
      if (service && service !== this.options.serviceName) {
        output += ` [${service}]`;
      }
      
      if (component) {
        output += ` [${component}]`;
      }
      
      if (correlationId) {
        output += ` [${correlationId}]`;
      }
      
      output += `: ${message}`;
      
      if (duration !== undefined) {
        output += ` (${duration}ms)`;
      }
      
      // Add metadata if present
      const metaKeys = Object.keys(meta);
      if (metaKeys.length > 0) {
        const filteredMeta = {};
        metaKeys.forEach(key => {
          if (meta[key] !== undefined && meta[key] !== null) {
            filteredMeta[key] = meta[key];
          }
        });
        
        if (Object.keys(filteredMeta).length > 0) {
          output += ` ${JSON.stringify(filteredMeta)}`;
        }
      }
      
      return output;
    };
  }

  // Correlation ID management
  generateCorrelationId() {
    return `${Date.now()}-${++this.correlationIdCounter}`;
  }

  withCorrelationId(correlationId = null) {
    const id = correlationId || this.generateCorrelationId();
    return new CorrelatedLogger(this, id);
  }

  // Context management
  createContext(contextName, contextData = {}) {
    const contextId = `${contextName}-${Date.now()}`;
    const context = {
      id: contextId,
      name: contextName,
      data: contextData,
      startTime: Date.now(),
      parent: null,
      children: new Set()
    };
    
    this.activeContexts.set(contextId, context);
    return new ContextualLogger(this, context);
  }

  // Performance timing
  startTimer(timerName, metadata = {}) {
    const timerId = `${timerName}-${Date.now()}`;
    this.performanceTimers.set(timerId, {
      name: timerName,
      startTime: performance.now(),
      metadata
    });
    return timerId;
  }

  endTimer(timerId, additionalMetadata = {}) {
    const timer = this.performanceTimers.get(timerId);
    if (!timer) {
      this.warn('Timer not found', { timerId });
      return null;
    }
    
    const duration = performance.now() - timer.startTime;
    this.performanceTimers.delete(timerId);
    
    const logData = {
      timer: timer.name,
      duration: Math.round(duration * 100) / 100, // Round to 2 decimal places
      ...timer.metadata,
      ...additionalMetadata
    };
    
    // Log slow operations
    if (duration > this.options.slowQueryThreshold) {
      this.warn('Slow operation detected', logData);
    } else if (this.options.enablePerformanceLogging) {
      this.info('Performance timing', logData);
    }
    
    return duration;
  }

  // Enhanced logging methods
  debug(message, metadata = {}, component = null) {
    // Check if debug is enabled for this component
    if (component && this.options.debugComponents.length > 0) {
      if (!this.options.debugComponents.includes(component)) {
        return;
      }
    }
    
    this.log('debug', message, { component, ...metadata });
  }

  info(message, metadata = {}, component = null) {
    this.log('info', message, { component, ...metadata });
  }

  warn(message, metadata = {}, component = null) {
    this.log('warn', message, { component, ...metadata });
  }

  error(message, error = null, metadata = {}, component = null) {
    const errorMeta = { component, ...metadata };
    
    if (error) {
      if (error instanceof Error) {
        errorMeta.error = {
          name: error.name,
          message: error.message,
          stack: this.options.enableStackTraces ? error.stack : undefined,
          code: error.code,
          statusCode: error.statusCode
        };
      } else {
        errorMeta.error = error;
      }
    }
    
    // Track error counts
    const errorKey = component || 'unknown';
    this.errorCounts.set(errorKey, (this.errorCounts.get(errorKey) || 0) + 1);
    
    this.log('error', message, errorMeta);
  }

  log(level, message, metadata = {}) {
    // Track log counts
    const logKey = `${level}:${metadata.component || 'unknown'}`;
    this.logCounts.set(logKey, (this.logCounts.get(logKey) || 0) + 1);
    
    // Add correlation ID if enabled
    if (this.options.enableCorrelationIds && !metadata.correlationId) {
      metadata.correlationId = this.generateCorrelationId();
    }
    
    this.logger.log(level, message, metadata);
  }

  // Agent-specific logging methods
  logAgentAction(agentId, action, result, metadata = {}) {
    const actionMeta = {
      agentId,
      action: action.type || action,
      success: !result.error,
      duration: result.duration,
      ...metadata
    };
    
    if (result.error) {
      this.error(`Agent action failed: ${action.type || action}`, result.error, actionMeta, 'agent');
    } else {
      this.info(`Agent action completed: ${action.type || action}`, actionMeta, 'agent');
    }
  }

  logTaskExecution(taskId, agentId, taskType, status, metadata = {}) {
    const taskMeta = {
      taskId,
      agentId,
      taskType,
      status,
      ...metadata
    };
    
    switch (status) {
      case 'started':
        this.info('Task execution started', taskMeta, 'task');
        break;
      case 'completed':
        this.info('Task execution completed', taskMeta, 'task');
        break;
      case 'failed':
        this.error('Task execution failed', null, taskMeta, 'task');
        break;
      case 'retrying':
        this.warn('Task execution retrying', taskMeta, 'task');
        break;
      default:
        this.debug('Task status update', taskMeta, 'task');
    }
  }

  logPerformanceMetric(metric, value, unit = null, metadata = {}) {
    const perfMeta = {
      metric,
      value,
      unit,
      timestamp: Date.now(),
      ...metadata
    };
    
    this.info('Performance metric', perfMeta, 'performance');
  }

  logSystemEvent(event, details = {}) {
    this.info(`System event: ${event}`, details, 'system');
  }

  logSecurityEvent(event, severity, details = {}) {
    const securityMeta = {
      event,
      severity,
      timestamp: Date.now(),
      ...details
    };
    
    if (severity === 'high' || severity === 'critical') {
      this.error(`Security event: ${event}`, null, securityMeta, 'security');
    } else {
      this.warn(`Security event: ${event}`, securityMeta, 'security');
    }
  }

  // Query and analysis methods
  async getLogCounts(timeRange = null) {
    const counts = {};
    for (const [key, count] of this.logCounts) {
      counts[key] = count;
    }
    return counts;
  }

  async getErrorCounts(timeRange = null) {
    const errors = {};
    for (const [component, count] of this.errorCounts) {
      errors[component] = count;
    }
    return errors;
  }

  async searchLogs(query, options = {}) {
    // This would integrate with log aggregation systems in production
    // For now, return a placeholder response
    return {
      query,
      results: [],
      total: 0,
      took: 0
    };
  }

  // Configuration management
  setLogLevel(level) {
    this.options.level = level;
    this.logger.level = level;
  }

  enableDebugComponent(component) {
    if (!this.options.debugComponents.includes(component)) {
      this.options.debugComponents.push(component);
    }
  }

  disableDebugComponent(component) {
    const index = this.options.debugComponents.indexOf(component);
    if (index > -1) {
      this.options.debugComponents.splice(index, 1);
    }
  }

  // Health and diagnostics
  getDiagnostics() {
    return {
      options: this.options,
      stats: {
        activeContexts: this.activeContexts.size,
        activeTimers: this.performanceTimers.size,
        totalLogCounts: Array.from(this.logCounts.values()).reduce((a, b) => a + b, 0),
        totalErrorCounts: Array.from(this.errorCounts.values()).reduce((a, b) => a + b, 0)
      },
      logCounts: Object.fromEntries(this.logCounts),
      errorCounts: Object.fromEntries(this.errorCounts)
    };
  }

  // Cleanup
  async flush() {
    return new Promise((resolve) => {
      this.logger.on('finish', resolve);
      this.logger.end();
    });
  }

  async cleanup() {
    // Clear timers and contexts
    this.performanceTimers.clear();
    this.activeContexts.clear();
    this.logCounts.clear();
    this.errorCounts.clear();
    
    // Flush and close logger
    await this.flush();
  }
}

// Correlated logger for request tracing
export class CorrelatedLogger {
  constructor(parentLogger, correlationId) {
    this.parent = parentLogger;
    this.correlationId = correlationId;
  }

  debug(message, metadata = {}, component = null) {
    this.parent.debug(message, { correlationId: this.correlationId, ...metadata }, component);
  }

  info(message, metadata = {}, component = null) {
    this.parent.info(message, { correlationId: this.correlationId, ...metadata }, component);
  }

  warn(message, metadata = {}, component = null) {
    this.parent.warn(message, { correlationId: this.correlationId, ...metadata }, component);
  }

  error(message, error = null, metadata = {}, component = null) {
    this.parent.error(message, error, { correlationId: this.correlationId, ...metadata }, component);
  }

  startTimer(timerName, metadata = {}) {
    return this.parent.startTimer(timerName, { correlationId: this.correlationId, ...metadata });
  }

  endTimer(timerId, additionalMetadata = {}) {
    return this.parent.endTimer(timerId, { correlationId: this.correlationId, ...additionalMetadata });
  }
}

// Contextual logger for hierarchical logging
export class ContextualLogger {
  constructor(parentLogger, context) {
    this.parent = parentLogger;
    this.context = context;
  }

  debug(message, metadata = {}, component = null) {
    this.parent.debug(message, { context: this.context.name, contextId: this.context.id, ...metadata }, component);
  }

  info(message, metadata = {}, component = null) {
    this.parent.info(message, { context: this.context.name, contextId: this.context.id, ...metadata }, component);
  }

  warn(message, metadata = {}, component = null) {
    this.parent.warn(message, { context: this.context.name, contextId: this.context.id, ...metadata }, component);
  }

  error(message, error = null, metadata = {}, component = null) {
    this.parent.error(message, error, { context: this.context.name, contextId: this.context.id, ...metadata }, component);
  }

  createChildContext(childName, childData = {}) {
    const childContext = {
      id: `${childName}-${Date.now()}`,
      name: childName,
      data: childData,
      startTime: Date.now(),
      parent: this.context,
      children: new Set()
    };
    
    this.context.children.add(childContext.id);
    this.parent.activeContexts.set(childContext.id, childContext);
    
    return new ContextualLogger(this.parent, childContext);
  }

  endContext() {
    const duration = Date.now() - this.context.startTime;
    this.info('Context ended', { duration });
    
    // Remove from active contexts
    this.parent.activeContexts.delete(this.context.id);
    
    // Remove from parent's children if exists
    if (this.context.parent) {
      this.context.parent.children.delete(this.context.id);
    }
    
    return duration;
  }
}

// Global logger instance
let globalLogger = null;

export function createLogger(options = {}) {
  return new EnhancedLogger(options);
}

export function getGlobalLogger() {
  if (!globalLogger) {
    globalLogger = new EnhancedLogger();
  }
  return globalLogger;
}

export function setGlobalLogger(logger) {
  globalLogger = logger;
}

export default EnhancedLogger;