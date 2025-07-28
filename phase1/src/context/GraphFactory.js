import { ContextGraph } from './ContextGraph.js';
import { Neo4jContextGraph } from './Neo4jContextGraph.js';

/**
 * Factory for creating the appropriate graph implementation
 */
export class GraphFactory {
  /**
   * Create a graph instance based on configuration
   */
  static async create(config = {}) {
    const useNeo4j = config.useNeo4j !== false && (
      config.useNeo4j === true ||
      process.env.USE_NEO4J === 'true' ||
      process.env.NEO4J_URI
    );
    
    if (useNeo4j) {
      const graph = new Neo4jContextGraph(config);
      await graph.initialize();
      return graph;
    } else {
      return new ContextGraph(config);
    }
  }
  
  /**
   * Check if Neo4j is available
   */
  static async isNeo4jAvailable(config = {}) {
    try {
      const testGraph = new Neo4jContextGraph(config);
      await testGraph.initialize();
      const connected = await testGraph.connection.testConnection();
      await testGraph.close();
      return connected;
    } catch (error) {
      return false;
    }
  }
}