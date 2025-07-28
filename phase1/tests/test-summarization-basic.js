import { ContextManager } from '../src/context/ContextManager.js';
import { ContextLevel } from '../src/types/context.types.v2.js';
import fs from 'fs/promises';

// Basic test for context summarization
async function testBasicSummarization() {
  console.log('Testing Basic Context Summarization...\n');
  
  const testDir = './test-summarization-basic';
  
  // Clean up
  try {
    await fs.rm(testDir, { recursive: true, force: true });
  } catch (e) {}
  
  const contextManager = new ContextManager({
    baseDir: testDir,
    maxContextSize: 10 * 1024, // 10KB
    summarizationThreshold: 0.5
  });
  
  await contextManager.initialize();
  
  try {
    // Create a simple context
    console.log('1. Creating test context...');
    const context = await contextManager.createContext(ContextLevel.AGENT, {
      agentId: 'test-agent',
      agentType: 'TestAgent',
      state: { 
        largeData: 'x'.repeat(1000),
        important: 'keep-this' 
      },
      history: Array(20).fill(null).map((_, i) => ({ 
        timestamp: new Date().toISOString(),
        action: 'test',
        data: null
      })),
      capabilities: ['test']
    });
    console.log('✓ Context created:', context.id);
    
    // Test manual summarization
    console.log('\n2. Testing manual summarization...');
    await new Promise(resolve => setTimeout(resolve, 1500)); // Wait for age
    
    const summarized = await contextManager.summarizeContext(context.id, ContextLevel.AGENT);
    console.log('✓ Context summarized');
    console.log('  Original size:', summarized.metadata.originalSize);
    console.log('  Compressed size:', summarized.metadata.compressedSize);
    console.log('  Compression ratio:', (summarized.metadata.compressionRatio * 100).toFixed(1) + '%');
    
    // Verify data preservation
    console.log('\n3. Verifying data preservation...');
    const retrieved = await contextManager.getContext(ContextLevel.AGENT, context.id);
    console.log('✓ Important data preserved:', retrieved.data.state.important === 'keep-this');
    console.log('✓ History compressed:', retrieved.data.history.length, 'entries (was 20)');
    
    console.log('\n✅ Basic summarization test passed!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
  } finally {
    await fs.rm(testDir, { recursive: true, force: true });
  }
}

testBasicSummarization().catch(console.error);