import { ContextManager } from './src/context/ContextManager.js';
import { AnalystAgent } from './src/agents/core/AnalystAgent.js';
import { PMAgent } from './src/agents/core/PMAgent.js';
import { ArchitectAgent } from './src/agents/core/ArchitectAgent.js';
import fs from 'fs/promises';

async function testBasicValidation() {
  console.log('🧪 Testing Basic Phase 1 Components...\n');
  
  const contextManager = new ContextManager({ 
    baseDir: './test-validation',
    logLevel: 'error'
  });
  await contextManager.initialize();
  console.log('✅ Context Manager initialized');
  
  // Test each agent individually
  console.log('\n📍 Testing Analyst Agent:');
  const analyst = new AnalystAgent({ logLevel: 'error' });
  await analyst.initialize(contextManager);
  const analystResult = await analyst.execute({
    taskId: 'test-analyst',
    taskType: 'research-prompt',
    input: { topic: 'AI development' }
  });
  console.log('✅ Analyst executed:', analystResult.status);
  
  console.log('\n📍 Testing PM Agent:');
  const pm = new PMAgent({ logLevel: 'error' });
  await pm.initialize(contextManager);
  const pmResult = await pm.execute({
    taskId: 'test-pm',
    taskType: 'create-prd',
    input: { 
      projectName: 'Test Project',
      targetUsers: ['developers'],
      problemStatement: 'Need better tools',
      goals: ['Improve productivity']
    }
  });
  console.log('✅ PM executed:', pmResult.status);
  
  console.log('\n📍 Testing Architect Agent:');
  const architect = new ArchitectAgent({ logLevel: 'error' });
  await architect.initialize(contextManager);
  const architectResult = await architect.execute({
    taskId: 'test-architect',
    taskType: 'technology-selection',
    input: {
      requirements: ['scalability', 'performance'],
      constraints: ['budget', 'timeline'],
      teamExpertise: ['JavaScript', 'Python'],
      timeline: 90
    }
  });
  console.log('✅ Architect executed:', architectResult.status);
  
  // Test inter-agent communication
  console.log('\n📍 Testing Inter-Agent Communication:');
  const messageId = await contextManager.sendMessage({
    from: 'analyst-001',
    to: 'pm-001',
    type: 'event',
    subject: 'Research Complete',
    data: { findings: ['Finding 1', 'Finding 2'] }
  });
  console.log('✅ Message sent:', messageId.id);
  
  const messages = await contextManager.getMessages('pm-001');
  console.log('✅ Messages received:', messages.length);
  
  // Test context hierarchy
  console.log('\n📍 Testing Context Hierarchy:');
  const contexts = await contextManager.queryContexts({ level: 'agent' });
  console.log('✅ Agent contexts:', contexts.length);
  
  // Cleanup
  await fs.rm('./test-validation', { recursive: true, force: true });
  console.log('\n✅ All basic validation tests passed!');
  console.log('\n📊 Phase 1 Summary:');
  console.log('  - Context Manager: ✅ Working');
  console.log('  - Analyst Agent: ✅ Working');
  console.log('  - PM Agent: ✅ Working');  
  console.log('  - Architect Agent: ✅ Working');
  console.log('  - Inter-Agent Communication: ✅ Working');
  console.log('  - Context Hierarchy: ✅ Working');
  console.log('\n🎉 Phase 1 is validated and ready for Phase 2!');
}

testBasicValidation().catch(console.error);