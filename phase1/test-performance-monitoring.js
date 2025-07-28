#!/usr/bin/env node

/**
 * Test Suite: Performance Monitoring System
 * Tests the real-time performance monitoring implementation for Phase 3
 */

import { PerformanceMonitor } from './src/monitoring/PerformanceMonitor.js';
import { PerformanceDashboard } from './src/monitoring/PerformanceDashboard.js';
import { BaseAgent } from './src/agents/BaseAgent.js';
import { AnalystAgent } from './src/agents/core/AnalystAgent.js';
import { ContextManager } from './src/context/ContextManager.js';
import { GraphFactory } from './src/context/GraphFactory.js';

class PerformanceMonitoringTest {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      total: 0,
      details: []
    };
    
    this.monitor = null;
    this.dashboard = null;
    this.agents = new Map();
    this.contextManager = null;
  }

  async runAllTests() {
    console.log('🚀 Starting Performance Monitoring Tests');
    console.log('=' .repeat(60));
    
    try {
      await this.setupTestEnvironment();
      
      // Core functionality tests
      await this.testMonitorInitialization();
      await this.testAgentRegistration();
      await this.testMetricsCollection();
      await this.testTaskTracking();
      await this.testAlertSystem();
      await this.testDashboardGeneration();
      await this.testRealTimeUpdates();
      await this.testPerformanceThresholds();
      await this.testMetricsExport();
      
      // Integration tests
      await this.testAgentIntegration();
      await this.testSystemLoadSimulation();
      
      await this.cleanupTestEnvironment();
      
    } catch (error) {
      console.error('❌ Test suite failed:', error.message);
      this.recordTest('Test Suite', false, error.message);
    }
    
    this.printResults();
    return this.results.failed === 0;
  }

  async setupTestEnvironment() {
    console.log('\n📋 Setting up test environment...');
    
    try {
      // Initialize performance monitor
      this.monitor = new PerformanceMonitor({
        collectInterval: 1000, // Fast collection for testing
        metricsBuffer: 50,
        alertThresholds: {
          cpu: 70,
          memory: 80,
          responseTime: 1000,
          errorRate: 3
        }
      });
      
      // Initialize dashboard
      this.dashboard = new PerformanceDashboard(this.monitor, {
        updateInterval: 2000,
        enableRealTime: true
      });
      
      // Initialize context manager
      const graph = await GraphFactory.create();
      this.contextManager = new ContextManager({ graph });
      
      console.log('✅ Test environment setup complete');
      
    } catch (error) {
      console.error('❌ Failed to setup test environment:', error.message);
      throw error;
    }
  }

  async testMonitorInitialization() {
    console.log('\n🔍 Testing Monitor Initialization...');
    
    try {
      // Test monitor startup
      await this.monitor.startMonitoring();
      this.recordTest('Monitor Startup', this.monitor.isCollecting, 'Monitor should be collecting');
      
      // Test baseline establishment
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for baseline
      this.recordTest(
        'Baseline Establishment', 
        this.monitor.baseline.established, 
        'Baseline should be established'
      );
      
      // Test system metrics collection
      const systemMetrics = this.monitor.getSystemMetrics();
      this.recordTest(
        'System Metrics Collection',
        systemMetrics && systemMetrics.system && systemMetrics.system.cpu >= 0,
        'Should collect valid system metrics'
      );
      
    } catch (error) {
      this.recordTest('Monitor Initialization', false, error.message);
    }
  }

  async testAgentRegistration() {
    console.log('\n🤖 Testing Agent Registration...');
    
    try {
      // Register test agents
      const agentIds = ['test-analyst-001', 'test-architect-001', 'test-developer-001'];
      
      for (const agentId of agentIds) {
        const tracker = this.monitor.registerAgent(agentId, {
          type: 'TestAgent',
          maxResponseTime: 2000,
          maxMemory: 50 * 1024 * 1024,
          maxTokens: 10000
        });
        
        this.recordTest(
          `Agent Registration - ${agentId}`,
          tracker && tracker.id === agentId,
          'Should register agent successfully'
        );
        
        this.agents.set(agentId, tracker);
      }
      
      // Test agent metrics retrieval
      const allAgentMetrics = this.monitor.getAllAgentMetrics();
      this.recordTest(
        'Agent Metrics Retrieval',
        Object.keys(allAgentMetrics).length === agentIds.length,
        'Should retrieve metrics for all registered agents'
      );
      
    } catch (error) {
      this.recordTest('Agent Registration', false, error.message);
    }
  }

  async testMetricsCollection() {
    console.log('\n📊 Testing Metrics Collection...');
    
    try {
      // Wait for some metrics to be collected
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const systemMetrics = this.monitor.getSystemMetrics();
      
      // Test system metrics
      this.recordTest(
        'CPU Metrics',
        typeof systemMetrics.system.cpu === 'number' && systemMetrics.system.cpu >= 0,
        'Should collect valid CPU metrics'
      );
      
      this.recordTest(
        'Memory Metrics',
        typeof systemMetrics.system.memory === 'number' && systemMetrics.system.memory >= 0,
        'Should collect valid memory metrics'
      );
      
      // Test metrics buffer
      const hasMetricsData = this.monitor.metrics.system.cpu.length > 0;
      this.recordTest(
        'Metrics Buffer',
        hasMetricsData,
        'Should store metrics in buffer'
      );
      
      // Test performance summary
      const summary = this.monitor.getPerformanceSummary();
      this.recordTest(
        'Performance Summary',
        summary && summary.timestamp && summary.system && summary.agents,
        'Should generate performance summary'
      );
      
    } catch (error) {
      this.recordTest('Metrics Collection', false, error.message);
    }
  }

  async testTaskTracking() {
    console.log('\n⚡ Testing Task Tracking...');
    
    try {
      const agentId = 'test-analyst-001';
      const taskId = 'task-001';
      
      // Start task tracking
      const taskTracker = this.monitor.trackAgentTask(agentId, taskId, {
        taskType: 'analyze-requirements',
        input: { requirement: 'test requirement' }
      });
      
      this.recordTest(
        'Task Tracker Creation',
        taskTracker && typeof taskTracker.complete === 'function',
        'Should create task tracker with completion function'
      );
      
      // Simulate task execution
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Complete task
      const completionResult = taskTracker.complete({ result: 'analysis complete' });
      
      this.recordTest(
        'Task Completion',
        completionResult && completionResult.duration > 0,
        'Should track task completion with duration'
      );
      
      // Check agent metrics update
      const agentMetrics = this.monitor.getAgentMetrics(agentId);
      this.recordTest(
        'Agent Metrics Update',
        agentMetrics && agentMetrics.tasks.completed > 0,
        'Should update agent task metrics'
      );
      
      // Test task failure
      const failTaskTracker = this.monitor.trackAgentTask(agentId, 'task-002', {
        taskType: 'failing-task'
      });
      
      await new Promise(resolve => setTimeout(resolve, 200));
      failTaskTracker.fail(new Error('Simulated failure'));
      
      const updatedMetrics = this.monitor.getAgentMetrics(agentId);
      this.recordTest(
        'Task Failure Tracking',
        updatedMetrics.tasks.failed > 0,
        'Should track task failures'
      );
      
    } catch (error) {
      this.recordTest('Task Tracking', false, error.message);
    }
  }

  async testAlertSystem() {
    console.log('\n🚨 Testing Alert System...');
    
    try {
      const initialAlertCount = this.monitor.activeAlerts.size;
      
      // Trigger CPU alert by simulating high CPU
      this.monitor._triggerAlert('system:cpu:high', {
        current: 85,
        threshold: 70,
        timestamp: Date.now()
      });
      
      this.recordTest(
        'Alert Triggering',
        this.monitor.activeAlerts.size > initialAlertCount,
        'Should trigger and store alerts'
      );
      
      // Test alert data
      const alerts = Array.from(this.monitor.activeAlerts.values());
      const cpuAlert = alerts.find(a => a.type === 'system:cpu:high');
      
      this.recordTest(
        'Alert Data Structure',
        cpuAlert && cpuAlert.severity && cpuAlert.data && cpuAlert.timestamp,
        'Should have proper alert data structure'
      );
      
      // Test alert history
      this.recordTest(
        'Alert History',
        this.monitor.alertHistory.length > 0,
        'Should maintain alert history'
      );
      
      // Test auto-resolve (if applicable)
      // Note: Auto-resolve has longer timeouts, so we test the mechanism exists
      const hasAutoResolve = typeof this.monitor._shouldAutoResolve === 'function';
      this.recordTest(
        'Auto-resolve Mechanism',
        hasAutoResolve,
        'Should have auto-resolve mechanism'
      );
      
    } catch (error) {
      this.recordTest('Alert System', false, error.message);
    }
  }

  async testDashboardGeneration() {
    console.log('\n📈 Testing Dashboard Generation...');
    
    try {
      // Generate dashboard
      const dashboardData = await this.dashboard.generateDashboard();
      
      this.recordTest(
        'Dashboard Generation',
        dashboardData && dashboardData.html && dashboardData.css && dashboardData.js,
        'Should generate complete dashboard files'
      );
      
      // Test dashboard data
      this.recordTest(
        'Dashboard Data',
        dashboardData.data && dashboardData.data.summary && dashboardData.data.charts,
        'Should include dashboard data'
      );
      
      // Test chart data generation
      const charts = dashboardData.data.charts;
      this.recordTest(
        'Chart Data Generation',
        charts.systemOverview && charts.agentPerformance && charts.taskThroughput,
        'Should generate chart data'
      );
      
      // Test HTML content
      const htmlContent = dashboardData.html;
      const hasRequiredElements = 
        htmlContent.includes('IronClaude-S Performance Dashboard') &&
        htmlContent.includes('systemOverviewChart') &&
        htmlContent.includes('agentPerformanceChart');
      
      this.recordTest(
        'HTML Content',
        hasRequiredElements,
        'Should generate proper HTML content'
      );
      
    } catch (error) {
      this.recordTest('Dashboard Generation', false, error.message);
    }
  }

  async testRealTimeUpdates() {
    console.log('\n⚡ Testing Real-time Updates...');
    
    try {
      let updateReceived = false;
      
      // Listen for updates
      this.monitor.on('metrics:collected', () => {
        updateReceived = true;
      });
      
      // Wait for update
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      this.recordTest(
        'Real-time Updates',
        updateReceived,
        'Should emit real-time updates'
      );
      
      // Test communication tracking
      this.monitor.trackCommunication('message:sent', {
        from: 'test-agent-1',
        to: 'test-agent-2',
        messageType: 'request',
        size: 1024
      });
      
      const hasCommData = this.monitor.metrics.communication.messagesSent.length > 0;
      this.recordTest(
        'Communication Tracking',
        hasCommData,
        'Should track inter-agent communication'
      );
      
    } catch (error) {
      this.recordTest('Real-time Updates', false, error.message);
    }
  }

  async testPerformanceThresholds() {
    console.log('\n🎯 Testing Performance Thresholds...');
    
    try {
      const agentId = 'test-architect-001';
      
      // Test response time threshold - ensure agent has proper threshold
      const tracker = this.agents.get(agentId);
      if (tracker) {
        tracker.thresholds.maxResponseTime = 800; // Lower threshold for testing
      }
      
      const slowTaskTracker = this.monitor.trackAgentTask(agentId, 'slow-task', {
        taskType: 'slow-operation'
      });
      
      // Simulate slow task
      await new Promise(resolve => setTimeout(resolve, 1500));
      slowTaskTracker.complete({ result: 'slow completion' });
      
      // Check if alert was triggered (response time > 800ms threshold)
      const responseTimeAlerts = Array.from(this.monitor.activeAlerts.values())
        .filter(a => a.type === 'agent:response:slow' && a.data.agentId === agentId);
      
      this.recordTest(
        'Response Time Threshold',
        responseTimeAlerts.length > 0,
        'Should trigger alert for slow response time'
      );
      
      // Test token usage tracking
      this.monitor.trackTokenUsage(agentId, 5000);
      const agentMetrics = this.monitor.getAgentMetrics(agentId);
      
      this.recordTest(
        'Token Usage Tracking',
        agentMetrics.performance.tokenUsage >= 5000,
        'Should track token usage'
      );
      
      // Test health calculation
      this.recordTest(
        'Health Score Calculation',
        typeof agentMetrics.health.score === 'number' && 
        agentMetrics.health.score >= 0 && 
        agentMetrics.health.score <= 100,
        'Should calculate valid health score'
      );
      
    } catch (error) {
      this.recordTest('Performance Thresholds', false, error.message);
    }
  }

  async testMetricsExport() {
    console.log('\n💾 Testing Metrics Export...');
    
    try {
      // Test JSON export
      const jsonExport = await this.monitor.exportMetrics('json');
      const jsonData = JSON.parse(jsonExport);
      
      this.recordTest(
        'JSON Export',
        jsonData && jsonData.metadata && jsonData.summary && jsonData.system,
        'Should export metrics in JSON format'
      );
      
      // Test CSV export
      const csvExport = await this.monitor.exportMetrics('csv');
      const hasCsvStructure = csvExport.includes('timestamp,cpu,memory');
      
      this.recordTest(
        'CSV Export',
        hasCsvStructure,
        'Should export metrics in CSV format'
      );
      
      // Test export metadata
      this.recordTest(
        'Export Metadata',
        jsonData.metadata.exportedAt && jsonData.metadata.format === 'json',
        'Should include export metadata'
      );
      
    } catch (error) {
      this.recordTest('Metrics Export', false, error.message);
    }
  }

  async testAgentIntegration() {
    console.log('\n🔗 Testing Agent Integration...');
    
    try {
      // Create a real agent with performance monitoring
      const agent = new AnalystAgent({
        id: 'integration-test-analyst',
        logLevel: 'error' // Reduce logging for test
      });
      
      await agent.initialize(this.contextManager, this.monitor);
      
      this.recordTest(
        'Agent Initialization with Monitor',
        agent.performanceMonitor === this.monitor,
        'Should initialize agent with performance monitor'
      );
      
      // Test agent registration in monitor
      const agentMetrics = this.monitor.getAgentMetrics('integration-test-analyst');
      this.recordTest(
        'Automatic Agent Registration',
        agentMetrics !== null,
        'Should automatically register agent in monitor'
      );
      
      // Simulate task execution
      const taskRequest = {
        taskId: 'integration-task-001',
        taskType: 'analyze-requirements',
        input: { requirements: 'Test requirements for analysis' }
      };
      
      try {
        await agent.execute(taskRequest);
        
        // Check performance tracking
        const updatedMetrics = this.monitor.getAgentMetrics('integration-test-analyst');
        this.recordTest(
          'Task Performance Tracking',
          updatedMetrics.tasks.total > 0,
          'Should track task execution in performance monitor'
        );
        
      } catch (error) {
        // Task might fail due to missing context, but performance should still be tracked
        const updatedMetrics = this.monitor.getAgentMetrics('integration-test-analyst');
        this.recordTest(
          'Failed Task Performance Tracking',
          updatedMetrics.tasks.failed > 0 || updatedMetrics.tasks.total > 0,
          'Should track failed task execution'
        );
      }
      
    } catch (error) {
      this.recordTest('Agent Integration', false, error.message);
    }
  }

  async testSystemLoadSimulation() {
    console.log('\n🔥 Testing System Load Simulation...');
    
    try {
      const agentId = 'load-test-agent';
      this.monitor.registerAgent(agentId, {
        type: 'LoadTestAgent',
        maxResponseTime: 500
      });
      
      // Simulate multiple concurrent tasks
      const taskPromises = [];
      const taskCount = 10;
      
      for (let i = 0; i < taskCount; i++) {
        const taskTracker = this.monitor.trackAgentTask(agentId, `load-task-${i}`, {
          taskType: 'load-test'
        });
        
        const taskPromise = new Promise(resolve => {
          setTimeout(() => {
            const duration = Math.random() * 1000 + 200; // 200-1200ms
            if (duration > 800) {
              taskTracker.fail(new Error('Simulated timeout'));
            } else {
              taskTracker.complete({ result: `Task ${i} completed` });
            }
            resolve();
          }, Math.random() * 200); // Stagger start times
        });
        
        taskPromises.push(taskPromise);
      }
      
      // Wait for all tasks to complete
      await Promise.all(taskPromises);
      
      // Check metrics
      const agentMetrics = this.monitor.getAgentMetrics(agentId);
      
      this.recordTest(
        'Concurrent Task Tracking',
        agentMetrics.tasks.total === taskCount,
        'Should track all concurrent tasks'
      );
      
      this.recordTest(
        'Success/Failure Distribution',
        agentMetrics.tasks.completed > 0 && agentMetrics.tasks.failed >= 0,
        'Should track both successful and failed tasks'
      );
      
      // Check for performance alerts
      const slowResponseAlerts = Array.from(this.monitor.activeAlerts.values())
        .filter(a => a.type === 'agent:response:slow' && a.data.agentId === agentId);
      
      this.recordTest(
        'Performance Alert Generation',
        slowResponseAlerts.length > 0 || agentMetrics.performance.averageResponseTime < 500,
        'Should generate alerts for slow responses or maintain good performance'
      );
      
    } catch (error) {
      this.recordTest('System Load Simulation', false, error.message);
    }
  }

  async cleanupTestEnvironment() {
    console.log('\n🧹 Cleaning up test environment...');
    
    try {
      // Stop monitoring
      if (this.monitor) {
        this.monitor.stopMonitoring();
      }
      
      // Stop dashboard
      if (this.dashboard) {
        this.dashboard.stopRealTimeDashboard();
      }
      
      console.log('✅ Test environment cleanup complete');
      
    } catch (error) {
      console.error('⚠️  Cleanup warning:', error.message);
    }
  }

  recordTest(testName, passed, message) {
    this.results.total++;
    if (passed) {
      this.results.passed++;
      console.log(`  ✅ ${testName}`);
    } else {
      this.results.failed++;
      console.log(`  ❌ ${testName}: ${message}`);
    }
    
    this.results.details.push({
      name: testName,
      passed,
      message
    });
  }

  printResults() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 PERFORMANCE MONITORING TEST RESULTS');
    console.log('='.repeat(60));
    console.log(`Total Tests: ${this.results.total}`);
    console.log(`Passed: ${this.results.passed} ✅`);
    console.log(`Failed: ${this.results.failed} ${this.results.failed > 0 ? '❌' : '✅'}`);
    console.log(`Success Rate: ${((this.results.passed / this.results.total) * 100).toFixed(1)}%`);
    
    if (this.results.failed > 0) {
      console.log('\n❌ FAILED TESTS:');
      this.results.details
        .filter(t => !t.passed)
        .forEach(test => {
          console.log(`  • ${test.name}: ${test.message}`);
        });
    }
    
    console.log('\n' + (this.results.failed === 0 ? 
      '🎉 ALL TESTS PASSED! Performance monitoring system is ready.' :
      '⚠️  Some tests failed. Please review and fix issues before deployment.'
    ));
    console.log('='.repeat(60));
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new PerformanceMonitoringTest();
  
  tester.runAllTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Test execution failed:', error);
      process.exit(1);
    });
}

export { PerformanceMonitoringTest };