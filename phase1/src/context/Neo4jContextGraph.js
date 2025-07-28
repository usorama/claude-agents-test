import winston from 'winston';
import { Neo4jConnection } from './Neo4jConnection.js';

/**
 * Neo4j-based implementation of ContextGraph
 * Provides the same interface as ContextGraph but persists to Neo4j
 */
export class Neo4jContextGraph {
  constructor(config = {}) {
    this.config = {
      maxTraversalDepth: 10,
      defaultEdgeWeight: 1.0,
      impactDecayFactor: 0.8,
      ...config
    };
    
    this.connection = new Neo4jConnection(config.neo4j || {});
    
    this.logger = winston.createLogger({
      level: config.logLevel || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { service: 'Neo4jContextGraph' },
      transports: [
        new winston.transports.Console({
          format: winston.format.simple()
        })
      ]
    });
  }

  /**
   * Initialize connection to Neo4j
   */
  async initialize() {
    await this.connection.connect();
    this.logger.info('Neo4j context graph initialized');
  }

  /**
   * Add a node to the graph
   */
  async addNode(contextId, contextData) {
    const query = `
      MERGE (c:Context {id: $id})
      SET c += $properties
      SET c.lastUpdated = timestamp()
      RETURN c
    `;
    
    const properties = {
      level: contextData.level,
      parentId: contextData.parentId,
      metadata: JSON.stringify(contextData.metadata || {}),
      data: JSON.stringify(contextData.data || {}),
      createdAt: contextData.createdAt || new Date().toISOString(),
      type: contextData.data?.agentType || contextData.data?.type || 'unknown'
    };
    
    try {
      await this.connection.run(query, { id: contextId, properties });
      this.logger.debug('Node added to Neo4j', { contextId });
    } catch (error) {
      this.logger.error('Failed to add node', { contextId, error: error.message });
      throw error;
    }
  }

  /**
   * Add an edge between two nodes
   */
  async addEdge(fromId, toId, relationship) {
    // First ensure both nodes exist
    const checkQuery = `
      MATCH (from:Context {id: $fromId})
      MATCH (to:Context {id: $toId})
      RETURN from, to
    `;
    
    const checkResult = await this.connection.run(checkQuery, { fromId, toId });
    
    if (checkResult.records.length === 0) {
      throw new Error(`One or both nodes not found: ${fromId}, ${toId}`);
    }
    
    // Create or update the relationship
    const createQuery = `
      MATCH (from:Context {id: $fromId})
      MATCH (to:Context {id: $toId})
      MERGE (from)-[r:RELATES_TO {type: $type}]->(to)
      SET r.weight = $weight
      SET r.metadata = $metadata
      SET r.createdAt = coalesce(r.createdAt, $createdAt)
      SET r.lastUpdated = timestamp()
      RETURN r
    `;
    
    const params = {
      fromId,
      toId,
      type: relationship.type,
      weight: relationship.weight || this.config.defaultEdgeWeight,
      metadata: JSON.stringify(relationship.metadata || {}),
      createdAt: new Date().toISOString()
    };
    
    try {
      await this.connection.run(createQuery, params);
      this.logger.debug('Edge added to Neo4j', { from: fromId, to: toId, type: relationship.type });
    } catch (error) {
      this.logger.error('Failed to add edge', { fromId, toId, error: error.message });
      throw error;
    }
  }

  /**
   * Remove a node and all its edges
   */
  async removeNode(contextId) {
    const query = `
      MATCH (c:Context {id: $id})
      DETACH DELETE c
      RETURN count(c) as deleted
    `;
    
    const result = await this.connection.run(query, { id: contextId });
    const deleted = result.records[0].get('deleted').toNumber();
    
    this.logger.debug('Node removed from Neo4j', { contextId, deleted });
    return deleted > 0;
  }

  /**
   * Remove an edge
   */
  async removeEdge(fromId, toId, type) {
    const query = `
      MATCH (from:Context {id: $fromId})-[r:RELATES_TO {type: $type}]->(to:Context {id: $toId})
      DELETE r
      RETURN count(r) as deleted
    `;
    
    const result = await this.connection.run(query, { fromId, toId, type });
    const deleted = result.records[0].get('deleted').toNumber();
    
    return deleted > 0;
  }

  /**
   * Find all dependencies of a context
   */
  async findDependencies(contextId, options = {}) {
    const { 
      maxDepth = this.config.maxTraversalDepth, 
      relationshipTypes = ['depends-on', 'requires'],
      includeTransitive = true 
    } = options;
    
    const depthClause = includeTransitive ? `1..${maxDepth}` : '1';
    const typeFilter = relationshipTypes.map(t => `'${t}'`).join(', ');
    
    const query = `
      MATCH path = (start:Context {id: $contextId})-[r:RELATES_TO*${depthClause}]->(dep:Context)
      WHERE any(rel in relationships(path) WHERE rel.type IN [${typeFilter}])
      WITH dep, path, relationships(path) as pathRels,
           reduce(weight = 1.0, rel in relationships(path) | weight * rel.weight) as pathWeight,
           length(path) as distance
      RETURN DISTINCT dep.id as contextId, 
             head(pathRels).type as relationship,
             distance,
             pathWeight as weight,
             [rel in pathRels | {type: rel.type, weight: rel.weight}] as path
      ORDER BY distance ASC, pathWeight DESC
    `;
    
    try {
      const result = await this.connection.run(query, { contextId });
      
      return result.records.map(record => ({
        contextId: record.get('contextId'),
        relationship: record.get('relationship'),
        distance: record.get('distance').toNumber(),
        weight: record.get('weight'),
        path: record.get('path'),
        metadata: {}
      }));
    } catch (error) {
      this.logger.error('Failed to find dependencies', { contextId, error: error.message });
      return [];
    }
  }

  /**
   * Find contexts affected by changes
   */
  async findImpactedContexts(contextId, options = {}) {
    const { 
      relationshipTypes = ['depends-on', 'parent', 'references'],
      maxDistance = 3,
      impactThreshold = 0.1
    } = options;
    
    const typeFilter = relationshipTypes.map(t => `'${t}'`).join(', ');
    
    const query = `
      MATCH path = (impacted:Context)-[r:RELATES_TO*1..${maxDistance}]->(source:Context {id: $contextId})
      WHERE any(rel in relationships(path) WHERE rel.type IN [${typeFilter}])
      WITH impacted, path, relationships(path) as pathRels,
           reduce(impact = 1.0, rel in relationships(path) | 
             impact * rel.weight * ${this.config.impactDecayFactor}) as impactScore,
           length(path) as distance
      WITH impacted, path, pathRels, impactScore, distance,
           head(pathRels).type as relationship
      WHERE impactScore >= $impactThreshold
      RETURN DISTINCT impacted.id as contextId,
             impactScore as impact,
             distance,
             relationship,
             [rel in pathRels | {type: rel.type, weight: rel.weight}] as path
      ORDER BY impactScore DESC
    `;
    
    try {
      const result = await this.connection.run(query, { 
        contextId, 
        impactThreshold 
      });
      
      return result.records.map(record => ({
        contextId: record.get('contextId'),
        impact: record.get('impact'),
        distance: record.get('distance').toNumber(),
        relationship: record.get('relationship'),
        path: record.get('path')
      }));
    } catch (error) {
      this.logger.error('Failed to find impacted contexts', { contextId, error: error.message });
      return [];
    }
  }

  /**
   * Detect dependency cycles
   */
  async detectCycles() {
    // Neo4j doesn't have built-in cycle detection for directed graphs
    // We'll use APOC if available, otherwise a custom query
    const query = `
      MATCH (n:Context)
      WITH collect(n) as nodes
      UNWIND nodes as startNode
      MATCH path = (startNode)-[r:RELATES_TO*]->(startNode)
      WHERE all(rel in relationships(path) WHERE rel.type IN ['depends-on', 'requires'])
      WITH path, [node in nodes(path) | node.id] as nodeIds
      RETURN DISTINCT nodeIds as nodes,
             [rel in relationships(path) | {
               from: startNode(rel).id,
               to: endNode(rel).id,
               type: rel.type
             }] as edges,
             'dependency-cycle' as type
      LIMIT 100
    `;
    
    try {
      const result = await this.connection.run(query);
      
      return result.records.map(record => ({
        nodes: record.get('nodes'),
        edges: record.get('edges'),
        type: record.get('type')
      }));
    } catch (error) {
      this.logger.error('Failed to detect cycles', { error: error.message });
      return [];
    }
  }

  /**
   * Find shortest path between two contexts
   */
  async findShortestPath(fromId, toId, options = {}) {
    const { 
      relationshipTypes = null,
      weighted = true 
    } = options;
    
    const typeFilter = relationshipTypes 
      ? `AND r.type IN [${relationshipTypes.map(t => `'${t}'`).join(', ')}]`
      : '';
    
    // Use Neo4j's built-in shortest path with optional weight consideration
    const query = weighted ? `
      MATCH (from:Context {id: $fromId}), (to:Context {id: $toId})
      CALL apoc.algo.dijkstra(from, to, 'RELATES_TO>', 'weight') YIELD path, weight
      RETURN path, weight as distance
    ` : `
      MATCH path = shortestPath((from:Context {id: $fromId})-[r:RELATES_TO*]->(to:Context {id: $toId}))
      WHERE all(rel in relationships(path) WHERE 1=1 ${typeFilter})
      RETURN path, length(path) as distance
    `;
    
    try {
      // Try with APOC first (for weighted paths)
      let result;
      if (weighted) {
        try {
          result = await this.connection.run(query, { fromId, toId });
        } catch (apocError) {
          // Fallback to non-weighted if APOC not available
          this.logger.debug('APOC not available, using unweighted shortest path');
          const fallbackQuery = `
            MATCH path = shortestPath((from:Context {id: $fromId})-[r:RELATES_TO*]->(to:Context {id: $toId}))
            WHERE all(rel in relationships(path) WHERE 1=1 ${typeFilter})
            RETURN path, reduce(weight = 0, rel in relationships(path) | weight + (1.0 / rel.weight)) as distance
          `;
          result = await this.connection.run(fallbackQuery, { fromId, toId });
        }
      } else {
        result = await this.connection.run(query, { fromId, toId });
      }
      
      if (result.records.length === 0) {
        return null;
      }
      
      const record = result.records[0];
      const path = record.get('path');
      
      return {
        path: path.relationships.map(rel => ({
          from: rel.start.properties.id,
          to: rel.end.properties.id,
          edge: {
            type: rel.properties.type,
            weight: rel.properties.weight
          }
        })),
        distance: record.get('distance'),
        nodes: path.nodes.map(node => node.properties.id)
      };
    } catch (error) {
      this.logger.error('Failed to find shortest path', { fromId, toId, error: error.message });
      return null;
    }
  }

  /**
   * Query the graph with filters
   */
  async query(options = {}) {
    const {
      startNodes = [],
      relationshipTypes = [],
      maxDepth = 3,
      nodeFilter = null,
      edgeFilter = null,
      limit = null
    } = options;
    
    // Build the query dynamically
    let matchClause = startNodes.length > 0
      ? `MATCH (start:Context) WHERE start.id IN $startNodes`
      : `MATCH (start:Context)`;
    
    let pathClause = maxDepth > 0
      ? `OPTIONAL MATCH path = (start)-[r:RELATES_TO*0..${maxDepth}]->(end:Context)`
      : `WITH start as end, null as path`;
    
    let whereConditions = [];
    
    if (relationshipTypes.length > 0) {
      whereConditions.push(`all(rel in relationships(path) WHERE rel.type IN $relationshipTypes)`);
    }
    
    const whereClause = whereConditions.length > 0
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';
    
    const limitClause = limit ? `LIMIT ${limit}` : '';
    
    const query = `
      ${matchClause}
      ${pathClause}
      ${whereClause}
      WITH end as node, path, 
           CASE WHEN path IS NULL THEN 0 ELSE length(path) END as depth
      RETURN DISTINCT node.id as nodeId,
             properties(node) as nodeData,
             depth,
             CASE WHEN path IS NULL THEN [] 
                  ELSE [rel in relationships(path) | properties(rel)] END as pathData
      ORDER BY depth ASC
      ${limitClause}
    `;
    
    try {
      const result = await this.connection.run(query, {
        startNodes,
        relationshipTypes
      });
      
      const results = result.records.map(record => ({
        node: {
          id: record.get('nodeId'),
          data: this.parseNodeData(record.get('nodeData'))
        },
        path: record.get('pathData'),
        depth: record.get('depth').toNumber()
      }));
      
      // Apply client-side filters if provided
      return results.filter(result => {
        if (nodeFilter && !nodeFilter(result.node)) return false;
        if (edgeFilter && result.path.some(edge => !edgeFilter(edge))) return false;
        return true;
      });
    } catch (error) {
      this.logger.error('Failed to query graph', { error: error.message });
      return [];
    }
  }

  /**
   * Get node neighbors
   */
  async getNeighbors(contextId, options = {}) {
    const { direction = 'both', relationshipTypes = [] } = options;
    
    let directionClause;
    switch (direction) {
      case 'outgoing':
        directionClause = '(c)-[r:RELATES_TO]->(neighbor)';
        break;
      case 'incoming':
        directionClause = '(neighbor)-[r:RELATES_TO]->(c)';
        break;
      default:
        directionClause = '(c)-[r:RELATES_TO]-(neighbor)';
    }
    
    const typeFilter = relationshipTypes.length > 0
      ? `WHERE r.type IN $types`
      : '';
    
    const query = `
      MATCH (c:Context {id: $contextId})
      MATCH ${directionClause}
      ${typeFilter}
      RETURN neighbor.id as contextId,
             r.type as relationship,
             CASE 
               WHEN startNode(r).id = $contextId THEN 'outgoing'
               ELSE 'incoming'
             END as direction,
             r.weight as weight
    `;
    
    try {
      const result = await this.connection.run(query, {
        contextId,
        types: relationshipTypes
      });
      
      return result.records.map(record => ({
        contextId: record.get('contextId'),
        relationship: record.get('relationship'),
        direction: record.get('direction'),
        weight: record.get('weight')
      }));
    } catch (error) {
      this.logger.error('Failed to get neighbors', { contextId, error: error.message });
      return [];
    }
  }

  /**
   * Get graph statistics
   */
  async getStatistics() {
    const query = `
      MATCH (c:Context)
      WITH count(c) as nodeCount
      MATCH ()-[r:RELATES_TO]->()
      WITH nodeCount, count(r) as edgeCount, collect(DISTINCT r.type) as relTypes
      MATCH (c:Context)
      OPTIONAL MATCH (c)-[r:RELATES_TO]-()
      WITH nodeCount, edgeCount, relTypes, 
           avg(count(r)) as avgDegree
      RETURN {
        nodeCount: nodeCount,
        edgeCount: edgeCount,
        relationshipTypes: relTypes,
        averageDegree: avgDegree,
        density: toFloat(edgeCount) / (nodeCount * (nodeCount - 1))
      } as stats
    `;
    
    try {
      const result = await this.connection.run(query);
      const stats = result.records[0].get('stats');
      
      // Count components using a simplified approach
      const componentQuery = `
        MATCH (c:Context)
        WITH collect(c) as nodes
        UNWIND nodes as node
        MATCH path = (node)-[:RELATES_TO*0..]-(connected)
        WITH node, collect(DISTINCT connected) as component
        WITH collect(DISTINCT component) as components
        RETURN size(components) as componentCount
      `;
      
      const componentResult = await this.connection.run(componentQuery);
      const components = componentResult.records[0]?.get('componentCount')?.toNumber() || 1;
      
      return {
        nodeCount: stats.nodeCount.toNumber(),
        edgeCount: stats.edgeCount.toNumber(),
        relationshipTypes: stats.relationshipTypes,
        averageDegree: stats.averageDegree || 0,
        density: stats.density || 0,
        components
      };
    } catch (error) {
      this.logger.error('Failed to get statistics', { error: error.message });
      return {
        nodeCount: 0,
        edgeCount: 0,
        relationshipTypes: [],
        averageDegree: 0,
        density: 0,
        components: 0
      };
    }
  }

  /**
   * Parse node data from Neo4j
   */
  parseNodeData(nodeData) {
    const parsed = { ...nodeData };
    
    // Parse JSON fields
    if (parsed.data && typeof parsed.data === 'string') {
      try {
        parsed.data = JSON.parse(parsed.data);
      } catch (e) {
        // Keep as string if parsing fails
      }
    }
    
    if (parsed.metadata && typeof parsed.metadata === 'string') {
      try {
        parsed.metadata = JSON.parse(parsed.metadata);
      } catch (e) {
        // Keep as string if parsing fails
      }
    }
    
    return parsed;
  }

  /**
   * Export graph to JSON (for compatibility)
   */
  async toJSON() {
    const nodesQuery = `
      MATCH (c:Context)
      RETURN c.id as id, properties(c) as data
    `;
    
    const edgesQuery = `
      MATCH (from:Context)-[r:RELATES_TO]->(to:Context)
      RETURN from.id as from, to.id as to, properties(r) as properties
    `;
    
    const [nodesResult, edgesResult] = await Promise.all([
      this.connection.run(nodesQuery),
      this.connection.run(edgesQuery)
    ]);
    
    const nodes = nodesResult.records.map(record => ({
      id: record.get('id'),
      data: this.parseNodeData(record.get('data'))
    }));
    
    const edges = edgesResult.records.map(record => ({
      from: record.get('from'),
      to: record.get('to'),
      ...record.get('properties')
    }));
    
    const stats = await this.getStatistics();
    
    return { nodes, edges, stats };
  }

  /**
   * Import graph from JSON (for compatibility)
   */
  static async fromJSON(json, config) {
    const graph = new Neo4jContextGraph(config);
    await graph.initialize();
    
    // Clear existing data
    if (process.env.NODE_ENV !== 'production') {
      await graph.connection.clearDatabase();
    }
    
    // Import nodes
    for (const node of json.nodes) {
      await graph.addNode(node.id, node.data || node);
    }
    
    // Import edges
    for (const edge of json.edges) {
      await graph.addEdge(edge.from, edge.to, {
        type: edge.type,
        weight: edge.weight,
        metadata: edge.metadata
      });
    }
    
    return graph;
  }

  /**
   * Close connection
   */
  async close() {
    await this.connection.close();
  }
}