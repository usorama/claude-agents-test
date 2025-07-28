import { ContextManager } from './src/context/ContextManager.js';
import { AnalystAgent } from './src/agents/core/AnalystAgent.js';

async function testBasicAgent() {
  console.log('Testing basic agent initialization...');
  
  const contextManager = new ContextManager({ baseDir: './test-context-simple' });
  await contextManager.initialize();
  console.log('✓ Context Manager initialized');
  
  const analyst = new AnalystAgent();
  await analyst.initialize(contextManager);
  console.log('✓ Analyst agent initialized');
  
  // Test simple task
  const result = await analyst.execute({
    taskId: 'test-1',
    taskType: 'research-prompt',
    input: { topic: 'Cloud computing' }
  });
  
  console.log('✓ Task executed:', result.status);
  console.log('✓ Output:', result.output.prompt ? 'Research prompt created' : 'Failed');
  
  // Cleanup
  const fs = await import('fs/promises');
  await fs.rm('./test-context-simple', { recursive: true, force: true });
  console.log('✓ Cleanup complete');
}

testBasicAgent().catch(console.error);