# BMAD Technical Guidelines and Best Practices

## Core Architecture

### System Overview

The BMad-Method is built around a modular architecture centered on the `bmad-core` directory, which serves as the brain of the entire system. This design enables the framework to operate effectively in both IDE environments (like Cursor, VS Code) and web-based AI interfaces (like ChatGPT, Gemini).

### Key Architectural Components

#### 1. Agents (`bmad-core/agents/`)

- **Purpose**: Each markdown file defines a specialized AI agent for a specific Agile role (PM, Dev, Architect, etc.)
- **Structure**: Contains YAML headers specifying the agent's persona, capabilities, and dependencies
- **Dependencies**: Lists of tasks, templates, checklists, and data files the agent can use
- **Startup Instructions**: Can load project-specific documentation for immediate context

#### 2. Agent Teams (`bmad-core/agent-teams/`)

- **Purpose**: Define collections of agents bundled together for specific purposes
- **Examples**: `team-all.yaml` (comprehensive bundle), `team-fullstack.yaml` (full-stack development)
- **Usage**: Creates pre-packaged contexts for web UI environments

#### 3. Workflows (`bmad-core/workflows/`)

- **Purpose**: YAML files defining prescribed sequences of steps for specific project types
- **Types**: Greenfield (new projects) and Brownfield (existing projects) for UI, service, and fullstack development
- **Structure**: Defines agent interactions, artifacts created, and transition conditions

#### 4. Reusable Resources

- **Templates** (`bmad-core/templates/`): Markdown templates for PRDs, architecture specs, user stories
- **Tasks** (`bmad-core/tasks/`): Instructions for specific repeatable actions like "shard-doc" or "create-next-story"
- **Checklists** (`bmad-core/checklists/`): Quality assurance checklists for validation and review
- **Data** (`bmad-core/data/`): Core knowledge base and technical preferences

### Dual Environment Architecture

#### IDE Environment

- Users interact directly with agent markdown files
- Agents can access all dependencies dynamically
- Supports real-time file operations and project integration
- Optimized for development workflow execution

#### Web UI Environment

- Uses pre-built bundles from `dist/teams` for stand alone 1 upload files for all agents and their assets with an orchestrating agent
- Single text files containing all agent dependencies are in `dist/agents/` - these are unnecessary unless you want to create a web agent that is only a single agent and not a team
- Created by the web-builder tool for upload to web interfaces
- Provides complete context in one package

## Core Configuration (core-config.yaml)

**New in V4**: The `bmad-core/core-config.yaml` file is a critical innovation that enables BMad to work seamlessly with any project structure, providing maximum flexibility and backwards compatibility.

### What is core-config.yaml?

This configuration file acts as a map for BMad agents, telling them exactly where to find your project documents and how they're structured. It enables:

- **Version Flexibility**: Work with V3, V4, or custom document structures
- **Custom Locations**: Define where your documents and shards live
- **Developer Context**: Specify which files the dev agent should always load
- **Debug Support**: Built-in logging for troubleshooting

### Key Configuration Areas

#### PRD Configuration

- **prdVersion**: Tells agents if PRD follows v3 or v4 conventions
- **prdSharded**: Whether epics are embedded (false) or in separate files (true)
- **prdShardedLocation**: Where to find sharded epic files
- **epicFilePattern**: Pattern for epic filenames (e.g., `epic-{n}*.md`)

#### Architecture Configuration

- **architectureVersion**: v3 (monolithic) or v4 (sharded)
- **architectureSharded**: Whether architecture is split into components
- **architectureShardedLocation**: Where sharded architecture files live

#### Developer Files

- **devLoadAlwaysFiles**: List of files the dev agent loads for every task
- **devDebugLog**: Where dev agent logs repeated failures
- **agentCoreDump**: Export location for chat conversations

### Common Configurations

**Legacy V3 Project**:

```yaml
prdVersion: v3
prdSharded: false
architectureVersion: v3
architectureSharded: false
```

**V4 Optimized Project**:

```yaml
prdVersion: v4
prdSharded: true
prdShardedLocation: docs/prd
architectureVersion: v4
architectureSharded: true
architectureShardedLocation: docs/architecture
```

## Template Processing System

BMad employs a sophisticated template system with three key components:

1. **Template Format** (`utils/bmad-doc-template.md`): Defines markup language for variable substitution and AI processing directives from yaml templates
2. **Document Creation** (`tasks/create-doc.md`): Orchestrates template selection and user interaction to transform yaml spec to final markdown output
3. **Advanced Elicitation** (`tasks/advanced-elicitation.md`): Provides interactive refinement through structured brainstorming

## Technical Preferences Integration

The `technical-preferences.md` file serves as a persistent technical profile that:

- Ensures consistency across all agents and projects
- Eliminates repetitive technology specification
- Provides personalized recommendations aligned with user preferences
- Evolves over time with lessons learned

## Build and Delivery Process

The `web-builder.js` tool creates web-ready bundles by:

1. Reading agent or team definition files
2. Recursively resolving all dependencies
3. Concatenating content into single text files with clear separators
4. Outputting ready-to-upload bundles for web AI interfaces

This architecture enables seamless operation across environments while maintaining the rich, interconnected agent ecosystem that makes BMad powerful.

## Document Creation Best Practices

### Required File Naming for Framework Integration

- `docs/prd.md` - Product Requirements Document
- `docs/architecture.md` - System Architecture Document

**Why These Names Matter**:

- Agents automatically reference these files during development
- Sharding tasks expect these specific filenames
- Workflow automation depends on standard naming

### Cost-Effective Document Creation Workflow

**Recommended for Large Documents (PRD, Architecture):**

1. **Use Web UI**: Create documents in web interface for cost efficiency
2. **Copy Final Output**: Save complete markdown to your project
3. **Standard Names**: Save as `docs/prd.md` and `docs/architecture.md`
4. **Switch to IDE**: Use IDE agents for development and smaller documents

### Document Sharding

Templates with Level 2 headings (`##`) can be automatically sharded:

**Original PRD**:

```markdown
## Goals and Background Context
## Requirements  
## User Interface Design Goals
## Success Metrics
```

**After Sharding**:

- `docs/prd/goals-and-background-context.md`
- `docs/prd/requirements.md`
- `docs/prd/user-interface-design-goals.md`
- `docs/prd/success-metrics.md`

Use the `shard-doc` task or `@kayvan/markdown-tree-parser` tool for automatic sharding.

## Performance Optimization

- Use specific agents vs. `bmad-master` for focused tasks
- Choose appropriate team size for project needs
- Leverage technical preferences for consistency
- Regular context management and cache clearing

## Environment Selection Guide

**Use Web UI for**:

- Initial planning and documentation (PRD, architecture)
- Cost-effective document creation (especially with Gemini)
- Brainstorming and analysis phases
- Multi-agent consultation and planning

**Use IDE for**:

- Active development and coding
- File operations and project integration
- Document sharding and story management
- Implementation workflow (SM/Dev cycles)

**Cost-Saving Tip**: Create large documents (PRDs, architecture) in web UI, then copy to `docs/prd.md` and `docs/architecture.md` in your project before switching to IDE for development.