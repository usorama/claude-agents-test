# Story IMP-002: JSON Schema Validation for Agent Configuration

## Story
As an Orchestrator, I need to validate agent configurations using JSON Schema to ensure type safety and prevent runtime errors when agents are initialized with incorrect parameters.

## Background
Research shows that JSON Schema validation provides robust type checking for dynamic configurations. This will prevent agent initialization failures and provide clear error messages for configuration issues.

## Acceptance Criteria
1. **Schema Definition**
   - Define JSON Schema for each agent type
   - Include required fields, types, and constraints
   - Support nested configuration objects
   - Allow for agent-specific extensions

2. **Validation Integration**
   - Validate configuration on agent initialization
   - Provide detailed error messages for validation failures
   - Support partial validation for updates
   - Allow schema versioning

3. **Schema Registry**
   - Central registry for all agent schemas
   - Runtime schema loading
   - Schema inheritance for agent hierarchies
   - Schema documentation generation

4. **Error Handling**
   - Clear validation error messages
   - Suggestion of valid values
   - Path to invalid property
   - Multiple error aggregation

## Technical Requirements
- Integrate JSON Schema validator (ajv or similar)
- Create schema files for each agent
- Implement SchemaRegistry class
- Add validation to BaseAgent constructor

## Implementation Details

```javascript
// Schema Registry
class SchemaRegistry {
  constructor() {
    this.schemas = new Map();
    this.validator = new Ajv({ allErrors: true });
  }
  
  registerSchema(agentType, schema) {
    const compiled = this.validator.compile(schema);
    this.schemas.set(agentType, { schema, compiled });
  }
  
  validate(agentType, config) {
    const { compiled } = this.schemas.get(agentType);
    const valid = compiled(config);
    
    if (!valid) {
      throw new ValidationError(
        `Invalid configuration for ${agentType}`,
        compiled.errors
      );
    }
    
    return true;
  }
}

// BaseAgent enhancement
class BaseAgent {
  constructor(config) {
    // Validate configuration
    SchemaRegistry.getInstance().validate(this.type, config);
    
    // Continue with initialization
    this.config = config;
    // ...
  }
}

// Example Schema
const AnalystAgentSchema = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["id", "type", "name"],
  "properties": {
    "id": { "type": "string", "pattern": "^[a-z-]+$" },
    "type": { "type": "string", "enum": ["analyst"] },
    "name": { "type": "string", "minLength": 1 },
    "maxResearchDepth": { "type": "integer", "minimum": 1, "maximum": 10 },
    "tools": {
      "type": "array",
      "items": { "type": "string", "enum": ["WebSearch", "Read", "Grep"] }
    }
  }
};
```

## Test Cases
1. Test valid configuration acceptance
2. Test rejection of invalid configurations
3. Test detailed error messages
4. Test schema inheritance
5. Test runtime schema updates

## Dependencies
- JSON Schema validator library (ajv)
- BaseAgent class (already implemented)
- All agent implementations for schema creation

## Effort Estimate
4-5 hours of implementation

## Priority
High - Prevents runtime errors and improves developer experience

## Notes
- Consider using TypeScript-style type definitions as source
- May want to auto-generate schemas from Zod definitions
- Should support custom validation rules per agent
- Consider performance impact of validation