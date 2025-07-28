import { BaseAgent } from '../agents/BaseAgent.js';
import { AnalystAgent } from '../agents/core/AnalystAgent.js';
import { PMAgent } from '../agents/core/PMAgent.js';
import { ArchitectAgent } from '../agents/core/ArchitectAgent.js';
import { DeveloperAgent } from '../agents/extended/DeveloperAgent.js';
import { QAAgent } from '../agents/extended/QAAgent.js';
import { DevOpsAgent } from '../agents/extended/DevOpsAgent.js';
import { GitManagerAgent } from '../agents/extended/GitManagerAgent.js';
import { MonitorAgent } from '../agents/extended/MonitorAgent.js';
import { SelfHealerAgent } from '../agents/extended/SelfHealerAgent.js';
import { 
  AgentType, 
  AgentCapability, 
  ClaudeCodeTool,
  TaskSchema,
  ContextLevel
} from '../types/index.js';
import PQueue from 'p-queue';
import { ContextManager } from '../context/ContextManager.js';
import { 
  OrchestratorWorkersPattern,
  RouterPattern,
  PipelinePattern
} from './patterns/index.js';

export class OrchestratorAgent extends BaseAgent {
  constructor(config = {}) {
    super({
      id: config.id || 'orchestrator-001',
      type: 'OrchestratorAgent',
      name: 'Orchestrator',
      description: 'Intelligent task router and workflow coordinator',
      capabilities: [
        AgentCapability.PLANNING,
        AgentCapability.PROJECT_MANAGEMENT
      ],
      tools: [
        ClaudeCodeTool.TASK,
        ClaudeCodeTool.TODO_WRITE
      ],
      ...config
    });
    
    this.agents = new Map();
    this.taskQueue = new PQueue({ 
      concurrency: config.maxConcurrency || 3,
      interval: 1000,
      intervalCap: 5 // Max 5 tasks per second
    });
    this.workflows = new Map();
    this.activeWorkflows = new Map();
    
    // Initialize workflow patterns
    this.patterns = new Map();
    this.patternMetrics = new Map();
    this.defaultPattern = config.defaultPattern || 'router';
    
    // Agent type mappings (legacy constant to class name)
    this.agentTypeMap = {
      'ANALYST': 'AnalystAgent',
      'PM': 'PMAgent',
      'ARCHITECT': 'ArchitectAgent',
      'DEVELOPER': 'DeveloperAgent',
      'QA': 'QAAgent',
      'DEVOPS': 'DevOpsAgent',
      'GIT_MANAGER': 'GitManagerAgent',
      'MONITOR': 'MonitorAgent',
      'SELF_HEALER': 'SelfHealerAgent',
      'ORCHESTRATOR': 'OrchestratorAgent'
    };
  }

  async initialize(contextManager) {
    await super.initialize(contextManager);
    
    // Initialize core agents
    await this._initializeCoreAgents();
    
    // Load workflow definitions
    await this._loadWorkflowDefinitions();
    
    // Initialize workflow patterns
    await this._initializePatterns();
    
    // Restore active workflows from context
    await this._restoreActiveWorkflows();
    
    this.logger.info('Orchestrator initialized', { 
      agents: Array.from(this.agents.keys()),
      workflows: Array.from(this.workflows.keys()),
      patterns: Array.from(this.patterns.keys())
    });
  }

  async _initializeCoreAgents() {
    const agents = [
      new AnalystAgent({ contextManager: this.contextManager }),
      new PMAgent({ contextManager: this.contextManager }),
      new ArchitectAgent({ contextManager: this.contextManager }),
      new DeveloperAgent({ contextManager: this.contextManager }),
      new QAAgent({ contextManager: this.contextManager }),
      new DevOpsAgent({ contextManager: this.contextManager }),
      new GitManagerAgent({ contextManager: this.contextManager }),
      new MonitorAgent({ contextManager: this.contextManager }),
      new SelfHealerAgent({ contextManager: this.contextManager })
    ];
    
    for (const agent of agents) {
      await agent.initialize(this.contextManager);
      this.agents.set(agent.type, agent);
      
      this.logger.info('Agent registered', { 
        type: agent.type, 
        id: agent.id 
      });
    }
  }

  async _loadWorkflowDefinitions() {
    // Define standard workflows
    this.workflows.set('product-development', {
      name: 'Product Development Workflow',
      description: 'Standard workflow for new product development',
      phases: [
        {
          name: 'Discovery',
          tasks: [
            { agent: AgentType.ANALYST, task: 'research-prompt', parallel: false },
            { agent: AgentType.ANALYST, task: 'create-project-brief', parallel: false }
          ]
        },
        {
          name: 'Planning',
          tasks: [
            { agent: AgentType.PM, task: 'create-prd', parallel: false },
            { agent: AgentType.ARCHITECT, task: 'create-full-stack-architecture', parallel: false },
            { agent: AgentType.PM, task: 'create-epic', parallel: true },
            { agent: AgentType.PM, task: 'create-story', parallel: true }
          ]
        },
        {
          name: 'Development',
          tasks: [
            { agent: AgentType.DEVELOPER, task: 'implement-story', parallel: true },
            { agent: AgentType.QA, task: 'test-implementation', parallel: true }
          ]
        }
      ]
    });
    
    this.workflows.set('brownfield-modernization', {
      name: 'Brownfield Modernization Workflow',
      description: 'Workflow for modernizing existing systems',
      phases: [
        {
          name: 'Analysis',
          tasks: [
            { agent: AgentType.ANALYST, task: 'document-project', parallel: false },
            { agent: AgentType.ARCHITECT, task: 'document-project', parallel: false }
          ]
        },
        {
          name: 'Planning',
          tasks: [
            { agent: AgentType.PM, task: 'create-brownfield-prd', parallel: false },
            { agent: AgentType.ARCHITECT, task: 'create-brownfield-architecture', parallel: false }
          ]
        }
      ]
    });
    
    this.workflows.set('emergency-response', {
      name: 'Emergency Response Workflow',
      description: 'Rapid response for critical issues',
      phases: [
        {
          name: 'Triage',
          tasks: [
            { agent: AgentType.ANALYST, task: 'analyze-issue', parallel: false }
          ]
        },
        {
          name: 'Resolution',
          tasks: [
            { agent: AgentType.DEVELOPER, task: 'hotfix', parallel: false },
            { agent: AgentType.QA, task: 'verify-fix', parallel: false }
          ]
        }
      ]
    });
  }

  async _initializePatterns() {
    // Initialize built-in patterns
    this.patterns.set('orchestrator-workers', new OrchestratorWorkersPattern(this));
    this.patterns.set('router', new RouterPattern(this));
    this.patterns.set('pipeline', new PipelinePattern(this));
    
    // Initialize pattern metrics
    for (const patternName of this.patterns.keys()) {
      this.patternMetrics.set(patternName, {
        usage: 0,
        successRate: 0,
        averageExecutionTime: 0
      });
    }
    
    this.logger.info('Workflow patterns initialized', {
      patterns: Array.from(this.patterns.keys())
    });
  }

  async _restoreActiveWorkflows() {
    const contexts = await this.contextManager.queryContexts({
      level: ContextLevel.PROJECT,
      tags: ['workflow-active']
    });
    
    for (const context of contexts) {
      if (context.data.workflowId && context.data.status === 'active') {
        this.activeWorkflows.set(context.data.workflowId, context.data);
      }
    }
  }

  async _executeTask(request) {
    const { taskType, input } = request;
    
    this.logger.info('Orchestrator executing task', { taskType });
    
    switch (taskType) {
      case 'analyze-request':
        return await this._analyzeAndRoute(input);
        
      case 'execute-workflow':
        return await this._executeWorkflow(input);
        
      case 'execute-pattern':
        return await this._executeWithPattern(input);
        
      case 'delegate-task':
        return await this._delegateTask(input);
        
      case 'coordinate-agents':
        return await this._coordinateAgents(input);
        
      case 'monitor-progress':
        return await this._monitorProgress(input);
        
      default:
        throw new Error(`Unknown task type: ${taskType}`);
    }
  }

  async _analyzeAndRoute(input) {
    const { request, context = {}, usePattern = true } = input;
    
    this.logger.info('Analyzing request', { request });
    
    // Analyze request to determine appropriate action
    const analysis = {
      intent: this._identifyIntent(request),
      requiredCapabilities: this._identifyRequiredCapabilities(request),
      suggestedWorkflow: this._suggestWorkflow(request),
      suggestedAgents: this._suggestAgents(request),
      estimatedComplexity: this._estimateComplexity(request),
      dependencies: this._identifyDependencies(request),
      parallelizable: this._identifyParallelizable(request),
      taskTypes: this._identifyTaskTypes(request),
      uniformComplexity: this._hasUniformComplexity(request)
    };
    
    // Create routing plan
    const routingPlan = {
      primaryAgent: this._selectPrimaryAgent(analysis),
      supportingAgents: this._selectSupportingAgents(analysis),
      workflow: analysis.suggestedWorkflow,
      tasks: this._createTaskPlan(analysis, request),
      parallelizable: this._identifyParallelTasks(analysis)
    };
    
    // Execute routing plan with patterns if enabled
    if (usePattern && routingPlan.tasks.length > 0) {
      const pattern = await this._selectPattern(analysis);
      return await this._executeWithPattern({
        tasks: routingPlan.tasks,
        patternName: pattern.config.name,
        analysis
      });
    } else if (routingPlan.workflow) {
      return await this._executeWorkflow({
        workflowId: routingPlan.workflow,
        input: { request, context },
        options: { parallel: true }
      });
    } else {
      return await this._executeTasks(routingPlan.tasks);
    }
  }

  async _executeWorkflow(input) {
    const { workflowId, input: workflowInput, options = {} } = input;
    
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Unknown workflow: ${workflowId}`);
    }
    
    this.logger.info('Executing workflow', { 
      workflowId, 
      phases: workflow.phases.length 
    });
    
    // Create workflow context
    const workflowContext = await this.contextManager.createContext(
      ContextLevel.PROJECT,
      {
        workflowId,
        workflow: workflow.name,
        status: 'active',
        startedAt: new Date().toISOString(),
        input: workflowInput,
        phases: workflow.phases.map(p => ({ 
          name: p.name, 
          status: 'pending' 
        })),
        tags: ['workflow-active']
      }
    );
    
    this.activeWorkflows.set(workflowContext.id, workflowContext);
    
    const results = {
      workflowId: workflowContext.id,
      workflow: workflow.name,
      phases: []
    };
    
    try {
      // Execute workflow phases
      for (const [phaseIndex, phase] of workflow.phases.entries()) {
        this.logger.info('Executing phase', { 
          phase: phase.name,
          tasks: phase.tasks.length 
        });
        
        // Update phase status
        await this._updateWorkflowPhase(workflowContext.id, phaseIndex, 'running');
        
        const phaseResults = {
          phase: phase.name,
          tasks: []
        };
        
        // Execute phase tasks
        if (options.parallel && phase.tasks.some(t => t.parallel)) {
          // Execute parallel tasks
          const parallelTasks = phase.tasks.filter(t => t.parallel);
          const sequentialTasks = phase.tasks.filter(t => !t.parallel);
          
          // Execute sequential tasks first
          for (const task of sequentialTasks) {
            const result = await this._executeWorkflowTask(task, workflowInput);
            phaseResults.tasks.push(result);
          }
          
          // Execute parallel tasks
          const parallelResults = await Promise.all(
            parallelTasks.map(task => this._executeWorkflowTask(task, workflowInput))
          );
          phaseResults.tasks.push(...parallelResults);
        } else {
          // Execute all tasks sequentially
          for (const task of phase.tasks) {
            const result = await this._executeWorkflowTask(task, workflowInput);
            phaseResults.tasks.push(result);
            
            // Pass result to next task if needed
            if (phase.tasks.indexOf(task) < phase.tasks.length - 1) {
              workflowInput.previousResult = result;
            }
          }
        }
        
        results.phases.push(phaseResults);
        
        // Update phase status
        await this._updateWorkflowPhase(workflowContext.id, phaseIndex, 'completed');
      }
      
      // Update workflow status
      await this.contextManager.updateContext(
        ContextLevel.PROJECT,
        workflowContext.id,
        {
          status: 'completed',
          completedAt: new Date().toISOString(),
          results
        }
      );
      
      this.activeWorkflows.delete(workflowContext.id);
      
      return {
        success: true,
        workflowId: workflowContext.id,
        results,
        summary: `Completed workflow "${workflow.name}" with ${results.phases.length} phases`
      };
    } catch (error) {
      // Update workflow status
      await this.contextManager.updateContext(
        ContextLevel.PROJECT,
        workflowContext.id,
        {
          status: 'failed',
          error: error.message,
          failedAt: new Date().toISOString()
        }
      );
      
      this.activeWorkflows.delete(workflowContext.id);
      
      throw error;
    }
  }

  async _executeWorkflowTask(taskDef, input) {
    const agent = this.agents.get(taskDef.agent);
    if (!agent) {
      throw new Error(`Agent not found: ${taskDef.agent}`);
    }
    
    const taskId = this._generateTaskId();
    
    const task = {
      id: taskId,
      type: taskDef.task,
      priority: 'medium',
      status: 'pending',
      input,
      createdAt: new Date().toISOString()
    };
    
    // Add to queue with priority
    return await this.taskQueue.add(
      async () => {
        this.logger.info('Executing workflow task', { 
          agent: taskDef.agent,
          task: taskDef.task 
        });
        
        const result = await agent.execute({
          taskId: task.id,
          taskType: task.type,
          input: task.input
        });
        
        return {
          taskId: task.id,
          agent: taskDef.agent,
          task: taskDef.task,
          result
        };
      },
      { priority: this._getTaskPriority(task.priority) }
    );
  }

  async _delegateTask(input) {
    const { agentType, task, taskInput, priority = 'medium' } = input;
    
    const agent = this.agents.get(agentType);
    if (!agent) {
      throw new Error(`Agent not found: ${agentType}`);
    }
    
    const taskId = this._generateTaskId();
    
    this.logger.info('Delegating task', { 
      taskId,
      agent: agentType,
      task 
    });
    
    // Create task context
    const taskContext = await this.contextManager.createContext(
      ContextLevel.TASK,
      {
        taskId,
        taskType: task,
        input: taskInput,
        status: 'assigned',
        assignedTo: agent.id,
        priority
      },
      this.id
    );
    
    // Execute through queue
    const result = await this.taskQueue.add(
      async () => {
        return await agent.execute({
          taskId,
          taskType: task,
          input: taskInput
        });
      },
      { priority: this._getTaskPriority(priority) }
    );
    
    // Update task context
    await this.contextManager.updateContext(
      ContextLevel.TASK,
      taskContext.id,
      {
        status: 'completed',
        output: result,
        completedAt: new Date().toISOString()
      }
    );
    
    return result;
  }

  async _coordinateAgents(input) {
    const { agents, tasks, coordination = 'sequential' } = input;
    
    this.logger.info('Coordinating agents', { 
      agents: agents.length,
      tasks: tasks.length,
      coordination 
    });
    
    const results = [];
    
    switch (coordination) {
      case 'sequential':
        // Execute tasks one by one
        for (const [index, task] of tasks.entries()) {
          const agentType = agents[index] || agents[0];
          const result = await this._delegateTask({
            agentType,
            task: task.type,
            taskInput: task.input
          });
          results.push(result);
          
          // Pass result to next task
          if (index < tasks.length - 1) {
            tasks[index + 1].input.previousResult = result;
          }
        }
        break;
        
      case 'parallel':
        // Execute all tasks in parallel
        const promises = tasks.map((task, index) => {
          const agentType = agents[index] || agents[0];
          return this._delegateTask({
            agentType,
            task: task.type,
            taskInput: task.input
          });
        });
        results.push(...await Promise.all(promises));
        break;
        
      case 'pipeline':
        // Execute in pipeline fashion
        let pipelineData = input.initialData;
        for (const [index, task] of tasks.entries()) {
          const agentType = agents[index] || agents[0];
          const result = await this._delegateTask({
            agentType,
            task: task.type,
            taskInput: { ...task.input, pipelineData }
          });
          pipelineData = result.output;
          results.push(result);
        }
        break;
        
      default:
        throw new Error(`Unknown coordination type: ${coordination}`);
    }
    
    return {
      coordination,
      results,
      summary: `Coordinated ${agents.length} agents for ${tasks.length} tasks`
    };
  }

  async _monitorProgress(input) {
    const { workflowId, includeMetrics = true } = input;
    
    if (workflowId) {
      // Monitor specific workflow
      const workflow = this.activeWorkflows.get(workflowId);
      if (!workflow) {
        return { status: 'not_found', workflowId };
      }
      
      return {
        workflowId,
        status: workflow.data.status,
        phases: workflow.data.phases,
        startedAt: workflow.data.startedAt,
        progress: this._calculateWorkflowProgress(workflow)
      };
    } else {
      // Monitor all active workflows
      const monitoring = {
        activeWorkflows: this.activeWorkflows.size,
        queuedTasks: this.taskQueue.size,
        pendingTasks: this.taskQueue.pending,
        workflows: []
      };
      
      for (const [id, workflow] of this.activeWorkflows) {
        monitoring.workflows.push({
          id,
          name: workflow.data.workflow,
          status: workflow.data.status,
          progress: this._calculateWorkflowProgress(workflow)
        });
      }
      
      if (includeMetrics) {
        monitoring.metrics = await this._gatherMetrics();
      }
      
      return monitoring;
    }
  }

  // Helper methods
  _identifyIntent(request) {
    const intents = {
      research: ['research', 'analyze', 'investigate', 'study', 'explore', 'understand'],
      planning: ['plan', 'create prd', 'requirements', 'roadmap', 'story', 'epic'],
      architecture: ['design', 'architect', 'system', 'infrastructure', 'structure'],
      development: ['implement', 'code', 'build', 'develop', 'fix', 'refactor', 'create feature'],
      testing: ['test', 'verify', 'validate', 'qa', 'review', 'quality', 'coverage'],
      debugging: ['debug', 'troubleshoot', 'investigate issue', 'error', 'bug'],
      deployment: ['deploy', 'release', 'rollout', 'ship', 'launch'],
      infrastructure: ['infrastructure', 'terraform', 'docker', 'kubernetes', 'container'],
      monitoring: ['monitor', 'alert', 'metric', 'observability', 'dashboard'],
      git: ['git', 'commit', 'branch', 'merge', 'pull request', 'version control'],
      healing: ['heal', 'fix automatically', 'self-repair', 'recover']
    };
    
    const requestLower = request.toLowerCase();
    
    for (const [intent, keywords] of Object.entries(intents)) {
      if (keywords.some(keyword => requestLower.includes(keyword))) {
        return intent;
      }
    }
    
    return 'general';
  }

  _identifyRequiredCapabilities(request) {
    const capabilities = [];
    
    if (request.match(/research|analyze|investigate/i)) {
      capabilities.push(AgentCapability.RESEARCH);
    }
    if (request.match(/plan|prd|requirements/i)) {
      capabilities.push(AgentCapability.PLANNING);
    }
    if (request.match(/design|architect|system/i)) {
      capabilities.push(AgentCapability.ARCHITECTURE);
    }
    if (request.match(/implement|code|build/i)) {
      capabilities.push(AgentCapability.DEVELOPMENT);
    }
    if (request.match(/test|verify|qa/i)) {
      capabilities.push(AgentCapability.TESTING);
    }
    
    return capabilities;
  }

  _suggestWorkflow(request) {
    if (request.match(/new product|greenfield|from scratch/i)) {
      return 'product-development';
    }
    if (request.match(/existing|brownfield|modernize|migrate/i)) {
      return 'brownfield-modernization';
    }
    if (request.match(/emergency|critical|urgent|hotfix/i)) {
      return 'emergency-response';
    }
    return null;
  }

  _suggestAgents(request) {
    const agents = [];
    const capabilities = this._identifyRequiredCapabilities(request);
    
    for (const [agentType, agent] of this.agents) {
      if (capabilities.some(cap => agent.capabilities.includes(cap))) {
        agents.push(agentType);
      }
    }
    
    return agents;
  }

  _estimateComplexity(request) {
    const factors = {
      length: request.length > 200 ? 2 : 1,
      requirements: (request.match(/and|also|plus|with/gi) || []).length,
      technical: (request.match(/api|database|architecture|infrastructure/gi) || []).length
    };
    
    const score = factors.length + factors.requirements + factors.technical;
    
    if (score > 6) return 'high';
    if (score > 3) return 'medium';
    return 'low';
  }

  _identifyDependencies(request) {
    const dependencies = [];
    
    if (request.match(/after|then|following/i)) {
      dependencies.push('sequential-execution');
    }
    if (request.match(/based on|using|from/i)) {
      dependencies.push('data-dependency');
    }
    if (request.match(/integrate|connect|api/i)) {
      dependencies.push('integration-required');
    }
    
    return dependencies;
  }

  _selectPrimaryAgent(analysis) {
    const agentPriority = {
      research: AgentType.ANALYST,
      planning: AgentType.PM,
      architecture: AgentType.ARCHITECT,
      development: AgentType.DEVELOPER,
      testing: AgentType.QA,
      debugging: AgentType.DEVELOPER,
      deployment: AgentType.DEVOPS,
      infrastructure: AgentType.DEVOPS,
      monitoring: AgentType.MONITOR,
      git: AgentType.GIT_MANAGER,
      healing: AgentType.SELF_HEALER
    };
    
    return agentPriority[analysis.intent] || AgentType.ANALYST;
  }

  _selectSupportingAgents(analysis) {
    const supporting = [];
    
    if (analysis.requiredCapabilities.length > 1) {
      for (const capability of analysis.requiredCapabilities) {
        const agent = this._findAgentByCapability(capability);
        if (agent && agent !== this._selectPrimaryAgent(analysis)) {
          supporting.push(agent);
        }
      }
    }
    
    return supporting;
  }

  _findAgentByCapability(capability) {
    for (const [agentType, agent] of this.agents) {
      if (agent.capabilities.includes(capability)) {
        return agentType;
      }
    }
    return null;
  }

  _createTaskPlan(analysis, request) {
    const tasks = [];
    
    // Create tasks based on intent and capabilities
    switch (analysis.intent) {
      case 'research':
        tasks.push({
          agent: AgentType.ANALYST,
          task: 'research-prompt',
          input: { topic: request }
        });
        break;
        
      case 'planning':
        tasks.push({
          agent: AgentType.PM,
          task: 'create-prd',
          input: { projectName: 'New Project', requirements: request }
        });
        break;
        
      case 'architecture':
        tasks.push({
          agent: AgentType.ARCHITECT,
          task: 'create-full-stack-architecture',
          input: { projectName: 'New Project', requirements: [request] }
        });
        break;
    }
    
    return tasks;
  }

  _identifyParallelTasks(analysis) {
    return analysis.dependencies.includes('sequential-execution') ? [] : 
           analysis.suggestedAgents.filter(a => a !== this._selectPrimaryAgent(analysis));
  }

  async _executeTasks(tasks) {
    const results = [];
    
    for (const task of tasks) {
      const result = await this._delegateTask({
        agentType: task.agent,
        task: task.task,
        taskInput: task.input
      });
      results.push(result);
    }
    
    return {
      tasks: results,
      summary: `Executed ${tasks.length} tasks`
    };
  }

  async _updateWorkflowPhase(workflowId, phaseIndex, status) {
    const workflow = this.activeWorkflows.get(workflowId);
    if (workflow) {
      workflow.data.phases[phaseIndex].status = status;
      await this.contextManager.updateContext(
        ContextLevel.PROJECT,
        workflowId,
        { phases: workflow.data.phases }
      );
    }
  }

  _calculateWorkflowProgress(workflow) {
    const phases = workflow.data.phases || [];
    const completed = phases.filter(p => p.status === 'completed').length;
    return Math.round((completed / phases.length) * 100);
  }

  async _gatherMetrics() {
    const metrics = {
      agents: {},
      system: {
        uptime: Date.now() - this.startTime,
        totalTasks: this.state.completedTasks + this.state.failedTasks,
        successRate: this.state.completedTasks / (this.state.completedTasks + this.state.failedTasks)
      }
    };
    
    for (const [type, agent] of this.agents) {
      metrics.agents[type] = await agent.getMetrics();
    }
    
    return metrics;
  }

  _generateTaskId() {
    return `TASK-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  }

  _getTaskPriority(priority) {
    const priorities = {
      critical: 1,
      high: 2,
      medium: 3,
      low: 4
    };
    return priorities[priority] || 3;
  }

  // Public methods for external control
  async startWorkflow(workflowId, input) {
    return await this.execute({
      taskId: this._generateTaskId(),
      taskType: 'execute-workflow',
      input: { workflowId, input }
    });
  }

  async routeRequest(request, context = {}) {
    return await this.execute({
      taskId: this._generateTaskId(),
      taskType: 'analyze-request',
      input: { request, context }
    });
  }

  async getStatus() {
    return await this.execute({
      taskId: this._generateTaskId(),
      taskType: 'monitor-progress',
      input: { includeMetrics: true }
    });
  }

  // Pattern execution methods
  async _executeWithPattern(input) {
    const { tasks, patternName, analysis, options = {} } = input;
    
    // Select pattern
    let pattern;
    if (patternName && this.patterns.has(patternName)) {
      pattern = this.patterns.get(patternName);
    } else {
      pattern = await this._selectPattern(analysis || this._analyzeTasks(tasks));
    }
    
    this.logger.info('Executing with pattern', {
      pattern: pattern.config.name,
      taskCount: tasks.length
    });
    
    const startTime = Date.now();
    
    try {
      // Execute pattern
      const result = await pattern.execute(tasks, options);
      
      // Update pattern metrics
      const executionTime = Date.now() - startTime;
      this._updatePatternMetrics(pattern.config.name, true, executionTime);
      
      return {
        pattern: pattern.config.name,
        result,
        executionTime,
        metrics: pattern.getMetrics()
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this._updatePatternMetrics(pattern.config.name, false, executionTime);
      
      throw error;
    }
  }

  async _selectPattern(analysis) {
    // Try each pattern's canHandle method
    for (const [name, pattern] of this.patterns) {
      if (pattern.canHandle(analysis)) {
        this.logger.info('Pattern selected', { pattern: name, analysis });
        return pattern;
      }
    }
    
    // Use default pattern
    const defaultPattern = this.patterns.get(this.defaultPattern);
    this.logger.info('Using default pattern', { pattern: this.defaultPattern });
    return defaultPattern;
  }

  _analyzeTasks(tasks) {
    const analysis = {
      tasksCount: tasks.length,
      parallelizable: this._areTasksParallelizable(tasks),
      uniformComplexity: this._hasUniformComplexity(tasks),
      taskTypes: Array.from(new Set(tasks.map(t => t.type))),
      isSequential: this._areTasksSequential(tasks),
      hasDataFlow: this._hasDataFlow(tasks),
      requiresTransformation: tasks.some(t => t.transform),
      requiresSpecialization: tasks.some(t => t.requiredCapabilities?.length > 1),
      hasContentBasedRouting: tasks.some(t => t.routingRules),
      dependencies: this._analyzeTaskDependencies(tasks)
    };
    
    return analysis;
  }

  _areTasksParallelizable(tasks) {
    // Check if tasks have dependencies on each other
    for (const task of tasks) {
      if (task.dependsOn && task.dependsOn.length > 0) {
        return false;
      }
    }
    return tasks.length > 1;
  }

  _hasUniformComplexity(request) {
    if (typeof request === 'string') {
      // Simple heuristic for request string
      return !request.match(/and|also|plus|then|after/gi);
    }
    
    if (Array.isArray(request)) {
      // For task array, check if all have similar properties
      const complexities = request.map(t => t.complexity || 'medium');
      return new Set(complexities).size === 1;
    }
    
    return true;
  }

  _areTasksSequential(tasks) {
    // Check if each task depends on the previous one
    for (let i = 1; i < tasks.length; i++) {
      if (!tasks[i].dependsOn || !tasks[i].dependsOn.includes(tasks[i-1].id)) {
        return false;
      }
    }
    return tasks.length > 1;
  }

  _hasDataFlow(tasks) {
    // Check if tasks pass data to each other
    return tasks.some(t => t.inputFrom || t.outputTo || t.transform);
  }

  _analyzeTaskDependencies(tasks) {
    const deps = [];
    
    for (const task of tasks) {
      if (task.dependsOn) {
        deps.push('task-dependency');
      }
      if (task.after || task.before) {
        deps.push('temporal-dependency');
      }
      if (task.inputFrom) {
        deps.push('data-dependency');
      }
    }
    
    return Array.from(new Set(deps));
  }

  _identifyParallelizable(request) {
    return !request.match(/after|then|following|sequentially/i) &&
           request.match(/simultaneously|parallel|concurrently/i);
  }

  _identifyTaskTypes(request) {
    const types = [];
    const typePatterns = {
      research: /research|analyze|investigate/i,
      development: /implement|code|build/i,
      testing: /test|verify|validate/i,
      deployment: /deploy|release/i,
      monitoring: /monitor|observe/i
    };
    
    for (const [type, pattern] of Object.entries(typePatterns)) {
      if (request.match(pattern)) {
        types.push(type);
      }
    }
    
    return types;
  }

  _updatePatternMetrics(patternName, success, executionTime) {
    const metrics = this.patternMetrics.get(patternName);
    if (!metrics) return;
    
    metrics.usage++;
    if (success) {
      const successCount = metrics.usage * metrics.successRate;
      metrics.successRate = (successCount + 1) / metrics.usage;
    } else {
      const successCount = metrics.usage * metrics.successRate;
      metrics.successRate = successCount / metrics.usage;
    }
    
    // Update average execution time
    const totalTime = metrics.averageExecutionTime * (metrics.usage - 1) + executionTime;
    metrics.averageExecutionTime = totalTime / metrics.usage;
  }

  // Public pattern methods
  async executeWithPattern(tasks, patternName = null, options = {}) {
    return await this.execute({
      taskId: this._generateTaskId(),
      taskType: 'execute-pattern',
      input: { tasks, patternName, options }
    });
  }

  getPatternInfo() {
    const info = [];
    
    for (const [name, pattern] of this.patterns) {
      const metrics = this.patternMetrics.get(name);
      info.push({
        name,
        description: pattern.config.description,
        metrics: {
          ...metrics,
          patternSpecific: pattern.getMetrics()
        }
      });
    }
    
    return info;
  }
}