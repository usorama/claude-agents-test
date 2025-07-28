# BMAD Workflows Analysis

## Overview

The BMAD (Business-Minded Agent Development) methodology provides six distinct workflows that orchestrate agent activities to guide software projects from concept through implementation. These workflows are divided into two main categories: **Greenfield** (new projects) and **Brownfield** (existing project enhancements), each with three variants: **Full-Stack**, **Service/API**, and **UI/Frontend**.

## Table of Contents

1. [Workflow Structure](#workflow-structure)
2. [Available Workflows](#available-workflows)
3. [Workflow Configuration](#workflow-configuration)
4. [Agent Orchestration](#agent-orchestration)
5. [Greenfield vs Brownfield](#greenfield-vs-brownfield)
6. [Project Type Variations](#project-type-variations)
7. [Decision Guidance](#decision-guidance)

## Workflow Structure

All BMAD workflows follow a consistent YAML structure with the following key sections:

### Core Elements

```yaml
workflow:
  id: unique-workflow-identifier
  name: Human-readable workflow name
  description: Detailed workflow purpose and capabilities
  type: greenfield | brownfield
  project_types: [list of supported project types]
  sequence: [ordered list of workflow steps]
  flow_diagram: Mermaid diagram of the workflow
  decision_guidance: When and how to use this workflow
  handoff_prompts: Communication templates between agents
```

### Sequence Structure

Each step in the sequence contains:

- **agent**: Which agent performs the action
- **action/creates/updates**: What the agent does
- **requires**: Prerequisites for the step
- **condition**: Optional conditions for step execution
- **notes**: Detailed instructions and context
- **optional_steps**: Additional actions the agent can take

## Available Workflows

### 1. Greenfield Full-Stack (`greenfield-fullstack.yaml`)

**Purpose**: Building full-stack applications from concept to development

**Supported Project Types**:
- web-app
- saas
- enterprise-app
- prototype
- mvp

**Key Features**:
- Comprehensive planning from business analysis to architecture
- Optional AI UI generation (v0, Lovable integration)
- Supports both monorepo and polyrepo setups
- Complete document sharding for IDE development

### 2. Greenfield Service (`greenfield-service.yaml`)

**Purpose**: Building backend services and APIs from scratch

**Supported Project Types**:
- rest-api
- graphql-api
- microservice
- backend-service
- api-prototype
- simple-service

**Key Features**:
- Service-focused planning without UI components
- Streamlined workflow (no UX expert involvement)
- API-first architecture approach
- Backend-specific story creation

### 3. Greenfield UI (`greenfield-ui.yaml`)

**Purpose**: Building frontend applications from concept

**Supported Project Types**:
- spa (Single Page Application)
- mobile-app
- micro-frontend
- static-site
- ui-prototype
- simple-interface

**Key Features**:
- UI/UX-centric workflow
- Optional AI UI generation support
- Frontend-specific architecture planning
- Component-based story creation

### 4. Brownfield Full-Stack (`brownfield-fullstack.yaml`)

**Purpose**: Enhancing existing full-stack applications

**Supported Project Types**:
- feature-addition
- refactoring
- modernization
- integration-enhancement

**Key Features**:
- Enhancement classification system (single story, small feature, major enhancement)
- Dynamic routing based on enhancement size
- Optional project documentation analysis
- Flexible story creation approaches

### 5. Brownfield Service (`brownfield-service.yaml`)

**Purpose**: Enhancing existing backend services and APIs

**Supported Project Types**:
- service-modernization
- api-enhancement
- microservice-extraction
- performance-optimization
- integration-enhancement

**Key Features**:
- Mandatory existing system analysis
- Service integration safety validation
- API compatibility checking
- Performance metric consideration

### 6. Brownfield UI (`brownfield-ui.yaml`)

**Purpose**: Enhancing existing frontend applications

**Supported Project Types**:
- ui-modernization
- framework-migration
- design-refresh
- frontend-enhancement

**Key Features**:
- Existing UI analysis with user feedback integration
- Design pattern compatibility
- Component integration strategy
- Migration planning support

## Workflow Configuration

### YAML Structure Details

#### Project Types
Each workflow declares supported project types to help users select the appropriate workflow:

```yaml
project_types:
  - web-app          # Full web applications
  - saas             # Software as a Service
  - rest-api         # RESTful APIs
  - microservice     # Microservice architecture
  - ui-modernization # UI updates for existing apps
```

#### Sequence Definition
The sequence section defines the exact order of operations:

```yaml
sequence:
  - agent: analyst
    creates: project-brief.md
    optional_steps:
      - brainstorming_session
      - market_research_prompt
    notes: "Detailed instructions for the agent"
```

#### Conditional Steps
Workflows support conditional execution based on:
- User preferences
- Previous step outcomes
- Document validation results

```yaml
- agent: pm
  updates: prd.md
  condition: architecture_suggests_prd_changes
  notes: "Only executes if architect suggests changes"
```

#### Flow Diagrams
Each workflow includes a Mermaid diagram visualizing the process flow with color coding:
- Green (#90EE90): Completion states
- Light Blue (#ADD8E6): Development activities
- Peach (#FFE4B5): Planning documents
- Yellow (#F0E68C): Review activities
- Lavender (#E6E6FA): AI generation steps
- Sky Blue (#87CEEB): Brownfield quick paths

## Agent Orchestration

### Agent Roles in Workflows

1. **Analyst Agent**
   - Creates project briefs
   - Performs market research
   - Classifies enhancement scope (brownfield)
   - Reviews draft stories

2. **PM (Product Manager) Agent**
   - Creates Product Requirement Documents (PRDs)
   - Updates PRDs based on architectural feedback
   - Creates epics and stories for brownfield projects

3. **UX Expert Agent**
   - Creates frontend specifications
   - Generates AI UI prompts
   - Performs user research
   - Integrates with existing design patterns (brownfield)

4. **Architect Agent**
   - Creates architecture documents
   - Analyzes existing projects (brownfield)
   - Suggests PRD modifications
   - Reviews generated UI structures

5. **PO (Product Owner) Agent**
   - Validates all artifacts
   - Shards documents for development
   - Conducts epic retrospectives
   - Ensures consistency across documents

6. **SM (Scrum Master) Agent**
   - Creates individual stories from sharded documents
   - Manages story lifecycle
   - Handles varied documentation formats (brownfield)

7. **Dev Agent**
   - Implements stories
   - Updates file lists
   - Addresses QA feedback
   - Marks stories for review

8. **QA Agent**
   - Reviews implementations
   - Performs refactoring
   - Creates checklists for remaining items
   - Updates story status

### Orchestration Patterns

#### Sequential Handoffs
Agents pass artifacts between each other with specific handoff prompts:

```yaml
handoff_prompts:
  analyst_to_pm: "Project brief is complete. Save it as docs/project-brief.md..."
  pm_to_ux: "PRD is ready. Save it as docs/prd.md..."
```

#### Iterative Loops
Several patterns support iteration:
- PO validation loops (fix issues and revalidate)
- Story development cycles (SM → Dev → QA)
- QA feedback loops (Dev addresses issues)

#### Parallel Paths
Brownfield workflows support parallel execution paths based on enhancement classification.

## Greenfield vs Brownfield

### Greenfield Characteristics

1. **Clean Slate Approach**
   - Start with business analysis
   - No existing code constraints
   - Full architectural freedom
   - Comprehensive documentation creation

2. **Linear Progression**
   - Predictable workflow sequence
   - Each agent builds on previous work
   - Clear handoff points
   - Minimal conditional branching

3. **Document Creation Focus**
   - All documents created from scratch
   - Templates guide document structure
   - Consistent artifact naming
   - Standard sharding process

### Brownfield Characteristics

1. **Analysis First**
   - Must understand existing system
   - Document current state
   - Identify constraints and dependencies
   - Assess technical debt

2. **Dynamic Routing**
   - Enhancement classification determines path
   - Quick paths for small changes
   - Comprehensive planning for major work
   - Flexible documentation requirements

3. **Integration Safety**
   - Compatibility validation
   - Risk assessment
   - Migration planning
   - Incremental change approach

### Key Differences

| Aspect | Greenfield | Brownfield |
|--------|------------|------------|
| Starting Point | Business concept | Existing codebase |
| Documentation | Create all docs | Analyze existing + create new |
| Architecture | Design from scratch | Work within constraints |
| Risk Profile | Implementation risk | Integration risk |
| Flexibility | Maximum | Limited by existing system |
| Quick Paths | None | Single story, small epic options |

## Project Type Variations

### Full-Stack Workflows

**Common Elements**:
- Complete planning cycle (business → architecture)
- Frontend and backend coordination
- UX expert involvement
- Optional AI UI generation

**Differences**:
- Greenfield: Choose architecture freely
- Brownfield: Must integrate with existing stack

### Service/API Workflows

**Common Elements**:
- No UX expert involvement
- API-first approach
- Backend architecture focus
- Service integration planning

**Differences**:
- Greenfield: Design API structure freely
- Brownfield: Maintain API compatibility

### UI/Frontend Workflows

**Common Elements**:
- Strong UX expert involvement
- Frontend architecture focus
- Component-based planning
- Design system consideration

**Differences**:
- Greenfield: Create new design system
- Brownfield: Work within existing patterns

## Decision Guidance

### Workflow Selection Criteria

#### Choose Greenfield When:
- Building from scratch
- No existing codebase
- Full architectural freedom needed
- Creating new product/service

#### Choose Brownfield When:
- Enhancing existing system
- Adding features to production code
- Modernizing legacy systems
- Refactoring or optimizing

#### Choose Full-Stack When:
- Building complete applications
- Frontend and backend are tightly coupled
- Need coordinated UI/API development
- Single team owns entire stack

#### Choose Service When:
- Building APIs or microservices
- Backend-only requirements
- No UI components needed
- Service-oriented architecture

#### Choose UI When:
- Frontend-only projects
- Consuming existing APIs
- UI modernization projects
- Design-focused initiatives

### Enhancement Classification (Brownfield)

The brownfield-fullstack workflow includes a classification system:

1. **Single Story** (< 4 hours)
   - Use `brownfield-create-story` task
   - Skip comprehensive planning
   - Direct to implementation

2. **Small Feature** (1-3 stories)
   - Use `brownfield-create-epic` task
   - Light planning process
   - Focused scope

3. **Major Enhancement** (multiple epics)
   - Full workflow execution
   - Comprehensive planning
   - Architecture consideration
   - Risk assessment

### Best Practices

1. **Document Preservation**
   - Save all artifacts to `docs/` folder
   - Use consistent naming conventions
   - Export complete, unredacted versions
   - Maintain document versioning

2. **Agent Communication**
   - Use provided handoff prompts
   - Pass complete context between agents
   - Reference previous artifacts
   - Maintain traceability

3. **Story Development**
   - Always shard documents before story creation
   - Review draft stories when complexity is high
   - Use QA agent for critical features
   - Complete retrospectives for learning

4. **Flexibility**
   - Optional steps can be skipped for speed
   - Brownfield quick paths save time
   - Adapt workflow to project needs
   - Consider team size and expertise

## Conclusion

BMAD workflows provide a structured yet flexible approach to software development, accommodating both new projects and enhancements to existing systems. The orchestration of specialized agents ensures comprehensive planning, consistent documentation, and systematic implementation across different project types and scales.

The key to successful BMAD implementation is selecting the appropriate workflow based on project characteristics and following the orchestrated sequence while leveraging optional steps and quick paths when appropriate.