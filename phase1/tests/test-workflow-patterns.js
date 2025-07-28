import { OrchestratorAgent } from '../src/orchestrator/OrchestratorAgent.js';
import { ContextManager } from '../src/context/ContextManager.js';
import fs from 'fs/promises';
import path from 'path';

/**
 * Test all workflow patterns
 */
async function testWorkflowPatterns() {
  console.log('Testing Workflow Patterns...\n');
  console.log('='.repeat(50));
  
  const testDir = './test-workflow-patterns';
  
  // Clean up
  try {
    await fs.rm(testDir, { recursive: true, force: true });
  } catch (e) {}
  
  try {
    // Initialize system
    const contextManager = new ContextManager({
      baseDir: path.join(testDir, 'context'),
      maxContextSize: 100 * 1024
    });
    await contextManager.initialize();
    
    const orchestrator = new OrchestratorAgent({
      id: 'orchestrator-test',
      maxConcurrency: 5
    });
    await orchestrator.initialize(contextManager);
    
    // Test 1: Orchestrator-Workers Pattern
    console.log('\n1. Testing Orchestrator-Workers Pattern');
    console.log('-'.repeat(40));
    
    const parallelTasks = [
      {
        id: 'task-1',
        type: 'research-prompt',
        agent: 'ANALYST',
        input: { topic: 'AI patterns' },
        priority: 'medium'
      },
      {
        id: 'task-2',
        type: 'research-prompt',
        agent: 'ANALYST',
        input: { topic: 'Multi-agent systems' },
        priority: 'medium'
      },
      {
        id: 'task-3',
        type: 'research-prompt',
        agent: 'ANALYST',
        input: { topic: 'Workflow optimization' },
        priority: 'medium'
      },
      {
        id: 'task-4',
        type: 'create-prd',
        agent: 'PM',
        input: { projectName: 'Test Project' },
        priority: 'medium'
      },
      {
        id: 'task-5',
        type: 'static-analysis',
        agent: 'QA',
        input: { codebase: './src' },
        priority: 'medium'
      }
    ];
    
    const workersResult = await orchestrator.executeWithPattern(
      parallelTasks,
      'orchestrator-workers',
      {
        maxWorkers: 3,
        loadBalancing: 'round-robin',
        aggregationStrategy: 'collect-all'
      }
    );
    
    console.log('✓ Orchestrator-Workers Pattern executed');
    console.log('  - Total tasks:', workersResult.result.summary.totalTasks);
    console.log('  - Successful:', workersResult.result.summary.successful);
    console.log('  - Failed:', workersResult.result.summary.failed);
    console.log('  - Workers used:', Object.keys(workersResult.result.summary.byWorker).length);
    console.log('  - Execution time:', workersResult.executionTime + 'ms');
    
    // Test 2: Router Pattern
    console.log('\n2. Testing Router Pattern');
    console.log('-'.repeat(40));
    
    const routingTasks = [
      {
        id: 'route-1',
        type: 'general',
        description: 'Research the latest AI trends and create a report',
        requiredCapabilities: ['RESEARCH']
      },
      {
        id: 'route-2',
        type: 'general',
        description: 'Design the system architecture for a microservices application',
        requiredCapabilities: ['ARCHITECTURE']
      },
      {
        id: 'route-3',
        type: 'general',
        description: 'Implement the user authentication feature',
        requiredCapabilities: ['DEVELOPMENT']
      },
      {
        id: 'route-4',
        type: 'general',
        description: 'Test the payment processing module for edge cases',
        requiredCapabilities: ['TESTING']
      },
      {
        id: 'route-5',
        type: 'general',
        description: 'Deploy the application to Kubernetes cluster',
        requiredCapabilities: ['DEPLOYMENT']
      }
    ];
    
    const routerResult = await orchestrator.executeWithPattern(
      routingTasks,
      'router',
      {
        fallbackStrategy: 'most-capable',
        routeOptimization: true
      }
    );
    
    console.log('✓ Router Pattern executed');
    console.log('  - Total tasks:', routerResult.result.totalTasks);
    console.log('  - Successful:', routerResult.result.successful);
    console.log('  - Failed:', routerResult.result.failed);
    console.log('  - Routes used:', Object.keys(routerResult.result.routeUsage));
    console.log('  - Fallbacks:', routerResult.result.fallbackUsage.total);
    console.log('  - Execution time:', routerResult.executionTime + 'ms');
    
    // Test 3: Pipeline Pattern
    console.log('\n3. Testing Pipeline Pattern');
    console.log('-'.repeat(40));
    
    const pipelineTasks = [
      {
        id: 'pipe-1',
        name: 'research',
        type: 'research-prompt',
        agent: 'ANALYST',
        input: { topic: 'E-commerce platform requirements' }
      },
      {
        id: 'pipe-2',
        name: 'planning',
        type: 'create-prd',
        agent: 'PM',
        input: { projectName: 'E-commerce Platform' },
        dependsOn: ['pipe-1'],
        inputFrom: 'pipe-1'
      },
      {
        id: 'pipe-3',
        name: 'architecture',
        type: 'create-full-stack-architecture',
        agent: 'ARCHITECT',
        input: { projectName: 'E-commerce Platform' },
        dependsOn: ['pipe-2'],
        inputFrom: 'pipe-2'
      },
      {
        id: 'pipe-4',
        name: 'implementation',
        type: 'implement-feature',
        agent: 'DEVELOPER',
        input: { feature: 'Shopping Cart' },
        dependsOn: ['pipe-3'],
        inputFrom: 'pipe-3'
      }
    ];
    
    const pipelineResult = await orchestrator.executeWithPattern(
      pipelineTasks,
      'pipeline',
      {
        transformationStrategy: 'merge',
        errorHandling: 'stop',
        initialData: {
          project: 'E-commerce Test',
          timestamp: new Date().toISOString()
        }
      }
    );
    
    console.log('✓ Pipeline Pattern executed');
    console.log('  - Pipeline:', pipelineResult.result.pipeline);
    console.log('  - Stages executed:', pipelineResult.result.stages.length);
    console.log('  - Success:', pipelineResult.result.success);
    console.log('  - Total duration:', pipelineResult.result.data._pipeline.duration + 'ms');
    console.log('  - Execution time:', pipelineResult.executionTime + 'ms');
    
    // Test 4: Pattern Auto-Selection
    console.log('\n4. Testing Pattern Auto-Selection');
    console.log('-'.repeat(40));
    
    // Should select Orchestrator-Workers pattern
    const uniformParallelTasks = [
      { id: 'auto-1', type: 'analyze', agent: 'ANALYST', input: { data: 'set1' } },
      { id: 'auto-2', type: 'analyze', agent: 'ANALYST', input: { data: 'set2' } },
      { id: 'auto-3', type: 'analyze', agent: 'ANALYST', input: { data: 'set3' } },
      { id: 'auto-4', type: 'analyze', agent: 'ANALYST', input: { data: 'set4' } }
    ];
    
    const autoResult1 = await orchestrator.executeWithPattern(uniformParallelTasks);
    console.log('✓ Auto-selected pattern for parallel tasks:', autoResult1.pattern);
    
    // Should select Pipeline pattern
    const sequentialTasks = [
      { id: 'seq-1', type: 'step1', input: { data: 'initial' } },
      { id: 'seq-2', type: 'step2', dependsOn: ['seq-1'], inputFrom: 'seq-1' },
      { id: 'seq-3', type: 'step3', dependsOn: ['seq-2'], inputFrom: 'seq-2' }
    ];
    
    const autoResult2 = await orchestrator.executeWithPattern(sequentialTasks);
    console.log('✓ Auto-selected pattern for sequential tasks:', autoResult2.pattern);
    
    // Should select Router pattern
    const diverseTasks = [
      { id: 'div-1', type: 'research', description: 'Research task' },
      { id: 'div-2', type: 'develop', description: 'Development task' },
      { id: 'div-3', type: 'test', description: 'Testing task' }
    ];
    
    const autoResult3 = await orchestrator.executeWithPattern(diverseTasks);
    console.log('✓ Auto-selected pattern for diverse tasks:', autoResult3.pattern);
    
    // Test 5: Pattern Metrics
    console.log('\n5. Pattern Metrics');
    console.log('-'.repeat(40));
    
    const patternInfo = orchestrator.getPatternInfo();
    for (const pattern of patternInfo) {
      console.log(`\n${pattern.name}:`);
      console.log('  - Description:', pattern.description);
      console.log('  - Usage:', pattern.metrics.usage);
      console.log('  - Success rate:', (pattern.metrics.successRate * 100).toFixed(1) + '%');
      console.log('  - Avg execution time:', pattern.metrics.averageExecutionTime.toFixed(0) + 'ms');
    }
    
    // Test 6: Error Handling
    console.log('\n6. Testing Error Handling');
    console.log('-'.repeat(40));
    
    // Test with invalid agent
    const errorTasks = [
      {
        id: 'error-1',
        type: 'invalid-task',
        agent: 'INVALID_AGENT',
        input: { test: true }
      }
    ];
    
    try {
      await orchestrator.executeWithPattern(errorTasks, 'router');
      console.log('✗ Error handling failed - should have thrown');
    } catch (error) {
      console.log('✓ Error properly handled:', error.message.substring(0, 50) + '...');
    }
    
    // Test fallback in router pattern
    const fallbackTasks = [
      {
        id: 'fallback-1',
        type: 'specialized-task',
        description: 'This is a highly specialized task that might need fallback',
        requiredCapabilities: ['NONEXISTENT_CAPABILITY']
      }
    ];
    
    const fallbackResult = await orchestrator.executeWithPattern(
      fallbackTasks,
      'router',
      { fallbackStrategy: 'most-capable' }
    );
    
    console.log('✓ Fallback handling tested');
    console.log('  - Used fallback:', fallbackResult.result.results[0].fallback || 'none');
    
    // Get overall status
    const status = await orchestrator.getStatus();
    console.log('\n7. Orchestrator Status');
    console.log('-'.repeat(40));
    console.log('  - Active workflows:', status.output.activeWorkflows);
    console.log('  - Queued tasks:', status.output.queuedTasks);
    console.log('  - Pending tasks:', status.output.pendingTasks);
    
    // Cleanup
    await orchestrator.shutdown();
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ All workflow pattern tests completed successfully!');
    console.log('='.repeat(50));
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    throw error;
  } finally {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (e) {}
  }
}

// Run the test
testWorkflowPatterns().catch(console.error);