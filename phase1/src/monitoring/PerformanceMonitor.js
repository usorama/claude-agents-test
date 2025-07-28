import EventEmitter from 'events';
import os from 'os';
import fs from 'fs/promises';
import { performance } from 'perf_hooks';

export class PerformanceMonitor extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      collectInterval: options.collectInterval || 5000, // 5 seconds
      metricsBuffer: options.metricsBuffer || 1000, // Keep 1000 data points
      alertThresholds: {
        cpu: options.cpuThreshold || 80,
        memory: options.memoryThreshold || 85,
        responseTime: options.responseTimeThreshold || 2000,
        errorRate: options.errorRateThreshold || 5,
        ...options.alertThresholds
      },
      ...options
    };
    
    // Metrics storage
    this.metrics = {
      system: {
        cpu: [],
        memory: [],
        heap: [],
        eventLoop: [],
        handles: []
      },
      agents: new Map(),
      orchestrator: {
        taskQueue: [],
        throughput: [],
        responseTime: [],
        errorRate: []
      },
      communication: {
        messagesSent: [],
        messagesReceived: [],
        messageLatency: []
      }
    };
    
    // Active tracking
    this.isCollecting = false;
    this.collectionInterval = null;
    this.agentTrackers = new Map();
    this.systemBaseline = null;
    
    // Alert state
    this.activeAlerts = new Map();
    this.alertHistory = [];
    
    // Performance baseline
    this.baseline = {
      established: false,
      data: {}
    };
  }

  async startMonitoring() {
    if (this.isCollecting) {
      throw new Error('Monitoring is already active');
    }
    
    this.isCollecting = true;
    
    // Establish baseline
    await this._establishBaseline();
    
    // Start metric collection
    this.collectionInterval = setInterval(
      () => this._collectMetrics(),
      this.options.collectInterval
    );
    
    // Start event loop monitoring
    this._startEventLoopMonitoring();
    
    this.emit('monitoring:started', {
      timestamp: new Date().toISOString(),
      interval: this.options.collectInterval
    });
  }

  stopMonitoring() {
    if (!this.isCollecting) return;
    
    this.isCollecting = false;
    
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
      this.collectionInterval = null;
    }
    
    // Clean up agent trackers
    for (const tracker of this.agentTrackers.values()) {
      if (tracker.cleanup) tracker.cleanup();
    }
    this.agentTrackers.clear();
    
    this.emit('monitoring:stopped', {
      timestamp: new Date().toISOString()
    });
  }

  registerAgent(agentId, agentConfig = {}) {
    if (this.agentTrackers.has(agentId)) {
      throw new Error(`Agent ${agentId} is already registered`);
    }
    
    const tracker = {
      id: agentId,
      type: agentConfig.type || 'unknown',
      metrics: {
        taskCount: 0,
        completedTasks: 0,
        failedTasks: 0,
        averageResponseTime: 0,
        tokenUsage: 0,
        memoryUsage: [],
        cpuTime: [],
        taskLatency: [],
        errors: []
      },
      thresholds: {
        maxResponseTime: agentConfig.maxResponseTime || 5000,
        maxMemory: agentConfig.maxMemory || 100 * 1024 * 1024, // 100MB
        maxTokens: agentConfig.maxTokens || 50000,
        ...agentConfig.thresholds
      },
      startTime: Date.now(),
      lastActivity: Date.now()
    };
    
    this.agentTrackers.set(agentId, tracker);
    this.metrics.agents.set(agentId, tracker.metrics);
    
    this.emit('agent:registered', {
      agentId,
      timestamp: new Date().toISOString()
    });
    
    return tracker;
  }

  unregisterAgent(agentId) {
    const tracker = this.agentTrackers.get(agentId);
    if (!tracker) return false;
    
    // Clean up
    if (tracker.cleanup) tracker.cleanup();
    this.agentTrackers.delete(agentId);
    this.metrics.agents.delete(agentId);
    
    this.emit('agent:unregistered', {
      agentId,
      timestamp: new Date().toISOString()
    });
    
    return true;
  }

  trackAgentTask(agentId, taskId, taskData = {}) {
    const tracker = this.agentTrackers.get(agentId);
    if (!tracker) {
      throw new Error(`Agent ${agentId} is not registered`);
    }
    
    const taskStart = performance.now();
    tracker.metrics.taskCount++;
    tracker.lastActivity = Date.now();
    
    // Return task completion function
    return {
      complete: (result = {}) => {
        const duration = performance.now() - taskStart;
        
        tracker.metrics.completedTasks++;
        tracker.metrics.taskLatency.push({
          timestamp: Date.now(),
          duration,
          taskId,
          taskType: taskData.taskType
        });
        
        // Update average response time
        const latencies = tracker.metrics.taskLatency.slice(-100); // Last 100 tasks
        tracker.metrics.averageResponseTime = 
          latencies.reduce((sum, t) => sum + t.duration, 0) / latencies.length;
        
        // Check thresholds
        this._checkAgentThresholds(agentId, { responseTime: duration });
        
        this.emit('agent:task:completed', {
          agentId,
          taskId,
          duration,
          timestamp: new Date().toISOString()
        });
        
        return { duration, timestamp: Date.now() };
      },
      
      fail: (error) => {
        const duration = performance.now() - taskStart;
        
        tracker.metrics.failedTasks++;
        tracker.metrics.errors.push({
          timestamp: Date.now(),
          taskId,
          error: error.message || String(error),
          duration
        });
        
        this._checkAgentThresholds(agentId, { error: true });
        
        this.emit('agent:task:failed', {
          agentId,
          taskId,
          error: error.message,
          duration,
          timestamp: new Date().toISOString()
        });
        
        return { duration, error: error.message, timestamp: Date.now() };
      },
      
      updateProgress: (progress, metadata = {}) => {
        this.emit('agent:task:progress', {
          agentId,
          taskId,
          progress,
          metadata,
          timestamp: new Date().toISOString()
        });
      }
    };
  }

  trackTokenUsage(agentId, tokens) {
    const tracker = this.agentTrackers.get(agentId);
    if (!tracker) return;
    
    tracker.metrics.tokenUsage += tokens;
    
    // Check token threshold
    if (tracker.metrics.tokenUsage > tracker.thresholds.maxTokens) {
      this._triggerAlert('agent:tokens:exceeded', {
        agentId,
        current: tracker.metrics.tokenUsage,
        threshold: tracker.thresholds.maxTokens
      });
    }
  }

  trackCommunication(type, data = {}) {
    const timestamp = Date.now();
    
    switch (type) {
      case 'message:sent':
        this.metrics.communication.messagesSent.push({
          timestamp,
          from: data.from,
          to: data.to,
          type: data.messageType,
          size: data.size || 0
        });
        break;
        
      case 'message:received':
        this.metrics.communication.messagesReceived.push({
          timestamp,
          from: data.from,
          to: data.to,
          type: data.messageType,
          size: data.size || 0
        });
        break;
        
      case 'message:latency':
        this.metrics.communication.messageLatency.push({
          timestamp,
          latency: data.latency,
          messageId: data.messageId
        });
        break;
    }
    
    // Trim arrays to prevent memory leaks
    this._trimMetricsArrays();
  }

  getSystemMetrics() {
    return {
      timestamp: new Date().toISOString(),
      system: {
        cpu: this._getCurrentValue(this.metrics.system.cpu),
        memory: this._getCurrentValue(this.metrics.system.memory),
        heap: this._getCurrentValue(this.metrics.system.heap),
        eventLoop: this._getCurrentValue(this.metrics.system.eventLoop),
        handles: this._getCurrentValue(this.metrics.system.handles),
        uptime: process.uptime(),
        loadAverage: os.loadavg()
      },
      process: {
        pid: process.pid,
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage()
      }
    };
  }

  getAgentMetrics(agentId) {
    const tracker = this.agentTrackers.get(agentId);
    if (!tracker) return null;
    
    const runtime = Date.now() - tracker.startTime;
    const recentErrors = tracker.metrics.errors.filter(
      e => Date.now() - e.timestamp < 300000 // Last 5 minutes
    );
    
    return {
      agentId,
      type: tracker.type,
      timestamp: new Date().toISOString(),
      runtime,
      status: this._getAgentStatus(tracker),
      tasks: {
        total: tracker.metrics.taskCount,
        completed: tracker.metrics.completedTasks,
        failed: tracker.metrics.failedTasks,
        successRate: tracker.metrics.taskCount > 0 
          ? (tracker.metrics.completedTasks / tracker.metrics.taskCount) * 100 
          : 0
      },
      performance: {
        averageResponseTime: tracker.metrics.averageResponseTime,
        recentResponseTimes: tracker.metrics.taskLatency.slice(-10).map(t => t.duration),
        tokenUsage: tracker.metrics.tokenUsage
      },
      errors: {
        recent: recentErrors.length,
        total: tracker.metrics.errors.length,
        rate: recentErrors.length / 5 // Per minute
      },
      health: this._calculateAgentHealth(tracker)
    };
  }

  getAllAgentMetrics() {
    const metrics = {};
    for (const agentId of this.agentTrackers.keys()) {
      metrics[agentId] = this.getAgentMetrics(agentId);
    }
    return metrics;
  }

  getPerformanceSummary() {
    const systemMetrics = this.getSystemMetrics();
    const agentMetrics = this.getAllAgentMetrics();
    
    // Calculate aggregated metrics
    const totalTasks = Object.values(agentMetrics)
      .reduce((sum, a) => sum + a.tasks.total, 0);
    const totalCompleted = Object.values(agentMetrics)
      .reduce((sum, a) => sum + a.tasks.completed, 0);
    const averageResponseTime = Object.values(agentMetrics)
      .reduce((sum, a) => sum + a.performance.averageResponseTime, 0) / 
      Object.keys(agentMetrics).length || 0;
    
    return {
      timestamp: new Date().toISOString(),
      system: systemMetrics,
      agents: {
        count: Object.keys(agentMetrics).length,
        healthy: Object.values(agentMetrics).filter(a => a.health.score > 80).length,
        metrics: agentMetrics
      },
      performance: {
        totalTasks,
        totalCompleted,
        overallSuccessRate: totalTasks > 0 ? (totalCompleted / totalTasks) * 100 : 0,
        averageResponseTime,
        systemLoad: systemMetrics.system.cpu
      },
      alerts: {
        active: this.activeAlerts.size,
        recent: this.alertHistory.filter(
          a => Date.now() - a.timestamp < 3600000 // Last hour
        ).length
      }
    };
  }

  async exportMetrics(format = 'json', options = {}) {
    const data = {
      metadata: {
        exportedAt: new Date().toISOString(),
        format,
        monitoringDuration: Date.now() - (this.baseline.data.startTime || Date.now()),
        options
      },
      summary: this.getPerformanceSummary(),
      system: {
        current: this.getSystemMetrics(),
        history: {
          cpu: this.metrics.system.cpu.slice(-100),
          memory: this.metrics.system.memory.slice(-100),
          heap: this.metrics.system.heap.slice(-100)
        }
      },
      agents: this.getAllAgentMetrics(),
      alerts: {
        active: Array.from(this.activeAlerts.values()),
        history: this.alertHistory.slice(-50)
      }
    };
    
    if (format === 'json') {
      return JSON.stringify(data, null, 2);
    } else if (format === 'csv') {
      return this._formatAsCSV(data);
    } else {
      throw new Error(`Unsupported format: ${format}`);
    }
  }

  // Private methods
  async _establishBaseline() {
    const baselineMetrics = [];
    
    // Collect baseline data over 30 seconds
    for (let i = 0; i < 6; i++) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      baselineMetrics.push(await this._collectSystemMetrics());
    }
    
    this.baseline = {
      established: true,
      data: {
        startTime: Date.now(),
        cpu: this._calculateAverage(baselineMetrics.map(m => m.cpu)),
        memory: this._calculateAverage(baselineMetrics.map(m => m.memory)),
        heap: this._calculateAverage(baselineMetrics.map(m => m.heap))
      }
    };
    
    this.emit('baseline:established', this.baseline);
  }

  async _collectMetrics() {
    try {
      // System metrics
      const systemMetrics = await this._collectSystemMetrics();
      this._pushMetric(this.metrics.system.cpu, systemMetrics.cpu);
      this._pushMetric(this.metrics.system.memory, systemMetrics.memory);
      this._pushMetric(this.metrics.system.heap, systemMetrics.heap);
      this._pushMetric(this.metrics.system.eventLoop, systemMetrics.eventLoop);
      this._pushMetric(this.metrics.system.handles, systemMetrics.handles);
      
      // Agent metrics
      for (const [agentId, tracker] of this.agentTrackers) {
        this._updateAgentMetrics(agentId, tracker);
      }
      
      // Check system thresholds
      this._checkSystemThresholds(systemMetrics);
      
      this.emit('metrics:collected', {
        timestamp: new Date().toISOString(),
        system: systemMetrics
      });
      
    } catch (error) {
      this.emit('metrics:error', {
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  async _collectSystemMetrics() {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    return {
      timestamp: Date.now(),
      cpu: (cpuUsage.user + cpuUsage.system) / 1000000, // Convert to seconds
      memory: (memUsage.rss / os.totalmem()) * 100, // Percentage
      heap: (memUsage.heapUsed / memUsage.heapTotal) * 100,
      eventLoop: await this._measureEventLoopLag(),
      handles: process._getActiveHandles().length + process._getActiveRequests().length
    };
  }

  _measureEventLoopLag() {
    return new Promise(resolve => {
      const start = performance.now();
      setImmediate(() => {
        resolve(performance.now() - start);
      });
    });
  }

  _startEventLoopMonitoring() {
    const checkInterval = setInterval(() => {
      const start = performance.now();
      setImmediate(() => {
        const lag = performance.now() - start;
        if (lag > 100) { // 100ms threshold
          this._triggerAlert('system:eventloop:lag', {
            lag,
            threshold: 100,
            timestamp: Date.now()
          });
        }
      });
    }, 10000); // Check every 10 seconds
    
    // Store for cleanup
    this.eventLoopMonitor = checkInterval;
  }

  _updateAgentMetrics(agentId, tracker) {
    // Update memory usage estimation
    const estimatedMemory = this._estimateAgentMemory(agentId);
    this._pushMetric(tracker.metrics.memoryUsage, estimatedMemory);
    
    // Check if agent is active
    const inactiveDuration = Date.now() - tracker.lastActivity;
    if (inactiveDuration > 300000) { // 5 minutes
      this._triggerAlert('agent:inactive', {
        agentId,
        inactiveDuration,
        timestamp: Date.now()
      });
    }
  }

  _estimateAgentMemory(agentId) {
    // Simplified memory estimation based on agent activity
    const tracker = this.agentTrackers.get(agentId);
    if (!tracker) return 0;
    
    // Base memory + tokens used + recent activity
    const baseMemory = 10 * 1024 * 1024; // 10MB base
    const tokenMemory = tracker.metrics.tokenUsage * 4; // ~4 bytes per token
    const activityMemory = tracker.metrics.taskCount * 1024; // 1KB per task
    
    return baseMemory + tokenMemory + activityMemory;
  }

  _checkSystemThresholds(metrics) {
    const { alertThresholds } = this.options;
    
    if (metrics.cpu > alertThresholds.cpu) {
      this._triggerAlert('system:cpu:high', {
        current: metrics.cpu,
        threshold: alertThresholds.cpu,
        timestamp: metrics.timestamp
      });
    }
    
    if (metrics.memory > alertThresholds.memory) {
      this._triggerAlert('system:memory:high', {
        current: metrics.memory,
        threshold: alertThresholds.memory,
        timestamp: metrics.timestamp
      });
    }
  }

  _checkAgentThresholds(agentId, data) {
    const tracker = this.agentTrackers.get(agentId);
    if (!tracker) return;
    
    if (data.responseTime && data.responseTime > tracker.thresholds.maxResponseTime) {
      this._triggerAlert('agent:response:slow', {
        agentId,
        current: data.responseTime,
        threshold: tracker.thresholds.maxResponseTime,
        timestamp: Date.now()
      });
    }
    
    if (data.error) {
      const recentErrors = tracker.metrics.errors.filter(
        e => Date.now() - e.timestamp < 60000 // Last minute
      );
      
      if (recentErrors.length > 5) {
        this._triggerAlert('agent:errors:high', {
          agentId,
          errorCount: recentErrors.length,
          timestamp: Date.now()
        });
      }
    }
  }

  _triggerAlert(type, data) {
    const alertId = `${type}:${Date.now()}`;
    const alert = {
      id: alertId,
      type,
      severity: this._getAlertSeverity(type),
      data,
      timestamp: Date.now(),
      resolved: false
    };
    
    this.activeAlerts.set(alertId, alert);
    this.alertHistory.push(alert);
    
    // Trim history
    if (this.alertHistory.length > 1000) {
      this.alertHistory = this.alertHistory.slice(-500);
    }
    
    this.emit('alert:triggered', alert);
    
    // Auto-resolve certain alerts after timeout
    if (this._shouldAutoResolve(type)) {
      setTimeout(() => {
        this._resolveAlert(alertId);
      }, 300000); // 5 minutes
    }
  }

  _resolveAlert(alertId) {
    const alert = this.activeAlerts.get(alertId);
    if (alert && !alert.resolved) {
      alert.resolved = true;
      alert.resolvedAt = Date.now();
      this.activeAlerts.delete(alertId);
      
      this.emit('alert:resolved', alert);
    }
  }

  _getAlertSeverity(type) {
    const severityMap = {
      'system:cpu:high': 'warning',
      'system:memory:high': 'critical',
      'system:eventloop:lag': 'warning',
      'agent:response:slow': 'warning',
      'agent:errors:high': 'critical',
      'agent:inactive': 'info',
      'agent:tokens:exceeded': 'warning'
    };
    
    return severityMap[type] || 'info';
  }

  _shouldAutoResolve(type) {
    const autoResolveTypes = [
      'system:cpu:high',
      'system:memory:high',
      'system:eventloop:lag',
      'agent:response:slow'
    ];
    
    return autoResolveTypes.includes(type);
  }

  _getAgentStatus(tracker) {
    const inactiveTime = Date.now() - tracker.lastActivity;
    
    if (inactiveTime > 600000) return 'inactive'; // 10 minutes
    if (inactiveTime > 300000) return 'idle'; // 5 minutes
    if (tracker.metrics.taskCount === 0) return 'ready';
    
    const errorRate = tracker.metrics.failedTasks / tracker.metrics.taskCount;
    if (errorRate > 0.5) return 'failing';
    if (errorRate > 0.1) return 'degraded';
    
    return 'healthy';
  }

  _calculateAgentHealth(tracker) {
    let score = 100;
    
    // Success rate impact (40%)
    const successRate = tracker.metrics.taskCount > 0 
      ? (tracker.metrics.completedTasks / tracker.metrics.taskCount)
      : 1;
    score -= (1 - successRate) * 40;
    
    // Response time impact (30%)
    if (tracker.metrics.averageResponseTime > tracker.thresholds.maxResponseTime) {
      const overTime = tracker.metrics.averageResponseTime - tracker.thresholds.maxResponseTime;
      score -= Math.min((overTime / tracker.thresholds.maxResponseTime) * 30, 30);
    }
    
    // Error rate impact (20%)
    const recentErrors = tracker.metrics.errors.filter(
      e => Date.now() - e.timestamp < 300000
    );
    if (recentErrors.length > 0) {
      score -= Math.min(recentErrors.length * 5, 20);
    }
    
    // Activity impact (10%)
    const inactiveTime = Date.now() - tracker.lastActivity;
    if (inactiveTime > 300000) {
      score -= Math.min((inactiveTime / 300000) * 10, 10);
    }
    
    return {
      score: Math.max(0, Math.round(score)),
      status: score > 80 ? 'healthy' : score > 60 ? 'degraded' : 'unhealthy'
    };
  }

  _pushMetric(array, value) {
    array.push({
      timestamp: Date.now(),
      value
    });
    
    // Keep only recent data
    if (array.length > this.options.metricsBuffer) {
      array.splice(0, array.length - this.options.metricsBuffer);
    }
  }

  _getCurrentValue(metricsArray) {
    return metricsArray.length > 0 
      ? metricsArray[metricsArray.length - 1].value 
      : 0;
  }

  _calculateAverage(values) {
    return values.length > 0 
      ? values.reduce((sum, v) => sum + v, 0) / values.length 
      : 0;
  }

  _trimMetricsArrays() {
    const { metricsBuffer } = this.options;
    
    // Trim communication metrics
    if (this.metrics.communication.messagesSent.length > metricsBuffer) {
      this.metrics.communication.messagesSent = 
        this.metrics.communication.messagesSent.slice(-metricsBuffer);
    }
    
    if (this.metrics.communication.messagesReceived.length > metricsBuffer) {
      this.metrics.communication.messagesReceived = 
        this.metrics.communication.messagesReceived.slice(-metricsBuffer);
    }
    
    if (this.metrics.communication.messageLatency.length > metricsBuffer) {
      this.metrics.communication.messageLatency = 
        this.metrics.communication.messageLatency.slice(-metricsBuffer);
    }
  }

  _formatAsCSV(data) {
    // Simplified CSV export for system metrics
    const headers = ['timestamp', 'cpu', 'memory', 'heap', 'eventLoop', 'handles'];
    const rows = [headers.join(',')];
    
    for (const metric of data.system.history.cpu) {
      const row = [
        new Date(metric.timestamp).toISOString(),
        metric.value,
        data.system.history.memory.find(m => m.timestamp === metric.timestamp)?.value || 0,
        data.system.history.heap.find(m => m.timestamp === metric.timestamp)?.value || 0,
        0, // eventLoop placeholder
        0  // handles placeholder
      ];
      rows.push(row.join(','));
    }
    
    return rows.join('\n');
  }
}