# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Purpose

This repository contains **IronClaude-S** (Iron Claude - Simple), a complete multi-agent system that leverages Claude Code tools for autonomous software development. The orchestrator agent coordinates 9 specialized agents to handle the entire product lifecycle.

### Key Goals:
1. **Multi-Agent Coordination**: 9 specialized agents working together autonomously
2. **Complete Development Lifecycle**: From analysis to deployment and monitoring
3. **Context Management**: Robust context sharing with Neo4j graph storage
4. **Safety & Validation**: Production-ready safety constraints and validation
5. **Real-Time Execution**: Actual implementation, not simulation

## Project Overview

This is **IronClaude-S** (Iron Claude - Simple) - a universal AI agent framework for autonomous software development. The system provides complete development workflows through 9 specialized agents working in coordinated patterns.

### IronClaude-S Architecture
```
claude-agents-test/
├── docs/                           # System documentation
│   ├── stories/                   # Development stories
│   │   ├── STORY-ICS-001.md      # System remediation story
│   │   └── improvements/         # Individual improvement stories
│   ├── project-files/            # Planning documents (PRD, architecture)
│   ├── kb/                       # Knowledge base
│   └── research/                 # Implementation research
├── phase1/                        # Active development workspace
│   ├── src/                      # Core IronClaude-S implementation
│   │   ├── agents/              # 9 specialized agents
│   │   ├── context/             # Context management & Neo4j
│   │   ├── orchestrator/        # Multi-agent coordination
│   │   ├── safety/              # Safety constraints
│   │   └── validation/          # Schema validation
│   ├── tests/                   # Comprehensive test suite
│   └── context data/            # Agent execution data
├── poc/                          # Original proof of concept
└── BMAD-METHOD/                  # Reference framework (legacy)
```

## Essential Commands

### Installation & Setup
```bash
# Navigate to development workspace
cd phase1

# Install dependencies
npm install

# Start Neo4j (required)
docker-compose up -d neo4j
```

### Development Commands
```bash
# Run individual agents
node src/agents/core/AnalystAgent.js
node src/agents/core/ArchitectAgent.js

# Run orchestrator with prototype
node ai-tutor-prototype.js

# Run test suite
npm test
```

### Testing & Validation
```bash
# Run specific tests
node test-schema-validation.js
node test-safety-constraints.js
node test-context-graph-relationships.js

# Performance testing
node test-phase4-production-hardening.js
```

### Code Quality
```bash
# Format markdown files
npm run format

# Run tests (when available)
npm test
```

## IronClaude-S Architecture Overview

### Core Structure (phase1/src/)
- **agents/**: 9 specialized agents
  - **core/**: AnalystAgent, ArchitectAgent, PMAgent
  - **extended/**: DeveloperAgent, QAAgent, DevOpsAgent, GitManagerAgent, MonitorAgent, SelfHealerAgent
- **context/**: Context management system
  - **ContextManager.js**: Main context coordination
  - **Neo4jContextGraph.js**: Graph database integration
  - **ContextSummarizer.js**: Token optimization
- **orchestrator/**: Multi-agent coordination
  - **OrchestratorAgent.js**: Main orchestrator
  - **patterns/**: Workflow patterns (Pipeline, Router, etc.)
- **safety/**: Safety and validation
  - **SafetyConstraints.js**: Environment-based safety
  - **ConstraintEnforcer.js**: Real-time validation
- **validation/**: Schema validation
  - **SchemaRegistry.js**: Agent schema management

### Key Concepts

1. **Multi-Agent Coordination**:
   - **Analysis Phase**: Analyst researches and validates requirements
   - **Architecture Phase**: Architect designs system structure
   - **Development Phase**: Developer implements with full context
   - **Quality Phase**: QA validates and tests implementation
   - **Operations Phase**: DevOps, GitManager, Monitor, SelfHealer manage deployment

2. **Agent Specialization**:
   - **Core Agents**: Analyst, Architect, PM (planning and design)
   - **Extended Agents**: Developer, QA, DevOps (implementation and operations)
   - **System Agents**: GitManager, Monitor, SelfHealer (automation and maintenance)
   - **Orchestrator**: Coordinates all agents and manages workflows

3. **Context Flow**:
   - Project Context → Agent Contexts → Task Contexts → Results
   - Neo4j graph relationships between all contexts
   - Automatic summarization for token management

4. **Autonomous Development**:
   - Real file operations (not simulation)
   - Automatic error recovery and retry
   - Performance monitoring and optimization
   - Production-ready safety constraints

## Working with IronClaude-S

### Autonomous Development Workflow
1. **Initialize**: Start orchestrator with project specification
2. **Analysis**: Analyst agent researches and validates requirements
3. **Architecture**: Architect agent designs complete system structure
4. **Development**: Developer agent implements with full context
5. **Quality**: QA agent validates and tests implementation
6. **Operations**: DevOps/GitManager deploy and monitor

### Manual Development Workflow  
1. Navigate to `phase1/` directory
2. Run individual agents as needed
3. Use context management for agent coordination
4. Monitor progress through logging and metrics

### Important Notes
- System performs real operations, not simulations
- Context automatically managed with Neo4j
- Safety constraints prevent dangerous operations
- All agent activity logged and monitored

## File Patterns
- Story files: `docs/stories/STORY-ICS-*.md`
- Core implementation: `phase1/src/`
- Test files: `phase1/test-*.js`
- Context data: `phase1/*/context/`

## Dependencies
- Node.js >= 20.0.0
- Neo4j Docker container
- Key packages: winston, zod, neo4j-driver
- Development: comprehensive test suite

## Critical Project Documents

### Planning Documents (`/docs/project-files/`)
1. **prd.md** - Product Requirements Document
   - Complete system requirements (18 FR, 15 NFR)
   - 6 epics with 44 user stories
   - Known constraints and limitations
   - Success acceptance criteria

2. **architecture.md** - System Architecture Document
   - Technical design and component specifications
   - Performance and scaling considerations
   - Security implementation details
   - Technology stack decisions

3. **implementation-specification.md** - Implementation Guide
   - Phased development approach (10 weeks)
   - Technical specifications for each component
   - API definitions and schemas
   - Deployment and operations guide

4. **risk-assessment-and-mitigation.md** - Risk Analysis
   - Critical risks identified with severity levels
   - Mitigation strategies for each risk
   - Success criteria and quality gates
   - Go/No-Go decision points

5. **project-task-tracker.md** - Project Tracking
   - Current implementation status
   - Phase-by-phase task breakdown
   - Milestone tracking
   - Resource requirements

6. **quality-metrics-and-success-criteria.md** - Quality Framework
   - Performance, reliability, and cost metrics
   - Agent-specific success criteria
   - Business value measurements
   - Monitoring and reporting framework

### Knowledge Base (`/docs/kb/`)
- IronClaude-S methodology documentation
- Agent specifications and interactions
- Workflow patterns and templates
- Implementation best practices

### Research (`/docs/research/`)
- Claude Code implementation strategies
- Multi-agent system architecture patterns
- Context management approaches
- Integration recommendations

## Implementation Status Tracking

**Current Phase**: System Remediation (STORY-ICS-001)
**Next Action**: Phase 1 - Critical Bug Fixes

### Quick Status Check
```bash
# Navigate to development workspace
cd phase1

# Check system status
node --version  # Verify Node.js >= 20.0.0
docker ps      # Verify Neo4j container running

# Run system validation
node test-schema-validation.js
node test-safety-constraints.js
```

## Critical Implementation Notes

1. **Real Implementation**: System performs actual operations, not simulations
2. **Context Management**: Neo4j graph database for context relationships
3. **Safety First**: Environment-based safety constraints protect system
4. **Performance Monitoring**: Real-time metrics and alerting
5. **Error Recovery**: Automatic retry and graceful failure handling

## Current Implementation Status

✅ **Completed**: Full multi-agent system implementation
⚠️  **In Progress**: STORY-ICS-001 remediation (21 story points)
🔄 **Next**: Phase 1 critical bug fixes

## Development Workspace Constraint

**CRITICAL**: All development, implementation, testing, and refinement activities MUST occur exclusively within this project workspace (`/Users/umasankrudhya/Projects/claude-agents-test/`). 

### Workspace Rules:
1. **No External File Creation**: Do not create or modify files outside this project directory
2. **All Outputs Stay Local**: Generated code, logs, test results, and documentation must remain within project boundaries
3. **Contained Testing**: All test environments, mock data, and experimental code stay within the workspace
4. **Local Context Storage**: Agent contexts, shared data, and orchestration state must use paths relative to the project root
5. **Sandbox Isolation**: Treat this workspace as a complete sandbox - nothing leaves, everything needed comes in

This constraint ensures:
- Complete project portability
- No system pollution
- Clear boundaries for all agent operations
- Simplified cleanup and reset procedures
- Consistent development environment