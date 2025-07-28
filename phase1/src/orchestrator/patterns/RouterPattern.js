import { WorkflowPattern } from './WorkflowPattern.js';
import { AgentType } from '../../types/index.js';

/**
 * Router Pattern
 * Routes tasks to specialized agents based on content and rules
 */
export class RouterPattern extends WorkflowPattern {
  constructor(orchestrator, config = {}) {
    super(orchestrator, {
      name: 'Router',
      description: 'Content-based routing to specialized agents',
      fallbackStrategy: 'most-capable', // 'most-capable', 'round-robin', 'fail'
      routeOptimization: true,
      dynamicRouteAdjustment: true,
      ...config
    });
    
    this.routes = new Map();
    this.routeMetrics = new Map();
    this.fallbackQueue = [];
    this.setupDefaultRoutes();
  }

  /**
   * Set up default routing rules
   */
  setupDefaultRoutes() {
    // Define default routes based on task types and content
    this.addRoute('research', {
      agent: 'ANALYST',
      priority: 1,
      keywords: ['research', 'analyze', 'investigate', 'study', 'explore'],
      capabilities: ['RESEARCH']
    });
    
    this.addRoute('planning', {
      agent: 'PM',
      priority: 1,
      keywords: ['plan', 'prd', 'requirements', 'story', 'epic'],
      capabilities: ['PLANNING', 'PROJECT_MANAGEMENT']
    });
    
    this.addRoute('architecture', {
      agent: 'ARCHITECT',
      priority: 1,
      keywords: ['design', 'architect', 'system', 'structure', 'infrastructure'],
      capabilities: ['ARCHITECTURE']
    });
    
    this.addRoute('development', {
      agent: 'DEVELOPER',
      priority: 1,
      keywords: ['implement', 'code', 'build', 'develop', 'fix', 'refactor'],
      capabilities: ['DEVELOPMENT']
    });
    
    this.addRoute('testing', {
      agent: 'QA',
      priority: 1,
      keywords: ['test', 'verify', 'validate', 'qa', 'quality'],
      capabilities: ['TESTING']
    });
    
    this.addRoute('deployment', {
      agent: 'DEVOPS',
      priority: 1,
      keywords: ['deploy', 'release', 'infrastructure', 'docker', 'kubernetes'],
      capabilities: ['DEPLOYMENT', 'INFRASTRUCTURE']
    });
    
    this.addRoute('monitoring', {
      agent: 'MONITOR',
      priority: 1,
      keywords: ['monitor', 'alert', 'metric', 'observability', 'health'],
      capabilities: ['MONITORING']
    });
    
    this.addRoute('git', {
      agent: 'GIT_MANAGER',
      priority: 1,
      keywords: ['git', 'commit', 'branch', 'merge', 'pull request'],
      capabilities: ['VERSION_CONTROL']
    });
    
    this.addRoute('healing', {
      agent: 'SELF_HEALER',
      priority: 1,
      keywords: ['heal', 'fix automatically', 'self-repair', 'recover'],
      capabilities: ['SELF_HEALING']
    });
  }

  /**
   * Add a custom route
   */
  addRoute(routeName, routeConfig) {
    this.routes.set(routeName, {
      name: routeName,
      ...routeConfig,
      matchScore: 0,
      usageCount: 0,
      successRate: 1.0
    });
    
    this.routeMetrics.set(routeName, {
      totalRouted: 0,
      successful: 0,
      failed: 0,
      averageExecutionTime: 0
    });
  }

  /**
   * Check if this pattern can handle the task analysis
   */
  canHandle(taskAnalysis) {
    // Router pattern is suitable for diverse task types that need specialized handling
    return taskAnalysis.taskTypes?.length > 1 ||
           taskAnalysis.requiresSpecialization ||
           taskAnalysis.hasContentBasedRouting;
  }

  /**
   * Execute tasks using router pattern
   */
  async execute(tasks, options = {}) {
    const executionContext = await this.beforeExecute(tasks, options);
    
    try {
      const results = [];
      
      // Process each task through the router
      for (const task of tasks) {
        const routeDecision = await this.selectRoute(task);
        
        if (!routeDecision.agent) {
          // No suitable route found
          results.push({
            task: task.id,
            success: false,
            error: 'No suitable route found',
            attemptedRoutes: routeDecision.attempted
          });
          continue;
        }
        
        // Execute task with selected agent
        const agent = this.getAgent(routeDecision.agent);
        const startTime = Date.now();
        
        try {
          const result = await this.executeTask(task, agent, options);
          const executionTime = Date.now() - startTime;
          
          // Update route metrics
          this.updateRouteMetrics(routeDecision.route, true, executionTime);
          
          results.push({
            ...result,
            route: routeDecision.route,
            routeScore: routeDecision.score,
            executionTime
          });
        } catch (error) {
          const executionTime = Date.now() - startTime;
          
          // Update route metrics
          this.updateRouteMetrics(routeDecision.route, false, executionTime);
          
          // Try fallback if available
          if (this.config.fallbackStrategy !== 'fail') {
            const fallbackResult = await this.executeFallback(task, routeDecision, error);
            results.push(fallbackResult);
          } else {
            results.push({
              task: task.id,
              success: false,
              error: error.message,
              route: routeDecision.route,
              routeScore: routeDecision.score
            });
          }
        }
      }
      
      const summary = this.summarizeRoutingResults(results);
      await this.afterExecute(executionContext, summary);
      return summary;
      
    } catch (error) {
      await this.afterExecute(executionContext, null, error);
      throw error;
    }
  }

  /**
   * Select the best route for a task
   */
  async selectRoute(task) {
    const routeScores = [];
    const attempted = [];
    
    // Score each route
    for (const [routeName, route] of this.routes) {
      const score = await this.scoreRoute(task, route);
      if (score > 0) {
        routeScores.push({ routeName, route, score });
      }
      attempted.push(routeName);
    }
    
    // Sort by score (highest first)
    routeScores.sort((a, b) => b.score - a.score);
    
    // Check agent availability for top routes
    for (const { routeName, route, score } of routeScores) {
      if (await this.isAgentAvailable(route.agent)) {
        // Apply route optimization if enabled
        if (this.config.routeOptimization) {
          const optimizedScore = this.optimizeRouteScore(score, route);
          return {
            route: routeName,
            agent: route.agent,
            score: optimizedScore,
            attempted
          };
        }
        
        return {
          route: routeName,
          agent: route.agent,
          score,
          attempted
        };
      }
    }
    
    // No available agent found
    return { agent: null, attempted };
  }

  /**
   * Score a route for a given task
   */
  async scoreRoute(task, route) {
    let score = 0;
    
    // Keyword matching
    if (route.keywords && task.description) {
      const descLower = task.description.toLowerCase();
      const matchedKeywords = route.keywords.filter(keyword => 
        descLower.includes(keyword.toLowerCase())
      );
      score += matchedKeywords.length * 10;
    }
    
    // Task type matching
    if (task.type && route.keywords) {
      const typeLower = task.type.toLowerCase();
      const typeMatch = route.keywords.some(keyword => 
        typeLower.includes(keyword.toLowerCase())
      );
      if (typeMatch) score += 20;
    }
    
    // Capability matching
    if (task.requiredCapabilities && route.capabilities) {
      const capMatch = task.requiredCapabilities.filter(cap =>
        route.capabilities.includes(cap)
      );
      score += capMatch.length * 15;
    }
    
    // Priority boost
    score += (route.priority || 0) * 5;
    
    // Historical performance adjustment
    if (this.config.dynamicRouteAdjustment) {
      score *= route.successRate || 1.0;
    }
    
    return score;
  }

  /**
   * Find the best agent for a given task from available agents
   * @param {Object} task - Task to route
   * @param {Array} availableAgents - List of available agents
   * @returns {Object|null} Best agent or null if none found
   */
  async _findBestAgent(task, availableAgents) {
    let bestAgent = null;
    let bestScore = 0;
    
    for (const agent of availableAgents) {
      if (agent.status === 'busy') continue;
      
      let score = 0;
      
      // Capability matching
      if (task.capabilities && agent.capabilities) {
        const matches = task.capabilities.filter(cap => 
          agent.capabilities.includes(cap)
        );
        score += matches.length * 20;
      }
      
      // Type matching
      if (task.type && agent.type) {
        const typeMatches = {
          'research': ['AnalystAgent'],
          'planning': ['PMAgent'],
          'design': ['ArchitectAgent'],
          'development': ['DeveloperAgent'],
          'testing': ['QAAgent'],
          'deployment': ['DevOpsAgent'],
          'monitoring': ['MonitorAgent'],
          'git': ['GitManagerAgent'],
          'healing': ['SelfHealerAgent']
        };
        
        const expectedTypes = typeMatches[task.type] || [];
        if (expectedTypes.includes(agent.type)) {
          score += 30;
        }
      }
      
      // Load balancing - prefer less loaded agents
      const loadPenalty = (agent.currentLoad || 0) * 5;
      score -= loadPenalty;
      
      // Fallback strategy
      if (score === 0 && this.config.fallbackStrategy === 'most-capable') {
        score = (agent.capabilities?.length || 0) * 2;
      }
      
      if (score > bestScore) {
        bestScore = score;
        bestAgent = agent;
      }
    }
    
    return bestAgent;
  }

  /**
   * Optimize route score based on performance metrics
   */
  optimizeRouteScore(baseScore, route) {
    const metrics = this.routeMetrics.get(route.name);
    if (!metrics || metrics.totalRouted === 0) {
      return baseScore;
    }
    
    // Adjust based on success rate
    const successRate = metrics.successful / metrics.totalRouted;
    
    // Adjust based on execution time (favor faster routes)
    const timeMultiplier = metrics.averageExecutionTime > 0
      ? Math.min(2, 60000 / metrics.averageExecutionTime) // Favor routes under 1 minute
      : 1;
    
    return baseScore * successRate * timeMultiplier;
  }

  /**
   * Execute fallback strategy
   */
  async executeFallback(task, originalRoute, originalError) {
    this.logger.warn('Executing fallback strategy', {
      task: task.id,
      originalRoute: originalRoute.route,
      strategy: this.config.fallbackStrategy
    });
    
    switch (this.config.fallbackStrategy) {
      case 'most-capable':
        return await this.fallbackMostCapable(task, originalRoute, originalError);
      case 'round-robin':
        return await this.fallbackRoundRobin(task, originalRoute, originalError);
      default:
        return {
          task: task.id,
          success: false,
          error: originalError.message,
          fallback: 'none'
        };
    }
  }

  /**
   * Fallback to most capable agent
   */
  async fallbackMostCapable(task, originalRoute, originalError) {
    // Find agent with most matching capabilities
    let bestAgent = null;
    let bestScore = 0;
    
    for (const [agentType, agent] of this.orchestrator.agents) {
      if (agentType === originalRoute.agent) continue; // Skip failed agent
      
      const score = this.calculateAgentScore(agent, task.requiredCapabilities || []);
      if (score > bestScore && await this.isAgentAvailable(agentType)) {
        bestScore = score;
        bestAgent = agentType;
      }
    }
    
    if (bestAgent) {
      try {
        const agent = this.getAgent(bestAgent);
        const result = await this.executeTask(task, agent);
        return {
          ...result,
          fallback: 'most-capable',
          fallbackAgent: bestAgent,
          originalError: originalError.message
        };
      } catch (fallbackError) {
        return {
          task: task.id,
          success: false,
          error: fallbackError.message,
          originalError: originalError.message,
          fallback: 'most-capable-failed'
        };
      }
    }
    
    return {
      task: task.id,
      success: false,
      error: 'No capable fallback agent available',
      originalError: originalError.message,
      fallback: 'most-capable-none'
    };
  }

  /**
   * Fallback using round-robin through available agents
   */
  async fallbackRoundRobin(task, originalRoute, originalError) {
    const availableAgents = [];
    
    for (const [agentType, agent] of this.orchestrator.agents) {
      if (agentType === originalRoute.agent) continue;
      if (await this.isAgentAvailable(agentType)) {
        availableAgents.push(agentType);
      }
    }
    
    if (availableAgents.length === 0) {
      return {
        task: task.id,
        success: false,
        error: 'No available fallback agents',
        originalError: originalError.message,
        fallback: 'round-robin-none'
      };
    }
    
    // Use round-robin index
    const fallbackIndex = this.fallbackQueue.length % availableAgents.length;
    const fallbackAgent = availableAgents[fallbackIndex];
    this.fallbackQueue.push(task.id);
    
    try {
      const agent = this.getAgent(fallbackAgent);
      const result = await this.executeTask(task, agent);
      return {
        ...result,
        fallback: 'round-robin',
        fallbackAgent,
        originalError: originalError.message
      };
    } catch (fallbackError) {
      return {
        task: task.id,
        success: false,
        error: fallbackError.message,
        originalError: originalError.message,
        fallback: 'round-robin-failed'
      };
    }
  }

  /**
   * Update route metrics
   */
  updateRouteMetrics(routeName, success, executionTime) {
    const metrics = this.routeMetrics.get(routeName);
    if (!metrics) return;
    
    metrics.totalRouted++;
    if (success) {
      metrics.successful++;
    } else {
      metrics.failed++;
    }
    
    // Update average execution time
    const totalTime = metrics.averageExecutionTime * (metrics.totalRouted - 1) + executionTime;
    metrics.averageExecutionTime = totalTime / metrics.totalRouted;
    
    // Update route success rate for dynamic adjustment
    const route = this.routes.get(routeName);
    if (route) {
      route.successRate = metrics.successful / metrics.totalRouted;
      route.usageCount = metrics.totalRouted;
    }
  }

  /**
   * Summarize routing results
   */
  summarizeRoutingResults(results) {
    const summary = {
      pattern: 'Router',
      totalTasks: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      routeUsage: {},
      fallbackUsage: {
        total: 0,
        successful: 0,
        byType: {}
      },
      results
    };
    
    // Count route usage
    for (const result of results) {
      if (result.route) {
        summary.routeUsage[result.route] = (summary.routeUsage[result.route] || 0) + 1;
      }
      
      if (result.fallback) {
        summary.fallbackUsage.total++;
        if (result.success) {
          summary.fallbackUsage.successful++;
        }
        summary.fallbackUsage.byType[result.fallback] = 
          (summary.fallbackUsage.byType[result.fallback] || 0) + 1;
      }
    }
    
    return summary;
  }

  /**
   * Get route information
   */
  getRouteInfo() {
    const info = [];
    
    for (const [routeName, route] of this.routes) {
      const metrics = this.routeMetrics.get(routeName);
      info.push({
        name: routeName,
        agent: route.agent,
        priority: route.priority,
        keywords: route.keywords,
        capabilities: route.capabilities,
        metrics: metrics || {},
        successRate: route.successRate,
        usageCount: route.usageCount
      });
    }
    
    return info;
  }

  /**
   * Get pattern-specific metrics
   */
  getMetrics() {
    const baseMetrics = super.getMetrics();
    return {
      ...baseMetrics,
      patternSpecificMetrics: {
        routes: this.getRouteInfo(),
        fallbackRate: this.calculateFallbackRate(),
        averageRouteScore: this.calculateAverageRouteScore()
      }
    };
  }

  /**
   * Calculate fallback rate
   */
  calculateFallbackRate() {
    let totalTasks = 0;
    let fallbackTasks = 0;
    
    for (const metrics of this.routeMetrics.values()) {
      totalTasks += metrics.totalRouted;
      fallbackTasks += metrics.failed;
    }
    
    return totalTasks > 0 ? fallbackTasks / totalTasks : 0;
  }

  /**
   * Calculate average route score
   */
  calculateAverageRouteScore() {
    let totalScore = 0;
    let routeCount = 0;
    
    for (const route of this.routes.values()) {
      if (route.usageCount > 0) {
        totalScore += route.successRate;
        routeCount++;
      }
    }
    
    return routeCount > 0 ? totalScore / routeCount : 0;
  }
}