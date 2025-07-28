# Claude Code Agent Architecture Based on BMAD-METHOD

## Overview

This document outlines how to adapt the BMAD-METHOD agent system to Claude Code's tool-based environment, creating a comprehensive multi-agent development framework.

## Core Architecture Principles

### 1. Agent Identity and Context Management

Each agent in Claude Code operates as a specialized persona with:
- **Unique system prompts** defining their role and responsibilities
- **Tool access patterns** specific to their function
- **Context awareness** through shared memory and state files
- **Communication protocols** using structured JSON/YAML formats

### 2. Agent Communication Strategy

#### Direct Communication
- Agents communicate through shared files in `/docs/agents/communication/`
- Each message follows a standardized schema:
```json
{
  "from": "agent_name",
  "to": "agent_name",
  "timestamp": "ISO-8601",
  "type": "request|response|notification",
  "priority": "high|medium|low",
  "context": {
    "epic": "3.6",
    "story": "3.6.16",
    "phase": "planning|development|testing"
  },
  "payload": {}
}
```

#### Indirect Communication
- State files in `/docs/agents/state/`
- Project artifacts (PRDs, architecture docs, story files)
- Git commits and PR descriptions

### 3. Context Management Between Agents

#### Hierarchical Context
```
Global Context (all agents)
├── Project Configuration
├── Design System
├── Tech Stack
└── Compliance Requirements

Agent-Specific Context
├── Current Task
├── Dependencies
├── Blockers
└── Progress Status
```

#### Context Persistence
- **Session State**: `/docs/agents/sessions/{agent_name}/current.json`
- **Task History**: `/docs/agents/history/{agent_name}/tasks.jsonl`
- **Shared Knowledge**: `/docs/agents/knowledge/shared.yaml`

### 4. Memory and State Persistence

#### Short-term Memory
- Active task context
- Current conversation history
- Immediate dependencies

#### Long-term Memory
- Project specifications
- Architecture decisions
- Code patterns and conventions
- Past decisions and rationale

#### Implementation Strategy
```yaml
memory:
  short_term:
    location: /tmp/claude-agents/memory/short/
    ttl: 24h
    format: json
  long_term:
    location: /docs/agents/memory/long/
    format: yaml
    indexes:
      - type: decisions
      - type: patterns
      - type: specifications
```

## Agent Coordination Patterns

### 1. Sequential Workflow
```
Analyst → PM → Architect → SM → Dev → QA
```
Each agent completes their phase before passing to the next.

### 2. Parallel Workflow
```
        ┌→ UI-Architect ─┐
PM → Architect →          → SM → Dev Teams
        └→ Backend-Arch ─┘
```
Multiple specialized agents work simultaneously.

### 3. Iterative Workflow
```
Dev ↔ QA (rapid iteration)
  ↓
  SM (monitors progress)
```

### 4. Emergency Response
```
Monitor → Alert → Operations-Manager → [Dev|DevOps|Self-Healer]
```

## Tool System Integration

### Core Tool Requirements per Agent Type

#### Planning Agents (Analyst, PM, Architect)
- `Read`, `Write`, `MultiEdit` - Document creation
- `WebSearch`, `WebFetch` - Research capabilities
- `TodoWrite` - Task management

#### Development Agents (Dev, UI-Architect)
- Full file system access (`Read`, `Write`, `Edit`, `MultiEdit`)
- `Bash` - Command execution
- `Grep`, `Glob` - Code search
- `mcp__ide__*` - IDE integration

#### Quality Agents (QA, Monitor)
- `Read`, `Grep` - Code inspection
- `Bash` - Test execution
- `mcp__ide__getDiagnostics` - Error detection

#### Operations Agents (DevOps, Git-Manager)
- `Bash` - System commands
- Git operations
- Deployment tools

## Context Switching Protocol

When switching between agents:

1. **Save Current State**
```bash
# Current agent saves state
echo "{context}" > /docs/agents/state/{agent}/checkpoint.json
```

2. **Handoff Message**
```json
{
  "handoff": {
    "from": "architect",
    "to": "scrum-master",
    "artifacts": [
      "/docs/architecture/system-design.md",
      "/docs/architecture/api-spec.yaml"
    ],
    "next_action": "create_development_stories",
    "notes": "Focus on WebRTC implementation first"
  }
}
```

3. **Context Load**
```bash
# New agent loads context
cat /docs/agents/state/shared/current-context.json
cat /docs/agents/communication/latest-handoff.json
```

## Error Handling and Recovery

### Agent Failure Protocol
1. Checkpoint state before critical operations
2. Implement retry logic with exponential backoff
3. Escalate to Operations-Manager on repeated failures
4. Maintain audit trail of all decisions

### Context Loss Recovery
1. Rebuild from git history
2. Reference long-term memory
3. Query other agents for missing context
4. Fall back to human intervention if needed

## Performance Optimization

### Parallel Agent Execution
- Use tmux sessions for independent agent work
- Implement work queues for task distribution
- Monitor resource usage per agent

### Context Caching
- Cache frequently accessed documents
- Implement lazy loading for large contexts
- Use incremental updates rather than full refreshes

## Security Considerations

### Agent Permissions
- Principle of least privilege
- Read-only access by default
- Write permissions only for designated areas
- No access to secrets or credentials

### Audit Trail
- Log all agent actions
- Track decision rationale
- Monitor for anomalous behavior
- Regular security reviews

## Implementation Roadmap

### Phase 1: Core Agents
1. Implement Analyst, PM, Architect
2. Establish communication protocols
3. Create shared context management

### Phase 2: Development Pipeline
1. Add SM, Dev, QA agents
2. Implement handoff protocols
3. Create automated workflows

### Phase 3: Operations & Monitoring
1. Add Monitor, Self-Healer agents
2. Implement emergency response
3. Create performance dashboards

### Phase 4: Advanced Features
1. Multi-project coordination
2. Cross-agent learning
3. Autonomous optimization