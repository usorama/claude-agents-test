import { ContextManager } from '../src/context/ContextManager.js';
import { ContextLevel } from '../src/types/context.types.v2.js';
import fs from 'fs/promises';
import path from 'path';

// Test context summarization functionality
async function testContextSummarization() {
  console.log('Testing Context Summarization...\n');
  
  const testDir = './test-context-summarization';
  
  // Clean up test directory
  try {
    await fs.rm(testDir, { recursive: true, force: true });
  } catch (e) {}
  
  // Initialize context manager with low thresholds for testing
  const contextManager = new ContextManager({
    baseDir: testDir,
    maxContextSize: 10 * 1024, // 10KB for testing
    summarizationThreshold: 0.5, // Trigger at 50% for testing
    summarizerConfig: {
      level: 'medium',
      ageThreshold: 1000 // 1 second for testing
    }
  });
  
  await contextManager.initialize();
  
  try {
    // Test 1: Create contexts with varying sizes
    console.log('Test 1: Creating test contexts...');
    
    // Create a large agent context
    const agentContext = await contextManager.createContext(ContextLevel.AGENT, {
      agentId: 'test-agent-001',
      agentType: 'TestAgent',
      state: {
        largeData: 'x'.repeat(2000), // 2KB of data
        importantField: 'keep-this',
        status: 'active'
      },
      history: Array(50).fill(null).map((_, i) => ({
        timestamp: new Date(Date.now() - i * 60000).toISOString(),
        action: `Action ${i}`,
        result: `Result data for action ${i} with some verbose logging information`
      })),
      capabilities: ['analyze', 'summarize', 'report']
    });
    console.log(`✓ Created agent context: ${agentContext.id}`);
    
    // Create multiple task contexts
    const taskContexts = [];
    for (let i = 0; i < 5; i++) {
      const taskContext = await contextManager.createContext(ContextLevel.TASK, {
        taskId: `test-task-${i}`,
        taskType: 'analysis',
        status: i < 3 ? 'completed' : 'pending',
        input: {
          data: 'y'.repeat(500), // 500 bytes each
          parameters: { index: i }
        },
        output: i < 3 ? { result: `Task ${i} completed with large output data`.repeat(10) } : null,
        progress: i < 3 ? 100 : 50
      });
      taskContexts.push(taskContext);
      console.log(`✓ Created task context: ${taskContext.id}`);
    }
    
    // Wait for contexts to age
    console.log('\nWaiting for contexts to age...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test 2: Monitor context size
    console.log('\nTest 2: Monitoring context size...');
    const sizeInfo = await contextManager.monitorContextSize();
    console.log(`Total size: ${sizeInfo.totalSize} bytes`);
    console.log(`Threshold: ${sizeInfo.threshold} bytes`);
    console.log(`Triggered summarization: ${sizeInfo.triggered}`);
    
    // Test 3: Manual summarization
    console.log('\nTest 3: Testing manual summarization...');
    const summarized = await contextManager.summarizeContext(agentContext.id, ContextLevel.AGENT, 'high');
    console.log(`✓ Summarized agent context:`);
    console.log(`  Original size: ${summarized.metadata.originalSize} bytes`);
    console.log(`  Compressed size: ${summarized.metadata.compressedSize} bytes`);
    console.log(`  Compression ratio: ${(summarized.metadata.compressionRatio * 100).toFixed(1)}%`);
    
    // Test 4: Verify summarization preserved important data
    console.log('\nTest 4: Verifying data preservation...');
    const retrievedContext = await contextManager.getContext(ContextLevel.AGENT, agentContext.id);
    console.log(`✓ Important field preserved: ${retrievedContext.data.state.importantField === 'keep-this'}`);
    console.log(`✓ Agent ID preserved: ${retrievedContext.data.agentId === 'test-agent-001'}`);
    console.log(`✓ History summarized: ${retrievedContext.data.history.length} entries (was 50)`);
    
    // Test 5: Archive and restore
    console.log('\nTest 5: Testing archive and restore...');
    const archivePath = await contextManager.archiveContext(taskContexts[0].id, ContextLevel.TASK);
    console.log(`✓ Context archived to: ${path.relative(testDir, archivePath)}`);
    
    // Modify the context
    await contextManager.updateContext(ContextLevel.TASK, taskContexts[0].id, {
      status: 'failed',
      output: { modified: true }
    });
    
    // Restore from archive
    const restored = await contextManager.restoreContext(taskContexts[0].id, ContextLevel.TASK);
    console.log(`✓ Context restored: status = ${restored.data.status} (should be 'completed')`);
    
    // Test 6: Automatic summarization trigger
    console.log('\nTest 6: Testing automatic summarization...');
    
    // Create more contexts to exceed threshold
    for (let i = 0; i < 10; i++) {
      await contextManager.createContext(ContextLevel.TASK, {
        taskId: `bulk-task-${i}`,
        taskType: 'bulk',
        status: 'pending',
        input: {
          largeInput: 'z'.repeat(1000) // 1KB each
        }
      });
    }
    
    // Force monitoring check
    const autoSizeInfo = await contextManager.monitorContextSize();
    console.log(`✓ Automatic summarization triggered: ${autoSizeInfo.triggered}`);
    console.log(`  Final size: ${autoSizeInfo.totalSize} bytes`);
    
    // Test 7: Verify old contexts were summarized
    console.log('\nTest 7: Checking summarization results...');
    const allContexts = await contextManager.queryContexts();
    const summarizedContexts = allContexts.filter(c => c.metadata.summarized);
    console.log(`✓ Total contexts: ${allContexts.length}`);
    console.log(`✓ Summarized contexts: ${summarizedContexts.length}`);
    
    console.log('\n✅ All context summarization tests passed!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    throw error;
  } finally {
    // Cleanup
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (e) {}
  }
}

// Run the test
testContextSummarization().catch(console.error);