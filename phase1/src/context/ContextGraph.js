import winston from 'winston';

/**
 * Graph-based context relationship management
 * Enables efficient navigation, dependency resolution, and impact analysis
 */
export class ContextGraph {
  constructor(config = {}) {
    this.config = {
      maxTraversalDepth: 10,
      defaultEdgeWeight: 1.0,
      impactDecayFactor: 0.8,
      ...config
    };
    
    // Core graph structures
    this.nodes = new Map(); // contextId -> node data
    this.edges = new Map(); // contextId -> Set of edges
    this.reverseEdges = new Map(); // For efficient reverse lookups
    this.relationshipIndex = new Map(); // relationship type -> Set of edges
    
    // Statistics
    this.stats = {
      nodeCount: 0,
      edgeCount: 0,
      relationshipTypes: new Set()
    };
    
    this.logger = winston.createLogger({
      level: config.logLevel || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { service: 'ContextGraph' },
      transports: [
        new winston.transports.Console({
          format: winston.format.simple()
        })
      ]
    });
  }

  /**
   * Add a node to the graph
   */
  addNode(contextId, contextData) {
    if (this.nodes.has(contextId)) {
      this.logger.warn('Node already exists, updating', { contextId });
    }
    
    this.nodes.set(contextId, {
      id: contextId,
      data: contextData,
      metadata: {
        createdAt: new Date(),
        lastAccessed: new Date(),
        accessCount: 0
      }
    });
    
    // Initialize edge maps if not present
    if (!this.edges.has(contextId)) {
      this.edges.set(contextId, new Set());
    }
    if (!this.reverseEdges.has(contextId)) {
      this.reverseEdges.set(contextId, new Set());
    }
    
    this.stats.nodeCount = this.nodes.size;
    this.logger.debug('Node added', { contextId, nodeCount: this.stats.nodeCount });
  }

  /**
   * Add an edge between two nodes
   */
  addEdge(fromId, toId, relationship) {
    // Ensure both nodes exist
    if (!this.nodes.has(fromId)) {
      throw new Error(`Source node not found: ${fromId}`);
    }
    if (!this.nodes.has(toId)) {
      throw new Error(`Target node not found: ${toId}`);
    }
    
    const edge = {
      from: fromId,
      to: toId,
      type: relationship.type,
      weight: relationship.weight || this.config.defaultEdgeWeight,
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
    
    // Update statistics
    this.stats.edgeCount++;
    this.stats.relationshipTypes.add(relationship.type);
    
    this.logger.debug('Edge added', { 
      from: fromId, 
      to: toId, 
      type: relationship.type,
      edgeCount: this.stats.edgeCount 
    });
  }

  /**
   * Remove a node and all its edges
   */
  removeNode(contextId) {
    if (!this.nodes.has(contextId)) {
      return false;
    }
    
    // Remove all outgoing edges
    const outgoingEdges = this.edges.get(contextId) || new Set();
    for (const edge of outgoingEdges) {
      this.removeEdge(edge.from, edge.to, edge.type);
    }
    
    // Remove all incoming edges
    const incomingEdges = this.reverseEdges.get(contextId) || new Set();
    for (const edge of incomingEdges) {
      this.removeEdge(edge.from, edge.to, edge.type);
    }
    
    // Remove node
    this.nodes.delete(contextId);
    this.edges.delete(contextId);
    this.reverseEdges.delete(contextId);
    
    this.stats.nodeCount = this.nodes.size;
    this.logger.debug('Node removed', { contextId, nodeCount: this.stats.nodeCount });
    
    return true;
  }

  /**
   * Remove an edge
   */
  removeEdge(fromId, toId, type) {
    const edges = this.edges.get(fromId);
    if (!edges) return false;
    
    let removed = false;
    for (const edge of edges) {
      if (edge.to === toId && edge.type === type) {
        edges.delete(edge);
        
        // Remove from reverse edges
        const reverseEdges = this.reverseEdges.get(toId);
        if (reverseEdges) {
          reverseEdges.delete(edge);
        }
        
        // Remove from relationship index
        const typeEdges = this.relationshipIndex.get(type);
        if (typeEdges) {
          typeEdges.delete(edge);
        }
        
        this.stats.edgeCount--;
        removed = true;
        break;
      }
    }
    
    return removed;
  }

  /**
   * Find all dependencies of a context
   */
  findDependencies(contextId, options = {}) {
    const { 
      maxDepth = this.config.maxTraversalDepth, 
      relationshipTypes = ['depends-on', 'requires'],
      includeTransitive = true 
    } = options;
    
    const dependencies = new Map(); // contextId -> dependency info
    const visited = new Set();
    
    const traverse = (nodeId, depth, path = []) => {
      if (depth > maxDepth || visited.has(nodeId)) return;
      visited.add(nodeId);
      
      const edges = this.edges.get(nodeId) || new Set();
      for (const edge of edges) {
        if (relationshipTypes.includes(edge.type)) {
          const existingDep = dependencies.get(edge.to);
          const newDep = {
            contextId: edge.to,
            relationship: edge.type,
            distance: depth,
            weight: edge.weight,
            path: [...path, edge],
            metadata: edge.metadata
          };
          
          // Keep the shortest path or highest weight
          if (!existingDep || existingDep.distance > depth || 
              (existingDep.distance === depth && existingDep.weight < edge.weight)) {
            dependencies.set(edge.to, newDep);
          }
          
          if (includeTransitive) {
            traverse(edge.to, depth + 1, [...path, edge]);
          }
        }
      }
    };
    
    traverse(contextId, 1);
    
    // Update access count
    this.updateNodeAccess(contextId);
    
    return Array.from(dependencies.values())
      .sort((a, b) => a.distance - b.distance || b.weight - a.weight);
  }

  /**
   * Find contexts affected by changes
   */
  findImpactedContexts(contextId, options = {}) {
    const { 
      relationshipTypes = ['depends-on', 'parent', 'references'],
      maxDistance = 3,
      impactThreshold = 0.1
    } = options;
    
    const impacted = new Map(); // contextId -> impact info
    const queue = [{ id: contextId, distance: 0, impact: 1.0, path: [] }];
    const processed = new Set();
    
    while (queue.length > 0) {
      const current = queue.shift();
      const { id, distance, impact, path } = current;
      
      if (distance > maxDistance || processed.has(id)) continue;
      processed.add(id);
      
      // Check reverse edges (who depends on this context)
      const reverseEdges = this.reverseEdges.get(id) || new Set();
      for (const edge of reverseEdges) {
        if (relationshipTypes.includes(edge.type)) {
          const newImpact = impact * edge.weight * Math.pow(this.config.impactDecayFactor, distance);
          
          if (newImpact >= impactThreshold) {
            const existingImpact = impacted.get(edge.from);
            
            if (!existingImpact || existingImpact.impact < newImpact) {
              impacted.set(edge.from, {
                contextId: edge.from,
                impact: newImpact,
                distance: distance + 1,
                relationship: edge.type,
                path: [...path, edge]
              });
              
              queue.push({
                id: edge.from,
                distance: distance + 1,
                impact: newImpact,
                path: [...path, edge]
              });
            }
          }
        }
      }
    }
    
    return Array.from(impacted.values())
      .sort((a, b) => b.impact - a.impact);
  }

  /**
   * Detect dependency cycles
   */
  detectCycles() {
    const cycles = [];
    const visited = new Set();
    const recursionStack = new Set();
    
    const detectCycleDFS = (nodeId, path = []) => {
      visited.add(nodeId);
      recursionStack.add(nodeId);
      path.push(nodeId);
      
      const edges = this.edges.get(nodeId) || new Set();
      for (const edge of edges) {
        if (edge.type === 'depends-on' || edge.type === 'requires') {
          if (!visited.has(edge.to)) {
            if (detectCycleDFS(edge.to, [...path])) {
              return true;
            }
          } else if (recursionStack.has(edge.to)) {
            // Found a cycle
            const cycleStart = path.indexOf(edge.to);
            cycles.push({
              nodes: path.slice(cycleStart).concat(edge.to),
              type: 'dependency-cycle',
              edges: this.getEdgesInPath(path.slice(cycleStart).concat(edge.to))
            });
          }
        }
      }
      
      recursionStack.delete(nodeId);
      return false;
    };
    
    // Check all nodes for cycles
    for (const nodeId of this.nodes.keys()) {
      if (!visited.has(nodeId)) {
        detectCycleDFS(nodeId);
      }
    }
    
    this.logger.info('Cycle detection complete', { cyclesFound: cycles.length });
    return cycles;
  }

  /**
   * Find shortest path between two contexts
   */
  findShortestPath(fromId, toId, options = {}) {
    const { 
      relationshipTypes = null, // null means all types
      weighted = true 
    } = options;
    
    if (!this.nodes.has(fromId) || !this.nodes.has(toId)) {
      return null;
    }
    
    const distances = new Map();
    const previous = new Map();
    const unvisited = new Set(this.nodes.keys());
    
    // Initialize distances
    for (const nodeId of this.nodes.keys()) {
      distances.set(nodeId, Infinity);
    }
    distances.set(fromId, 0);
    
    while (unvisited.size > 0) {
      // Find unvisited node with minimum distance
      let current = null;
      let minDistance = Infinity;
      
      for (const nodeId of unvisited) {
        const distance = distances.get(nodeId);
        if (distance < minDistance) {
          minDistance = distance;
          current = nodeId;
        }
      }
      
      if (current === null || current === toId) break;
      
      unvisited.delete(current);
      
      // Update distances to neighbors
      const edges = this.edges.get(current) || new Set();
      for (const edge of edges) {
        if (relationshipTypes && !relationshipTypes.includes(edge.type)) continue;
        
        const edgeWeight = weighted ? (1 / edge.weight) : 1;
        const altDistance = distances.get(current) + edgeWeight;
        
        if (altDistance < distances.get(edge.to)) {
          distances.set(edge.to, altDistance);
          previous.set(edge.to, { nodeId: current, edge });
        }
      }
    }
    
    // Reconstruct path
    if (!previous.has(toId)) {
      return null; // No path exists
    }
    
    const path = [];
    let current = toId;
    
    while (current !== fromId) {
      const prev = previous.get(current);
      path.unshift({
        from: prev.nodeId,
        to: current,
        edge: prev.edge
      });
      current = prev.nodeId;
    }
    
    return {
      path,
      distance: distances.get(toId),
      nodes: [fromId, ...path.map(p => p.to)]
    };
  }

  /**
   * Query the graph with filters
   */
  query(options = {}) {
    const {
      startNodes = [],
      relationshipTypes = [],
      maxDepth = 3,
      nodeFilter = null,
      edgeFilter = null,
      limit = null
    } = options;
    
    const results = [];
    const visited = new Set();
    
    const matchesNodeFilter = (node) => {
      if (!nodeFilter) return true;
      return nodeFilter(node);
    };
    
    const matchesEdgeFilter = (edge) => {
      if (!edgeFilter) return true;
      if (relationshipTypes.length > 0 && !relationshipTypes.includes(edge.type)) return false;
      return edgeFilter(edge);
    };
    
    const traverse = (nodeId, depth, path) => {
      if (depth > maxDepth || visited.has(nodeId)) return;
      if (limit && results.length >= limit) return;
      
      visited.add(nodeId);
      
      const node = this.nodes.get(nodeId);
      if (node && matchesNodeFilter(node)) {
        results.push({
          node,
          path,
          depth
        });
      }
      
      const edges = this.edges.get(nodeId) || new Set();
      for (const edge of edges) {
        if (matchesEdgeFilter(edge)) {
          traverse(edge.to, depth + 1, [...path, edge]);
        }
      }
    };
    
    const startSet = startNodes.length > 0 ? startNodes : Array.from(this.nodes.keys());
    for (const nodeId of startSet) {
      if (limit && results.length >= limit) break;
      traverse(nodeId, 0, []);
    }
    
    return results;
  }

  /**
   * Get node neighbors
   */
  getNeighbors(contextId, options = {}) {
    const { direction = 'both', relationshipTypes = [] } = options;
    const neighbors = new Set();
    
    if (direction === 'outgoing' || direction === 'both') {
      const edges = this.edges.get(contextId) || new Set();
      for (const edge of edges) {
        if (relationshipTypes.length === 0 || relationshipTypes.includes(edge.type)) {
          neighbors.add({
            contextId: edge.to,
            relationship: edge.type,
            direction: 'outgoing',
            weight: edge.weight
          });
        }
      }
    }
    
    if (direction === 'incoming' || direction === 'both') {
      const reverseEdges = this.reverseEdges.get(contextId) || new Set();
      for (const edge of reverseEdges) {
        if (relationshipTypes.length === 0 || relationshipTypes.includes(edge.type)) {
          neighbors.add({
            contextId: edge.from,
            relationship: edge.type,
            direction: 'incoming',
            weight: edge.weight
          });
        }
      }
    }
    
    return Array.from(neighbors);
  }

  /**
   * Get graph statistics
   */
  getStatistics() {
    const stats = {
      ...this.stats,
      relationshipTypes: Array.from(this.stats.relationshipTypes),
      averageDegree: this.calculateAverageDegree(),
      density: this.calculateDensity(),
      components: this.countComponents()
    };
    
    return stats;
  }

  /**
   * Calculate average node degree
   */
  calculateAverageDegree() {
    if (this.nodes.size === 0) return 0;
    
    let totalDegree = 0;
    for (const nodeId of this.nodes.keys()) {
      const outDegree = (this.edges.get(nodeId) || new Set()).size;
      const inDegree = (this.reverseEdges.get(nodeId) || new Set()).size;
      totalDegree += outDegree + inDegree;
    }
    
    return totalDegree / this.nodes.size;
  }

  /**
   * Calculate graph density
   */
  calculateDensity() {
    const n = this.nodes.size;
    if (n <= 1) return 0;
    
    const maxPossibleEdges = n * (n - 1);
    return this.stats.edgeCount / maxPossibleEdges;
  }

  /**
   * Count connected components
   */
  countComponents() {
    const visited = new Set();
    let components = 0;
    
    const dfs = (nodeId) => {
      visited.add(nodeId);
      
      // Check both directions
      const edges = this.edges.get(nodeId) || new Set();
      const reverseEdges = this.reverseEdges.get(nodeId) || new Set();
      
      for (const edge of edges) {
        if (!visited.has(edge.to)) {
          dfs(edge.to);
        }
      }
      
      for (const edge of reverseEdges) {
        if (!visited.has(edge.from)) {
          dfs(edge.from);
        }
      }
    };
    
    for (const nodeId of this.nodes.keys()) {
      if (!visited.has(nodeId)) {
        dfs(nodeId);
        components++;
      }
    }
    
    return components;
  }

  /**
   * Helper: Update node access metadata
   */
  updateNodeAccess(contextId) {
    const node = this.nodes.get(contextId);
    if (node) {
      node.metadata.lastAccessed = new Date();
      node.metadata.accessCount++;
    }
  }

  /**
   * Helper: Get edges in a path
   */
  getEdgesInPath(nodePath) {
    const edges = [];
    
    for (let i = 0; i < nodePath.length - 1; i++) {
      const fromId = nodePath[i];
      const toId = nodePath[i + 1];
      
      const nodeEdges = this.edges.get(fromId) || new Set();
      for (const edge of nodeEdges) {
        if (edge.to === toId) {
          edges.push(edge);
          break;
        }
      }
    }
    
    return edges;
  }

  /**
   * Export graph to JSON
   */
  toJSON() {
    const nodes = Array.from(this.nodes.entries()).map(([id, node]) => ({
      id,
      ...node
    }));
    
    const edges = [];
    for (const [fromId, edgeSet] of this.edges) {
      for (const edge of edgeSet) {
        edges.push(edge);
      }
    }
    
    return {
      nodes,
      edges,
      stats: this.getStatistics()
    };
  }

  /**
   * Import graph from JSON
   */
  static fromJSON(json) {
    const graph = new ContextGraph();
    
    // Add nodes
    for (const node of json.nodes) {
      graph.addNode(node.id, node.data);
      // Restore metadata
      if (node.metadata) {
        graph.nodes.get(node.id).metadata = node.metadata;
      }
    }
    
    // Add edges
    for (const edge of json.edges) {
      graph.addEdge(edge.from, edge.to, {
        type: edge.type,
        weight: edge.weight,
        metadata: edge.metadata
      });
    }
    
    return graph;
  }
}