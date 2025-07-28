# BMAD Tasks Reference Guide

## Overview

BMAD tasks are specialized, reusable units of work that agents execute to accomplish specific objectives within the BMad methodology. Each task provides detailed instructions, validation criteria, and integration patterns to ensure consistent, high-quality outcomes across different project contexts.

## Task Categories

### 1. Project Documentation Tasks

#### `document-project.md`
**Purpose**: Generate comprehensive documentation for existing projects optimized for AI development agents.

**Key Features**:
- Analyzes existing codebases to create brownfield architecture documents
- Captures actual system state including technical debt and workarounds
- Can focus on specific areas when PRD is provided
- Creates reference materials for AI agents to understand project context

**When to Use**:
- Starting work on an existing codebase
- Before creating brownfield enhancements
- When AI agents need comprehensive project context
- To document technical debt and system constraints

#### `index-docs.md`
**Purpose**: Maintains the integrity and completeness of documentation indexes.

**Key Features**:
- Scans documentation directories recursively
- Creates hierarchical organization for subfolders
- Validates existing index entries
- Handles missing files with user confirmation
- Preserves existing descriptions and organization

**When to Use**:
- After adding new documentation files
- When reorganizing documentation structure
- To validate documentation completeness
- For regular documentation maintenance

#### `shard-doc.md`
**Purpose**: Split large documents into smaller, manageable sections.

**Key Features**:
- Automatic sharding with markdown-tree parser (preferred)
- Manual sharding fallback method
- Preserves all content including code blocks and diagrams
- Creates index files for navigation
- Adjusts heading levels appropriately

**When to Use**:
- When documents exceed manageable size
- To improve navigation in large documents
- For better version control of documentation
- When working with PRDs or architecture documents

### 2. Story Management Tasks

#### `create-next-story.md`
**Purpose**: Create comprehensive, implementation-ready story files from epic definitions.

**Key Features**:
- Sequential story identification based on project progress
- Enriches stories with architecture context
- Validates against project structure
- Creates self-contained stories for dev agents
- Includes source references for all technical details

**When to Use**:
- Working with standard BMad v4+ projects
- When PRD and architecture are properly sharded
- For greenfield or well-documented projects
- Following standard story progression

#### `create-brownfield-story.md`
**Purpose**: Create stories for brownfield projects with non-standard documentation.

**Key Features**:
- Works with various documentation formats
- Gathers missing context from users
- Includes exploration tasks for unknowns
- Emphasizes existing system protection
- Creates safety-focused implementation plans

**When to Use**:
- Working on legacy systems
- When documentation is incomplete
- For projects without standard BMad structure
- When technical context needs discovery

#### `validate-next-story.md`
**Purpose**: Comprehensively validate story drafts before implementation.

**Key Features**:
- Template completeness checking
- Anti-hallucination verification
- File structure validation
- Acceptance criteria coverage assessment
- Implementation readiness scoring

**When to Use**:
- Before starting story implementation
- To ensure story quality
- When stories seem incomplete
- For complex or high-risk stories

#### `review-story.md`
**Purpose**: Perform senior developer code review with refactoring authority.

**Key Features**:
- Comprehensive code quality assessment
- Active refactoring capabilities
- Standards compliance verification
- Security and performance review
- Educational feedback for developers

**When to Use**:
- When stories are marked "Ready for Review"
- For quality assurance processes
- To maintain code standards
- For developer mentoring

### 3. Epic and Enhancement Tasks

#### `brownfield-create-epic.md`
**Purpose**: Create focused epics for smaller brownfield enhancements.

**Key Features**:
- Simplified epic creation for 1-3 story enhancements
- Integration-aware planning
- Risk assessment and mitigation
- Compatibility requirements definition
- Rollback planning

**When to Use**:
- Small brownfield enhancements
- When full PRD process is overkill
- For isolated feature additions
- Low-risk system modifications

#### `brownfield-create-story.md`
**Purpose**: Create single stories for minimal brownfield changes.

**Key Features**:
- Single-session implementation scope
- Minimal risk assessment
- Pattern-following emphasis
- Quick compatibility checks
- Straightforward integration approach

**When to Use**:
- Very small bug fixes
- Minor feature additions
- Single-file modifications
- 4-hour implementation tasks

### 4. Planning and Research Tasks

#### `facilitate-brainstorming-session.md`
**Purpose**: Guide interactive brainstorming sessions with structured techniques.

**Key Features**:
- Multiple brainstorming technique options
- Interactive facilitation approach
- Structured output documentation
- Idea categorization and prioritization
- Action planning integration

**When to Use**:
- Project ideation phases
- Problem-solving sessions
- Feature exploration
- Team creativity exercises

#### `create-deep-research-prompt.md`
**Purpose**: Generate comprehensive research prompts for various analysis types.

**Key Features**:
- Nine research focus areas
- Structured prompt generation
- Clear methodology definition
- Deliverable specifications
- Success criteria establishment

**When to Use**:
- Market validation needs
- Competitive analysis
- Technology assessment
- Strategic planning
- Risk evaluation

### 5. Quality and Process Tasks

#### `correct-course.md`
**Purpose**: Guide structured response to project changes using change checklists.

**Key Features**:
- Change impact analysis
- Artifact update proposals
- Sprint change documentation
- Path forward recommendations
- Handoff coordination

**When to Use**:
- When requirements change
- Sprint scope adjustments
- Technical constraint discoveries
- Priority shifts
- Risk mitigation needs

#### `advanced-elicitation.md`
**Purpose**: Enhance content quality through reflective and analytical techniques.

**Key Features**:
- Context-aware method selection
- Nine elicitation techniques per session
- Iterative refinement process
- Multiple perspective analysis
- Simple numeric selection interface

**When to Use**:
- After drafting sections
- When deeper analysis needed
- For quality enhancement
- During document reviews
- To explore alternatives

### 6. Specialized Tasks

#### `generate-ai-frontend-prompt.md`
**Purpose**: Create optimized prompts for AI-driven frontend development tools.

**Key Features**:
- Four-part structured framework
- Mobile-first approach
- Explicit scope definition
- Context and constraints inclusion
- Iterative development guidance

**When to Use**:
- With Vercel v0 or similar tools
- Frontend scaffolding needs
- Rapid UI prototyping
- Component generation

#### `kb-mode-interaction.md`
**Purpose**: Provide user-friendly interface to BMad knowledge base.

**Key Features**:
- Topic-based navigation
- Contextual responses
- Interactive exploration
- Focused information delivery
- Graceful exit handling

**When to Use**:
- User knowledge queries
- BMad methodology questions
- Learning interactions
- Reference lookups

## Task Metadata Structure

All BMad tasks follow a consistent structure:

```markdown
# Task Name

## Purpose
Clear statement of what the task accomplishes

## When to Use This Task
Specific scenarios and conditions

## Instructions
Step-by-step execution guide

## Success Criteria
Measurable outcomes for task completion

## Important Notes
Key considerations and warnings
```

## Task Integration Patterns

### 1. With Agents

Tasks are executed by specialized agents:
- **PM Agent**: Uses planning and documentation tasks
- **Story Manager**: Uses story creation and validation tasks
- **Dev Agent**: Consumes story tasks for implementation
- **QA Agent**: Uses review and validation tasks

### 2. With Workflows

Tasks fit into larger workflow patterns:
- **Greenfield**: Sequential task execution from planning to implementation
- **Brownfield**: Adaptive task selection based on documentation availability
- **Sprint Changes**: Corrective tasks for mid-flight adjustments

### 3. With Documents

Tasks produce and consume various documents:
- **Input Documents**: PRDs, epics, architecture docs
- **Output Documents**: Stories, validation reports, change proposals
- **Reference Documents**: Coding standards, project structure

## Input/Output Patterns

### Common Input Types

1. **Document References**
   - File paths to existing documentation
   - Sharded or monolithic document locations
   - Configuration from core-config.yaml

2. **User Context**
   - Project descriptions
   - Enhancement requirements
   - Constraint specifications

3. **Project State**
   - Current story progress
   - Existing file structures
   - Implementation status

### Common Output Types

1. **Structured Documents**
   - Markdown-formatted files
   - Hierarchical section organization
   - Cross-referenced content

2. **Validation Reports**
   - Issue categorization (Critical/Should-Fix/Nice-to-Have)
   - Readiness assessments
   - Improvement recommendations

3. **Action Items**
   - Task lists with checkboxes
   - Prioritized recommendations
   - Handoff instructions

## Task Execution Best Practices

### 1. Pre-Execution Validation

- **Check Prerequisites**: Ensure required inputs exist
- **Verify Configuration**: Load core-config.yaml when needed
- **Confirm Permissions**: Ensure write access for outputs
- **Validate Context**: Verify task applicability

### 2. During Execution

- **Follow Sequential Steps**: Don't skip ahead in multi-step tasks
- **Gather Missing Information**: Ask users for clarification
- **Preserve Existing Content**: Don't overwrite without confirmation
- **Maintain Consistency**: Follow established patterns

### 3. Post-Execution

- **Validate Outputs**: Check completeness and accuracy
- **Report Results**: Provide clear summaries
- **Document Decisions**: Record choices made
- **Enable Handoffs**: Provide clear next steps

### 4. Error Handling

- **Graceful Failures**: Provide helpful error messages
- **Partial Progress**: Save work completed so far
- **Recovery Options**: Suggest alternative approaches
- **User Guidance**: Explain how to resolve issues

## Task Selection Guidelines

### For New Projects
1. Start with `facilitate-brainstorming-session.md`
2. Use `create-deep-research-prompt.md` for validation
3. Follow standard greenfield workflow tasks

### for Existing Projects
1. Begin with `document-project.md`
2. Use brownfield epic/story creation tasks
3. Apply `validate-next-story.md` before implementation

### For Quality Assurance
1. Use `advanced-elicitation.md` during creation
2. Apply `validate-next-story.md` before implementation
3. Execute `review-story.md` after implementation

### For Maintenance
1. Run `index-docs.md` regularly
2. Use `shard-doc.md` for large documents
3. Apply `correct-course.md` for changes

## Integration with Core BMad Concepts

### Agile Alignment
- Tasks support sprint-based development
- Enable iterative refinement
- Facilitate continuous improvement
- Support change management

### AI-Agent Optimization
- Self-contained execution instructions
- Clear success criteria
- Structured output formats
- Context preservation

### Quality Focus
- Built-in validation steps
- Anti-hallucination measures
- Source verification requirements
- Comprehensive review processes

## Conclusion

BMad tasks form the operational backbone of the methodology, providing consistent, repeatable processes that ensure quality outcomes. By understanding each task's purpose, integration patterns, and best practices, teams can effectively leverage the BMad methodology for successful project delivery.

Remember: Tasks are tools - their effectiveness depends on proper selection, careful execution, and thoughtful integration within the broader BMad workflow.