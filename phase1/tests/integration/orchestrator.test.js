import { test } from 'node:test';
import assert from 'node:assert';
import { ContextManager } from '../../src/context/ContextManager.js';
import { OrchestratorAgent } from '../../src/orchestrator/OrchestratorAgent.js';
import fs from 'fs/promises';
import path from 'path';

const TEST_BASE_DIR = './test-context-orchestrator';

test('OrchestratorAgent - Initialize and register agents', async () => {
  const contextManager = new ContextManager({ baseDir: TEST_BASE_DIR });
  await contextManager.initialize();
  
  const orchestrator = new OrchestratorAgent();
  await orchestrator.initialize(contextManager);
  
  // Check agents are registered
  assert.strictEqual(orchestrator.agents.size, 3);
  assert(orchestrator.agents.has('analyst'));
  assert(orchestrator.agents.has('pm'));
  assert(orchestrator.agents.has('architect'));
  
  // Check workflows are loaded
  assert(orchestrator.workflows.size > 0);
  assert(orchestrator.workflows.has('product-development'));
  assert(orchestrator.workflows.has('brownfield-modernization'));
  
  // Cleanup
  await fs.rm(TEST_BASE_DIR, { recursive: true, force: true });
});

test('OrchestratorAgent - Route simple research request', async () => {
  const contextManager = new ContextManager({ baseDir: TEST_BASE_DIR });
  await contextManager.initialize();
  
  const orchestrator = new OrchestratorAgent();
  await orchestrator.initialize(contextManager);
  
  // Route a research request
  const result = await orchestrator.routeRequest(
    'Research the market for AI development tools',
    { project: 'test-project' }
  );
  
  assert(result);
  assert(result.tasks);
  assert(result.tasks.length > 0);
  assert.strictEqual(result.tasks[0].agent, 'analyst');
  
  // Cleanup
  await fs.rm(TEST_BASE_DIR, { recursive: true, force: true });
});

test('OrchestratorAgent - Execute product development workflow', async () => {
  const contextManager = new ContextManager({ baseDir: TEST_BASE_DIR });
  await contextManager.initialize();
  
  const orchestrator = new OrchestratorAgent({ maxConcurrency: 1 });
  await orchestrator.initialize(contextManager);
  
  // Start workflow
  const result = await orchestrator.startWorkflow('product-development', {
    request: 'Build a task management application',
    context: {
      projectName: 'TaskMaster',
      targetUsers: ['developers', 'project managers'],
      goals: ['Track tasks', 'Manage deadlines', 'Collaborate']
    }
  });
  
  assert(result.success);
  assert.strictEqual(result.results.workflow, 'Product Development Workflow');
  assert(result.results.phases.length > 0);
  assert(result.workflowId);
  
  // Check first phase was discovery
  assert.strictEqual(result.results.phases[0].phase, 'Discovery');
  
  // Cleanup
  await fs.rm(TEST_BASE_DIR, { recursive: true, force: true });
});

test('OrchestratorAgent - Delegate task to specific agent', async () => {
  const contextManager = new ContextManager({ baseDir: TEST_BASE_DIR });
  await contextManager.initialize();
  
  const orchestrator = new OrchestratorAgent();
  await orchestrator.initialize(contextManager);
  
  // Delegate task
  const result = await orchestrator.execute({
    taskId: 'test-task-1',
    taskType: 'delegate-task',
    input: {
      agentType: 'analyst',
      task: 'research-prompt',
      taskInput: { topic: 'Cloud computing trends' },
      priority: 'high'
    }
  });
  
  assert(result);
  assert.strictEqual(result.agentId, 'analyst-001');
  assert.strictEqual(result.status, 'success');
  assert(result.output);
  
  // Cleanup
  await fs.rm(TEST_BASE_DIR, { recursive: true, force: true });
});

test('OrchestratorAgent - Coordinate multiple agents', async () => {
  const contextManager = new ContextManager({ baseDir: TEST_BASE_DIR });
  await contextManager.initialize();
  
  const orchestrator = new OrchestratorAgent();
  await orchestrator.initialize(contextManager);
  
  // Coordinate agents in sequential mode
  const result = await orchestrator.execute({
    taskId: 'test-coord-1',
    taskType: 'coordinate-agents',
    input: {
      agents: ['analyst', 'pm'],
      tasks: [
        { type: 'research-prompt', input: { topic: 'E-commerce platforms' } },
        { type: 'create-prd', input: { projectName: 'E-Shop', requirements: [] } }
      ],
      coordination: 'sequential'
    }
  });
  
  assert(result);
  assert.strictEqual(result.coordination, 'sequential');
  assert.strictEqual(result.results.length, 2);
  
  // Check results are from correct agents
  assert.strictEqual(result.results[0].agentId, 'analyst-001');
  assert.strictEqual(result.results[1].agentId, 'pm-001');
  
  // Cleanup
  await fs.rm(TEST_BASE_DIR, { recursive: true, force: true });
});

test('OrchestratorAgent - Monitor progress', async () => {
  const contextManager = new ContextManager({ baseDir: TEST_BASE_DIR });
  await contextManager.initialize();
  
  const orchestrator = new OrchestratorAgent();
  await orchestrator.initialize(contextManager);
  
  // Get status
  const status = await orchestrator.getStatus();
  
  assert(status);
  assert.strictEqual(typeof status.activeWorkflows, 'number');
  assert.strictEqual(typeof status.queuedTasks, 'number');
  assert(Array.isArray(status.workflows));
  assert(status.metrics);
  assert(status.metrics.system);
  assert(status.metrics.agents);
  
  // Cleanup
  await fs.rm(TEST_BASE_DIR, { recursive: true, force: true });
});

test('OrchestratorAgent - Handle workflow failure gracefully', async () => {
  const contextManager = new ContextManager({ baseDir: TEST_BASE_DIR });
  await contextManager.initialize();
  
  const orchestrator = new OrchestratorAgent();
  await orchestrator.initialize(contextManager);
  
  // Try to execute non-existent workflow
  try {
    await orchestrator.startWorkflow('non-existent-workflow', {});
    assert.fail('Should have thrown error');
  } catch (error) {
    assert(error.message.includes('Unknown workflow'));
  }
  
  // Cleanup
  await fs.rm(TEST_BASE_DIR, { recursive: true, force: true });
});

test('OrchestratorAgent - Parallel task execution', async () => {
  const contextManager = new ContextManager({ baseDir: TEST_BASE_DIR });
  await contextManager.initialize();
  
  const orchestrator = new OrchestratorAgent({ maxConcurrency: 3 });
  await orchestrator.initialize(contextManager);
  
  const startTime = Date.now();
  
  // Coordinate agents in parallel mode
  const result = await orchestrator.execute({
    taskId: 'test-parallel-1',
    taskType: 'coordinate-agents',
    input: {
      agents: ['analyst', 'analyst', 'analyst'],
      tasks: [
        { type: 'research-prompt', input: { topic: 'Topic 1' } },
        { type: 'research-prompt', input: { topic: 'Topic 2' } },
        { type: 'research-prompt', input: { topic: 'Topic 3' } }
      ],
      coordination: 'parallel'
    }
  });
  
  const duration = Date.now() - startTime;
  
  assert(result);
  assert.strictEqual(result.coordination, 'parallel');
  assert.strictEqual(result.results.length, 3);
  
  // Parallel execution should be faster than sequential
  // (In real scenario with actual async operations)
  console.log(`Parallel execution took ${duration}ms`);
  
  // Cleanup
  await fs.rm(TEST_BASE_DIR, { recursive: true, force: true });
});

test('OrchestratorAgent - Pipeline coordination', async () => {
  const contextManager = new ContextManager({ baseDir: TEST_BASE_DIR });
  await contextManager.initialize();
  
  const orchestrator = new OrchestratorAgent();
  await orchestrator.initialize(contextManager);
  
  // Coordinate agents in pipeline mode
  const result = await orchestrator.execute({
    taskId: 'test-pipeline-1',
    taskType: 'coordinate-agents',
    input: {
      agents: ['analyst', 'pm', 'architect'],
      tasks: [
        { type: 'research-prompt', input: { topic: 'Mobile app trends' } },
        { type: 'create-prd', input: { projectName: 'MobileApp' } },
        { type: 'create-full-stack-architecture', input: { projectName: 'MobileApp' } }
      ],
      coordination: 'pipeline',
      initialData: { context: 'Mobile application project' }
    }
  });
  
  assert(result);
  assert.strictEqual(result.coordination, 'pipeline');
  assert.strictEqual(result.results.length, 3);
  
  // Each result should have processed pipeline data
  result.results.forEach((res, index) => {
    assert(res.output);
    console.log(`Pipeline stage ${index + 1} completed by ${res.agentId}`);
  });
  
  // Cleanup
  await fs.rm(TEST_BASE_DIR, { recursive: true, force: true });
});

test('OrchestratorAgent - Task prioritization', async () => {
  const contextManager = new ContextManager({ baseDir: TEST_BASE_DIR });
  await contextManager.initialize();
  
  const orchestrator = new OrchestratorAgent({ maxConcurrency: 1 });
  await orchestrator.initialize(contextManager);
  
  // Queue multiple tasks with different priorities
  const promises = [
    orchestrator.execute({
      taskId: 'low-priority',
      taskType: 'delegate-task',
      input: {
        agentType: 'analyst',
        task: 'research-prompt',
        taskInput: { topic: 'Low priority topic' },
        priority: 'low'
      }
    }),
    orchestrator.execute({
      taskId: 'high-priority',
      taskType: 'delegate-task',
      input: {
        agentType: 'analyst',
        task: 'research-prompt',
        taskInput: { topic: 'High priority topic' },
        priority: 'high'
      }
    }),
    orchestrator.execute({
      taskId: 'critical-priority',
      taskType: 'delegate-task',
      input: {
        agentType: 'analyst',
        task: 'research-prompt',
        taskInput: { topic: 'Critical priority topic' },
        priority: 'critical'
      }
    })
  ];
  
  const results = await Promise.all(promises);
  
  assert.strictEqual(results.length, 3);
  results.forEach(result => {
    assert(result);
    assert.strictEqual(result.status, 'success');
  });
  
  // Cleanup
  await fs.rm(TEST_BASE_DIR, { recursive: true, force: true });
});

test('OrchestratorAgent - Complex request analysis', async () => {
  const contextManager = new ContextManager({ baseDir: TEST_BASE_DIR });
  await contextManager.initialize();
  
  const orchestrator = new OrchestratorAgent();
  await orchestrator.initialize(contextManager);
  
  // Analyze complex request
  const result = await orchestrator.routeRequest(
    'First research the market for project management tools, then create a PRD for a new tool, and finally design the architecture with API integration and real-time features',
    { complexity: 'high' }
  );
  
  assert(result);
  
  // Should have executed multiple tasks
  assert(result.tasks || result.results);
  
  // Should have identified this as a complex multi-step request
  console.log('Complex request analysis result:', result.summary);
  
  // Cleanup
  await fs.rm(TEST_BASE_DIR, { recursive: true, force: true });
});