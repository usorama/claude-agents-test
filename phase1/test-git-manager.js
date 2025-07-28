import { ContextManager } from './src/context/ContextManager.js';
import { GitManagerAgent } from './src/agents/extended/GitManagerAgent.js';
import fs from 'fs/promises';

async function testGitManagerAgent() {
  console.log('🧪 Testing Git Manager Agent...\n');
  
  const contextManager = new ContextManager({ 
    baseDir: './test-git-manager',
    logLevel: 'error'
  });
  await contextManager.initialize();
  console.log('✅ Context Manager initialized');
  
  // Test Git Manager agent
  console.log('\n📍 Testing Git Manager Agent:');
  const gitManager = new GitManagerAgent({ logLevel: 'error' });
  await gitManager.initialize(contextManager);
  
  // Test analyze history (safe operation)
  const historyResult = await gitManager.execute({
    taskId: 'test-history',
    taskType: 'analyze-history',
    input: {
      branch: 'main',
      stats: true
    }
  });
  console.log('✅ History analysis:', historyResult.status);
  
  // Test setup git hooks (creates files locally)
  const hooksResult = await gitManager.execute({
    taskId: 'test-hooks',
    taskType: 'setup-hooks',
    input: {
      hooks: ['pre-commit'],
      huskyEnabled: false // Don't install npm packages in test
    }
  });
  console.log('✅ Git hooks setup:', hooksResult.status);
  
  // Test branch cleanup (dry run only)
  const cleanupResult = await gitManager.execute({
    taskId: 'test-cleanup',
    taskType: 'cleanup-branches',
    input: {
      olderThanDays: 30,
      dryRun: true // Don't actually delete branches
    }
  });
  console.log('✅ Branch cleanup analysis:', cleanupResult.status);
  
  // Cleanup
  await fs.rm('./test-git-manager', { recursive: true, force: true });
  console.log('\n✅ Git Manager Agent tests passed!');
}

testGitManagerAgent().catch(console.error);