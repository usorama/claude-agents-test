# Story IMP-006: Graph-Based Context Relationship Management

## Story
As a Context Manager, I need to implement graph-based relationship tracking between contexts to enable efficient navigation, dependency resolution, and impact analysis across the multi-agent system.

## Background
Research shows that contexts have complex relationships (parent-child, dependencies, references). A graph-based approach enables efficient traversal, relationship queries, and impact analysis when contexts change.

## Acceptance Criteria
1. **Graph Structure**
   - Nodes represent contexts (global, project, agent, task)
   - Edges represent relationships (parent, dependency, reference)
   - Support for directed and weighted edges
   - Metadata on both nodes and edges

2. **Relationship Types**
   - Parent-Child hierarchical relationships
   - Dependency relationships (requires, blocks)
   - Reference relationships (mentions, relates-to)
   - Temporal relationships (before, after, during)

3. **Graph Operations**
   - Add/remove nodes and edges
   - Traverse relationships (BFS, DFS)
   - Find shortest path between contexts
   - Detect cycles in dependencies

4. **Query Capabilities**
   - Find all dependencies of a context
   - Find contexts affected by changes
   - Query contexts by relationship type
   - Complex graph queries with filters

## Technical Requirements
- Implement ContextGraph class
- Add graph operations to ContextManager
- Create relationship indexing system
- Add graph visualization capability

## Implementation Details

```javascript
// Context Graph Implementation
class ContextGraph {
  constructor() {
    this.nodes = new Map(); // contextId -> node data
    this.edges = new Map(); // contextId -> Set of edges
    this.reverseEdges = new Map(); // For efficient reverse lookups
    this.relationshipIndex = new Map(); // relationship type -> Set of edges
  }
  
  addNode(contextId, contextData) {
    this.nodes.set(contextId, {
      id: contextId,
      data: contextData,
      metadata: {
        createdAt: new Date(),
        lastAccessed: new Date(),
        accessCount: 0
      }
    });
    
    if (!this.edges.has(contextId)) {
      this.edges.set(contextId, new Set());
    }
    if (!this.reverseEdges.has(contextId)) {
      this.reverseEdges.set(contextId, new Set());
    }
  }
  
  addEdge(fromId, toId, relationship) {
    const edge = {
      from: fromId,
      to: toId,
      type: relationship.type,
      weight: relationship.weight || 1,
      metadata: relationship.metadata || {},
      createdAt: new Date()
    };
    
    // Add to forward edges
    this.edges.get(fromId).add(edge);
    
    // Add to reverse edges
    this.reverseEdges.get(toId).add(edge);
    
    // Index by relationship type
    if (!this.relationshipIndex.has(relationship.type)) {
      this.relationshipIndex.set(relationship.type, new Set());
    }
    this.relationshipIndex.get(relationship.type).add(edge);
  }
  
  // Find all dependencies of a context
  findDependencies(contextId, options = {}) {
    const { 
      maxDepth = Infinity, 
      relationshipTypes = ['depends-on', 'requires'],
      includeTransitive = true 
    } = options;
    
    const dependencies = new Set();
    const visited = new Set();
    
    const traverse = (nodeId, depth) => {
      if (depth > maxDepth || visited.has(nodeId)) return;
      visited.add(nodeId);
      
      const edges = this.edges.get(nodeId) || new Set();
      for (const edge of edges) {
        if (relationshipTypes.includes(edge.type)) {
          dependencies.add({
            contextId: edge.to,
            relationship: edge.type,
            distance: depth,
            metadata: edge.metadata
          });
          
          if (includeTransitive) {
            traverse(edge.to, depth + 1);
          }
        }
      }
    };
    
    traverse(contextId, 1);
    return Array.from(dependencies);
  }
  
  // Find contexts affected by changes
  findImpactedContexts(contextId, options = {}) {
    const { 
      relationshipTypes = ['depends-on', 'parent', 'references'],
      maxDistance = 3 
    } = options;
    
    const impacted = new Map(); // contextId -> impact score
    const queue = [{ id: contextId, distance: 0, impact: 1.0 }];
    const visited = new Set();
    
    while (queue.length > 0) {
      const { id, distance, impact } = queue.shift();
      
      if (distance > maxDistance || visited.has(id)) continue;
      visited.add(id);
      
      // Check reverse edges (who depends on this context)
      const reverseEdges = this.reverseEdges.get(id) || new Set();
      for (const edge of reverseEdges) {
        if (relationshipTypes.includes(edge.type)) {
          const newImpact = impact * (edge.weight || 0.8); // Decay factor
          
          if (!impacted.has(edge.from) || impacted.get(edge.from) < newImpact) {
            impacted.set(edge.from, newImpact);
            queue.push({
              id: edge.from,
              distance: distance + 1,
              impact: newImpact
            });
          }
        }
      }
    }
    
    return Array.from(impacted.entries())
      .map(([contextId, impact]) => ({ contextId, impact }))
      .sort((a, b) => b.impact - a.impact);
  }
  
  // Detect dependency cycles
  detectCycles() {
    const cycles = [];
    const visited = new Set();
    const recursionStack = new Set();
    const path = [];
    
    const hasCycleDFS = (nodeId) => {
      visited.add(nodeId);
      recursionStack.add(nodeId);
      path.push(nodeId);
      
      const edges = this.edges.get(nodeId) || new Set();
      for (const edge of edges) {
        if (edge.type === 'depends-on' || edge.type === 'requires') {
          if (!visited.has(edge.to)) {
            if (hasCycleDFS(edge.to)) {
              return true;
            }
          } else if (recursionStack.has(edge.to)) {
            // Found a cycle
            const cycleStart = path.indexOf(edge.to);
            cycles.push({
              nodes: path.slice(cycleStart).concat(edge.to),
              type: 'dependency-cycle'
            });
            return true;
          }
        }
      }
      
      path.pop();
      recursionStack.delete(nodeId);
      return false;
    };
    
    for (const nodeId of this.nodes.keys()) {
      if (!visited.has(nodeId)) {
        hasCycleDFS(nodeId);
      }
    }
    
    return cycles;
  }
  
  // Graph query with filters
  query(options) {
    const {
      startNodes = [],
      relationshipTypes = [],
      maxDepth = 3,
      filters = {},
      aggregation = null
    } = options;
    
    const results = [];
    const visited = new Set();
    
    const matchesFilters = (node) => {
      for (const [key, value] of Object.entries(filters)) {
        if (node.data[key] !== value) return false;
      }
      return true;
    };
    
    const traverse = (nodeId, depth, path) => {
      if (depth > maxDepth || visited.has(nodeId)) return;
      visited.add(nodeId);
      
      const node = this.nodes.get(nodeId);
      if (matchesFilters(node)) {
        results.push({
          node,
          path,
          depth
        });
      }
      
      const edges = this.edges.get(nodeId) || new Set();
      for (const edge of edges) {
        if (relationshipTypes.length === 0 || relationshipTypes.includes(edge.type)) {
          traverse(edge.to, depth + 1, [...path, edge]);
        }
      }
    };
    
    const startSet = startNodes.length > 0 ? startNodes : Array.from(this.nodes.keys());
    for (const nodeId of startSet) {
      traverse(nodeId, 0, []);
    }
    
    return aggregation ? this.aggregate(results, aggregation) : results;
  }
}

// Enhanced ContextManager with Graph
class ContextManager {
  constructor(config) {
    super(config);
    this.graph = new ContextGraph();
  }
  
  async createContext(level, data, parentId = null) {
    const context = await super.createContext(level, data, parentId);
    
    // Add to graph
    this.graph.addNode(context.id, context);
    
    // Add parent relationship if exists
    if (parentId) {
      this.graph.addEdge(parentId, context.id, {
        type: 'parent',
        weight: 1.0
      });
    }
    
    // Extract and add other relationships
    await this.extractRelationships(context);
    
    return context;
  }
  
  async extractRelationships(context) {
    // Look for references to other contexts
    const references = this.findContextReferences(context.data);
    
    for (const ref of references) {
      this.graph.addEdge(context.id, ref.contextId, {
        type: ref.type || 'references',
        weight: ref.strength || 0.5,
        metadata: ref.metadata
      });
    }
    
    // Add dependency relationships based on content
    if (context.data.dependencies) {
      for (const dep of context.data.dependencies) {
        this.graph.addEdge(context.id, dep.contextId, {
          type: 'depends-on',
          weight: 0.9,
          metadata: { required: dep.required }
        });
      }
    }
  }
  
  async getContextWithRelationships(contextId) {
    const context = await this.getContext(contextId);
    
    return {
      ...context,
      relationships: {
        dependencies: this.graph.findDependencies(contextId),
        dependents: this.graph.findImpactedContexts(contextId, { maxDistance: 1 }),
        related: this.graph.query({
          startNodes: [contextId],
          maxDepth: 2,
          relationshipTypes: ['references', 'relates-to']
        })
      }
    };
  }
  
  async analyzeImpact(contextId, changeType = 'update') {
    const impacted = this.graph.findImpactedContexts(contextId);
    
    return {
      directImpact: impacted.filter(i => i.impact >= 0.8),
      indirectImpact: impacted.filter(i => i.impact < 0.8 && i.impact >= 0.3),
      minorImpact: impacted.filter(i => i.impact < 0.3),
      totalAffected: impacted.length,
      riskLevel: this.calculateRiskLevel(impacted, changeType)
    };
  }
}
```

## Test Cases
1. Test graph construction from contexts
2. Test relationship traversal
3. Test cycle detection
4. Test impact analysis
5. Test complex graph queries

## Dependencies
- ContextManager (already implemented)
- Graph visualization library (optional)

## Effort Estimate
5-6 hours of implementation

## Priority
Medium - Enhances context navigation and analysis

## Notes
- Consider persistence of graph structure
- May want graph visualization for debugging
- Could integrate with monitoring for relationship health
- Consider caching for frequently traversed paths