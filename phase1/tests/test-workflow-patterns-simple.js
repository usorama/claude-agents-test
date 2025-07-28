import { OrchestratorAgent } from '../src/orchestrator/OrchestratorAgent.js';
import { ContextManager } from '../src/context/ContextManager.js';
import fs from 'fs/promises';
import path from 'path';

/**
 * Simple test for workflow patterns without safety constraints
 */
async function testWorkflowPatternsSimple() {
  console.log('Testing Workflow Patterns (Simple)...\n');
  console.log('='.repeat(50));
  
  const testDir = './test-workflow-patterns-simple';
  
  // Clean up
  try {
    await fs.rm(testDir, { recursive: true, force: true });
  } catch (e) {}
  
  try {
    // Initialize system without safety constraints
    const contextManager = new ContextManager({
      baseDir: path.join(testDir, 'context')
    });
    await contextManager.initialize();
    
    const orchestrator = new OrchestratorAgent({
      id: 'orchestrator-test',
      maxConcurrency: 3,
      safety: {
        enabled: false  // Disable safety constraints for testing
      }
    });
    await orchestrator.initialize(contextManager);
    
    // Test 1: Direct Pattern Execution
    console.log('\n1. Testing Direct Pattern Execution');
    console.log('-'.repeat(40));
    
    // Get patterns directly
    const workersPattern = orchestrator.patterns.get('orchestrator-workers');
    const routerPattern = orchestrator.patterns.get('router');
    const pipelinePattern = orchestrator.patterns.get('pipeline');
    
    console.log('✓ Patterns initialized:');
    console.log('  - OrchestratorWorkers:', workersPattern ? 'Ready' : 'Not found');
    console.log('  - Router:', routerPattern ? 'Ready' : 'Not found');
    console.log('  - Pipeline:', pipelinePattern ? 'Ready' : 'Not found');
    
    // Test 2: Pattern Analysis
    console.log('\n2. Testing Pattern Analysis');
    console.log('-'.repeat(40));
    
    const parallelTasks = [
      { id: 't1', type: 'analyze', agent: 'ANALYST' },
      { id: 't2', type: 'analyze', agent: 'ANALYST' },
      { id: 't3', type: 'analyze', agent: 'ANALYST' }
    ];
    
    const analysis = orchestrator._analyzeTasks(parallelTasks);
    console.log('Task analysis:', JSON.stringify(analysis, null, 2));
    
    // Test if patterns can handle
    console.log('\nPattern selection:');
    console.log('  - OrchestratorWorkers canHandle:', workersPattern.canHandle(analysis));
    console.log('  - Router canHandle:', routerPattern.canHandle(analysis));
    console.log('  - Pipeline canHandle:', pipelinePattern.canHandle(analysis));
    
    // Test 3: Agent Mapping
    console.log('\n3. Testing Agent Mapping');
    console.log('-'.repeat(40));
    
    const agent = workersPattern.getAgent('ANALYST');
    console.log('✓ Agent lookup successful:', agent.type);
    
    // Test 4: Simple Task Execution
    console.log('\n4. Testing Simple Task Execution');
    console.log('-'.repeat(40));
    
    const simpleTask = {
      id: 'test-task-1',
      type: 'research-prompt',
      input: { topic: 'Test research' }
    };
    
    try {
      // Execute through orchestrator's regular flow
      const result = await orchestrator.execute({
        taskId: 'test-exec-1',
        taskType: 'delegate-task',
        input: {
          agentType: 'AnalystAgent',
          task: simpleTask.type,
          taskInput: simpleTask.input
        }
      });
      
      console.log('✓ Task executed successfully');
      console.log('  - Status:', result.status);
      console.log('  - Output type:', typeof result.output);
    } catch (error) {
      console.log('✗ Task execution failed:', error.message);
    }
    
    // Test 5: Pattern Info
    console.log('\n5. Pattern Information');
    console.log('-'.repeat(40));
    
    const patternInfo = orchestrator.getPatternInfo();
    for (const info of patternInfo) {
      console.log(`\n${info.name}:`);
      console.log('  - Description:', info.description);
      console.log('  - Usage:', info.metrics.usage);
      console.log('  - Success rate:', info.metrics.successRate);
    }
    
    // Cleanup
    await orchestrator.shutdown();
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ Simple workflow pattern test completed!');
    console.log('='.repeat(50));
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    console.error(error.stack);
    throw error;
  } finally {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (e) {}
  }
}

// Run the test
testWorkflowPatternsSimple().catch(console.error);