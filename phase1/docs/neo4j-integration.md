# Neo4j Graph Database Integration

This document describes the Neo4j integration for the Context Management system, which provides persistent graph-based context relationships.

## Overview

The Neo4j integration extends the in-memory `ContextGraph` with a persistent graph database implementation. This enables:

- **Persistent Relationships**: Context relationships survive system restarts
- **Scalable Queries**: Efficient graph traversal for large context networks
- **Advanced Analytics**: Leverage Neo4j's graph algorithms
- **Visual Exploration**: Use Neo4j Browser to visualize context relationships

## Architecture

### Components

1. **Neo4jConnection**: Manages database connectivity and query execution
2. **Neo4jContextGraph**: Implements the ContextGraph interface using Neo4j
3. **GraphFactory**: Creates appropriate graph implementation based on configuration
4. **ContextManager**: Enhanced to support async graph operations

### Data Model

Contexts are stored as nodes with the following structure:

```cypher
(c:Context {
  id: String,           // Unique context ID
  level: String,        // Context level (global, project, agent, task, message)
  parentId: String?,    // Parent context ID
  type: String,         // Context type (e.g., agentType)
  metadata: String,     // JSON metadata
  data: String,         // JSON context data
  createdAt: String,    // ISO timestamp
  lastUpdated: Long     // Unix timestamp
})
```

Relationships between contexts:

```cypher
(from:Context)-[r:RELATES_TO {
  type: String,         // Relationship type
  weight: Float,        // Relationship strength
  metadata: String,     // JSON metadata
  createdAt: String,    // ISO timestamp
  lastUpdated: Long     // Unix timestamp
}]->(to:Context)
```

## Setup

### 1. Start Neo4j

Use Docker Compose to start Neo4j:

```bash
cd phase1
docker-compose up -d
```

This starts Neo4j with:
- HTTP interface: http://localhost:7474
- Bolt protocol: bolt://localhost:7687
- Credentials: neo4j/claudeagents123

### 2. Configure Context Manager

Enable Neo4j in your ContextManager configuration:

```javascript
const contextManager = new ContextManager({
  baseDir: './context-store',
  useNeo4j: true,
  graphConfig: {
    useNeo4j: true,
    neo4j: {
      uri: 'bolt://localhost:7687',
      username: 'neo4j',
      password: 'claudeagents123'
    }
  }
});
```

### 3. Environment Variables

You can also configure Neo4j using environment variables:

```bash
export USE_NEO4J=true
export NEO4J_URI=bolt://localhost:7687
export NEO4J_USERNAME=neo4j
export NEO4J_PASSWORD=claudeagents123
```

## Migration

To migrate existing file-based contexts to Neo4j:

```bash
# Basic migration
node scripts/migrate-to-neo4j.js

# Migrate from custom directory
node scripts/migrate-to-neo4j.js --context-dir ./my-contexts

# Clear existing Neo4j data first
node scripts/migrate-to-neo4j.js --clear

# Test migration with in-memory graph
node scripts/migrate-to-neo4j.js --no-neo4j
```

## Usage

### Creating Contexts with Relationships

```javascript
// Create project context
const project = await contextManager.createContext(
  ContextLevel.PROJECT,
  { name: 'My Project' }
);

// Create agent with parent relationship
const agent = await contextManager.createContext(
  ContextLevel.AGENT,
  { agentType: 'developer' },
  project.id  // Parent ID creates automatic parent relationship
);

// Create task with dependencies
const task = await contextManager.createContext(
  ContextLevel.TASK,
  { 
    taskId: 'task-001',
    dependencies: ['task-000']  // Creates depends-on relationships
  },
  project.id
);
```

### Querying Relationships

```javascript
// Get context with all relationships
const contextWithRels = await contextManager.getContextWithRelationships(
  ContextLevel.PROJECT,
  projectId
);

// Find all dependencies
const deps = await contextManager.graph.findDependencies(contextId, {
  maxDepth: 5,
  includeTransitive: true
});

// Analyze impact of changes
const impact = await contextManager.analyzeImpact(contextId);

// Find dependency cycles
const cycles = await contextManager.findDependencyCycles();

// Query with complex filters
const results = await contextManager.queryWithRelationships({
  startContextId: projectId,
  relationshipTypes: ['parent', 'depends-on'],
  maxDepth: 3,
  filters: { status: 'active' }
});
```

### Direct Neo4j Queries

For advanced use cases, you can execute Cypher queries directly:

```javascript
const connection = new Neo4jConnection();
await connection.connect();

const result = await connection.run(`
  MATCH (p:Context {level: 'PROJECT'})-[:RELATES_TO*1..3]->(related)
  WHERE p.data CONTAINS 'active'
  RETURN p.id as project, collect(related.id) as relatedContexts
`);

await connection.close();
```

## Monitoring

### Neo4j Browser

Access Neo4j Browser at http://localhost:7474 to:
- Visualize context relationships
- Run Cypher queries
- Monitor database performance
- Explore the graph structure

### Useful Queries

```cypher
// View all contexts
MATCH (c:Context) RETURN c LIMIT 100

// Find project hierarchies
MATCH path = (p:Context {level: 'PROJECT'})-[:RELATES_TO*]->(child)
WHERE child.parentId = p.id
RETURN path

// Identify orphaned contexts
MATCH (c:Context)
WHERE NOT (c)<-[:RELATES_TO]-()
AND c.parentId IS NOT NULL
RETURN c

// Find circular dependencies
MATCH path = (n:Context)-[:RELATES_TO*]->(n)
WHERE all(r in relationships(path) WHERE r.type IN ['depends-on', 'requires'])
RETURN path
```

## Performance Considerations

1. **Indexes**: The system automatically creates indexes on:
   - Context ID (unique constraint)
   - Context level
   - Context type
   - Relationship type

2. **Connection Pooling**: Configure pool size based on load:
   ```javascript
   {
     maxConnectionPoolSize: 50,
     connectionAcquisitionTimeout: 60000
   }
   ```

3. **Query Optimization**:
   - Use relationship type filters to reduce traversal
   - Limit traversal depth for large graphs
   - Consider using APOC procedures for complex algorithms

## Troubleshooting

### Common Issues

1. **Connection Failed**
   - Ensure Neo4j is running: `docker ps`
   - Check credentials and URI
   - Verify network connectivity

2. **Write Access Errors**
   - The system automatically detects write operations
   - Ensure proper session mode for transactions

3. **Performance Issues**
   - Check Neo4j memory settings in docker-compose.yml
   - Monitor query execution plans
   - Consider adding custom indexes

### Debugging

Enable debug logging:

```javascript
const contextManager = new ContextManager({
  logLevel: 'debug',
  graphConfig: {
    logLevel: 'debug'
  }
});
```

Check Neo4j logs:
```bash
docker logs claude-agents-neo4j
```

## Fallback to In-Memory

The system can fallback to in-memory graph if Neo4j is unavailable:

```javascript
// GraphFactory automatically handles fallback
const graph = await GraphFactory.create({
  useNeo4j: true  // Will use in-memory if Neo4j unavailable
});
```

To force in-memory mode:
```javascript
const contextManager = new ContextManager({
  useNeo4j: false
});
```