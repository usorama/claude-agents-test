import { ContextManager } from '../context/ContextManager.js';
import { AnalystAgent } from '../agents/AnalystAgent.js';
import winston from 'winston';

export class SimpleOrchestrator {
  constructor(config = {}) {
    this.agents = new Map();
    this.contextManager = new ContextManager(config.contextManager);
    this.startTime = Date.now();
    
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.File({ filename: 'poc-orchestrator.log' }),
        new winston.transports.Console()
      ]
    });
  }

  async initialize() {
    this.logger.info('Orchestrator initializing');
    await this.contextManager.initialize();
    
    // Initialize analyst agent
    const analyst = new AnalystAgent({ contextManager: this.contextManager });
    await analyst.initialize();
    this.agents.set('analyst', analyst);
    
    this.logger.info('Orchestrator initialized', { agents: Array.from(this.agents.keys()) });
  }

  async executeWorkflow(workflow) {
    const workflowStart = Date.now();
    const results = [];
    
    this.logger.info('Starting workflow', { workflow: workflow.name });
    
    try {
      for (const step of workflow.steps) {
        const stepStart = Date.now();
        this.logger.info('Executing step', { 
          step: step.name, 
          agent: step.agent, 
          task: step.task 
        });
        
        const agent = this.agents.get(step.agent);
        if (!agent) {
          throw new Error(`Agent not found: ${step.agent}`);
        }
        
        const result = await agent.execute(step.task, step.input);
        results.push({
          step: step.name,
          agent: step.agent,
          task: step.task,
          result,
          duration: Date.now() - stepStart
        });
        
        // Pass output to next step if configured
        if (step.outputTo && workflow.steps.find(s => s.name === step.outputTo)) {
          const nextStep = workflow.steps.find(s => s.name === step.outputTo);
          nextStep.input = { ...nextStep.input, previousResult: result };
        }
      }
      
      const duration = Date.now() - workflowStart;
      this.logger.info('Workflow completed', { 
        workflow: workflow.name, 
        duration,
        steps: results.length 
      });
      
      return {
        success: true,
        workflow: workflow.name,
        results,
        duration,
        metrics: await this.getMetrics()
      };
    } catch (error) {
      this.logger.error('Workflow failed', { 
        workflow: workflow.name, 
        error: error.message 
      });
      throw error;
    }
  }

  async getMetrics() {
    const metrics = {
      orchestrator: {
        uptime: Date.now() - this.startTime,
        agents: this.agents.size
      },
      agents: {},
      context: await this.contextManager.getMetrics()
    };
    
    for (const [name, agent] of this.agents) {
      metrics.agents[name] = agent.getMetrics();
    }
    
    return metrics;
  }
}