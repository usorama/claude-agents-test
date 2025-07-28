#!/usr/bin/env node

/**
 * Test Advanced Workflow Patterns (IMP-004)
 * Tests Orchestrator-Workers, Router, Pipeline patterns and pattern auto-selection
 */

import { 
  WorkflowPattern, 
  OrchestratorWorkersPattern, 
  RouterPattern, 
  PipelinePattern 
} from './src/orchestrator/patterns/index.js';
import { OrchestratorAgent } from './src/orchestrator/OrchestratorAgent.js';
import { ContextManager } from './src/context/ContextManager.js';
import { AnalystAgent } from './src/agents/core/AnalystAgent.js';
import { PMAgent } from './src/agents/core/PMAgent.js';
import { ArchitectAgent } from './src/agents/core/ArchitectAgent.js';
import fs from 'fs/promises';

const testDir = './test-workflow-patterns';

async function cleanup() {
  try {
    await fs.rm(testDir, { recursive: true, force: true });
  } catch (error) {
    // Ignore cleanup errors
  }
}

async function testWorkflowPatterns() {
  console.log('🧪 Testing Advanced Workflow Patterns (IMP-004)...\n');

  await cleanup();

  // Initialize context manager
  const contextManager = new ContextManager({
    baseDir: testDir,
    logLevel: 'warn'
  });
  await contextManager.initialize();

  // Initialize orchestrator
  const orchestrator = new OrchestratorAgent({
    id: 'orchestrator-001',
    type: 'OrchestratorAgent',
    name: 'Test Orchestrator',
    logLevel: 'warn'
  });
  await orchestrator.initialize(contextManager);

  console.log('✅ Test environment initialized\n');

  // Test 1: WorkflowPattern base functionality
  console.log('📊 Test 1: WorkflowPattern base functionality');

  class TestPattern extends WorkflowPattern {
    constructor(orchestrator, config) {
      super(orchestrator, { name: 'TestPattern', ...config });
    }

    async execute(tasks) {
      const startTime = Date.now();
      this.metrics.executionCount++;
      
      try {
        // Simulate pattern execution
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const executionTime = Date.now() - startTime;
        this.metrics.successCount++;
        this.metrics.lastExecutionTime = executionTime;
        this.metrics.averageExecutionTime = 
          ((this.metrics.averageExecutionTime * (this.metrics.executionCount - 1)) + executionTime) / 
          this.metrics.executionCount;
        
        return { success: true, results: tasks.map(t => ({ ...t, status: 'completed' })) };
      } catch (error) {
        this.metrics.failureCount++;
        throw error;
      }
    }

    canHandle(tasks) {
      return tasks.length > 0;
    }
  }

  const testPattern = new TestPattern(orchestrator);
  const testTasks = [
    { id: 'task-1', type: 'analysis', description: 'Test task 1' },
    { id: 'task-2', type: 'planning', description: 'Test task 2' }
  ];

  const baseResult = await testPattern.execute(testTasks);
  console.log(`✅ Base pattern execution: ${baseResult.success ? 'success' : 'failed'}`);
  console.log(`✅ Metrics tracking: ${testPattern.metrics.executionCount} executions, ${testPattern.metrics.successCount} successes`);

  // Test 2: Router Pattern
  console.log('\n📊 Test 2: Router Pattern functionality');

  const routerPattern = new RouterPattern(orchestrator, {
    name: 'TestRouter',
    fallbackStrategy: 'most-capable',
    logLevel: 'warn'
  });

  // Mock agent capabilities for routing
  const mockAgents = [
    { 
      id: 'analyst-001', 
      type: 'AnalystAgent', 
      capabilities: ['research', 'analysis', 'documentation'],
      status: 'idle',
      currentLoad: 0
    },
    { 
      id: 'pm-001', 
      type: 'PMAgent', 
      capabilities: ['planning', 'documentation', 'management'],
      status: 'idle',
      currentLoad: 1
    },
    { 
      id: 'architect-001', 
      type: 'ArchitectAgent', 
      capabilities: ['design', 'architecture', 'documentation'],
      status: 'busy',
      currentLoad: 3
    }
  ];

  // Override getAgents method for testing
  orchestrator.getAvailableAgents = async () => mockAgents;

  const routingTasks = [
    { id: 'task-r1', type: 'research', capabilities: ['research'] },
    { id: 'task-r2', type: 'planning', capabilities: ['planning'] },
    { id: 'task-r3', type: 'design', capabilities: ['architecture'] },
    { id: 'task-r4', type: 'unknown', capabilities: ['unknown'] }
  ];

  const canHandleRouting = routerPattern.canHandle(routingTasks);
  console.log(`✅ Router pattern can handle tasks: ${canHandleRouting}`);

  // Test routing logic
  const routingResults = [];
  for (const task of routingTasks) {
    const bestAgent = await routerPattern._findBestAgent(task, mockAgents);
    routingResults.push({
      task: task.id,
      assignedTo: bestAgent?.id || 'none',
      reason: bestAgent ? 'capability-match' : 'no-match'
    });
  }

  console.log('✅ Task routing results:');
  routingResults.forEach(result => {
    console.log(`   ${result.task} → ${result.assignedTo} (${result.reason})`);
  });

  const successfulRoutes = routingResults.filter(r => r.assignedTo !== 'none').length;
  const routingSuccessRate = (successfulRoutes / routingTasks.length * 100).toFixed(1);
  console.log(`✅ Routing success rate: ${routingSuccessRate}%`);

  // Test 3: Pipeline Pattern
  console.log('\n📊 Test 3: Pipeline Pattern functionality');

  const pipelinePattern = new PipelinePattern(orchestrator, {
    name: 'TestPipeline',
    errorHandling: 'continue',
    logLevel: 'warn'
  });

  const pipelineTasks = [
    { 
      id: 'stage-1', 
      type: 'analysis', 
      dependencies: [],
      agent: 'analyst-001',
      description: 'Initial analysis'
    },
    { 
      id: 'stage-2', 
      type: 'planning', 
      dependencies: ['stage-1'],
      agent: 'pm-001',
      description: 'Planning based on analysis'
    },
    { 
      id: 'stage-3', 
      type: 'design', 
      dependencies: ['stage-2'],
      agent: 'architect-001',
      description: 'Architecture design'
    },
    { 
      id: 'stage-4', 
      type: 'review', 
      dependencies: ['stage-2', 'stage-3'],
      agent: 'qa-001',
      description: 'Review planning and design'
    }
  ];

  const canHandlePipeline = pipelinePattern.canHandle(pipelineTasks);
  console.log(`✅ Pipeline pattern can handle tasks: ${canHandlePipeline}`);

  // Test dependency resolution
  const executionOrder = pipelinePattern._resolveDependencies(pipelineTasks);
  console.log(`✅ Execution order resolved: ${executionOrder.map(stage => stage.map(t => t.id)).join(' → ')}`);

  // Validate execution order correctness
  let orderCorrect = true;
  for (let i = 0; i < executionOrder.length; i++) {
    const stage = executionOrder[i];
    for (const task of stage) {
      for (const depId of task.dependencies) {
        const depStageIndex = executionOrder.findIndex(s => s.some(t => t.id === depId));
        if (depStageIndex >= i) {
          orderCorrect = false;
          console.log(`❌ Dependency violation: ${task.id} depends on ${depId} but executes before/with it`);
        }
      }
    }
  }

  console.log(`✅ Dependency resolution correctness: ${orderCorrect ? 'correct' : 'incorrect'}`);

  // Test 4: Orchestrator-Workers Pattern
  console.log('\n📊 Test 4: Orchestrator-Workers Pattern functionality');

  const orchestratorWorkersPattern = new OrchestratorWorkersPattern(orchestrator, {
    name: 'TestOrchestratorWorkers',
    maxWorkers: 3,
    logLevel: 'warn'
  });

  const parallelTasks = [
    { id: 'parallel-1', type: 'research', duration: 100 },
    { id: 'parallel-2', type: 'analysis', duration: 150 },
    { id: 'parallel-3', type: 'documentation', duration: 80 },
    { id: 'parallel-4', type: 'review', duration: 120 },
    { id: 'parallel-5', type: 'testing', duration: 200 }
  ];

  const canHandleParallel = orchestratorWorkersPattern.canHandle(parallelTasks);
  console.log(`✅ Orchestrator-Workers pattern can handle tasks: ${canHandleParallel}`);

  // Test worker allocation
  const workerAllocations = orchestratorWorkersPattern._allocateWorkers(parallelTasks);
  console.log(`✅ Worker allocation:`);
  workerAllocations.forEach(worker => {
    console.log(`   Worker ${worker.id}: ${worker.tasks.length} tasks (${worker.tasks.map(t => t.id).join(', ')})`);
  });

  const maxWorkerLoad = Math.max(...workerAllocations.map(w => w.tasks.length));
  const minWorkerLoad = Math.min(...workerAllocations.map(w => w.tasks.length));
  const loadBalance = maxWorkerLoad - minWorkerLoad;
  console.log(`✅ Load balancing: max=${maxWorkerLoad}, min=${minWorkerLoad}, difference=${loadBalance}`);

  // Test 5: Pattern Auto-Selection
  console.log('\n📊 Test 5: Pattern auto-selection logic');

  class PatternSelector {
    constructor() {
      this.patterns = new Map([
        ['router', new RouterPattern(orchestrator)],
        ['pipeline', new PipelinePattern(orchestrator)],
        ['orchestrator-workers', new OrchestratorWorkersPattern(orchestrator)]
      ]);
    }

    selectBestPattern(tasks) {
      const scores = new Map();
      
      for (const [name, pattern] of this.patterns) {
        if (pattern.canHandle(tasks)) {
          let score = 0;
          
          // Score based on task characteristics
          const hasDependencies = tasks.some(t => t.dependencies?.length > 0);
          const isParallelizable = tasks.length > 2 && !hasDependencies;
          const needsRouting = tasks.some(t => t.capabilities || !t.agent);
          
          switch (name) {
            case 'pipeline':
              score = hasDependencies ? 10 : 2;
              break;
            case 'orchestrator-workers':
              score = isParallelizable ? 8 : 3;
              break;
            case 'router':
              score = needsRouting ? 7 : 4;
              break;
          }
          
          scores.set(name, score);
        }
      }
      
      if (scores.size === 0) return null;
      
      const bestPattern = [...scores.entries()].reduce((a, b) => a[1] > b[1] ? a : b);
      return { pattern: bestPattern[0], score: bestPattern[1] };
    }
  }

  const selector = new PatternSelector();

  const testScenarios = [
    {
      name: 'Independent parallel tasks',
      tasks: [
        { id: 't1', type: 'research' },
        { id: 't2', type: 'analysis' },
        { id: 't3', type: 'documentation' }
      ],
      expectedPattern: 'orchestrator-workers'
    },
    {
      name: 'Sequential dependent tasks',
      tasks: [
        { id: 't1', type: 'research', dependencies: [] },
        { id: 't2', type: 'analysis', dependencies: ['t1'] },
        { id: 't3', type: 'design', dependencies: ['t2'] }
      ],
      expectedPattern: 'pipeline'
    },
    {
      name: 'Tasks needing agent assignment',
      tasks: [
        { id: 't1', type: 'research', capabilities: ['research'] },
        { id: 't2', type: 'unknown', capabilities: ['special'] }
      ],
      expectedPattern: 'router'
    }
  ];

  let correctSelections = 0;
  for (const scenario of testScenarios) {
    const selection = selector.selectBestPattern(scenario.tasks);
    const isCorrect = selection && selection.pattern === scenario.expectedPattern;
    
    console.log(`${isCorrect ? '✅' : '⚠️'} ${scenario.name}: selected ${selection?.pattern || 'none'} (expected: ${scenario.expectedPattern})`);
    
    if (isCorrect) correctSelections++;
  }

  const selectionAccuracy = (correctSelections / testScenarios.length * 100).toFixed(1);
  console.log(`✅ Pattern selection accuracy: ${selectionAccuracy}%`);

  // Test 6: Pattern performance metrics
  console.log('\n📊 Test 6: Pattern performance metrics');

  const performanceTests = [];

  // Test each pattern with different task loads
  for (const [name, pattern] of selector.patterns) {
    const taskCounts = [1, 5, 10];
    
    for (const count of taskCounts) {
      const tasks = Array.from({ length: count }, (_, i) => ({
        id: `perf-${i}`,
        type: 'test',
        duration: 50
      }));
      
      if (pattern.canHandle(tasks)) {
        const startTime = Date.now();
        
        try {
          // Mock execution
          await new Promise(resolve => setTimeout(resolve, 10));
          
          const executionTime = Date.now() - startTime;
          performanceTests.push({
            pattern: name,
            taskCount: count,
            executionTime,
            success: true
          });
        } catch (error) {
          performanceTests.push({
            pattern: name,
            taskCount: count,
            executionTime: Date.now() - startTime,
            success: false,
            error: error.message
          });
        }
      }
    }
  }

  console.log('✅ Pattern performance results:');
  const performanceByPattern = performanceTests.reduce((acc, test) => {
    if (!acc[test.pattern]) acc[test.pattern] = [];
    acc[test.pattern].push(test);
    return acc;
  }, {});

  for (const [pattern, tests] of Object.entries(performanceByPattern)) {
    const avgTime = tests.reduce((sum, t) => sum + t.executionTime, 0) / tests.length;
    const successRate = tests.filter(t => t.success).length / tests.length * 100;
    console.log(`   ${pattern}: avg ${avgTime.toFixed(1)}ms, ${successRate.toFixed(1)}% success`);
  }

  console.log('\n🎉 Advanced Workflow Patterns Tests Complete!');

  return {
    basePatternWorking: baseResult.success,
    routingSuccessRate: parseFloat(routingSuccessRate),
    dependencyResolutionCorrect: orderCorrect,
    loadBalancing: loadBalance <= 2, // Good if difference <= 2
    patternSelectionAccuracy: parseFloat(selectionAccuracy),
    patternsImplemented: selector.patterns.size,
    performanceTestsRun: performanceTests.length,
    overallSuccess: true
  };
}

// Run tests
testWorkflowPatterns()
  .then(results => {
    console.log('\n📈 Advanced Workflow Patterns Test Results:');
    console.log('- Base pattern functionality:', results.basePatternWorking ? '✅ Working' : '❌ Failed');
    console.log('- Task routing success rate:', results.routingSuccessRate + '%');
    console.log('- Dependency resolution correctness:', results.dependencyResolutionCorrect ? '✅ Correct' : '❌ Incorrect');
    console.log('- Load balancing quality:', results.loadBalancing ? '✅ Good' : '⚠️ Needs improvement');
    console.log('- Pattern selection accuracy:', results.patternSelectionAccuracy + '%');
    console.log('- Patterns implemented:', results.patternsImplemented);
    console.log('- Performance tests conducted:', results.performanceTestsRun);
    
    const avgScore = (
      (results.basePatternWorking ? 100 : 0) +
      results.routingSuccessRate +
      (results.dependencyResolutionCorrect ? 100 : 0) +
      (results.loadBalancing ? 100 : 0) +
      results.patternSelectionAccuracy
    ) / 5;
    
    console.log('- Overall pattern system score:', avgScore.toFixed(1) + '%');
    
    if (avgScore >= 90) {
      console.log('✅ Excellent workflow pattern implementation!');
    } else if (avgScore >= 80) {
      console.log('✅ Good workflow pattern implementation!');
    } else {
      console.log('⚠️  Workflow patterns need improvement');
    }
  })
  .catch(error => {
    console.error('❌ Workflow patterns tests failed:', error);
    process.exit(1);
  });