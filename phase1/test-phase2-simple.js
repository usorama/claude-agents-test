import { ContextManager } from './src/context/ContextManager.js';
import { OrchestratorAgent } from './src/orchestrator/OrchestratorAgent.js';
import fs from 'fs/promises';

async function testPhase2Simple() {
  console.log('🧪 Testing Phase 2 Agent Registration...\n');
  
  const contextManager = new ContextManager({ 
    baseDir: './test-phase2-simple',
    logLevel: 'error'
  });
  await contextManager.initialize();
  console.log('✅ Context Manager initialized');
  
  // Initialize orchestrator
  const orchestrator = new OrchestratorAgent({ 
    maxConcurrency: 2,
    logLevel: 'error'
  });
  await orchestrator.initialize(contextManager);
  console.log('✅ Orchestrator initialized');
  
  // Check all agents are registered
  console.log('\n📍 Registered Agents:');
  const expectedAgents = [
    'analyst', 'pm', 'architect', 'developer', 'qa', 
    'devops', 'git_manager', 'monitor', 'self_healer'
  ];
  
  for (const agentType of expectedAgents) {
    const agent = orchestrator.agents.get(agentType);
    console.log(`  ${agentType}: ${agent ? '✅' : '❌'}`);
  }
  
  console.log('\n📍 Testing Agent Routing:');
  
  // Test routing for each agent type
  const testRequests = [
    { request: 'Research market trends', expected: 'analyst' },
    { request: 'Create a product roadmap', expected: 'pm' },
    { request: 'Design system architecture', expected: 'architect' },
    { request: 'Implement new feature', expected: 'developer' },
    { request: 'Test the application', expected: 'qa' },
    { request: 'Deploy to production', expected: 'devops' },
    { request: 'Monitor system health', expected: 'monitor' },
    { request: 'Create a git branch', expected: 'git_manager' },
    { request: 'Automatically heal service issues', expected: 'self_healer' }
  ];
  
  for (const test of testRequests) {
    try {
      const result = await orchestrator.routeRequest(test.request);
      const routedAgent = result.output?.tasks?.[0]?.agent || 'unknown';
      console.log(`  "${test.request}" → ${routedAgent} ${routedAgent === test.expected ? '✅' : '❌'}`);
    } catch (error) {
      console.log(`  "${test.request}" → Error: ${error.message} ❌`);
    }
  }
  
  // Test agent capabilities
  console.log('\n📍 Testing Agent Capabilities:');
  
  // Developer agent
  const developer = orchestrator.agents.get('developer');
  if (developer) {
    const devResult = await developer.execute({
      taskId: 'test-dev',
      taskType: 'write-tests',
      input: { targetPath: 'test.js', testType: 'unit' }
    });
    console.log('  Developer - Write Tests:', devResult.status === 'success' ? '✅' : '❌');
  }
  
  // QA agent
  const qa = orchestrator.agents.get('qa');
  if (qa) {
    const qaResult = await qa.execute({
      taskId: 'test-qa',
      taskType: 'perform-code-review',
      input: { files: ['test.js'], reviewType: 'basic' }
    });
    console.log('  QA - Code Review:', qaResult.status === 'success' ? '✅' : '❌');
  }
  
  // DevOps agent
  const devops = orchestrator.agents.get('devops');
  if (devops) {
    const devopsResult = await devops.execute({
      taskId: 'test-devops',
      taskType: 'setup-ci-cd',
      input: { platform: 'github-actions', projectType: 'node' }
    });
    console.log('  DevOps - CI/CD Setup:', devopsResult.status === 'success' ? '✅' : '❌');
  }
  
  // Git Manager agent
  const gitManager = orchestrator.agents.get('git_manager');
  if (gitManager) {
    const gitResult = await gitManager.execute({
      taskId: 'test-git',
      taskType: 'analyze-history',
      input: { branch: 'main' }
    });
    console.log('  Git Manager - History Analysis:', gitResult.status === 'success' ? '✅' : '❌');
  }
  
  // Monitor agent
  const monitor = orchestrator.agents.get('monitor');
  if (monitor) {
    const monitorResult = await monitor.execute({
      taskId: 'test-monitor',
      taskType: 'health-check',
      input: { checks: ['connectivity'] }
    });
    console.log('  Monitor - Health Check:', monitorResult.status === 'success' ? '✅' : '❌');
  }
  
  // Self-Healer agent
  const selfHealer = orchestrator.agents.get('self_healer');
  if (selfHealer) {
    const healerResult = await selfHealer.execute({
      taskId: 'test-healer',
      taskType: 'create-runbook',
      input: { title: 'Test Runbook', scenario: 'Test', steps: [] }
    });
    console.log('  Self-Healer - Create Runbook:', healerResult.status === 'success' ? '✅' : '❌');
  }
  
  // Get final status
  const status = await orchestrator.getStatus();
  console.log('\n📊 System Status:');
  console.log('  Total Agents:', orchestrator.agents.size);
  console.log('  Total Tasks:', status.metrics.system.totalTasks);
  console.log('  Health:', status.health);
  
  // Cleanup
  await fs.rm('./test-phase2-simple', { recursive: true, force: true });
  console.log('\n✅ Phase 2 Simple Integration Test Complete!');
}

testPhase2Simple().catch(console.error);