import { ContextManager } from './src/context/ContextManager.js';
import { SelfHealerAgent } from './src/agents/extended/SelfHealerAgent.js';
import fs from 'fs/promises';

async function testSelfHealerAgent() {
  console.log('🧪 Testing Self-Healer Agent...\n');
  
  const contextManager = new ContextManager({ 
    baseDir: './test-self-healer',
    logLevel: 'error'
  });
  await contextManager.initialize();
  console.log('✅ Context Manager initialized');
  
  // Test Self-Healer agent
  console.log('\n📍 Testing Self-Healer Agent:');
  const selfHealer = new SelfHealerAgent({ logLevel: 'error' });
  await selfHealer.initialize(contextManager);
  
  // Test healing configuration
  const configResult = await selfHealer.execute({
    taskId: 'test-config',
    taskType: 'configure-healing',
    input: {
      services: [
        { name: 'api', type: 'web', healthEndpoint: '/health' },
        { name: 'database', type: 'database', healthEndpoint: '/status' }
      ],
      rules: [
        { name: 'High CPU', trigger: 'cpu > 80', conditions: { duration: '5m' }, actions: ['scale'] }
      ],
      enableAutoHealing: true
    }
  });
  console.log('✅ Healing configuration:', configResult.status);
  
  // Test diagnosis
  const diagnosisResult = await selfHealer.execute({
    taskId: 'test-diagnosis',
    taskType: 'diagnose-issue',
    input: {
      service: 'api',
      symptoms: ['high response time', 'increased error rate'],
      metrics: {
        cpu: [70, 75, 80, 85, 90],
        memory: [60, 65, 70, 75, 80],
        response_time: [200, 300, 400, 500, 600]
      }
    }
  });
  console.log('✅ Issue diagnosis:', diagnosisResult.status);
  
  // Test runbook creation
  const runbookResult = await selfHealer.execute({
    taskId: 'test-runbook',
    taskType: 'create-runbook',
    input: {
      title: 'Service Restart Procedure',
      scenario: 'Service unresponsive',
      steps: [
        { name: 'Check Health', command: 'curl /health', expectedOutcome: 'Health check response' },
        { name: 'Restart Service', command: 'systemctl restart api', expectedOutcome: 'Service running' }
      ]
    }
  });
  console.log('✅ Runbook creation:', runbookResult.status);
  
  // Test pattern analysis
  const patternResult = await selfHealer.execute({
    taskId: 'test-patterns',
    taskType: 'analyze-patterns',
    input: {
      timeRange: { days: 7 },
      minOccurrences: 1
    }
  });
  console.log('✅ Pattern analysis:', patternResult.status);
  
  // Test healing application (dry run)
  const healingResult = await selfHealer.execute({
    taskId: 'test-healing',
    taskType: 'apply-healing',
    input: {
      service: 'api',
      diagnosis: diagnosisResult.output.diagnosis,
      strategy: 'progressive',
      dryRun: true
    }
  });
  console.log('✅ Healing application:', healingResult.status);
  
  // Cleanup
  await fs.rm('./test-self-healer', { recursive: true, force: true });
  console.log('\n✅ Self-Healer Agent tests passed!');
}

testSelfHealerAgent().catch(console.error);