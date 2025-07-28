import { test } from 'node:test';
import assert from 'node:assert';
import { ContextManager } from '../../src/context/ContextManager.js';
import { OrchestratorAgent } from '../../src/orchestrator/OrchestratorAgent.js';
import fs from 'fs/promises';
import path from 'path';

const TEST_BASE_DIR = './test-context-workflow';
const OUTPUT_DIR = './test-output';

test('Full Product Development Workflow - End to End', async (t) => {
  // Setup
  const contextManager = new ContextManager({ 
    baseDir: TEST_BASE_DIR,
    logLevel: 'info'
  });
  await contextManager.initialize();
  
  const orchestrator = new OrchestratorAgent({ 
    maxConcurrency: 2,
    logLevel: 'info'
  });
  await orchestrator.initialize(contextManager);
  
  // Ensure output directory exists
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  
  await t.test('Phase 1: Discovery with Analyst', async () => {
    const result = await orchestrator.execute({
      taskId: 'test-discovery-1',
      taskType: 'delegate-task',
      input: {
        agentType: 'analyst',
        task: 'create-project-brief',
        taskInput: {
          projectName: 'TaskFlow Pro',
          description: 'A modern task management system for remote teams',
          goals: [
            'Enable real-time collaboration',
            'Track project progress',
            'Integrate with popular tools'
          ],
          constraints: ['budget: $50k', 'timeline: 3 months', 'team: 5 developers']
        }
      }
    });
    
    assert(result.status === 'success');
    assert(result.output.brief);
    assert(result.output.brief.sections.executiveSummary);
    assert(result.output.outputPath);
    
    console.log('✓ Project brief created:', result.output.summary);
  });
  
  await t.test('Phase 2: Planning with PM', async () => {
    const result = await orchestrator.execute({
      taskId: 'test-planning-1',
      taskType: 'delegate-task',
      input: {
        agentType: 'pm',
        task: 'create-prd',
        taskInput: {
          projectName: 'TaskFlow Pro',
          projectBrief: 'Modern task management for remote teams',
          targetUsers: ['Remote workers', 'Project managers', 'Team leads'],
          problemStatement: 'Remote teams struggle with task coordination and visibility',
          goals: [
            'Real-time task updates',
            'Team collaboration features',
            'Progress tracking dashboards'
          ],
          constraints: ['3-month timeline', 'Limited budget'],
          successMetrics: [
            { metric: 'User adoption', target: '1000 users in 3 months' },
            { metric: 'Task completion rate', target: '85%' }
          ]
        }
      }
    });
    
    assert(result.status === 'success');
    assert(result.output.prd);
    assert(result.output.prd.sections.functionalRequirements);
    assert(result.output.shareId); // Shared with architect
    
    console.log('✓ PRD created:', result.output.summary);
  });
  
  await t.test('Phase 3: Architecture with Architect', async () => {
    const result = await orchestrator.execute({
      taskId: 'test-architecture-1',
      taskType: 'delegate-task',
      input: {
        agentType: 'architect',
        task: 'create-full-stack-architecture',
        taskInput: {
          projectName: 'TaskFlow Pro',
          requirements: [
            'Real-time updates using WebSockets',
            'RESTful API for CRUD operations',
            'React frontend with TypeScript',
            'PostgreSQL for data persistence',
            'Redis for caching and sessions'
          ],
          constraints: ['Must scale to 10k concurrent users', 'Deploy on AWS'],
          teamSize: 5,
          timeline: 90 // days
        }
      }
    });
    
    assert(result.status === 'success');
    assert(result.output.architecture);
    assert(result.output.architecture.frontend);
    assert(result.output.architecture.backend);
    assert(result.output.architecture.infrastructure);
    assert(result.output.diagrams);
    
    console.log('✓ Architecture created:', result.output.summary);
  });
  
  await t.test('Phase 4: Complete Workflow Execution', async () => {
    const workflowResult = await orchestrator.startWorkflow('product-development', {
      request: 'Build TaskFlow Pro - a task management system',
      context: {
        projectName: 'TaskFlow Pro',
        description: 'Modern task management for remote teams',
        targetUsers: ['Remote workers', 'Project managers'],
        goals: ['Task tracking', 'Team collaboration', 'Progress visualization'],
        constraints: ['3 months', '$50k budget', '5 developers']
      }
    });
    
    assert(workflowResult.success);
    assert(workflowResult.workflowId);
    assert(workflowResult.results.phases.length >= 2); // At least Discovery and Planning
    
    // Check Discovery phase
    const discoveryPhase = workflowResult.results.phases.find(p => p.phase === 'Discovery');
    assert(discoveryPhase);
    assert(discoveryPhase.tasks.length > 0);
    
    // Check Planning phase
    const planningPhase = workflowResult.results.phases.find(p => p.phase === 'Planning');
    assert(planningPhase);
    assert(planningPhase.tasks.length > 0);
    
    console.log('✓ Full workflow completed:', workflowResult.summary);
    console.log(`  - Workflow ID: ${workflowResult.workflowId}`);
    console.log(`  - Phases completed: ${workflowResult.results.phases.length}`);
  });
  
  await t.test('Phase 5: Inter-Agent Communication', async () => {
    // Send message from PM to Architect
    const messageId = await contextManager.sendMessage({
      from: 'pm-001',
      to: 'architect-001',
      type: 'request',
      subject: 'Architecture Review Request',
      data: {
        prdId: 'prd-123',
        specificConcerns: ['API design', 'Database schema', 'Caching strategy']
      }
    });
    
    assert(messageId.id);
    
    // Check architect received the message
    const messages = await contextManager.getMessages('architect-001');
    const receivedMessage = messages.find(m => m.id === messageId.id);
    
    assert(receivedMessage);
    assert.strictEqual(receivedMessage.subject, 'Architecture Review Request');
    assert(receivedMessage.data.specificConcerns.includes('API design'));
    
    console.log('✓ Inter-agent communication verified');
  });
  
  await t.test('Phase 6: Context Persistence and Recovery', async () => {
    // Create project context
    const projectContext = await contextManager.createContext('project', {
      projectName: 'TaskFlow Pro',
      status: 'in-progress',
      phase: 'development',
      activeAgents: ['analyst-001', 'pm-001', 'architect-001']
    });
    
    assert(projectContext.id);
    
    // Query contexts
    const contexts = await contextManager.queryContexts({
      level: 'project',
      tags: ['TaskFlow Pro']
    });
    
    assert(contexts.length >= 1);
    
    // Build knowledge graph
    const knowledgeGraph = await contextManager.getKnowledgeGraph();
    
    assert(knowledgeGraph.nodes.length > 0);
    assert(knowledgeGraph.edges.length >= 0);
    
    console.log('✓ Context management verified');
    console.log(`  - Nodes in knowledge graph: ${knowledgeGraph.nodes.length}`);
  });
  
  await t.test('Phase 7: Monitoring and Metrics', async () => {
    const status = await orchestrator.getStatus();
    
    assert(typeof status.activeWorkflows === 'number');
    assert(typeof status.queuedTasks === 'number');
    assert(status.metrics);
    assert(status.metrics.system);
    assert(status.metrics.system.uptime > 0);
    assert(status.metrics.agents);
    
    // Check individual agent metrics
    for (const [agentType, metrics] of Object.entries(status.metrics.agents)) {
      assert(metrics.status);
      assert(typeof metrics.completedTasks === 'number');
      assert(typeof metrics.totalTokensUsed === 'number');
      
      console.log(`  - ${agentType}: ${metrics.completedTasks} tasks, ${metrics.totalTokensUsed} tokens`);
    }
    
    console.log('✓ Monitoring and metrics verified');
  });
  
  // Cleanup
  await fs.rm(TEST_BASE_DIR, { recursive: true, force: true });
  await fs.rm(OUTPUT_DIR, { recursive: true, force: true });
  
  console.log('\n✅ Full workflow test completed successfully!');
});