import { WorkflowPattern } from './WorkflowPattern.js';

/**
 * Pipeline Pattern
 * Sequential processing through agent chain with data transformation
 */
export class PipelinePattern extends WorkflowPattern {
  constructor(orchestrator, config = {}) {
    super(orchestrator, {
      name: 'Pipeline',
      description: 'Sequential processing through agent chain',
      allowBranching: true,
      allowSkipping: true,
      transformationStrategy: 'merge', // 'merge', 'replace', 'append'
      errorHandling: 'stop', // 'stop', 'continue', 'skip-stage'
      ...config
    });
    
    this.pipelineDefinitions = new Map();
    this.executionHistory = [];
    this.setupDefaultPipelines();
  }

  /**
   * Set up default pipeline definitions
   */
  setupDefaultPipelines() {
    // Research to Implementation Pipeline
    this.definePipeline('research-to-implementation', {
      stages: [
        {
          name: 'research',
          agent: 'ANALYST',
          task: 'research-prompt',
          transform: {
            outputKey: 'researchFindings',
            passThrough: ['topic', 'context']
          }
        },
        {
          name: 'planning',
          agent: 'PM',
          task: 'create-prd',
          requiredInput: ['researchFindings'],
          transform: {
            outputKey: 'productRequirements',
            merge: ['researchFindings']
          }
        },
        {
          name: 'architecture',
          agent: 'ARCHITECT',
          task: 'create-architecture',
          requiredInput: ['productRequirements'],
          transform: {
            outputKey: 'systemDesign',
            merge: ['productRequirements']
          }
        },
        {
          name: 'implementation',
          agent: 'DEVELOPER',
          task: 'implement-feature',
          requiredInput: ['systemDesign'],
          skipCondition: (data) => data.complexity === 'trivial',
          branches: [
            {
              condition: (data) => data.requiresTesting,
              stage: {
                name: 'testing',
                agent: 'QA',
                task: 'test-implementation'
              }
            }
          ]
        }
      ]
    });

    // Code Review Pipeline
    this.definePipeline('code-review', {
      stages: [
        {
          name: 'static-analysis',
          agent: 'QA',
          task: 'static-analysis',
          transform: {
            outputKey: 'staticAnalysisResults'
          }
        },
        {
          name: 'security-review',
          agent: 'DEVELOPER',
          task: 'security-review',
          requiredInput: ['staticAnalysisResults'],
          skipCondition: (data) => !data.hasSecurityConcerns,
          transform: {
            outputKey: 'securityReview',
            merge: ['staticAnalysisResults']
          }
        },
        {
          name: 'performance-review',
          agent: 'ARCHITECT',
          task: 'performance-review',
          transform: {
            outputKey: 'performanceReview'
          }
        },
        {
          name: 'final-approval',
          agent: 'PM',
          task: 'review-approval',
          requiredInput: ['staticAnalysisResults', 'securityReview', 'performanceReview'],
          transform: {
            outputKey: 'approvalStatus',
            aggregate: true
          }
        }
      ]
    });
  }

  /**
   * Define a custom pipeline
   */
  definePipeline(name, definition) {
    this.pipelineDefinitions.set(name, {
      name,
      ...definition,
      stageMap: new Map(definition.stages.map((s, i) => [s.name, i]))
    });
  }

  /**
   * Check if this pattern can handle the task analysis
   */
  canHandle(taskAnalysis) {
    return taskAnalysis.isSequential ||
           taskAnalysis.hasDataFlow ||
           taskAnalysis.requiresTransformation ||
           (taskAnalysis.dependencies?.includes('data-dependency') && 
            !taskAnalysis.parallelizable);
  }

  /**
   * Execute tasks using pipeline pattern
   */
  async execute(tasks, options = {}) {
    const executionContext = await this.beforeExecute(tasks, options);
    
    try {
      // Determine pipeline to use
      const pipeline = this.selectPipeline(tasks, options);
      if (!pipeline) {
        throw new Error('No suitable pipeline found for tasks');
      }
      
      this.logger.info(`Executing pipeline: ${pipeline.name}`, {
        stages: pipeline.stages.length,
        branching: pipeline.allowBranching || this.config.allowBranching
      });
      
      // Initialize pipeline data
      let pipelineData = {
        ...options.initialData,
        _pipeline: {
          name: pipeline.name,
          executionId: this.generateExecutionId(),
          startTime: Date.now(),
          stages: []
        }
      };
      
      // Execute pipeline stages
      const result = await this.executePipeline(pipeline, pipelineData, options);
      
      await this.afterExecute(executionContext, result);
      return result;
      
    } catch (error) {
      await this.afterExecute(executionContext, null, error);
      throw error;
    }
  }

  /**
   * Select appropriate pipeline for tasks
   */
  selectPipeline(tasks, options) {
    // If pipeline name is specified, use it
    if (options.pipelineName) {
      return this.pipelineDefinitions.get(options.pipelineName);
    }
    
    // Otherwise, try to match based on task characteristics
    if (tasks.length === 0) return null;
    
    // Check if tasks match any pipeline stages
    for (const [name, pipeline] of this.pipelineDefinitions) {
      if (this.tasksMatchPipeline(tasks, pipeline)) {
        return pipeline;
      }
    }
    
    // Create ad-hoc pipeline from tasks
    return this.createAdHocPipeline(tasks);
  }

  /**
   * Check if tasks match pipeline stages
   */
  tasksMatchPipeline(tasks, pipeline) {
    if (tasks.length !== pipeline.stages.length) return false;
    
    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      const stage = pipeline.stages[i];
      
      if (task.agent && task.agent !== stage.agent) return false;
      if (task.type && task.type !== stage.task) return false;
    }
    
    return true;
  }

  /**
   * Create ad-hoc pipeline from tasks
   */
  createAdHocPipeline(tasks) {
    const stages = tasks.map((task, index) => ({
      name: task.name || `stage-${index}`,
      agent: task.agent || this.selectAgentForTask(task),
      task: task.type,
      input: task.input,
      transform: {
        outputKey: `stage${index}Output`,
        passThrough: index > 0 ? [`stage${index - 1}Output`] : []
      }
    }));
    
    return {
      name: 'ad-hoc',
      stages,
      stageMap: new Map(stages.map((s, i) => [s.name, i]))
    };
  }

  /**
   * Execute a pipeline
   */
  async executePipeline(pipeline, initialData, options) {
    const pipelineExecution = {
      pipeline: pipeline.name,
      executionId: initialData._pipeline.executionId,
      stages: [],
      data: { ...initialData },
      success: true
    };
    
    // Execute each stage
    for (let i = 0; i < pipeline.stages.length; i++) {
      const stage = pipeline.stages[i];
      
      // Check skip conditions
      if (this.shouldSkipStage(stage, pipelineExecution.data)) {
        this.logger.info(`Skipping stage: ${stage.name}`, {
          reason: 'skip condition met'
        });
        
        pipelineExecution.stages.push({
          name: stage.name,
          skipped: true,
          reason: 'condition'
        });
        continue;
      }
      
      // Check required inputs
      if (!this.hasRequiredInputs(stage, pipelineExecution.data)) {
        if (this.config.errorHandling === 'skip-stage') {
          pipelineExecution.stages.push({
            name: stage.name,
            skipped: true,
            reason: 'missing inputs'
          });
          continue;
        } else {
          throw new Error(`Missing required inputs for stage: ${stage.name}`);
        }
      }
      
      // Execute stage
      try {
        const stageResult = await this.executeStage(
          stage, 
          pipelineExecution.data, 
          options
        );
        
        // Transform and merge data
        pipelineExecution.data = this.transformStageData(
          stage,
          pipelineExecution.data,
          stageResult
        );
        
        pipelineExecution.stages.push({
          name: stage.name,
          success: true,
          result: stageResult,
          executionTime: stageResult.executionTime
        });
        
        // Handle branching
        if (stage.branches && this.config.allowBranching) {
          await this.handleBranches(
            stage.branches,
            pipelineExecution,
            options
          );
        }
        
      } catch (error) {
        pipelineExecution.stages.push({
          name: stage.name,
          success: false,
          error: error.message
        });
        
        if (this.config.errorHandling === 'stop') {
          pipelineExecution.success = false;
          pipelineExecution.error = `Stage '${stage.name}' failed: ${error.message}`;
          break;
        } else if (this.config.errorHandling === 'skip-stage') {
          this.logger.warn(`Stage failed, skipping: ${stage.name}`, { error: error.message });
          continue;
        }
        // 'continue' - log and continue to next stage
      }
    }
    
    // Add execution metadata
    pipelineExecution.data._pipeline.endTime = Date.now();
    pipelineExecution.data._pipeline.duration = 
      pipelineExecution.data._pipeline.endTime - pipelineExecution.data._pipeline.startTime;
    pipelineExecution.data._pipeline.stages = pipelineExecution.stages;
    
    // Store execution history
    this.executionHistory.push({
      executionId: pipelineExecution.executionId,
      pipeline: pipeline.name,
      timestamp: new Date().toISOString(),
      success: pipelineExecution.success,
      duration: pipelineExecution.data._pipeline.duration
    });
    
    return pipelineExecution;
  }

  /**
   * Execute a single pipeline stage
   */
  async executeStage(stage, pipelineData, options) {
    const agent = this.getAgent(stage.agent);
    
    // Prepare stage input
    const stageInput = this.prepareStageInput(stage, pipelineData);
    
    const startTime = Date.now();
    const result = await this.executeTask(
      {
        id: `${pipelineData._pipeline.executionId}-${stage.name}`,
        type: stage.task,
        input: stageInput
      },
      agent,
      options
    );
    
    result.executionTime = Date.now() - startTime;
    return result;
  }

  /**
   * Check if stage should be skipped
   */
  shouldSkipStage(stage, pipelineData) {
    if (!this.config.allowSkipping || !stage.skipCondition) {
      return false;
    }
    
    try {
      return stage.skipCondition(pipelineData);
    } catch (error) {
      this.logger.warn(`Error evaluating skip condition for stage: ${stage.name}`, { error });
      return false;
    }
  }

  /**
   * Check if stage has required inputs
   */
  hasRequiredInputs(stage, pipelineData) {
    if (!stage.requiredInput || stage.requiredInput.length === 0) {
      return true;
    }
    
    for (const required of stage.requiredInput) {
      if (!this.getNestedValue(pipelineData, required)) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Prepare input for a stage
   */
  prepareStageInput(stage, pipelineData) {
    const input = { ...stage.input };
    
    // Add required inputs
    if (stage.requiredInput) {
      for (const required of stage.requiredInput) {
        input[required] = this.getNestedValue(pipelineData, required);
      }
    }
    
    // Add pass-through data
    if (stage.transform?.passThrough) {
      for (const key of stage.transform.passThrough) {
        input[key] = this.getNestedValue(pipelineData, key);
      }
    }
    
    // Add full pipeline context if needed
    if (stage.includePipelineContext) {
      input._pipelineContext = { ...pipelineData };
    }
    
    return input;
  }

  /**
   * Transform stage data based on configuration
   */
  transformStageData(stage, currentData, stageResult) {
    const transform = stage.transform || {};
    let newData = { ...currentData };
    
    switch (this.config.transformationStrategy) {
      case 'replace':
        // Replace with stage output
        newData = { ...stageResult.result };
        break;
        
      case 'append':
        // Append stage output
        if (transform.outputKey) {
          newData[transform.outputKey] = stageResult.result;
        }
        break;
        
      case 'merge':
      default:
        // Merge stage output
        if (transform.outputKey) {
          newData[transform.outputKey] = stageResult.result;
        }
        
        // Merge specified keys
        if (transform.merge) {
          for (const key of transform.merge) {
            const value = this.getNestedValue(stageResult.result, key);
            if (value !== undefined) {
              newData[key] = value;
            }
          }
        }
        
        // Aggregate if specified
        if (transform.aggregate) {
          newData._aggregated = newData._aggregated || {};
          newData._aggregated[stage.name] = stageResult.result;
        }
    }
    
    return newData;
  }

  /**
   * Handle conditional branches
   */
  async handleBranches(branches, pipelineExecution, options) {
    for (const branch of branches) {
      try {
        if (branch.condition(pipelineExecution.data)) {
          this.logger.info(`Executing branch: ${branch.stage.name}`);
          
          const branchResult = await this.executeStage(
            branch.stage,
            pipelineExecution.data,
            options
          );
          
          pipelineExecution.data = this.transformStageData(
            branch.stage,
            pipelineExecution.data,
            branchResult
          );
          
          pipelineExecution.stages.push({
            name: branch.stage.name,
            branch: true,
            success: true,
            result: branchResult
          });
        }
      } catch (error) {
        this.logger.warn(`Branch execution failed: ${branch.stage.name}`, { error });
        
        pipelineExecution.stages.push({
          name: branch.stage.name,
          branch: true,
          success: false,
          error: error.message
        });
        
        if (this.config.errorHandling === 'stop') {
          throw error;
        }
      }
    }
  }

  /**
   * Get nested value from object
   */
  getNestedValue(obj, path) {
    const parts = path.split('.');
    let current = obj;
    
    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return undefined;
      }
    }
    
    return current;
  }

  /**
   * Get pipeline execution history
   */
  getExecutionHistory(limit = 10) {
    return this.executionHistory.slice(-limit);
  }

  /**
   * Get pattern-specific metrics
   */
  getMetrics() {
    const baseMetrics = super.getMetrics();
    
    // Calculate pipeline-specific metrics
    const pipelineMetrics = {};
    for (const [name, pipeline] of this.pipelineDefinitions) {
      const executions = this.executionHistory.filter(e => e.pipeline === name);
      if (executions.length > 0) {
        const successfulExecutions = executions.filter(e => e.success);
        const totalDuration = executions.reduce((sum, e) => sum + e.duration, 0);
        
        pipelineMetrics[name] = {
          executions: executions.length,
          successRate: successfulExecutions.length / executions.length,
          averageDuration: totalDuration / executions.length,
          stages: pipeline.stages.length
        };
      }
    }
    
    return {
      ...baseMetrics,
      patternSpecificMetrics: {
        pipelines: pipelineMetrics,
        totalPipelines: this.pipelineDefinitions.size,
        recentExecutions: this.getExecutionHistory(5)
      }
    };
  }

  /**
   * Get pattern configuration schema
   */
  getConfigSchema() {
    return {
      ...super.getConfigSchema(),
      allowBranching: { type: 'boolean' },
      allowSkipping: { type: 'boolean' },
      transformationStrategy: { 
        type: 'string', 
        enum: ['merge', 'replace', 'append'] 
      },
      errorHandling: { 
        type: 'string', 
        enum: ['stop', 'continue', 'skip-stage'] 
      }
    };
  }
}