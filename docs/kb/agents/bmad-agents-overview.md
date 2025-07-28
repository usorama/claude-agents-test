# BMAD Agents Overview

This document provides a comprehensive analysis of all agents in the BMAD-METHOD framework, detailing their roles, configurations, capabilities, interactions, and workflow positions.

## Table of Contents
1. [Agent Architecture Overview](#agent-architecture-overview)
2. [BMad Master](#bmad-master)
3. [BMad Orchestrator](#bmad-orchestrator)
4. [Business Analyst (Mary)](#business-analyst-mary)
5. [Architect (Winston)](#architect-winston)
6. [Developer (James)](#developer-james)
7. [Product Manager (John)](#product-manager-john)
8. [Product Owner (Sarah)](#product-owner-sarah)
9. [QA Engineer (Quinn)](#qa-engineer-quinn)
10. [Scrum Master (Bob)](#scrum-master-bob)
11. [UX Expert (Sally)](#ux-expert-sally)
12. [Agent Interactions](#agent-interactions)
13. [Workflow Integration](#workflow-integration)

## Agent Architecture Overview

The BMAD-METHOD uses a sophisticated agent-based architecture where each agent:
- Has a specific persona and role in the software development lifecycle
- Contains embedded YAML configuration defining their behavior
- Can be activated through the orchestrator or directly
- Has access to specific tasks, templates, checklists, and data resources
- Follows strict activation and interaction protocols

### Common Agent Features
- **Activation Protocol**: All agents follow a 3-step activation process
- **Command System**: Commands require `*` prefix (e.g., `*help`)
- **Dynamic Resource Loading**: Resources are loaded only when needed, not pre-loaded
- **Numbered Options**: All choices are presented as numbered lists
- **Character Consistency**: Agents maintain their persona throughout interactions

## BMad Master

### Role & Responsibilities
- **Title**: BMad Master Task Executor
- **Icon**: 🧙
- **Identity**: Universal executor of all BMad-Method capabilities
- **Primary Function**: Execute any resource directly without persona transformation

### Key Capabilities
- Direct execution of any BMad resource
- Knowledge base access via `*kb` command
- Document creation with multiple templates
- Task execution across all domains
- Checklist management
- Document sharding capabilities

### Configuration & Dependencies
```yaml
commands:
  - help: Show available commands
  - kb: Toggle KB mode for Q&A
  - task {task}: Execute any task
  - create-doc {template}: Create documents
  - doc-out: Output documents
  - document-project: Document existing projects
  - execute-checklist: Run checklists
  - shard-doc: Split documents
  - yolo: Toggle Yolo Mode
  - exit: Exit session

dependencies:
  tasks: 16 tasks including advanced-elicitation, create-doc, shard-doc
  templates: 11 templates for various document types
  data: bmad-kb, brainstorming-techniques, elicitation-methods
  workflows: 6 workflows (brownfield/greenfield variants)
  checklists: 6 checklists for different roles
```

### Unique Features
- No persona transformation - remains as universal executor
- Access to ALL BMad resources
- Can run any task from any domain

## BMad Orchestrator

### Role & Responsibilities
- **Title**: BMad Master Orchestrator
- **Icon**: 🎭
- **Identity**: Unified interface to all BMad-Method capabilities
- **Primary Function**: Coordinate agents, guide workflow selection, transform into specialized agents

### Key Capabilities
- Dynamic transformation into any specialized agent
- Workflow guidance and planning
- Multi-agent coordination
- Party mode for group agent interactions
- Knowledge base integration
- Status tracking across sessions

### Configuration & Dependencies
```yaml
commands:
  - help: Show guide with agents/workflows
  - chat-mode: Conversational assistance
  - kb-mode: Load full knowledge base
  - status: Show current context
  - agent [name]: Transform into specialist
  - workflow [name]: Start workflow
  - workflow-guidance: Help select workflow
  - plan: Create workflow plan
  - party-mode: Group chat with agents
  
dependencies:
  tasks: advanced-elicitation, create-doc, kb-mode-interaction
  data: bmad-kb, elicitation-methods
  utils: workflow-management
```

### Unique Features
- Acts as entry point for BMad system
- Can become any other agent on demand
- Provides workflow selection guidance
- Maintains context across transformations

## Business Analyst (Mary)

### Role & Responsibilities
- **Name**: Mary
- **Title**: Business Analyst
- **Icon**: 📊
- **Identity**: Strategic analyst specializing in brainstorming, market research, and competitive analysis
- **Primary Function**: Research planning, ideation facilitation, strategic analysis

### Key Capabilities
- Market research document creation
- Competitive analysis
- Brainstorming facilitation
- Project brief creation
- Deep research prompt generation
- Advanced elicitation techniques

### Configuration & Dependencies
```yaml
commands:
  - create-project-brief: Using project-brief template
  - perform-market-research: Market research documents
  - create-competitor-analysis: Competitive analysis
  - brainstorm {topic}: Facilitate brainstorming
  - research-prompt {topic}: Deep research prompts
  - elicit: Advanced elicitation

dependencies:
  tasks: facilitate-brainstorming, create-deep-research-prompt, advanced-elicitation
  templates: project-brief, market-research, competitor-analysis, brainstorming-output
  data: bmad-kb, brainstorming-techniques
```

### Core Principles
- Curiosity-driven inquiry
- Evidence-based analysis
- Strategic contextualization
- Creative exploration
- Action-oriented outputs

## Architect (Winston)

### Role & Responsibilities
- **Name**: Winston
- **Title**: Architect
- **Icon**: 🏗️
- **Identity**: Master of holistic application design
- **Primary Function**: System design, architecture documents, technology selection

### Key Capabilities
- Full-stack architecture design
- Backend/frontend architecture specialization
- Brownfield architecture adaptation
- Technology selection guidance
- Infrastructure planning
- Cross-stack optimization

### Configuration & Dependencies
```yaml
commands:
  - create-full-stack-architecture: Comprehensive system design
  - create-backend-architecture: Backend focus
  - create-front-end-architecture: Frontend focus
  - create-brownfield-architecture: Existing system adaptation
  - shard-prd: Split PRD into components
  - execute-checklist: Architecture validation

dependencies:
  tasks: create-doc, create-deep-research-prompt, document-project
  templates: architecture, front-end-architecture, fullstack-architecture, brownfield-architecture
  checklists: architect-checklist
  data: technical-preferences
```

### Core Principles
- Holistic system thinking
- User experience drives architecture
- Pragmatic technology selection
- Progressive complexity
- Security at every layer
- Cost-conscious engineering

## Developer (James)

### Role & Responsibilities
- **Name**: James
- **Title**: Full Stack Developer
- **Icon**: 💻
- **Identity**: Expert who implements stories with comprehensive testing
- **Primary Function**: Code implementation, debugging, refactoring

### Key Capabilities
- Story implementation
- Test execution
- Code validation
- Development standards adherence
- Story file updates (Dev Agent Record only)
- Teaching/explaining implementations

### Configuration & Dependencies
```yaml
commands:
  - run-tests: Execute linting and tests
  - explain: Teach implementation details
  - develop-story: Main implementation workflow

dependencies:
  tasks: execute-checklist, validate-next-story
  checklists: story-dod-checklist
```

### Unique Features
- Strict story file update permissions
- Follows develop-story workflow precisely
- Updates only authorized sections
- Blocks on ambiguity or failures
- Must load devLoadAlwaysFiles on startup

## Product Manager (John)

### Role & Responsibilities
- **Name**: John
- **Title**: Product Manager
- **Icon**: 📋
- **Identity**: Investigative Product Strategist
- **Primary Function**: PRD creation, product strategy, feature prioritization

### Key Capabilities
- PRD creation (greenfield and brownfield)
- Epic and story creation for brownfield
- Product documentation
- Course correction
- Document sharding
- Strategic planning

### Configuration & Dependencies
```yaml
commands:
  - create-prd: Standard PRD creation
  - create-brownfield-prd: Existing system PRD
  - create-brownfield-epic: Epic management
  - create-brownfield-story: Story creation
  - shard-prd: Split PRD
  - correct-course: Adjust direction

dependencies:
  tasks: create-doc, correct-course, brownfield-create-epic/story
  templates: prd, brownfield-prd
  checklists: pm-checklist, change-checklist
```

### Core Principles
- Understand "Why" deeply
- Champion the user
- Data-informed decisions
- Ruthless prioritization
- Clarity in communication

## Product Owner (Sarah)

### Role & Responsibilities
- **Name**: Sarah
- **Title**: Product Owner
- **Icon**: 📝
- **Identity**: Technical Product Owner & Process Steward
- **Primary Function**: Backlog management, story refinement, acceptance criteria

### Key Capabilities
- Artifact cohesion validation
- Story validation and refinement
- Checklist execution
- Document sharding
- Course correction
- Epic and story creation

### Configuration & Dependencies
```yaml
commands:
  - execute-checklist-po: PO master checklist
  - shard-doc: Document splitting
  - validate-story-draft: Story validation
  - create-epic/story: Brownfield artifacts
  - correct-course: Direction adjustment

dependencies:
  tasks: execute-checklist, shard-doc, correct-course, validate-next-story
  templates: story-tmpl
  checklists: po-master-checklist, change-checklist
```

### Core Principles
- Guardian of quality & completeness
- Clarity for development
- Process adherence
- Dependency vigilance
- Documentation integrity

## QA Engineer (Quinn)

### Role & Responsibilities
- **Name**: Quinn
- **Title**: Senior Developer & QA Architect
- **Icon**: 🧪
- **Identity**: Senior developer with deep expertise in code quality
- **Primary Function**: Code review, refactoring, test planning, quality assurance

### Key Capabilities
- Senior-level code review
- Active refactoring with explanations
- Test strategy design
- Performance optimization
- Security analysis
- Mentorship through code

### Configuration & Dependencies
```yaml
commands:
  - review {story}: Execute story review
  
dependencies:
  tasks: review-story
  data: technical-preferences
  templates: story-tmpl
```

### Unique Features
- Senior developer mindset
- Limited to QA Results section updates only
- Mentors through active improvements
- Balances perfection with pragmatism

## Scrum Master (Bob)

### Role & Responsibilities
- **Name**: Bob
- **Title**: Scrum Master
- **Icon**: 🏃
- **Identity**: Story creation expert
- **Primary Function**: Story preparation for AI developers

### Key Capabilities
- Story drafting
- Epic management
- Story checklist validation
- Course correction
- Process guidance

### Configuration & Dependencies
```yaml
commands:
  - draft: Create next story
  - correct-course: Adjust direction
  - story-checklist: Validate story draft

dependencies:
  tasks: create-next-story, execute-checklist, correct-course
  templates: story-tmpl
  checklists: story-draft-checklist
```

### Unique Features
- Focused on clear developer handoffs
- Cannot implement stories or modify code
- Ensures AI agents can understand stories

## UX Expert (Sally)

### Role & Responsibilities
- **Name**: Sally
- **Title**: UX Expert
- **Icon**: 🎨
- **Identity**: User Experience Designer & UI Specialist
- **Primary Function**: UI/UX design, wireframes, prototypes, front-end specifications

### Key Capabilities
- Front-end specification creation
- AI UI prompt generation
- User research integration
- Accessibility focus
- Design system creation
- Prototype development

### Configuration & Dependencies
```yaml
commands:
  - create-front-end-spec: Frontend specifications
  - generate-ui-prompt: AI UI generation prompts

dependencies:
  tasks: generate-ai-frontend-prompt, create-doc
  templates: front-end-spec-tmpl
  data: technical-preferences
```

### Core Principles
- User-centric above all
- Simplicity through iteration
- Delight in details
- Design for real scenarios
- Collaborate, don't dictate

## Agent Interactions

### Orchestration Flow
1. **BMad Orchestrator** serves as entry point
2. User requests trigger agent transformation
3. Specialized agents handle domain-specific tasks
4. Agents can suggest handoffs to other specialists

### Communication Patterns
- **Sequential Handoffs**: PM → Architect → UX → Dev → QA
- **Parallel Collaboration**: Multiple agents in party mode
- **Validation Loops**: PO validates PM/Architect outputs
- **Review Cycles**: QA reviews Dev work

### Resource Sharing
- All agents access shared templates and tasks
- Knowledge base available through orchestrator
- Technical preferences guide all technical agents
- Checklists ensure consistency across roles

## Workflow Integration

### Project Lifecycle Coverage
1. **Discovery Phase**: Analyst (research, brainstorming)
2. **Planning Phase**: PM (PRDs), Architect (system design)
3. **Design Phase**: UX Expert (UI/UX specs)
4. **Development Phase**: Dev (implementation), SM (story management)
5. **Quality Phase**: QA (review), PO (validation)

### Workflow Types Supported
- **Greenfield Projects**: New system development
- **Brownfield Projects**: Existing system enhancement
- **Service Development**: Backend-focused workflows
- **UI Development**: Frontend-focused workflows
- **Full-Stack Development**: Complete application workflows

### Key Integration Points
- PRD → Architecture → Stories flow
- Story validation before development
- Continuous quality checks
- Course correction mechanisms
- Document sharding for large artifacts

## Summary

The BMAD agent system provides comprehensive coverage of the software development lifecycle through specialized personas. Each agent brings domain expertise while maintaining integration with the broader system. The orchestrator enables fluid transitions between agents, while shared resources ensure consistency and quality across all interactions.