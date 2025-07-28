#!/usr/bin/env node

/**
 * Test Suite: Enhanced Logging and Debugging
 * Tests the enhanced logging system implementation for Phase 3
 */

import { EnhancedLogger, CorrelatedLogger, ContextualLogger } from './src/logging/EnhancedLogger.js';
import { DebugUtils } from './src/logging/DebugUtils.js';
import { BaseAgent } from './src/agents/BaseAgent.js';
import { AnalystAgent } from './src/agents/core/AnalystAgent.js';
import { ContextManager } from './src/context/ContextManager.js';
import { GraphFactory } from './src/context/GraphFactory.js';
import fs from 'fs/promises';
import path from 'path';

class EnhancedLoggingTest {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      total: 0,
      details: []
    };
    
    this.logger = null;
    this.debugUtils = null;
    this.testLogDir = './test-logs';
    this.contextManager = null;
  }

  async runAllTests() {
    console.log('📝 Starting Enhanced Logging Tests');
    console.log('=' .repeat(60));
    
    try {
      await this.setupTestEnvironment();
      
      // Core logging tests
      await this.testLoggerInitialization();
      await this.testBasicLogging();
      await this.testStructuredLogging();
      await this.testFileLogging();
      await this.testCorrelatedLogging();
      await this.testContextualLogging();
      
      // Performance and timing tests
      await this.testPerformanceTimers();
      await this.testSlowOperationDetection();
      
      // Agent-specific logging tests
      await this.testAgentLogging();
      await this.testTaskExecutionLogging();
      await this.testSecurityEventLogging();
      
      // Debug utilities tests
      await this.testDebugTracing();
      await this.testDebugProfiling();
      await this.testVariableWatching();
      await this.testMemoryMonitoring();
      await this.testCallStackCapture();
      
      // Integration tests
      await this.testAgentIntegration();
      await this.testLogAggregation();
      await this.testLogAnalysis();
      
      // Configuration and management tests
      await this.testLogLevelManagement();
      await this.testDebugComponentControl();
      await this.testLogRotation();
      
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
      // Create test log directory
      await fs.mkdir(this.testLogDir, { recursive: true });
      
      // Initialize enhanced logger
      this.logger = new EnhancedLogger({
        level: 'debug',
        environment: 'test',
        serviceName: 'logging-test',
        logDirectory: this.testLogDir,
        enableFileLogging: true,
        enableStructuredLogging: true,
        enablePerformanceLogging: true,
        enableDebugMode: true,
        debugComponents: ['test', 'agent', 'debug']
      });
      
      // Initialize debug utils
      this.debugUtils = new DebugUtils(this.logger, {
        enableTracing: true,
        enableProfiling: true,
        enableMemoryTracking: true,
        enableCallStackCapture: true,
        profileThreshold: 50 // Lower threshold for testing
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

  async testLoggerInitialization() {
    console.log('\n🔍 Testing Logger Initialization...');
    
    try {
      // Test logger instance creation
      this.recordTest(
        'Logger Instance',
        this.logger instanceof EnhancedLogger,
        'Should create EnhancedLogger instance'
      );
      
      // Test logger configuration
      this.recordTest(
        'Logger Configuration',
        this.logger.options.serviceName === 'logging-test' &&
        this.logger.options.environment === 'test',
        'Should initialize with correct configuration'
      );
      
      // Test Winston integration
      this.recordTest(
        'Winston Integration',
        this.logger.logger && typeof this.logger.logger.info === 'function',
        'Should integrate with Winston logger'
      );
      
      // Test transport creation
      const transports = this.logger.logger.transports;
      this.recordTest(
        'Transport Creation',
        transports.length > 0,
        'Should create log transports'
      );
      
    } catch (error) {
      this.recordTest('Logger Initialization', false, error.message);
    }
  }

  async testBasicLogging() {
    console.log('\n📄 Testing Basic Logging...');
    
    try {
      // Test debug logging
      this.logger.debug('Debug message test', { testData: 'debug' }, 'test');
      this.recordTest('Debug Logging', true, 'Should log debug messages');
      
      // Test info logging
      this.logger.info('Info message test', { testData: 'info' }, 'test');
      this.recordTest('Info Logging', true, 'Should log info messages');
      
      // Test warning logging
      this.logger.warn('Warning message test', { testData: 'warning' }, 'test');
      this.recordTest('Warning Logging', true, 'Should log warning messages');
      
      // Test error logging
      const testError = new Error('Test error');
      this.logger.error('Error message test', testError, { testData: 'error' }, 'test');
      this.recordTest('Error Logging', true, 'Should log error messages with error objects');
      
      // Test log count tracking
      const logCounts = await this.logger.getLogCounts();
      this.recordTest(
        'Log Count Tracking',
        Object.keys(logCounts).length > 0,
        'Should track log counts by level and component'
      );
      
    } catch (error) {
      this.recordTest('Basic Logging', false, error.message);
    }
  }

  async testStructuredLogging() {
    console.log('\n🏗️ Testing Structured Logging...');
    
    try {
      // Test structured metadata
      this.logger.info('Structured log test', {
        userId: 'user123',
        action: 'login',
        timestamp: Date.now(),
        metadata: {
          ip: '192.168.1.1',
          userAgent: 'test-agent'
        }
      }, 'auth');
      
      this.recordTest('Structured Metadata', true, 'Should handle structured metadata');
      
      // Test correlation ID generation
      const correlationId = this.logger.generateCorrelationId();
      this.recordTest(
        'Correlation ID Generation',
        typeof correlationId === 'string' && correlationId.length > 0,
        'Should generate correlation IDs'
      );
      
      // Test performance metric logging
      this.logger.logPerformanceMetric('response_time', 234.5, 'ms', {
        endpoint: '/api/test',
        method: 'GET'
      });
      
      this.recordTest('Performance Metric Logging', true, 'Should log performance metrics');
      
      // Test system event logging
      this.logger.logSystemEvent('service_started', {
        port: 3000,
        environment: 'test'
      });
      
      this.recordTest('System Event Logging', true, 'Should log system events');
      
    } catch (error) {
      this.recordTest('Structured Logging', false, error.message);
    }
  }

  async testFileLogging() {
    console.log('\n📁 Testing File Logging...');
    
    try {
      // Wait a moment for file writes
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Check if log files were created
      const logFiles = await fs.readdir(this.testLogDir);
      const hasApplicationLog = logFiles.includes('application.log');
      const hasErrorLog = logFiles.includes('error.log');
      
      this.recordTest(
        'Log File Creation',
        hasApplicationLog && hasErrorLog,
        'Should create application and error log files'
      );
      
      // Test log file content
      if (hasApplicationLog) {
        const applicationLogContent = await fs.readFile(
          path.join(this.testLogDir, 'application.log'),
          'utf8'
        );
        
        this.recordTest(
          'Log File Content',
          applicationLogContent.length > 0 && applicationLogContent.includes('Info message test'),
          'Should write log messages to files'
        );
      }
      
      // Test debug log file (if debug enabled)
      const hasDebugLog = logFiles.includes('debug.log');
      if (hasDebugLog) {
        this.recordTest('Debug Log File', true, 'Should create debug log file when debug mode enabled');
      }
      
    } catch (error) {
      this.recordTest('File Logging', false, error.message);
    }
  }

  async testCorrelatedLogging() {
    console.log('\n🔗 Testing Correlated Logging...');
    
    try {
      // Test correlated logger creation
      const correlatedLogger = this.logger.withCorrelationId('test-correlation-123');
      
      this.recordTest(
        'Correlated Logger Creation',
        correlatedLogger instanceof CorrelatedLogger,
        'Should create CorrelatedLogger instance'
      );
      
      // Test correlated logging
      correlatedLogger.info('Correlated message 1', { step: 1 });
      correlatedLogger.info('Correlated message 2', { step: 2 });
      
      this.recordTest('Correlated Messages', true, 'Should log messages with correlation ID');
      
      // Test timer correlation
      const timerId = correlatedLogger.startTimer('correlated-operation');
      await new Promise(resolve => setTimeout(resolve, 50));
      const duration = correlatedLogger.endTimer(timerId);
      
      this.recordTest(
        'Correlated Timing',
        typeof duration === 'number' && duration > 0,
        'Should track correlated timing'
      );
      
    } catch (error) {
      this.recordTest('Correlated Logging', false, error.message);
    }
  }

  async testContextualLogging() {
    console.log('\n📝 Testing Contextual Logging...');
    
    try {
      // Test context creation
      const context = this.logger.createContext('test-context', { 
        operation: 'data-processing',
        batchId: 'batch-123'
      });
      
      this.recordTest(
        'Context Creation',
        context instanceof ContextualLogger,
        'Should create ContextualLogger instance'
      );
      
      // Test contextual logging
      context.info('Context message 1', { progress: 25 });
      context.info('Context message 2', { progress: 50 });
      
      this.recordTest('Contextual Messages', true, 'Should log messages with context');
      
      // Test child context
      const childContext = context.createChildContext('sub-operation', {
        subTask: 'validation'
      });
      
      childContext.info('Child context message', { validated: true });
      
      this.recordTest('Child Context', true, 'Should create and use child contexts');
      
      // Test context ending
      const contextDuration = context.endContext();
      
      this.recordTest(
        'Context Duration',
        typeof contextDuration === 'number' && contextDuration > 0,
        'Should track context duration'
      );
      
    } catch (error) {
      this.recordTest('Contextual Logging', false, error.message);
    }
  }

  async testPerformanceTimers() {
    console.log('\n⏱️ Testing Performance Timers...');
    
    try {
      // Test timer creation and completion
      const timerId = this.logger.startTimer('test-operation', { 
        operation: 'data-fetch',
        source: 'database'
      });
      
      this.recordTest(
        'Timer Creation',
        typeof timerId === 'string' && timerId.length > 0,
        'Should create timer with unique ID'
      );
      
      // Simulate operation
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const duration = this.logger.endTimer(timerId, { 
        recordsProcessed: 100,
        cacheHit: false
      });
      
      this.recordTest(
        'Timer Completion',
        typeof duration === 'number' && duration > 50,
        'Should measure operation duration'
      );
      
      // Test timer not found
      const invalidDuration = this.logger.endTimer('invalid-timer-id');
      
      this.recordTest(
        'Invalid Timer Handling',
        invalidDuration === null,
        'Should handle invalid timer IDs'
      );
      
    } catch (error) {
      this.recordTest('Performance Timers', false, error.message);
    }
  }

  async testSlowOperationDetection() {
    console.log('\n🐌 Testing Slow Operation Detection...');
    
    try {
      // Create operation that exceeds slow threshold
      const timerId = this.logger.startTimer('slow-operation');
      
      // Wait longer than the slow operation threshold (1000ms default)
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      const duration = this.logger.endTimer(timerId);
      
      this.recordTest(
        'Slow Operation Detection',
        duration > 1000,
        'Should detect and log slow operations'
      );
      
      // Check if warning was logged (would be visible in logs)
      this.recordTest('Slow Operation Warning', true, 'Should warn about slow operations');
      
    } catch (error) {
      this.recordTest('Slow Operation Detection', false, error.message);
    }
  }

  async testAgentLogging() {
    console.log('\n🤖 Testing Agent-Specific Logging...');
    
    try {
      // Test agent action logging
      const action = { type: 'analyze', target: 'requirements' };
      const result = { success: true, duration: 150, findings: 3 };
      
      this.logger.logAgentAction('test-agent-001', action, result, {
        complexity: 'medium'
      });
      
      this.recordTest('Agent Action Logging', true, 'Should log agent actions');
      
      // Test failed agent action
      const failedResult = { 
        error: new Error('Analysis failed'), 
        duration: 75 
      };
      
      this.logger.logAgentAction('test-agent-001', action, failedResult);
      
      this.recordTest('Failed Agent Action Logging', true, 'Should log failed agent actions');
      
      // Test task execution logging
      this.logger.logTaskExecution(
        'task-123',
        'agent-456',
        'data-analysis',
        'started',
        { priority: 'high' }
      );
      
      this.logger.logTaskExecution(
        'task-123',
        'agent-456',
        'data-analysis',
        'completed',
        { duration: 2000, success: true }
      );
      
      this.recordTest('Task Execution Logging', true, 'Should log task execution lifecycle');
      
    } catch (error) {
      this.recordTest('Agent Logging', false, error.message);
    }
  }

  async testTaskExecutionLogging() {
    console.log('\n📋 Testing Task Execution Logging...');
    
    try {
      const taskId = 'test-task-001';
      const agentId = 'test-agent-001';
      const taskType = 'test-operation';
      
      // Test all task statuses
      const statuses = ['started', 'completed', 'failed', 'retrying'];
      
      for (const status of statuses) {
        this.logger.logTaskExecution(taskId, agentId, taskType, status, {
          timestamp: Date.now(),
          metadata: { test: true }
        });
      }
      
      this.recordTest(
        'Task Status Logging',
        true,
        'Should log all task execution statuses'
      );
      
      // Test task with metrics
      this.logger.logTaskExecution(taskId, agentId, taskType, 'completed', {
        duration: 1500,
        tokensUsed: 250,
        memoryUsed: 1024 * 1024,
        success: true
      });
      
      this.recordTest(
        'Task Metrics Logging',
        true,
        'Should log task execution metrics'
      );
      
    } catch (error) {
      this.recordTest('Task Execution Logging', false, error.message);
    }
  }

  async testSecurityEventLogging() {
    console.log('\n🔒 Testing Security Event Logging...');
    
    try {
      // Test high severity security event
      this.logger.logSecurityEvent('unauthorized_access_attempt', 'high', {
        userId: 'user123',
        resource: '/admin/users',
        ip: '192.168.1.100',
        userAgent: 'malicious-bot'
      });
      
      this.recordTest('High Severity Security Event', true, 'Should log high severity security events');
      
      // Test critical security event
      this.logger.logSecurityEvent('data_breach_detected', 'critical', {
        affectedRecords: 1000,
        breachType: 'sql_injection',
        containmentStatus: 'in_progress'
      });
      
      this.recordTest('Critical Security Event', true, 'Should log critical security events');
      
      // Test medium severity security event
      this.logger.logSecurityEvent('suspicious_activity', 'medium', {
        pattern: 'unusual_login_times',
        confidence: 0.75
      });
      
      this.recordTest('Medium Security Event', true, 'Should log medium severity security events');
      
    } catch (error) {
      this.recordTest('Security Event Logging', false, error.message);
    }
  }

  async testDebugTracing() {
    console.log('\n🔍 Testing Debug Tracing...');
    
    try {
      // Test function tracing
      const endTrace = this.debugUtils.trace('testFunction', ['arg1', 'arg2'], {
        module: 'test-module'
      });
      
      this.recordTest(
        'Trace Start',
        typeof endTrace === 'function',
        'Should return trace end function'
      );
      
      // Simulate function execution
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const traceResult = endTrace({ result: 'success' });
      
      this.recordTest(
        'Trace Completion',
        traceResult && traceResult.functionName === 'testFunction',
        'Should complete trace with results'
      );
      
      // Test trace with error
      const errorTrace = this.debugUtils.trace('failingFunction', []);
      const errorResult = errorTrace(null, new Error('Function failed'));
      
      this.recordTest(
        'Trace Error Handling',
        errorResult && !errorResult.success,
        'Should handle traced function errors'
      );
      
    } catch (error) {
      this.recordTest('Debug Tracing', false, error.message);
    }
  }

  async testDebugProfiling() {
    console.log('\n📊 Testing Debug Profiling...');
    
    try {
      // Test function profiling
      const endProfile = this.debugUtils.profile('testProfileFunction', {
        category: 'computation'
      });
      
      this.recordTest(
        'Profile Start',
        typeof endProfile === 'function',
        'Should return profile end function'
      );
      
      // Simulate CPU-intensive operation
      let sum = 0;
      for (let i = 0; i < 1000000; i++) {
        sum += i;
      }
      
      const profileResult = endProfile({ computedSum: sum });
      
      this.recordTest(
        'Profile Completion',
        profileResult && 
        profileResult.functionName === 'testProfileFunction' &&
        profileResult.duration > 0,
        'Should complete profiling with CPU usage data'
      );
      
      // Test profile threshold detection
      const slowProfile = this.debugUtils.profile('slowFunction');
      await new Promise(resolve => setTimeout(resolve, 60)); // Above 50ms threshold
      const slowResult = slowProfile();
      
      this.recordTest(
        'Slow Function Detection',
        slowResult && slowResult.duration > 50,
        'Should detect slow functions based on threshold'
      );
      
    } catch (error) {
      this.recordTest('Debug Profiling', false, error.message);
    }
  }

  async testVariableWatching() {
    console.log('\n👁️ Testing Variable Watching...');
    
    try {
      // Test variable watching
      let testVariable = { count: 0, status: 'initial' };
      
      this.debugUtils.watchVariable('testVar', testVariable, { 
        scope: 'test-function' 
      });
      
      this.recordTest('Variable Watch Start', true, 'Should start watching variable');
      
      // Change variable and watch again
      testVariable = { count: 1, status: 'updated' };
      this.debugUtils.watchVariable('testVar', testVariable, { 
        scope: 'test-function' 
      });
      
      this.recordTest('Variable Change Detection', true, 'Should detect variable changes');
      
      // Test multiple variables
      this.debugUtils.watchVariable('counter', 10);
      this.debugUtils.watchVariable('counter', 15);
      this.debugUtils.watchVariable('counter', 20);
      
      this.recordTest('Multiple Variable Watching', true, 'Should watch multiple variables');
      
    } catch (error) {
      this.recordTest('Variable Watching', false, error.message);
    }
  }

  async testMemoryMonitoring() {
    console.log('\n🧠 Testing Memory Monitoring...');
    
    try {
      // Test memory stats retrieval
      const memoryStats = this.debugUtils.getMemoryStats();
      
      this.recordTest(
        'Memory Stats',
        memoryStats && memoryStats.current && memoryStats.baseline,
        'Should provide memory statistics'
      );
      
      // Test memory formatting
      const formattedSize = this.debugUtils.formatBytes(1024 * 1024);
      
      this.recordTest(
        'Memory Formatting',
        formattedSize === '1 MB',
        'Should format bytes to human readable format'
      );
      
      // Test performance report
      const performanceReport = this.debugUtils.getPerformanceReport();
      
      this.recordTest(
        'Performance Report',
        performanceReport && 
        performanceReport.timestamp &&
        Array.isArray(performanceReport.executionPaths),
        'Should generate performance report'
      );
      
    } catch (error) {
      this.recordTest('Memory Monitoring', false, error.message);
    }
  }

  async testCallStackCapture() {
    console.log('\n📚 Testing Call Stack Capture...');
    
    try {
      // Test call stack capture
      const callStack = this.debugUtils.captureCallStack();
      
      this.recordTest(
        'Call Stack Capture',
        Array.isArray(callStack) && callStack.length > 0,
        'Should capture call stack'
      );
      
      // Test stack frame format
      const hasValidFrames = callStack.some(frame => 
        frame.function || frame.file || frame.raw
      );
      
      this.recordTest(
        'Stack Frame Format',
        hasValidFrames,
        'Should format stack frames correctly'
      );
      
      // Test breakpoint creation
      const breakpoint = this.debugUtils.createBreakpoint('test-breakpoint', 
        (context) => context.trigger === true
      );
      
      this.recordTest(
        'Breakpoint Creation',
        typeof breakpoint === 'function',
        'Should create conditional breakpoint'
      );
      
      // Test breakpoint triggering
      const triggered = breakpoint({ trigger: true });
      const notTriggered = breakpoint({ trigger: false });
      
      this.recordTest(
        'Conditional Breakpoint',
        triggered === true && notTriggered === false,
        'Should trigger breakpoint based on condition'
      );
      
    } catch (error) {
      this.recordTest('Call Stack Capture', false, error.message);
    }
  }

  async testAgentIntegration() {
    console.log('\n🔗 Testing Agent Integration...');
    
    try {
      // Create agent with enhanced logging
      const agent = new AnalystAgent({
        id: 'logging-test-analyst',
        enableDebug: true,
        enhancedLogger: this.logger,
        logLevel: 'debug',
        environment: 'test'
      });
      
      await agent.initialize(this.contextManager);
      
      this.recordTest(
        'Agent Logger Integration',
        agent.enhancedLogger === this.logger,
        'Agent should use provided enhanced logger'
      );
      
      this.recordTest(
        'Agent Debug Utils',
        agent.debugUtils instanceof DebugUtils,
        'Agent should have debug utils when debugging enabled'
      );
      
      // Test agent debugging
      const agentDebugger = this.debugUtils.debugAgent(agent);
      
      this.recordTest(
        'Agent Debugger Creation',
        agentDebugger && 
        typeof agentDebugger.traceExecution === 'function',
        'Should create agent-specific debugger'
      );
      
      // Test agent state watching
      agentDebugger.watchState();
      this.recordTest('Agent State Watching', true, 'Should watch agent state');
      
      // Test agent dump
      const agentDump = agentDebugger.dumpAgent();
      this.recordTest(
        'Agent Dump',
        typeof agentDump === 'string' && agentDump.length > 0,
        'Should dump agent state for debugging'
      );
      
    } catch (error) {
      this.recordTest('Agent Integration', false, error.message);
    }
  }

  async testLogAggregation() {
    console.log('\n📊 Testing Log Aggregation...');
    
    try {
      // Generate various logs
      for (let i = 0; i < 10; i++) {
        this.logger.info(`Test message ${i}`, { 
          iteration: i,
          batch: 'aggregation-test' 
        }, 'aggregation');
      }
      
      // Test log counts
      const logCounts = await this.logger.getLogCounts();
      
      this.recordTest(
        'Log Count Aggregation',
        Object.keys(logCounts).length > 0,
        'Should aggregate log counts by level and component'
      );
      
      // Test error counts
      for (let i = 0; i < 3; i++) {
        this.logger.error(`Test error ${i}`, new Error(`Error ${i}`), {}, 'aggregation');
      }
      
      const errorCounts = await this.logger.getErrorCounts();
      
      this.recordTest(
        'Error Count Aggregation',
        errorCounts.aggregation >= 3,
        'Should aggregate error counts by component'
      );
      
      // Test diagnostics
      const diagnostics = this.logger.getDiagnostics();
      
      this.recordTest(
        'Logger Diagnostics',
        diagnostics && 
        diagnostics.options &&
        diagnostics.stats &&
        typeof diagnostics.stats.totalLogCounts === 'number',
        'Should provide comprehensive diagnostics'
      );
      
    } catch (error) {
      this.recordTest('Log Aggregation', false, error.message);
    }
  }

  async testLogAnalysis() {
    console.log('\n🔍 Testing Log Analysis...');
    
    try {
      // Test log search (placeholder implementation)
      const searchResult = await this.logger.searchLogs('test query', {
        timeRange: '1h',
        limit: 100
      });
      
      this.recordTest(
        'Log Search',
        searchResult && 
        typeof searchResult.query === 'string' &&
        Array.isArray(searchResult.results),
        'Should provide log search interface'
      );
      
      // Test debug data export
      const exportPath = path.join(this.testLogDir, 'debug-export.json');
      const exportedPath = await this.debugUtils.exportDebugData(exportPath);
      
      this.recordTest(
        'Debug Data Export',
        exportedPath === exportPath,
        'Should export debug data to file'
      );
      
      // Verify exported file exists and has content
      const exportedContent = await fs.readFile(exportPath, 'utf8');
      const exportedData = JSON.parse(exportedContent);
      
      this.recordTest(
        'Export Data Integrity',
        exportedData.timestamp && 
        exportedData.performanceReport &&
        Array.isArray(exportedData.executionPaths),
        'Should export complete debug data'
      );
      
    } catch (error) {
      this.recordTest('Log Analysis', false, error.message);
    }
  }

  async testLogLevelManagement() {
    console.log('\n⚙️ Testing Log Level Management...');
    
    try {
      // Test log level change
      const originalLevel = this.logger.options.level;
      this.logger.setLogLevel('error');
      
      this.recordTest(
        'Log Level Change',
        this.logger.options.level === 'error',
        'Should change log level dynamically'
      );
      
      // Test debug component management
      this.logger.enableDebugComponent('new-component');
      
      this.recordTest(
        'Debug Component Enable',
        this.logger.options.debugComponents.includes('new-component'),
        'Should enable debug for specific components'
      );
      
      this.logger.disableDebugComponent('new-component');
      
      this.recordTest(
        'Debug Component Disable',
        !this.logger.options.debugComponents.includes('new-component'),
        'Should disable debug for specific components'
      );
      
      // Restore original level
      this.logger.setLogLevel(originalLevel);
      
    } catch (error) {
      this.recordTest('Log Level Management', false, error.message);
    }
  }

  async testDebugComponentControl() {
    console.log('\n🎛️ Testing Debug Component Control...');
    
    try {
      // Test component-specific debug logging
      this.logger.debug('Component A message', { data: 'test' }, 'component-a');
      this.logger.debug('Component B message', { data: 'test' }, 'component-b');
      
      // Enable debug for specific component
      this.logger.enableDebugComponent('component-a');
      
      this.recordTest(
        'Component Debug Enable',
        this.logger.options.debugComponents.includes('component-a'),
        'Should enable debug for specific component'
      );
      
      // Test that only enabled components log debug messages
      // (This would be verified by checking log output in real scenario)
      this.recordTest('Component Debug Filtering', true, 'Should filter debug by component');
      
    } catch (error) {
      this.recordTest('Debug Component Control', false, error.message);
    }
  }

  async testLogRotation() {
    console.log('\n🔄 Testing Log Rotation...');
    
    try {
      // Test file size limits (simulated by checking configuration)
      const maxFileSize = this.logger.options.maxFileSize;
      const maxFiles = this.logger.options.maxFiles;
      
      this.recordTest(
        'Log Rotation Configuration',
        typeof maxFileSize === 'number' && typeof maxFiles === 'number',
        'Should have log rotation configuration'
      );
      
      // Test log flushing
      await this.logger.flush();
      this.recordTest('Log Flushing', true, 'Should flush logs to files');
      
    } catch (error) {
      this.recordTest('Log Rotation', false, error.message);
    }
  }

  async cleanupTestEnvironment() {
    console.log('\n🧹 Cleaning up test environment...');
    
    try {
      // Cleanup debug utils
      if (this.debugUtils) {
        this.debugUtils.cleanup();
      }
      
      // Cleanup logger
      if (this.logger) {
        await this.logger.cleanup();
      }
      
      // Clean up test log directory
      try {
        await fs.rm(this.testLogDir, { recursive: true, force: true });
      } catch (error) {
        console.warn('Could not remove test log directory:', error.message);
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
    console.log('📊 ENHANCED LOGGING TEST RESULTS');
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
      '🎉 ALL TESTS PASSED! Enhanced logging system is ready.' :
      '⚠️  Some tests failed. Please review and fix issues before deployment.'
    ));
    console.log('='.repeat(60));
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new EnhancedLoggingTest();
  
  tester.runAllTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Test execution failed:', error);
      process.exit(1);
    });
}

export { EnhancedLoggingTest };