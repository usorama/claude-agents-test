import os from 'os';
import winston from 'winston';

/**
 * ResourceMonitor tracks system resource usage for agents
 */
export class ResourceMonitor {
  constructor(config = {}) {
    this.measurements = new Map(); // agentId -> measurements array
    this.fileOperations = new Map(); // agentId -> count
    this.startTimes = new Map(); // agentId -> start time
    
    this.config = {
      maxHistorySize: config.maxHistorySize || 100,
      measurementInterval: config.measurementInterval || 1000, // 1 second
      ...config
    };
    
    this.logger = winston.createLogger({
      level: config.logLevel || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { service: 'ResourceMonitor' },
      transports: [
        new winston.transports.Console({
          format: winston.format.simple(),
          level: 'error' // Only log errors to console
        })
      ]
    });
    
    // Track baseline CPU usage
    this.cpuBaseline = null;
    this._initializeCpuBaseline();
  }

  /**
   * Start tracking resources for an agent
   * @param {string} agentId - The agent ID
   */
  startTracking(agentId) {
    this.startTimes.set(agentId, Date.now());
    this.fileOperations.set(agentId, 0);
    
    if (!this.measurements.has(agentId)) {
      this.measurements.set(agentId, []);
    }
    
    this.logger.debug('Started tracking', { agentId });
  }

  /**
   * Stop tracking resources for an agent
   * @param {string} agentId - The agent ID
   */
  stopTracking(agentId) {
    this.startTimes.delete(agentId);
    this.logger.debug('Stopped tracking', { agentId });
  }

  /**
   * Get current resource usage for an agent
   * @param {string} agentId - The agent ID
   * @returns {Object} Resource usage metrics
   */
  async getCurrentUsage(agentId) {
    const usage = {
      cpu: await this._getCpuUsage(),
      memory: this._getMemoryUsage(),
      fileOps: this.fileOperations.get(agentId) || 0,
      timestamp: Date.now()
    };
    
    // Add to history
    if (!this.measurements.has(agentId)) {
      this.measurements.set(agentId, []);
    }
    
    const history = this.measurements.get(agentId);
    history.push(usage);
    
    // Trim history if too large
    if (history.length > this.config.maxHistorySize) {
      history.shift();
    }
    
    return usage;
  }

  /**
   * Get resource usage history for an agent
   * @param {string} agentId - The agent ID
   * @returns {Array} Array of measurements
   */
  getResourceHistory(agentId) {
    return this.measurements.get(agentId) || [];
  }

  /**
   * Increment file operation count
   * @param {string} agentId - The agent ID
   */
  incrementFileOperations(agentId) {
    const current = this.fileOperations.get(agentId) || 0;
    this.fileOperations.set(agentId, current + 1);
  }

  /**
   * Get file operation count
   * @param {string} agentId - The agent ID
   * @returns {number} File operation count
   */
  getFileOperationCount(agentId) {
    return this.fileOperations.get(agentId) || 0;
  }

  /**
   * Detect anomalies in resource usage
   * @param {string} agentId - The agent ID
   * @returns {Object|null} Anomaly details or null
   */
  detectAnomaly(agentId) {
    const history = this.getResourceHistory(agentId);
    if (history.length < 10) return null;
    
    // Get last 10 measurements
    const recent = history.slice(-10);
    
    // Calculate averages
    const avgCpu = recent.reduce((sum, m) => sum + m.cpu, 0) / recent.length;
    const avgMemory = recent.reduce((sum, m) => sum + m.memory, 0) / recent.length;
    
    // Get latest measurement
    const latest = recent[recent.length - 1];
    
    // Check for spikes (2x average)
    const cpuSpike = latest.cpu > avgCpu * 2;
    const memorySpike = latest.memory > avgMemory * 2;
    
    if (cpuSpike || memorySpike) {
      return {
        type: 'resource_spike',
        metrics: {
          cpu: cpuSpike ? { current: latest.cpu, average: avgCpu } : null,
          memory: memorySpike ? { current: latest.memory, average: avgMemory } : null
        },
        timestamp: latest.timestamp
      };
    }
    
    // Check for sustained high usage
    const highCpuCount = recent.filter(m => m.cpu > 80).length;
    const highMemoryCount = recent.filter(m => m.memory > 400).length; // 400MB
    
    if (highCpuCount >= 7 || highMemoryCount >= 7) {
      return {
        type: 'sustained_high_usage',
        metrics: {
          cpu: highCpuCount >= 7 ? { count: highCpuCount, threshold: 80 } : null,
          memory: highMemoryCount >= 7 ? { count: highMemoryCount, threshold: 400 } : null
        },
        timestamp: latest.timestamp
      };
    }
    
    return null;
  }

  /**
   * Get summary statistics for an agent
   * @param {string} agentId - The agent ID
   * @returns {Object} Summary statistics
   */
  getSummaryStats(agentId) {
    const history = this.getResourceHistory(agentId);
    if (history.length === 0) {
      return {
        cpu: { min: 0, max: 0, avg: 0 },
        memory: { min: 0, max: 0, avg: 0 },
        fileOps: 0,
        duration: 0
      };
    }
    
    const cpuValues = history.map(m => m.cpu);
    const memoryValues = history.map(m => m.memory);
    
    const stats = {
      cpu: {
        min: Math.min(...cpuValues),
        max: Math.max(...cpuValues),
        avg: cpuValues.reduce((a, b) => a + b, 0) / cpuValues.length
      },
      memory: {
        min: Math.min(...memoryValues),
        max: Math.max(...memoryValues),
        avg: memoryValues.reduce((a, b) => a + b, 0) / memoryValues.length
      },
      fileOps: this.fileOperations.get(agentId) || 0,
      duration: this.startTimes.has(agentId) 
        ? Date.now() - this.startTimes.get(agentId)
        : 0
    };
    
    return stats;
  }

  /**
   * Clear all data for an agent
   * @param {string} agentId - The agent ID
   */
  clearAgentData(agentId) {
    this.measurements.delete(agentId);
    this.fileOperations.delete(agentId);
    this.startTimes.delete(agentId);
    this.logger.debug('Cleared agent data', { agentId });
  }

  // Private methods
  async _getCpuUsage() {
    const cpus = os.cpus();
    
    // Calculate total CPU usage
    let totalIdle = 0;
    let totalTick = 0;
    
    cpus.forEach(cpu => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type];
      }
      totalIdle += cpu.times.idle;
    });
    
    const idle = totalIdle / cpus.length;
    const total = totalTick / cpus.length;
    const usage = 100 - Math.floor(idle * 100 / total);
    
    // Adjust for baseline if available
    if (this.cpuBaseline !== null) {
      return Math.max(0, usage - this.cpuBaseline);
    }
    
    return usage;
  }

  _getMemoryUsage() {
    const used = process.memoryUsage();
    return Math.round(used.heapUsed / 1024 / 1024); // Convert to MB
  }

  async _initializeCpuBaseline() {
    // Take multiple measurements to establish baseline
    const measurements = [];
    
    for (let i = 0; i < 5; i++) {
      measurements.push(await this._getCpuUsage());
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    // Use average as baseline
    this.cpuBaseline = measurements.reduce((a, b) => a + b, 0) / measurements.length;
    this.logger.debug('CPU baseline established', { baseline: this.cpuBaseline });
  }

  /**
   * Get system-wide resource information
   * @returns {Object} System resource info
   */
  getSystemInfo() {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    
    return {
      cpu: {
        model: os.cpus()[0].model,
        cores: os.cpus().length,
        speed: os.cpus()[0].speed
      },
      memory: {
        total: Math.round(totalMem / 1024 / 1024), // MB
        used: Math.round(usedMem / 1024 / 1024), // MB
        free: Math.round(freeMem / 1024 / 1024), // MB
        percentUsed: Math.round((usedMem / totalMem) * 100)
      },
      platform: os.platform(),
      uptime: os.uptime()
    };
  }
}