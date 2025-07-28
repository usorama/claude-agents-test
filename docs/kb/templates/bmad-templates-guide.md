# BMAD Templates Guide

This guide provides comprehensive documentation for all BMAD-METHOD templates, their purposes, structure, and usage patterns.

## Table of Contents

1. [Overview](#overview)
2. [Template System Architecture](#template-system-architecture)
3. [Available Templates](#available-templates)
4. [Template Structure and Placeholders](#template-structure-and-placeholders)
5. [How Agents Use Templates](#how-agents-use-templates)
6. [Key Sections in Each Template Type](#key-sections-in-each-template-type)
7. [Best Practices for Template Usage](#best-practices-for-template-usage)

## Overview

The BMAD-METHOD uses YAML-based templates to guide agents through creating standardized documents for software development. These templates ensure consistency, completeness, and quality across all project documentation.

### Template Categories

Templates are organized into three main categories:

1. **Planning Templates** - For project inception and requirements
2. **Architecture Templates** - For technical design and system architecture
3. **Implementation Templates** - For development execution

## Template System Architecture

### Core Components

Each template contains:

- **Metadata** - Template identification and versioning
- **Workflow Configuration** - How agents interact with users
- **Section Definitions** - Structured content areas
- **Instructions** - Guidance for agents and users

### Template Schema

```yaml
template:
  id: unique-identifier
  name: Human-readable name
  version: Semantic version
  output:
    format: markdown
    filename: Output path template
    title: Document title template

workflow:
  mode: interactive|non-interactive
  elicitation: advanced-elicitation|standard
  custom_elicitation: Optional custom options

sections:
  - id: section-identifier
    title: Section Title
    instruction: Guidance for this section
    # Additional section properties...
```

## Available Templates

### 1. Project Brief Template (`project-brief-tmpl.yaml`)

**Purpose**: Foundational document capturing project vision, goals, and constraints

**Key Features**:
- Interactive or YOLO mode options
- Comprehensive problem statement framework
- Target user profiling
- Success metrics definition
- MVP scope clarification

**When to Use**: At project inception, before creating PRD

### 2. Product Requirements Document Template (`prd-tmpl.yaml`)

**Purpose**: Detailed functional and non-functional requirements specification

**Key Features**:
- Goals and background context
- Functional/non-functional requirements separation
- UI/UX goals section (conditional)
- Technical assumptions capture
- Epic and story breakdown

**When to Use**: After project brief, to define detailed requirements

### 3. Architecture Template (`architecture-tmpl.yaml`)

**Purpose**: Comprehensive technical architecture documentation

**Key Features**:
- High-level architecture overview
- Technology stack definition (DEFINITIVE source)
- Component architecture
- Data models and schema
- Infrastructure and deployment planning
- Security and testing strategies

**When to Use**: After PRD approval, before implementation

### 4. Frontend Architecture Template (`front-end-architecture-tmpl.yaml`)

**Purpose**: Frontend-specific technical design

**Key Features**:
- Framework-specific patterns
- Component standards
- State management patterns
- API integration templates
- Testing requirements

**When to Use**: For projects with significant UI components

### 5. UI/UX Specification Template (`front-end-spec-tmpl.yaml`)

**Purpose**: User experience and interface design documentation

**Key Features**:
- UX goals and principles
- Information architecture
- User flow diagrams
- Component library planning
- Accessibility requirements
- Responsive design strategy

**When to Use**: Before or alongside frontend architecture

### 6. Story Template (`story-tmpl.yaml`)

**Purpose**: Individual development story documentation

**Key Features**:
- User story format
- Acceptance criteria
- Task breakdown
- Dev notes section
- Agent tracking sections

**When to Use**: For each development story

### 7. Market Research Template (`market-research-tmpl.yaml`)

**Purpose**: Comprehensive market analysis

**Key Features**:
- TAM/SAM/SOM calculations
- Customer analysis frameworks
- Competitive landscape assessment
- Industry analysis (Porter's Five Forces)
- Strategic recommendations

**When to Use**: During project discovery phase

### 8. Competitor Analysis Template (`competitor-analysis-tmpl.yaml`)

**Purpose**: Detailed competitive intelligence

**Key Features**:
- Competitor profiles
- Feature comparison matrices
- SWOT analysis
- Strategic positioning
- Monitoring plans

**When to Use**: During market research or strategic planning

### 9. Brainstorming Output Template (`brainstorming-output-tmpl.yaml`)

**Purpose**: Structured capture of brainstorming sessions

**Key Features**:
- Session metadata
- Technique documentation
- Idea categorization
- Action planning

**When to Use**: After brainstorming sessions

### 10. Brownfield PRD Template (`brownfield-prd-tmpl.yaml`)

**Purpose**: Enhancement planning for existing projects

**Key Features**:
- Existing project analysis
- Enhancement scope definition
- Compatibility requirements
- Integration planning
- Risk assessment

**When to Use**: For significant enhancements to existing systems

### 11. Brownfield Architecture Template (`brownfield-architecture-tmpl.yaml`)

**Purpose**: Technical design for brownfield enhancements

**Key Features**:
- Existing system analysis
- Integration strategy
- Component integration planning
- Deployment integration

**When to Use**: For architectural planning of brownfield enhancements

### 12. Fullstack Architecture Template (`fullstack-architecture-tmpl.yaml`)

**Purpose**: Combined frontend and backend architecture (if exists)

**Note**: This template was listed but not analyzed. It likely combines elements from both architecture templates.

## Template Structure and Placeholders

### Placeholder System

Templates use double-brace placeholders for dynamic content:

```yaml
title: "{{project_name}} Architecture Document"
```

### Common Placeholder Types

1. **Simple Variables**: `{{variable_name}}`
2. **Nested Variables**: `{{section.subsection.value}}`
3. **Lists**: Rendered as bullet points or numbered lists
4. **Tables**: Structured data with columns and rows
5. **Code Blocks**: Language-specific formatted code

### Section Types

#### Basic Section
```yaml
- id: section-id
  title: Section Title
  instruction: Guidance text
  template: "Content with {{placeholders}}"
```

#### Repeatable Section
```yaml
- id: component-list
  repeatable: true
  title: "{{component_name}}"
  template: |
    **Description:** {{description}}
```

#### Conditional Section
```yaml
- id: api-section
  condition: Project includes REST API
  title: API Documentation
```

#### Table Section
```yaml
- id: tech-stack
  type: table
  columns: [Category, Technology, Version]
  rows:
    - ["Language", "{{language}}", "{{version}}"]
```

#### Mermaid Diagram Section
```yaml
- id: architecture-diagram
  type: mermaid
  mermaid_type: graph
  instruction: Create system diagram
```

## How Agents Use Templates

### 1. Template Selection

Agents select templates based on:
- User request (e.g., "create a PRD")
- Project phase
- Document dependencies

### 2. Workflow Execution

#### Interactive Mode
1. Agent presents section with pre-filled suggestions
2. User reviews and provides feedback
3. Agent refines based on input
4. Process repeats for each section

#### Non-Interactive Mode
1. Agent generates complete document
2. User reviews entire output
3. Refinements made as needed

### 3. Elicitation Process

Advanced elicitation includes:
- Pre-filling sections with educated guesses
- Presenting multiple options for decisions
- Asking targeted questions for clarification
- Validating assumptions with users

### 4. Document Generation

1. Parse template YAML structure
2. Process sections sequentially
3. Apply workflow rules (interactive/non-interactive)
4. Replace placeholders with actual content
5. Format output as specified (usually Markdown)
6. Save to specified location

## Key Sections in Each Template Type

### Planning Templates

**Common Sections**:
- Executive Summary
- Problem Statement
- Goals and Objectives
- Success Metrics
- Scope Definition
- Constraints and Assumptions

### Architecture Templates

**Common Sections**:
- High-Level Architecture
- Technology Stack (DEFINITIVE)
- Component Design
- Data Models
- API Specifications
- Security Requirements
- Infrastructure Planning

### Implementation Templates

**Common Sections**:
- User Stories
- Acceptance Criteria
- Technical Tasks
- Testing Requirements
- Development Notes

## Best Practices for Template Usage

### 1. Template Selection

- Start with Project Brief for new projects
- Use Brownfield templates for existing systems
- Follow the natural progression: Brief → PRD → Architecture → Stories
- Don't skip foundational templates

### 2. Placeholder Usage

- Use descriptive placeholder names
- Maintain consistency across related templates
- Include examples where helpful
- Document any complex placeholder logic

### 3. Section Design

- Keep sections focused on single concerns
- Use appropriate section types (table, code, etc.)
- Include clear instructions for agents
- Make proper use of conditional sections

### 4. Workflow Configuration

- Choose interactive mode for complex decisions
- Use elicitation for sections requiring user input
- Provide custom elicitation options where beneficial
- Consider agent capabilities when setting modes

### 5. Version Management

- Update version numbers when modifying templates
- Maintain backward compatibility where possible
- Document breaking changes
- Keep change logs updated

### 6. Integration Between Templates

- Reference definitive sources (e.g., Tech Stack from Architecture)
- Maintain consistency in terminology
- Use cross-references appropriately
- Ensure logical flow between documents

### 7. Agent Instructions

- Provide clear, actionable guidance
- Include validation steps
- Specify when to ask for user input
- Define quality criteria

### 8. Error Prevention

- Include validation checkpoints
- Provide examples of correct usage
- Specify required vs. optional sections
- Clear instruction on dependencies

### 9. Customization

- Allow for project-specific variations
- Use conditional sections effectively
- Provide extension points
- Don't over-constrain creativity

### 10. Documentation

- Keep template documentation updated
- Include usage examples
- Document common patterns
- Maintain template change logs

## Template Dependencies

### Typical Flow

1. **Project Brief** → Establishes foundation
2. **Market Research** → Informs product decisions (optional)
3. **Competitor Analysis** → Strategic positioning (optional)
4. **PRD** → Detailed requirements
5. **UI/UX Spec** → Design requirements (if UI exists)
6. **Architecture** → Technical design
7. **Frontend Architecture** → UI technical design (if needed)
8. **Stories** → Implementation tasks

### Key Dependencies

- PRD requires Project Brief or equivalent context
- Architecture requires completed PRD
- Frontend Architecture requires main Architecture
- Stories require Epic definitions from PRD
- Brownfield templates require existing project analysis

## Conclusion

BMAD templates provide a comprehensive framework for software project documentation. By following these templates and best practices, teams can ensure consistent, high-quality documentation that effectively guides both human developers and AI agents through the software development lifecycle.

The template system's strength lies in its:
- Structured approach to complex documentation
- Flexibility for different project types
- Clear guidance for both agents and humans
- Integration between different document types
- Support for both greenfield and brownfield projects

Effective use of these templates results in better project outcomes through clearer requirements, more thoughtful architecture, and more efficient implementation.