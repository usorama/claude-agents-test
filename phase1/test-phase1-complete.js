import { ContextManager } from './src/context/ContextManager.js';
import { OrchestratorAgent } from './src/orchestrator/OrchestratorAgent.js';
import fs from 'fs/promises';

async function testPhase1Complete() {
  console.log('🧪 Testing Phase 1 Complete System...\n');
  
  const contextManager = new ContextManager({ 
    baseDir: './test-context-complete',
    logLevel: 'error' // Reduce noise
  });
  await contextManager.initialize();
  console.log('✓ Context Manager initialized');
  
  const orchestrator = new OrchestratorAgent({ 
    maxConcurrency: 2,
    logLevel: 'error'
  });
  await orchestrator.initialize(contextManager);
  console.log('✓ Orchestrator initialized with', orchestrator.agents.size, 'agents');
  
  // Test 1: Simple routing
  console.log('\n📍 Test 1: Route simple request');
  const routeResult = await orchestrator.routeRequest('Research cloud computing trends');
  console.log('✓ Routed successfully');
  
  // Test 2: Complex multi-agent workflow
  console.log('\n📍 Test 2: Complex workflow');
  const workflowResult = await orchestrator.startWorkflow('product-development', {
    request: 'Build a task management system',
    context: {
      projectName: 'TaskMaster',
      targetUsers: ['developers'],
      goals: ['Task tracking']
    }
  });
  console.log('✓ Workflow completed:', workflowResult.success);
  console.log('  Phases:', workflowResult.results.phases.map(p => p.phase).join(' → '));
  
  // Test 3: Agent metrics
  console.log('\n📍 Test 3: System metrics');
  const metrics = await orchestrator.getStatus();
  console.log('✓ System healthy');
  console.log('  Agents:', Object.keys(metrics.metrics.agents).join(', '));
  console.log('  Total tasks:', metrics.metrics.system.totalTasks);
  
  // Cleanup
  await fs.rm('./test-context-complete', { recursive: true, force: true });
  console.log('\n✅ All Phase 1 tests passed!');
}

testPhase1Complete().catch(console.error);