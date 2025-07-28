# BMAD Knowledge Base for Claude Code Implementation

This knowledge base contains comprehensive documentation extracted and analyzed from the BMAD-METHOD framework, organized for implementing a complete Claude Code agent system.

## Directory Structure

### `/agents/`
- **bmad-agents-overview.md** - Complete analysis of all BMAD agents, their roles, capabilities, and interactions

### `/workflows/`
- **bmad-workflows-analysis.md** - Detailed breakdown of all workflow types (greenfield/brownfield, service/UI/fullstack)

### `/templates/`
- **bmad-templates-guide.md** - Documentation of all project templates and their usage patterns

### `/tasks/`
- **bmad-tasks-reference.md** - Reference guide for all BMAD tasks and their execution patterns

### `/checklists/`
- **bmad-checklists-guide.md** - Quality assurance checklists and validation frameworks

### `/data/`
Sharded BMAD knowledge base:
- **bmad-core-principles.md** - Core philosophy, principles, and methodology
- **bmad-technical-guidelines.md** - Technical architecture and implementation details
- **bmad-process-knowledge.md** - Complete development workflows and processes
- **bmad-agent-knowledge.md** - Agent system details and team configurations

## Quick Reference

### Core BMAD Agents
1. **Planning Phase**: Analyst → PM → Architect → UX Expert → PO
2. **Development Phase**: SM → Dev → QA (iterative cycle)
3. **Meta Agents**: BMad Master, BMad Orchestrator

### Key Workflows
- **Greenfield**: New project development (fullstack, service, UI variants)
- **Brownfield**: Existing project enhancement (with quick path options)

### Essential Templates
- **Project Brief** - Initial project definition
- **PRD** - Product Requirements Document
- **Architecture** - Technical design document
- **Story** - Implementation units

### Critical Checklists
- **PO Master Validation** - Project readiness
- **Story DoD** - Definition of Done
- **Change Navigation** - Handling project changes

## Usage Guide

1. **Understanding BMAD**: Start with `/data/bmad-core-principles.md`
2. **Agent Details**: Reference `/agents/bmad-agents-overview.md`
3. **Workflow Selection**: Consult `/workflows/bmad-workflows-analysis.md`
4. **Document Creation**: Use `/templates/bmad-templates-guide.md`
5. **Task Execution**: Follow `/tasks/bmad-tasks-reference.md`
6. **Quality Assurance**: Apply `/checklists/bmad-checklists-guide.md`

## Integration with Claude Code

This knowledge base supports the implementation of a Claude Code agent system that:
- Ports all BMAD agents to Claude Code's tool ecosystem
- Extends capabilities with additional specialized agents
- Enables non-stop development through Tmux orchestration
- Implements robust context management for inter-agent communication
- Covers the complete software lifecycle from ideation to operations

For implementation details, see `/docs/research/claude-code-implementation/`