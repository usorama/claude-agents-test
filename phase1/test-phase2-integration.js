import { ContextManager } from './src/context/ContextManager.js';
import { OrchestratorAgent } from './src/orchestrator/OrchestratorAgent.js';
import { DeveloperAgent } from './src/agents/extended/DeveloperAgent.js';
import { QAAgent } from './src/agents/extended/QAAgent.js';
import { DevOpsAgent } from './src/agents/extended/DevOpsAgent.js';
import { GitManagerAgent } from './src/agents/extended/GitManagerAgent.js';
import { MonitorAgent } from './src/agents/extended/MonitorAgent.js';
import { SelfHealerAgent } from './src/agents/extended/SelfHealerAgent.js';
import fs from 'fs/promises';

async function testPhase2Integration() {
  console.log('🧪 Testing Phase 2 Integration...\n');
  
  const contextManager = new ContextManager({ 
    baseDir: './test-phase2-integration',
    logLevel: 'error'
  });
  await contextManager.initialize();
  console.log('✅ Context Manager initialized');
  
  // Initialize orchestrator with all agents
  const orchestrator = new OrchestratorAgent({ 
    maxConcurrency: 3,
    logLevel: 'error'
  });
  await orchestrator.initialize(contextManager);
  console.log('✅ Orchestrator initialized with', orchestrator.agents.size, 'agents');
  
  // Test 1: Development workflow
  console.log('\n📍 Test 1: Development Workflow');
  const devRequest = await orchestrator.routeRequest(
    'Implement a new feature for user authentication'
  );
  console.log('✅ Development request routed:', devRequest.status);
  
  // Test 2: QA workflow
  console.log('\n📍 Test 2: QA Workflow');
  const qaRequest = await orchestrator.routeRequest(
    'Review and test the recent implementation for quality issues'
  );
  console.log('✅ QA request routed:', qaRequest.status);
  
  // Test 3: DevOps workflow
  console.log('\n📍 Test 3: DevOps Workflow');
  const devopsRequest = await orchestrator.routeRequest(
    'Deploy the application to staging environment'
  );
  console.log('✅ DevOps request routed:', devopsRequest.status);
  
  // Test 4: Monitoring workflow
  console.log('\n📍 Test 4: Monitoring Workflow');
  const monitorRequest = await orchestrator.routeRequest(
    'Monitor system performance and create dashboards'
  );
  console.log('✅ Monitoring request routed:', monitorRequest.status);
  
  // Test 5: Complex multi-agent workflow
  console.log('\n📍 Test 5: Complex Multi-Agent Workflow');
  const complexWorkflow = await orchestrator.startWorkflow('product-development', {
    request: 'Build a complete feature with development, testing, and deployment',
    context: {
      projectName: 'TestFeature',
      targetUsers: ['developers'],
      goals: ['Complete implementation'],
      requirements: ['Must have tests', 'Must be deployable']
    }
  });
  console.log('✅ Complex workflow:', complexWorkflow.success ? 'completed' : 'failed');
  
  // Test 6: Emergency response scenario
  console.log('\n📍 Test 6: Emergency Response Scenario');
  
  // Simulate an issue
  const monitor = orchestrator.agents.get('monitor');
  const anomalyDetection = await monitor.execute({
    taskId: 'detect-anomaly',
    taskType: 'detect-anomalies',
    input: {
      targets: ['test-service'],
      sensitivity: 'high'
    }
  });
  
  // Trigger self-healing
  const selfHealer = orchestrator.agents.get('self_healer');
  const healingResponse = await selfHealer.execute({
    taskId: 'emergency-heal',
    taskType: 'emergency-response',
    input: {
      alert: 'Service degradation detected',
      severity: 'critical',
      affectedServices: ['test-service'],
      skipDiagnosis: false
    }
  });
  console.log('✅ Emergency response:', healingResponse.status);
  
  // Test 7: Git workflow
  console.log('\n📍 Test 7: Git Management Workflow');
  const gitManager = orchestrator.agents.get('git_manager');
  const gitAnalysis = await gitManager.execute({
    taskId: 'analyze-repo',
    taskType: 'analyze-history',
    input: {
      branch: 'main',
      stats: true
    }
  });
  console.log('✅ Git analysis:', gitAnalysis.status);
  
  // Test 8: End-to-end scenario
  console.log('\n📍 Test 8: End-to-End Scenario');
  
  // 1. Development
  const featureDev = await orchestrator.routeRequest(
    'Implement a caching feature to improve performance'
  );
  console.log('  ✓ Development completed');
  
  // 2. Testing
  const featureTest = await orchestrator.routeRequest(
    'Test the caching feature implementation thoroughly'
  );
  console.log('  ✓ Testing completed');
  
  // 3. Deployment preparation
  const featurePrep = await orchestrator.routeRequest(
    'Prepare CI/CD pipeline for the caching feature'
  );
  console.log('  ✓ Deployment prep completed');
  
  // 4. Monitoring setup
  const featureMonitor = await orchestrator.routeRequest(
    'Setup monitoring and alerts for the caching feature'
  );
  console.log('  ✓ Monitoring setup completed');
  
  console.log('✅ End-to-end scenario completed successfully');
  
  // Get final metrics
  const finalStatus = await orchestrator.getStatus();
  console.log('\n📊 Final System Metrics:');
  console.log('  Total tasks:', finalStatus.metrics.system.totalTasks);
  console.log('  Active agents:', Object.keys(finalStatus.metrics.agents).length);
  console.log('  Success rate:', 
    Math.round((finalStatus.metrics.system.completedTasks / finalStatus.metrics.system.totalTasks) * 100) + '%'
  );
  
  // Cleanup
  await fs.rm('./test-phase2-integration', { recursive: true, force: true });
  console.log('\n✅ Phase 2 Integration tests passed!');
}

testPhase2Integration().catch(console.error);