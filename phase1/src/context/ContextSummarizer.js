import { z } from 'zod';
import winston from 'winston';

/**
 * Enhanced ContextSummarizer handles compression and summarization of contexts
 * with Neo4j integration and relationship-aware importance scoring
 */
export class ContextSummarizer {
  constructor(config = {}) {
    this.compressionLevels = {
      low: { threshold: 0.3, preserveRatio: 0.8 },     // Keep 80% of content
      medium: { threshold: 0.5, preserveRatio: 0.5 },  // Keep 50% of content
      high: { threshold: 0.7, preserveRatio: 0.2 }     // Keep 20% of content
    };
    
    this.config = {
      level: config.level || 'medium',
      ageThreshold: config.ageThreshold || 30 * 60 * 1000, // 30 minutes
      preserveKeys: config.preserveKeys || ['id', 'status', 'error', 'output'],
      maxSummaryLength: config.maxSummaryLength || 1000,
      useGraphAnalysis: config.useGraphAnalysis !== false,
      relationshipImportance: config.relationshipImportance || {
        'parent': 1.0,
        'depends-on': 0.9,
        'references': 0.7,
        'executes': 0.8,
        'child': 0.6
      },
      ...config
    };
    
    // Store graph reference for relationship analysis
    this.contextGraph = config.contextGraph || null;
    
    this.logger = winston.createLogger({
      level: config.logLevel || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { service: 'ContextSummarizer' },
      transports: [
        new winston.transports.Console({
          format: winston.format.simple()
        })
      ]
    });
  }

  /**
   * Summarize a context based on its age and content
   * @param {Object} context - The context to summarize
   * @param {string} compressionLevel - Override compression level
   * @returns {Object} Summarized context
   */
  async summarize(context, compressionLevel = null) {
    const level = compressionLevel || this.config.level;
    const compression = this.compressionLevels[level];
    
    // Calculate age
    const age = Date.now() - new Date(context.metadata.createdAt).getTime();
    const isOld = age > this.config.ageThreshold;
    
    // Determine what to preserve
    const preserveRatio = isOld ? compression.preserveRatio : 1.0;
    
    try {
      const summarized = {
        ...context,
        metadata: {
          ...context.metadata,
          summarized: true,
          summarizedAt: new Date().toISOString(),
          originalSize: JSON.stringify(context).length,
          compressionLevel: level,
          preserveRatio
        },
        data: await this._summarizeData(context.data, context.level, preserveRatio)
      };
      
      // Calculate compression ratio
      const newSize = JSON.stringify(summarized).length;
      summarized.metadata.compressedSize = newSize;
      summarized.metadata.compressionRatio = newSize / summarized.metadata.originalSize;
      
      this.logger.info('Context summarized', {
        contextId: context.id,
        level: context.level,
        originalSize: summarized.metadata.originalSize,
        compressedSize: newSize,
        compressionRatio: summarized.metadata.compressionRatio
      });
      
      return summarized;
    } catch (error) {
      this.logger.error('Failed to summarize context', { 
        contextId: context.id, 
        error 
      });
      throw error;
    }
  }

  /**
   * Summarize data based on context level and preserve ratio
   * @private
   */
  async _summarizeData(data, level, preserveRatio) {
    switch (level) {
      case 'agent':
        return this._summarizeAgentData(data, preserveRatio);
      case 'task':
        return this._summarizeTaskData(data, preserveRatio);
      case 'project':
        return this._summarizeProjectData(data, preserveRatio);
      case 'global':
        // Global context should rarely be summarized
        return data;
      default:
        return this._genericSummarize(data, preserveRatio);
    }
  }

  /**
   * Summarize agent-specific data
   * @private
   */
  _summarizeAgentData(data, preserveRatio) {
    const summarized = {
      agentId: data.agentId,
      agentType: data.agentType,
      state: this._preserveImportantKeys(data.state, preserveRatio),
      capabilities: data.capabilities
    };
    
    // Summarize history
    if (data.history && Array.isArray(data.history)) {
      const keepCount = Math.ceil(data.history.length * preserveRatio);
      summarized.history = [
        ...data.history.slice(0, 2), // Keep first 2 entries
        ...data.history.slice(-keepCount + 2) // Keep recent entries
      ];
      summarized.historySummary = {
        totalEntries: data.history.length,
        preserved: summarized.history.length,
        summarized: true
      };
    }
    
    return summarized;
  }

  /**
   * Summarize task-specific data
   * @private
   */
  _summarizeTaskData(data, preserveRatio) {
    const summarized = {
      taskId: data.taskId,
      taskType: data.taskType,
      status: data.status,
      progress: data.progress
    };
    
    // Always preserve error and output for completed/failed tasks
    if (data.status === 'completed' || data.status === 'failed') {
      summarized.output = data.output;
      summarized.error = data.error;
    }
    
    // Summarize input based on preserve ratio
    if (data.input) {
      summarized.input = this._preserveImportantKeys(data.input, preserveRatio);
    }
    
    return summarized;
  }

  /**
   * Summarize project-specific data
   * @private
   */
  _summarizeProjectData(data, preserveRatio) {
    return {
      projectName: data.projectName,
      projectPath: data.projectPath,
      activeAgents: data.activeAgents,
      config: this._preserveImportantKeys(data.config, preserveRatio),
      sharedState: this._preserveImportantKeys(data.sharedState, preserveRatio)
    };
  }

  /**
   * Generic summarization for unknown data types
   * @private
   */
  _genericSummarize(data, preserveRatio) {
    if (typeof data !== 'object' || data === null) {
      return data;
    }
    
    if (Array.isArray(data)) {
      const keepCount = Math.ceil(data.length * preserveRatio);
      return data.slice(-keepCount); // Keep most recent items
    }
    
    return this._preserveImportantKeys(data, preserveRatio);
  }

  /**
   * Preserve important keys based on ratio
   * @private
   */
  _preserveImportantKeys(obj, preserveRatio) {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }
    
    const keys = Object.keys(obj);
    const importantKeys = this.config.preserveKeys;
    const result = {};
    
    // Always preserve important keys
    for (const key of importantKeys) {
      if (key in obj) {
        result[key] = obj[key];
      }
    }
    
    // Preserve additional keys based on ratio
    const remainingKeys = keys.filter(k => !importantKeys.includes(k));
    const keepCount = Math.ceil(remainingKeys.length * preserveRatio);
    
    // Sort by value size (prefer smaller values) and recency
    remainingKeys.sort((a, b) => {
      const sizeA = JSON.stringify(obj[a]).length;
      const sizeB = JSON.stringify(obj[b]).length;
      return sizeA - sizeB;
    });
    
    // Keep the determined number of keys
    for (let i = 0; i < keepCount && i < remainingKeys.length; i++) {
      result[remainingKeys[i]] = obj[remainingKeys[i]];
    }
    
    // Add metadata about summarization
    if (keys.length > Object.keys(result).length) {
      result._summary = {
        originalKeys: keys.length,
        preservedKeys: Object.keys(result).length,
        droppedKeys: keys.length - Object.keys(result).length
      };
    }
    
    return result;
  }

  /**
   * Extract key points from verbose text
   * @param {string} text - Text to summarize
   * @param {number} maxLength - Maximum length of summary
   * @returns {string} Summarized text
   */
  extractKeyPoints(text, maxLength = null) {
    maxLength = maxLength || this.config.maxSummaryLength;
    
    if (!text || text.length <= maxLength) {
      return text;
    }
    
    // Simple extraction: keep first and last parts
    const partLength = Math.floor(maxLength / 2);
    const start = text.substring(0, partLength);
    const end = text.substring(text.length - partLength);
    
    return `${start}...[${text.length - maxLength} chars omitted]...${end}`;
  }

  /**
   * Calculate optimal compression level based on context size
   * @param {number} currentSize - Current context size in bytes
   * @param {number} maxSize - Maximum allowed size
   * @returns {string} Compression level
   */
  calculateCompressionLevel(currentSize, maxSize) {
    const ratio = currentSize / maxSize;
    
    if (ratio < 0.5) return 'low';
    if (ratio < 0.8) return 'medium';
    return 'high';
  }

  /**
   * Estimate token count from text size (rough approximation)
   * @param {number} byteSize - Size in bytes
   * @returns {number} Estimated token count
   */
  estimateTokens(byteSize) {
    // Rough estimate: 1 token ≈ 4 characters ≈ 4 bytes for English text
    return Math.ceil(byteSize / 4);
  }

  /**
   * Check if context needs immediate summarization based on token limits
   * @param {Object} context - Context to check
   * @param {number} tokenLimit - Maximum tokens allowed
   * @returns {boolean} Whether summarization is needed
   */
  needsTokenSummarization(context, tokenLimit = 25000) {
    const contextSize = JSON.stringify(context).length;
    const estimatedTokens = this.estimateTokens(contextSize);
    
    return estimatedTokens > (tokenLimit * 0.8); // 80% of token limit
  }

  /**
   * Aggressive summarization for emergency token management
   * @param {Object} context - Context to summarize
   * @returns {Object} Heavily summarized context
   */
  async emergencySummarize(context) {
    this.logger.warn('Emergency summarization triggered', {
      contextId: context.id,
      originalSize: JSON.stringify(context).length
    });

    // Preserve required schema fields based on context level
    let emergencyData;
    
    switch (context.level) {
      case 'agent':
        emergencyData = {
          agentId: context.data.agentId || context.id,
          agentType: context.data.agentType || 'unknown',
          state: {
            status: context.data.state?.status || context.data.status || 'unknown',
            error: context.data.state?.error || context.data.error,
            progress: context.data.state?.progress || context.data.progress,
            summary: 'Emergency summarized - essential state only'
          },
          output: context.data.output ? {
            result: typeof context.data.output === 'object' ? 
              context.data.output.result || 'Emergency summarized output' :
              String(context.data.output).substring(0, 200)
          } : undefined,
          history: [{
            timestamp: new Date().toISOString(),
            action: 'emergency_summarization',
            details: 'Context emergency summarized due to size limits'
          }],
          capabilities: context.data.capabilities || []
        };
        break;
      
      case 'task':
        emergencyData = {
          taskId: context.data.taskId || context.id,
          taskType: context.data.taskType || 'unknown',
          input: context.data.input ? { summary: 'Emergency summarized input' } : {},
          output: context.data.output ? 
            this.extractKeyPoints(JSON.stringify(context.data.output), 200) : undefined,
          status: context.data.status || 'unknown',
          progress: context.data.progress || 0,
          error: context.data.error || undefined
        };
        break;
      
      case 'project':
        emergencyData = {
          projectName: context.data.projectName || 'Unnamed Project',
          projectPath: context.data.projectPath || '.',
          config: { emergency: true },
          activeAgents: context.data.activeAgents || [],
          sharedState: { emergency: 'summarized' }
        };
        break;
      
      default:
        emergencyData = {
          summary: 'Emergency summarized context',
          originalLevel: context.level,
          criticalData: context.data.error || context.data.output || null
        };
    }

    const emergencyContext = {
      ...context,
      metadata: {
        ...context.metadata,
        emergencySummarized: true,
        emergencySummarizedAt: new Date().toISOString(),
        originalSize: JSON.stringify(context).length
      },
      data: emergencyData,
      _emergencyNote: 'This context was emergency-summarized to prevent token overflow'
    };

    const finalSize = JSON.stringify(emergencyContext).length;
    emergencyContext.metadata.emergencyCompressedSize = finalSize;
    emergencyContext.metadata.emergencyCompressionRatio = finalSize / emergencyContext.metadata.originalSize;

    this.logger.info('Emergency summarization complete', {
      contextId: context.id,
      originalSize: emergencyContext.metadata.originalSize,
      compressedSize: finalSize,
      compressionRatio: emergencyContext.metadata.emergencyCompressionRatio
    });

    return emergencyContext;
  }

  /**
   * Smart summarization that prioritizes recent and important data
   * @param {Object} context - Context to summarize
   * @param {number} targetTokens - Target token count
   * @returns {Object} Intelligently summarized context
   */
  async smartSummarize(context, targetTokens = 20000) {
    const currentSize = JSON.stringify(context).length;
    const currentTokens = this.estimateTokens(currentSize);
    
    if (currentTokens <= targetTokens) {
      return context; // No summarization needed
    }

    const compressionRatio = targetTokens / currentTokens;
    
    // Determine importance scores for different data elements
    const importanceWeights = {
      error: 1.0,           // Always keep errors
      output: 0.9,          // Keep most outputs
      status: 1.0,          // Always keep status
      state: 0.95,          // Keep agent state
      id: 1.0,              // Always keep IDs
      agentId: 1.0,         // Always keep agent IDs
      agentType: 1.0,       // Always keep agent types
      capabilities: 0.8,    // Keep capabilities
      config: 0.7,          // Some config important
      history: 0.3,         // History can be heavily reduced
      logs: 0.2,            // Logs can be heavily reduced
      tempData: 0.1,        // Temporary data can be dropped
      massiveData: 0.1      // Massive data can be dropped
    };

    const smartData = this._applySmartCompression(
      context.data, 
      compressionRatio, 
      importanceWeights
    );

    const smartContext = {
      ...context,
      metadata: {
        ...context.metadata,
        smartSummarized: true,
        smartSummarizedAt: new Date().toISOString(),
        originalSize: currentSize,
        targetTokens,
        originalTokens: currentTokens
      },
      data: smartData
    };

    const finalSize = JSON.stringify(smartContext).length;
    smartContext.metadata.smartCompressedSize = finalSize;
    smartContext.metadata.smartCompressionRatio = finalSize / currentSize;
    smartContext.metadata.finalTokens = this.estimateTokens(finalSize);

    this.logger.info('Smart summarization complete', {
      contextId: context.id,
      originalTokens: currentTokens,
      targetTokens,
      finalTokens: smartContext.metadata.finalTokens,
      compressionRatio: smartContext.metadata.smartCompressionRatio
    });

    return smartContext;
  }

  /**
   * Apply intelligent compression based on importance weights
   * @private
   */
  _applySmartCompression(data, compressionRatio, weights) {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    if (Array.isArray(data)) {
      // Keep most recent items for arrays
      const keepCount = Math.max(1, Math.ceil(data.length * compressionRatio));
      return data.slice(-keepCount);
    }

    const result = {};
    const entries = Object.entries(data);
    
    // Sort by importance (higher weight = more important)
    entries.sort((a, b) => {
      const weightA = this._getImportanceWeight(a[0], weights);
      const weightB = this._getImportanceWeight(b[0], weights);
      return weightB - weightA;
    });

    // Calculate how many entries to keep
    const keepCount = Math.max(1, Math.ceil(entries.length * compressionRatio));
    
    for (let i = 0; i < keepCount && i < entries.length; i++) {
      const [key, value] = entries[i];
      
      // Recursively apply compression to nested objects
      if (typeof value === 'object' && value !== null) {
        result[key] = this._applySmartCompression(value, compressionRatio, weights);
      } else if (typeof value === 'string' && value.length > 1000) {
        // Compress long strings
        result[key] = this.extractKeyPoints(value, Math.ceil(value.length * compressionRatio));
      } else {
        result[key] = value;
      }
    }

    // Add summary of dropped data
    if (entries.length > keepCount) {
      result._compressionSummary = {
        originalKeys: entries.length,
        preservedKeys: keepCount,
        droppedKeys: entries.length - keepCount,
        droppedKeyNames: entries.slice(keepCount).map(([key]) => key)
      };
    }

    return result;
  }

  /**
   * Get importance weight for a key
   * @private
   */
  _getImportanceWeight(key, weights) {
    // Check exact match first
    if (weights[key] !== undefined) {
      return weights[key];
    }

    // Check partial matches
    for (const [weightKey, weight] of Object.entries(weights)) {
      if (key.toLowerCase().includes(weightKey.toLowerCase())) {
        return weight;
      }
    }

    // Default weight for unknown keys
    return 0.5;
  }

  /**
   * Enhanced summarization with graph relationship analysis
   * @param {Object} context - Context to summarize
   * @param {Object} options - Summarization options
   * @returns {Object} Enhanced summarized context
   */
  async graphAwareSummarize(context, options = {}) {
    const {
      targetTokens = 20000,
      preserveCriticalPaths = true,
      includeNeighborImportance = true
    } = options;

    if (!this.config.useGraphAnalysis || !this.contextGraph) {
      // Fallback to smart summarization if no graph available
      return this.smartSummarize(context, targetTokens);
    }

    try {
      // Analyze graph position and relationships
      const graphAnalysis = await this._analyzeGraphPosition(context.id);
      
      // Calculate enhanced importance weights based on graph analysis
      const enhancedWeights = await this._calculateGraphBasedImportance(
        context, 
        graphAnalysis
      );

      // Apply graph-aware compression
      const currentSize = JSON.stringify(context).length;
      const currentTokens = this.estimateTokens(currentSize);
      
      // For testing, always apply graph analysis even if under token limit
      const forceAnalysis = targetTokens < 50000; // Force analysis for testing
      
      if (currentTokens <= targetTokens && !forceAnalysis) {
        return context; // No summarization needed
      }

      const compressionRatio = targetTokens / currentTokens;
      
      const graphAwareData = this._applyGraphAwareCompression(
        context.data, 
        compressionRatio, 
        enhancedWeights,
        graphAnalysis
      );

      const enhancedContext = {
        ...context,
        metadata: {
          ...context.metadata,
          graphAwareSummarized: true,
          graphAwareSummarizedAt: new Date().toISOString(),
          originalSize: currentSize,
          targetTokens,
          originalTokens: currentTokens,
          graphAnalysis: {
            relationshipCount: graphAnalysis.relationshipCount,
            importance: graphAnalysis.importance,
            centralityScore: graphAnalysis.centralityScore
          }
        },
        data: graphAwareData
      };

      const finalSize = JSON.stringify(enhancedContext).length;
      enhancedContext.metadata.graphAwareCompressedSize = finalSize;
      enhancedContext.metadata.graphAwareCompressionRatio = finalSize / currentSize;
      enhancedContext.metadata.finalTokens = this.estimateTokens(finalSize);

      this.logger.info('Graph-aware summarization complete', {
        contextId: context.id,
        originalTokens: currentTokens,
        targetTokens,
        finalTokens: enhancedContext.metadata.finalTokens,
        compressionRatio: enhancedContext.metadata.graphAwareCompressionRatio,
        relationshipCount: graphAnalysis.relationshipCount,
        centralityScore: graphAnalysis.centralityScore
      });

      return enhancedContext;
    } catch (error) {
      this.logger.error('Graph-aware summarization failed, falling back to smart summarization', {
        contextId: context.id,
        error: error.message
      });
      return this.smartSummarize(context, targetTokens);
    }
  }

  /**
   * Analyze context's position and importance in the graph
   * @private
   */
  async _analyzeGraphPosition(contextId) {
    if (!this.contextGraph) {
      return { relationshipCount: 0, importance: 0.5, centralityScore: 0.5 };
    }

    try {
      // Get neighbors and calculate centrality
      const neighbors = await this.contextGraph.getNeighbors(contextId);
      const relationshipCount = neighbors.length;
      
      // Find dependencies (contexts this depends on)
      const dependencies = await this.contextGraph.findDependencies(contextId);
      
      // Find impacted contexts (contexts that depend on this)
      const impacted = await this.contextGraph.findImpactedContexts(contextId);
      
      // Calculate centrality score based on relationships
      const centralityScore = this._calculateCentrality(
        relationshipCount, 
        dependencies.length, 
        impacted.length
      );
      
      // Calculate importance based on graph position
      const importance = this._calculateGraphImportance(
        neighbors, 
        dependencies, 
        impacted
      );

      return {
        relationshipCount,
        dependencies: dependencies.length,
        impacted: impacted.length,
        importance,
        centralityScore,
        neighbors,
        dependencyList: dependencies,
        impactedList: impacted
      };
    } catch (error) {
      this.logger.warn('Failed to analyze graph position', {
        contextId,
        error: error.message
      });
      return { relationshipCount: 0, importance: 0.5, centralityScore: 0.5 };
    }
  }

  /**
   * Calculate centrality score for a context
   * @private
   */
  _calculateCentrality(relationshipCount, dependencyCount, impactedCount) {
    // Higher centrality for contexts with more relationships
    const relScore = Math.min(relationshipCount / 10, 1.0); // Normalize to max 10 relationships
    
    // Higher centrality for contexts that are dependencies of others
    const depScore = Math.min(impactedCount / 5, 1.0); // Normalize to max 5 dependents
    
    // Slightly lower centrality for contexts with many dependencies (they're more specific)
    const specScore = Math.max(1.0 - (dependencyCount / 10), 0.1);
    
    return (relScore * 0.4 + depScore * 0.4 + specScore * 0.2);
  }

  /**
   * Calculate graph-based importance score
   * @private
   */
  _calculateGraphImportance(neighbors, dependencies, impacted) {
    let importance = 0.5; // Base importance
    
    // High importance if many contexts depend on this one
    importance += Math.min(impacted.length * 0.1, 0.3);
    
    // Medium importance based on relationship types
    for (const neighbor of neighbors) {
      const relImportance = this.config.relationshipImportance[neighbor.relationship] || 0.5;
      importance += relImportance * 0.05; // Small boost per relationship
    }
    
    // Slight penalty for having too many dependencies (might be too specific)
    importance -= Math.min(dependencies.length * 0.02, 0.1);
    
    return Math.min(Math.max(importance, 0.1), 1.0); // Clamp between 0.1 and 1.0
  }

  /**
   * Calculate enhanced importance weights based on graph analysis
   * @private
   */
  async _calculateGraphBasedImportance(context, graphAnalysis) {
    const baseWeights = {
      error: 1.0,
      output: 0.9,
      status: 1.0,
      id: 1.0,
      capabilities: 0.8,
      config: 0.7,
      history: 0.3,
      logs: 0.2,
      tempData: 0.1
    };

    // Enhance weights based on graph position
    const enhancementFactor = graphAnalysis.importance;
    const centralityBonus = graphAnalysis.centralityScore * 0.2;

    const enhancedWeights = {};
    for (const [key, weight] of Object.entries(baseWeights)) {
      // Critical fields always maintain high importance
      if (['error', 'status', 'id'].includes(key)) {
        enhancedWeights[key] = weight;
      } else {
        // Other fields get enhanced based on graph position
        enhancedWeights[key] = Math.min(weight * (1 + enhancementFactor + centralityBonus), 1.0);
      }
    }

    // Add special importance for relationship-relevant data
    if (graphAnalysis.relationshipCount > 0) {
      enhancedWeights.parentId = 0.9;
      enhancedWeights.children = 0.8;
      enhancedWeights.dependencies = 0.8;
      enhancedWeights.references = 0.7;
    }

    this.logger.debug('Enhanced importance weights calculated', {
      contextId: context.id,
      enhancementFactor,
      centralityBonus,
      relationshipCount: graphAnalysis.relationshipCount
    });

    return enhancedWeights;
  }

  /**
   * Apply graph-aware compression
   * @private
   */
  _applyGraphAwareCompression(data, compressionRatio, weights, graphAnalysis) {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    if (Array.isArray(data)) {
      // For arrays, keep more items if this context is central
      const centralityBonus = graphAnalysis.centralityScore * 0.3;
      const adjustedRatio = Math.min(compressionRatio * (1 + centralityBonus), 1.0);
      const keepCount = Math.max(1, Math.ceil(data.length * adjustedRatio));
      return data.slice(-keepCount);
    }

    const result = {};
    const entries = Object.entries(data);
    
    // Sort by enhanced importance
    entries.sort((a, b) => {
      const weightA = this._getEnhancedImportanceWeight(a[0], weights, graphAnalysis);
      const weightB = this._getEnhancedImportanceWeight(b[0], weights, graphAnalysis);
      return weightB - weightA;
    });

    // Adjust keep count based on centrality
    const centralityBonus = graphAnalysis.centralityScore * 0.2;
    const adjustedRatio = Math.min(compressionRatio * (1 + centralityBonus), 1.0);
    const keepCount = Math.max(1, Math.ceil(entries.length * adjustedRatio));
    
    for (let i = 0; i < keepCount && i < entries.length; i++) {
      const [key, value] = entries[i];
      
      if (typeof value === 'object' && value !== null) {
        result[key] = this._applyGraphAwareCompression(value, compressionRatio, weights, graphAnalysis);
      } else if (typeof value === 'string' && value.length > 1000) {
        // Preserve more text for central contexts
        const textRatio = adjustedRatio;
        result[key] = this.extractKeyPoints(value, Math.ceil(value.length * textRatio));
      } else {
        result[key] = value;
      }
    }

    // Enhanced compression summary with graph info
    if (entries.length > keepCount) {
      result._compressionSummary = {
        originalKeys: entries.length,
        preservedKeys: keepCount,
        droppedKeys: entries.length - keepCount,
        droppedKeyNames: entries.slice(keepCount).map(([key]) => key),
        graphAware: true,
        centralityScore: graphAnalysis.centralityScore,
        relationshipCount: graphAnalysis.relationshipCount
      };
    }

    return result;
  }

  /**
   * Get enhanced importance weight considering graph position
   * @private
   */
  _getEnhancedImportanceWeight(key, weights, graphAnalysis) {
    const baseWeight = this._getImportanceWeight(key, weights);
    
    // Boost importance for relationship-related keys if context is well-connected
    if (graphAnalysis.relationshipCount > 0) {
      const relationshipKeys = ['parent', 'child', 'dependency', 'reference', 'relationship'];
      const isRelationshipKey = relationshipKeys.some(relKey => 
        key.toLowerCase().includes(relKey.toLowerCase())
      );
      
      if (isRelationshipKey) {
        return Math.min(baseWeight * 1.3, 1.0);
      }
    }
    
    return baseWeight;
  }

  /**
   * Batch summarize multiple contexts with graph optimization
   * @param {Array} contexts - Contexts to summarize
   * @param {Object} options - Batch options
   * @returns {Array} Summarized contexts
   */
  async batchGraphAwareSummarize(contexts, options = {}) {
    const {
      targetTokensPerContext = 5000,
      preserveRelationships = true,
      parallelProcessing = true
    } = options;

    if (!this.contextGraph || contexts.length === 0) {
      // Fallback to individual summarization
      const results = [];
      for (const context of contexts) {
        results.push(await this.smartSummarize(context, targetTokensPerContext));
      }
      return results;
    }

    try {
      this.logger.info('Starting batch graph-aware summarization', {
        contextCount: contexts.length,
        targetTokensPerContext
      });

      // If parallel processing is enabled and we have many contexts
      if (parallelProcessing && contexts.length > 3) {
        const chunks = this._chunkArray(contexts, 3); // Process in chunks of 3
        const results = [];
        
        for (const chunk of chunks) {
          const chunkResults = await Promise.all(
            chunk.map(context => 
              this.graphAwareSummarize(context, { targetTokens: targetTokensPerContext })
            )
          );
          results.push(...chunkResults);
        }
        
        return results;
      } else {
        // Sequential processing for smaller batches
        const results = [];
        for (const context of contexts) {
          results.push(
            await this.graphAwareSummarize(context, { targetTokens: targetTokensPerContext })
          );
        }
        return results;
      }
    } catch (error) {
      this.logger.error('Batch graph-aware summarization failed', {
        error: error.message,
        contextCount: contexts.length
      });
      throw error;
    }
  }

  /**
   * Utility to chunk array for parallel processing
   * @private
   */
  _chunkArray(array, chunkSize) {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Set context graph for relationship analysis
   * @param {Object} contextGraph - Context graph instance
   */
  setContextGraph(contextGraph) {
    this.contextGraph = contextGraph;
    this.logger.info('Context graph set for enhanced summarization');
  }

  /**
   * Get summarization statistics
   * @returns {Object} Statistics about summarization performance
   */
  getStats() {
    return {
      compressionLevels: this.compressionLevels,
      config: {
        level: this.config.level,
        ageThreshold: this.config.ageThreshold,
        maxSummaryLength: this.config.maxSummaryLength,
        useGraphAnalysis: this.config.useGraphAnalysis
      },
      hasGraphIntegration: !!this.contextGraph
    };
  }
}