import { ContextManager } from '../src/context/ContextManager.js';
import { ContextGraph } from '../src/context/ContextGraph.js';
import { ContextLevel } from '../src/types/context.types.v2.js';
import fs from 'fs/promises';
import { join } from 'path';

/**
 * Test the graph-based context relationship functionality
 */
async function testContextGraph() {
  console.log('Testing Context Graph...\n');
  console.log('='.repeat(50));
  
  const testDir = './test-context-graph';
  
  // Clean up
  try {
    await fs.rm(testDir, { recursive: true, force: true });
  } catch (e) {}
  
  try {
    // Test 1: Basic Graph Operations
    console.log('\n1. Testing Basic Graph Operations');
    console.log('-'.repeat(40));
    
    const graph = new ContextGraph();
    
    // Add nodes
    graph.addNode('node1', { data: { name: 'Context 1' } });
    graph.addNode('node2', { data: { name: 'Context 2' } });
    graph.addNode('node3', { data: { name: 'Context 3' } });
    graph.addNode('node4', { data: { name: 'Context 4' } });
    
    console.log('✓ Added 4 nodes');
    
    // Add edges
    graph.addEdge('node1', 'node2', { type: 'parent', weight: 1.0 });
    graph.addEdge('node1', 'node3', { type: 'parent', weight: 1.0 });
    graph.addEdge('node2', 'node4', { type: 'depends-on', weight: 0.9 });
    graph.addEdge('node3', 'node4', { type: 'references', weight: 0.5 });
    
    console.log('✓ Added 4 edges');
    
    // Get statistics
    const stats = graph.getStatistics();
    console.log('✓ Graph statistics:');
    console.log('  - Nodes:', stats.nodeCount);
    console.log('  - Edges:', stats.edgeCount);
    console.log('  - Relationship types:', stats.relationshipTypes.join(', '));
    console.log('  - Average degree:', stats.averageDegree.toFixed(2));
    console.log('  - Density:', stats.density.toFixed(4));
    
    // Test 2: Dependency Traversal
    console.log('\n2. Testing Dependency Traversal');
    console.log('-'.repeat(40));
    
    const dependencies = graph.findDependencies('node2');
    console.log('✓ Dependencies of node2:', dependencies.length);
    dependencies.forEach(dep => {
      console.log(`  - ${dep.contextId} (${dep.relationship}, distance: ${dep.distance})`);
    });
    
    // Test 3: Impact Analysis
    console.log('\n3. Testing Impact Analysis');
    console.log('-'.repeat(40));
    
    const impacted = graph.findImpactedContexts('node4');
    console.log('✓ Contexts impacted by changes to node4:', impacted.length);
    impacted.forEach(imp => {
      console.log(`  - ${imp.contextId} (impact: ${imp.impact.toFixed(2)}, distance: ${imp.distance})`);
    });
    
    // Test 4: Shortest Path
    console.log('\n4. Testing Shortest Path');
    console.log('-'.repeat(40));
    
    const path = graph.findShortestPath('node1', 'node4');
    if (path) {
      console.log('✓ Shortest path from node1 to node4:');
      console.log('  - Path length:', path.distance);
      console.log('  - Nodes:', path.nodes.join(' → '));
    }
    
    // Test 5: Cycle Detection
    console.log('\n5. Testing Cycle Detection');
    console.log('-'.repeat(40));
    
    // Create a cycle
    graph.addEdge('node4', 'node2', { type: 'depends-on', weight: 0.8 });
    
    const cycles = graph.detectCycles();
    console.log('✓ Cycles detected:', cycles.length);
    cycles.forEach((cycle, i) => {
      console.log(`  - Cycle ${i + 1}: ${cycle.nodes.join(' → ')}`);
    });
    
    // Test 6: Context Manager Integration
    console.log('\n6. Testing Context Manager Integration');
    console.log('-'.repeat(40));
    
    const contextManager = new ContextManager({
      baseDir: join(testDir, 'context')
    });
    await contextManager.initialize();
    
    // Create contexts with relationships
    const projectContext = await contextManager.createContext(
      ContextLevel.PROJECT,
      {
        projectName: 'Test Project',
        description: 'Testing graph relationships'
      }
    );
    
    console.log('✓ Created project context:', projectContext.id);
    
    const agentContext1 = await contextManager.createContext(
      ContextLevel.AGENT,
      {
        agentId: 'agent-001',
        agentType: 'AnalystAgent',
        state: { status: 'active' },
        dependencies: [projectContext.id]
      },
      projectContext.id
    );
    
    console.log('✓ Created agent context 1:', agentContext1.id);
    
    const agentContext2 = await contextManager.createContext(
      ContextLevel.AGENT,
      {
        agentId: 'agent-002',
        agentType: 'DeveloperAgent',
        state: { status: 'active' },
        dependencies: [agentContext1.id],
        relatedContextRef: agentContext1.id
      },
      projectContext.id
    );
    
    console.log('✓ Created agent context 2:', agentContext2.id);
    
    const taskContext = await contextManager.createContext(
      ContextLevel.TASK,
      {
        taskType: 'implement',
        input: { feature: 'test' },
        previousTaskId: agentContext1.id,
        dependencies: [
          { contextId: agentContext1.id, required: true },
          { contextId: agentContext2.id, required: false }
        ]
      },
      agentContext2.id
    );
    
    console.log('✓ Created task context:', taskContext.id);
    
    // Test 7: Get Context with Relationships
    console.log('\n7. Testing Get Context with Relationships');
    console.log('-'.repeat(40));
    
    const contextWithRels = await contextManager.getContextWithRelationships(
      ContextLevel.TASK,
      taskContext.id
    );
    
    console.log('✓ Context with relationships:');
    console.log('  - Dependencies:', contextWithRels.relationships.dependencies.length);
    console.log('  - Dependents:', contextWithRels.relationships.dependents.length);
    console.log('  - Parent:', contextWithRels.relationships.parent ? 'Yes' : 'No');
    console.log('  - Children:', contextWithRels.relationships.children.length);
    console.log('  - Related:', contextWithRels.relationships.related.length);
    
    // Test 8: Impact Analysis on Real Contexts
    console.log('\n8. Testing Impact Analysis on Real Contexts');
    console.log('-'.repeat(40));
    
    const impact = await contextManager.analyzeImpact(agentContext1.id);
    console.log('✓ Impact analysis for agent-001:');
    console.log('  - Total impacted:', impact.summary.totalImpacted);
    console.log('  - Critical:', impact.summary.critical);
    console.log('  - High:', impact.summary.high);
    console.log('  - Medium:', impact.summary.medium);
    console.log('  - Low:', impact.summary.low);
    
    // Test 9: Query with Relationships
    console.log('\n9. Testing Query with Relationships');
    console.log('-'.repeat(40));
    
    const queryResults = await contextManager.queryWithRelationships({
      startContextId: projectContext.id,
      relationshipTypes: ['parent', 'depends-on'],
      maxDepth: 3,
      filters: { agentType: 'AnalystAgent' }
    });
    
    console.log('✓ Query results:', queryResults.length);
    queryResults.forEach(result => {
      console.log(`  - ${result.context.id} (depth: ${result.depth}, level: ${result.context.level})`);
    });
    
    // Test 10: Graph Initialization from Existing Contexts
    console.log('\n10. Testing Graph Initialization');
    console.log('-'.repeat(40));
    
    // Create a new context manager
    const contextManager2 = new ContextManager({
      baseDir: join(testDir, 'context')
    });
    await contextManager2.initialize();
    
    // Initialize graph from existing contexts
    const initStats = await contextManager2.initializeGraph();
    console.log('✓ Graph initialized from existing contexts:');
    console.log('  - Nodes loaded:', initStats.nodeCount);
    console.log('  - Edges created:', initStats.edgeCount);
    console.log('  - Relationship types:', initStats.relationshipTypes.join(', '));
    
    // Test 11: Export and Import Graph
    console.log('\n11. Testing Graph Export/Import');
    console.log('-'.repeat(40));
    
    const exportedGraph = contextManager.graph.toJSON();
    console.log('✓ Exported graph:');
    console.log('  - Nodes:', exportedGraph.nodes.length);
    console.log('  - Edges:', exportedGraph.edges.length);
    
    const importedGraph = ContextGraph.fromJSON(exportedGraph);
    const importStats = importedGraph.getStatistics();
    console.log('✓ Imported graph:');
    console.log('  - Nodes:', importStats.nodeCount);
    console.log('  - Edges:', importStats.edgeCount);
    
    // Test 12: Performance with Large Graph
    console.log('\n12. Testing Performance with Larger Graph');
    console.log('-'.repeat(40));
    
    const perfGraph = new ContextGraph();
    const nodeCount = 100;
    const edgeCount = 200;
    
    const startTime = Date.now();
    
    // Add nodes
    for (let i = 0; i < nodeCount; i++) {
      perfGraph.addNode(`perf-node-${i}`, { data: { index: i } });
    }
    
    // Add random edges
    for (let i = 0; i < edgeCount; i++) {
      const from = `perf-node-${Math.floor(Math.random() * nodeCount)}`;
      const to = `perf-node-${Math.floor(Math.random() * nodeCount)}`;
      if (from !== to) {
        try {
          perfGraph.addEdge(from, to, {
            type: ['depends-on', 'references', 'relates-to'][Math.floor(Math.random() * 3)],
            weight: Math.random()
          });
        } catch (e) {
          // Ignore duplicate edges
        }
      }
    }
    
    const buildTime = Date.now() - startTime;
    console.log(`✓ Built graph with ${nodeCount} nodes and ${perfGraph.getStatistics().edgeCount} edges in ${buildTime}ms`);
    
    // Test traversal performance
    const travStart = Date.now();
    const deps = perfGraph.findDependencies('perf-node-0', { maxDepth: 5 });
    const travTime = Date.now() - travStart;
    console.log(`✓ Found ${deps.length} dependencies in ${travTime}ms`);
    
    // Test cycle detection performance
    const cycleStart = Date.now();
    const perfCycles = perfGraph.detectCycles();
    const cycleTime = Date.now() - cycleStart;
    console.log(`✓ Detected ${perfCycles.length} cycles in ${cycleTime}ms`);
    
    // Cleanup
    console.log('\n' + '='.repeat(50));
    console.log('✅ All context graph tests completed successfully!');
    console.log('='.repeat(50));
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    console.error(error.stack);
    throw error;
  } finally {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (e) {}
  }
}

// Run the test
testContextGraph().catch(console.error);