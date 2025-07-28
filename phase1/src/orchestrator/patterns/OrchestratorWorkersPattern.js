import { WorkflowPattern } from './WorkflowPattern.js';

/**
 * Orchestrator-Workers Pattern
 * Distributes tasks to worker agents in parallel with load balancing
 */
export class OrchestratorWorkersPattern extends WorkflowPattern {
  constructor(orchestrator, config = {}) {
    super(orchestrator, {
      name: 'OrchestratorWorkers',
      description: 'Central orchestrator distributes tasks to worker agents',
      maxWorkers: 3,
      loadBalancing: 'round-robin', // 'round-robin', 'least-loaded', 'random'
      workerTimeout: 60000, // 1 minute per worker
      aggregationStrategy: 'collect-all', // 'collect-all', 'first-success', 'majority-vote'
      ...config
    });
    
    this.workerPool = new Map();
    this.workerLoadMap = new Map();
    this.currentRoundRobinIndex = 0;
  }

  /**
   * Check if this pattern can handle the task analysis
   */
  canHandle(taskAnalysis) {
    return taskAnalysis.parallelizable && 
           taskAnalysis.tasksCount > 3 &&
           taskAnalysis.uniformComplexity &&
           !taskAnalysis.dependencies?.includes('sequential-execution');
  }

  /**
   * Execute tasks using orchestrator-workers pattern
   */
  async execute(tasks, options = {}) {
    const executionContext = await this.beforeExecute(tasks, options);
    
    try {
      // Initialize worker pool
      const workerPool = await this.createWorkerPool(options.maxWorkers || this.config.maxWorkers);
      
      // Distribute tasks to workers
      const distribution = this.distributeTasks(tasks, workerPool);
      
      // Execute distributed tasks in parallel
      const results = await this.executeDistributedTasks(distribution, options);
      
      // Aggregate results based on strategy
      const aggregatedResult = await this.aggregateResults(results, this.config.aggregationStrategy);
      
      await this.afterExecute(executionContext, aggregatedResult);
      return aggregatedResult;
      
    } catch (error) {
      await this.afterExecute(executionContext, null, error);
      throw error;
    }
  }

  /**
   * Create worker pool from available agents
   */
  async createWorkerPool(maxWorkers) {
    const workers = [];
    const agentTypes = Array.from(this.orchestrator.agents.keys());
    
    // Select workers based on availability and capabilities
    for (const agentType of agentTypes) {
      if (workers.length >= maxWorkers) break;
      
      const agent = this.orchestrator.agents.get(agentType);
      if (await this.isAgentAvailable(agentType) && this.canActAsWorker(agent)) {
        workers.push({
          type: agentType,
          agent,
          load: 0,
          taskCount: 0
        });
        this.workerLoadMap.set(agentType, 0);
      }
    }
    
    if (workers.length === 0) {
      throw new Error('No available workers found');
    }
    
    this.logger.info(`Created worker pool with ${workers.length} workers`, {
      workers: workers.map(w => w.type)
    });
    
    return workers;
  }

  /**
   * Check if agent can act as a worker
   */
  canActAsWorker(agent) {
    // Exclude orchestrator and other coordination agents
    const excludedTypes = ['ORCHESTRATOR', 'SCRUM_MASTER'];
    return !excludedTypes.includes(agent.type);
  }

  /**
   * Distribute tasks among workers
   */
  distributeTasks(tasks, workers) {
    const distribution = new Map();
    
    // Initialize distribution map
    for (const worker of workers) {
      distribution.set(worker.type, []);
    }
    
    // Distribute based on load balancing strategy
    switch (this.config.loadBalancing) {
      case 'round-robin':
        this.distributeRoundRobin(tasks, workers, distribution);
        break;
      case 'least-loaded':
        this.distributeLeastLoaded(tasks, workers, distribution);
        break;
      case 'random':
        this.distributeRandom(tasks, workers, distribution);
        break;
      default:
        this.distributeRoundRobin(tasks, workers, distribution);
    }
    
    this.logger.info('Task distribution completed', {
      strategy: this.config.loadBalancing,
      distribution: Array.from(distribution.entries()).map(([agent, tasks]) => ({
        agent,
        taskCount: tasks.length
      }))
    });
    
    return distribution;
  }

  /**
   * Round-robin distribution
   */
  distributeRoundRobin(tasks, workers, distribution) {
    for (const task of tasks) {
      const worker = workers[this.currentRoundRobinIndex % workers.length];
      distribution.get(worker.type).push(task);
      worker.taskCount++;
      this.currentRoundRobinIndex++;
    }
  }

  /**
   * Least-loaded distribution
   */
  distributeLeastLoaded(tasks, workers, distribution) {
    for (const task of tasks) {
      // Find worker with least load
      let leastLoadedWorker = workers[0];
      for (const worker of workers) {
        if (worker.taskCount < leastLoadedWorker.taskCount) {
          leastLoadedWorker = worker;
        }
      }
      
      distribution.get(leastLoadedWorker.type).push(task);
      leastLoadedWorker.taskCount++;
    }
  }

  /**
   * Random distribution
   */
  distributeRandom(tasks, workers, distribution) {
    for (const task of tasks) {
      const randomIndex = Math.floor(Math.random() * workers.length);
      const worker = workers[randomIndex];
      distribution.get(worker.type).push(task);
      worker.taskCount++;
    }
  }

  /**
   * Execute distributed tasks in parallel
   */
  async executeDistributedTasks(distribution, options) {
    const executionPromises = [];
    
    for (const [agentType, tasks] of distribution) {
      if (tasks.length === 0) continue;
      
      const agent = this.getAgent(agentType);
      const workerPromise = this.executeWorkerTasks(agent, tasks, options);
      executionPromises.push(workerPromise);
    }
    
    // Wait for all workers to complete with timeout
    const timeout = options.workerTimeout || this.config.workerTimeout;
    const results = await Promise.race([
      Promise.all(executionPromises),
      this.delay(timeout).then(() => {
        throw new Error(`Worker execution timeout after ${timeout}ms`);
      })
    ]);
    
    return results;
  }

  /**
   * Execute tasks for a single worker
   */
  async executeWorkerTasks(agent, tasks, options) {
    const results = [];
    
    this.logger.info(`Worker ${agent.type} executing ${tasks.length} tasks`);
    
    for (const task of tasks) {
      try {
        const result = await this.executeTask(task, agent, options);
        results.push({
          worker: agent.type,
          task: task.id,
          ...result
        });
      } catch (error) {
        results.push({
          worker: agent.type,
          task: task.id,
          success: false,
          error: error.message
        });
      }
    }
    
    return {
      worker: agent.type,
      results,
      summary: {
        total: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      }
    };
  }

  /**
   * Aggregate results from all workers
   */
  async aggregateResults(workerResults, strategy) {
    switch (strategy) {
      case 'collect-all':
        return this.aggregateCollectAll(workerResults);
      case 'first-success':
        return this.aggregateFirstSuccess(workerResults);
      case 'majority-vote':
        return this.aggregateMajorityVote(workerResults);
      default:
        return this.aggregateCollectAll(workerResults);
    }
  }

  /**
   * Collect all results
   */
  aggregateCollectAll(workerResults) {
    const aggregated = {
      pattern: 'OrchestratorWorkers',
      strategy: 'collect-all',
      workers: workerResults.length,
      results: [],
      summary: {
        totalTasks: 0,
        successful: 0,
        failed: 0,
        byWorker: {}
      }
    };
    
    for (const workerResult of workerResults) {
      aggregated.results.push(...workerResult.results);
      aggregated.summary.totalTasks += workerResult.summary.total;
      aggregated.summary.successful += workerResult.summary.successful;
      aggregated.summary.failed += workerResult.summary.failed;
      aggregated.summary.byWorker[workerResult.worker] = workerResult.summary;
    }
    
    return aggregated;
  }

  /**
   * Return first successful result
   */
  aggregateFirstSuccess(workerResults) {
    for (const workerResult of workerResults) {
      const successfulResult = workerResult.results.find(r => r.success);
      if (successfulResult) {
        return {
          pattern: 'OrchestratorWorkers',
          strategy: 'first-success',
          result: successfulResult,
          worker: workerResult.worker
        };
      }
    }
    
    return {
      pattern: 'OrchestratorWorkers',
      strategy: 'first-success',
      result: null,
      error: 'No successful results found'
    };
  }

  /**
   * Aggregate by majority vote (for consensus tasks)
   */
  aggregateMajorityVote(workerResults) {
    const votes = new Map();
    let totalVotes = 0;
    
    // Count votes (assuming results have a 'value' field)
    for (const workerResult of workerResults) {
      for (const result of workerResult.results) {
        if (result.success && result.result?.value) {
          const value = JSON.stringify(result.result.value);
          votes.set(value, (votes.get(value) || 0) + 1);
          totalVotes++;
        }
      }
    }
    
    // Find majority
    let majorityValue = null;
    let maxVotes = 0;
    
    for (const [value, count] of votes) {
      if (count > maxVotes) {
        maxVotes = count;
        majorityValue = value;
      }
    }
    
    return {
      pattern: 'OrchestratorWorkers',
      strategy: 'majority-vote',
      result: majorityValue ? JSON.parse(majorityValue) : null,
      votes: Object.fromEntries(votes),
      totalVotes,
      majorityThreshold: Math.floor(totalVotes / 2) + 1,
      hasMajority: maxVotes > Math.floor(totalVotes / 2)
    };
  }

  /**
   * Get pattern-specific configuration schema
   */
  getConfigSchema() {
    return {
      ...super.getConfigSchema(),
      maxWorkers: { type: 'number', min: 1, max: 10 },
      loadBalancing: { 
        type: 'string', 
        enum: ['round-robin', 'least-loaded', 'random'] 
      },
      workerTimeout: { type: 'number', min: 1000, max: 600000 },
      aggregationStrategy: { 
        type: 'string', 
        enum: ['collect-all', 'first-success', 'majority-vote'] 
      }
    };
  }

  /**
   * Get pattern-specific metrics
   */
  getMetrics() {
    const baseMetrics = super.getMetrics();
    return {
      ...baseMetrics,
      patternSpecificMetrics: {
        averageWorkersUsed: this.metrics.patternSpecificMetrics.averageWorkersUsed || 0,
        loadDistribution: Object.fromEntries(this.workerLoadMap),
        lastDistributionStrategy: this.config.loadBalancing
      }
    };
  }
}