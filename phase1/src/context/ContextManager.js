import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import winston from 'winston';
import { z } from 'zod';
import { glob } from 'glob';
import { 
  ContextLevel, 
  validateContext,
  ContextQuerySchema,
  AgentMessageSchema 
} from '../types/context.types.v2.js';
import { ContextSummarizer } from './ContextSummarizer.js';
import { ContextGraph } from './ContextGraph.js';
import { GraphFactory } from './GraphFactory.js';

export class ContextManager {
  constructor(config = {}) {
    this.baseDir = config.baseDir || './context-store';
    this.maxContextSize = config.maxContextSize || 100 * 1024; // 100KB
    this.lockTimeout = config.lockTimeout || 5000;
    this.messageRetention = config.messageRetention || 3600000; // 1 hour
    this.locks = new Map();
    this.messageHandlers = new Map();
    
    // Context summarization config
    this.summarizationThreshold = config.summarizationThreshold || 0.8; // 80% of max size
    this.archiveDir = config.archiveDir || path.join(this.baseDir, 'archives');
    this.summarizer = new ContextSummarizer({
      ...config.summarizerConfig,
      logLevel: config.logLevel
    });
    
    // Monitoring state
    this.contextSizes = new Map();
    this.monitoringInterval = null;
    
    // Context graph for relationship management (initialized in initialize())
    this.graph = null;
    this.graphConfig = {
      ...config.graphConfig,
      logLevel: config.logLevel,
      useNeo4j: config.useNeo4j
    };
    
    this.logger = winston.createLogger({
      level: config.logLevel || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { service: 'ContextManager' },
      transports: [
        new winston.transports.File({ filename: 'context-manager.log' }),
        new winston.transports.Console({
          format: winston.format.simple()
        })
      ]
    });
  }

  async initialize() {
    try {
      // Create directory structure
      const dirs = [
        this.baseDir,
        path.join(this.baseDir, 'global'),
        path.join(this.baseDir, 'projects'),
        path.join(this.baseDir, 'agents'),
        path.join(this.baseDir, 'tasks'),
        path.join(this.baseDir, 'messages'),
        path.join(this.baseDir, 'locks'),
        this.archiveDir
      ];
      
      for (const dir of dirs) {
        await fs.mkdir(dir, { recursive: true });
      }
      
      // Initialize global context if not exists
      const globalPath = path.join(this.baseDir, 'global', 'context.json');
      try {
        await fs.access(globalPath);
      } catch {
        const globalContext = {
          id: 'global',
          level: ContextLevel.GLOBAL,
          metadata: {
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            version: 1
          },
          data: {
            systemConfig: {},
            activeProjects: [],
            globalState: {}
          }
        };
        await this._writeContext(globalPath, globalContext);
      }
      
      // Start message cleanup interval
      this._startMessageCleanup();
      
      // Start context size monitoring
      this._startContextMonitoring();
      
      // Initialize graph (Neo4j or in-memory)
      this.graph = await GraphFactory.create(this.graphConfig);
      this.logger.info('Graph initialized', { 
        type: this.graph.constructor.name,
        useNeo4j: this.graphConfig.useNeo4j 
      });
      
      this.logger.info('Context Manager initialized', { baseDir: this.baseDir });
    } catch (error) {
      this.logger.error('Failed to initialize Context Manager', { error });
      throw error;
    }
  }

  // Context CRUD operations
  async createContext(level, data, parentId = null) {
    const id = this._generateId();
    
    // Ensure data has the correct structure
    let contextData = data.data || data;
    
    // Add required fields based on level
    switch (level) {
      case ContextLevel.AGENT:
        contextData = {
          agentId: contextData.agentId || id,
          agentType: contextData.agentType || 'unknown',
          state: contextData.state || {},
          history: contextData.history || [],
          capabilities: contextData.capabilities || []
        };
        break;
      case ContextLevel.PROJECT:
        contextData = {
          projectName: contextData.projectName || 'Unnamed Project',
          projectPath: contextData.projectPath || '.',
          config: contextData.config || {},
          activeAgents: contextData.activeAgents || [],
          sharedState: contextData.sharedState || {}
        };
        break;
      case ContextLevel.TASK:
        contextData = {
          taskId: contextData.taskId || id,
          taskType: contextData.taskType || 'unknown',
          input: contextData.input || {},
          output: contextData.output,
          status: contextData.status || 'pending',
          progress: contextData.progress,
          error: contextData.error
        };
        break;
      case ContextLevel.GLOBAL:
        contextData = {
          systemConfig: contextData.systemConfig || {},
          activeProjects: contextData.activeProjects || [],
          globalState: contextData.globalState || {}
        };
        break;
    }
    
    const context = {
      id,
      level,
      parentId,
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1,
        tags: data.tags || []
      },
      data: contextData
    };
    
    try {
      // Validate context
      const validated = validateContext(context);
      
      // Check if summarization is needed during creation
      const contextSize = JSON.stringify(validated).length;
      const shouldSummarize = contextSize > (this.maxContextSize * this.summarizationThreshold);
      
      let finalContext = validated;
      if (shouldSummarize) {
        this.logger.info('Context size exceeds threshold during creation, applying summarization', {
          level, id, 
          currentSize: contextSize,
          threshold: this.maxContextSize * this.summarizationThreshold
        });
        
        // Apply summarization immediately during creation
        finalContext = await this.summarizer.summarize(validated);
        finalContext.metadata.creationSummarized = true;
        finalContext.metadata.creationSummarizedAt = new Date().toISOString();
      }
      
      // Get context path
      const contextPath = this._getContextPath(level, id);
      
      // Acquire lock
      await this._acquireLock(contextPath);
      
      // Write context
      await this._writeContext(contextPath, finalContext);
      
      // Update parent if exists
      if (parentId) {
        await this._updateParentReference(level, parentId, id);
      }
      
      // Add to graph
      await this.graph.addNode(id, finalContext);
      
      // Add parent relationship if exists
      if (parentId) {
        await this.graph.addEdge(parentId, id, {
          type: 'parent',
          weight: 1.0,
          metadata: { level }
        });
      }
      
      // Extract and add other relationships
      await this._extractAndAddRelationships(finalContext);
      
      // Update size tracking
      this.contextSizes.set(`${level}/${id}`, JSON.stringify(finalContext).length);
      
      // Release lock
      this._releaseLock(contextPath);
      
      this.logger.info('Context created', { 
        level, id, parentId,
        size: JSON.stringify(finalContext).length,
        summarized: shouldSummarize
      });
      return finalContext;
    } catch (error) {
      this._releaseLock(this._getContextPath(level, id));
      this.logger.error('Failed to create context', { level, error });
      throw error;
    }
  }

  async getContext(level, id) {
    const contextPath = this._getContextPath(level, id);
    
    try {
      const data = await fs.readFile(contextPath, 'utf8');
      const context = JSON.parse(data);
      const validatedContext = validateContext(context);
      
      this.logger.debug('Context retrieved successfully', { 
        level, 
        id,
        size: data.length
      });
      
      return validatedContext;
    } catch (error) {
      if (error.code === 'ENOENT') {
        this.logger.debug('Context not found', { level, id, path: contextPath });
        return null;
      }
      
      // Handle JSON parsing errors
      if (error instanceof SyntaxError) {
        this.logger.error('Context file corrupted - invalid JSON', { 
          level, 
          id, 
          path: contextPath,
          error: error.message 
        });
        
        // Try to recover from backup or archive
        const recovered = await this._attemptContextRecovery(level, id);
        if (recovered) {
          this.logger.info('Context recovered from backup', { level, id });
          return recovered;
        }
        
        throw new Error(`Context file corrupted and recovery failed: ${level}/${id}`);
      }
      
      // Handle validation errors
      if (error.name === 'ZodError') {
        this.logger.error('Context validation failed', { 
          level, 
          id, 
          validationErrors: error.errors 
        });
        
        // Try to repair context if possible
        const repaired = await this._attemptContextRepair(level, id, error);
        if (repaired) {
          this.logger.info('Context repaired successfully', { level, id });
          return repaired;
        }
        
        throw new Error(`Context validation failed: ${level}/${id} - ${error.message}`);
      }
      
      this.logger.error('Failed to get context', { level, id, error: error.message });
      throw error;
    }
  }

  async updateContext(level, id, updates) {
    const contextPath = this._getContextPath(level, id);
    
    try {
      await this._acquireLock(contextPath);
      
      // Read existing context
      const existing = await this.getContext(level, id);
      if (!existing) {
        throw new Error(`Context not found: ${level}/${id}`);
      }
      
      // Merge updates
      const updated = {
        ...existing,
        data: { ...existing.data, ...updates },
        metadata: {
          ...existing.metadata,
          updatedAt: new Date().toISOString(),
          version: existing.metadata.version + 1
        }
      };
      
      // Validate and write
      const validated = validateContext(updated);
      
      // Check if summarization is needed before writing
      const contextSize = JSON.stringify(validated).length;
      const shouldSummarize = contextSize > (this.maxContextSize * this.summarizationThreshold);
      
      let finalContext = validated;
      if (shouldSummarize && !validated.metadata.summarized) {
        this.logger.info('Context size exceeds threshold, triggering summarization', {
          level, id, 
          currentSize: contextSize,
          threshold: this.maxContextSize * this.summarizationThreshold
        });
        
        // Archive original context before summarizing
        await this._archiveContext(validated);
        
        // Apply summarization
        finalContext = await this.summarizer.summarize(validated);
        finalContext.metadata.autoSummarized = true;
        finalContext.metadata.autoSummarizedAt = new Date().toISOString();
      }
      
      await this._writeContext(contextPath, finalContext);
      
      // Update size tracking
      this.contextSizes.set(`${level}/${id}`, JSON.stringify(finalContext).length);
      
      this._releaseLock(contextPath);
      
      this.logger.info('Context updated', { 
        level, id, 
        version: finalContext.metadata.version,
        size: JSON.stringify(finalContext).length,
        summarized: shouldSummarize
      });
      return finalContext;
    } catch (error) {
      this._releaseLock(contextPath);
      this.logger.error('Failed to update context', { level, id, error });
      throw error;
    }
  }

  async deleteContext(level, id) {
    const contextPath = this._getContextPath(level, id);
    
    try {
      await this._acquireLock(contextPath);
      await fs.unlink(contextPath);
      this._releaseLock(contextPath);
      
      this.logger.info('Context deleted', { level, id });
      return true;
    } catch (error) {
      this._releaseLock(contextPath);
      if (error.code === 'ENOENT') {
        return false;
      }
      this.logger.error('Failed to delete context', { level, id, error });
      throw error;
    }
  }

  // Query contexts
  async queryContexts(query = {}) {
    try {
      const validated = ContextQuerySchema.parse(query);
      const contexts = [];
      
      // Determine search paths based on level
      const searchPaths = validated.level 
        ? [path.join(this.baseDir, this._getLevelDir(validated.level))]
        : Object.values(ContextLevel).map(l => path.join(this.baseDir, this._getLevelDir(l)));
      
      // Search for contexts
      for (const searchPath of searchPaths) {
        const files = await glob('**/context.json', { cwd: searchPath });
        
        for (const file of files) {
          const context = await this._readContext(path.join(searchPath, file));
          
          // Apply filters
          if (validated.parentId && context.parentId !== validated.parentId) continue;
          if (validated.tags?.length && !validated.tags.some(t => context.metadata.tags?.includes(t))) continue;
          if (validated.since && new Date(context.metadata.updatedAt) < new Date(validated.since)) continue;
          
          contexts.push(context);
        }
      }
      
      // Apply limit
      if (validated.limit) {
        contexts.splice(validated.limit);
      }
      
      return contexts;
    } catch (error) {
      this.logger.error('Failed to query contexts', { query, error });
      throw error;
    }
  }

  // Message handling
  async sendMessage(message) {
    try {
      const validated = AgentMessageSchema.parse({
        ...message,
        id: message.id || this._generateId(),
        timestamp: message.timestamp || new Date().toISOString()
      });
      
      const messagePath = path.join(this.baseDir, 'messages', `${validated.id}.json`);
      await fs.writeFile(messagePath, JSON.stringify(validated, null, 2));
      
      // Notify handlers
      const handlers = this.messageHandlers.get(validated.to) || [];
      for (const handler of handlers) {
        try {
          await handler(validated);
        } catch (error) {
          this.logger.error('Message handler error', { message: validated.id, error });
        }
      }
      
      this.logger.info('Message sent', { 
        from: validated.from, 
        to: validated.to, 
        subject: validated.subject 
      });
      
      return validated;
    } catch (error) {
      this.logger.error('Failed to send message', { error });
      throw error;
    }
  }

  async getMessages(agentId, since = null) {
    try {
      const messages = [];
      const files = await glob('*.json', { cwd: path.join(this.baseDir, 'messages') });
      
      for (const file of files) {
        const message = await this._readContext(path.join(this.baseDir, 'messages', file));
        
        if (message.to === agentId || message.from === agentId) {
          if (!since || new Date(message.timestamp) > new Date(since)) {
            messages.push(message);
          }
        }
      }
      
      return messages.sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
    } catch (error) {
      this.logger.error('Failed to get messages', { agentId, error });
      throw error;
    }
  }

  registerMessageHandler(agentId, handler) {
    if (!this.messageHandlers.has(agentId)) {
      this.messageHandlers.set(agentId, []);
    }
    this.messageHandlers.get(agentId).push(handler);
    this.logger.info('Message handler registered', { agentId });
  }

  // Knowledge graph operations
  async getKnowledgeGraph(projectId = null) {
    const graph = {
      nodes: [],
      edges: []
    };
    
    try {
      // Get all contexts
      const contexts = await this.queryContexts(projectId ? { parentId: projectId } : {});
      
      // Build nodes
      for (const context of contexts) {
        graph.nodes.push({
          id: context.id,
          level: context.level,
          label: this._getContextLabel(context),
          data: context.data
        });
      }
      
      // Build edges
      for (const context of contexts) {
        if (context.parentId) {
          graph.edges.push({
            from: context.parentId,
            to: context.id,
            type: 'parent-child'
          });
        }
        
        // Extract references from data
        const refs = this._extractReferences(context.data);
        for (const ref of refs) {
          graph.edges.push({
            from: context.id,
            to: ref,
            type: 'reference'
          });
        }
      }
      
      return graph;
    } catch (error) {
      this.logger.error('Failed to build knowledge graph', { projectId, error });
      throw error;
    }
  }

  // Utility methods
  _getContextPath(level, id) {
    const dir = this._getLevelDir(level);
    return path.join(this.baseDir, dir, id, 'context.json');
  }

  _getLevelDir(level) {
    const dirs = {
      [ContextLevel.GLOBAL]: 'global',
      [ContextLevel.PROJECT]: 'projects',
      [ContextLevel.AGENT]: 'agents',
      [ContextLevel.TASK]: 'tasks'
    };
    return dirs[level] || 'unknown';
  }

  _generateId() {
    return crypto.randomBytes(8).toString('hex');
  }

  async _writeContext(contextPath, context) {
    let finalContext = context;
    let data = JSON.stringify(finalContext, null, 2);
    
    // Emergency summarization if still too large
    if (data.length > this.maxContextSize) {
      this.logger.warn('Context still exceeds limit after summarization, applying emergency compression', {
        contextId: context.id,
        size: data.length,
        limit: this.maxContextSize
      });
      
      finalContext = await this.summarizer.emergencySummarize(context);
      data = JSON.stringify(finalContext, null, 2);
      
      // If still too large, truncate with warning
      if (data.length > this.maxContextSize) {
        this.logger.error('Context exceeds limit even after emergency summarization, truncating', {
          contextId: context.id,
          originalSize: data.length,
          limit: this.maxContextSize
        });
        
        const truncated = data.substring(0, this.maxContextSize - 100) + '\n...[TRUNCATED]';
        data = truncated;
      }
    }
    
    const dir = path.dirname(contextPath);
    await fs.mkdir(dir, { recursive: true });
    
    const tempPath = `${contextPath}.tmp`;
    await fs.writeFile(tempPath, data, 'utf8');
    await fs.rename(tempPath, contextPath);
  }

  async _readContext(contextPath) {
    const data = await fs.readFile(contextPath, 'utf8');
    return JSON.parse(data);
  }

  async _acquireLock(resourcePath) {
    const lockId = this._generateId();
    const lockPath = path.join(this.baseDir, 'locks', `${path.basename(resourcePath)}.lock`);
    const startTime = Date.now();
    
    while (true) {
      try {
        await fs.writeFile(lockPath, lockId, { flag: 'wx' });
        this.locks.set(resourcePath, { lockId, lockPath });
        return lockId;
      } catch (error) {
        if (error.code === 'EEXIST') {
          if (Date.now() - startTime > this.lockTimeout) {
            // Force remove stale lock
            await fs.unlink(lockPath).catch(() => {});
            continue;
          }
          await new Promise(resolve => setTimeout(resolve, 50));
        } else {
          throw error;
        }
      }
    }
  }

  _releaseLock(resourcePath) {
    const lock = this.locks.get(resourcePath);
    if (lock) {
      fs.unlink(lock.lockPath).catch(() => {});
      this.locks.delete(resourcePath);
    }
  }

  async _updateParentReference(childLevel, parentId, childId) {
    try {
      // Determine parent level based on child level
      const parentLevel = this._getParentLevel(childLevel);
      if (!parentLevel) {
        this.logger.warn('No parent level found for child level', { childLevel });
        return;
      }

      // Load parent context
      const parentContext = await this.getContext(parentLevel, parentId);
      if (!parentContext) {
        this.logger.warn('Parent context not found', { parentLevel, parentId });
        return;
      }

      // Initialize children array if not exists
      if (!parentContext.data.children) {
        parentContext.data.children = [];
      }

      // Add child reference if not already present
      if (!parentContext.data.children.includes(childId)) {
        parentContext.data.children.push(childId);
        
        // Update parent context
        await this.updateContext(parentLevel, parentId, {
          children: parentContext.data.children
        });

        this.logger.info('Parent reference updated', { 
          parentLevel, parentId, childLevel, childId 
        });
      }
    } catch (error) {
      this.logger.error('Failed to update parent reference', { 
        error, childLevel, parentId, childId 
      });
    }
  }

  /**
   * Get appropriate parent level for a given child level
   * @private
   */
  _getParentLevel(childLevel) {
    const levelHierarchy = {
      [ContextLevel.TASK]: ContextLevel.PROJECT,
      [ContextLevel.AGENT]: ContextLevel.PROJECT,
      [ContextLevel.PROJECT]: ContextLevel.GLOBAL
    };
    
    return levelHierarchy[childLevel];
  }

  _getContextLabel(context) {
    switch (context.level) {
      case ContextLevel.PROJECT:
        return context.data.projectName || context.id;
      case ContextLevel.AGENT:
        return context.data.agentId || context.id;
      case ContextLevel.TASK:
        return context.data.taskType || context.id;
      default:
        return context.id;
    }
  }

  _extractReferences(data) {
    const refs = [];
    // Simple reference extraction - can be enhanced
    const str = JSON.stringify(data);
    const idPattern = /[a-f0-9]{16}/g;
    const matches = str.match(idPattern) || [];
    return [...new Set(matches)];
  }

  /**
   * Archive a context before summarization
   * @param {Object} context - Context to archive
   */
  async _archiveContext(context) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const archivePath = path.join(
        this.archiveDir,
        context.level,
        `${context.id}-${timestamp}.json`
      );
      
      await fs.mkdir(path.dirname(archivePath), { recursive: true });
      await fs.writeFile(archivePath, JSON.stringify(context, null, 2), 'utf8');
      
      this.logger.info('Context archived', {
        contextId: context.id,
        level: context.level,
        archivePath,
        originalSize: JSON.stringify(context).length
      });
    } catch (error) {
      this.logger.error('Failed to archive context', {
        contextId: context.id,
        level: context.level,
        error
      });
      // Don't throw - archiving failure shouldn't block summarization
    }
  }

  /**
   * Restore a context from archive
   * @param {string} level - Context level
   * @param {string} id - Context ID
   * @param {string} timestamp - Archive timestamp (optional, uses latest if not provided)
   */
  async restoreFromArchive(level, id, timestamp = null) {
    try {
      const archiveDir = path.join(this.archiveDir, level);
      const pattern = timestamp 
        ? `${id}-${timestamp}.json`
        : `${id}-*.json`;
      
      const files = await glob(pattern, { cwd: archiveDir });
      if (files.length === 0) {
        throw new Error(`No archive found for ${level}/${id}`);
      }
      
      // Use latest archive if timestamp not specified
      const archiveFile = timestamp ? files[0] : files.sort().pop();
      const archivePath = path.join(archiveDir, archiveFile);
      
      const archivedContext = await this._readContext(archivePath);
      
      // Restore to current location
      const currentPath = this._getContextPath(level, id);
      await this._writeContext(currentPath, archivedContext);
      
      this.logger.info('Context restored from archive', {
        contextId: id,
        level,
        archiveFile,
        restoredSize: JSON.stringify(archivedContext).length
      });
      
      return archivedContext;
    } catch (error) {
      this.logger.error('Failed to restore context from archive', {
        contextId: id,
        level,
        timestamp,
        error
      });
      throw error;
    }
  }

  /**
   * List available archives for a context
   * @param {string} level - Context level
   * @param {string} id - Context ID
   */
  async listArchives(level, id) {
    try {
      const archiveDir = path.join(this.archiveDir, level);
      const pattern = `${id}-*.json`;
      const files = await glob(pattern, { cwd: archiveDir });
      
      const archives = [];
      for (const file of files) {
        const archivePath = path.join(archiveDir, file);
        const stats = await fs.stat(archivePath);
        const timestampMatch = file.match(/-([^.]+)\.json$/);
        
        archives.push({
          file,
          timestamp: timestampMatch ? timestampMatch[1] : null,
          size: stats.size,
          createdAt: stats.birthtime,
          modifiedAt: stats.mtime
        });
      }
      
      return archives.sort((a, b) => b.modifiedAt - a.modifiedAt);
    } catch (error) {
      this.logger.error('Failed to list archives', { level, id, error });
      throw error;
    }
  }

  _startMessageCleanup() {
    setInterval(async () => {
      try {
        const now = Date.now();
        const files = await glob('*.json', { cwd: path.join(this.baseDir, 'messages') });
        
        for (const file of files) {
          const filePath = path.join(this.baseDir, 'messages', file);
          const stats = await fs.stat(filePath);
          
          if (now - stats.mtime.getTime() > this.messageRetention) {
            await fs.unlink(filePath);
            this.logger.debug('Cleaned up old message', { file });
          }
        }
      } catch (error) {
        this.logger.error('Message cleanup error', { error });
      }
    }, 60000); // Run every minute
  }

  // Context summarization methods
  async summarizeContext(contextId, level, compressionLevel = null) {
    try {
      // Get the context
      const context = await this.getContext(level, contextId);
      if (!context) {
        throw new Error(`Context not found: ${level}/${contextId}`);
      }
      
      // Check if already summarized recently
      if (context.metadata.summarized && context.metadata.summarizedAt) {
        const summarizedAge = Date.now() - new Date(context.metadata.summarizedAt).getTime();
        if (summarizedAge < 5 * 60 * 1000) { // 5 minutes
          this.logger.debug('Context recently summarized, skipping', { contextId, level });
          return context;
        }
      }
      
      // Archive original before summarization
      await this.archiveContext(contextId, level);
      
      // Summarize the context
      const summarized = await this.summarizer.summarize(context, compressionLevel);
      
      // Update the context with summarized version
      const contextPath = this._getContextPath(level, contextId);
      await this._acquireLock(contextPath);
      try {
        await this._writeContext(contextPath, summarized);
      } finally {
        this._releaseLock(contextPath);
      }
      
      // Update size tracking
      this.contextSizes.set(`${level}/${contextId}`, JSON.stringify(summarized).length);
      
      this.logger.info('Context summarized', {
        contextId,
        level,
        originalSize: summarized.metadata.originalSize,
        compressedSize: summarized.metadata.compressedSize,
        compressionRatio: summarized.metadata.compressionRatio
      });
      
      return summarized;
    } catch (error) {
      this.logger.error('Failed to summarize context', { contextId, level, error });
      throw error;
    }
  }

  async archiveContext(contextId, level) {
    try {
      const context = await this.getContext(level, contextId);
      if (!context) {
        return;
      }
      
      // Create archive path
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const archivePath = path.join(
        this.archiveDir,
        level,
        contextId,
        `context-${timestamp}.json`
      );
      
      // Ensure archive directory exists
      await fs.mkdir(path.dirname(archivePath), { recursive: true });
      
      // Write archived context
      await fs.writeFile(archivePath, JSON.stringify(context, null, 2));
      
      this.logger.info('Context archived', { contextId, level, archivePath });
      
      return archivePath;
    } catch (error) {
      this.logger.error('Failed to archive context', { contextId, level, error });
      // Don't throw - archiving failure shouldn't prevent summarization
    }
  }

  async restoreContext(contextId, level, archiveTimestamp = null) {
    try {
      const archiveDir = path.join(this.archiveDir, level, contextId);
      const files = await glob('context-*.json', { cwd: archiveDir });
      
      if (files.length === 0) {
        throw new Error('No archived contexts found');
      }
      
      // Get the most recent or specified archive
      let archiveFile;
      if (archiveTimestamp) {
        archiveFile = files.find(f => f.includes(archiveTimestamp));
        if (!archiveFile) {
          throw new Error(`Archive not found with timestamp: ${archiveTimestamp}`);
        }
      } else {
        // Get most recent
        archiveFile = files.sort().reverse()[0];
      }
      
      // Read archived context
      const archivePath = path.join(archiveDir, archiveFile);
      const data = await fs.readFile(archivePath, 'utf8');
      const context = JSON.parse(data);
      
      // Restore to main context store
      const contextPath = this._getContextPath(level, contextId);
      await this._acquireLock(contextPath);
      try {
        await this._writeContext(contextPath, context);
      } finally {
        this._releaseLock(contextPath);
      }
      
      this.logger.info('Context restored from archive', { contextId, level, archiveFile });
      
      return context;
    } catch (error) {
      this.logger.error('Failed to restore context', { contextId, level, error });
      throw error;
    }
  }

  async monitorContextSize() {
    try {
      const totalSize = await this.calculateTotalSize();
      const threshold = this.maxContextSize * this.summarizationThreshold;
      
      this.logger.debug('Context size monitor', { totalSize, threshold, ratio: totalSize / this.maxContextSize });
      
      if (totalSize > threshold) {
        this.logger.warn('Context size threshold exceeded, triggering summarization', {
          totalSize,
          threshold,
          ratio: totalSize / this.maxContextSize
        });
        await this.triggerSummarization();
      }
      
      return { totalSize, threshold, triggered: totalSize > threshold };
    } catch (error) {
      this.logger.error('Failed to monitor context size', { error });
      throw error;
    }
  }

  async calculateTotalSize() {
    let totalSize = 0;
    
    try {
      // Calculate size for all context levels
      const levels = Object.values(ContextLevel);
      
      for (const level of levels) {
        const dir = path.join(this.baseDir, this._getLevelDir(level));
        const files = await glob('**/context.json', { cwd: dir });
        
        for (const file of files) {
          const filePath = path.join(dir, file);
          const stats = await fs.stat(filePath);
          totalSize += stats.size;
          
          // Update individual context size tracking
          const contextId = path.dirname(file);
          // Skip empty contextId (happens for global context)
          if (contextId && contextId !== '.') {
            this.contextSizes.set(`${level}/${contextId}`, stats.size);
          }
        }
      }
      
      return totalSize;
    } catch (error) {
      this.logger.error('Failed to calculate total size', { error });
      return 0;
    }
  }

  async triggerSummarization() {
    try {
      // Get all contexts sorted by age and size
      const contexts = [];
      
      for (const [key, size] of this.contextSizes.entries()) {
        const parts = key.split('/');
        if (parts.length < 2) continue; // Skip invalid keys
        
        const [level, ...contextIdParts] = parts;
        const contextId = contextIdParts.join('/'); // Handle nested paths
        
        try {
          const context = await this.getContext(level, contextId);
          
          if (context) {
            contexts.push({
              level,
              contextId,
              size,
              age: Date.now() - new Date(context.metadata.createdAt).getTime(),
              context
            });
          }
        } catch (error) {
          // Skip contexts that fail to load
          this.logger.debug('Skipping context in summarization', { level, contextId, error: error.message });
        }
      }
      
      // Sort by age (oldest first) and size (largest first)
      contexts.sort((a, b) => {
        // Prioritize completed/failed tasks
        if (a.context.data.status === 'completed' && b.context.data.status !== 'completed') return 1;
        if (a.context.data.status !== 'completed' && b.context.data.status === 'completed') return -1;
        
        // Then by age
        if (Math.abs(a.age - b.age) > 60000) { // More than 1 minute difference
          return b.age - a.age; // Older first
        }
        
        // Then by size
        return b.size - a.size; // Larger first
      });
      
      // Summarize contexts until we're under threshold
      const targetSize = this.maxContextSize * 0.6; // Target 60% to leave room
      let currentTotal = await this.calculateTotalSize();
      
      for (const { level, contextId, context } of contexts) {
        if (currentTotal <= targetSize) {
          break;
        }
        
        // Skip if recently summarized
        if (context.metadata.summarized) {
          const summarizedAge = Date.now() - new Date(context.metadata.summarizedAt).getTime();
          if (summarizedAge < 10 * 60 * 1000) { // 10 minutes
            continue;
          }
        }
        
        // Calculate appropriate compression level
        const compressionLevel = this.summarizer.calculateCompressionLevel(currentTotal, this.maxContextSize);
        
        await this.summarizeContext(contextId, level, compressionLevel);
        
        // Recalculate total
        currentTotal = await this.calculateTotalSize();
      }
      
      this.logger.info('Summarization complete', {
        finalSize: currentTotal,
        targetSize,
        summarizedCount: contexts.filter(c => c.context.metadata.summarized).length
      });
    } catch (error) {
      this.logger.error('Failed to trigger summarization', { error });
      throw error;
    }
  }

  _startContextMonitoring() {
    // Initial size calculation
    this.calculateTotalSize().catch(err => 
      this.logger.error('Failed initial size calculation', { error: err })
    );
    
    // Monitor every 30 seconds
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.monitorContextSize();
      } catch (error) {
        this.logger.error('Context monitoring error', { error });
      }
    }, 30000);
  }

  // Graph-based relationship methods
  
  /**
   * Extract and add relationships from context data
   * @private
   */
  async _extractAndAddRelationships(context) {
    const { id, data, metadata } = context;
    
    // Look for references to other contexts in the data
    const references = this._findContextReferences(data);
    
    for (const ref of references) {
      try {
        await this.graph.addEdge(id, ref.contextId, {
          type: ref.type || 'references',
          weight: ref.strength || 0.5,
          metadata: ref.metadata || {}
        });
      } catch (error) {
        // Target node might not exist yet
        this.logger.debug('Could not add reference edge', { from: id, to: ref.contextId, error: error.message });
      }
    }
    
    // Add dependency relationships if specified
    if (data.dependencies && Array.isArray(data.dependencies)) {
      for (const dep of data.dependencies) {
        try {
          const depId = typeof dep === 'string' ? dep : dep.contextId;
          await this.graph.addEdge(id, depId, {
            type: 'depends-on',
            weight: 0.9,
            metadata: { 
              required: dep.required !== false,
              version: dep.version || null 
            }
          });
        } catch (error) {
          this.logger.debug('Could not add dependency edge', { from: id, to: dep, error: error.message });
        }
      }
    }
    
    // Add temporal relationships based on task flow
    if (data.previousTaskId) {
      try {
        await this.graph.addEdge(data.previousTaskId, id, {
          type: 'temporal-sequence',
          weight: 0.7,
          metadata: { relation: 'before' }
        });
      } catch (error) {
        this.logger.debug('Could not add temporal edge', { error: error.message });
      }
    }
  }

  /**
   * Find references to other contexts in data
   * @private
   */
  _findContextReferences(data) {
    const references = [];
    const contextIdPattern = /[0-9a-f]{16}/g;
    
    const searchObject = (obj, path = '') => {
      if (!obj || typeof obj !== 'object') return;
      
      for (const [key, value] of Object.entries(obj)) {
        const currentPath = path ? `${path}.${key}` : key;
        
        if (typeof value === 'string') {
          // Look for context ID patterns
          const matches = value.match(contextIdPattern);
          if (matches) {
            for (const match of matches) {
              // Verify it's likely a context ID (not just any hex string)
              if (key.toLowerCase().includes('context') || 
                  key.toLowerCase().includes('ref') ||
                  key.toLowerCase().includes('parent') ||
                  key.toLowerCase().includes('related')) {
                references.push({
                  contextId: match,
                  type: this._inferReferenceType(key, currentPath),
                  strength: this._calculateReferenceStrength(key, currentPath),
                  metadata: { foundIn: currentPath }
                });
              }
            }
          }
        } else if (Array.isArray(value)) {
          value.forEach((item, index) => searchObject(item, `${currentPath}[${index}]`));
        } else if (typeof value === 'object') {
          searchObject(value, currentPath);
        }
      }
    };
    
    searchObject(data);
    return references;
  }

  /**
   * Infer reference type from key/path
   * @private
   */
  _inferReferenceType(key, path) {
    const keyLower = key.toLowerCase();
    
    if (keyLower.includes('parent')) return 'parent';
    if (keyLower.includes('child')) return 'child';
    if (keyLower.includes('depend')) return 'depends-on';
    if (keyLower.includes('block')) return 'blocks';
    if (keyLower.includes('related')) return 'relates-to';
    if (keyLower.includes('mention')) return 'mentions';
    if (keyLower.includes('ref')) return 'references';
    
    return 'references';
  }

  /**
   * Calculate reference strength based on context
   * @private
   */
  _calculateReferenceStrength(key, path) {
    const keyLower = key.toLowerCase();
    
    // Strong relationships
    if (keyLower.includes('parent') || keyLower.includes('depend')) return 0.9;
    if (keyLower.includes('child') || keyLower.includes('block')) return 0.8;
    
    // Medium relationships
    if (keyLower.includes('related') || keyLower.includes('ref')) return 0.5;
    
    // Weak relationships
    return 0.3;
  }

  /**
   * Get context with all its relationships
   */
  async getContextWithRelationships(level, contextId) {
    const context = await this.getContext(level, contextId);
    if (!context) return null;
    
    return {
      ...context,
      relationships: {
        dependencies: await this.graph.findDependencies(contextId),
        dependents: await this.graph.findImpactedContexts(contextId, { 
          maxDistance: 1,
          relationshipTypes: ['depends-on', 'requires']
        }),
        parent: await this._findParentRelationship(contextId),
        children: await this._findChildRelationships(contextId),
        related: await this.graph.getNeighbors(contextId, {
          relationshipTypes: ['references', 'relates-to', 'mentions']
        })
      }
    };
  }

  /**
   * Find parent relationship
   * @private
   */
  async _findParentRelationship(contextId) {
    const neighbors = await this.graph.getNeighbors(contextId, {
      direction: 'incoming',
      relationshipTypes: ['parent']
    });
    
    return neighbors.length > 0 ? neighbors[0] : null;
  }

  /**
   * Find child relationships
   * @private
   */
  async _findChildRelationships(contextId) {
    return await this.graph.getNeighbors(contextId, {
      direction: 'outgoing',
      relationshipTypes: ['parent']
    });
  }

  /**
   * Analyze impact of context changes
   */
  async analyzeImpact(contextId, changeType = 'update') {
    const impacted = await this.graph.findImpactedContexts(contextId, {
      relationshipTypes: ['depends-on', 'parent', 'requires', 'references'],
      maxDistance: 5
    });
    
    const categorized = {
      critical: [],
      high: [],
      medium: [],
      low: []
    };
    
    for (const impact of impacted) {
      if (impact.impact >= 0.8) {
        categorized.critical.push(impact);
      } else if (impact.impact >= 0.6) {
        categorized.high.push(impact);
      } else if (impact.impact >= 0.3) {
        categorized.medium.push(impact);
      } else {
        categorized.low.push(impact);
      }
    }
    
    return {
      summary: {
        totalImpacted: impacted.length,
        critical: categorized.critical.length,
        high: categorized.high.length,
        medium: categorized.medium.length,
        low: categorized.low.length
      },
      impactedContexts: categorized,
      changeType,
      analyzedAt: new Date().toISOString()
    };
  }

  /**
   * Find dependency cycles
   */
  async findDependencyCycles() {
    const cycles = await this.graph.detectCycles();
    
    if (cycles.length > 0) {
      this.logger.warn('Dependency cycles detected', { count: cycles.length });
      
      // Enrich cycle information with context details
      const enrichedCycles = [];
      for (const cycle of cycles) {
        const nodes = [];
        for (const nodeId of cycle.nodes) {
          const context = await this._findContextById(nodeId);
          if (context) {
            nodes.push({
              id: nodeId,
              level: context.level,
              type: context.data.agentType || context.data.type || 'unknown',
              name: context.data.name || context.data.agentId || nodeId
            });
          }
        }
        
        enrichedCycles.push({
          ...cycle,
          nodes,
          severity: this._calculateCycleSeverity(cycle)
        });
      }
      
      return enrichedCycles;
    }
    
    return [];
  }

  /**
   * Find context by ID across all levels
   * @private
   */
  async _findContextById(contextId) {
    const levels = Object.values(ContextLevel);
    
    for (const level of levels) {
      try {
        const context = await this.getContext(level, contextId);
        if (context) return context;
      } catch (error) {
        // Continue searching
      }
    }
    
    return null;
  }

  /**
   * Calculate cycle severity
   * @private
   */
  _calculateCycleSeverity(cycle) {
    // Cycles with 'depends-on' or 'requires' are critical
    const hasCriticalEdges = cycle.edges?.some(edge => 
      edge.type === 'depends-on' || edge.type === 'requires'
    );
    
    if (hasCriticalEdges) return 'critical';
    if (cycle.nodes.length > 3) return 'high';
    return 'medium';
  }

  /**
   * Query contexts using graph relationships
   */
  async queryWithRelationships(options) {
    const {
      startContextId,
      relationshipTypes,
      maxDepth = 3,
      filters = {}
    } = options;
    
    const results = await this.graph.query({
      startNodes: startContextId ? [startContextId] : [],
      relationshipTypes,
      maxDepth,
      nodeFilter: (node) => {
        // Apply filters to node data
        for (const [key, value] of Object.entries(filters)) {
          if (node.data.data?.[key] !== value && node.data.metadata?.[key] !== value) {
            return false;
          }
        }
        return true;
      }
    });
    
    // Enrich results with full context data
    const enrichedResults = [];
    for (const result of results) {
      const context = await this._findContextById(result.node.id);
      if (context) {
        enrichedResults.push({
          context,
          path: result.path,
          depth: result.depth
        });
      }
    }
    
    return enrichedResults;
  }

  /**
   * Get graph statistics
   */
  async getGraphStatistics() {
    return await this.graph.getStatistics();
  }

  /**
   * Initialize graph from existing contexts
   */
  async initializeGraph() {
    this.logger.info('Initializing context graph from existing contexts');
    
    const levels = Object.values(ContextLevel);
    let totalNodes = 0;
    let totalEdges = 0;
    
    // First pass: Add all nodes
    for (const level of levels) {
      const contexts = await this.queryContexts({ level });
      
      for (const context of contexts) {
        await this.graph.addNode(context.id, context);
        totalNodes++;
      }
    }
    
    // Second pass: Add relationships
    for (const level of levels) {
      const contexts = await this.queryContexts({ level });
      
      for (const context of contexts) {
        // Add parent relationships
        if (context.parentId) {
          try {
            await this.graph.addEdge(context.parentId, context.id, {
              type: 'parent',
              weight: 1.0,
              metadata: { level }
            });
            totalEdges++;
          } catch (error) {
            this.logger.debug('Could not add parent edge during initialization', { error: error.message });
          }
        }
        
        // Extract other relationships
        await this._extractAndAddRelationships(context);
      }
    }
    
    const stats = await this.graph.getStatistics();
    this.logger.info('Context graph initialized', {
      nodes: totalNodes,
      edges: stats.edgeCount,
      relationshipTypes: stats.relationshipTypes
    });
    
    return stats;
  }

  /**
   * Attempt to recover a corrupted context from backup or archive
   * @private
   */
  async _attemptContextRecovery(level, id) {
    try {
      // First, try to find an archived version
      const archiveDir = path.join(this.archiveDir, this._getLevelDir(level), id);
      
      try {
        const files = await fs.readdir(archiveDir);
        const contextFiles = files.filter(f => f.startsWith('context-')).sort().reverse();
        
        if (contextFiles.length > 0) {
          const latestArchive = path.join(archiveDir, contextFiles[0]);
          const data = await fs.readFile(latestArchive, 'utf8');
          const archivedContext = JSON.parse(data);
          
          // Validate and restore
          const validatedContext = validateContext(archivedContext);
          await this.updateContext(level, id, validatedContext);
          
          return validatedContext;
        }
      } catch (archiveError) {
        this.logger.debug('No archive found for recovery', { level, id });
      }
      
      // If no archive, try to create a minimal valid context
      const minimalContext = this._createMinimalContext(level, id);
      
      return minimalContext;
    } catch (error) {
      this.logger.error('Context recovery failed', { 
        level, 
        id, 
        error: error.message 
      });
      return null;
    }
  }

  /**
   * Attempt to repair a context with validation errors
   * @private
   */
  async _attemptContextRepair(level, id, validationError) {
    try {
      const contextPath = this._getContextPath(level, id);
      const data = await fs.readFile(contextPath, 'utf8');
      const context = JSON.parse(data);
      
      // Create a repaired version by providing defaults for missing required fields
      const repairedContext = this._repairContextStructure(context, level, id, validationError);
      
      // Validate the repaired context
      const validatedContext = validateContext(repairedContext);
      
      return validatedContext;
    } catch (error) {
      this.logger.error('Context repair failed', { 
        level, 
        id, 
        error: error.message 
      });
      return null;
    }
  }

  /**
   * Create a minimal valid context for recovery
   * @private
   */
  _createMinimalContext(level, id) {
    const now = new Date().toISOString();
    
    const baseContext = {
      id,
      level,
      metadata: {
        version: '2.0',
        createdAt: now,
        updatedAt: now,
        tags: [],
        recovered: true,
        recoveredAt: now
      },
      data: {}
    };

    // Add level-specific minimal data
    switch (level) {
      case 'agent':
        baseContext.data = {
          agentId: id,
          agentType: 'UnknownAgent',
          state: { status: 'recovered' },
          capabilities: [],
          history: []
        };
        break;
      case 'task':
        baseContext.data = {
          taskId: id,
          taskType: 'unknown',
          status: 'recovered',
          progress: 0,
          input: {},
          output: null
        };
        break;
      case 'project':
        baseContext.data = {
          projectName: 'Recovered Project',
          projectPath: '.',
          config: {},
          activeAgents: [],
          sharedState: {}
        };
        break;
      default:
        baseContext.data = {
          recovered: true,
          originalLevel: level
        };
    }

    return baseContext;
  }

  /**
   * Repair context structure by adding missing fields
   * @private
   */
  _repairContextStructure(context, level, id, validationError) {
    const repaired = { ...context };
    
    // Ensure basic structure
    if (!repaired.id) repaired.id = id;
    if (!repaired.level) repaired.level = level;
    if (!repaired.metadata) repaired.metadata = {};
    if (!repaired.data) repaired.data = {};
    
    // Repair metadata
    const now = new Date().toISOString();
    if (!repaired.metadata.version) repaired.metadata.version = '2.0';
    if (!repaired.metadata.createdAt) repaired.metadata.createdAt = now;
    if (!repaired.metadata.updatedAt) repaired.metadata.updatedAt = now;
    if (!repaired.metadata.tags) repaired.metadata.tags = [];
    
    // Mark as repaired
    repaired.metadata.repaired = true;
    repaired.metadata.repairedAt = now;
    repaired.metadata.originalErrors = validationError.errors?.map(e => e.message) || [];
    
    return repaired;
  }

  /**
   * Shutdown the context manager and close connections
   */
  async shutdown() {
    this.logger.info('Shutting down Context Manager');
    
    // Clear intervals
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    
    // Close graph connection if it's Neo4j
    if (this.graph && this.graph.close) {
      await this.graph.close();
      this.logger.info('Graph connection closed');
    }
    
    // Release any remaining locks
    for (const [path, lock] of this.locks.entries()) {
      this._releaseLock(path);
    }
    
    this.logger.info('Context Manager shutdown complete');
  }
}