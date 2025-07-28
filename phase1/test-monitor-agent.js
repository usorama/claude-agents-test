import { ContextManager } from './src/context/ContextManager.js';
import { MonitorAgent } from './src/agents/extended/MonitorAgent.js';
import fs from 'fs/promises';

async function testMonitorAgent() {
  console.log('🧪 Testing Monitor Agent...\n');
  
  const contextManager = new ContextManager({ 
    baseDir: './test-monitor-agent',
    logLevel: 'error'
  });
  await contextManager.initialize();
  console.log('✅ Context Manager initialized');
  
  // Test Monitor agent
  console.log('\n📍 Testing Monitor Agent:');
  const monitor = new MonitorAgent({ logLevel: 'error' });
  await monitor.initialize(contextManager);
  
  // Test monitoring setup
  const setupResult = await monitor.execute({
    taskId: 'test-setup',
    taskType: 'setup-monitoring',
    input: {
      targets: [
        { name: 'api-service', type: 'application', endpoint: 'localhost:3000' },
        { name: 'database', type: 'system', endpoint: 'localhost:5432' }
      ],
      metricsTypes: ['system', 'application'],
      interval: 60
    }
  });
  console.log('✅ Monitoring setup:', setupResult.status);
  
  // Test metrics collection
  const metricsResult = await monitor.execute({
    taskId: 'test-metrics',
    taskType: 'collect-metrics',
    input: {
      immediate: true
    }
  });
  console.log('✅ Metrics collection:', metricsResult.status);
  
  // Test health check
  const healthResult = await monitor.execute({
    taskId: 'test-health',
    taskType: 'health-check',
    input: {
      checks: ['connectivity', 'performance', 'resources']
    }
  });
  console.log('✅ Health check:', healthResult.status);
  
  // Test dashboard creation
  const dashboardResult = await monitor.execute({
    taskId: 'test-dashboard',
    taskType: 'create-dashboard',
    input: {
      name: 'System Overview',
      widgets: [
        { type: 'line', title: 'CPU Usage', metric: 'cpu_usage' },
        { type: 'line', title: 'Memory Usage', metric: 'memory_usage' }
      ]
    }
  });
  console.log('✅ Dashboard creation:', dashboardResult.status);
  
  // Test alert configuration
  const alertResult = await monitor.execute({
    taskId: 'test-alerts',
    taskType: 'configure-alerts',
    input: {
      rules: [
        { name: 'High CPU', condition: 'cpu > threshold', threshold: 80, severity: 'warning' },
        { name: 'Low Memory', condition: 'memory > threshold', threshold: 90, severity: 'critical' }
      ],
      channels: ['email']
    }
  });
  console.log('✅ Alert configuration:', alertResult.status);
  
  // Cleanup
  await fs.rm('./test-monitor-agent', { recursive: true, force: true });
  console.log('\n✅ Monitor Agent tests passed!');
}

testMonitorAgent().catch(console.error);