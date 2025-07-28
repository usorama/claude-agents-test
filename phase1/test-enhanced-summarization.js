#!/usr/bin/env node

/**
 * Test Enhanced Context Summarization (IMP-001)
 * Tests automatic 80% threshold triggering, archival, and restoration
 */

import { ContextManager } from './src/context/ContextManager.js';
import { ContextSummarizer } from './src/context/ContextSummarizer.js';
import { ContextLevel } from './src/types/context.types.v2.js';
import fs from 'fs/promises';
import path from 'path';

const testDir = './test-enhanced-summarization';

async function cleanup() {
  try {
    await fs.rm(testDir, { recursive: true, force: true });
  } catch (error) {
    // Ignore cleanup errors
  }
}

async function testEnhancedSummarization() {
  console.log('🧪 Testing Enhanced Context Summarization (IMP-001)...\n');

  await cleanup();

  // Initialize context manager with small size limits for testing
  const contextManager = new ContextManager({
    baseDir: testDir,
    maxContextSize: 5000, // Small limit for testing
    summarizationThreshold: 0.8, // 80% threshold
    logLevel: 'info'
  });

  await contextManager.initialize();

  console.log('✅ Context Manager initialized with enhanced summarization\n');

  // Test 1: Create a large context that exceeds 80% threshold
  console.log('📊 Test 1: Large context creation and auto-summarization');
  
  const largeData = {
    agentId: 'test-agent-001',
    agentType: 'analyst',
    state: {
      currentTask: 'research',
      progress: 0.75,
      findings: 'A'.repeat(3000), // Large text to trigger summarization
      detailedNotes: 'B'.repeat(2000),
      references: Array.from({length: 100}, (_, i) => `Reference ${i}: ${'C'.repeat(50)}`),
      history: Array.from({length: 50}, (_, i) => ({
        timestamp: new Date(Date.now() - i * 60000).toISOString(),
        action: `Action ${i}`,
        details: 'D'.repeat(100)
      }))
    },
    capabilities: ['research', 'analysis', 'documentation']
  };

  console.log(`Original data size: ${JSON.stringify(largeData).length} bytes`);

  // Create context - should trigger auto-summarization
  const context = await contextManager.createContext(ContextLevel.AGENT, largeData);
  console.log(`✅ Context created with ID: ${context.id}`);
  console.log(`Context size after creation: ${JSON.stringify(context).length} bytes`);

  // Test 2: Update context to trigger summarization
  console.log('\n📊 Test 2: Update triggering auto-summarization');
  
  const updateData = {
    newFindings: 'E'.repeat(1000), // Additional large data
    moreNotes: 'F'.repeat(800),
    additionalReferences: Array.from({length: 30}, (_, i) => `NewRef ${i}: ${'G'.repeat(40)}`)
  };

  console.log(`Update data size: ${JSON.stringify(updateData).length} bytes`);

  const updatedContext = await contextManager.updateContext(ContextLevel.AGENT, context.id, updateData);
  console.log(`✅ Context updated`);
  console.log(`Context size after update: ${JSON.stringify(updatedContext).length} bytes`);
  console.log(`Auto-summarized: ${updatedContext.metadata.autoSummarized || false}`);

  // Test 3: Test archive and restoration
  console.log('\n📊 Test 3: Archive listing and restoration');
  
  const archives = await contextManager.listArchives(ContextLevel.AGENT, context.id);
  console.log(`✅ Found ${archives.length} archive(s)`);
  
  if (archives.length > 0) {
    console.log('Archive details:', archives.map(a => ({
      file: a.file,
      size: a.size,
      createdAt: a.createdAt.toISOString()
    })));

    // Test restoration
    const restored = await contextManager.restoreFromArchive(ContextLevel.AGENT, context.id);
    console.log(`✅ Context restored from archive`);
    console.log(`Restored size: ${JSON.stringify(restored).length} bytes`);
  }

  // Test 4: Test different summarization methods
  console.log('\n📊 Test 4: Testing advanced summarization methods');
  
  const summarizer = new ContextSummarizer({
    logLevel: 'info'
  });

  // Test smart summarization
  const smartSummarized = await summarizer.smartSummarize(updatedContext, 2000);
  console.log(`✅ Smart summarization: ${JSON.stringify(smartSummarized).length} bytes`);
  console.log(`Final tokens: ${smartSummarized.metadata.finalTokens || 'N/A'}`);

  // Test emergency summarization
  const emergencySummarized = await summarizer.emergencySummarize(updatedContext);
  console.log(`✅ Emergency summarization: ${JSON.stringify(emergencySummarized).length} bytes`);

  // Test 5: Test token estimation
  console.log('\n📊 Test 5: Token estimation and monitoring');
  
  const originalSize = JSON.stringify(updatedContext).length;
  const estimatedTokens = summarizer.estimateTokens(originalSize);
  const needsSummarization = summarizer.needsTokenSummarization(updatedContext, 10000);
  
  console.log(`Original size: ${originalSize} bytes`);
  console.log(`Estimated tokens: ${estimatedTokens}`);
  console.log(`Needs token summarization: ${needsSummarization}`);

  // Test 6: Monitor context sizes
  console.log('\n📊 Test 6: Context size monitoring');
  
  const monitorResult = await contextManager.monitorContextSize();
  console.log(`Total context size: ${monitorResult.totalSize} bytes`);
  console.log(`Threshold: ${monitorResult.threshold} bytes`);
  console.log(`Summarization triggered: ${monitorResult.triggered}`);

  console.log('\n🎉 Enhanced Context Summarization Tests Complete!');
  
  return {
    originalSize: JSON.stringify(largeData).length,
    finalSize: JSON.stringify(updatedContext).length,
    smartSize: JSON.stringify(smartSummarized).length,
    emergencySize: JSON.stringify(emergencySummarized).length,
    archiveCount: archives.length,
    autoSummarized: updatedContext.metadata.autoSummarized || false,
    estimatedTokens,
    monitorResult
  };
}

// Run tests
testEnhancedSummarization()
  .then(results => {
    console.log('\n📈 Test Results Summary:');
    console.log('- Original size:', results.originalSize, 'bytes');
    console.log('- Final size:', results.finalSize, 'bytes');
    console.log('- Smart summarized size:', results.smartSize, 'bytes');
    console.log('- Emergency summarized size:', results.emergencySize, 'bytes');
    console.log('- Archives created:', results.archiveCount);
    console.log('- Auto-summarization triggered:', results.autoSummarized);
    console.log('- Estimated tokens:', results.estimatedTokens);
    console.log('- Monitor threshold exceeded:', results.monitorResult.triggered);
    
    const compressionRatio = results.smartSize / results.originalSize;
    console.log('- Overall compression ratio:', (compressionRatio * 100).toFixed(1) + '%');
    
    if (compressionRatio < 0.5) {
      console.log('✅ Excellent compression achieved!');
    } else if (compressionRatio < 0.8) {
      console.log('✅ Good compression achieved!');
    } else {
      console.log('⚠️  Compression could be improved');
    }
  })
  .catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });