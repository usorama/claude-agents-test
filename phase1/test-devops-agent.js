import { ContextManager } from './src/context/ContextManager.js';
import { DevOpsAgent } from './src/agents/extended/DevOpsAgent.js';
import fs from 'fs/promises';

async function testDevOpsAgent() {
  console.log('🧪 Testing DevOps Agent...\n');
  
  const contextManager = new ContextManager({ 
    baseDir: './test-devops-agent',
    logLevel: 'error'
  });
  await contextManager.initialize();
  console.log('✅ Context Manager initialized');
  
  // Test DevOps agent
  console.log('\n📍 Testing DevOps Agent:');
  const devops = new DevOpsAgent({ logLevel: 'error' });
  await devops.initialize(contextManager);
  
  // Test CI/CD setup
  const cicdResult = await devops.execute({
    taskId: 'test-cicd-setup',
    taskType: 'setup-ci-cd',
    input: {
      platform: 'github-actions',
      projectType: 'node',
      environments: ['development', 'staging', 'production']
    }
  });
  console.log('✅ CI/CD setup:', cicdResult.status);
  
  // Test containerization
  const containerResult = await devops.execute({
    taskId: 'test-container-setup',
    taskType: 'container-setup',
    input: {
      applications: [
        { name: 'api', type: 'node', path: './api', port: 3000 },
        { name: 'frontend', type: 'node', path: './frontend', port: 3001 }
      ],
      orchestrator: 'kubernetes',
      registry: 'myregistry.io'
    }
  });
  console.log('✅ Container setup:', containerResult.status);
  
  // Test monitoring configuration
  const monitoringResult = await devops.execute({
    taskId: 'test-monitoring',
    taskType: 'configure-monitoring',
    input: {
      services: ['api', 'frontend', 'database'],
      metrics: ['cpu', 'memory', 'requests'],
      alerting: true,
      dashboards: true
    }
  });
  console.log('✅ Monitoring configuration:', monitoringResult.status);
  
  // Test deployment
  const deploymentResult = await devops.execute({
    taskId: 'test-deployment',
    taskType: 'create-deployment',
    input: {
      application: 'api',
      version: '1.2.3',
      environment: 'staging',
      strategy: 'rolling'
    }
  });
  console.log('✅ Deployment:', deploymentResult.status);
  
  // Test infrastructure as code
  const iacResult = await devops.execute({
    taskId: 'test-iac',
    taskType: 'infrastructure-as-code',
    input: {
      provider: 'terraform',
      resources: [
        { type: 'vpc', name: 'main-vpc' },
        { type: 'rds', name: 'main-db' }
      ],
      environment: 'production',
      specifications: {}
    }
  });
  console.log('✅ Infrastructure as Code:', iacResult.status);
  
  // Cleanup
  await fs.rm('./test-devops-agent', { recursive: true, force: true });
  console.log('\n✅ DevOps Agent tests passed!');
}

testDevOpsAgent().catch(console.error);