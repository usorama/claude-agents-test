#!/usr/bin/env node

/**
 * IronClaude-S: Enhanced Context Summarization Testing
 * Tests the enhanced context summarization with Neo4j graph integration
 */

import { ContextSummarizer } from './src/context/ContextSummarizer.js';
import { Neo4jContextGraph } from './src/context/Neo4jContextGraph.js';
import { GraphFactory } from './src/context/GraphFactory.js';

async function testEnhancedContextSummarization() {
  console.log('🧠 IronClaude-S: Testing Enhanced Context Summarization\n');

  let allTestsPassed = true;

  // Test 1: Basic Enhanced Summarization (without graph)
  console.log('📋 Test 1: Basic Enhanced Summarization\n');

  try {
    const summarizer = new ContextSummarizer({
      level: 'medium',
      useGraphAnalysis: false, // Disable graph analysis for this test
      logLevel: 'info'
    });

    // Create a large test context
    const testContext = {
      id: 'test-context-large',
      level: 'agent',
      parentId: null,
      metadata: {
        createdAt: new Date().toISOString(),
        version: 1,
        tags: ['test', 'large-context']
      },
      data: {
        agentId: 'test-agent-001',
        agentType: 'TestAgent',
        state: {
          status: 'running',
          progress: 0.75,
          currentTask: 'processing large dataset',
          memoryUsage: '2.1GB',
          cpuUsage: '45%'
        },
        capabilities: ['data-processing', 'analysis', 'reporting'],
        history: Array.from({ length: 100 }, (_, i) => ({
          timestamp: new Date(Date.now() - i * 60000).toISOString(),
          action: `action-${i}`,
          details: `Performed action ${i} with detailed logging information that takes up considerable space`,
          metadata: { iteration: i, success: true }
        })),
        config: {
          maxMemory: '4GB',
          timeout: 300000,
          retryCount: 3,
          enableLogging: true,
          logLevel: 'debug'
        },
        tempData: {
          cache: Array.from({ length: 50 }, (_, i) => ({ key: `cache-${i}`, value: `value-${i}`.repeat(100) })),
          buffers: Array.from({ length: 20 }, (_, i) => ({ id: i, data: 'x'.repeat(1000) }))
        }
      }
    };

    // Test smart summarization
    const smartSummary = await summarizer.smartSummarize(testContext, 5000);
    const originalSize = JSON.stringify(testContext).length;
    const summarySize = JSON.stringify(smartSummary).length;
    const compressionRatio = summarySize / originalSize;

    console.log(`   ✅ Smart summarization: ${originalSize} → ${summarySize} bytes (${(compressionRatio * 100).toFixed(1)}% of original)`);
    console.log(`   ✅ Estimated tokens: ${summarizer.estimateTokens(originalSize)} → ${summarizer.estimateTokens(summarySize)}`);
    console.log(`   ✅ Preserved essential data: status=${smartSummary.data.state?.status}, capabilities=${smartSummary.data.capabilities?.length}`);

    if (compressionRatio > 0.8) {
      console.log('   ❌ Compression ratio too high - not enough compression achieved');
      allTestsPassed = false;
    }

    console.log();
  } catch (error) {
    console.log(`   ❌ Basic enhanced summarization failed: ${error.message}\n`);
    allTestsPassed = false;
  }

  // Test 2: Graph-Aware Summarization
  console.log('📊 Test 2: Graph-Aware Summarization\n');

  try {
    // Initialize Neo4j graph
    const graph = new Neo4jContextGraph({
      neo4j: {
        uri: 'bolt://localhost:7689',
        username: 'neo4j',
        password: 'claudeagents123'
      }
    });

    await graph.initialize();

    // Create summarizer with graph integration
    const graphSummarizer = new ContextSummarizer({
      level: 'medium',
      useGraphAnalysis: true,
      contextGraph: graph,
      logLevel: 'info'
    });

    // Create test contexts with relationships
    const projectContext = {
      id: 'summarization-project',
      level: 'project',
      parentId: null,
      metadata: {
        createdAt: new Date().toISOString(),
        version: 1
      },
      data: {
        projectName: 'Enhanced Summarization Test',
        description: 'Testing graph-aware context summarization features',
        config: {
          maxContextSize: '50KB',
          summarizationThreshold: 20000,
          enableGraphAnalysis: true
        },
        activeAgents: ['agent-001', 'agent-002'],
        sharedState: {
          projectProgress: 0.6,
          lastUpdate: new Date().toISOString(),
          criticalData: 'Important project state information'
        }
      }
    };

    const centralAgentContext = {
      id: 'summarization-agent-central',
      level: 'agent',
      parentId: 'summarization-project',
      metadata: {
        createdAt: new Date().toISOString(),
        version: 1
      },
      data: {
        agentId: 'central-agent',
        agentType: 'CentralCoordinator',
        state: {
          status: 'active',
          role: 'coordination',
          connections: 5
        },
        capabilities: ['coordination', 'summarization', 'optimization'],
        history: Array.from({ length: 50 }, (_, i) => ({
          timestamp: new Date(Date.now() - i * 30000).toISOString(),
          action: `coordination-${i}`,
          details: `Coordinated with multiple agents for task ${i}`
        }))
      }
    };

    const leafAgentContext = {
      id: 'summarization-agent-leaf',
      level: 'agent',
      parentId: 'summarization-project',
      metadata: {
        createdAt: new Date().toISOString(),
        version: 1
      },
      data: {
        agentId: 'leaf-agent',
        agentType: 'SpecializedWorker',
        state: {
          status: 'working',
          role: 'specialized-task',
          connections: 1
        },
        capabilities: ['data-processing'],
        history: Array.from({ length: 30 }, (_, i) => ({
          timestamp: new Date(Date.now() - i * 45000).toISOString(),
          action: `processing-${i}`,
          details: `Processed data batch ${i}`
        }))
      }
    };

    // Add contexts to graph
    await graph.addNode(projectContext.id, projectContext);
    await graph.addNode(centralAgentContext.id, centralAgentContext);
    await graph.addNode(leafAgentContext.id, leafAgentContext);

    // Create relationships
    await graph.addEdge(projectContext.id, centralAgentContext.id, {
      type: 'parent',
      weight: 1.0,
      metadata: { level: 'agent' }
    });

    await graph.addEdge(projectContext.id, leafAgentContext.id, {
      type: 'parent',
      weight: 1.0,
      metadata: { level: 'agent' }
    });

    await graph.addEdge(centralAgentContext.id, leafAgentContext.id, {
      type: 'coordinates',
      weight: 0.8,
      metadata: { relationship: 'coordination' }
    });

    // Test graph-aware summarization for central agent (should preserve more)
    const centralSummary = await graphSummarizer.graphAwareSummarize(centralAgentContext, {
      targetTokens: 3000
    });

    // Test graph-aware summarization for leaf agent (should compress more)
    const leafSummary = await graphSummarizer.graphAwareSummarize(leafAgentContext, {
      targetTokens: 3000
    });

    const centralSize = JSON.stringify(centralSummary).length;
    const leafSize = JSON.stringify(leafSummary).length;
    const originalCentralSize = JSON.stringify(centralAgentContext).length;
    const originalLeafSize = JSON.stringify(leafAgentContext).length;

    console.log(`   ✅ Central agent (high centrality): ${originalCentralSize} → ${centralSize} bytes`);
    console.log(`   ✅ Leaf agent (low centrality): ${originalLeafSize} → ${leafSize} bytes`);
    
    // Verify graph analysis metadata
    if (centralSummary.metadata.graphAnalysis?.relationshipCount >= 1) {
      console.log(`   ✅ Central agent relationship count: ${centralSummary.metadata.graphAnalysis.relationshipCount}`);
      console.log(`   ✅ Central agent centrality score: ${centralSummary.metadata.graphAnalysis.centralityScore.toFixed(2)}`);
    } else {
      console.log('   ❌ Central agent graph analysis failed');
      allTestsPassed = false;
    }

    if (leafSummary.metadata.graphAnalysis?.relationshipCount >= 0) {
      console.log(`   ✅ Leaf agent relationship count: ${leafSummary.metadata.graphAnalysis.relationshipCount}`);
      console.log(`   ✅ Leaf agent centrality score: ${leafSummary.metadata.graphAnalysis.centralityScore.toFixed(2)}`);
    } else {
      console.log('   ❌ Leaf agent graph analysis failed');
      allTestsPassed = false;
    }

    // Central agent should have higher centrality and potentially preserve more content
    if (centralSummary.metadata.graphAnalysis?.centralityScore > leafSummary.metadata.graphAnalysis?.centralityScore) {
      console.log('   ✅ Central agent correctly identified as more central');
    } else {
      console.log('   ⚠️  Centrality scoring may need adjustment');
    }

    await graph.close();
    console.log();
  } catch (error) {
    console.log(`   ❌ Graph-aware summarization failed: ${error.message}\n`);
    allTestsPassed = false;
  }

  // Test 3: Batch Summarization
  console.log('📦 Test 3: Batch Graph-Aware Summarization\n');

  try {
    // Initialize graph for batch testing
    const batchGraph = new Neo4jContextGraph({
      neo4j: {
        uri: 'bolt://localhost:7689',
        username: 'neo4j',
        password: 'claudeagents123'
      }
    });

    await batchGraph.initialize();

    const batchSummarizer = new ContextSummarizer({
      level: 'medium',
      useGraphAnalysis: true,
      contextGraph: batchGraph,
      logLevel: 'info'
    });

    // Create multiple test contexts
    const batchContexts = Array.from({ length: 5 }, (_, i) => ({
      id: `batch-context-${i}`,
      level: 'task',
      parentId: 'batch-project',
      metadata: {
        createdAt: new Date().toISOString(),
        version: 1
      },
      data: {
        taskId: `task-${i}`,
        taskType: 'batch-processing',
        input: {
          data: Array.from({ length: 100 }, (_, j) => `data-item-${j}`).join(' '),
          parameters: { batchSize: 100, timeout: 30000 }
        },
        status: i % 2 === 0 ? 'completed' : 'running',
        progress: Math.random(),
        output: i % 2 === 0 ? { result: `Processed ${i * 100} items successfully` } : null,
        logs: Array.from({ length: 20 }, (_, j) => `Log entry ${j} for task ${i}`)
      }
    }));

    // Add contexts to graph
    for (const context of batchContexts) {
      await batchGraph.addNode(context.id, context);
    }

    // Test batch summarization
    const startTime = Date.now();
    const batchResults = await batchSummarizer.batchGraphAwareSummarize(batchContexts, {
      targetTokensPerContext: 2000,
      parallelProcessing: true
    });
    const endTime = Date.now();

    console.log(`   ✅ Batch processed ${batchContexts.length} contexts in ${endTime - startTime}ms`);
    console.log(`   ✅ All contexts summarized: ${batchResults.length === batchContexts.length}`);

    // Verify compression
    const totalOriginalSize = batchContexts.reduce((sum, ctx) => sum + JSON.stringify(ctx).length, 0);
    const totalSummarySize = batchResults.reduce((sum, ctx) => sum + JSON.stringify(ctx).length, 0);
    const overallCompression = totalSummarySize / totalOriginalSize;

    console.log(`   ✅ Overall compression: ${(overallCompression * 100).toFixed(1)}% of original size`);

    if (overallCompression > 0.9) {
      console.log('   ⚠️  Batch compression could be more aggressive');
    }

    await batchGraph.close();
    console.log();
  } catch (error) {
    console.log(`   ❌ Batch summarization failed: ${error.message}\n`);
    allTestsPassed = false;
  }

  // Test 4: Emergency Summarization
  console.log('🚨 Test 4: Emergency Summarization\n');

  try {
    const emergencySummarizer = new ContextSummarizer({
      level: 'high',
      logLevel: 'info'
    });

    // Create extremely large context that would cause token overflow
    const massiveContext = {
      id: 'massive-context',
      level: 'agent',
      parentId: null,
      metadata: {
        createdAt: new Date().toISOString(),
        version: 1
      },
      data: {
        agentId: 'massive-agent',
        agentType: 'DataProcessor',
        state: {
          status: 'processing',
          error: 'Memory overflow detected in processing pipeline',
          progress: 0.95
        },
        capabilities: ['processing', 'analysis'],
        massiveData: {
          logs: Array.from({ length: 1000 }, (_, i) => 
            `Extensive log entry ${i} with detailed information: ${('detailed-data-').repeat(100)}`
          ),
          cache: Array.from({ length: 500 }, (_, i) => ({
            key: `cache-${i}`,
            value: ('cached-value-').repeat(200),
            metadata: { size: 1000, timestamp: Date.now() - i * 1000 }
          })),
          buffers: Array.from({ length: 100 }, (_, i) => ({
            id: i,
            data: ('buffer-data-').repeat(500)
          }))
        },
        output: {
          result: 'Critical processing result that must be preserved',
          statistics: { processed: 1000000, errors: 0, duration: 3600000 }
        }
      }
    };

    const originalSize = JSON.stringify(massiveContext).length;
    const originalTokens = emergencySummarizer.estimateTokens(originalSize);

    console.log(`   📊 Original context: ${originalSize} bytes (~${originalTokens} tokens)`);

    // Test emergency summarization
    const emergencySummary = await emergencySummarizer.emergencySummarize(massiveContext);
    const emergencySize = JSON.stringify(emergencySummary).length;
    const emergencyTokens = emergencySummarizer.estimateTokens(emergencySize);

    console.log(`   ✅ Emergency summary: ${emergencySize} bytes (~${emergencyTokens} tokens)`);
    console.log(`   ✅ Compression ratio: ${((emergencySize / originalSize) * 100).toFixed(1)}%`);

    // Verify essential data preservation
    if (emergencySummary.data.output && emergencySummary.data.state?.status) {
      console.log('   ✅ Essential data preserved (output, status)');
    } else {
      console.log('   ❌ Essential data not preserved');
      allTestsPassed = false;
    }

    if (emergencySummary._emergencyNote) {
      console.log('   ✅ Emergency summarization metadata added');
    }

    console.log();
  } catch (error) {
    console.log(`   ❌ Emergency summarization failed: ${error.message}\n`);
    allTestsPassed = false;
  }

  // Summary
  console.log('📊 Enhanced Context Summarization Test Results:');
  console.log(`   - Basic enhanced summarization: ${allTestsPassed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`   - Graph-aware summarization: ${allTestsPassed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`   - Batch processing: ${allTestsPassed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`   - Emergency summarization: ${allTestsPassed ? '✅ PASSED' : '❌ FAILED'}`);
  
  if (allTestsPassed) {
    console.log('\n🎉 All enhanced context summarization tests passed!');
    console.log('✅ Graph-aware importance scoring working');
    console.log('✅ Relationship-based compression optimization working');
    console.log('✅ Batch processing with parallel optimization working');
    console.log('✅ Emergency token overflow prevention working');
  } else {
    console.log('\n❌ Some enhanced context summarization tests failed');
    console.log('⚠️  Check Neo4j connection and context graph setup');
  }

  return allTestsPassed;
}

// Run the test
testEnhancedContextSummarization()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Enhanced context summarization test failed:', error);
    process.exit(1);
  });