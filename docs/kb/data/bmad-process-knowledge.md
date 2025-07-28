# BMAD Process and Workflow Knowledge

## Complete Development Workflow

### Planning Phase (Web UI Recommended - Especially Gemini!)

**Ideal for cost efficiency with Gemini's massive context:**

**For Brownfield Projects - Start Here!**:

1. **Upload entire project to Gemini Web** (GitHub URL, files, or zip)
2. **Document existing system**: `/analyst` → `*document-project`
3. **Creates comprehensive docs** from entire codebase analysis

**For All Projects**:

1. **Optional Analysis**: `/analyst` - Market research, competitive analysis
2. **Project Brief**: Create foundation document (Analyst or user)
3. **PRD Creation**: `/pm create-doc prd` - Comprehensive product requirements
4. **Architecture Design**: `/architect create-doc architecture` - Technical foundation
5. **Validation & Alignment**: `/po` run master checklist to ensure document consistency
6. **Document Preparation**: Copy final documents to project as `docs/prd.md` and `docs/architecture.md`

#### Example Planning Prompts

**For PRD Creation**:

```text
"I want to build a [type] application that [core purpose].
Help me brainstorm features and create a comprehensive PRD."
```

**For Architecture Design**:

```text
"Based on this PRD, design a scalable technical architecture
that can handle [specific requirements]."
```

### Critical Transition: Web UI to IDE

**Once planning is complete, you MUST switch to IDE for development:**

- **Why**: Development workflow requires file operations, real-time project integration, and document sharding
- **Cost Benefit**: Web UI is more cost-effective for large document creation; IDE is optimized for development tasks
- **Required Files**: Ensure `docs/prd.md` and `docs/architecture.md` exist in your project

### IDE Development Workflow

**Prerequisites**: Planning documents must exist in `docs/` folder

1. **Document Sharding** (CRITICAL STEP):
   - Documents created by PM/Architect (in Web or IDE) MUST be sharded for development
   - Two methods to shard:
     a) **Manual**: Drag `shard-doc` task + document file into chat
     b) **Agent**: Ask `@bmad-master` or `@po` to shard documents
   - Shards `docs/prd.md` → `docs/prd/` folder
   - Shards `docs/architecture.md` → `docs/architecture/` folder
   - **WARNING**: Do NOT shard in Web UI - copying many small files is painful!

2. **Verify Sharded Content**:
   - At least one `epic-n.md` file in `docs/prd/` with stories in development order
   - Source tree document and coding standards for dev agent reference
   - Sharded docs for SM agent story creation

Resulting Folder Structure:

- `docs/prd/` - Broken down PRD sections
- `docs/architecture/` - Broken down architecture sections
- `docs/stories/` - Generated user stories

3. **Development Cycle** (Sequential, one story at a time):

   **CRITICAL CONTEXT MANAGEMENT**:
   - **Context windows matter!** Always use fresh, clean context windows
   - **Model selection matters!** Use most powerful thinking model for SM story creation
   - **ALWAYS start new chat between SM, Dev, and QA work**

   **Step 1 - Story Creation**:
   - **NEW CLEAN CHAT** → Select powerful model → `@sm` → `*create`
   - SM executes create-next-story task
   - Review generated story in `docs/stories/`
   - Update status from "Draft" to "Approved"

   **Step 2 - Story Implementation**:
   - **NEW CLEAN CHAT** → `@dev`
   - Agent asks which story to implement
   - Include story file content to save dev agent lookup time
   - Dev follows tasks/subtasks, marking completion
   - Dev maintains File List of all changes
   - Dev marks story as "Review" when complete with all tests passing

   **Step 3 - Senior QA Review**:
   - **NEW CLEAN CHAT** → `@qa` → execute review-story task
   - QA performs senior developer code review
   - QA can refactor and improve code directly
   - QA appends results to story's QA Results section
   - If approved: Status → "Done"
   - If changes needed: Status stays "Review" with unchecked items for dev

   **Step 4 - Repeat**: Continue SM → Dev → QA cycle until all epic stories complete

**Important**: Only 1 story in progress at a time, worked sequentially until all epic stories complete.

### Status Tracking Workflow

Stories progress through defined statuses:

- **Draft** → **Approved** → **InProgress** → **Done**

Each status change requires user verification and approval before proceeding.

## Workflow Types

### Greenfield Development

- Business analysis and market research
- Product requirements and feature definition  
- System architecture and design
- Development execution
- Testing and deployment

### Brownfield Enhancement (Existing Projects)

**Key Concept**: Brownfield development requires comprehensive documentation of your existing project for AI agents to understand context, patterns, and constraints.

**Complete Brownfield Workflow Options**:

**Option 1: PRD-First (Recommended for Large Codebases/Monorepos)**:

1. **Upload project to Gemini Web** (GitHub URL, files, or zip)
2. **Create PRD first**: `@pm` → `*create-doc brownfield-prd`
3. **Focused documentation**: `@analyst` → `*document-project`
   - Analyst asks for focus if no PRD provided
   - Choose "single document" format for Web UI
   - Uses PRD to document ONLY relevant areas
   - Creates one comprehensive markdown file
   - Avoids bloating docs with unused code

**Option 2: Document-First (Good for Smaller Projects)**:

1. **Upload project to Gemini Web**
2. **Document everything**: `@analyst` → `*document-project`
3. **Then create PRD**: `@pm` → `*create-doc brownfield-prd`
   - More thorough but can create excessive documentation

4. **Requirements Gathering**:
   - **Brownfield PRD**: Use PM agent with `brownfield-prd-tmpl`
   - **Analyzes**: Existing system, constraints, integration points
   - **Defines**: Enhancement scope, compatibility requirements, risk assessment
   - **Creates**: Epic and story structure for changes

5. **Architecture Planning**:
   - **Brownfield Architecture**: Use Architect agent with `brownfield-architecture-tmpl`
   - **Integration Strategy**: How new features integrate with existing system
   - **Migration Planning**: Gradual rollout and backwards compatibility
   - **Risk Mitigation**: Addressing potential breaking changes

**Brownfield-Specific Resources**:

**Templates**:

- `brownfield-prd-tmpl.md`: Comprehensive enhancement planning with existing system analysis
- `brownfield-architecture-tmpl.md`: Integration-focused architecture for existing systems

**Tasks**:

- `document-project`: Generates comprehensive documentation from existing codebase
- `brownfield-create-epic`: Creates single epic for focused enhancements (when full PRD is overkill)
- `brownfield-create-story`: Creates individual story for small, isolated changes

**When to Use Each Approach**:

**Full Brownfield Workflow** (Recommended for):

- Major feature additions
- System modernization
- Complex integrations
- Multiple related changes

**Quick Epic/Story Creation** (Use when):

- Single, focused enhancement
- Isolated bug fixes
- Small feature additions
- Well-documented existing system

**Critical Success Factors**:

1. **Documentation First**: Always run `document-project` if docs are outdated/missing
2. **Context Matters**: Provide agents access to relevant code sections
3. **Integration Focus**: Emphasize compatibility and non-breaking changes
4. **Incremental Approach**: Plan for gradual rollout and testing

**For detailed guide**: See `docs/working-in-the-brownfield.md`

## IDE-Only Workflow Considerations

**Can you do everything in IDE?** Yes, but understand the tradeoffs:

**Pros of IDE-Only**:

- Single environment workflow
- Direct file operations from start
- No copy/paste between environments
- Immediate project integration

**Cons of IDE-Only**:

- Higher token costs for large document creation
- Smaller context windows (varies by IDE/model)
- May hit limits during planning phases
- Less cost-effective for brainstorming

**Using Web Agents in IDE**:

- **NOT RECOMMENDED**: Web agents (PM, Architect) have rich dependencies designed for large contexts
- **Why it matters**: Dev agents are kept lean to maximize coding context
- **The principle**: "Dev agents code, planning agents plan" - mixing breaks this optimization

**About bmad-master and bmad-orchestrator**:

- **bmad-master**: CAN do any task without switching agents, BUT...
- **Still use specialized agents for planning**: PM, Architect, and UX Expert have tuned personas that produce better results
- **Why specialization matters**: Each agent's personality and focus creates higher quality outputs
- **If using bmad-master/orchestrator**: Fine for planning phases, but...

**CRITICAL RULE for Development**:

- **ALWAYS use SM agent for story creation** - Never use bmad-master or bmad-orchestrator
- **ALWAYS use Dev agent for implementation** - Never use bmad-master or bmad-orchestrator
- **Why this matters**: SM and Dev agents are specifically optimized for the development workflow
- **No exceptions**: Even if using bmad-master for everything else, switch to SM → Dev for implementation

**Best Practice for IDE-Only**:

1. Use PM/Architect/UX agents for planning (better than bmad-master)
2. Create documents directly in project
3. Shard immediately after creation
4. **MUST switch to SM agent** for story creation
5. **MUST switch to Dev agent** for implementation
6. Keep planning and coding in separate chat sessions

## Usage Patterns and Best Practices

### Environment-Specific Usage

**Web UI Best For**:

- Initial planning and documentation phases
- Cost-effective large document creation
- Agent consultation and brainstorming
- Multi-agent workflows with orchestrator

**IDE Best For**:

- Active development and implementation
- File operations and project integration
- Story management and development cycles
- Code review and debugging

### Quality Assurance

- Use appropriate agents for specialized tasks
- Follow Agile ceremonies and review processes
- Maintain document consistency with PO agent
- Regular validation with checklists and templates

## Success Tips

- **Use Gemini for big picture planning** - The team-fullstack bundle provides collaborative expertise
- **Use bmad-master for document organization** - Sharding creates manageable chunks
- **Follow the SM → Dev cycle religiously** - This ensures systematic progress
- **Keep conversations focused** - One agent, one task per conversation
- **Review everything** - Always review and approve before marking complete