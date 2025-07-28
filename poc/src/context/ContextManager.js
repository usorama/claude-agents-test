import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import winston from 'winston';

export class ContextManager {
  constructor(config = {}) {
    this.baseDir = config.baseDir || './context-store';
    this.maxContextSize = config.maxContextSize || 100 * 1024; // 100KB limit
    this.lockTimeout = config.lockTimeout || 5000; // 5 seconds
    this.locks = new Map();
    
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.File({ filename: 'poc-context.log' }),
        new winston.transports.Console()
      ]
    });
  }

  async initialize() {
    try {
      await fs.mkdir(this.baseDir, { recursive: true });
      await fs.mkdir(path.join(this.baseDir, 'agents'), { recursive: true });
      await fs.mkdir(path.join(this.baseDir, 'shared'), { recursive: true });
      this.logger.info('Context Manager initialized', { baseDir: this.baseDir });
    } catch (error) {
      this.logger.error('Failed to initialize Context Manager', { error: error.message });
      throw error;
    }
  }

  async saveContext(agentId, contextType, data) {
    const startTime = Date.now();
    const contextPath = this._getContextPath(agentId, contextType);
    
    try {
      // Check size limit
      const dataStr = JSON.stringify(data, null, 2);
      if (dataStr.length > this.maxContextSize) {
        throw new Error(`Context size ${dataStr.length} exceeds limit ${this.maxContextSize}`);
      }

      // Ensure agent directory exists
      const agentDir = path.dirname(contextPath);
      await fs.mkdir(agentDir, { recursive: true });

      // Acquire lock
      await this._acquireLock(contextPath);
      
      // Save with atomic write
      const tempPath = `${contextPath}.tmp`;
      await fs.writeFile(tempPath, dataStr, 'utf8');
      await fs.rename(tempPath, contextPath);
      
      // Release lock
      this._releaseLock(contextPath);
      
      const duration = Date.now() - startTime;
      this.logger.info('Context saved', { agentId, contextType, size: dataStr.length, duration });
      
      return { success: true, size: dataStr.length, duration };
    } catch (error) {
      this._releaseLock(contextPath);
      this.logger.error('Failed to save context', { agentId, contextType, error: error.message });
      throw error;
    }
  }

  async loadContext(agentId, contextType) {
    const startTime = Date.now();
    const contextPath = this._getContextPath(agentId, contextType);
    
    try {
      // Acquire lock
      await this._acquireLock(contextPath);
      
      // Check if file exists
      try {
        await fs.access(contextPath);
      } catch {
        this._releaseLock(contextPath);
        return null;
      }
      
      // Read context
      const data = await fs.readFile(contextPath, 'utf8');
      this._releaseLock(contextPath);
      
      const duration = Date.now() - startTime;
      this.logger.info('Context loaded', { agentId, contextType, size: data.length, duration });
      
      return JSON.parse(data);
    } catch (error) {
      this._releaseLock(contextPath);
      this.logger.error('Failed to load context', { agentId, contextType, error: error.message });
      throw error;
    }
  }

  async shareContext(fromAgentId, toAgentId, contextType, data) {
    const shareId = crypto.randomBytes(8).toString('hex');
    const sharePath = path.join(this.baseDir, 'shared', `${shareId}.json`);
    
    try {
      const shareData = {
        from: fromAgentId,
        to: toAgentId,
        type: contextType,
        timestamp: new Date().toISOString(),
        data
      };
      
      await fs.writeFile(sharePath, JSON.stringify(shareData, null, 2), 'utf8');
      
      this.logger.info('Context shared', { fromAgentId, toAgentId, contextType, shareId });
      return shareId;
    } catch (error) {
      this.logger.error('Failed to share context', { fromAgentId, toAgentId, error: error.message });
      throw error;
    }
  }

  async getSharedContext(shareId) {
    const sharePath = path.join(this.baseDir, 'shared', `${shareId}.json`);
    
    try {
      const data = await fs.readFile(sharePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      this.logger.error('Failed to get shared context', { shareId, error: error.message });
      return null;
    }
  }

  async getMetrics() {
    const metrics = {
      activeLocks: this.locks.size,
      contexts: {}
    };
    
    try {
      // Count contexts per agent
      const agentDirs = await fs.readdir(path.join(this.baseDir, 'agents'));
      for (const agentId of agentDirs) {
        const files = await fs.readdir(path.join(this.baseDir, 'agents', agentId));
        metrics.contexts[agentId] = files.length;
      }
      
      // Count shared contexts
      const sharedFiles = await fs.readdir(path.join(this.baseDir, 'shared'));
      metrics.sharedContexts = sharedFiles.length;
      
      return metrics;
    } catch (error) {
      this.logger.error('Failed to get metrics', { error: error.message });
      return metrics;
    }
  }

  _getContextPath(agentId, contextType) {
    return path.join(this.baseDir, 'agents', agentId, `${contextType}.json`);
  }

  async _acquireLock(filePath) {
    const lockId = crypto.randomBytes(8).toString('hex');
    const startTime = Date.now();
    
    while (this.locks.has(filePath)) {
      if (Date.now() - startTime > this.lockTimeout) {
        throw new Error(`Lock timeout for ${filePath}`);
      }
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    this.locks.set(filePath, { lockId, timestamp: Date.now() });
    return lockId;
  }

  _releaseLock(filePath) {
    this.locks.delete(filePath);
  }
}