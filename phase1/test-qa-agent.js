import { ContextManager } from './src/context/ContextManager.js';
import { QAAgent } from './src/agents/extended/QAAgent.js';
import { DeveloperAgent } from './src/agents/extended/DeveloperAgent.js';
import { OrchestratorAgent } from './src/orchestrator/OrchestratorAgent.js';
import fs from 'fs/promises';

async function testQAAgent() {
  console.log('🧪 Testing QA Agent...\n');
  
  const contextManager = new ContextManager({ 
    baseDir: './test-qa-agent',
    logLevel: 'error'
  });
  await contextManager.initialize();
  console.log('✅ Context Manager initialized');
  
  // Test QA agent directly
  console.log('\n📍 Testing QA Agent:');
  const qa = new QAAgent({ logLevel: 'error' });
  await qa.initialize(contextManager);
  
  // Test review story implementation
  const reviewResult = await qa.execute({
    taskId: 'test-qa-review',
    taskType: 'review-story',
    input: {
      storyId: 'STORY-001',
      implementationFiles: ['src/feature.js', 'tests/feature.test.js'],
      requirements: ['Feature should handle edge cases', 'Must have 80% test coverage'],
      acceptanceCriteria: ['All tests pass', 'No security vulnerabilities']
    }
  });
  console.log('✅ Story review:', reviewResult.status);
  
  // Test code review
  const codeReviewResult = await qa.execute({
    taskId: 'test-qa-code-review',
    taskType: 'perform-code-review',
    input: {
      files: ['src/example.js'],
      reviewType: 'comprehensive',
      focusAreas: ['security', 'performance']
    }
  });
  console.log('✅ Code review:', codeReviewResult.status);
  
  // Test with orchestrator
  console.log('\n📍 Testing Orchestrator with QA tasks:');
  const orchestrator = new OrchestratorAgent({ 
    maxConcurrency: 2,
    logLevel: 'error'
  });
  await orchestrator.initialize(contextManager);
  
  // Route testing request
  const testingRequest = await orchestrator.routeRequest(
    'Please review and test the implementation for code quality'
  );
  console.log('✅ Testing request routed:', testingRequest.status);
  
  // Route development then QA workflow
  const devQARequest = await orchestrator.routeRequest(
    'Implement a new feature and then test it thoroughly'
  );
  console.log('✅ Dev+QA workflow:', devQARequest.status);
  
  // Cleanup
  await fs.rm('./test-qa-agent', { recursive: true, force: true });
  console.log('\n✅ QA Agent tests passed!');
}

testQAAgent().catch(console.error);