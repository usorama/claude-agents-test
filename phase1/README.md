# BMAD-METHOD Claude Code Agents - Phase 1

Phase 1 implementation of the BMAD-METHOD agent system for Claude Code, featuring core agents (Analyst, PM, Architect) with intelligent orchestration and context management.

## 🚀 Features

- **Core BMAD Agents**: Analyst (Mary), PM (John), and Architect (Winston)
- **Intelligent Orchestrator**: Routes tasks to appropriate agents based on request analysis
- **Hierarchical Context Management**: Global → Project → Agent → Task context levels
- **Workflow Automation**: Pre-defined workflows for common development patterns
- **Inter-Agent Communication**: Message-based communication between agents
- **Performance Monitoring**: Built-in metrics and monitoring capabilities

## 📦 Installation

```bash
cd phase1
npm install
```

## 🎯 Quick Start

### Interactive Mode
```bash
npm start
# or
node src/index.js start
```

Available commands:
- `route <request>` - Route a natural language request to appropriate agents
- `workflow <name>` - Start a predefined workflow
- `status` - Show system status and metrics
- `exit` - Shutdown the system

### Direct Agent Execution
```bash
# Run analyst research task
node src/index.js agent analyst research-prompt -i '{"topic":"AI development tools"}'

# Create PRD with PM
node src/index.js agent pm create-prd -i '{"projectName":"TaskFlow","goals":["Task tracking"]}'

# Design architecture
node src/index.js agent architect create-full-stack-architecture -i '{"projectName":"TaskFlow"}'
```

## 🏗️ Architecture

### System Components

```
┌─────────────────┐
│   Orchestrator  │
│  (Task Router)  │
└────────┬────────┘
         │
    ┌────┴────┬──────────┬───────────┐
    │         │          │           │
┌───▼───┐ ┌──▼───┐ ┌────▼────┐ ┌────▼────┐
│Analyst│ │  PM  │ │Architect│ │  More.. │
└───┬───┘ └──┬───┘ └────┬────┘ └────┬────┘
    │        │          │            │
    └────────┴──────────┴────────────┘
                    │
           ┌────────▼────────┐
           │ Context Manager │
           │  (State Store)  │
           └─────────────────┘
```

### Agent Capabilities

- **Analyst (Mary)**: Market research, brainstorming, competitive analysis, project briefs
- **PM (John)**: PRDs, epics, user stories, roadmaps, feature prioritization
- **Architect (Winston)**: System design, technology selection, API design, infrastructure

### Workflows

1. **Product Development**: Discovery → Planning → Development
2. **Brownfield Modernization**: Analysis → Planning → Migration
3. **Emergency Response**: Triage → Resolution

## 🧪 Testing

```bash
# Run all tests
npm test

# Run specific test suite
npm run test:unit
npm run test:integration
```

## 📊 Context Management

The system uses a hierarchical context system:

```
Global Context
  └── Project Context
       └── Agent Context
            └── Task Context
```

Context files are stored in JSON format with:
- Atomic writes for consistency
- File-based locking for concurrent access
- Automatic cleanup of old messages
- Knowledge graph generation

## 🔧 Configuration

### Environment Variables
```bash
CONTEXT_DIR=./agent-context    # Context storage directory
MAX_CONCURRENCY=3              # Maximum concurrent tasks
LOG_LEVEL=info                 # Logging level
```

### Agent Configuration
Each agent can be configured with:
- Maximum session tokens
- Session duration limits
- Tool access permissions
- Custom capabilities

## 📈 Performance Considerations

- **Token Limits**: Each agent tracks token usage with configurable limits
- **Session Duration**: 2-hour maximum session duration per agent
- **Concurrent Tasks**: Configurable task queue with priority support
- **File Operations**: Atomic writes with proper locking mechanisms

## 🛠️ Development

### Project Structure
```
phase1/
├── src/
│   ├── agents/
│   │   ├── BaseAgent.js
│   │   └── core/
│   │       ├── AnalystAgent.js
│   │       ├── PMAgent.js
│   │       └── ArchitectAgent.js
│   ├── context/
│   │   └── ContextManager.js
│   ├── orchestrator/
│   │   └── OrchestratorAgent.js
│   ├── types/
│   │   ├── agent.types.js
│   │   └── context.types.js
│   └── index.js
├── tests/
│   ├── unit/
│   └── integration/
└── package.json
```

### Adding New Agents
1. Extend `BaseAgent` class
2. Implement `_executeTask` method
3. Define agent capabilities and tools
4. Register with orchestrator

## 🚦 Phase 1 Status

✅ **Completed**:
- Project structure setup
- Enhanced Context Manager with hierarchy
- Base agent framework
- Core BMAD agents (Analyst, PM, Architect)
- Intelligent Orchestrator
- Integration tests
- CLI interface

🔄 **Next Phase** (Phase 2):
- Extended agents (DevOps, Git Manager, Monitor, etc.)
- Tmux integration
- Advanced workflows
- Performance optimizations

## 📝 License

This project is part of the BMAD-METHOD implementation for Claude Code.