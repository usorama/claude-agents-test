#!/usr/bin/env node

import { ContextManager } from './src/context/ContextManager.js';
import { ContextSummarizer } from './src/context/ContextSummarizer.js';
import { SafetyConstraints } from './src/safety/SafetyConstraints.js';
import { ConstraintEnforcer } from './src/safety/ConstraintEnforcer.js';
import { getSchemaRegistry } from './src/validation/SchemaRegistry.js';
import { getFileOptimizer } from './src/utils/FileOperationsOptimizer.js';

console.log('🚀 Phase 4 Production Hardening - Quick Results Summary\n');

// Initialize components
const contextManager = new ContextManager({
  baseDir: './test-phase4-production',
  logLevel: 'error' // Reduce noise
});

const summarizer = new ContextSummarizer({ logLevel: 'error' });
const schemaRegistry = getSchemaRegistry({ logLevel: 'error' });
const fileOptimizer = getFileOptimizer({ logLevel: 'error' });
const constraints = new SafetyConstraints('development', { logLevel: 'error' });
const enforcer = new ConstraintEnforcer(constraints, { logLevel: 'error' });

async function runQuickTest() {
  try {
    console.log('📊 Testing Core Components:\n');
    
    // 1. Context compression test
    console.log('1. Context Compression & Token Optimization:');
    const testContext = {
      id: 'test-001',
      level: 'agent',
      metadata: { 
        version: '2.0',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: []
      },
      data: {
        agentId: 'test-001',
        agentType: 'TestAgent',
        state: { status: 'active' },
        capabilities: ['test'],
        history: new Array(100).fill().map((_, i) => ({ action: `test-${i}`, timestamp: Date.now() }))
      }
    };
    
    const originalSize = JSON.stringify(testContext).length;
    const summarized = await summarizer.summarize(testContext);
    const compressedSize = JSON.stringify(summarized).length;
    const compressionRatio = ((originalSize - compressedSize) / originalSize * 100).toFixed(1);
    
    console.log(`   ✅ Original size: ${originalSize} bytes`);
    console.log(`   ✅ Compressed size: ${compressedSize} bytes`);
    console.log(`   ✅ Compression ratio: ${compressionRatio}%`);
    console.log(`   📈 Status: ${compressionRatio > 30 ? 'EXCELLENT' : compressionRatio > 10 ? 'GOOD' : 'NEEDS WORK'}\n`);
    
    // 2. Security test
    console.log('2. Enhanced Security Controls:');
    let securityScore = 0;
    let totalTests = 0;
    
    // Path validation
    try {
      await enforcer.enforcePreAction(
        { id: 'test' },
        { tool: 'Read', parameters: { file_path: '../../../etc/passwd' } }
      );
      console.log('   ❌ Path traversal: FAILED to block');
    } catch (error) {
      console.log('   ✅ Path traversal: BLOCKED');
      securityScore++;
    }
    totalTests++;
    
    // Dangerous command
    try {
      await enforcer.enforcePreAction(
        { id: 'test' },
        { tool: 'Bash', parameters: { command: 'rm -rf /' } }
      );
      console.log('   ❌ Dangerous command: FAILED to block');
    } catch (error) {
      console.log('   ✅ Dangerous command: BLOCKED');
      securityScore++;
    }
    totalTests++;
    
    const securityPercentage = (securityScore / totalTests * 100).toFixed(1);
    console.log(`   📈 Security Score: ${securityPercentage}%\n`);
    
    // 3. Schema validation
    console.log('3. Schema Validation & Error Handling:');
    let validationScore = 0;
    let validationTests = 0;
    
    // Valid config
    try {
      schemaRegistry.validateAgentConfig('AnalystAgent', {
        id: 'test-001',
        type: 'AnalystAgent',
        name: 'Test Analyst',
        capabilities: ['research']
      });
      console.log('   ✅ Valid configuration: PASSED');
      validationScore++;
    } catch (error) {
      console.log('   ❌ Valid configuration: FAILED');
    }
    validationTests++;
    
    // Invalid config
    try {
      schemaRegistry.validateAgentConfig('AnalystAgent', {
        id: 123, // Should be string
        name: 'Test'
      });
      console.log('   ❌ Invalid configuration: FAILED to reject');
    } catch (error) {
      console.log('   ✅ Invalid configuration: CORRECTLY REJECTED');
      validationScore++;
    }
    validationTests++;
    
    const validationPercentage = (validationScore / validationTests * 100).toFixed(1);
    console.log(`   📈 Validation Score: ${validationPercentage}%\n`);
    
    // 4. File operations
    console.log('4. File Operations Optimization:');
    const startTime = Date.now();
    
    // Test file operations
    await fileOptimizer.writeFile('./test-phase4-production/test-perf.txt', 'test content');
    const content = await fileOptimizer.readFile('./test-phase4-production/test-perf.txt');
    await fileOptimizer.deleteFile('./test-phase4-production/test-perf.txt');
    
    const operationTime = Date.now() - startTime;
    const metrics = fileOptimizer.getMetrics();
    
    console.log(`   ✅ File operations completed in: ${operationTime}ms`);
    console.log(`   ✅ Cache hit rate: ${metrics.cache.hitRate.toFixed(1)}%`);
    console.log(`   📈 Status: ${operationTime < 50 ? 'EXCELLENT' : operationTime < 100 ? 'GOOD' : 'NEEDS WORK'}\n`);
    
    // Overall assessment
    console.log('🎯 PHASE 4 PRODUCTION HARDENING SUMMARY:');
    console.log('=' .repeat(50));
    
    const overallScores = {
      contextCompression: parseFloat(compressionRatio),
      security: parseFloat(securityPercentage),
      validation: parseFloat(validationPercentage),
      performance: operationTime < 50 ? 95 : operationTime < 100 ? 80 : 60
    };
    
    const averageScore = Object.values(overallScores).reduce((a, b) => a + b, 0) / Object.keys(overallScores).length;
    
    console.log(`📊 Context Compression: ${overallScores.contextCompression}%`);
    console.log(`🔒 Security Controls: ${overallScores.security}%`);
    console.log(`✅ Schema Validation: ${overallScores.validation}%`);
    console.log(`⚡ Performance: ${overallScores.performance}%`);
    console.log(`🚀 Overall Score: ${averageScore.toFixed(1)}%`);
    
    console.log('\n' + '=' .repeat(50));
    
    if (averageScore >= 80) {
      console.log('🎉 PRODUCTION READY! All systems hardened and optimized.');
    } else if (averageScore >= 70) {
      console.log('✅ GOOD PROGRESS! Minor improvements needed.');
    } else {
      console.log('⚠️  NEEDS WORK! Major improvements required.');
    }
    
    // Cleanup
    fileOptimizer.shutdown();
    await contextManager.shutdown();
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

runQuickTest().catch(console.error);