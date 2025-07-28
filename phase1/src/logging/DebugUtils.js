import fs from 'fs/promises';
import path from 'path';
import { performance } from 'perf_hooks';
import util from 'util';

export class DebugUtils {
  constructor(logger, options = {}) {
    this.logger = logger;
    this.options = {
      enableTracing: options.enableTracing !== false,
      enableProfiling: options.enableProfiling !== false,
      enableMemoryTracking: options.enableMemoryTracking !== false,
      enableCallStackCapture: options.enableCallStackCapture !== false,
      maxTraceDepth: options.maxTraceDepth || 10,
      memoryCheckInterval: options.memoryCheckInterval || 30000, // 30 seconds
      profileThreshold: options.profileThreshold || 100, // 100ms
      ...options
    };
    
    // Debug state
    this.traceStack = [];
    this.profileTimers = new Map();
    this.memoryBaseline = null;
    this.memoryHistory = [];
    this.executionPaths = new Map();
    this.variableWatchers = new Map();
    
    // Memory monitoring
    if (this.options.enableMemoryTracking) {
      this.startMemoryMonitoring();
    }
  }

  // Function tracing
  trace(functionName, args = [], context = {}) {
    if (!this.options.enableTracing) return () => {};
    
    const traceId = `${functionName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startTime = performance.now();
    const startMemory = process.memoryUsage();
    
    const traceInfo = {
      id: traceId,
      functionName,
      args: this.sanitizeArgs(args),
      context,
      startTime,
      startMemory,
      callStack: this.options.enableCallStackCapture ? this.captureCallStack() : null,
      depth: this.traceStack.length
    };
    
    // Check trace depth limit
    if (this.traceStack.length >= this.options.maxTraceDepth) {
      this.logger.warn('Maximum trace depth reached', {
        maxDepth: this.options.maxTraceDepth,
        currentFunction: functionName
      }, 'debug');
      return () => {};
    }
    
    this.traceStack.push(traceInfo);
    
    this.logger.debug(`→ Entering ${functionName}`, {
      traceId,
      depth: traceInfo.depth,
      args: traceInfo.args,
      context
    }, 'trace');
    
    // Return end trace function
    return (result = null, error = null) => {
      const endTime = performance.now();
      const endMemory = process.memoryUsage();
      const duration = endTime - startTime;
      
      // Remove from stack
      const stackIndex = this.traceStack.findIndex(t => t.id === traceId);
      if (stackIndex > -1) {
        this.traceStack.splice(stackIndex, 1);
      }
      
      const memoryDelta = {
        rss: endMemory.rss - startMemory.rss,
        heapUsed: endMemory.heapUsed - startMemory.heapUsed,
        heapTotal: endMemory.heapTotal - startMemory.heapTotal
      };
      
      const traceResult = {
        traceId,
        functionName,
        duration,
        memoryDelta,
        success: !error,
        result: this.sanitizeResult(result),
        error: error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : null
      };
      
      if (error) {
        this.logger.error(`← Exiting ${functionName} (ERROR)`, error, traceResult, 'trace');
      } else {
        const logLevel = duration > this.options.profileThreshold ? 'warn' : 'debug';
        this.logger[logLevel](`← Exiting ${functionName}`, traceResult, 'trace');
      }
      
      // Track execution path
      this.recordExecutionPath(functionName, duration, error);
      
      return traceResult;
    };
  }

  // Function profiling
  profile(functionName, metadata = {}) {
    if (!this.options.enableProfiling) return () => {};
    
    const profileId = `${functionName}-${Date.now()}`;
    const startTime = performance.now();
    const startCpuUsage = process.cpuUsage();
    
    this.profileTimers.set(profileId, {
      functionName,
      startTime,
      startCpuUsage,
      metadata
    });
    
    return (additionalMetadata = {}) => {
      const profileInfo = this.profileTimers.get(profileId);
      if (!profileInfo) return null;
      
      const endTime = performance.now();
      const endCpuUsage = process.cpuUsage(profileInfo.startCpuUsage);
      const duration = endTime - profileInfo.startTime;
      
      this.profileTimers.delete(profileId);
      
      const profileResult = {
        functionName,
        duration,
        cpuUsage: {
          user: endCpuUsage.user / 1000, // Convert to milliseconds
          system: endCpuUsage.system / 1000
        },
        ...profileInfo.metadata,
        ...additionalMetadata
      };
      
      if (duration > this.options.profileThreshold) {
        this.logger.warn('Slow function detected', profileResult, 'profiler');
      } else {
        this.logger.debug('Function profiled', profileResult, 'profiler');
      }
      
      return profileResult;
    };
  }

  // Variable watching
  watchVariable(name, value, context = {}) {
    const watchKey = `${name}-${context.scope || 'global'}`;
    const previousValue = this.variableWatchers.get(watchKey);
    
    this.variableWatchers.set(watchKey, {
      name,
      value: this.cloneValue(value),
      timestamp: Date.now(),
      context,
      changed: previousValue && !this.deepEqual(previousValue.value, value)
    });
    
    if (previousValue && !this.deepEqual(previousValue.value, value)) {
      this.logger.debug('Variable changed', {
        name,
        oldValue: previousValue.value,
        newValue: value,
        context
      }, 'watcher');
    }
  }

  // Execution path tracking
  recordExecutionPath(functionName, duration, error) {
    const pathKey = functionName;
    const pathInfo = this.executionPaths.get(pathKey) || {
      functionName,
      callCount: 0,
      totalDuration: 0,
      averageDuration: 0,
      errorCount: 0,
      maxDuration: 0,
      minDuration: Infinity
    };
    
    pathInfo.callCount++;
    pathInfo.totalDuration += duration;
    pathInfo.averageDuration = pathInfo.totalDuration / pathInfo.callCount;
    pathInfo.maxDuration = Math.max(pathInfo.maxDuration, duration);
    pathInfo.minDuration = Math.min(pathInfo.minDuration, duration);
    
    if (error) {
      pathInfo.errorCount++;
    }
    
    this.executionPaths.set(pathKey, pathInfo);
  }

  // Memory monitoring
  startMemoryMonitoring() {
    this.memoryBaseline = process.memoryUsage();
    
    setInterval(() => {
      const currentMemory = process.memoryUsage();
      const memoryInfo = {
        timestamp: Date.now(),
        rss: currentMemory.rss,
        heapUsed: currentMemory.heapUsed,
        heapTotal: currentMemory.heapTotal,
        external: currentMemory.external,
        arrayBuffers: currentMemory.arrayBuffers,
        deltaFromBaseline: {
          rss: currentMemory.rss - this.memoryBaseline.rss,
          heapUsed: currentMemory.heapUsed - this.memoryBaseline.heapUsed,
          heapTotal: currentMemory.heapTotal - this.memoryBaseline.heapTotal
        }
      };
      
      this.memoryHistory.push(memoryInfo);
      
      // Keep only last 100 entries
      if (this.memoryHistory.length > 100) {
        this.memoryHistory.shift();
      }
      
      // Log memory warnings
      const heapUsagePercent = (currentMemory.heapUsed / currentMemory.heapTotal) * 100;
      if (heapUsagePercent > 90) {
        this.logger.warn('High heap usage detected', memoryInfo, 'memory');
      }
      
      // Log significant memory increases
      const rssDelta = memoryInfo.deltaFromBaseline.rss;
      if (rssDelta > 100 * 1024 * 1024) { // 100MB increase
        this.logger.warn('Significant memory increase detected', memoryInfo, 'memory');
      }
      
    }, this.options.memoryCheckInterval);
  }

  // Call stack capture
  captureCallStack() {
    const originalStackTraceLimit = Error.stackTraceLimit;
    Error.stackTraceLimit = this.options.maxTraceDepth + 5;
    
    const stack = new Error().stack
      .split('\n')
      .slice(3) // Remove Error and captureCallStack lines
      .map(line => line.trim())
      .filter(line => line.startsWith('at '))
      .map(line => {
        const match = line.match(/at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)/);
        if (match) {
          return {
            function: match[1],
            file: match[2],
            line: parseInt(match[3]),
            column: parseInt(match[4])
          };
        }
        return { raw: line };
      });
    
    Error.stackTraceLimit = originalStackTraceLimit;
    return stack;
  }

  // Debugging utilities
  dumpObject(obj, name = 'object', options = {}) {
    const inspectOptions = {
      depth: options.depth || 3,
      colors: options.colors !== false,
      showHidden: options.showHidden || false,
      showProxy: options.showProxy || false,
      maxArrayLength: options.maxArrayLength || 100,
      maxStringLength: options.maxStringLength || 1000,
      ...options
    };
    
    const inspection = util.inspect(obj, inspectOptions);
    
    this.logger.debug(`Object dump: ${name}`, {
      name,
      type: typeof obj,
      constructor: obj?.constructor?.name,
      inspection
    }, 'dump');
    
    return inspection;
  }

  createBreakpoint(name, condition = null) {
    return (context = {}) => {
      if (condition && !condition(context)) {
        return false;
      }
      
      this.logger.warn(`Breakpoint hit: ${name}`, {
        breakpoint: name,
        context,
        callStack: this.captureCallStack(),
        traceStack: this.traceStack.map(t => ({
          function: t.functionName,
          depth: t.depth,
          duration: performance.now() - t.startTime
        }))
      }, 'breakpoint');
      
      return true;
    };
  }

  // Performance analysis
  getPerformanceReport() {
    const report = {
      timestamp: new Date().toISOString(),
      executionPaths: Array.from(this.executionPaths.values())
        .sort((a, b) => b.averageDuration - a.averageDuration),
      memoryStats: this.getMemoryStats(),
      activeTraces: this.traceStack.length,
      activeProfiles: this.profileTimers.size,
      watchedVariables: this.variableWatchers.size
    };
    
    return report;
  }

  getMemoryStats() {
    if (this.memoryHistory.length === 0) return null;
    
    const current = this.memoryHistory[this.memoryHistory.length - 1];
    const oldest = this.memoryHistory[0];
    
    return {
      current: {
        rss: this.formatBytes(current.rss),
        heapUsed: this.formatBytes(current.heapUsed),
        heapTotal: this.formatBytes(current.heapTotal),
        heapUsagePercent: ((current.heapUsed / current.heapTotal) * 100).toFixed(2)
      },
      trend: {
        rssDelta: this.formatBytes(current.rss - oldest.rss),
        heapUsedDelta: this.formatBytes(current.heapUsed - oldest.heapUsed),
        duration: current.timestamp - oldest.timestamp
      },
      baseline: {
        rss: this.formatBytes(this.memoryBaseline.rss),
        heapUsed: this.formatBytes(this.memoryBaseline.heapUsed),
        heapTotal: this.formatBytes(this.memoryBaseline.heapTotal)
      }
    };
  }

  // Agent-specific debugging
  debugAgent(agent, options = {}) {
    const agentDebugger = {
      traceExecution: (taskRequest) => {
        const endTrace = this.trace(`Agent.execute[${agent.id}]`, [taskRequest], {
          agentId: agent.id,
          agentType: agent.type,
          taskType: taskRequest.taskType
        });
        
        return endTrace;
      },
      
      watchState: () => {
        this.watchVariable('agentState', agent.state, { scope: agent.id });
      },
      
      profileTask: (taskType) => {
        return this.profile(`Agent.task[${taskType}]`, {
          agentId: agent.id,
          taskType
        });
      },
      
      dumpAgent: () => {
        return this.dumpObject(agent, `Agent[${agent.id}]`, {
          depth: 2,
          showHidden: false
        });
      }
    };
    
    return agentDebugger;
  }

  // Utility methods
  sanitizeArgs(args) {
    return args.map(arg => {
      if (typeof arg === 'function') return '[Function]';
      if (arg && arg.constructor && arg.constructor.name === 'Promise') return '[Promise]';
      if (arg instanceof Error) return { name: arg.name, message: arg.message };
      if (typeof arg === 'object' && arg !== null) {
        try {
          return JSON.parse(JSON.stringify(arg));
        } catch {
          return '[Circular or Non-Serializable Object]';
        }
      }
      return arg;
    });
  }

  sanitizeResult(result) {
    if (result === null || result === undefined) return result;
    if (typeof result === 'function') return '[Function]';
    if (result instanceof Error) return { name: result.name, message: result.message };
    if (typeof result === 'object') {
      try {
        return JSON.parse(JSON.stringify(result));
      } catch {
        return '[Circular or Non-Serializable Object]';
      }
    }
    return result;
  }

  cloneValue(value) {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch {
      return '[Non-Serializable Value]';
    }
  }

  deepEqual(a, b) {
    try {
      return JSON.stringify(a) === JSON.stringify(b);
    } catch {
      return false;
    }
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Export debug data
  async exportDebugData(filePath) {
    const debugData = {
      timestamp: new Date().toISOString(),
      performanceReport: this.getPerformanceReport(),
      executionPaths: Array.from(this.executionPaths.entries()),
      memoryHistory: this.memoryHistory,
      activeTraces: this.traceStack,
      watchedVariables: Array.from(this.variableWatchers.entries()),
      options: this.options
    };
    
    try {
      await fs.writeFile(filePath, JSON.stringify(debugData, null, 2));
      this.logger.info('Debug data exported', { filePath }, 'debug');
      return filePath;
    } catch (error) {
      this.logger.error('Failed to export debug data', error, { filePath }, 'debug');
      throw error;
    }
  }

  // Cleanup
  cleanup() {
    // Clear all tracking data
    this.traceStack.length = 0;
    this.profileTimers.clear();
    this.executionPaths.clear();
    this.variableWatchers.clear();
    this.memoryHistory.length = 0;
  }
}

// Decorator functions for easy debugging
export function trace(target, propertyKey, descriptor) {
  const originalMethod = descriptor.value;
  
  descriptor.value = function(...args) {
    const debugUtils = this.debugUtils || global.debugUtils;
    if (!debugUtils) return originalMethod.apply(this, args);
    
    const endTrace = debugUtils.trace(`${target.constructor.name}.${propertyKey}`, args, {
      className: target.constructor.name,
      method: propertyKey
    });
    
    try {
      const result = originalMethod.apply(this, args);
      
      if (result instanceof Promise) {
        return result
          .then(res => {
            endTrace(res);
            return res;
          })
          .catch(err => {
            endTrace(null, err);
            throw err;
          });
      } else {
        endTrace(result);
        return result;
      }
    } catch (error) {
      endTrace(null, error);
      throw error;
    }
  };
  
  return descriptor;
}

export function profile(target, propertyKey, descriptor) {
  const originalMethod = descriptor.value;
  
  descriptor.value = function(...args) {
    const debugUtils = this.debugUtils || global.debugUtils;
    if (!debugUtils) return originalMethod.apply(this, args);
    
    const endProfile = debugUtils.profile(`${target.constructor.name}.${propertyKey}`, {
      className: target.constructor.name,
      method: propertyKey
    });
    
    try {
      const result = originalMethod.apply(this, args);
      
      if (result instanceof Promise) {
        return result.finally(() => endProfile());
      } else {
        endProfile();
        return result;
      }
    } catch (error) {
      endProfile();
      throw error;
    }
  };
  
  return descriptor;
}

export default DebugUtils;