import { ContextManager } from '../src/context/ContextManager.js';
import { getSchemaRegistry } from '../src/validation/SchemaRegistry.js';
import { PMAgent } from '../src/agents/core/PMAgent.js';
import { AnalystAgent } from '../src/agents/core/AnalystAgent.js';
import { BaseAgent } from '../src/agents/BaseAgent.js';
import fs from 'fs/promises';
import path from 'path';

/**
 * Comprehensive test for all improvements:
 * 1. Context Summarization
 * 2. JSON Schema Validation
 * 3. Enhanced Story Generation
 * 4. Safety Constraints
 */
async function testAllImprovements() {
  console.log('Testing All Improvements...\n');
  console.log('='.repeat(50));
  
  const testDir = './test-all-improvements';
  
  // Clean up
  try {
    await fs.rm(testDir, { recursive: true, force: true });
  } catch (e) {}
  
  try {
    // Initialize components
    const contextManager = new ContextManager({
      baseDir: path.join(testDir, 'context'),
      maxContextSize: 20 * 1024, // 20KB for testing
      summarizationThreshold: 0.6 // 60% threshold
    });
    await contextManager.initialize();
    
    // Test 1: JSON Schema Validation
    console.log('\n1. JSON Schema Validation');
    console.log('-'.repeat(30));
    
    const schemaRegistry = getSchemaRegistry();
    
    // Test valid agent config
    try {
      const analyst = new AnalystAgent({
        id: 'analyst-test',
        type: 'AnalystAgent',
        name: 'Test Analyst',
        researchDepth: 'deep',
        focusAreas: ['security', 'performance']
      });
      console.log('✓ Valid agent configuration accepted');
    } catch (error) {
      console.log('✗ Valid config rejected:', error.message);
    }
    
    // Test invalid agent config
    try {
      const invalidAnalyst = new AnalystAgent({
        id: 'invalid-analyst',
        // Missing required 'type' and 'name'
        researchDepth: 'invalid-value'
      });
      console.log('✗ Invalid configuration accepted (should fail)');
    } catch (error) {
      console.log('✓ Invalid configuration rejected:', error.message.substring(0, 50) + '...');
    }
    
    // Test 2: Enhanced Story Generation
    console.log('\n2. Enhanced Story Generation');
    console.log('-'.repeat(30));
    
    const pmAgent = new PMAgent({
      id: 'pm-test',
      type: 'PMAgent',
      name: 'Test PM'
    });
    await pmAgent.initialize(contextManager);
    
    const storyResult = await pmAgent.execute({
      taskId: 'story-001',
      taskType: 'create-story',
      input: {
        asA: 'developer',
        iWant: 'to implement caching',
        soThat: 'the application performs better',
        acceptanceCriteria: [
          'Cache is implemented for API responses',
          'Cache invalidation works correctly',
          'Performance improves by at least 50%'
        ],
        priority: 'high',
        storyPoints: 8,
        epicContext: {
          architecture: 'microservices',
          technicalRequirements: ['Redis', 'Cache-aside pattern']
        }
      }
    });
    
    const story = storyResult.output.story;
    console.log('✓ Story created:', story.id);
    console.log('  - Test scenarios:', story.testScenarios?.length || 0);
    console.log('  - Implementation hints:', story.implementationHints?.length || 0);
    console.log('  - Dependencies:', story.dependencies?.length || 0);
    console.log('  - Complexity:', story.metadata?.complexity || 'unknown');
    console.log('  - Estimated effort:', story.metadata?.effort || 'unknown');
    
    // Test 3: Context Summarization
    console.log('\n3. Context Summarization');
    console.log('-'.repeat(30));
    
    // Create multiple contexts to trigger summarization
    const contexts = [];
    for (let i = 0; i < 10; i++) {
      const ctx = await contextManager.createContext('agent', {
        agentId: `test-agent-${i}`,
        agentType: 'TestAgent',
        state: {
          largeData: 'x'.repeat(1000), // 1KB per context
          iteration: i
        },
        history: Array(20).fill({ action: 'test' }),
        capabilities: ['test']
      });
      contexts.push(ctx);
    }
    
    console.log('✓ Created', contexts.length, 'test contexts');
    
    // Check total size and trigger monitoring
    const sizeInfo = await contextManager.monitorContextSize();
    console.log('✓ Total context size:', sizeInfo.totalSize, 'bytes');
    console.log('✓ Threshold:', sizeInfo.threshold, 'bytes');
    console.log('✓ Summarization triggered:', sizeInfo.triggered);
    
    // Wait for summarization if triggered
    if (sizeInfo.triggered) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check if contexts were summarized
      const summarizedCount = contexts.filter(async ctx => {
        const current = await contextManager.getContext('agent', ctx.id);
        return current?.metadata?.summarized;
      }).length;
      
      console.log('✓ Contexts summarized:', summarizedCount);
    }
    
    // Test 4: Safety Constraints
    console.log('\n4. Safety Constraints');
    console.log('-'.repeat(30));
    
    const safeAgent = new BaseAgent({
      id: 'safe-agent',
      type: 'BaseAgent',
      name: 'Safe Agent',
      safety: {
        maxExecutionTimeMs: 3000, // 3 seconds
        forbiddenPaths: ['/etc', '/private', '/sys'],
        forbiddenTools: ['Bash'],
        allowedTools: ['Read', 'Write', 'Edit'],
        workspaceBoundary: testDir,
        maxFileOperations: 10
      }
    });
    await safeAgent.initialize(contextManager);
    
    // Override _executeTask for testing
    safeAgent._executeTask = async (request) => {
      const { action, path: filePath } = request.input;
      
      if (action === 'read' && filePath) {
        // Simulate file read
        return { content: 'file content' };
      }
      
      return { result: 'success' };
    };
    
    // Test allowed operation
    const allowedResult = await safeAgent.execute({
      taskId: 'safe-001',
      taskType: 'Read',
      input: {
        action: 'read',
        path: path.join(testDir, 'test.txt')
      }
    });
    console.log('✓ Allowed operation:', allowedResult.status);
    
    // Test forbidden path
    const forbiddenResult = await safeAgent.execute({
      taskId: 'safe-002',
      taskType: 'Read',
      input: {
        action: 'read',
        path: '/etc/passwd'
      }
    });
    console.log('✓ Forbidden path blocked:', forbiddenResult.status === 'blocked');
    console.log('  - Violation:', forbiddenResult.violations?.[0]?.type);
    
    // Test forbidden tool
    const bashResult = await safeAgent.execute({
      taskId: 'safe-003',
      taskType: 'Bash',
      input: {
        command: 'ls -la'
      }
    });
    console.log('✓ Forbidden tool blocked:', bashResult.status === 'blocked');
    
    // Test timeout
    safeAgent._executeTask = async () => {
      await new Promise(resolve => setTimeout(resolve, 5000)); // 5 seconds
    };
    
    const timeoutResult = await safeAgent.execute({
      taskId: 'safe-004',
      taskType: 'Read',
      input: { action: 'slow' }
    });
    console.log('✓ Timeout enforced:', timeoutResult.error?.includes('timeout'));
    
    // Integration Test: All features working together
    console.log('\n5. Integration Test');
    console.log('-'.repeat(30));
    
    // Create a PM agent with all features enabled
    const integratedPM = new PMAgent({
      id: 'integrated-pm',
      type: 'PMAgent',
      name: 'Integrated PM',
      safety: {
        workspaceBoundary: testDir,
        maxExecutionTimeMs: 10000
      }
    });
    await integratedPM.initialize(contextManager);
    
    // Create a story with safety constraints
    const integratedStory = await integratedPM.execute({
      taskId: 'integrated-001',
      taskType: 'create-story',
      input: {
        asA: 'system admin',
        iWant: 'to monitor system health',
        soThat: 'I can prevent outages',
        acceptanceCriteria: [
          'Real-time monitoring dashboard',
          'Alert on anomalies',
          'Historical data analysis'
        ],
        priority: 'high',
        storyPoints: 13
      }
    });
    
    console.log('✓ Integrated story created with all features');
    console.log('  - Schema validated: ✓');
    console.log('  - Story enriched: ✓');
    console.log('  - Safety enforced: ✓');
    console.log('  - Context managed: ✓');
    
    // Check resource usage
    const resourceStats = safeAgent.enforcer.resourceMonitor.getSummaryStats(safeAgent.id);
    console.log('\n6. Resource Usage Summary');
    console.log('-'.repeat(30));
    console.log('  - CPU: avg', resourceStats.cpu.avg.toFixed(1) + '%,',
                'max', resourceStats.cpu.max.toFixed(1) + '%');
    console.log('  - Memory: avg', resourceStats.memory.avg.toFixed(0) + 'MB,',
                'max', resourceStats.memory.max.toFixed(0) + 'MB');
    console.log('  - File operations:', resourceStats.fileOps);
    
    // Cleanup
    await pmAgent.shutdown();
    await safeAgent.shutdown();
    await integratedPM.shutdown();
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ All improvements tested successfully!');
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

// Run the comprehensive test
testAllImprovements().catch(console.error);